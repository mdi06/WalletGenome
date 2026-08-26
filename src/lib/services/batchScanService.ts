import { detectDirectWalletLinkages, findSharedCounterparties } from '@/lib/clusterAnalysis';
import { BATCH_WALLET_CONCURRENCY, mapWithConcurrency } from '@/lib/api/requestPolicy';
import { processWalletScan } from '@/lib/services/scanService';
import type {
  BulkWrappedWallet,
  ClusterScanResult,
  DataAvailabilityError,
  WalletScanResponse,
} from '@/lib/types';

type WalletResult =
  | {
      kind: 'success';
      item: BulkWrappedWallet;
      evidence: NonNullable<Awaited<ReturnType<typeof processWalletScan>>['clusterEvidence']>;
    }
  | {
      kind: 'failure';
      failure: ClusterScanResult['failedWallets'][number];
    };

export function getClusterHistoryFailureReasons(
  result: Pick<WalletScanResponse, 'status' | 'availability'>,
): DataAvailabilityError[] | null {
  if (result.status === 'complete') return null;
  const historyReasons = result.availability
    .flatMap(item => item.errors)
    .filter(error => error.source !== 'prices');
  return historyReasons.length > 0 ? historyReasons : [{
    source: 'scan',
    code: 'provider_error',
    message: 'Required wallet history data was incomplete.',
  }];
}

export async function processBatchScan(
  addresses: string[],
  chainIds: number[],
): Promise<ClusterScanResult> {
  const walletResults = await mapWithConcurrency(
    addresses,
    BATCH_WALLET_CONCURRENCY,
    async (target): Promise<WalletResult> => {
      try {
        const result = await processWalletScan(target, chainIds, '', true);

        const historyFailureReasons = getClusterHistoryFailureReasons(result);
        if (historyFailureReasons) {
          return {
            kind: 'failure',
            failure: {
              target,
              status: result.status === 'complete' ? 'partial' : result.status,
              reasons: historyFailureReasons,
            },
          };
        }

        const {
          address,
          chains: validResults,
          aggregated,
          sybilReport,
          identityReport,
          metrics,
          clusterEvidence,
        } = result;

        const flaggedDBs = sybilReport?.matches.filter(match => match.flagged).map(match => match.databaseId) ?? [];
        if (!clusterEvidence) {
          throw new Error('Cluster evidence was not collected for a completed batch wallet.');
        }

        const persona = validResults.find(item => item.fingerprint?.persona && item.fingerprint.persona !== 'New Wallet')?.fingerprint?.persona
          || validResults[0]?.fingerprint?.persona
          || 'Alpha Hunter';

        const counterpartyMap = new Map<string, {
          address: string;
          inboundCount: number;
          outboundCount: number;
          inboundUSD: number;
          outboundUSD: number;
          txHash?: string;
          lastDate?: string;
          chainId?: number;
        }>();

        validResults.forEach(chainResult => {
          chainResult.interactionsSummary?.topCounterparties?.forEach(counterparty => {
            const lowerAddress = counterparty.address.toLowerCase();
            const existing = counterpartyMap.get(lowerAddress) || {
              address: lowerAddress,
              inboundCount: 0,
              outboundCount: 0,
              inboundUSD: 0,
              outboundUSD: 0,
              lastDate: counterparty.lastInteractionDate,
              chainId: counterparty.chainId,
            };
            existing.inboundCount += counterparty.inboundCount;
            existing.outboundCount += counterparty.outboundCount;
            existing.inboundUSD += counterparty.inboundUSD;
            existing.outboundUSD += counterparty.outboundUSD;
            existing.lastDate = counterparty.lastInteractionDate || existing.lastDate;
            counterpartyMap.set(lowerAddress, existing);
          });
        });

        const item: BulkWrappedWallet = {
          address,
          primaryName: identityReport?.primaryName || undefined,
          avatar: identityReport?.primaryAvatar || null,
          persona,
          riskGrade: metrics.riskGrade ?? 'Unavailable',
          riskScore: metrics.riskScore ?? 0,
          sybilProbability: metrics.sybilProbability ?? 0,
          isFlagged: sybilReport?.isFlagged ?? false,
          flaggedDatabases: flaggedDBs,
          totalGasETH: aggregated.totalGasETH,
          totalGasUSD: aggregated.totalGasUSD,
          totalInflowUSD: metrics.inflowUSD ?? 0,
          totalOutflowUSD: metrics.outflowUSD ?? 0,
          transactionCount: aggregated.totalTransactions,
          highRiskApprovalsCount: aggregated.totalHighRiskApprovals,
          unlimitedApprovalsCount: metrics.totalUnlimitedApprovals ?? 0,
          socialsCount: identityReport?.socials?.length || 0,
          counterparties: Array.from(counterpartyMap.values()),
        };

        return { kind: 'success', item, evidence: clusterEvidence };
      } catch (walletError) {
        const reason: DataAvailabilityError = {
          source: 'scan',
          code: 'provider_error',
          message: walletError instanceof Error ? walletError.message : 'Wallet scan failed.',
        };
        return {
          kind: 'failure',
          failure: { target, status: 'unavailable', reasons: [reason] },
        };
      }
    },
  );

  const successfulWallets = walletResults
    .filter((result): result is Extract<WalletResult, { kind: 'success' }> => result.kind === 'success')
    .map(result => result.item);
  const evidenceSets = walletResults
    .filter((result): result is Extract<WalletResult, { kind: 'success' }> => result.kind === 'success')
    .map(result => result.evidence);
  const failedWallets = walletResults
    .filter((result): result is Extract<WalletResult, { kind: 'failure' }> => result.kind === 'failure')
    .map(result => result.failure);

  let totalTransactions = 0;
  let totalGasUSD = 0;
  let totalInflowUSD = 0;
  let totalSybilProbability = 0;
  let flaggedCount = 0;
  let totalHighRiskApprovals = 0;

  successfulWallets.forEach(wallet => {
    totalTransactions += wallet.transactionCount;
    totalGasUSD += wallet.totalGasUSD;
    totalInflowUSD += wallet.totalInflowUSD;
    totalSybilProbability += wallet.sybilProbability;
    if (wallet.isFlagged) flaggedCount++;
    totalHighRiskApprovals += wallet.highRiskApprovalsCount;
  });

  return {
    status: failedWallets.length === 0 ? 'complete' : successfulWallets.length === 0 ? 'unavailable' : 'partial',
    totalWallets: successfulWallets.length,
    requestedWallets: addresses.length,
    totalTransactions,
    totalGasUSD,
    totalInflowUSD,
    avgSybilProbability: successfulWallets.length > 0 ? totalSybilProbability / successfulWallets.length : 0,
    flaggedCount,
    totalHighRiskApprovals,
    wallets: successfulWallets,
    failedWallets,
    linkages: detectDirectWalletLinkages(evidenceSets),
    sharedCounterparties: findSharedCounterparties(evidenceSets),
    scannedAt: Date.now(),
  };
}
