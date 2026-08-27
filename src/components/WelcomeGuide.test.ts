import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import WelcomeGuide from './WelcomeGuide';
import { DEMO_WALLETS, formatDemoSnapshotDate } from '@/lib/demoWallets';

describe('WelcomeGuide saved demo hierarchy', () => {
  it('features one demo and keeps the remaining demos in a quieter list', () => {
    const markup = renderToStaticMarkup(createElement(WelcomeGuide, { onSelectDemo: () => {} }));

    assert.match(markup, /data-demo-layout="featured-primary"/);
    assert.match(markup, /data-demo-layout="secondary-list"/);
    assert.match(markup, /Featured saved snapshot/);
    assert.match(markup, /More saved demo wallets/);
    assert.match(markup, /divide-y divide-\[#c8c8c8\] border-y border-\[#c8c8c8\]/);
    assert.doesNotMatch(markup, /lg:grid-cols-4/);
  });

  it('keeps every saved demo selectable with its date and non-live disclosure', () => {
    const markup = renderToStaticMarkup(createElement(WelcomeGuide, { onSelectDemo: () => {} }));

    for (const demo of DEMO_WALLETS) {
      assert.match(markup, new RegExp(`Load saved demo snapshot for ${demo.name}`));
      assert.match(markup, new RegExp(`Updated ${formatDemoSnapshotDate(demo.generatedAt)}`));
    }

    assert.strictEqual((markup.match(/Load saved demo snapshot for /g) ?? []).length, DEMO_WALLETS.length);
    assert.match(markup, /Saved · non-live/);
    assert.match(markup, /Saved, non-live/);
  });
});
