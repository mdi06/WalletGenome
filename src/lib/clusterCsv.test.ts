import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildClusterCsv, escapeCsvCell } from './clusterCsv';
import type { BulkWrappedWallet, ClusterScanResult } from './types';

const wallet: BulkWrappedWallet = {
  address: '0x1111111111111111111111111111111111111111',
  primaryName: 'Smith, "John"\n=HYPERLINK("https://example.test")',
  persona: 'Active Trader',
  riskGrade: 'A',
  riskScore: 0,
  sybilProbability: 10,
  isFlagged: false,
  flaggedDatabases: [],
  totalGasETH: 0,
  totalGasUSD: 1.25,
  gasPriceProvenance: {
    historical: 1,
    spotEstimate: 0,
    stablecoinAssumption: 0,
    unpriced: 0,
    status: 'complete',
  },
  totalInflowUSD: null,
  totalOutflowUSD: 12.5,
  priceProvenance: {
    historical: 0,
    spotEstimate: 0,
    stablecoinAssumption: 0,
    unpriced: 1,
    status: 'partial',
  },
  transactionCount: 0,
  highRiskApprovalsCount: 0,
  unlimitedApprovalsCount: 0,
  socialsCount: 0,
  counterparties: [],
};

const cluster: ClusterScanResult = {
  source: 'live',
  status: 'complete',
  totalWallets: 1,
  requestedWallets: 1,
  totalTransactions: 0,
  totalGasUSD: 1.25,
  gasPriceProvenance: {
    historical: 1,
    spotEstimate: 0,
    stablecoinAssumption: 0,
    unpriced: 0,
    status: 'complete',
  },
  totalInflowUSD: null,
  priceProvenance: {
    historical: 0,
    spotEstimate: 0,
    stablecoinAssumption: 0,
    unpriced: 1,
    status: 'partial',
  },
  avgSybilProbability: 10,
  flaggedCount: 0,
  totalHighRiskApprovals: 0,
  wallets: [wallet],
  failedWallets: [],
  linkages: [],
  sharedCounterparties: [],
  scannedAt: Date.UTC(2026, 8, 6, 0, 0, 0),
};

describe('cluster CSV export', () => {
  it('quotes delimiters, line breaks, and formula-like identity text', () => {
    assert.equal(
      escapeCsvCell('Smith, "John"\n=HYPERLINK("https://example.test")'),
      '"Smith, ""John""\n=HYPERLINK(""https://example.test"")"',
    );
    assert.equal(escapeCsvCell('=SUM(A1:A2)'), '"\'=SUM(A1:A2)"');
  });

  it('preserves unavailable money and includes provenance metadata', () => {
    const csv = buildClusterCsv(cluster);

    assert.match(csv, /"Data source","live"/);
    assert.match(csv, /"Report time \(UTC\)","2026-09-06T00:00:00\.000Z"/);
    assert.match(csv, /"Capital-flow price coverage","partial; 0 historical; 0 stablecoin assumption; 0 spot estimate; 1 unpriced"/);
    assert.match(csv, /"Gas price coverage","complete; 1 historical; 0 stablecoin assumption; 0 spot estimate; 0 unpriced"/);
    assert.match(csv, /"Total Inflow \(USD\)","Total Outflow \(USD\)"/);
    assert.match(csv, /"N\/A","12\.50"/);
    assert.match(csv, /"Smith, ""John""/);
  });
});
