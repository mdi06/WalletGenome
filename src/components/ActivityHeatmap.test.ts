import assert from 'node:assert';
import { it } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getMockScanResult } from '@/lib/mockData';
import ActivityHeatmap from './ActivityHeatmap';

it('does not render a hidden table that can create phantom scroll height', () => {
  const data = getMockScanResult();
  data.chains[0].activityProfile = {
    ...data.chains[0].activityProfile,
    heatmap: [{ day: 1, hour: 12, count: 1, intensity: 1 }],
  };
  const markup = renderToStaticMarkup(createElement(ActivityHeatmap, { results: data.chains }));

  assert.doesNotMatch(markup, /<table\b/);
  assert.doesNotMatch(markup, /class="[^"]*sr-only[^"]*"/);
  assert.match(markup, /Transaction activity heatmap by UTC day and hour;/);
});
