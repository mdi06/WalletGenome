import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  batchFetchPrices,
  getCachedCurrentPriceQuote,
  getCachedPriceQuote,
  isTrustedTokenContract,
  resolveCoingeckoId,
} from './prices';

describe('Historical price provenance', () => {
  it('requires a trusted token contract instead of pricing from a ticker', () => {
    assert.strictEqual(
      resolveCoingeckoId('0x978a77ef76f23c06d951d2e827741ed334e2ff2f'),
      null,
    );
    assert.strictEqual(isTrustedTokenContract('0x978a77ef76f23c06d951d2e827741ed334e2ff2f'), false);
    assert.strictEqual(
      resolveCoingeckoId('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'),
      'usd-coin',
    );
  });

  it('returns stablecoins with an explicit $1 assumption', () => {
    assert.deepStrictEqual(
      getCachedPriceQuote('usd-coin', 1_700_000_000),
      { priceUSD: 1, provenance: 'stablecoin_assumption' },
    );
  });

  it('returns unpriced instead of a zero USD value when no price exists', () => {
    assert.deepStrictEqual(
      getCachedPriceQuote('definitely-uncached-price-test-token', 1_700_000_000),
      { priceUSD: null, provenance: 'unpriced' },
    );
  });

  it('marks a current-price fallback as a spot estimate', async () => {
    const tokenId = 'spot-provenance-test-token';
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.hostname === 'coins.llama.fi' && url.pathname.startsWith('/prices/current/')) {
        return new Response(JSON.stringify({
          coins: { [`coingecko:${tokenId}`]: { price: 12.5 } },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.hostname === 'coins.llama.fi') {
        return new Response(JSON.stringify({ coins: {} }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('', { status: 503 });
    });

    try {
      const result = await batchFetchPrices([{ coingeckoId: tokenId, timestamp: 1_600_000_000 }]);
      assert.strictEqual(result.status, 'partial');
      assert.deepStrictEqual(
        getCachedPriceQuote(tokenId, 1_600_000_000),
        { priceUSD: 12.5, provenance: 'spot_estimate' },
      );
      assert.deepStrictEqual(
        getCachedCurrentPriceQuote(tokenId),
        { priceUSD: 12.5, provenance: 'spot_estimate' },
      );
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('prefers a timestamp-matched daily price over the current spot price', async () => {
    const tokenId = 'historical-provenance-test-token';
    const timestamp = 1_650_000_000;
    let coinGeckoCalls = 0;
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.hostname === 'coins.llama.fi' && url.pathname.startsWith('/prices/current/')) {
        return new Response(JSON.stringify({
          coins: { [`coingecko:${tokenId}`]: { price: 25 } },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.hostname === 'coins.llama.fi') {
        return new Response(JSON.stringify({
          coins: {
            [`coingecko:${tokenId}`]: {
              prices: [{ timestamp, price: 7.25, confidence: 0.99 }],
            },
          },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      coinGeckoCalls++;
      return new Response('', { status: 503 });
    });

    try {
      const result = await batchFetchPrices([{ coingeckoId: tokenId, timestamp }]);
      assert.strictEqual(result.status, 'complete');
      assert.deepStrictEqual(
        getCachedPriceQuote(tokenId, timestamp),
        { priceUSD: 7.25, provenance: 'historical' },
      );
      assert.strictEqual(coinGeckoCalls, 0);
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('batches duplicate asset-days into one DefiLlama historical request', async () => {
    const tokenId = 'batch-historical-price-test-token';
    const firstTimestamp = 1_650_000_000;
    const secondTimestamp = firstTimestamp + 86_400;
    let batchUrlString = '';
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname.startsWith('/prices/current/')) {
        return new Response(JSON.stringify({
          coins: { [`coingecko:${tokenId}`]: { price: 25 } },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.hostname === 'coins.llama.fi') {
        batchUrlString = url.toString();
        return new Response(JSON.stringify({
          coins: {
            [`coingecko:${tokenId}`]: {
              prices: [
                { timestamp: firstTimestamp, price: 7.25 },
                { timestamp: secondTimestamp, price: 7.5 },
              ],
            },
          },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('', { status: 503 });
    });

    try {
      const result = await batchFetchPrices([
        { coingeckoId: tokenId, timestamp: firstTimestamp },
        { coingeckoId: tokenId, timestamp: firstTimestamp },
        { coingeckoId: tokenId, timestamp: secondTimestamp },
      ]);
      assert.strictEqual(result.status, 'complete');
      assert.ok(batchUrlString);
      const requestCoins = JSON.parse(new URL(batchUrlString).searchParams.get('coins') ?? '{}');
      assert.strictEqual(requestCoins[`coingecko:${tokenId}`].length, 2);
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('limits CoinGecko fallback to the two highest-impact unresolved tokens', async () => {
    const tokenIds = [
      'limited-fallback-price-test-token-a',
      'limited-fallback-price-test-token-b',
      'limited-fallback-price-test-token-c',
    ];
    const timestamp = 1_650_000_000;
    const coinGeckoTokenIds: string[] = [];
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname.startsWith('/prices/current/')) {
        return new Response(JSON.stringify({
          coins: Object.fromEntries(tokenIds.map(tokenId => [
            `coingecko:${tokenId}`,
            { price: 25 },
          ])),
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.hostname === 'coins.llama.fi') {
        return new Response(JSON.stringify({ coins: {} }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const tokenId = decodeURIComponent(url.pathname.split('/coins/')[1].split('/market_chart/')[0]);
      coinGeckoTokenIds.push(tokenId);
      return new Response(JSON.stringify({ prices: [[timestamp * 1000, 7.25]] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    try {
      const result = await batchFetchPrices(tokenIds.map(coingeckoId => ({ coingeckoId, timestamp })));
      assert.strictEqual(result.status, 'partial');
      assert.strictEqual(new Set(coinGeckoTokenIds).size, 2);
      assert.deepStrictEqual(
        getCachedPriceQuote(tokenIds[2], timestamp),
        { priceUSD: 25, provenance: 'spot_estimate' },
      );
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('requests only the historical date range needed by the scan', async () => {
    const tokenId = 'bounded-range-price-test-token';
    const timestamp = 1_650_000_000;
    let historicalUrlString = '';
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.hostname === 'coins.llama.fi') {
        if (url.pathname === '/batchHistorical') {
          return new Response('', { status: 503 });
        }
        return new Response(JSON.stringify({
          coins: { [`coingecko:${tokenId}`]: { price: 25 } },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      historicalUrlString = url.toString();
      return new Response(JSON.stringify({ prices: [[timestamp * 1000, 7.25]] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    try {
      const result = await batchFetchPrices([{ coingeckoId: tokenId, timestamp }]);
      assert.strictEqual(result.status, 'complete');
      assert.ok(historicalUrlString);
      const historicalUrl = new URL(historicalUrlString);
      assert.match(historicalUrl.pathname, /\/market_chart\/range$/);
      assert.strictEqual(historicalUrl.searchParams.has('days'), false);
      assert.ok(Number(historicalUrl.searchParams.get('from')) <= timestamp);
      assert.ok(Number(historicalUrl.searchParams.get('to')) > timestamp);
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('deduplicates nearby required dates into one bounded historical request', async () => {
    const tokenId = 'deduplicated-range-price-test-token';
    const firstTimestamp = 1_650_000_000;
    const secondTimestamp = firstTimestamp + 86_400;
    const historicalUrls: URL[] = [];
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.hostname === 'coins.llama.fi') {
        if (url.pathname === '/batchHistorical') {
          return new Response('', { status: 503 });
        }
        return new Response(JSON.stringify({
          coins: { [`coingecko:${tokenId}`]: { price: 25 } },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      historicalUrls.push(url);
      return new Response(JSON.stringify({
        prices: [
          [firstTimestamp * 1000, 7.25],
          [secondTimestamp * 1000, 7.5],
        ],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    try {
      const result = await batchFetchPrices([
        { coingeckoId: tokenId, timestamp: firstTimestamp },
        { coingeckoId: tokenId, timestamp: firstTimestamp },
        { coingeckoId: tokenId, timestamp: secondTimestamp },
      ]);
      assert.strictEqual(result.status, 'complete');
      assert.strictEqual(historicalUrls.length, 1);
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('splits distant activity into small historical windows', async () => {
    const tokenId = 'sparse-range-price-test-token';
    const firstTimestamp = 1_550_000_000;
    const secondTimestamp = firstTimestamp + (800 * 86_400);
    const historicalUrls: URL[] = [];
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.hostname === 'coins.llama.fi') {
        if (url.pathname === '/batchHistorical') {
          return new Response('', { status: 503 });
        }
        return new Response(JSON.stringify({
          coins: { [`coingecko:${tokenId}`]: { price: 25 } },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      historicalUrls.push(url);
      const from = Number(url.searchParams.get('from'));
      const matchingTimestamp = Math.abs(from - firstTimestamp) < Math.abs(from - secondTimestamp)
        ? firstTimestamp
        : secondTimestamp;
      return new Response(JSON.stringify({ prices: [[matchingTimestamp * 1000, 7.25]] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    try {
      const result = await batchFetchPrices([
        { coingeckoId: tokenId, timestamp: firstTimestamp },
        { coingeckoId: tokenId, timestamp: secondTimestamp },
      ]);
      assert.strictEqual(result.status, 'complete');
      assert.strictEqual(historicalUrls.length, 2);
      for (const url of historicalUrls) {
        const rangeSeconds = Number(url.searchParams.get('to')) - Number(url.searchParams.get('from'));
        assert.ok(rangeSeconds <= 2 * 86_400);
      }
    } finally {
      fetchMock.mock.restore();
    }
  });
});
