import assert from 'node:assert';
import { describe, it } from 'node:test';
import { buildReportingMetrics, REPORTING_METRIC_DEFINITIONS } from './reportingContract';
import { PriceProvenanceSummary, ScanResult, SybilReport } from './types';

const completePrices: PriceProvenanceSummary = {
  historical: 8,
  spotEstimate: 0,
  stablecoinAssumption: 2,
  unpriced: 0,
  status: 'complete',
};

function scan(chainId: number, activeDates: string[]): ScanResult {
  return {
    address: '0x1234567890123456789012345678901234567890',
    chainId,
    chainName: chainId === 1 ? 'Ethereum' : 'Base',
    gasSummary: {
      totalGasETH: 0,
      totalGasUSD: 0,
      transactionCount: 2,
      failedTransactionCount: 0,
      failedGasETH: 0,
      failedGasUSD: 0,
      monthlyBreakdown: [],
      categoryBreakdown: [],
      worstDay: null,
      averageGasPerTx: 0,
    },
    transferSummary: {
      topInbound: [],
      topOutbound: [],
      topNativeInbound: [],
      topNativeOutbound: [],
      totalInboundUSD: 100,
      totalOutboundUSD: 40,
      capitalFlowCoverage: {
        verifiedLegs: 2,
        totalLegs: 2,
        excludedSpotEstimateLegs: 0,
        unpricedLegs: 0,
        coveragePercent: 100,
        status: 'complete',
      },
    },
    approvalSummary: {
      activeApprovals: [],
      highRiskCount: 0,
      unlimitedCount: 1,
      totalApprovals: 1,
      totalExposureUSD: 25,
      totalExposureUSDProvenance: { ...completePrices },
      exposureStatus: 'complete',
    },
    fingerprint: {
      dimensions: [],
      persona: 'Active Trader',
      personaDescription: 'Test fixture',
      walletAgeMonths: 1,
      firstActivityDate: activeDates[0] ?? '',
      lastActivityDate: activeDates.at(-1) ?? '',
      activeMonths: 1,
      uniqueContracts: 1,
    },
    riskAssessment: {
      score: chainId === 1 ? 10 : 35,
      grade: chainId === 1 ? 'A' : 'C',
      factors: [],
    },
    activityProfile: {
      heatmap: [],
      activeDates,
      totalActiveDays: activeDates.length,
      mostActiveDay: 'Monday',
      mostActiveHour: 12,
      longestStreakDays: activeDates.length,
      currentStreakDays: activeDates.length,
      avgTxsPerActiveDay: 1,
    },
    interactionsSummary: {
      topProtocols: [{
        name: 'Protocol',
        protocol: 'Protocol',
        category: 'swap',
        txCount: 1,
        totalGasNative: 0,
        totalGasUSD: 0,
        totalVolumeUSD: 50,
        lastInteractionDate: activeDates.at(-1) ?? '',
        chainId,
        chainName: chainId === 1 ? 'Ethereum' : 'Base',
        nativeTokenSymbol: 'ETH',
        contracts: [],
      }],
      protocolVolumeUSD: 50,
      topCounterparties: [],
      uniqueContractCount: 1,
      uniqueCounterpartyCount: 1,
    },
    priceProvenance: { ...completePrices },
    scannedAt: 0,
    transactionCount: 2,
    tokenTransferCount: 1,
  };
}

const blacklistReport: SybilReport = {
  isFlagged: true,
  totalFlagged: 1,
  overallStatus: 'flagged',
  matches: [{
    databaseId: 'ofac',
    databaseName: 'OFAC',
    flagged: true,
    severity: 'critical',
    details: 'Test fixture',
    sourceUrl: 'https://ofac.treasury.gov/',
  }],
  lastSyncDate: '2026-08-23',
  totalDatabasesChecked: 1,
  mediaScore: {
    monetary: 50,
    engagement: 50,
    diversity: 50,
    identity: 50,
    age: 50,
    compositeScore: 60,
    sybilProbability: 40,
    monetaryIncluded: true,
    classification: 'Moderate / Farmer',
    explanation: 'Test fixture',
  },
};

describe('Canonical reporting contract', () => {
  it('publishes one definition for every typed public metric', () => {
    const fields = REPORTING_METRIC_DEFINITIONS.map(definition => definition.field);
    assert.strictEqual(new Set(fields).size, 13);
    assert.deepStrictEqual(new Set(fields), new Set([
      'inflowUSD',
      'outflowUSD',
      'netFlowUSD',
      'grossVolumeUSD',
      'protocolVolumeUSD',
      'approvalExposureUSD',
      'riskScore',
      'riskGrade',
      'sybilProbability',
      'blacklistStatus',
      'activeDays',
      'longestStreakDays',
      'totalUnlimitedApprovals',
    ]));
  });

  it('builds portfolio metrics with explicit aggregation semantics', () => {
    const metrics = buildReportingMetrics([
      scan(1, ['2026-08-20', '2026-08-21']),
      scan(8453, ['2026-08-21', '2026-08-22']),
    ], 'complete', completePrices, blacklistReport);

    assert.strictEqual(metrics.inflowUSD, 200);
    assert.strictEqual(metrics.outflowUSD, 80);
    assert.strictEqual(metrics.netFlowUSD, 120);
    assert.strictEqual(metrics.grossVolumeUSD, 280);
    assert.strictEqual(metrics.protocolVolumeUSD, 100);
    assert.strictEqual(metrics.approvalExposureUSD, 50);
    assert.strictEqual(metrics.riskScore, 35);
    assert.strictEqual(metrics.riskGrade, 'C');
    assert.strictEqual(metrics.sybilProbability, 40);
    assert.strictEqual(metrics.blacklistStatus, 'flagged');
    assert.strictEqual(metrics.activeDays, 3);
    assert.strictEqual(metrics.longestStreakDays, 3);
    assert.strictEqual(metrics.totalUnlimitedApprovals, 2);
  });

  it('withholds definitive metrics when required scan data is incomplete', () => {
    const metrics = buildReportingMetrics(
      [scan(1, ['2026-08-20'])],
      'partial',
      completePrices,
      blacklistReport,
    );

    assert.strictEqual(metrics.inflowUSD, null);
    assert.strictEqual(metrics.protocolVolumeUSD, null);
    assert.strictEqual(metrics.riskScore, null);
    assert.strictEqual(metrics.sybilProbability, null);
    assert.strictEqual(metrics.blacklistStatus, 'flagged');
    assert.strictEqual(metrics.activeDays, null);
  });

  it('keeps non-price metrics available when only historical pricing is incomplete', () => {
    const metrics = buildReportingMetrics([scan(1, ['2026-08-20'])], 'complete', {
      ...completePrices,
      status: 'partial',
      unpriced: 1,
    }, blacklistReport);

    assert.strictEqual(metrics.inflowUSD, 100);
    assert.strictEqual(metrics.outflowUSD, 40);
    assert.strictEqual(metrics.netFlowUSD, 60);
    assert.strictEqual(metrics.grossVolumeUSD, 140);
    assert.strictEqual(metrics.capitalFlowCoverage.status, 'complete');
    assert.strictEqual(metrics.protocolVolumeUSD, null);
    assert.strictEqual(metrics.riskScore, 10);
    assert.strictEqual(metrics.sybilProbability, 40);
    assert.strictEqual(metrics.approvalExposureUSD, 25);
    assert.strictEqual(metrics.blacklistStatus, 'flagged');
    assert.strictEqual(metrics.activeDays, 1);
    assert.strictEqual(metrics.longestStreakDays, 1);
    assert.strictEqual(metrics.totalUnlimitedApprovals, 1);
  });

  it('publishes verified partial capital flow and excludes unresolved legs', () => {
    const partialFlow = scan(1, ['2026-08-20']);
    partialFlow.transferSummary.capitalFlowCoverage = {
      verifiedLegs: 7,
      totalLegs: 10,
      excludedSpotEstimateLegs: 1,
      unpricedLegs: 2,
      coveragePercent: 70,
      status: 'partial',
    };

    const metrics = buildReportingMetrics([partialFlow], 'complete', {
      historical: 6,
      stablecoinAssumption: 1,
      spotEstimate: 1,
      unpriced: 2,
      status: 'partial',
    }, blacklistReport);

    assert.strictEqual(metrics.inflowUSD, 100);
    assert.strictEqual(metrics.outflowUSD, 40);
    assert.strictEqual(metrics.capitalFlowCoverage.status, 'partial');
    assert.strictEqual(metrics.capitalFlowCoverage.coveragePercent, 70);
    assert.strictEqual(metrics.capitalFlowCoverage.excludedSpotEstimateLegs, 1);
    assert.strictEqual(metrics.capitalFlowCoverage.unpricedLegs, 2);
  });
});
