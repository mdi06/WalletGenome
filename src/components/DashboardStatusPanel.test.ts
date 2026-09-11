import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';
import { getMockScanResult } from '@/lib/mockData';
import DashboardStatusPanel, {
  groupProviderErrors,
  priceCoverageSummary,
} from './status/DashboardStatusPanel';

test('writes one plain price-coverage sentence from structured counts', () => {
  const summary = priceCoverageSummary([
    { source: 'prices', code: 'spot_estimate', count: 7, message: 'Verbose estimate explanation.' },
    { source: 'prices', code: 'unpriced', count: 72, message: 'Verbose unpriced explanation.' },
  ]);

  assert.strictEqual(
    summary,
    '7 values use a current-price estimate; 72 values remain unpriced. Affected USD totals exclude these values.',
  );
});

test('groups repeated provider errors into one readable row', () => {
  const repeated = {
    source: 'prices' as const,
    code: 'provider_error' as const,
    provider: 'DefiLlama historical prices',
    message: '[Ethereum (chain 1) · prices] DefiLlama historical prices returned HTTP 414.',
  };
  const grouped = groupProviderErrors([
    { ...repeated, asset: 'asset-a' },
    { ...repeated, asset: 'asset-b' },
    { ...repeated, asset: 'asset-c' },
  ]);

  assert.strictEqual(grouped.length, 1);
  assert.strictEqual(grouped[0]?.count, 3);
});

test('shows one repeated provider message with an affected-group count', () => {
  const data = getMockScanResult();
  const repeated = {
    source: 'prices' as const,
    code: 'provider_error' as const,
    provider: 'DefiLlama historical prices',
    message: '[Ethereum (chain 1) · prices] DefiLlama historical prices returned HTTP 414.',
  };
  data.chainWarnings = [{
    chainId: 1,
    chainName: 'Ethereum',
    message: 'Ethereum has incomplete historical prices.',
  }];
  data.availability[0].prices = 'partial';
  data.availability[0].errors = [
    { ...repeated, asset: 'asset-a' },
    { ...repeated, asset: 'asset-b' },
    { ...repeated, asset: 'asset-c' },
  ];

  const markup = renderToStaticMarkup(createElement(DashboardStatusPanel, { data }));
  assert.match(markup, /Partial price coverage/);
  assert.match(markup, /Prices are incomplete on 1 network\. Wallet history is complete\./);
  assert.doesNotMatch(markup, /Ethereum has incomplete historical prices\./);
  assert.strictEqual((markup.match(/returned HTTP 414/g) ?? []).length, 1);
  assert.match(markup, /3 affected price groups/);
  assert.match(markup, /Technical provider details \(1\)/);
});

test('keeps an unavailable provider result explicit in the dashboard UI', () => {
  const data = getMockScanResult();
  data.status = 'unavailable';
  data.chainWarnings = [{
    chainId: 1,
    chainName: 'Ethereum',
    message: 'Ethereum history providers failed to return verified data.',
  }];
  data.availability = data.availability.map(chain => ({
    ...chain,
    transactions: 'unavailable',
    tokenTransfers: 'unavailable',
    internalTransactions: 'unavailable',
    errors: [{
      source: 'transactions',
      code: 'provider_error',
      message: 'Explorer unavailable.',
    }],
  }));

  const markup = renderToStaticMarkup(createElement(DashboardStatusPanel, { data }));

  assert.match(markup, /Scan unavailable — history providers did not return enough verified data for analytics\./);
  assert.match(markup, /Ethereum history providers failed to return verified data\./);
  assert.match(markup, /transactions.*unavailable/i);
  assert.match(markup, /Explorer unavailable\./);
  assert.doesNotMatch(markup, /definitive risk or behavioral Sybil metrics were produced/);
});
