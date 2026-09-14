import assert from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import InteractionsPanel from './InteractionsPanel';
import { getMockScanResult } from '@/lib/mockData';
import { ProtocolInteraction, ScanResult } from '@/lib/types';

function protocol(chainId: number): ProtocolInteraction {
  const base = chainId === 8453;
  return {
    name: 'Uniswap',
    protocol: 'Uniswap',
    category: 'swap',
    txCount: 1,
    totalGasNative: 0.01,
    totalGasUSD: 3,
    totalVolumeUSD: 100,
    lastInteractionDate: '2026-08-23',
    chainId,
    chainName: base ? 'Base' : 'Ethereum',
    nativeTokenSymbol: 'ETH',
    contracts: [{
      name: 'Router',
      contractAddress: '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45',
      txCount: 1,
      totalGasNative: 0.01,
      totalGasUSD: 3,
      totalVolumeUSD: 100,
      lastInteractionDate: '2026-08-23',
      chainId,
      chainName: base ? 'Base' : 'Ethereum',
      nativeTokenSymbol: 'ETH',
    }],
  };
}

function chainResult(chainId: number): ScanResult {
  const base = getMockScanResult().chains[0];
  const item = protocol(chainId);
  return {
    ...base,
    chainId,
    chainName: item.chainName,
    interactionsSummary: {
      ...base.interactionsSummary,
      topProtocols: [item],
      protocolVolumeUSD: item.totalVolumeUSD,
    },
  };
}

describe('Protocol interaction network rendering', () => {
  it('keeps same-named protocols separate and renders the Base explorer', () => {
    const markup = renderToStaticMarkup(createElement(InteractionsPanel, {
      results: [chainResult(1), chainResult(8453)],
    }));

    assert.strictEqual((markup.match(/Uniswap/g) ?? []).length >= 2, true);
    assert.match(markup, /0\.0100 ETH/);
    assert.strictEqual((markup.match(/0\.0100 ETH/g) ?? []).length >= 2, true);
    assert.match(markup, /Ethereum/);
    assert.match(markup, /Base/);
    assert.match(markup, /https:\/\/basescan\.org\/address\/0x68b346/);
  });

  it('renders tiny non-zero protocol gas without displaying zero', () => {
    const result = chainResult(1);
    result.interactionsSummary.topProtocols[0].totalGasNative = 0.00000042;
    result.interactionsSummary.topProtocols[0].totalGasUSD = 0.001;

    const markup = renderToStaticMarkup(createElement(InteractionsPanel, { results: [result] }));

    assert.match(markup, /&lt;0\.0001 ETH/);
    assert.match(markup, /≈ &lt;\$0\.01/);
    assert.doesNotMatch(markup, /≈ \$0\.00/);
    assert.doesNotMatch(markup, /0\.0000 ETH/);
  });

  it('turns an Other protocol result into an actionable unclassified breakdown', () => {
    const result = chainResult(1);
    const unknownProtocol = result.interactionsSummary.topProtocols[0];
    unknownProtocol.name = 'Contract (0x9999...9999)';
    unknownProtocol.protocol = 'Other';
    unknownProtocol.category = 'contract_interaction';
    unknownProtocol.txCount = 3;
    unknownProtocol.contracts = [{
      ...unknownProtocol.contracts[0],
      name: 'Contract (0x9999...9999)',
      contractAddress: '0x9999999999999999999999999999999999999999',
      txCount: 3,
    }];

    const markup = renderToStaticMarkup(createElement(InteractionsPanel, { results: [result] }));

    assert.match(markup, /Unclassified contracts/);
    assert.match(markup, /Largest category: Contract calls/);
    assert.match(markup, /3 calls across 1 unclassified contracts/);
    assert.match(markup, /3 calls · 1 contract/);
    assert.match(markup, /Contract calls/);
    assert.doesNotMatch(markup, />contract_interaction</);
    assert.match(markup, /not mapped to a named protocol/);
  });

  it('renders a shared-state native category filter for the mobile protocols view', () => {
    const source = readFileSync(new URL('./InteractionsPanel.tsx', import.meta.url), 'utf8');
    const markup = renderToStaticMarkup(createElement(InteractionsPanel, { results: [chainResult(1)] }));

    assert.match(source, /grid w-full grid-cols-2 gap-2 md:flex/);
    assert.match(source, /htmlFor="protocol-category-filter"/);
    assert.match(source, /id="protocol-category-filter"[\s\S]*value=\{selectedCategory\}/);
    assert.match(source, /onChange=\{e => setSelectedCategory\(e\.target\.value\)\}/);
    assert.match(markup, /Filter category/);
    assert.match(markup, /<option value="contract_interaction">Contract calls<\/option>/);
    assert.match(source, /min-w-\[900px\]/);
  });
});
