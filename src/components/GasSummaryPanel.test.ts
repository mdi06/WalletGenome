import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import GasSummaryPanel from './GasSummaryPanel';
import { getMockScanResult } from '@/lib/mockData';

describe('gas summary precision', () => {
  it('keeps non-zero network gas visible when its USD value is non-zero', () => {
    const result = getMockScanResult().chains[0];
    result.gasSummary.totalGasETH = 0.00000042;
    result.gasSummary.totalGasUSD = 0.12;

    const markup = renderToStaticMarkup(createElement(GasSummaryPanel, { results: [result] }));

    assert.match(markup, /&lt;0\.0001 ETH/);
    assert.doesNotMatch(markup, /0\.0000 ETH/);
    assert.match(markup, /≈ \$0\.12/);
    assert.match(markup, /Gas spent over time data/);
    assert.match(markup, /Gas by category data/);
    assert.match(markup, /Contract calls/);
    assert.doesNotMatch(markup, /CONTRACT_INTERACTION/);
    assert.match(markup, /Ethereum and L2 rollups/);
    assert.doesNotMatch(markup, /Ethereum, L2 Rollups &amp; Sidechains/);
  });
});
