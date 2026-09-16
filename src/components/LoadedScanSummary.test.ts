import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';
import LoadedScanSummary from './LoadedScanSummary';
import type { IndexingStatus } from '@/lib/indexingStatus';
import type { MultiChainScanResult } from '@/lib/types';

test('renders the loaded wallet target, selected networks, evidence mode, and edit action', () => {
  const markup = renderToStaticMarkup(createElement(LoadedScanSummary, {
    address: 'vitalik.eth',
    chainIds: [1, 8453],
    evidenceMode: 'saved' as IndexingStatus,
    onEdit: () => {},
  }));

  assert.match(markup, /aria-label="Loaded scan summary"/);
  assert.match(markup, /vitalik\.eth/);
  assert.match(markup, /Ethereum, Base/);
  assert.match(markup, /Saved snapshot/);
  assert.strictEqual((markup.match(/Saved snapshot/g) ?? []).length, 1);
  assert.match(markup, /aria-label="View full wallet address"/);
  assert.match(markup, /aria-label="Copy wallet address"/);
  assert.match(markup, /aria-live="polite"/);
  assert.match(markup, /md:hidden/);
  assert.doesNotMatch(markup, /Evidence:/);
  assert.match(markup, /Edit scan/);
  assert.match(markup, /min-h-11/);
  assert.match(markup, /flex min-w-0 flex-col items-stretch gap-2 md:flex-row md:items-center/);
  assert.match(markup, /grid w-full shrink-0 grid-cols-\[minmax\(0,1fr\)_2\.75rem\]/);
});

test('shows cached fetch time, history reuse, and refresh action', () => {
  const markup = renderToStaticMarkup(createElement(LoadedScanSummary, {
    address: '0x1111111111111111111111111111111111111111',
    chainIds: [1],
    evidenceMode: 'completed' as IndexingStatus,
    data: {
      cached: true,
      cacheMetadata: {
        fetchedAt: Date.UTC(2026, 7, 28, 4, 30),
        source: 'shared',
        expiresAt: Date.UTC(2026, 7, 28, 4, 35),
        refreshAvailableAt: Date.UTC(2026, 7, 28, 9, 30),
        historyDatasets: [
          { chainId: 1, dataset: 'transactions', fetchedAt: 100, source: 'shared' },
          { chainId: 1, dataset: 'tokenTransfers', fetchedAt: 100, source: 'shared' },
        ],
      },
    } as MultiChainScanResult,
    onRefresh: () => {},
    onEdit: () => {},
  }));

  assert.match(markup, /Cached result/);
  assert.match(markup, /Fetched:/);
  assert.match(markup, /2 cached datasets/);
  assert.match(markup, /Refresh data/);
  assert.match(markup, /once every five minutes/);
});
