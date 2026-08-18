import { NextRequest, NextResponse } from 'next/server';
import { fetchNormalTransactions, fetchTokenTransfers } from '@/lib/etherscan';
import { batchFetchPrices } from '@/lib/prices';
import { collectPriceRequests, runAnalysis } from '@/lib/scanner';
import { getChainConfig } from '@/lib/chains';
import { loadKnownWallets } from '@/lib/knownWalletsServer';
import { checkSybilStatus } from '@/lib/sybil/sybilService';
import { computeMediaScore } from '@/lib/sybil/mediaScoring';
import { resolveWalletIdentity } from '@/lib/identity/identityService';
import { BulkWrappedWallet, ClusterLinkage, ClusterScanResult } from '@/lib/types';
import { getAddressLabel } from '@/lib/labels';

export const maxDuration = 300; // Up to 5 minutes

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { addresses, chainIds, customApiKey } = body;

    if (!Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json(
        { error: 'Please provide an array of EVM addresses to scan.' },
        { status: 400 }
      );
    }

    // Clean & validate addresses (cap at 30 for performance)
    const validAddresses = Array.from(
      new Set(
        addresses
          .map((a: string) => a.trim().toLowerCase())
          .filter((a: string) => /^0x[a-f0-9]{40}$/i.test(a))
      )
    ).slice(0, 30);

    if (validAddresses.length === 0) {
      return NextResponse.json(
        { error: 'No valid EVM addresses (0x...) found in the request.' },
        { status: 400 }
      );
    }

    const etherscanKey = customApiKey || process.env.ETHERSCAN_API_KEY || '';
    const coingeckoKey = process.env.COINGECKO_API_KEY || '';
    const knownWallets = loadKnownWallets();
    const chains: number[] = (chainIds && chainIds.length > 0) ? chainIds : [1, 8453, 42161];

    const scannedWallets: BulkWrappedWallet[] = [];
    const addressSet = new Set(validAddresses);

    // Process wallets in parallel batches of 3
    const BATCH_SIZE = 3;
    for (let i = 0; i < validAddresses.length; i += BATCH_SIZE) {
      const batch = validAddresses.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map(async (address) => {
          try {
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
                      await batchFetchPrices(priceRequests.slice(0, 5), coingeckoKey).catch(() => {});
                    }

                    return await runAnalysis(normalTxs, tokenTransfers, address, chainId, knownWallets);
                  } catch (e) {
                    return await runAnalysis([], [], address, chainId, knownWallets);
                  }
                })
              ),
            ]);

            const validResults = chainAnalysisResults.filter((r): r is NonNullable<typeof r> => r !== null);

            const totalGasETH = validResults.reduce((sum, r) => sum + (r.gasSummary?.totalGasETH || 0), 0);
            const totalGasUSD = validResults.reduce((sum, r) => sum + (r.gasSummary?.totalGasUSD || 0), 0);
            const totalHighRiskApprovals = validResults.reduce((sum, r) => sum + (r.approvalSummary?.highRiskCount || 0), 0);
            const totalUnlimitedApprovals = validResults.reduce((sum, r) => sum + (r.approvalSummary?.unlimitedCount || 0), 0);
            const totalDeadAssets = validResults.reduce((sum, r) => sum + (r.graveyardSummary?.totalTokensDead || 0), 0);
            const totalTransactions = validResults.reduce((sum, r) => sum + (r.transactionCount || 0), 0);
            const totalInflowUSD = validResults.reduce((sum, r) => sum + (r.transferSummary?.totalInboundUSD || 0), 0);
            const totalOutflowUSD = validResults.reduce((sum, r) => sum + (r.transferSummary?.totalOutboundUSD || 0), 0);
            const riskScore = validResults.length > 0 ? Math.round(validResults.reduce((sum, r) => sum + (r.riskAssessment?.score || 0), 0) / validResults.length) : 0;
            const riskGrade = validResults.length > 0 ? validResults[0]?.riskAssessment?.grade || 'A' : 'A';
            const persona = validResults[0]?.fingerprint?.persona || 'Alpha Hunter';

            // Gather rich counterparties with timestamps and sample tx hashes
            const counterpartyMap = new Map<string, { address: string; inboundCount: number; outboundCount: number; inboundUSD: number; outboundUSD: number; txHash?: string; lastDate?: string; chainId?: number }>();
            validResults.forEach(r => {
              r.interactionsSummary?.topCounterparties?.forEach(c => {
                const cAddr = c.address.toLowerCase();
                const existing = counterpartyMap.get(cAddr) || {
                  address: cAddr,
                  inboundCount: 0,
                  outboundCount: 0,
                  inboundUSD: 0,
                  outboundUSD: 0,
                  lastDate: c.lastInteractionDate,
                  chainId: c.chainId,
                };
                existing.inboundCount += c.inboundCount;
                existing.outboundCount += c.outboundCount;
                existing.inboundUSD += c.inboundUSD;
                existing.outboundUSD += c.outboundUSD;
                existing.lastDate = c.lastInteractionDate || existing.lastDate;
                counterpartyMap.set(cAddr, existing);
              });
            });

            // Sybil Report
            const mediaScore = computeMediaScore({
              address,
              transactions: validResults.flatMap(r => (r.transferSummary?.topInbound || []) as any),
              tokenTransfers: validResults.flatMap(r => (r.transferSummary?.topOutbound || []) as any),
              uniqueContractCount: validResults.reduce((sum, r) => sum + (r.fingerprint?.uniqueContracts || 0), 0) || 5,
              activeChainsCount: validResults.length,
              totalVolumeUSD: totalInflowUSD + totalOutflowUSD,
              totalGasUSD,
            });

            const sybilReport = await checkSybilStatus(address, mediaScore);
            const flaggedDBs = sybilReport.matches.filter(m => m.flagged).map(m => m.databaseId);

            const item: BulkWrappedWallet = {
              address,
              primaryName: identityReport?.primaryName || undefined,
              avatar: identityReport?.primaryAvatar || null,
              persona,
              riskGrade,
              riskScore,
              sybilProbability: sybilReport.mediaScore?.sybilProbability ?? (sybilReport.isFlagged ? 85 : 3),
              isFlagged: sybilReport.isFlagged,
              flaggedDatabases: flaggedDBs,
              totalGasETH,
              totalGasUSD,
              totalInflowUSD,
              totalOutflowUSD,
              transactionCount: totalTransactions,
              highRiskApprovalsCount: totalHighRiskApprovals,
              unlimitedApprovalsCount: totalUnlimitedApprovals,
              deadAssetsCount: totalDeadAssets,
              socialsCount: identityReport?.socials?.length || 0,
              counterparties: Array.from(counterpartyMap.values()),
            };

            return item;
          } catch (walletErr) {
            console.error(`Error scanning wallet ${address}:`, walletErr);
            return null;
          }
        })
      );

      for (const res of batchResults) {
        if (res.status === 'fulfilled' && res.value) {
          scannedWallets.push(res.value);
        }
      }

      if (i + BATCH_SIZE < validAddresses.length) {
        await delay(200);
      }
    }

    // ── Cluster Linkage Analysis ──
    const linkages: ClusterLinkage[] = [];
    const counterpartyFrequency = new Map<string, { address: string; label: string | null; count: number; users: Set<string> }>();

    for (const w of scannedWallets) {
      for (const c of w.counterparties) {
        const cAddr = c.address.toLowerCase();

        // 1. Direct Inter-Wallet Transfer Linkage
        if (addressSet.has(cAddr) && cAddr !== w.address.toLowerCase()) {
          const totalTxs = c.inboundCount + c.outboundCount;
          const totalUSD = c.inboundUSD + c.outboundUSD;
          linkages.push({
            source: w.address,
            target: cAddr,
            type: 'direct_transfer',
            txCount: totalTxs,
            volumeUSD: totalUSD,
            lastDate: c.lastDate,
            chainId: c.chainId || 1,
            detail: `${totalTxs} txs ($${totalUSD.toFixed(0)}) between ${w.address.slice(0, 6)}... and ${cAddr.slice(0, 6)}...`,
          });
        }

        // 2. Shared Counterparties
        const existing = counterpartyFrequency.get(cAddr) || {
          address: cAddr,
          label: getAddressLabel(cAddr, knownWallets),
          count: 0,
          users: new Set(),
        };
        existing.count++;
        existing.users.add(w.address.toLowerCase());
        counterpartyFrequency.set(cAddr, existing);
      }
    }

    const sharedCounterparties = Array.from(counterpartyFrequency.values())
      .filter(item => item.users.size > 1)
      .map(item => ({
        address: item.address,
        label: item.label,
        sharedCount: item.users.size,
      }))
      .sort((a, b) => b.sharedCount - a.sharedCount)
      .slice(0, 10);

    // Cluster Aggregates
    const totalWallets = scannedWallets.length;
    const totalTransactions = scannedWallets.reduce((sum, w) => sum + w.transactionCount, 0);
    const totalGasUSD = scannedWallets.reduce((sum, w) => sum + w.totalGasUSD, 0);
    const totalInflowUSD = scannedWallets.reduce((sum, w) => sum + w.totalInflowUSD, 0);
    const flaggedCount = scannedWallets.filter(w => w.isFlagged || w.sybilProbability > 50).length;
    const avgSybilProbability = totalWallets > 0
      ? Math.round(scannedWallets.reduce((sum, w) => sum + w.sybilProbability, 0) / totalWallets)
      : 0;
    const totalHighRiskApprovals = scannedWallets.reduce((sum, w) => sum + w.highRiskApprovalsCount, 0);

    const clusterResult: ClusterScanResult = {
      totalWallets,
      totalTransactions,
      totalGasUSD,
      totalInflowUSD,
      avgSybilProbability,
      flaggedCount,
      totalHighRiskApprovals,
      wallets: scannedWallets,
      linkages,
      sharedCounterparties,
      scannedAt: Date.now(),
    };

    return NextResponse.json(clusterResult);
  } catch (error) {
    console.error('Cluster batch scan error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during the cluster scan.' },
      { status: 500 }
    );
  }
}
