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

  it('renders all saved demos in the existing uniform grid with the original card treatment', () => {
    const markup = renderToStaticMarkup(createElement(WelcomeGuide, { onSelectDemo: () => {} }));

    assert.doesNotMatch(markup, /data-demo-layout="featured-primary"/);
    assert.doesNotMatch(markup, /data-demo-layout="secondary-list"/);
    assert.match(markup, /lg:grid-cols-4/);
    assert.match(markup, /Opens instantly without provider API calls/);
    assert.doesNotMatch(markup, /Saved snapshots · non-live · opens instantly without provider API calls/);

    const cards = markup.match(/<button\b[^>]*aria-label="Load saved demo snapshot[^>]*>[\s\S]*?<\/button>/g) ?? [];
    for (const card of cards) {
      assert.match(card, /\bcard-3d-interactive\b/);
      assert.strictEqual((card.match(/<button\b/g) ?? []).length, 1);
      assert.strictEqual((card.match(/<a\b/g) ?? []).length, 0);
    }
  });

  it('preserves the earlier card copy inside every saved card', () => {
    const markup = renderToStaticMarkup(createElement(WelcomeGuide, { onSelectDemo: () => {} }));

    assert.strictEqual((markup.match(/Saved public EVM data for [^<]* across four supported networks\. The dashboard keeps the original provider and pricing completeness warnings\./g) ?? []).length, DEMO_WALLETS.length);
    assert.strictEqual((markup.match(/Four supported EVM networks · Updated /g) ?? []).length, DEMO_WALLETS.length);
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
