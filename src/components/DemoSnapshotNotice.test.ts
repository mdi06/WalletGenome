import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';
import { DEMO_WALLETS } from '@/lib/demoWallets';
import DemoSnapshotNotice, { formatSnapshotDate } from './DemoSnapshotNotice';

test('demo snapshot notice states that saved data is dated and not live', () => {
  const markup = renderToStaticMarkup(createElement(DemoSnapshotNotice, {
    demo: DEMO_WALLETS[0],
    isLoading: false,
    onRunFreshScan: () => {},
  }));

  assert.match(markup, /Demo snapshot/);
  assert.match(markup, /Updated Aug 25, 2026/);
  assert.match(markup, /does not spend provider API quota and is not live/);
  assert.match(markup, /Run fresh scan/);
  assert.equal(formatSnapshotDate(DEMO_WALLETS[0].generatedAt), 'Aug 25, 2026');
});
