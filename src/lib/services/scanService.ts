import { batchFetchPrices } from '@/lib/prices';
import { collectPriceRequests, runAnalysis, processInternalTransactions, processTransactions, processTokenTransfers } from '@/lib/scanner';
import { getChainConfig } from '@/lib/chains';
import { loadKnownWallets } from '@/lib/knownWalletsServer';
import { checkSybilStatus } from '@/lib/sybil/sybilService';
import { computeMediaScore } from '@/lib/sybil/mediaScoring';
import { resolveWalletIdentity } from '@/lib/identity/identityService';
import { resolveEnsOrAddress } from '@/lib/ens';
import { scanResultCache } from '@/lib/cache';
import { mapWithConcurrency } from '@/lib/api/requestPolicy';
import { buildReportingMetrics } from '@/lib/reportingContract';
import { collectWalletClusterEvidence } from '@/lib/clusterAnalysis';
import { PERSISTENCE_POLICY } from '@/lib/persistencePolicy';
import {
  applyWalletHistoryFallback,
  fetchExplorerHistorySources,
  isWalletHistoryComplete,
} from '@/lib/services/walletHistoryService';
import { createMoralisQuotaBudget } from '@/lib/moralis';
import {
  ChainDataAvailability,
  DataAvailabilityError,
  DataAvailabilityStatus,
  DataSourceName,
  DataSourceResult,
  EtherscanInternalTransaction,
  EtherscanTokenTransfer,
  EtherscanTransaction,
  PriceProvenanceSummary,
  RiskGrade,
  WalletScanResponse,
} from '@/lib/types';

// All selected chains run concurrently. Per-provider domain limiters in the
// explorer/RPC clients enforce the actual upstream request budgets.
const CHAIN_SCAN_CONCURRENCY = 5;
const CHAIN_ANALYSIS_CONCURRENCY = 5;

export interface ProcessWalletScanProgress {
  phase: 'resolving' | 'fetching' | 'pricing' | 'analyzing' | 'finalizing';
  completedChains?: number;
  totalChains?: number;
  currentChainId?: number;
  currentChainName?: string;
}

interface ProcessWalletScanOptions {
  onProgress?: (progress: ProcessWalletScanProgress) => void;
}

function unavailableSource<T>(message: string): DataSourceResult<T> {
  return {
    data: [],
    status: 'unavailable',
    errors: [{ code: 'provider_error', message }],
  };
}

function sourceErrors(
  source: DataSourceName,
  errors: DataSourceResult<unknown>['errors'],
): DataAvailabilityError[] {
  return errors.map(error => ({ source, ...error }));
}

export function summarizeAvailability(availability: ChainDataAvailability[]): DataAvailabilityStatus {
  const explorerStatuses = availability.flatMap(item => [
    item.transactions,
    item.tokenTransfers,
    item.internalTransactions,
  ]);
  if (explorerStatuses.length === 0 || explorerStatuses.every(status => status === 'unavailable')) {
    return 'unavailable';
  }
  return explorerStatuses.every(status => status === 'complete') ? 'complete' : 'partial';
}

export function moralisBudgetPerFallbackChain(totalBudget: number, fallbackChainCount: number): number {
  if (fallbackChainCount <= 0) return totalBudget;
  return Math.max(1, Math.floor(totalBudget / fallbackChainCount));
}

export async function processWalletScan(
  inputAddress: string,
  chainIds: number[],
  customApiKey: string = '',
  includeClusterEvidence: boolean = false,
  options: ProcessWalletScanOptions = {},
): Promise<WalletScanResponse> {
  options.onProgress?.({ phase: 'resolving', totalChains: chainIds.length });
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
  if (!customApiKey && !includeClusterEvidence) {
    const cached = scanResultCache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }
  }

  // Fetch wallet identity in parallel with chain data
  const identityPromise = resolveWalletIdentity(address);
  let completedChains = 0;
  options.onProgress?.({ phase: 'fetching', completedChains, totalChains: chains.length });

  const explorerChainsData = await mapWithConcurrency(
    chains,
    CHAIN_SCAN_CONCURRENCY,
    async (chainId) => {
      let chainName = `Chain ${chainId}`;
      try {
        chainName = getChainConfig(chainId).name;
      } catch {
        const unsupported = {
          code: 'unsupported_chain' as const,
          message: `Chain ${chainId} is not supported by the configured explorer providers.`,
        };
        return {
          chainId,
          chainName,
          transactions: { data: [], status: 'unavailable', errors: [unsupported] } as DataSourceResult<EtherscanTransaction>,
          tokenTransfers: { data: [], status: 'unavailable', errors: [unsupported] } as DataSourceResult<EtherscanTokenTransfer>,
          internalTransactions: { data: [], status: 'unavailable', errors: [unsupported] } as DataSourceResult<EtherscanInternalTransaction>,
        };
      }

      const history = await fetchExplorerHistorySources(address, chainId, etherscanKey).catch(() => ({
        transactions: unavailableSource<EtherscanTransaction>(`${chainName} transaction data could not be loaded.`),
        tokenTransfers: unavailableSource<EtherscanTokenTransfer>(`${chainName} token transfer data could not be loaded.`),
        internalTransactions: unavailableSource<EtherscanInternalTransaction>(`${chainName} internal transaction data could not be loaded.`),
      }));
      const { transactions, tokenTransfers, internalTransactions } = history;
      return { chainId, chainName, transactions, tokenTransfers, internalTransactions };
    },
  );

  const fallbackCandidates = explorerChainsData.filter(chain => !isWalletHistoryComplete(chain));
  const totalMoralisBudget = createMoralisQuotaBudget().maxComputeUnits;
  const perChainMoralisBudget = moralisBudgetPerFallbackChain(
    totalMoralisBudget,
    fallbackCandidates.length,
  );

  // Partition the configured scan budget across only the chains that need a
  // fallback. One noisy or quota-blocked chain cannot consume another chain's
  // local allocation, while total reserved CU remains within the scan cap.
  const rawChainsData = await mapWithConcurrency(
    explorerChainsData,
    CHAIN_SCAN_CONCURRENCY,
    async (chain) => {
      const history = isWalletHistoryComplete(chain)
        ? chain
        : await applyWalletHistoryFallback(address, chain.chainId, chain, {
            quotaBudget: createMoralisQuotaBudget(perChainMoralisBudget),
          });

      completedChains += 1;
      options.onProgress?.({
        phase: 'fetching',
        completedChains,
        totalChains: chains.length,
        currentChainId: chain.chainId,
        currentChainName: chain.chainName,
      });

      return { ...chain, ...history };
    },
  );

  const identityReport = await identityPromise;
  options.onProgress?.({ phase: 'pricing', completedChains: chains.length, totalChains: chains.length });

  // Consolidate price fetching once across all chains with DefiLlama + CoinGecko batching
  const allPriceRequests = rawChainsData.flatMap(chain => (
    chain.transactions.status === 'unavailable' && chain.tokenTransfers.status === 'unavailable'
      ? []
      : collectPriceRequests(chain.transactions.data, chain.tokenTransfers.data, chain.chainId)
  ));
  await batchFetchPrices(allPriceRequests, coingeckoKey).catch(() => undefined);

  const availability: ChainDataAvailability[] = rawChainsData.map(chain => {
    return {
      chainId: chain.chainId,
      chainName: chain.chainName,
      transactions: chain.transactions.status,
      tokenTransfers: chain.tokenTransfers.status,
      internalTransactions: chain.internalTransactions.status,
      prices: 'complete' as const,
      errors: [
        ...sourceErrors('transactions', chain.transactions.errors),
        ...sourceErrors('tokenTransfers', chain.tokenTransfers.errors),
        ...sourceErrors('internalTransactions', chain.internalTransactions.errors),
      ],
    };
  });
  options.onProgress?.({ phase: 'analyzing', completedChains: chains.length, totalChains: chains.length });

  // Run deep analysis in parallel for each chain
  const chainAnalysisResults = await mapWithConcurrency(
    rawChainsData,
    CHAIN_ANALYSIS_CONCURRENCY,
    async ({ chainId, transactions, tokenTransfers, internalTransactions }) => {
      if (
        transactions.status === 'unavailable'
        && tokenTransfers.status === 'unavailable'
        && internalTransactions.status === 'unavailable'
      ) {
        return null;
      }
      const normalTxs = transactions.data;
      const internalTxs = internalTransactions.data;
      const rawTokenTransfers = tokenTransfers.data;
      const analysis = await runAnalysis(normalTxs, rawTokenTransfers, address, chainId, knownWallets, internalTxs);
      const processedTxs = processTransactions(normalTxs, chainId, knownWallets);
      const processedTransfers = processTokenTransfers(rawTokenTransfers, address, chainId, knownWallets);
      const processedInternals = processInternalTransactions(internalTxs, address, chainId, knownWallets);
      return { analysis, processedTxs, processedInternals, processedTransfers };
    },
  );

  const validChainData = chainAnalysisResults.filter((r): r is NonNullable<typeof r> => r !== null);
  const validResults = validChainData.map(r => r.analysis);
  const allTransactions = validChainData.flatMap(r => r.processedTxs);
  const allInternalTransactions = validChainData.flatMap(r => r.processedInternals);
  const allTokenTransfers = validChainData.flatMap(r => r.processedTransfers);

  const availabilityRank: Record<DataAvailabilityStatus, number> = {
    complete: 0,
    partial: 1,
    unavailable: 2,
  };
  for (const result of validResults) {
    const chainAvailability = availability.find(item => item.chainId === result.chainId);
    if (!chainAvailability) continue;
    chainAvailability.prices = result.priceProvenance.status;
    if (result.priceProvenance.spotEstimate > 0) {
      chainAvailability.errors.push({
        source: 'prices',
        code: 'spot_estimate',
        message: `${result.priceProvenance.spotEstimate} transaction or transfer valuations used current token prices because date-specific prices were unavailable. These estimates are excluded from verified historical capital flow and definitive historical USD metrics.`,
      });
    }
    if (result.priceProvenance.unpriced > 0) {
      chainAvailability.errors.push({
        source: 'prices',
        code: 'unpriced',
        message: `${result.priceProvenance.unpriced} values could not be priced and remain unavailable.`,
      });
    }
  }

  const status = summarizeAvailability(availability);
  const historyWarnings = availability
    .filter(item => [item.transactions, item.tokenTransfers, item.internalTransactions].some(value => value !== 'complete'))
    .map(item => ({
      chainId: item.chainId,
      chainName: item.chainName,
      message: `${item.chainName} has incomplete history data. Conclusions that require full wallet history are unavailable.`,
    }));
  const priceWarnings = availability
    .filter(item => item.prices !== 'complete')
    .map(item => ({
      chainId: item.chainId,
      chainName: item.chainName,
      message: `${item.chainName} has incomplete historical prices. Verified capital flow includes historically priced legs only; excluded values and coverage are shown separately. Other price-dependent USD metrics may remain unavailable.`,
    }));
  const chainWarnings = [...historyWarnings, ...priceWarnings];

  const GRADE_ORDER: Record<string, number> = { F: 5, D: 4, C: 3, B: 2, A: 1 };
  const worstRiskGrade = validResults.reduce<RiskGrade>((worst, r) => {
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

  const priceProvenance = validResults.reduce<PriceProvenanceSummary>((summary, result) => {
    summary.historical += result.priceProvenance.historical;
    summary.spotEstimate += result.priceProvenance.spotEstimate;
    summary.stablecoinAssumption += result.priceProvenance.stablecoinAssumption;
    summary.unpriced += result.priceProvenance.unpriced;
    if (availabilityRank[result.priceProvenance.status] > availabilityRank[summary.status]) {
      summary.status = result.priceProvenance.status;
    }
    return summary;
  }, {
    historical: 0,
    spotEstimate: 0,
    stablecoinAssumption: 0,
    unpriced: 0,
    status: 'complete',
  });

  const aggregated = {
    totalGasETH: ethChains.reduce((sum, r) => sum + (r.gasSummary?.totalGasETH || 0), 0),
    totalGasUSD: validResults.reduce((sum, r) => sum + (r.gasSummary?.totalGasUSD || 0), 0),
    totalHighRiskApprovals: validResults.reduce((sum, r) => sum + (r.approvalSummary?.highRiskCount || 0), 0),
    totalUnlimitedApprovals: validResults.reduce((sum, r) => sum + (r.approvalSummary?.unlimitedCount || 0), 0),
    totalTransactions: validResults.reduce((sum, r) => sum + (r.transactionCount || 0), 0),
    worstChainRiskScore: status === 'complete' && validResults.length > 0
      ? Math.max(...validResults.map(r => r.riskAssessment?.score || 0))
      : null,
    worstChainRiskGrade: status === 'complete' ? worstRiskGrade : null,
    priceProvenance,
  };

  const allInboundUSD = validResults.reduce((sum, r) => sum + (r.transferSummary?.totalInboundUSD || 0), 0);
  const allOutboundUSD = validResults.reduce((sum, r) => sum + (r.transferSummary?.totalOutboundUSD || 0), 0);
  const totalVolumeUSD = allInboundUSD + allOutboundUSD;
  const uniqueContracts = validResults.reduce((sum, r) => sum + (r.fingerprint?.uniqueContracts || 0), 0);

  const mediaScore = status === 'complete'
    ? computeMediaScore({
        address,
        transactions: allTransactions,
        tokenTransfers: allTokenTransfers,
        uniqueContractCount: uniqueContracts || 5,
        activeChainsCount: validResults.length,
        totalVolumeUSD,
        totalGasUSD: aggregated.totalGasUSD,
        includeMonetary: priceProvenance.status === 'complete',
      })
    : undefined;
  options.onProgress?.({ phase: 'finalizing', completedChains: chains.length, totalChains: chains.length });

  // Address-list checks do not depend on explorer or price completeness. The
  // Behavioral scoring requires complete history. When historical prices are
  // incomplete, its monetary dimension is omitted and the remaining behavioral
  // dimensions are reweighted instead of treating a price failure as a Sybil failure.
  const sybilReport = await checkSybilStatus(address, mediaScore);

  const metrics = buildReportingMetrics(validResults, status, priceProvenance, sybilReport);

  const responseData = {
    address,
    status,
    availability,
    chains: validResults,
    aggregated,
    sybilReport,
    identityReport,
    metrics,
    chainWarnings: chainWarnings.length > 0 ? chainWarnings : undefined,
    allInboundUSD,
    allOutboundUSD,
    clusterEvidence: includeClusterEvidence
      ? collectWalletClusterEvidence(address, allTransactions, allInternalTransactions, allTokenTransfers)
      : undefined,
  };

  if (
    !customApiKey
    && !includeClusterEvidence
    && status === 'complete'
    && priceProvenance.status === 'complete'
  ) {
    scanResultCache.set(cacheKey, responseData, PERSISTENCE_POLICY.caches.scanTtlSeconds);
  }

  return responseData;
}
