import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';
import { getMockScanResult } from '@/lib/mockData';
import DashboardStatusPanel from './status/DashboardStatusPanel';

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
