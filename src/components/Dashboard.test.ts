import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Dashboard from './Dashboard';
import { getAvailabilityMessage } from './status/DashboardStatusPanel';
import { extractProtocolBadges, formatCompactUSD } from '@/lib/utils/dashboardUtils';
import { MultiChainScanResult, ScanResult } from '@/lib/types';
import { buildReportingMetrics } from '@/lib/reportingContract';
import { getMockScanResult } from '@/lib/mockData';

const completePriceProvenance = {
  historical: 1,
  spotEstimate: 0,
  stablecoinAssumption: 0,
  unpriced: 0,
  status: 'complete' as const,
};

function createMockScan(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    address: '0x1234567890123456789012345678901234567890',
    chainId: 1,
    chainName: 'Ethereum',
    scannedAt: Date.now(),
    transactionCount: 1,
    tokenTransferCount: 0,
    gasSummary: {
      totalGasETH: 0.01,
      totalGasUSD: 30,
      transactionCount: 1,
      failedTransactionCount: 0,
      failedGasETH: 0,
      failedGasUSD: 0,
      monthlyBreakdown: [],
      categoryBreakdown: [],
      worstDay: null,
      averageGasPerTx: 0.01,
    },
    transferSummary: {
      topInbound: [],
      topOutbound: [],
      topNativeInbound: [],
      topNativeOutbound: [],
      totalInboundUSD: 0,
      totalOutboundUSD: 0,
      capitalFlowCoverage: {
        verifiedLegs: 0,
        totalLegs: 0,
        excludedSpotEstimateLegs: 0,
        unpricedLegs: 0,
        coveragePercent: 100,
        status: 'complete',
      },
    },
    approvalSummary: {
      activeApprovals: [],
      highRiskCount: 0,
      unlimitedCount: 0,
      totalApprovals: 0,
      totalExposureUSD: 0,
      totalExposureUSDProvenance: { ...completePriceProvenance, historical: 0 },
      exposureStatus: 'complete',
    },
    fingerprint: {
      dimensions: [],
      persona: 'New Wallet',
      personaDescription: 'New',
      walletAgeMonths: 1,
      firstActivityDate: '2026-01-01',
      lastActivityDate: '2026-01-01',
      activeMonths: 1,
      uniqueContracts: 0,
    },
    riskAssessment: {
      score: 0,
      grade: 'A',
      factors: [],
    },
    activityProfile: {
      heatmap: [],
      activeDates: ['2026-01-01'],
      totalActiveDays: 1,
      mostActiveDay: 'Monday',
      mostActiveHour: 12,
      longestStreakDays: 1,
      currentStreakDays: 1,
      avgTxsPerActiveDay: 1,
    },
    interactionsSummary: {
      topProtocols: [],
      protocolVolumeUSD: 0,
      topCounterparties: [],
      uniqueContractCount: 0,
      uniqueCounterpartyCount: 0,
    },
    priceProvenance: { ...completePriceProvenance },
    ...overrides,
  };
}

describe('Protocol Identity Badges Genuine Extraction Tests', () => {
  it('should return empty badges array for clean or new wallets with 0 protocol interactions', () => {
    const cleanScan: MultiChainScanResult = {
      address: '0x1234567890123456789012345678901234567890',
      status: 'complete',
      availability: [],
      chains: [createMockScan()],
      metrics: buildReportingMetrics([createMockScan()], 'complete', completePriceProvenance),
      aggregated: {
        totalGasETH: 0.01,
        totalGasUSD: 30,
        totalHighRiskApprovals: 0,
        totalUnlimitedApprovals: 0,
        totalTransactions: 1,
        worstChainRiskScore: 0,
        worstChainRiskGrade: 'A',
        priceProvenance: { ...completePriceProvenance },
      },
    };

    const badges = extractProtocolBadges(cleanScan);
    assert.deepStrictEqual(badges, [], 'Clean wallets must NOT receive hardcoded fictitious badges');
  });

  it('should NOT award OP_DELEGATOR simply because multiple chains were scanned', () => {
    const multiChainScan: MultiChainScanResult = {
      address: '0x1234567890123456789012345678901234567890',
      status: 'complete',
      availability: [],
      chains: [
        createMockScan({ chainId: 1, chainName: 'Ethereum' }),
        createMockScan({ chainId: 8453, chainName: 'Base' }),
        createMockScan({ chainId: 42161, chainName: 'Arbitrum' }),
      ],
      metrics: buildReportingMetrics([], 'complete', completePriceProvenance),
      aggregated: {
        totalGasETH: 0.03,
        totalGasUSD: 90,
        totalHighRiskApprovals: 0,
        totalUnlimitedApprovals: 0,
        totalTransactions: 3,
        worstChainRiskScore: 0,
        worstChainRiskGrade: 'A',
        priceProvenance: { ...completePriceProvenance },
      },
    };

    const badges = extractProtocolBadges(multiChainScan);
    assert.ok(!badges.includes('OP_DELEGATOR'), 'Must NOT award OP_DELEGATOR merely because data.chains.length > 1');
    assert.deepStrictEqual(badges, []);
  });

  it('should award genuine badges when actual protocols are interacted with', () => {
    const activeScan: MultiChainScanResult = {
      address: '0x1234567890123456789012345678901234567890',
      status: 'complete',
      availability: [],
      chains: [
        createMockScan({
          interactionsSummary: {
            topProtocols: [
              {
                name: 'Uniswap V3',
                protocol: 'Uniswap',
                category: 'swap',
                txCount: 12,
                totalGasNative: 0.01,
                totalGasUSD: 30,
                totalVolumeUSD: 5000,
                lastInteractionDate: '2026-01-01',
                chainId: 1,
                chainName: 'Ethereum',
                nativeTokenSymbol: 'ETH',
                contracts: [],
              },
              {
                name: 'Aave V3',
                protocol: 'Aave',
                category: 'lending',
                txCount: 5,
                totalGasNative: 0.005,
                totalGasUSD: 15,
                totalVolumeUSD: 2000,
                lastInteractionDate: '2026-01-01',
                chainId: 1,
                chainName: 'Ethereum',
                nativeTokenSymbol: 'ETH',
                contracts: [],
              },
              {
                name: 'Across HubPool',
                protocol: 'Across',
                category: 'bridge',
                txCount: 2,
                totalGasNative: 0.002,
                totalGasUSD: 6,
                totalVolumeUSD: 1000,
                lastInteractionDate: '2026-01-01',
                chainId: 1,
                chainName: 'Ethereum',
                nativeTokenSymbol: 'ETH',
                contracts: [],
              },
            ],
            protocolVolumeUSD: 8000,
            topCounterparties: [],
            uniqueContractCount: 3,
            uniqueCounterpartyCount: 3,
          },
        }),
      ],
      metrics: buildReportingMetrics([], 'complete', completePriceProvenance),
      aggregated: {
        totalGasETH: 0.05,
        totalGasUSD: 150,
        totalHighRiskApprovals: 0,
        totalUnlimitedApprovals: 0,
        totalTransactions: 19,
        worstChainRiskScore: 0,
        worstChainRiskGrade: 'A',
        priceProvenance: { ...completePriceProvenance },
      },
      identityReport: {
        primaryName: 'defi-user.eth',
        primaryAvatar: null,
        description: null,
        socials: [],
        domains: [{ platform: 'ens', identity: 'defi-user.eth' }],
        hasIdentity: true,
      },
    };

    const badges = extractProtocolBadges(activeScan);
    assert.ok(badges.includes('UNISWAP_TRADER'));
    assert.ok(badges.includes('AAVE_USER'));
    assert.ok(badges.includes('ACROSS_BRIDGER'));
    assert.ok(badges.includes('ENS_OWNER'));
    assert.ok(!badges.includes('OP_DELEGATOR'));
  });
});

describe('Dashboard Currency & Capital Flow Formatter Tests', () => {
  it('should format small dollar amounts (e.g. 3.692471) to exactly 2 decimal places ($3.69)', () => {
    assert.strictEqual(formatCompactUSD(3.692471), '$3.69');
    assert.strictEqual(formatCompactUSD('3.692471'), '$3.69');
    assert.strictEqual(formatCompactUSD(3.700817), '$3.70');
    assert.strictEqual(formatCompactUSD('3.700817'), '$3.70');
    assert.strictEqual(formatCompactUSD(15.5), '$15.50');
  });

  it('should format thousands ($X.XXK)', () => {
    assert.strictEqual(formatCompactUSD(1250), '$1.25K');
    assert.strictEqual(formatCompactUSD('142904'), '$142.90K');
  });

  it('should format millions ($X.XXM)', () => {
    assert.strictEqual(formatCompactUSD(3700817), '$3.70M');
    assert.strictEqual(formatCompactUSD('3700817.45'), '$3.70M');
  });

  it('should format billions ($X.XXB)', () => {
    assert.strictEqual(formatCompactUSD(4525340186), '$4.53B');
    assert.strictEqual(formatCompactUSD('4525340186.12'), '$4.53B');
  });

  it('should format trillions ($X.XXT)', () => {
    assert.strictEqual(formatCompactUSD(1234567890000), '$1.23T');
  });

  it('should handle zero, null, undefined and invalid strings gracefully', () => {
    assert.strictEqual(formatCompactUSD(0), '$0');
    assert.strictEqual(formatCompactUSD(null), '$0');
    assert.strictEqual(formatCompactUSD(undefined), '$0');
    assert.strictEqual(formatCompactUSD(''), '$0');
    assert.strictEqual(formatCompactUSD('invalid'), '$0');
  });
});

describe('Dashboard provider availability messaging', () => {
  it('renders a complete mock result as the normal analytics dashboard', () => {
    const markup = renderToStaticMarkup(createElement(Dashboard, { data: getMockScanResult() }));

    assert.match(markup, /WORST-CHAIN RISK GRADE/);
    assert.match(markup, /SYBIL PROBABILITY/);
    assert.doesNotMatch(markup, /Definitive analytics unavailable/i);
    assert.doesNotMatch(markup, /Partial provider data/i);
  });

  it('withholds definitive analytics for partial and unavailable scans', () => {
    assert.match(getAvailabilityMessage('partial') ?? '', /require complete wallet history/i);
    assert.match(getAvailabilityMessage('unavailable') ?? '', /not return enough verified data/i);
    assert.strictEqual(getAvailabilityMessage('complete'), null);
  });

  it('renders canonical worst-chain risk without trust-score inversion or hardcoded aggression', () => {
    const data = getMockScanResult();
    data.metrics.riskScore = 35;
    data.metrics.riskGrade = 'C';
    data.metrics.sybilProbability = 20;
    data.aggregated.worstChainRiskScore = 35;
    data.aggregated.worstChainRiskGrade = 'C';

    const markup = renderToStaticMarkup(createElement(Dashboard, { data }));
    assert.match(markup, /WORST-CHAIN RISK GRADE/);
    assert.match(markup, />35<\/span>/);
    assert.match(markup, />\/ 100 RISK<\/span>/);
    assert.doesNotMatch(markup, /TRUST SCORE/);
    assert.doesNotMatch(markup, /Aggression Level/);
    assert.doesNotMatch(markup, />A\+</);
  });

  it('renders dataset-level failures instead of the normal clean dashboard', () => {
    const data: MultiChainScanResult = {
      address: '0x1234567890123456789012345678901234567890',
      status: 'partial',
      availability: [{
        chainId: 1,
        chainName: 'Ethereum',
        transactions: 'complete',
        tokenTransfers: 'unavailable',
        internalTransactions: 'complete',
        prices: 'partial',
        errors: [{
          source: 'tokenTransfers',
          code: 'timeout',
          message: 'Token transfer provider timed out.',
        }],
      }],
      chains: [],
      metrics: buildReportingMetrics([], 'partial', {
        historical: 0,
        spotEstimate: 0,
        stablecoinAssumption: 0,
        unpriced: 1,
        status: 'unavailable',
      }),
      aggregated: {
        totalGasETH: 0,
        totalGasUSD: 0,
        totalHighRiskApprovals: 0,
        totalUnlimitedApprovals: 0,
        totalTransactions: 0,
        worstChainRiskScore: null,
        worstChainRiskGrade: null,
        priceProvenance: {
          historical: 0,
          spotEstimate: 0,
          stablecoinAssumption: 0,
          unpriced: 1,
          status: 'unavailable',
        },
      },
    };

    const markup = renderToStaticMarkup(createElement(Dashboard, { data }));
    assert.match(markup, /Partial history scan/i);
    assert.match(markup, /Token transfer provider timed out/i);
    assert.doesNotMatch(markup, /TRUST SCORE/i);
  });

  it('keeps successfully returned analytics visible under a partial-data warning', () => {
    const data = getMockScanResult();
    data.status = 'partial';
    data.metrics = buildReportingMetrics(data.chains, 'partial', {
      ...completePriceProvenance,
      status: 'partial',
      spotEstimate: 1,
    });
    data.availability = [{
      chainId: 1,
      chainName: 'Ethereum',
      transactions: 'complete',
      tokenTransfers: 'partial',
      internalTransactions: 'complete',
      prices: 'partial',
      errors: [{
        source: 'tokenTransfers',
        code: 'result_truncated',
        message: 'Fallback returned a usable subset.',
      }],
    }];

    const markup = renderToStaticMarkup(createElement(Dashboard, { data }));
    assert.match(markup, /require complete wallet history/i);
    assert.match(markup, /BEHAVIORAL DNA/);
    assert.match(markup, /TRANSFERS/);
    assert.match(markup, /Fallback returned a usable subset/);
    assert.match(markup, /Withheld/);
  });

  it('consolidates chain warnings into one expandable provider summary', () => {
    const data = getMockScanResult();
    data.chainWarnings = [
      { chainId: 1, chainName: 'Ethereum', message: 'Ethereum has incomplete historical prices.' },
      { chainId: 8453, chainName: 'Base', message: 'Base has incomplete historical prices.' },
    ];

    const markup = renderToStaticMarkup(createElement(Dashboard, { data }));
    assert.match(markup, /<details/);
    assert.match(markup, /Provider warnings/);
    assert.match(markup, /2 provider warnings need attention/);
    assert.match(markup, /Ethereum has incomplete historical prices/);
    assert.doesNotMatch(markup, /Chain Warnings \/ Degradation Alert/);
  });

  it('does not promote partial capital flow as a Behavioral DNA headline', () => {
    const data = getMockScanResult();
    data.chains[0].transferSummary.capitalFlowCoverage = {
      verifiedLegs: 7,
      totalLegs: 10,
      excludedSpotEstimateLegs: 1,
      unpricedLegs: 2,
      coveragePercent: 70,
      status: 'partial',
    };
    data.metrics = buildReportingMetrics(data.chains, 'complete', {
      historical: 6,
      stablecoinAssumption: 1,
      spotEstimate: 1,
      unpriced: 2,
      status: 'partial',
    }, data.sybilReport);

    const markup = renderToStaticMarkup(createElement(Dashboard, { data }));
    assert.doesNotMatch(markup, /VERIFIED CAPITAL FLOW/);
    assert.match(markup, /LIFETIME GAS/);
  });

  it('shows a complete per-chain transaction distribution beside lifetime gas', () => {
    const data = getMockScanResult();
    data.chains[0].transactionCount = 75;
    data.chains[1].transactionCount = 25;
    data.aggregated.totalTransactions = 100;

    const markup = renderToStaticMarkup(createElement(Dashboard, { data }));
    assert.match(markup, /CHAIN ACTIVITY/);
    assert.match(markup, /Ethereum/);
    assert.match(markup, /75 TXS/);
    assert.match(markup, /75%/);
    assert.match(markup, /Base/);
    assert.match(markup, /25 TXS/);
    assert.match(markup, /25%/);
  });

  it('does not present incomplete chain history as zero activity', () => {
    const data = getMockScanResult();
    data.availability[1].transactions = 'partial';
    data.availability.push({
      chainId: 10,
      chainName: 'Optimism',
      transactions: 'unavailable',
      tokenTransfers: 'unavailable',
      internalTransactions: 'unavailable',
      prices: 'unavailable',
      errors: [],
    });

    const markup = renderToStaticMarkup(createElement(Dashboard, { data }));
    assert.match(markup, /PARTIAL DATA/);
    assert.match(markup, /Optimism/);
    assert.match(markup, /UNAVAILABLE/);
    assert.doesNotMatch(markup, /Optimism[\s\S]{0,120}>0 TXS</);
  });

  it('keeps blacklist detection visible when behavioral Sybil scoring is gated', () => {
    const data = getMockScanResult();
    data.status = 'partial';
    data.sybilReport = data.sybilReport
      ? { ...data.sybilReport, mediaScore: undefined }
      : undefined;
    data.metrics = buildReportingMetrics(
      data.chains,
      'partial',
      completePriceProvenance,
      data.sybilReport,
    );

    const markup = renderToStaticMarkup(createElement(Dashboard, { data }));
    assert.match(markup, /BLACKLIST STATUS/);
    assert.match(markup, /Behavioral Score Unavailable/);
    assert.doesNotMatch(markup, /Trusta MEDIA[\s\S]*CLEAN/);
  });
});
