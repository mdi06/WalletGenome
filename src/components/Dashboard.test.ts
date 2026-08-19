import { describe, it } from 'node:test';
import assert from 'node:assert';
import { extractProtocolBadges } from './Dashboard';
import { MultiChainScanResult, ScanResult } from '@/lib/types';

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
      totalActiveDays: 1,
      mostActiveDay: 'Monday',
      mostActiveHour: 12,
      longestStreakDays: 1,
      currentStreakDays: 1,
      avgTxsPerActiveDay: 1,
    },
    interactionsSummary: {
      topProtocols: [],
      topCounterparties: [],
      uniqueContractCount: 0,
      uniqueCounterpartyCount: 0,
    },
    ...overrides,
  };
}

describe('Protocol Identity Badges Genuine Extraction Tests', () => {
  it('should return empty badges array for clean or new wallets with 0 protocol interactions', () => {
    const cleanScan: MultiChainScanResult = {
      address: '0x1234567890123456789012345678901234567890',
      chains: [createMockScan()],
      aggregated: {
        totalGasETH: 0.01,
        totalGasUSD: 30,
        totalHighRiskApprovals: 0,
        totalDeadAssets: 0,
        totalTransactions: 1,
        riskScore: 0,
        riskGrade: 'A',
      },
    };

    const badges = extractProtocolBadges(cleanScan);
    assert.deepStrictEqual(badges, [], 'Clean wallets must NOT receive hardcoded fictitious badges');
  });

  it('should NOT award OP_DELEGATOR simply because multiple chains were scanned', () => {
    const multiChainScan: MultiChainScanResult = {
      address: '0x1234567890123456789012345678901234567890',
      chains: [
        createMockScan({ chainId: 1, chainName: 'Ethereum' }),
        createMockScan({ chainId: 8453, chainName: 'Base' }),
        createMockScan({ chainId: 42161, chainName: 'Arbitrum' }),
      ],
      aggregated: {
        totalGasETH: 0.03,
        totalGasUSD: 90,
        totalHighRiskApprovals: 0,
        totalDeadAssets: 0,
        totalTransactions: 3,
        riskScore: 0,
        riskGrade: 'A',
      },
    };

    const badges = extractProtocolBadges(multiChainScan);
    assert.ok(!badges.includes('OP_DELEGATOR'), 'Must NOT award OP_DELEGATOR merely because data.chains.length > 1');
    assert.deepStrictEqual(badges, []);
  });

  it('should award genuine badges when actual protocols are interacted with', () => {
    const activeScan: MultiChainScanResult = {
      address: '0x1234567890123456789012345678901234567890',
      chains: [
        createMockScan({
          interactionsSummary: {
            topProtocols: [
              {
                name: 'Uniswap V3',
                protocol: 'Uniswap',
                category: 'swap',
                txCount: 12,
                totalGasETH: 0.01,
                totalGasUSD: 30,
                totalVolumeUSD: 5000,
                lastInteractionDate: '2026-01-01',
                chainId: 1,
                contracts: [],
              },
              {
                name: 'Aave V3',
                protocol: 'Aave',
                category: 'lending',
                txCount: 5,
                totalGasETH: 0.005,
                totalGasUSD: 15,
                totalVolumeUSD: 2000,
                lastInteractionDate: '2026-01-01',
                chainId: 1,
                contracts: [],
              },
              {
                name: 'Across HubPool',
                protocol: 'Across',
                category: 'bridge',
                txCount: 2,
                totalGasETH: 0.002,
                totalGasUSD: 6,
                totalVolumeUSD: 1000,
                lastInteractionDate: '2026-01-01',
                chainId: 1,
                contracts: [],
              },
            ],
            topCounterparties: [],
            uniqueContractCount: 3,
            uniqueCounterpartyCount: 3,
          },
        }),
      ],
      aggregated: {
        totalGasETH: 0.05,
        totalGasUSD: 150,
        totalHighRiskApprovals: 0,
        totalDeadAssets: 0,
        totalTransactions: 19,
        riskScore: 0,
        riskGrade: 'A',
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
