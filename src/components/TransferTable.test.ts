import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { it } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getMockScanResult } from '@/lib/mockData';
import type { MultiChainScanResult } from '@/lib/types';
import TransferTable from './TransferTable';
import {
  collectTransferTableRows,
  filterTransferTableRows,
  paginateTransferTable,
} from '@/lib/transferTable';

it('renders one row for duplicate transfer events', () => {
  const data = getMockScanResult();
  const transfer = data.chains[0].transferSummary.topInbound[0];
  data.chains[0].transferSummary.topInbound = [transfer, { ...transfer }];

  const markup = renderToStaticMarkup(createElement(TransferTable, { results: data.chains }));
  const renderedTokenCells = markup.match(/>USDC<\/div>/g) ?? [];

  assert.strictEqual(renderedTokenCells.length, 1);
});

it('searches transfer token, hash, counterparty, and label fields', () => {
  const result = getMockScanResult().chains[0];
  const transfers = collectTransferTableRows([result], 'all', 'all');

  assert.strictEqual(filterTransferTableRows(transfers, 'USDC').length, 1);
  assert.strictEqual(filterTransferTableRows(transfers, transfers[0]!.contractAddress).length, 1);
  assert.strictEqual(filterTransferTableRows(transfers, transfers[0]!.hash.slice(0, 18)).length, 1);
  assert.strictEqual(filterTransferTableRows(transfers, transfers[0]!.from).length, 1);
  assert.strictEqual(filterTransferTableRows(transfers, 'Binance 14').length, 1);
});

it('combines direction and chain filters before pagination', () => {
  const results = getMockScanResult().chains;
  const inboundEthereum = collectTransferTableRows(results, 'in', 1);

  assert.ok(inboundEthereum.length > 0);
  assert.ok(inboundEthereum.every(transfer => transfer.direction === 'in' && transfer.chainId === 1));
});

it('clamps page boundaries and reports accurate visible ranges', () => {
  const items = Array.from({ length: 101 }, (_, index) => index);

  const firstPage = paginateTransferTable(items, 1);
  const lastPage = paginateTransferTable(items, 3);
  const outOfRangePage = paginateTransferTable(items, 99);
  const emptyPage = paginateTransferTable([], 4);

  assert.deepStrictEqual({ page: firstPage.currentPage, count: firstPage.pageCount, first: firstPage.firstVisible, last: firstPage.lastVisible, items: firstPage.items.length }, { page: 1, count: 3, first: 1, last: 50, items: 50 });
  assert.deepStrictEqual({ page: lastPage.currentPage, first: lastPage.firstVisible, last: lastPage.lastVisible, items: lastPage.items.length }, { page: 3, first: 101, last: 101, items: 1 });
  assert.strictEqual(outOfRangePage.currentPage, 3);
  assert.deepStrictEqual({ first: emptyPage.firstVisible, last: emptyPage.lastVisible, items: emptyPage.items.length }, { first: 0, last: 0, items: 0 });
});

it('renders a 50-row page with live count and operable pagination controls', () => {
  const result = getMockScanResult().chains[0];
  const transfer = result.transferSummary.topInbound[0];
  result.transferSummary.topInbound = Array.from({ length: 55 }, (_, index) => ({
    ...transfer,
    hash: `0x${String(index).padStart(64, '0')}`,
  }));
  result.transferSummary.topOutbound = [];

  const markup = renderToStaticMarkup(createElement(TransferTable, { results: [result] }));

  assert.match(markup, /Search top token transfers/);
  assert.match(markup, /id="transfer-network"/);
  assert.match(markup, /Network/);
  assert.match(markup, /grid grid-cols-3 gap-2 md:flex/);
  assert.match(markup, /Showing 1–50 of 55 matching top token transfers/);
  assert.match(markup, /Page 1 of 2/);
  assert.match(markup, /aria-label="Previous top token transfers page"/);
  assert.match(markup, /aria-label="Next top token transfers page"/);
  assert.match(markup, /role="region" aria-label="Top token transfers table; native and internal transfers are not shown; scroll horizontally for all columns"/);
  assert.match(markup, new RegExp(`/tx/0x${'0'.repeat(62)}31`));
  assert.doesNotMatch(markup, new RegExp(`/tx/0x${'0'.repeat(62)}50`));
});

it('labels the transfer table scope and excludes native transfer rows', () => {
  const result = getMockScanResult().chains[0];
  const rows = collectTransferTableRows([result], 'all', 'all');
  const markup = renderToStaticMarkup(createElement(TransferTable, { results: [result] }));
  const emptyMarkup = renderToStaticMarkup(createElement(TransferTable, { results: [] }));

  assert.match(markup, /Top token transfers/);
  assert.match(markup, /up to 20 per group/);
  assert.match(markup, /Search, direction, network, and pagination apply only to this subset/);
  assert.match(markup, /Rows are sorted by USD value descending/);
  assert.match(markup, /Search this subset by token, contract, hash, or counterparty/);
  assert.match(emptyMarkup, /No top token transfers match the current filters/);
  assert.ok(rows.every(row => row.fromLabel !== 'Coinbase Hot Wallet'));
  assert.doesNotMatch(markup, /Coinbase Hot Wallet/);
});

it('shows token identity and suppresses legacy ticker-only USD values', () => {
  const result = getMockScanResult().chains[0];
  result.transferSummary.topInbound = [{
    ...result.transferSummary.topInbound[0],
    tokenName: 'BAYC Token',
    tokenSymbol: 'APE',
    contractAddress: '0x978a77ef76f23c06d951d2e827741ed334e2ff2f',
    valueFormatted: 115752927358.42157,
    valueUSD: 2239968222.8397007,
    valueUSDProvenance: 'historical',
  }];
  result.transferSummary.topOutbound = [];

  const rows = collectTransferTableRows([result], 'all', 'all');
  assert.strictEqual(rows[0]?.valueUSD, null);
  assert.strictEqual(rows[0]?.valueUSDProvenance, 'unpriced');

  const markup = renderToStaticMarkup(createElement(TransferTable, { results: [result] }));
  assert.match(markup, />BAYC Token<\/div>/);
  assert.match(markup, /Token contract 0x978a77ef76f23c06d951d2e827741ed334e2ff2f/);
  assert.match(markup, /Contract 0x978a\.\.\.ff2f/);
  assert.match(markup, />Unavailable<\/div>/);
  assert.doesNotMatch(markup, /\$2,239,968,222\.84/);
});

it('uses compact desktop row padding without removing token identity or explorer actions', () => {
  const result = getMockScanResult().chains[0];
  const markup = renderToStaticMarkup(createElement(TransferTable, { results: [result] }));

  assert.ok((markup.match(/py-5 md:py-1\.5 px-4/g) ?? []).length >= 8);
  assert.match(markup, /Token contract/);
  assert.match(markup, /aria-label="View .* transfer on block explorer"/);
  assert.match(markup, /min-h-11 min-w-11 md:min-h-9 md:min-w-9/);
});

it('hardens the reported saved Vitalik snapshot row', async () => {
  const snapshotPath = new URL('../../public/demo-wallets/vitalik-2026-08-26.json', import.meta.url);
  const payload = JSON.parse(await readFile(snapshotPath, 'utf8')) as { result: MultiChainScanResult };
  const rows = collectTransferTableRows(payload.result.chains, 'all', 'all');
  const suspiciousRow = rows.find(row => (
    row.contractAddress.toLowerCase() === '0x978a77ef76f23c06d951d2e827741ed334e2ff2f'
  ));

  assert.ok(suspiciousRow);
  assert.strictEqual(suspiciousRow.valueUSD, null);
  assert.strictEqual(suspiciousRow.valueUSDProvenance, 'unpriced');
});
