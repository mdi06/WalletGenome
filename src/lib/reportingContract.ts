import {
  BlacklistStatus,
  DataAvailabilityStatus,
  PriceProvenanceSummary,
  ReportingMetrics,
  RiskGrade,
  ScanResult,
  SybilReport,
} from './types';

export type ReportingMetricKey = Exclude<keyof ReportingMetrics, 'priceProvenance' | 'capitalFlowCoverage'>;

export interface ReportingMetricDefinition {
  field: ReportingMetricKey;
  label: string;
  unit: 'USD' | 'score_0_100' | 'grade' | 'probability_percent' | 'status' | 'days' | 'count';
  timeWindow: string;
  dataSources: string;
  inclusionExclusion: string;
  aggregation: string;
  completeness: string;
  priceProvenance: string;
}

export const REPORTING_METRIC_DEFINITIONS: readonly ReportingMetricDefinition[] = [
  {
    field: 'inflowUSD',
    label: 'Inflow',
    unit: 'USD',
    timeWindow: 'Full history returned by the selected explorers.',
    dataSources: 'Successful native, internal, and ERC-20 transfers to the scanned wallet.',
    inclusionExclusion: 'Includes priced inbound transfer legs; excludes failed and unpriced legs.',
    aggregation: 'Sum across selected chains; each transfer leg is counted once.',
    completeness: 'Publishes a verified subtotal when history is complete and at least one eligible leg is historically priced; otherwise unavailable.',
    priceProvenance: 'Historical or stablecoin assumption only. Spot estimates and unpriced legs are excluded and reported in capitalFlowCoverage.',
  },
  {
    field: 'outflowUSD',
    label: 'Outflow',
    unit: 'USD',
    timeWindow: 'Full history returned by the selected explorers.',
    dataSources: 'Successful native, internal, and ERC-20 transfers from the scanned wallet.',
    inclusionExclusion: 'Includes priced outbound transfer legs; excludes failed and unpriced legs.',
    aggregation: 'Sum across selected chains; each transfer leg is counted once.',
    completeness: 'Publishes a verified subtotal when history is complete and at least one eligible leg is historically priced; otherwise unavailable.',
    priceProvenance: 'Historical or stablecoin assumption only. Spot estimates and unpriced legs are excluded and reported in capitalFlowCoverage.',
  },
  {
    field: 'netFlowUSD',
    label: 'Net flow',
    unit: 'USD',
    timeWindow: 'Same window as inflowUSD and outflowUSD.',
    dataSources: 'Canonical inflowUSD and outflowUSD fields.',
    inclusionExclusion: 'No additional records are introduced.',
    aggregation: 'inflowUSD minus outflowUSD.',
    completeness: 'Available when both verified flow subtotals are available; inherits their partial coverage status.',
    priceProvenance: 'Combined provenance of the inflow and outflow inputs.',
  },
  {
    field: 'grossVolumeUSD',
    label: 'Gross transfer volume',
    unit: 'USD',
    timeWindow: 'Same window as inflowUSD and outflowUSD.',
    dataSources: 'Canonical inflowUSD and outflowUSD fields.',
    inclusionExclusion: 'Counts both directions; it is not net flow or portfolio value.',
    aggregation: 'inflowUSD plus outflowUSD.',
    completeness: 'Available when both verified flow subtotals are available; inherits their partial coverage status.',
    priceProvenance: 'Combined provenance of the inflow and outflow inputs.',
  },
  {
    field: 'protocolVolumeUSD',
    label: 'Protocol interaction volume',
    unit: 'USD',
    timeWindow: 'Full history returned by the selected explorers.',
    dataSources: 'Priced transfer legs correlated to recognized protocol transactions and contracts.',
    inclusionExclusion: 'Excludes unpriced legs and ordinary counterparty transfers.',
    aggregation: 'Sum by protocol contract and chain, then across chains without removing chain provenance.',
    completeness: 'Unavailable unless transaction, transfer, and price inputs are complete.',
    priceProvenance: 'Combined provenance of attributed protocol transfer legs.',
  },
  {
    field: 'approvalExposureUSD',
    label: 'Estimated approval exposure',
    unit: 'USD',
    timeWindow: 'Latest observed approval state in returned history.',
    dataSources: 'Active ERC-20 approvals, reconstructed token balances, and current token prices.',
    inclusionExclusion: 'Includes priced positive balances for active approvals; revoked, zero-balance, and unpriced exposure are not converted to zero proof.',
    aggregation: 'Sum of per-approval estimated exposure across selected chains.',
    completeness: 'Unavailable when any active approval balance or required price is unknown.',
    priceProvenance: 'Current spot quote, stablecoin assumption, or unpriced when no current quote is available.',
  },
  {
    field: 'riskScore',
    label: 'Worst-chain risk score',
    unit: 'score_0_100',
    timeWindow: 'Full history returned by the selected explorers.',
    dataSources: 'The documented approval, failure, stale-approval, and unknown-contract factors.',
    inclusionExclusion: 'Higher is riskier; this is a heuristic, not a loss probability.',
    aggregation: 'Maximum chain risk score across selected chains.',
    completeness: 'Unavailable when wallet history is incomplete.',
    priceProvenance: 'Not applicable.',
  },
  {
    field: 'riskGrade',
    label: 'Worst-chain risk grade',
    unit: 'grade',
    timeWindow: 'Same window as riskScore.',
    dataSources: 'Canonical riskScore.',
    inclusionExclusion: 'Grades A, B, C, D, and F map to documented score thresholds.',
    aggregation: 'Grade derived from the maximum chain risk score.',
    completeness: 'Unavailable when wallet history is incomplete.',
    priceProvenance: 'Not applicable.',
  },
  {
    field: 'sybilProbability',
    label: 'Behavioral Sybil probability',
    unit: 'probability_percent',
    timeWindow: 'Full returned cross-chain behavior history.',
    dataSources: 'MEDIA behavioral dimensions; blacklist matches are reported separately.',
    inclusionExclusion: 'A heuristic behavioral score, not a blacklist verdict.',
    aggregation: 'Computed once from the combined selected-chain dataset.',
    completeness: 'Unavailable when wallet history or the behavioral report is incomplete.',
    priceProvenance: 'When historical prices are incomplete, the monetary dimension is omitted and the remaining behavioral dimensions are reweighted.',
  },
  {
    field: 'blacklistStatus',
    label: 'Blacklist status',
    unit: 'status',
    timeWindow: 'Latest blacklist snapshots checked for the scan.',
    dataSources: 'Configured external and bundled blacklist datasets; excludes the Trusta behavioral heuristic.',
    inclusionExclusion: 'Flagged when any non-behavioral blacklist source positively matches.',
    aggregation: 'flagged overrides clear; unavailable when checks did not complete.',
    completeness: 'Unavailable when the Sybil/blacklist report is absent.',
    priceProvenance: 'Not applicable.',
  },
  {
    field: 'activeDays',
    label: 'Active days',
    unit: 'days',
    timeWindow: 'Full transaction history returned by selected explorers.',
    dataSources: 'Successful and failed normal transactions with valid timestamps.',
    inclusionExclusion: 'A UTC calendar date counts once even when activity occurs on multiple chains.',
    aggregation: 'Cardinality of the union of UTC activity dates.',
    completeness: 'Unavailable unless transaction history is complete.',
    priceProvenance: 'Not applicable.',
  },
  {
    field: 'longestStreakDays',
    label: 'Longest activity streak',
    unit: 'days',
    timeWindow: 'Full transaction history returned by selected explorers.',
    dataSources: 'The union of UTC activity dates across selected chains.',
    inclusionExclusion: 'Consecutive UTC calendar dates; same-day cross-chain activity counts once.',
    aggregation: 'Longest consecutive run in the sorted date union.',
    completeness: 'Unavailable unless transaction history is complete.',
    priceProvenance: 'Not applicable.',
  },
  {
    field: 'totalUnlimitedApprovals',
    label: 'Unlimited approvals',
    unit: 'count',
    timeWindow: 'Latest observed approval state in returned history.',
    dataSources: 'Decoded ERC-20 approval transactions.',
    inclusionExclusion: 'Counts active unlimited approvals; revoked approvals are excluded.',
    aggregation: 'Sum across selected chains.',
    completeness: 'Unavailable unless transaction history is complete.',
    priceProvenance: 'Not applicable.',
  },
] as const;

function worstRiskGrade(chains: ScanResult[]): RiskGrade | null {
  if (chains.length === 0) return null;
  const order: Record<RiskGrade, number> = { A: 1, B: 2, C: 3, D: 4, F: 5 };
  return chains.reduce<RiskGrade>((worst, chain) => (
    order[chain.riskAssessment.grade] > order[worst] ? chain.riskAssessment.grade : worst
  ), 'A');
}

function longestDateStreak(activeDates: string[]): number {
  if (activeDates.length === 0) return 0;
  let longest = 1;
  let current = 1;
  for (let index = 1; index < activeDates.length; index++) {
    const previous = Date.parse(`${activeDates[index - 1]}T00:00:00Z`);
    const next = Date.parse(`${activeDates[index]}T00:00:00Z`);
    if (next - previous === 86_400_000) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

function getBlacklistStatus(sybilReport?: SybilReport): BlacklistStatus {
  if (!sybilReport) return 'unavailable';
  return sybilReport.matches.some(match => match.databaseId !== 'trusta' && match.flagged)
    ? 'flagged'
    : 'clear';
}

export function buildReportingMetrics(
  chains: ScanResult[],
  status: DataAvailabilityStatus,
  priceProvenance: PriceProvenanceSummary,
  sybilReport?: SybilReport,
): ReportingMetrics {
  const historyComplete = status === 'complete';
  const historicalPricesComplete = priceProvenance.status === 'complete';
  const inflowUSD = chains.reduce((sum, chain) => sum + chain.transferSummary.totalInboundUSD, 0);
  const outflowUSD = chains.reduce((sum, chain) => sum + chain.transferSummary.totalOutboundUSD, 0);
  const capitalFlowCounts = chains.reduce((summary, chain) => {
    summary.verifiedLegs += chain.transferSummary.capitalFlowCoverage.verifiedLegs;
    summary.totalLegs += chain.transferSummary.capitalFlowCoverage.totalLegs;
    summary.excludedSpotEstimateLegs += chain.transferSummary.capitalFlowCoverage.excludedSpotEstimateLegs;
    summary.unpricedLegs += chain.transferSummary.capitalFlowCoverage.unpricedLegs;
    return summary;
  }, {
    verifiedLegs: 0,
    totalLegs: 0,
    excludedSpotEstimateLegs: 0,
    unpricedLegs: 0,
  });
  const hasVerifiedCapitalFlow = capitalFlowCounts.totalLegs === 0 || capitalFlowCounts.verifiedLegs > 0;
  const capitalFlowAvailable = historyComplete && hasVerifiedCapitalFlow;
  const capitalFlowCoverage = {
    ...capitalFlowCounts,
    coveragePercent: historyComplete
      ? capitalFlowCounts.totalLegs === 0
        ? 100
        : Math.round((capitalFlowCounts.verifiedLegs / capitalFlowCounts.totalLegs) * 100)
      : null,
    status: !historyComplete || !hasVerifiedCapitalFlow
      ? 'unavailable' as const
      : capitalFlowCounts.verifiedLegs < capitalFlowCounts.totalLegs
        ? 'partial' as const
        : 'complete' as const,
  };
  const approvalExposureIsComplete = chains.every(chain =>
    chain.approvalSummary.exposureStatus === 'complete'
    && chain.approvalSummary.totalExposureUSDProvenance.status === 'complete'
  );
  const activeDates = [...new Set(chains.flatMap(chain => chain.activityProfile.activeDates))].sort();

  return {
    inflowUSD: capitalFlowAvailable ? inflowUSD : null,
    outflowUSD: capitalFlowAvailable ? outflowUSD : null,
    netFlowUSD: capitalFlowAvailable ? inflowUSD - outflowUSD : null,
    grossVolumeUSD: capitalFlowAvailable ? inflowUSD + outflowUSD : null,
    protocolVolumeUSD: historyComplete && historicalPricesComplete
      ? chains.reduce((sum, chain) => sum + chain.interactionsSummary.protocolVolumeUSD, 0)
      : null,
    approvalExposureUSD: historyComplete && approvalExposureIsComplete
      ? chains.reduce((sum, chain) => sum + (chain.approvalSummary.totalExposureUSD ?? 0), 0)
      : null,
    riskScore: historyComplete && chains.length > 0
      ? Math.max(...chains.map(chain => chain.riskAssessment.score))
      : null,
    riskGrade: historyComplete ? worstRiskGrade(chains) : null,
    sybilProbability: historyComplete ? sybilReport?.mediaScore?.sybilProbability ?? null : null,
    blacklistStatus: getBlacklistStatus(sybilReport),
    activeDays: historyComplete ? activeDates.length : null,
    longestStreakDays: historyComplete ? longestDateStreak(activeDates) : null,
    totalUnlimitedApprovals: historyComplete
      ? chains.reduce((sum, chain) => sum + chain.approvalSummary.unlimitedCount, 0)
      : null,
    capitalFlowCoverage,
    priceProvenance,
  };
}
