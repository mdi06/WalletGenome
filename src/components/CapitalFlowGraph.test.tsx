import assert from 'node:assert';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it } from 'node:test';
import { getMockScanResult } from '@/lib/mockData';
import CapitalFlowGraph from './CapitalFlowGraph';

describe('Capital Flow Graph verified summary', () => {
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
});
