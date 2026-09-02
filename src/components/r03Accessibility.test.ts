import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it } from 'node:test';
import LoadedScanSummary from './LoadedScanSummary';

const readSource = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

describe('R03 accessibility and contrast contracts', () => {
  it('uses visible, high-contrast wallet field guidance', () => {
    const source = readSource('./WalletInput.tsx');

    assert.match(source, /<label htmlFor="wallet-address-input" className="[^\"]*text-\[#4b5563\][^\"]*">\s*Wallet address or ENS domain/);
    assert.match(source, /placeholder:text-\[#4b5563\]/);
    assert.doesNotMatch(source, /placeholder:text-gray-400/);
    assert.match(source, /text-\[#991b1b\]/);
    assert.doesNotMatch(source, /isLoading \? 'opacity-80'/);
  });

  it('keeps important gas provenance readable', () => {
    const gasSource = readSource('./GasSummaryPanel.tsx');
    const dashboardSource = readSource('./Dashboard.tsx');

    for (const source of [gasSource, dashboardSource]) {
      assert.match(source, /text-xs font-sans font-bold text-\[#4b5563\] normal-case/);
      assert.doesNotMatch(source, /text-\[9px\].*Observed history/);
    }
  });

  it('publishes selected state for transfer direction and network filters', () => {
    const source = readSource('./TransferTable.tsx');

    assert.match(source, /aria-pressed=\{filter === f\}/);
    assert.match(source, /aria-pressed=\{selectedChain === c\.id\}/);
  });

  it('keeps exactly one stable panel target per scan mode', () => {
    const source = readSource('../app/page.tsx');

    assert.strictEqual((source.match(/id="scan-mode-single-panel"/g) ?? []).length, 1);
    assert.strictEqual((source.match(/id="scan-mode-cluster-panel"/g) ?? []).length, 1);
    assert.match(source, /hidden=\{scanMode !== 'single'\}/);
    assert.match(source, /hidden=\{scanMode !== 'cluster'\}/);
    assert.match(source, /<div[\s\S]*id="scan-mode-single-panel"[\s\S]*aria-labelledby="scan-mode-single-tab"[\s\S]*<LoadedScanSummary/);
  });

  it('keeps the full-address disclosure target in the DOM while collapsed', () => {
    const markup = renderToStaticMarkup(createElement(LoadedScanSummary, {
      address: '0x1111111111111111111111111111111111111111',
      chainIds: [1],
      evidenceMode: 'saved',
      onEdit: () => {},
    }));

    assert.match(markup, /aria-expanded="false"/);
    assert.match(markup, /aria-controls="loaded-scan-full-address"/);
    assert.match(markup, /id="loaded-scan-full-address" hidden=""/);
  });

  it('keeps the decorative graph free of hidden keyboard controls', () => {
    const source = readSource('./CapitalFlowGraph.tsx');
    const svg = source.match(/<svg[\s\S]*?<\/svg>/)?.[0];

    assert.ok(svg);
    assert.match(source, /Capital flow graph visualization with/);
    assert.match(source, /Accessible capital flow data/);
    assert.doesNotMatch(svg, /tabIndex|onClick|onKeyDown/);
  });
});
