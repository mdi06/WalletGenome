import { describe, it } from 'node:test';
import assert from 'node:assert';
import { aggregateResults } from './scanner';
import { ScanResult } from './types';

function createMockScanResult(overrides: Partial<ScanResult> & { chainId: number; chainName: string }): ScanResult {
  return {
    address: '0x1234567890123456789012345678901234567890',
    scannedAt: Date.now(),
    transactionCount: 10,
    tokenTransferCount: 5,
    gasSummary: {
      totalGasETH: 0.1,
      totalGasUSD: 300,
      transactionCount: 10,
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
      totalInboundUSD: 1000,
      totalOutboundUSD: 500,
    },
    approvalSummary: {
      activeApprovals: [],
      highRiskCount: 0,
      unlimitedCount: 0,
      totalApprovals: 0,
      totalExposureUSD: 0,
    },
    graveyardSummary: {
      deadAssets: [],
      totalPeakValueLost: 0,
      totalTokensDead: 0,
    },
    fingerprint: {
      dimensions: [
        { axis: 'DeFi Diversity', score: 80, detail: 'High' },
        { axis: 'Activity', score: 70, detail: 'Moderate' },
        { axis: 'Capital Efficiency', score: 75, detail: 'Good' },
        { axis: 'Risk Appetite', score: 20, detail: 'Low' },
        { axis: 'Maturity', score: 85, detail: 'Old' },
        { axis: 'Network Breadth', score: 65, detail: 'Wide' },
      ],
      persona: 'DeFi Power User',
      personaDescription: 'Power user',
      walletAgeMonths: 24,
      firstActivityDate: '2024-01-01',
      lastActivityDate: '2026-01-01',
      activeMonths: 20,
      uniqueContracts: 25,
    },
    riskAssessment: {
      score: 5,
      grade: 'A',
      factors: [
        {
          label: 'Clean History',
          impact: 0,
          description: 'No significant risk factors',
          severity: 'info',
        },
      ],
    },
    activityProfile: {
      heatmap: [],
      totalActiveDays: 50,
      mostActiveDay: 'Monday',
      mostActiveHour: 14,
      longestStreakDays: 5,
      currentStreakDays: 1,
      avgTxsPerActiveDay: 2,
    },
    interactionsSummary: {
      topProtocols: [],
      topCounterparties: [],
      uniqueContractCount: 25,
      uniqueCounterpartyCount: 15,
    },
    ...overrides,
  };
}

describe('Multi-Chain Aggregation & Currency Differentiation Tests', () => {
  it('should correctly evaluate worst risk grade across multiple chains (e.g. Ethereum Clean A + Arbitrum Drainers F -> Grade F)', () => {
    const ethClean = createMockScanResult({
      chainId: 1,
      chainName: 'Ethereum',
      riskAssessment: {
        score: 5,
        grade: 'A',
        factors: [{ label: 'Clean History', impact: 0, description: 'Clean', severity: 'info' }],
      },
    });

    const arbDrainer = createMockScanResult({
      chainId: 42161,
      chainName: 'Arbitrum',
      riskAssessment: {
        score: 85,
        grade: 'F',
        factors: [
          { label: '3 High-Risk Approvals', impact: 40, description: 'Unlimited approvals to unverified contracts', severity: 'critical' },
          { label: '25% Failed Transactions', impact: 25, description: 'Wasted gas', severity: 'warning' },
        ],
      },
      approvalSummary: {
        activeApprovals: [],
        highRiskCount: 3,
        unlimitedCount: 5,
        totalApprovals: 5,
        totalExposureUSD: 50000,
      },
    });

    const aggregatedResult = aggregateResults('0x1234567890123456789012345678901234567890', [ethClean, arbDrainer]);

    assert.strictEqual(aggregatedResult.aggregated.riskGrade, 'F', 'Overall riskGrade must be F when a scanned chain has Grade F drainers');
    assert.strictEqual(aggregatedResult.aggregated.riskScore, 85, 'Overall riskScore must reflect the maximum risk across chains');
    assert.strictEqual(aggregatedResult.aggregated.totalHighRiskApprovals, 3);
  });

  it('should differentiate ETH from BNB and NOT sum BNB 1:1 into totalGasETH', () => {
    const ethChain = createMockScanResult({
      chainId: 1,
      chainName: 'Ethereum',
      gasSummary: {
        totalGasETH: 0.15,
        totalGasUSD: 450,
        transactionCount: 10,
        failedTransactionCount: 0,
        failedGasETH: 0,
        failedGasUSD: 0,
        monthlyBreakdown: [],
        categoryBreakdown: [],
        worstDay: null,
        averageGasPerTx: 0.015,
      },
    });

    const bscChain = createMockScanResult({
      chainId: 56,
      chainName: 'BSC',
      gasSummary: {
        totalGasETH: 0.85, // 0.85 BNB (in native token units)
        totalGasUSD: 510,
        transactionCount: 20,
        failedTransactionCount: 0,
        failedGasETH: 0,
        failedGasUSD: 0,
        monthlyBreakdown: [],
        categoryBreakdown: [],
        worstDay: null,
        averageGasPerTx: 0.0425,
      },
    });

    const aggregatedResult = aggregateResults('0x1234567890123456789012345678901234567890', [ethChain, bscChain]);

    // totalGasETH should only sum ETH chains (0.15), not 0.15 + 0.85 = 1.0!
    assert.strictEqual(aggregatedResult.aggregated.totalGasETH, 0.15, 'totalGasETH must only sum ETH-native chains');
    // totalGasUSD should sum both USD values (450 + 510 = 960)
    assert.strictEqual(aggregatedResult.aggregated.totalGasUSD, 960, 'totalGasUSD must sum USD values across all chains');
  });

  it('should sum multiple ETH L2 chains into totalGasETH correctly', () => {
    const ethChain = createMockScanResult({
      chainId: 1,
      chainName: 'Ethereum',
      gasSummary: { totalGasETH: 0.1, totalGasUSD: 300, transactionCount: 5, failedTransactionCount: 0, failedGasETH: 0, failedGasUSD: 0, monthlyBreakdown: [], categoryBreakdown: [], worstDay: null, averageGasPerTx: 0.02 },
    });

    const baseChain = createMockScanResult({
      chainId: 8453,
      chainName: 'Base',
      gasSummary: { totalGasETH: 0.02, totalGasUSD: 60, transactionCount: 15, failedTransactionCount: 0, failedGasETH: 0, failedGasUSD: 0, monthlyBreakdown: [], categoryBreakdown: [], worstDay: null, averageGasPerTx: 0.0013 },
    });

    const opChain = createMockScanResult({
      chainId: 10,
      chainName: 'Optimism',
      gasSummary: { totalGasETH: 0.03, totalGasUSD: 90, transactionCount: 10, failedTransactionCount: 0, failedGasETH: 0, failedGasUSD: 0, monthlyBreakdown: [], categoryBreakdown: [], worstDay: null, averageGasPerTx: 0.003 },
    });

    const aggregatedResult = aggregateResults('0x1234567890123456789012345678901234567890', [ethChain, baseChain, opChain]);

    assert.ok(Math.abs(aggregatedResult.aggregated.totalGasETH - 0.15) < 1e-6, 'totalGasETH should sum ETH, Base, and OP correctly');
    assert.strictEqual(aggregatedResult.aggregated.totalGasUSD, 450);
  });
});
