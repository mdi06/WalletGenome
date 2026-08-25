import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import IdentityCard from './IdentityCard';
import WalletInput from './WalletInput';

const readSource = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

describe('P3 mobile layout contracts', () => {
  it('keeps the page shell and header from widening narrow viewports', () => {
    const pageSource = readSource('../app/page.tsx');

    assert.match(pageSource, /<main className="[^"]*min-w-0[^"]*overflow-x-clip/);
    assert.match(pageSource, /<header className="[^"]*flex-wrap/);
  });

  it('keeps the primary wallet scan action full-width on small screens', () => {
    const markup = renderToStaticMarkup(createElement(WalletInput, {
      onScan: () => {},
      isLoading: false,
    }));

    assert.match(markup, /aria-label="Scan wallet address"[^>]*class="[^"]*w-full[^"]*sm:w-auto/);
    assert.match(markup, /aria-label="Select target EVM networks"[^>]*class="[^"]*w-full/);
  });

  it('keeps the complete product promise above the wallet search console', () => {
    const pageSource = readSource('../app/page.tsx');
    const heroIndex = pageSource.indexOf('aria-labelledby="main-hero-title"');
    const consoleIndex = pageSource.indexOf('aria-label="Wallet Forensics Console"');

    assert.notStrictEqual(heroIndex, -1);
    assert.notStrictEqual(consoleIndex, -1);
    assert.ok(heroIndex < consoleIndex, 'expected the hero message to appear before the search console');
  });

  it('labels deliberate horizontal scroll regions and makes them keyboard-scrollable', () => {
    for (const relativePath of ['./ActivityHeatmap.tsx', './Dashboard.tsx', './TransferTable.tsx']) {
      const source = readSource(relativePath);
      assert.match(source, /horizontal-scroll-region/);
      assert.match(source, /tabIndex=\{0\}/);
      assert.match(source, /aria-label=/);
    }
  });

  it('renders the full wallet address as copyable without forcing it into the layout', () => {
    const address = '0x1234567890123456789012345678901234567890';
    const markup = renderToStaticMarkup(createElement(IdentityCard, { address }));

    assert.match(markup, new RegExp(`title="${address}"`));
    assert.match(markup, new RegExp(`aria-label="Copy wallet address ${address}"`));
    assert.match(markup, /class="[^"]*truncate/);
  });

  it('uses one identity hierarchy and an equal-width connected-account grid', () => {
    const markup = renderToStaticMarkup(createElement(IdentityCard, {
      address: '0x1234567890123456789012345678901234567890',
      identity: {
        primaryName: 'Animus',
        primaryAvatar: null,
        description: 'degen with kozak blood',
        domains: [
          { platform: 'lens', identity: 'kozak.lens' },
          { platform: 'unstoppableDomains', identity: 'animus.crypto' },
        ],
        socials: [
          { platform: 'lens', handle: '@kozak.lens', link: 'https://hey.xyz/u/kozak.lens' },
          { platform: 'twitter', handle: '@selfex5', link: 'https://x.com/selfex5' },
        ],
        hasIdentity: true,
      },
    }));

    assert.match(markup, /Connected accounts/);
    assert.match(markup, /sm:grid-cols-\[auto_minmax\(0,1fr\)_auto\]/);
    assert.match(markup, /sm:col-start-3 sm:row-start-1 sm:self-center sm:justify-self-end/);
    assert.match(markup, /grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3/);
    assert.match(markup, /inline-flex min-h-11 min-w-0 w-full/);
    assert.doesNotMatch(markup, /LENS: kozak\.lens/, 'expected domain identities to appear only in the account grid');
    assert.match(markup, /Other resolved names/);
    assert.match(markup, /unstoppableDomains: animus\.crypto/);
  });
});
