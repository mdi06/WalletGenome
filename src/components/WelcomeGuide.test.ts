import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import WelcomeGuide from './WelcomeGuide';
import { DEMO_WALLETS, formatDemoSnapshotDate } from '@/lib/demoWallets';

describe('WelcomeGuide saved demo hierarchy', () => {
  it('keeps saved-card typography on the main font without monospace overrides', () => {
    const markup = renderToStaticMarkup(createElement(WelcomeGuide, { onSelectDemo: () => {} }));
    const cards = markup.match(/<button\b[^>]*aria-label="Load saved demo snapshot[^>]*>[\s\S]*?<\/button>/g) ?? [];

    assert.strictEqual(cards.length, DEMO_WALLETS.length);
    for (const card of cards) {
      assert.match(card, /^<button\b[^>]*class="[^"]*\bfont-sans\b/);
      assert.doesNotMatch(card, /\bfont-mono\b/);
    }
  });

  it('renders all saved demos in a uniform grid', () => {
    const markup = renderToStaticMarkup(createElement(WelcomeGuide, { onSelectDemo: () => {} }));

    assert.doesNotMatch(markup, /data-demo-layout="featured-primary"/);
    assert.doesNotMatch(markup, /data-demo-layout="secondary-list"/);
    assert.match(markup, /lg:grid-cols-4/);
  });

  it('keeps every saved demo selectable with its date and non-live disclosure', () => {
    const markup = renderToStaticMarkup(createElement(WelcomeGuide, { onSelectDemo: () => {} }));

    for (const demo of DEMO_WALLETS) {
      assert.match(markup, new RegExp(`Load saved demo snapshot for ${demo.name}`));
      assert.match(markup, new RegExp(`Updated ${formatDemoSnapshotDate(demo.generatedAt)}`));
    }

    assert.strictEqual((markup.match(/Load saved demo snapshot for /g) ?? []).length, DEMO_WALLETS.length);
    assert.match(markup, /Saved · non-live/);
  });
});
