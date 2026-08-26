import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';
import { DEMO_WALLETS, formatDemoSnapshotDate } from '@/lib/demoWallets';
import DemoSnapshotNotice from './DemoSnapshotNotice';

test('demo snapshot notice states that saved data is dated and not live', () => {
  const markup = renderToStaticMarkup(createElement(DemoSnapshotNotice, {
    demo: DEMO_WALLETS[0],
    isLoading: false,
    onRunFreshScan: () => {},
  }));

  assert.match(markup, /Demo snapshot/);
  assert.match(markup, /Updated Aug 26, 2026/);
  assert.match(markup, /does not spend provider API quota and is not live/);
  assert.match(markup, /Run fresh scan/);
  assert.equal(formatDemoSnapshotDate(DEMO_WALLETS[0].generatedAt), 'Aug 26, 2026');
});
