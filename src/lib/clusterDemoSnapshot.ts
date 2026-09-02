import type { BulkWrappedWallet, ClusterScanResult } from './types';

export interface ClusterSnapshotEnvelope {
  schemaVersion: 1;
  generatedAt: string;
  chainIds: number[];
  addresses: string[];
  result: ClusterScanResult;
}

export const CLUSTER_SAMPLE_ADDRESSES = [
  '0x2e21f5d34208a3d5483f9829f2709e9005bf15f2',
  '0x163473950fbcfcfc31ac7ad0eec26f5fe549046c',
  '0x99e52ddb9e2c65febe07ddbe47432720d297a780',
  '0xb8c2c29ee19d8307cb7255e1cd9cbde883a267d5',
];

const CLUSTER_SAMPLE_GENERATED_AT = '2026-09-01T00:00:00.000Z';

function createSampleWallet(address: string, primaryName: string): BulkWrappedWallet {
  return {
    address,
    primaryName,
    persona: 'Saved example',
    riskGrade: 'N/A',
    riskScore: 0,
    sybilProbability: 0,
    isFlagged: false,
    flaggedDatabases: [],
    totalGasETH: 0,
    totalGasUSD: 0,
    totalInflowUSD: 0,
    totalOutflowUSD: 0,
    transactionCount: 0,
    highRiskApprovalsCount: 0,
    unlimitedApprovalsCount: 0,
    socialsCount: 0,
    counterparties: [],
  };
}

/**
 * A deterministic, provider-free UI example. It intentionally contains no
 * activity or linkage evidence; zero values must not be read as live wallet
 * analytics. The notice rendered with this result makes that boundary clear.
 */
export const CLUSTER_SAMPLE_SNAPSHOT: ClusterSnapshotEnvelope = {
  schemaVersion: 1,
  generatedAt: CLUSTER_SAMPLE_GENERATED_AT,
  chainIds: [1, 10, 8453, 42161],
  addresses: CLUSTER_SAMPLE_ADDRESSES,
  result: {
    source: 'saved',
    status: 'complete',
    totalWallets: CLUSTER_SAMPLE_ADDRESSES.length,
    requestedWallets: CLUSTER_SAMPLE_ADDRESSES.length,
    totalTransactions: 0,
    totalGasUSD: 0,
    totalInflowUSD: 0,
    avgSybilProbability: 0,
    flaggedCount: 0,
    totalHighRiskApprovals: 0,
    wallets: [
      createSampleWallet(CLUSTER_SAMPLE_ADDRESSES[0], 'stani.eth'),
      createSampleWallet(CLUSTER_SAMPLE_ADDRESSES[1], 'danno.eth'),
      createSampleWallet(CLUSTER_SAMPLE_ADDRESSES[2], 'ricburton.eth'),
      createSampleWallet(CLUSTER_SAMPLE_ADDRESSES[3], 'nick.eth'),
    ],
    failedWallets: [],
    linkages: [],
    sharedCounterparties: [],
    scannedAt: Date.parse(CLUSTER_SAMPLE_GENERATED_AT),
  },
};

export function isClusterSampleSearch(search: string): boolean {
  return new URLSearchParams(search).get('cluster') === 'sample';
}

export function formatClusterSnapshotDate(generatedAt: string): string {
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(generatedAt));
}
