import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { sharedCache } from './cache';
import { RequestCancellationError } from './cancellation';
import {
  batchFetchPrices,
  canonicalPriceAssetId,
  clearPriceCachesForTests,
  getCachedCurrentPriceQuote,
  getCachedPriceQuote,
  isTrustedTokenContract,
  resolveCoingeckoId,
  resolvePriceAsset,
} from './prices';

describe('Historical price provenance', () => {
  it('requires a trusted token contract instead of pricing from a ticker', () => {
    assert.strictEqual(
      resolveCoingeckoId(1, '0x978a77ef76f23c06d951d2e827741ed334e2ff2f'),
      null,
    );
    assert.strictEqual(isTrustedTokenContract(1, '0x978a77ef76f23c06d951d2e827741ed334e2ff2f'), false);
    assert.strictEqual(
      resolveCoingeckoId(1, '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'),
      'usd-coin',
    );
  });

  it('keeps canonical identity and resolution chain-aware while covering verified assets', () => {
    const sharedAddress = '0x1111111111111111111111111111111111111111';
    assert.notStrictEqual(
      canonicalPriceAssetId({ chainId: 1, contractAddress: sharedAddress }),
      canonicalPriceAssetId({ chainId: 8453, contractAddress: sharedAddress }),
    );
    assert.strictEqual(
      resolveCoingeckoId(1, '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'),
      null,
    );
    assert.strictEqual(
      resolveCoingeckoId(8453, '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'),
      'usd-coin',
    );
    assert.strictEqual(
      resolveCoingeckoId(8453, '0x940181a94a35a4569e4529a3cdfb74e38fd98631'),
      'aerodrome-finance',
    );
    assert.strictEqual(
      resolveCoingeckoId(42161, '0x912ce59144191c1204e64559fe8253a0e49e6548'),
      'arbitrum',
    );
  });

  it('returns stablecoins with an explicit $1 assumption', () => {
    const quote = getCachedPriceQuote('usd-coin', 1_700_000_000);
    assert.strictEqual(quote.priceUSD, 1);
    assert.strictEqual(quote.provenance, 'stablecoin_assumption');
    assert.strictEqual(quote.source, 'stablecoin_assumption');
  });

  it('returns unpriced instead of a zero USD value when no price exists', () => {
    assert.deepStrictEqual(
      getCachedPriceQuote('definitely-uncached-price-test-token', 1_700_000_000),
      { priceUSD: null, provenance: 'unpriced' },
    );
    assert.deepStrictEqual(
      getCachedPriceQuote({ chainId: 1, contractAddress: '' }, 1_700_000_000),
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
      const historicalQuote = getCachedPriceQuote(tokenId, 1_600_000_000);
      assert.strictEqual(historicalQuote.priceUSD, 12.5);
      assert.strictEqual(historicalQuote.provenance, 'spot_estimate');
      assert.strictEqual(historicalQuote.source, 'defillama');
      const currentQuote = getCachedCurrentPriceQuote(tokenId);
      assert.strictEqual(currentQuote.priceUSD, 12.5);
      assert.strictEqual(currentQuote.provenance, 'spot_estimate');
      assert.strictEqual(currentQuote.source, 'defillama');
      assert.strictEqual(currentQuote.asset, `coingecko:${tokenId}`);
      assert.strictEqual(currentQuote.quoteCurrency, 'usd');
      assert.ok(typeof currentQuote.timestamp === 'number');
      assert.ok(typeof currentQuote.fetchedAt === 'number');
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
      const historicalQuote = getCachedPriceQuote(tokenId, timestamp);
      assert.strictEqual(historicalQuote.priceUSD, 7.25);
      assert.strictEqual(historicalQuote.provenance, 'historical');
      assert.strictEqual(historicalQuote.source, 'defillama');
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

  it('splits DefiLlama historical batches before the request URL becomes too long', async () => {
    const timestamp = 1_650_000_000;
    const tokenIds = Array.from({ length: 180 }, (_, index) => (
      `url-limit-price-test-token-${String(index).padStart(3, '0')}-${'x'.repeat(20)}`
    ));
    const historicalUrls: URL[] = [];
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname.startsWith('/prices/current/')) {
        const keys = decodeURIComponent(url.pathname.split('/prices/current/')[1]).split(',');
        return Response.json({
          coins: Object.fromEntries(keys.map(key => [key, { price: 25 }])),
        });
      }
      if (url.hostname === 'coins.llama.fi' && url.pathname === '/batchHistorical') {
        historicalUrls.push(url);
        const requested = JSON.parse(url.searchParams.get('coins') ?? '{}') as Record<string, number[]>;
        return Response.json({
          coins: Object.fromEntries(Object.entries(requested).map(([key, timestamps]) => [
            key,
            { prices: timestamps.map(requestedTimestamp => ({ timestamp: requestedTimestamp, price: 7.25 })) },
          ])),
        });
      }
      return new Response('', { status: 503 });
    });

    try {
      const result = await batchFetchPrices(tokenIds.map(coingeckoId => ({ coingeckoId, timestamp })));
      assert.strictEqual(result.status, 'complete');
      assert.ok(historicalUrls.length > 1);
      assert.ok(historicalUrls.every(url => url.toString().length <= 6_000));
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
      const spotQuote = getCachedPriceQuote(tokenIds[2], timestamp);
      assert.strictEqual(spotQuote.priceUSD, 25);
      assert.strictEqual(spotQuote.provenance, 'spot_estimate');
      assert.strictEqual(spotQuote.source, 'defillama');
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

  it('resolves an expanded unknown contract only from an exact chain-address provider key', async () => {
    clearPriceCachesForTests();
    const chainId = 8453;
    const contractAddress = '0x1111111111111111111111111111111111111112';
    const timestamp = 1_700_000_000;
    const providerKey = `base:${contractAddress}`;
    const dailyTimestamp = Math.floor(timestamp / 86_400) * 86_400 + 43_200;
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.hostname !== 'coins.llama.fi') return new Response('', { status: 404 });
      if (url.pathname.startsWith('/prices/current/')) {
        return Response.json({ coins: { [providerKey]: { price: 8.5, timestamp: dailyTimestamp } } });
      }
      return Response.json({ coins: { [providerKey]: { prices: [{ timestamp: dailyTimestamp, price: 7.5 }] } } });
    });

    try {
      const result = await batchFetchPrices([{ chainId, contractAddress, timestamp }]);
      assert.strictEqual(result.status, 'complete');
      const quote = getCachedPriceQuote({ chainId, contractAddress }, timestamp);
      assert.strictEqual(quote.priceUSD, 7.5);
      assert.strictEqual(quote.provenance, 'historical');
      assert.strictEqual(quote.source, 'defillama');
      assert.strictEqual(isTrustedTokenContract(chainId, contractAddress), true);
      const resolved = await resolvePriceAsset(chainId, contractAddress);
      assert.strictEqual(resolved?.contractAddress, contractAddress);
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('fans one shared native provider quote out to each chain-specific cache identity', async () => {
    clearPriceCachesForTests();
    const timestamp = 1_700_000_000;
    const dailyTimestamp = Math.floor(timestamp / 86_400) * 86_400 + 43_200;
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.hostname !== 'coins.llama.fi') return new Response('', { status: 404 });
      if (url.pathname.startsWith('/prices/current/')) {
        return Response.json({ coins: { 'coingecko:ethereum': { price: 2_500 } } });
      }
      return Response.json({ coins: {
        'coingecko:ethereum': { prices: [{ timestamp: dailyTimestamp, price: 2_400 }] },
      } });
    });

    try {
      const result = await batchFetchPrices([
        { chainId: 1, timestamp },
        { chainId: 8453, timestamp },
      ]);
      assert.strictEqual(result.status, 'complete');
      for (const chainId of [1, 8453]) {
        const quote = getCachedPriceQuote({ chainId }, timestamp);
        assert.strictEqual(quote.priceUSD, 2_400);
        assert.strictEqual(quote.provenance, 'historical');
        assert.strictEqual(quote.asset, `native:${chainId}`);
      }
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('reuses shared historical and current cache entries after a partial batch', async () => {
    clearPriceCachesForTests();
    const firstToken = 'partial-cache-success-token-a';
    const secondToken = 'partial-cache-missing-token-b';
    const timestamp = 1_700_000_000;
    let providerCalls = 0;
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      providerCalls += 1;
      const url = new URL(String(input));
      if (url.hostname === 'coins.llama.fi' && url.pathname.startsWith('/prices/current/')) {
        return Response.json({ coins: {
          [`coingecko:${firstToken}`]: { price: 11 },
          [`coingecko:${secondToken}`]: { price: 12 },
        } });
      }
      if (url.hostname === 'coins.llama.fi') {
        return Response.json({ coins: {
          [`coingecko:${firstToken}`]: { prices: [{ timestamp, price: 10 }] },
        } });
      }
      return new Response('', { status: 404 });
    });

    try {
      const first = await batchFetchPrices([
        { coingeckoId: firstToken, timestamp },
        { coingeckoId: secondToken, timestamp },
      ]);
      assert.strictEqual(first.status, 'partial');
      assert.strictEqual(getCachedPriceQuote(firstToken, timestamp).priceUSD, 10);
      const callsAfterPartialBatch = providerCalls;

      // Keep SharedCache's local fallback while evicting the process-local
      // quote cache. The next batch must recover both records from it.
      clearPriceCachesForTests();
      const second = await batchFetchPrices([{ coingeckoId: firstToken, timestamp }]);
      assert.strictEqual(second.status, 'complete');
      assert.strictEqual(getCachedPriceQuote(firstToken, timestamp).priceUSD, 10);
      assert.strictEqual(providerCalls, callsAfterPartialBatch);
    } finally {
      fetchMock.mock.restore();
      sharedCache.clearLocal();
    }
  });

  it('briefly negative-caches unsupported contracts without retrying provider work', async () => {
    clearPriceCachesForTests();
    const chainId = 8453;
    const contractAddress = '0x1111111111111111111111111111111111111113';
    const timestamp = 1_700_000_000;
    let providerCalls = 0;
    const fetchMock = mock.method(globalThis, 'fetch', async () => {
      providerCalls += 1;
      return new Response('', { status: 404 });
    });

    try {
      const first = await batchFetchPrices([{ chainId, contractAddress, timestamp }]);
      const callsAfterFirstAttempt = providerCalls;
      const second = await batchFetchPrices([{ chainId, contractAddress, timestamp }]);
      assert.strictEqual(first.status, 'unavailable');
      assert.strictEqual(second.status, 'unavailable');
      assert.ok(second.errors.some(error => error.code === 'unsupported_token'));
      assert.strictEqual(providerCalls, callsAfterFirstAttempt);
    } finally {
      fetchMock.mock.restore();
      sharedCache.clearLocal();
    }
  });

  it('retries contract pricing after a transient provider outage', async () => {
    clearPriceCachesForTests();
    const chainId = 8453;
    const contractAddress = '0x1111111111111111111111111111111111111114';
    const providerKey = `base:${contractAddress}`;
    const timestamp = 1_700_000_000;
    let outage = true;
    let providerCalls = 0;
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      providerCalls += 1;
      if (outage) return new Response('', { status: 503 });
      const url = new URL(String(input));
      if (url.hostname === 'coins.llama.fi' && url.pathname.startsWith('/prices/current/')) {
        return Response.json({ coins: { [providerKey]: { price: 3 } } });
      }
      if (url.hostname === 'coins.llama.fi') {
        return Response.json({ coins: {
          [providerKey]: { prices: [{ timestamp, price: 2 }] },
        } });
      }
      return new Response('', { status: 404 });
    });

    try {
      const first = await batchFetchPrices([{ chainId, contractAddress, timestamp }], undefined, { budgetMs: 10_000 });
      const callsAfterOutage = providerCalls;
      assert.strictEqual(first.status, 'unavailable');
      assert.ok(!first.errors.some(error => error.code === 'unsupported_token'));

      outage = false;
      const second = await batchFetchPrices([{ chainId, contractAddress, timestamp }], undefined, { budgetMs: 10_000 });
      assert.strictEqual(second.status, 'complete');
      assert.strictEqual(getCachedPriceQuote({ chainId, contractAddress }, timestamp).priceUSD, 2);
      assert.ok(providerCalls > callsAfterOutage);
    } finally {
      fetchMock.mock.restore();
      sharedCache.clearLocal();
    }
  });

  it('retries transient DefiLlama rate limits and server errors with bounded attempts', async () => {
    clearPriceCachesForTests();
    const tokenId = 'retryable-provider-price-test-token';
    const timestamp = 1_700_000_000;
    const dailyTimestamp = Math.floor(timestamp / 86_400) * 86_400 + 43_200;
    let currentAttempts = 0;
    let historicalAttempts = 0;
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.hostname !== 'coins.llama.fi') return new Response('', { status: 404 });
      if (url.pathname.startsWith('/prices/current/')) {
        currentAttempts += 1;
        if (currentAttempts === 1) return new Response('', { status: 429, headers: { 'Retry-After': '0' } });
        return Response.json({ coins: { [`coingecko:${tokenId}`]: { price: 9 } } });
      }
      historicalAttempts += 1;
      if (historicalAttempts < 3) return new Response('', { status: 503 });
      return Response.json({ coins: {
        [`coingecko:${tokenId}`]: { prices: [{ timestamp: dailyTimestamp, price: 8 }] },
      } });
    });

    try {
      const result = await batchFetchPrices([{ coingeckoId: tokenId, timestamp }]);
      assert.strictEqual(result.status, 'complete');
      assert.strictEqual(currentAttempts, 2);
      assert.strictEqual(historicalAttempts, 3);
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('propagates external cancellation instead of converting it to a pricing result', async () => {
    clearPriceCachesForTests();
    const controller = new AbortController();
    const fetchMock = mock.method(globalThis, 'fetch', async (
      _input: string | URL | Request,
      init?: RequestInit,
    ) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
    }));

    try {
      const pending = batchFetchPrices([{ coingeckoId: 'cancellable-price-test-token', timestamp: 1_700_000_000 }], undefined, {
        signal: controller.signal,
        budgetMs: 5_000,
      });
      await new Promise<void>(resolve => setImmediate(resolve));
      controller.abort();
      await assert.rejects(pending, error => error instanceof RequestCancellationError && error.reason === 'disconnect');
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('returns a budget failure promptly when a provider does not complete', async () => {
    clearPriceCachesForTests();
    const fetchMock = mock.method(globalThis, 'fetch', async (
      _input: string | URL | Request,
      init?: RequestInit,
    ) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
    }));
    const startedAt = Date.now();

    try {
      const result = await batchFetchPrices([{ coingeckoId: 'budget-price-test-token', timestamp: 1_700_000_000 }], undefined, {
        budgetMs: 500,
      });
      assert.ok(Date.now() - startedAt < 2_000);
      assert.ok(result.errors.some(error => error.code === 'pricing_budget_exhausted'));
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('does not call CoinGecko outside an explicitly configured historical access window', async () => {
    clearPriceCachesForTests();
    const previousPlan = process.env.COINGECKO_API_PLAN;
    process.env.COINGECKO_API_PLAN = 'demo';
    const timestamp = Math.floor(Date.now() / 1000) - (400 * 86_400);
    let coinGeckoCalls = 0;
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.hostname === 'api.coingecko.com') coinGeckoCalls += 1;
      if (url.hostname === 'coins.llama.fi') return Response.json({ coins: {} });
      return new Response('', { status: 404 });
    });

    try {
      const result = await batchFetchPrices([{ coingeckoId: 'historical-window-test-token', timestamp }]);
      assert.strictEqual(coinGeckoCalls, 0);
      assert.ok(result.errors.some(error => error.code === 'unavailable_historical_date'));
    } finally {
      fetchMock.mock.restore();
      if (previousPlan === undefined) delete process.env.COINGECKO_API_PLAN;
      else process.env.COINGECKO_API_PLAN = previousPlan;
    }
  });

  it('uses paid CoinGecko authentication only when the configured plan is paid', async () => {
    clearPriceCachesForTests();
    const previousPlan = process.env.COINGECKO_API_PLAN;
    process.env.COINGECKO_API_PLAN = 'pro';
    const tokenId = 'paid-auth-price-test-token';
    const timestamp = 1_700_000_000;
    const dailyTimestamp = Math.floor(timestamp / 86_400) * 86_400 + 43_200;
    let paidHeader: string | null = null;
    let demoHeader: string | null = null;
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.hostname === 'coins.llama.fi') return Response.json({ coins: {} });
      if (url.hostname === 'pro-api.coingecko.com') {
        const headers = new Headers(init?.headers);
        paidHeader = headers.get('x-cg-pro-api-key');
        demoHeader = headers.get('x-cg-demo-api-key');
        return Response.json({ prices: [[dailyTimestamp * 1000, 6.25]] });
      }
      return new Response('', { status: 404 });
    });

    try {
      const result = await batchFetchPrices([{ coingeckoId: tokenId, timestamp }], 'paid-key-for-test');
      assert.strictEqual(result.historicalStatus, 'complete');
      assert.strictEqual(paidHeader, 'paid-key-for-test');
      assert.strictEqual(demoHeader, null);
    } finally {
      fetchMock.mock.restore();
      if (previousPlan === undefined) delete process.env.COINGECKO_API_PLAN;
      else process.env.COINGECKO_API_PLAN = previousPlan;
    }
  });

  it('uses Demo authentication when a configured key has no explicit plan', async () => {
    clearPriceCachesForTests();
    const previousPlan = process.env.COINGECKO_API_PLAN;
    delete process.env.COINGECKO_API_PLAN;
    const tokenId = 'default-demo-auth-price-test-token';
    const timestamp = Math.floor(Date.now() / 1000) - 86_400;
    let demoHeader: string | null = null;
    let paidHeader: string | null = null;
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.hostname === 'coins.llama.fi') return Response.json({ coins: {} });
      if (url.hostname === 'api.coingecko.com') {
        const headers = new Headers(init?.headers);
        demoHeader = headers.get('x-cg-demo-api-key');
        paidHeader = headers.get('x-cg-pro-api-key');
        return Response.json({ prices: [[timestamp * 1000, 6.25]] });
      }
      return new Response('', { status: 404 });
    });

    try {
      const result = await batchFetchPrices([{ coingeckoId: tokenId, timestamp }], 'demo-key-for-test');
      assert.strictEqual(result.historicalStatus, 'complete');
      assert.strictEqual(demoHeader, 'demo-key-for-test');
      assert.strictEqual(paidHeader, null);
    } finally {
      fetchMock.mock.restore();
      if (previousPlan === undefined) delete process.env.COINGECKO_API_PLAN;
      else process.env.COINGECKO_API_PLAN = previousPlan;
    }
  });

  it('falls back to keyless CoinGecko when a Demo key is rejected', async () => {
    clearPriceCachesForTests();
    const previousPlan = process.env.COINGECKO_API_PLAN;
    delete process.env.COINGECKO_API_PLAN;
    const tokenId = 'rejected-demo-key-price-test-token';
    const timestamp = Math.floor(Date.now() / 1000) - 86_400;
    let authenticatedCalls = 0;
    let publicCalls = 0;
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.hostname === 'coins.llama.fi') return Response.json({ coins: {} });
      if (url.hostname === 'api.coingecko.com') {
        const headers = new Headers(init?.headers);
        if (headers.has('x-cg-demo-api-key')) {
          authenticatedCalls += 1;
          return new Response('', { status: 401 });
        }
        publicCalls += 1;
        return Response.json({ prices: [[timestamp * 1000, 4.5]] });
      }
      return new Response('', { status: 404 });
    });

    try {
      const result = await batchFetchPrices([{ coingeckoId: tokenId, timestamp }], 'revoked-demo-key');
      assert.strictEqual(result.historicalStatus, 'complete');
      assert.strictEqual(authenticatedCalls, 1);
      assert.strictEqual(publicCalls, 1);
      assert.ok(!result.errors.some(error => error.code === 'authentication_failure'));
    } finally {
      fetchMock.mock.restore();
      if (previousPlan === undefined) delete process.env.COINGECKO_API_PLAN;
      else process.env.COINGECKO_API_PLAN = previousPlan;
    }
  });
});
