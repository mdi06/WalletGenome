import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';
import { DEMO_WALLETS, formatDemoSnapshotDate } from '@/lib/demoWallets';
import { getMockScanResult } from '@/lib/mockData';
import DemoSnapshotNotice from './DemoSnapshotNotice';

test('demo snapshot notice states that saved data is dated and not live', () => {
  const markup = renderToStaticMarkup(createElement(DemoSnapshotNotice, {
    demo: DEMO_WALLETS[0],
    isLoading: false,
    onRunFreshScan: () => {},
  }));

  assert.match(markup, /Saved snapshot · Non-live/);
  assert.doesNotMatch(markup, /Demo snapshot · Evidence status · Saved snapshot/);
  assert.match(markup, /Updated Aug 26, 2026/);
  assert.match(markup, /does not spend provider API quota/);
  assert.match(markup, /Run fresh scan/);
  assert.equal(formatDemoSnapshotDate(DEMO_WALLETS[0].generatedAt), 'Aug 26, 2026');
});

test('combines saved snapshot and data-quality evidence in one disclosure region', () => {
  const data = getMockScanResult();
  data.status = 'partial';
  data.chainWarnings = [{ chainId: 1, chainName: 'Ethereum', message: 'Prices are incomplete.' }];

  const markup = renderToStaticMarkup(createElement(DemoSnapshotNotice, {
    demo: DEMO_WALLETS[0],
    data,
    isLoading: false,
    onRunFreshScan: () => {},
  }));

  assert.match(markup, /aria-label="Evidence status"/);
  assert.match(markup, /Saved snapshot · Non-live/);
  assert.doesNotMatch(markup, /Demo snapshot · Evidence status · Saved snapshot/);
  assert.match(markup, /Non-live/);
  assert.match(markup, /Review data quality/);
  assert.match(markup, /Partial history scan/);
  assert.match(markup, /Prices are incomplete/);
  assert.match(markup, /Saved snapshot data quality details/);
});

test('uses a restrained warning frame while keeping the top-level history status visible', () => {
  const data = getMockScanResult();
  data.status = 'unavailable';

  const markup = renderToStaticMarkup(createElement(DemoSnapshotNotice, {
    demo: DEMO_WALLETS[0],
    data,
    isLoading: false,
    onRunFreshScan: () => {},
  }));

  assert.match(markup, /border border-\[#d6b48f\] border-l-4 border-l-\[#b33c00\] bg-\[#fff7ed\] shadow-none/);
  assert.doesNotMatch(markup, /border-2 border-\[#0a0a0a\]/);
  assert.doesNotMatch(markup, /shadow-\[3px_3px_0_#0a0a0a\]/);
  assert.match(markup, /History evidence: unavailable\. Review data quality details below\./);
  assert.match(markup, /Review data quality/);
});
