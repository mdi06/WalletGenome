import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryCache, DomainRateLimiter } from './cache';

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
});
