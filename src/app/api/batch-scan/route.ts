import { NextRequest, NextResponse } from 'next/server';
import { BulkWrappedWallet, ClusterScanResult } from '@/lib/types';
import { processWalletScan } from '@/lib/services/scanService';

export const maxDuration = 60; // Vercel limit

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { addresses, chainIds, customApiKey } = body;

    if (!Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json(
        { error: 'Please provide an array of wallet addresses.' },
        { status: 400 }
      );
    }

    if (addresses.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 wallets per batch supported in this tier.' },
        { status: 400 }
      );
    }

    const uniqueTargets = Array.from(new Set(addresses.map(a => a.trim().toLowerCase()))).filter(Boolean);

    // Process wallets concurrently
    const walletResults = await Promise.all(
      uniqueTargets.map(async (target) => {
        try {
          const result = await processWalletScan(target, chainIds, false, customApiKey);

          const {
            address,
            chains: validResults,
            aggregated,
            sybilReport,
            identityReport,
            allInboundUSD,
            allOutboundUSD,
          } = result;

          const flaggedDBs = sybilReport.matches.filter((m: any) => m.flagged).map((m: any) => m.databaseId);
          const persona = validResults.find((r: any) => r.fingerprint?.persona && r.fingerprint.persona !== 'New Wallet')?.fingerprint?.persona || validResults[0]?.fingerprint?.persona || 'Alpha Hunter';

          // Gather rich counterparties
          const counterpartyMap = new Map<string, { address: string; inboundCount: number; outboundCount: number; inboundUSD: number; outboundUSD: number; txHash?: string; lastDate?: string; chainId?: number }>();
          validResults.forEach((r: any) => {
            r.interactionsSummary?.topCounterparties?.forEach((c: any) => {
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

          const item: BulkWrappedWallet = {
            address,
            primaryName: identityReport?.primaryName || undefined,
            avatar: identityReport?.primaryAvatar || null,
            persona,
            riskGrade: aggregated.riskGrade as any,
            riskScore: aggregated.riskScore,
            sybilProbability: sybilReport.mediaScore?.sybilProbability ?? (sybilReport.isFlagged ? 85 : 3),
            isFlagged: sybilReport.isFlagged,
            flaggedDatabases: flaggedDBs,
            totalGasETH: aggregated.totalGasETH,
            totalGasUSD: aggregated.totalGasUSD,
            totalInflowUSD: allInboundUSD || 0,
            totalOutflowUSD: allOutboundUSD || 0,
            transactionCount: aggregated.totalTransactions,
            highRiskApprovalsCount: aggregated.totalHighRiskApprovals,
            unlimitedApprovalsCount: aggregated.totalUnlimitedApprovals || 0,
            deadAssetsCount: aggregated.totalDeadAssets,
            socialsCount: identityReport?.socials?.length || 0,
            counterparties: Array.from(counterpartyMap.values()),
          };

          return item;
        } catch (walletErr) {
          console.error(`Error scanning wallet ${target}:`, walletErr);
          return null;
        }
      })
    );

    const successfulWallets = walletResults.filter((r): r is BulkWrappedWallet => r !== null);

    let totalTransactions = 0;
    let totalGasUSD = 0;
    let totalInflowUSD = 0;
    let totalSybilProb = 0;
    let flaggedCount = 0;
    let totalHighRiskApprovals = 0;

    const allCounterparties = new Map<string, { address: string; count: number; volumeUSD: number; sharedBy: Set<string> }>();

    successfulWallets.forEach(w => {
      totalTransactions += w.transactionCount;
      totalGasUSD += w.totalGasUSD;
      totalInflowUSD += w.totalInflowUSD;
      totalSybilProb += w.sybilProbability;
      if (w.isFlagged) flaggedCount++;
      totalHighRiskApprovals += w.highRiskApprovalsCount;

      w.counterparties.forEach(c => {
        const cAddr = c.address.toLowerCase();
        const existing = allCounterparties.get(cAddr) || { address: cAddr, count: 0, volumeUSD: 0, sharedBy: new Set() };
        existing.count += c.inboundCount + c.outboundCount;
        existing.volumeUSD += c.inboundUSD + c.outboundUSD;
        existing.sharedBy.add(w.address.toLowerCase());
        allCounterparties.set(cAddr, existing);
      });
    });

    const sharedCounterparties = Array.from(allCounterparties.values())
      .filter(c => c.sharedBy.size > 1)
      .map(c => ({
        address: c.address,
        label: null,
        sharedCount: c.sharedBy.size,
      }));

    const clusterData: ClusterScanResult = {
      totalWallets: successfulWallets.length,
      totalTransactions,
      totalGasUSD,
      totalInflowUSD,
      avgSybilProbability: successfulWallets.length > 0 ? totalSybilProb / successfulWallets.length : 0,
      flaggedCount,
      totalHighRiskApprovals,
      wallets: successfulWallets,
      linkages: [],
      sharedCounterparties,
      scannedAt: Date.now()
    };

    return NextResponse.json(clusterData);

  } catch (error) {
    console.error('Batch Scan error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while analyzing the cluster.' },
      { status: 500 }
    );
  }
}
