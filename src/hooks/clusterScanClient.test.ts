import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ClusterScanResult } from '@/lib/types';
import { runClusterScanRequest } from './clusterScanClient';

const addresses = [
  '0x1111111111111111111111111111111111111111',
  '0x2222222222222222222222222222222222222222',
];

describe('cluster scan client', () => {
  it('sends the bounded cluster request and returns its report', async () => {
    const report: ClusterScanResult = {
      status: 'complete',
      totalWallets: 2,
      requestedWallets: 2,
      totalTransactions: 0,
      totalGasUSD: 0,
      totalInflowUSD: 0,
      avgSybilProbability: 0,
      flaggedCount: 0,
      totalHighRiskApprovals: 0,
      wallets: [],
      failedWallets: [],
      linkages: [],
      sharedCounterparties: [],
      scannedAt: 1_700_000_000,
    };
    const fetchImpl: typeof fetch = async (input, init) => {
      assert.equal(String(input), '/api/batch-scan');
      assert.equal(init?.method, 'POST');
      assert.deepEqual(JSON.parse(String(init?.body)), { addresses, chainIds: [1, 8453] });
      return Response.json(report);
    };

    assert.deepEqual(
      await runClusterScanRequest({ addresses, chainIds: [1, 8453], fetchImpl }),
      report,
    );
  });

  it('surfaces a structured API failure', async () => {
    const fetchImpl: typeof fetch = async () => Response.json(
      { error: 'Cluster provider budget exhausted.' },
      { status: 429 },
    );

    await assert.rejects(
      runClusterScanRequest({ addresses, chainIds: [1], fetchImpl }),
      /Cluster provider budget exhausted/,
    );
  });

  it('falls back to the HTTP status for a non-JSON failure', async () => {
    const fetchImpl: typeof fetch = async () => new Response('upstream unavailable', { status: 503 });

    await assert.rejects(
      runClusterScanRequest({ addresses, chainIds: [1], fetchImpl }),
      /HTTP 503/,
    );
  });
});
