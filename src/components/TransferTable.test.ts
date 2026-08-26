import assert from 'node:assert';
import { it } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getMockScanResult } from '@/lib/mockData';
import TransferTable from './TransferTable';

it('renders one row for duplicate transfer events', () => {
  const data = getMockScanResult();
  const transfer = data.chains[0].transferSummary.topInbound[0];
  data.chains[0].transferSummary.topInbound = [transfer, { ...transfer }];

  const markup = renderToStaticMarkup(createElement(TransferTable, { results: data.chains }));
  const renderedTokenCells = markup.match(/>USDC<\/td>/g) ?? [];

  assert.strictEqual(renderedTokenCells.length, 1);
});
