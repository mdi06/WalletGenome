import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryCache, DomainRateLimiter, SharedCache } from './cache';
import { RequestCancellationError } from './cancellation';

test('MemoryCache & RateLimiter Core Tests', async (t) => {
  await t.test('should store and retrieve cached items within TTL', () => {
    const cache = new MemoryCache<string>(10, 1); // 1 second TTL
    cache.set('key1', 'value1');

    assert.equal(cache.get('key1'), 'value1');
    assert.equal(cache.has('key1'), true);
  });

  await t.test('should expire items after TTL', async () => {
    const cache = new MemoryCache<string>(10, 0.1); // 100ms TTL
    cache.set('expireKey', 'testVal', 0.1);

    assert.equal(cache.get('expireKey'), 'testVal');
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.equal(cache.get('expireKey'), null);
  });

  await t.test('should enforce LRU capacity eviction', () => {
    const cache = new MemoryCache<number>(2, 60);
    cache.set('a', 1);
    cache.set('b', 2);
    assert.equal(cache.size, 2);

    // Access 'a' so 'b' becomes oldest
    cache.get('a');
    // Add 'c', should evict 'b'
    cache.set('c', 3);

    assert.equal(cache.get('a'), 1);
    assert.equal(cache.get('b'), null);
    assert.equal(cache.get('c'), 3);
  });

  await t.test('limits total bytes and rejects oversized individual items', () => {
    const cache = new MemoryCache<string>(10, 60, { maxBytes: 12, maxItemBytes: 8 });
    cache.set('first', '123456');
    cache.set('second', 'abcdef');

    const stats = cache.getStats();
    assert.equal(cache.get('first'), null);
    assert.equal(cache.get('second'), 'abcdef');
    assert.equal(stats.items, 1);
    assert.ok(stats.bytes <= 12);
    assert.equal(stats.evictions, 1);

    cache.set('too-large', '123456789');
    assert.equal(cache.get('too-large'), null);
    assert.equal(cache.getStats().items, 1);
  });

  await t.test('should rate limit requests using DomainRateLimiter', async () => {
    const limiter = new DomainRateLimiter(5); // 5 req/sec
    const start = Date.now();

    // Consume 5 tokens immediately
    for (let i = 0; i < 5; i++) {
      const acquired = await limiter.acquire(100);
      assert.equal(acquired, true);
    }

    // 6th request should wait for token replenishment
    const acquired6 = await limiter.acquire(1000);
    assert.equal(acquired6, true);
    const elapsed = Date.now() - start;
    assert.ok(elapsed >= 150, `Expected rate limiter to throttle, elapsed: ${elapsed}ms`);
  });

  await t.test('uses the configured shared Redis REST cache across cache instances', async () => {
    const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
    const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    const remoteStore = new Map<string, string>();
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.test';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    const fetchMock = mock.method(globalThis, 'fetch', async (_input: string | URL | Request, init?: RequestInit) => {
      const command = JSON.parse(String(init?.body)) as string[];
      if (command[0] === 'SET') {
        remoteStore.set(command[1], command[2]);
        return Response.json({ result: 'OK' });
      }
      if (command[0] === 'GET') {
        return Response.json({ result: remoteStore.get(command[1]) ?? null });
      }
      return Response.json({ result: 1 });
    });

    try {
      const writer = new SharedCache();
      const reader = new SharedCache();
      const fetchedAt = Date.now();
      await writer.set('cache-test-shared', { status: 'complete' }, 60, fetchedAt);
      const hit = await reader.get<{ status: string }>('cache-test-shared', 60);
      assert.deepEqual(hit?.value, { status: 'complete' });
      assert.equal(hit?.fetchedAt, fetchedAt);
      assert.equal(hit?.source, 'shared');
    } finally {
      fetchMock.mock.restore();
      if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
      else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
      if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
      else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
    }
  });

  await t.test('preserves the remaining TTL when a Redis hit is copied locally', async () => {
    const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
    const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    const remoteStore = new Map<string, string>();
    let currentTime = 0;
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.test';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    const dateNowMock = mock.method(Date, 'now', () => currentTime);
    const fetchMock = mock.method(globalThis, 'fetch', async (_input: string | URL | Request, init?: RequestInit) => {
      const command = JSON.parse(String(init?.body)) as string[];
      if (command[0] === 'SET') {
        remoteStore.set(command[1], command[2]);
        return Response.json({ result: 'OK' });
      }
      if (command[0] === 'GET') {
        return Response.json({ result: remoteStore.get(command[1]) ?? null });
      }
      return Response.json({ result: 1 });
    });

    try {
      const writer = new SharedCache();
      const reader = new SharedCache();
      await writer.set('cache-test-remaining-ttl', 'value', 3_600, 0);

      currentTime = 3_540_000;
      assert.equal((await reader.get('cache-test-remaining-ttl', 3_600))?.value, 'value');

      currentTime = 3_600_001;
      assert.equal(await reader.get('cache-test-remaining-ttl', 3_600), null);
    } finally {
      fetchMock.mock.restore();
      dateNowMock.mock.restore();
      if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
      else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
      if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
      else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
    }
  });

  await t.test('does not overwrite a complete local cache entry after cancellation', async () => {
    const cache = new SharedCache();
    cache.clearLocal();
    const key = 'cache-test-cancellation';
    await cache.set(key, { status: 'complete', version: 1 }, 60);

    const requestController = new AbortController();
    requestController.abort();
    await assert.rejects(
      cache.set(key, { status: 'complete', version: 2 }, 60, Date.now(), requestController.signal),
      (error: unknown) => error instanceof RequestCancellationError,
    );
    assert.deepEqual((await cache.get<{ status: string; version: number }>(key, 60))?.value, {
      status: 'complete',
      version: 1,
    });
  });

});
