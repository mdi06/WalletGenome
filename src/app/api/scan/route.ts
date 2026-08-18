import { NextRequest, NextResponse } from 'next/server';
import { fetchNormalTransactions, fetchTokenTransfers } from '@/lib/etherscan';
import { batchFetchPrices } from '@/lib/prices';
import { collectPriceRequests, runAnalysis } from '@/lib/scanner';
import { getChainConfig } from '@/lib/chains';
import { getSampleWalletData } from '@/lib/mockData';
import { loadKnownWallets } from '@/lib/knownWalletsServer';
import { checkSybilStatus } from '@/lib/sybil/sybilService';
import { computeMediaScore } from '@/lib/sybil/mediaScoring';
import { resolveWalletIdentity } from '@/lib/identity/identityService';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, chainIds, isDemo, customApiKey } = body;

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: 'Invalid EVM wallet address. Must be 0x followed by 40 hex characters.' },
        { status: 400 }
      );
    }

    if (isDemo) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const sampleData = getSampleWalletData(address);
      const demoMediaScore = {
        monetary: 78,
        engagement: 82,
        diversity: 85,
        identity: 70,
        age: 80,
        compositeScore: 79,
        sybilProbability: 21,
        classification: 'Organic Human' as const,
        explanation: 'Multi-month history, diverse protocol usage, and healthy capital depth indicate organic activity.',
      };
      const [sybilReport, identityReport] = await Promise.all([
        checkSybilStatus(address, demoMediaScore),
        resolveWalletIdentity(address),
      ]);
      return NextResponse.json({
        ...sampleData,
        sybilReport,
        identityReport,
        isDemo: true,
        notice: 'Loaded sample forensic simulation.',
      });
    }

    const etherscanKey = customApiKey || process.env.ETHERSCAN_API_KEY || '';
    const coingeckoKey = process.env.COINGECKO_API_KEY || '';

    const knownWallets = loadKnownWallets();
    const chains: number[] = (chainIds && chainIds.length > 0) ? chainIds : [1];

    const [identityReport, chainAnalysisResults] = await Promise.all([
      resolveWalletIdentity(address),
      Promise.all(
        chains.map(async (chainId) => {
          try {
            getChainConfig(chainId);

            const [normalTxs, tokenTransfers] = await Promise.all([
              fetchNormalTransactions(address, chainId, etherscanKey).catch(() => []),
              fetchTokenTransfers(address, chainId, etherscanKey).catch(() => []),
            ]);

            const priceRequests = collectPriceRequests(normalTxs, tokenTransfers, chainId);
            if (priceRequests.length > 0) {
              await batchFetchPrices(priceRequests.slice(0, 10), coingeckoKey).catch(() => {});
            }

            return await runAnalysis(normalTxs, tokenTransfers, address, chainId, knownWallets);
          } catch (chainError) {
            console.error(`Error scanning chain ${chainId}:`, chainError);
            return await runAnalysis([], [], address, chainId, knownWallets);
          }
        })
      )
    ]);

    const validResults = chainAnalysisResults.filter((r): r is NonNullable<typeof r> => r !== null);

    const aggregated = {
      totalGasETH: validResults.reduce((sum, r) => sum + (r.gasSummary?.totalGasETH || 0), 0),
      totalGasUSD: validResults.reduce((sum, r) => sum + (r.gasSummary?.totalGasUSD || 0), 0),
      totalHighRiskApprovals: validResults.reduce((sum, r) => sum + (r.approvalSummary?.highRiskCount || 0), 0),
      totalDeadAssets: validResults.reduce((sum, r) => sum + (r.graveyardSummary?.totalTokensDead || 0), 0),
      totalTransactions: validResults.reduce((sum, r) => sum + (r.transactionCount || 0), 0),
      riskScore: validResults.length > 0 ? Math.round(validResults.reduce((sum, r) => sum + (r.riskAssessment?.score || 0), 0) / validResults.length) : 0,
      riskGrade: validResults.length > 0 ? validResults[0]?.riskAssessment?.grade || "A" : "A",
    };

    // Calculate aggregated MEDIA Score
    const allInboundUSD = validResults.reduce((sum, r) => sum + (r.transferSummary?.totalInboundUSD || 0), 0);
    const allOutboundUSD = validResults.reduce((sum, r) => sum + (r.transferSummary?.totalOutboundUSD || 0), 0);
    const totalVolumeUSD = allInboundUSD + allOutboundUSD;
    const uniqueContracts = validResults.reduce((sum, r) => sum + (r.fingerprint?.uniqueContracts || 0), 0);

    const mediaScore = computeMediaScore({
      address,
      transactions: validResults.flatMap(r => (r.transferSummary?.topInbound || []) as any),
      tokenTransfers: validResults.flatMap(r => (r.transferSummary?.topOutbound || []) as any),
      uniqueContractCount: uniqueContracts || 5,
      activeChainsCount: validResults.length,
      totalVolumeUSD,
      totalGasUSD: aggregated.totalGasUSD,
    });

    const sybilReport = await checkSybilStatus(address, mediaScore);

    return NextResponse.json({
      address,
      chains: validResults,
      aggregated,
      sybilReport,
      identityReport,
      isDemo: false,
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while analyzing the wallet.' },
      { status: 500 }
    );
  }
}
