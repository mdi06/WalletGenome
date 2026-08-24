import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import BulkDashboard from './BulkDashboard';
import { getClusterAvailabilityMessage } from './status/ClusterStatusPanel';
import { ClusterScanResult } from '@/lib/types';

describe('Cluster dashboard provider availability messaging', () => {
  it('withholds aggregate conclusions for incomplete clusters', () => {
    assert.match(getClusterAvailabilityMessage('partial') ?? '', /aggregates and coordination conclusions are withheld/i);
    assert.match(getClusterAvailabilityMessage('unavailable') ?? '', /no wallet returned enough verified provider data/i);
    assert.strictEqual(getClusterAvailabilityMessage('complete'), null);
  });

  it('renders failed wallets instead of complete-cluster conclusions', () => {
    const data: ClusterScanResult = {
      status: 'partial',
      totalWallets: 1,
      requestedWallets: 2,
      totalTransactions: 0,
      totalGasUSD: 0,
      totalInflowUSD: 0,
      avgSybilProbability: 0,
      flaggedCount: 0,
      totalHighRiskApprovals: 0,
      wallets: [],
      failedWallets: [{
        target: '0x4444444444444444444444444444444444444444',
        status: 'unavailable',
        reasons: [{ source: 'transactions', code: 'timeout', message: 'Explorer timed out.' }],
      }],
      linkages: [],
      sharedCounterparties: [],
      scannedAt: Date.now(),
    };

    const markup = renderToStaticMarkup(createElement(BulkDashboard, { data, onInspectWallet: () => {} }));
    assert.match(markup, /1 of 2 wallets completed/i);
    assert.match(markup, /Explorer timed out/i);
    assert.doesNotMatch(markup, /INDEPENDENT PORTFOLIO/i);
  });

  it('derives direct-transfer narrative only from evidence-backed linkage fields', () => {
    const data: ClusterScanResult = {
      status: 'complete',
      totalWallets: 2,
      requestedWallets: 2,
      totalTransactions: 2,
      totalGasUSD: 0,
      totalInflowUSD: 250,
      avgSybilProbability: 0,
      flaggedCount: 0,
      totalHighRiskApprovals: 0,
      wallets: [],
      failedWallets: [],
      linkages: [{
        source: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        target: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        type: 'direct_transfer',
        txCount: 2,
        volumeUSD: 250,
        valueStatus: 'complete',
        evidenceTxHashes: ['0x1', '0x2'],
        chainId: 1,
        lastDate: '2026-08-23',
        detail: '2 direct transactions on Ethereum',
      }],
      sharedCounterparties: [],
      scannedAt: Date.now(),
    };

    const markup = renderToStaticMarkup(createElement(BulkDashboard, { data, onInspectWallet: () => {} }));
    assert.match(markup, /2 evidence-backed direct transactions/i);
    assert.match(markup, /2 direct transactions on Ethereum/i);
    assert.doesNotMatch(markup, /operate autonomously/i);
  });
});
