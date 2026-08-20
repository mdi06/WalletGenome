import { fetchNormalTransactions, fetchTokenTransfers, fetchInternalTransactions } from '@/lib/etherscan';
import { batchFetchPrices } from '@/lib/prices';
import { collectPriceRequests, runAnalysis, processTransactions, processTokenTransfers } from '@/lib/scanner';
import { getChainConfig } from '@/lib/chains';
import { getSampleWalletData } from '@/lib/mockData';
import { loadKnownWallets } from '@/lib/knownWalletsServer';
import { checkSybilStatus } from '@/lib/sybil/sybilService';
import { computeMediaScore } from '@/lib/sybil/mediaScoring';
import { resolveWalletIdentity } from '@/lib/identity/identityService';
import { resolveEnsOrAddress } from '@/lib/ens';
import { scanResultCache } from '@/lib/cache';

export async function processWalletScan(
  inputAddress: string,
  chainIds: number[],
  isDemo: boolean = false,
  customApiKey: string = ''
) {
  const rawTarget = (inputAddress || '').trim();
  if (!rawTarget) {
    throw new Error('Please provide an EVM wallet address or ENS domain.');
  }

  let address = rawTarget;
  if (!/^0x[a-fA-F0-9]{40}$/.test(rawTarget)) {
    const resolved = await resolveEnsOrAddress(rawTarget);
    if (!resolved) {
      throw new Error(`Unable to resolve ENS domain "${rawTarget}". Please check the name or provide a valid 0x address.`);
    }
    address = resolved;
  }



  const etherscanKey = customApiKey || '';
  const coingeckoKey = process.env.COINGECKO_API_KEY || '';

  const knownWallets = loadKnownWallets();
  const chains: number[] = (chainIds && chainIds.length > 0) ? chainIds : [1];

  const cacheKey = `${address.toLowerCase()}-${[...chains].sort((a, b) => a - b).join(',')}`;
  if (!customApiKey) {
    const cached = scanResultCache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }
  }

  // Fetch wallet identity in parallel with chain data
  const identityPromise = resolveWalletIdentity(address);

  // Fetch chain data in parallel across all supported chains
  // (Domain rate limiters in etherscan.ts & cache.ts protect individual endpoints)
  const chainWarnings: Array<{ chainId: number; chainName: string; message: string }> = [];

  const rawChainsData = await Promise.all(
    chains.map(async (chainId) => {
      try {
        getChainConfig(chainId);
        const [normalTxs, tokenTransfers, internalTxs] = await Promise.all([
          fetchNormalTransactions(address, chainId, etherscanKey).catch(() => []),
          fetchTokenTransfers(address, chainId, etherscanKey).catch(() => []),
          fetchInternalTransactions(address, chainId, etherscanKey).catch(() => []),
        ]);
        return { chainId, normalTxs, tokenTransfers, internalTxs, error: null };
      } catch (err) {
        let chainName = `Chain ${chainId}`;
        try {
          chainName = getChainConfig(chainId).name;
        } catch {}
        chainWarnings.push({
          chainId,
          chainName,
          message: `Could not reach indexer for ${chainName}. Some data may be incomplete.`,
        });
        return { chainId, normalTxs: [], tokenTransfers: [], internalTxs: [], error: err };
      }
    })
  );

  const identityReport = await identityPromise;

  // Consolidate price fetching once across all chains with DefiLlama + CoinGecko batching
  const allPriceRequests = rawChainsData.flatMap(c => collectPriceRequests(c.normalTxs, c.tokenTransfers, c.chainId));
  if (allPriceRequests.length > 0) {
    await batchFetchPrices(allPriceRequests, coingeckoKey).catch(() => {});
  }

  // Run deep analysis in parallel for each chain
  const chainAnalysisResults = await Promise.all(
    rawChainsData.map(async ({ chainId, normalTxs, tokenTransfers, internalTxs, error }) => {
      if (error) {
        const analysis = await runAnalysis([], [], address, chainId, knownWallets, []);
        return { analysis, processedTxs: [], processedTransfers: [] };
      }
      const analysis = await runAnalysis(normalTxs, tokenTransfers, address, chainId, knownWallets, internalTxs);
      const processedTxs = processTransactions(normalTxs, address, chainId, knownWallets);
      const processedTransfers = processTokenTransfers(tokenTransfers, address, chainId, knownWallets);
      return { analysis, processedTxs, processedTransfers };
    })
  );

  const validChainData = chainAnalysisResults.filter((r): r is NonNullable<typeof r> => r !== null);
  const validResults = validChainData.map(r => r.analysis);
  const allTransactions = validChainData.flatMap(r => r.processedTxs);
  const allTokenTransfers = validChainData.flatMap(r => r.processedTransfers);

  const GRADE_ORDER: Record<string, number> = { F: 5, D: 4, C: 3, B: 2, A: 1 };
  const worstRiskGrade = validResults.reduce((worst, r) => {
    const g = r.riskAssessment?.grade || 'A';
    return (GRADE_ORDER[g] || 1) > (GRADE_ORDER[worst] || 1) ? g : worst;
  }, 'A');

  const ethChains = validResults.filter(r => {
    try {
      return getChainConfig(r.chainId).nativeToken.symbol === 'ETH';
    } catch {
      return true;
    }
  });

  const aggregated = {
    totalGasETH: ethChains.reduce((sum, r) => sum + (r.gasSummary?.totalGasETH || 0), 0),
    totalGasUSD: validResults.reduce((sum, r) => sum + (r.gasSummary?.totalGasUSD || 0), 0),
    totalHighRiskApprovals: validResults.reduce((sum, r) => sum + (r.approvalSummary?.highRiskCount || 0), 0),
    totalUnlimitedApprovals: validResults.reduce((sum, r) => sum + (r.approvalSummary?.unlimitedCount || 0), 0),
    totalDeadAssets: validResults.reduce((sum, r) => sum + (r.graveyardSummary?.totalTokensDead || 0), 0),
    totalTransactions: validResults.reduce((sum, r) => sum + (r.transactionCount || 0), 0),
    riskScore: validResults.length > 0 ? Math.max(...validResults.map(r => r.riskAssessment?.score || 0)) : 0,
    riskGrade: worstRiskGrade,
  };

  const allInboundUSD = validResults.reduce((sum, r) => sum + (r.transferSummary?.totalInboundUSD || 0), 0);
  const allOutboundUSD = validResults.reduce((sum, r) => sum + (r.transferSummary?.totalOutboundUSD || 0), 0);
  const totalVolumeUSD = allInboundUSD + allOutboundUSD;
  const uniqueContracts = validResults.reduce((sum, r) => sum + (r.fingerprint?.uniqueContracts || 0), 0);

  const mediaScore = computeMediaScore({
    address,
    transactions: allTransactions,
    tokenTransfers: allTokenTransfers,
    uniqueContractCount: uniqueContracts || 5,
    activeChainsCount: validResults.length,
    totalVolumeUSD,
    totalGasUSD: aggregated.totalGasUSD,
  });

  const sybilReport = await checkSybilStatus(address, mediaScore);



  const responseData = {
    address,
    chains: validResults,
    aggregated,
    sybilReport,
    identityReport,
    chainWarnings: chainWarnings.length > 0 ? chainWarnings : undefined,
    isDemo: false,
    allInboundUSD,
    allOutboundUSD,
  };

  if (!customApiKey) {
    scanResultCache.set(cacheKey, responseData, 300);
  }

  return responseData;
}
