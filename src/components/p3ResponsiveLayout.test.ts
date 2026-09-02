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
    const headerSource = readSource('./SiteHeader.tsx');

    assert.match(pageSource, /<main className="[^"]*min-w-0[^"]*overflow-x-clip/);
    assert.match(headerSource, /<header className="[^"]*flex-col[^"]*md:flex-row/);
    assert.match(headerSource, /className="[^"]*w-full[^"]*min-w-0[^"]*items-center[^"]*justify-between[^"]*md:w-auto/);
  });

  it('keeps the primary wallet scan action full-width on small screens', () => {
    const markup = renderToStaticMarkup(createElement(WalletInput, {
      onScan: () => { },
      isLoading: false,
    }));

    assert.match(markup, /aria-label="Scan wallet address"[^>]*class="[^"]*w-full[^"]*md:w-auto/);
    assert.match(markup, /aria-label="Select target EVM networks"[^>]*class="[^"]*w-full/);
    assert.doesNotMatch(markup, /class="card-3d[^"]*min-h-\[232px\]/);
    assert.match(markup, /class="card-3d[^"]*px-3[^"]*sm:px-6[^"]*py-3\.5/);
    assert.doesNotMatch(markup, /max-md:!(?:bg-transparent|border-transparent|shadow-none|p-0|min-h-0)/);
    assert.match(markup, /class="card-3d[^"]*flex-col[^"]*items-center[^"]*justify-center[^"]*md:justify-between/);
    assert.match(markup, /well-recessed-light[^"]*w-full[^"]*max-w-\[288px\][^"]*min-\[400px\]:max-w-\[520px\][^"]*min-\[640px\]:max-w-\[600px\][^"]*md:max-w-none[^"]*md:flex-1/);
    assert.match(markup, /aria-label="Select target EVM networks"[^>]*class="[^"]*max-w-\[288px\][^"]*min-\[400px\]:max-w-\[520px\][^"]*min-\[640px\]:max-w-\[600px\][^"]*justify-center[^\"]*md:w-auto[^\"]*md:max-w-none[^\"]*md:justify-end/);
  });

  it('keeps scan modes equal-width on mobile and hides decorative cluster metadata', () => {
    const pageSource = readSource('../app/page.tsx');

    assert.match(pageSource, /className="grid grid-cols-2 gap-2[^"]*md:flex/);
    assert.match(pageSource, /min-h-11 min-w-0 w-full justify-center/);
    assert.match(pageSource, /badge-brand-orange hidden[^"]*md:inline-flex">New/);
  });

  it('renders the wallet search input empty by default', () => {
    const markup = renderToStaticMarkup(createElement(WalletInput, {
      onScan: () => { },
      isLoading: false,
    }));

    assert.match(markup, /id="wallet-address-input"[^>]*value=""/);
    assert.doesNotMatch(markup, /value="0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"/);
  });

  it('keeps the bounded product promise above the wallet search console', () => {
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
