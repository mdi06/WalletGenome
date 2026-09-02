import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it } from 'node:test';
import { getMockScanResult } from '@/lib/mockData';
import type { WalletScanResponse } from '@/lib/types';
import CapitalFlowGraph from './CapitalFlowGraph';

describe('Capital Flow Graph verified summary', () => {
  it('renders network labels when the same protocol appears on multiple chains', () => {
    const data = getMockScanResult();
    const ethereumProtocol = data.chains[0].interactionsSummary.topProtocols[0];
    data.chains[1].interactionsSummary.topProtocols = [{
      ...ethereumProtocol,
      chainId: 8453,
      chainName: 'Base',
      contracts: ethereumProtocol.contracts.map(contract => ({
        ...contract,
        chainId: 8453,
        chainName: 'Base',
      })),
    }];

    const markup = renderToStaticMarkup(createElement(CapitalFlowGraph, {
      results: data.chains,
      metrics: data.metrics,
    }));

    assert.match(markup, /flow-network-label[^>]*>Ethereum<\/text>/);
    assert.match(markup, /flow-network-label[^>]*>Base<\/text>/);
  });

  it('shows verified in, out, and net values with partial lower-bound coverage', () => {
    const data = getMockScanResult();
    data.metrics = {
      ...data.metrics,
      inflowUSD: 233_817.93,
      outflowUSD: 545_280.89,
      netFlowUSD: -311_462.96,
      grossVolumeUSD: 779_098.82,
      capitalFlowCoverage: {
        verifiedLegs: 1_263,
        totalLegs: 2_006,
        excludedSpotEstimateLegs: 9,
        unpricedLegs: 734,
        coveragePercent: 63,
        status: 'partial',
      },
    };

    const markup = renderToStaticMarkup(createElement(CapitalFlowGraph, {
      results: data.chains,
      metrics: data.metrics,
    }));

    assert.match(markup, /Verified Flow Summary/i);
    assert.match(markup, /Verified Inflow/i);
    assert.match(markup, /Verified Outflow/i);
    assert.match(markup, /Net Verified Flow/i);
    assert.match(markup, /Partial lower-bound estimate/i);
    assert.match(markup, /63% count coverage/);
    assert.match(markup, /9 current-price estimates and 734 unpriced values excluded/);
  });

  it('shows observed priced lower bounds when wallet history is incomplete', () => {
    const data = getMockScanResult();
    data.chains[0].transferSummary.totalInboundUSD = 4_593_168_608.85;
    data.chains[0].transferSummary.totalOutboundUSD = 96_290_852.92;
    data.chains[1].transferSummary.totalInboundUSD = 0;
    data.chains[1].transferSummary.totalOutboundUSD = 0;
    data.metrics = {
      ...data.metrics,
      inflowUSD: null,
      outflowUSD: null,
      netFlowUSD: null,
      grossVolumeUSD: null,
      capitalFlowCoverage: {
        verifiedLegs: 59_502,
        totalLegs: 93_955,
        excludedSpotEstimateLegs: 232,
        unpricedLegs: 34_193,
        coveragePercent: null,
        status: 'unavailable',
      },
    };

    const markup = renderToStaticMarkup(createElement(CapitalFlowGraph, {
      results: data.chains,
      metrics: data.metrics,
    }));

    assert.match(markup, /Observed Priced Flow Summary/i);
    assert.match(markup, /Observed Priced Inflow/i);
    assert.match(markup, /\$4\.59B/);
    assert.match(markup, /\$96\.29M/);
    assert.match(markup, /\$4\.50B/);
    assert.match(markup, /Incomplete lower bound/i);
    assert.match(markup, /not wallet balance, profit, or complete lifetime totals/i);
    assert.doesNotMatch(markup, /Verified Flow Summary/i);
  });

  it('renders the refreshed Vitalik snapshot as observed, not verified lifetime flow', async () => {
    const snapshotUrl = new URL('../../public/demo-wallets/vitalik-2026-08-26.json', import.meta.url);
    const snapshot = JSON.parse(await readFile(snapshotUrl, 'utf8')) as {
      result: WalletScanResponse;
    };

    const markup = renderToStaticMarkup(createElement(CapitalFlowGraph, {
      results: snapshot.result.chains,
      metrics: snapshot.result.metrics,
    }));

    assert.match(markup, /Observed Priced Flow Summary/i);
    assert.match(markup, /\$4\.59B/);
    assert.match(markup, /\$96\.29M/);
    assert.match(markup, /\$4\.50B/);
    assert.match(markup, /59,502 returned historically priced or stablecoin transfer values/i);
    assert.doesNotMatch(markup, /Verified Flow Summary/i);
  });

  it('keeps the SVG decorative while exposing named keyboard inspection actions', () => {
    const data = getMockScanResult();
    const markup = renderToStaticMarkup(createElement(CapitalFlowGraph, {
      results: data.chains,
      metrics: data.metrics,
    }));
    const svgContent = markup.match(/<svg[^>]*aria-hidden="true"[^>]*>([\s\S]*?)<\/svg>/)?.[1];

    assert.ok(svgContent);
    assert.doesNotMatch(svgContent, /tabindex|<button|<a\s/i);
    assert.match(markup, /aria-label="Minimum capital-flow volume filter"/);
    assert.match(markup, /aria-label="Capital flow network filter"/);
    assert.match(markup, /aria-label="Inspect center Your Wallet"/);
    assert.match(markup, /Address: 0xd8da6bf26964af9d7eed9e03e53415d37aa96045/);
    assert.match(markup, /Inspect node/);
    assert.match(markup, /Open Your Wallet on explorer/);
  });
});
