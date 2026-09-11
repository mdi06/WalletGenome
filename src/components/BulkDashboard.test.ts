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
    assert.match(getClusterAvailabilityMessage('unavailable') ?? '', /no eligible wallet returned enough verified data/i);
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
    assert.match(markup, /<details/);
    assert.match(markup, /1 of 2 targets completed with verified wallet data/i);
    assert.match(markup, /Explorer timed out/i);
    assert.match(markup, /1 target needs attention/i);
    assert.doesNotMatch(markup, /INDEPENDENT PORTFOLIO/i);
  });

  it('explains when a contract account is not eligible for wallet-cluster analysis', () => {
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
        reasons: [{
          source: 'scan',
          code: 'unsupported_target',
          message: 'This target has deployed smart-contract code on Arbitrum. Cluster Scan currently supports externally owned wallet accounts, not contract accounts.',
        }],
      }],
      linkages: [],
      sharedCounterparties: [],
      scannedAt: Date.now(),
    };

    const markup = renderToStaticMarkup(createElement(BulkDashboard, { data, onInspectWallet: () => {} }));
    assert.match(markup, /Targets needing attention/i);
    assert.match(markup, /deployed smart-contract code on Arbitrum/i);
    assert.doesNotMatch(markup, /provider follow-up/i);
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

  it('labels partial cluster USD totals as verified subtotals', () => {
    const data: ClusterScanResult = {
      status: 'complete',
      totalWallets: 1,
      requestedWallets: 1,
      totalTransactions: 1,
      totalGasUSD: 0,
      totalInflowUSD: null,
      priceProvenance: {
        historical: 0,
        spotEstimate: 0,
        stablecoinAssumption: 0,
        unpriced: 1,
        status: 'unavailable',
      },
      avgSybilProbability: 0,
      flaggedCount: 0,
      totalHighRiskApprovals: 0,
      wallets: [],
      failedWallets: [],
      linkages: [],
      sharedCounterparties: [],
      scannedAt: Date.now(),
    };

    const markup = renderToStaticMarkup(createElement(BulkDashboard, { data, onInspectWallet: () => {} }));
    assert.match(markup, /Price coverage · unavailable/i);
    assert.match(markup, /USD inflows are unavailable/i);
    assert.match(markup, /COMBINED INFLOWS/);
    assert.match(markup, /Unavailable/);
  });

  it('does not show missing gas prices as zero dollars', () => {
    const data: ClusterScanResult = {
      status: 'complete',
      totalWallets: 1,
      requestedWallets: 1,
      totalTransactions: 1,
      totalGasUSD: null,
      gasPriceProvenance: {
        historical: 0,
        spotEstimate: 0,
        stablecoinAssumption: 0,
        unpriced: 1,
        status: 'unavailable',
      },
      totalInflowUSD: 0,
      avgSybilProbability: 0,
      flaggedCount: 0,
      totalHighRiskApprovals: 0,
      wallets: [],
      failedWallets: [],
      linkages: [],
      sharedCounterparties: [],
      scannedAt: Date.now(),
    };

    const markup = renderToStaticMarkup(createElement(BulkDashboard, { data, onInspectWallet: () => {} }));
    assert.match(markup, /COMBINED LIFETIME GAS/);
    assert.match(markup, /Gas prices unavailable/);
    assert.match(markup, /COMBINED LIFETIME GAS[\s\S]{0,250}>Unavailable</);
  });

  it('labels saved-cluster shared-counterparty gaps as excluded evidence', () => {
    const data: ClusterScanResult = {
      source: 'saved',
      status: 'complete',
      totalWallets: 4,
      requestedWallets: 4,
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
      scannedAt: Date.now(),
    };

    const markup = renderToStaticMarkup(createElement(BulkDashboard, { data, onInspectWallet: () => {} }));
    assert.match(markup, /No shared-counterparty evidence is included in this saved example\./);
    assert.doesNotMatch(markup, /No significant shared funding sources or overlapping counterparties detected\./);
  });
});
