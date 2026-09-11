import { detectDirectWalletLinkages, findSharedCounterparties } from '@/lib/clusterAnalysis';
import { BATCH_WALLET_CONCURRENCY, enforceSharedQuota, mapWithConcurrency } from '@/lib/api/requestPolicy';
import { processWalletScan } from '@/lib/services/scanService';
import { throwIfAborted, RequestCancellationError } from '@/lib/cancellation';
import { classifyWalletAccount } from '@/lib/accountClassifier';
import { formatWalletAccountType, isClusterEligibleAccountType } from '@/lib/accountClassification';
import type {
  BulkWrappedWallet,
  ClusterScanResult,
  DataAvailabilityError,
  PriceProvenanceSummary,
  WalletAccountClassification,
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

type TargetAccountClassifier = (
  chainId: number,
  address: string,
  options?: { signal?: AbortSignal },
) => Promise<WalletAccountClassification>;

function emptyPriceProvenance(): PriceProvenanceSummary {
  return { historical: 0, spotEstimate: 0, stablecoinAssumption: 0, unpriced: 0, status: 'complete' };
}

function mergePriceProvenance(
  summaries: readonly (PriceProvenanceSummary | undefined)[],
): PriceProvenanceSummary {
  const statusRank: Record<PriceProvenanceSummary['status'], number> = {
    complete: 0,
    partial: 1,
    unavailable: 2,
  };
  return summaries.reduce<PriceProvenanceSummary>((total, summary) => {
    if (!summary) return total;
    total.historical += summary.historical;
    total.spotEstimate += summary.spotEstimate;
    total.stablecoinAssumption += summary.stablecoinAssumption;
    total.unpriced += summary.unpriced;
    if (statusRank[summary.status] > statusRank[total.status]) total.status = summary.status;
    return total;
  }, emptyPriceProvenance());
}

function sumKnown(values: readonly (number | null)[]): number | null {
  if (values.length === 0 || values.every(value => value === null)) return null;
  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

export async function classifyTargetAccounts(
  address: string,
  chainIds: number[],
  options: { signal?: AbortSignal; classifier?: TargetAccountClassifier } = {},
): Promise<WalletAccountClassification[]> {
  const classifier = options.classifier ?? ((chainId, target, classifierOptions) => (
    classifyWalletAccount(chainId, target, classifierOptions)
  ));
  return await mapWithConcurrency(
    chainIds,
    2,
    async chainId => await classifier(chainId, address, { signal: options.signal }),
    { signal: options.signal },
  );
}

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
  options: { signal?: AbortSignal; classifier?: TargetAccountClassifier } = {},
): Promise<ClusterScanResult> {
  throwIfAborted(options.signal);
  await enforceSharedQuota('batch', addresses.length, options.signal);
  const walletResults = await mapWithConcurrency(
    addresses,
    BATCH_WALLET_CONCURRENCY,
    async (target): Promise<WalletResult> => {
      try {
        throwIfAborted(options.signal);
        const accountClassifications = await classifyTargetAccounts(target, chainIds, {
          signal: options.signal,
          classifier: options.classifier,
        });
        const unsupportedAccounts = accountClassifications.filter(
          classification => !isClusterEligibleAccountType(classification.type),
        );
        if (unsupportedAccounts.length > 0) {
          return {
            kind: 'failure',
            failure: {
              target,
              status: 'unavailable',
              reasons: unsupportedAccounts.map(classification => ({
                source: 'scan' as const,
                code: 'unsupported_target' as const,
                message: classification.type === 'unknown'
                  ? `Could not verify the account type for ${target} on ${classification.chainName} (chain ${classification.chainId}); Cluster Scan requires a verified EOA or EIP-7702 delegated EOA.`
                  : `${target} is classified as ${formatWalletAccountType(classification.type)} on ${classification.chainName} (chain ${classification.chainId}). Cluster Scan currently supports EOAs and EIP-7702 delegated EOAs for its wallet-history linkage model.`,
              })),
            },
          };
        }
        const result = await processWalletScan(target, chainIds, '', true, {
          signal: options.signal,
          accountClassifications,
        });

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

        const gasPriceProvenance = mergePriceProvenance(
          validResults.map(chain => chain.gasSummary.priceProvenance),
        );
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
          totalGasUSD: gasPriceProvenance.status === 'unavailable' ? null : aggregated.totalGasUSD,
          gasPriceProvenance,
          totalInflowUSD: metrics.inflowUSD,
          totalOutflowUSD: metrics.outflowUSD,
          priceProvenance: metrics.priceProvenance,
          transactionCount: aggregated.totalTransactions,
          highRiskApprovalsCount: aggregated.totalHighRiskApprovals,
          unlimitedApprovalsCount: metrics.totalUnlimitedApprovals ?? 0,
          socialsCount: identityReport?.socials?.length || 0,
          counterparties: Array.from(counterpartyMap.values()),
          accountClassifications,
        };

        return { kind: 'success', item, evidence: clusterEvidence };
      } catch (walletError) {
        if (walletError instanceof RequestCancellationError) throw walletError;
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
    { signal: options.signal },
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
  let totalSybilProbability = 0;
  let flaggedCount = 0;
  let totalHighRiskApprovals = 0;

  successfulWallets.forEach(wallet => {
    totalTransactions += wallet.transactionCount;
    totalSybilProbability += wallet.sybilProbability;
    if (wallet.isFlagged) flaggedCount++;
    totalHighRiskApprovals += wallet.highRiskApprovalsCount;
  });

  const priceProvenance = mergePriceProvenance(successfulWallets.map(wallet => wallet.priceProvenance));
  const gasPriceProvenance = mergePriceProvenance(successfulWallets.map(wallet => wallet.gasPriceProvenance));
  const totalGasUSD = sumKnown(successfulWallets.map(wallet => wallet.totalGasUSD));
  const totalInflowUSD = sumKnown(successfulWallets.map(wallet => wallet.totalInflowUSD));

  return {
    source: 'live',
    status: failedWallets.length === 0 ? 'complete' : successfulWallets.length === 0 ? 'unavailable' : 'partial',
    totalWallets: successfulWallets.length,
    requestedWallets: addresses.length,
    totalTransactions,
    totalGasUSD,
    gasPriceProvenance,
    totalInflowUSD,
    priceProvenance,
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
