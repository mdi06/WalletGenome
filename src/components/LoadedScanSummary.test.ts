import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';
import LoadedScanSummary from './LoadedScanSummary';

test('renders the loaded wallet target, selected networks, evidence mode, and edit action', () => {
  const markup = renderToStaticMarkup(createElement(LoadedScanSummary, {
    address: 'vitalik.eth',
    chainIds: [1, 8453],
    evidenceMode: 'saved-snapshot',
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
});
