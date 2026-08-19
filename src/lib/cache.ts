/**
 * High-performance in-memory LRU Cache with TTL and Token Bucket Rate Limiter
 * for resilient multi-chain indexing and pricing.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCache<T = any> {
  private store = new Map<string, CacheEntry<T>>();
  private maxItems: number;
  private defaultTtlMs: number;

  constructor(maxItems = 1000, defaultTtlSeconds = 300) {
    this.maxItems = maxItems;
    this.defaultTtlMs = defaultTtlSeconds * 1000;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    // Refresh LRU position (delete & re-set)
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlSeconds?: number): void {
    const ttlMs = ttlSeconds !== undefined ? ttlSeconds * 1000 : this.defaultTtlMs;
    
    // Evict oldest if capacity reached
    if (this.store.size >= this.maxItems && !this.store.has(key)) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

/**
 * Token Bucket Rate Limiter to respect rate limits per endpoint domain.
 */
export class DomainRateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRatePerMs: number;
  private lastRefill: number;

  constructor(maxRequestsPerSecond = 4) {
    this.maxTokens = maxRequestsPerSecond;
    this.tokens = maxRequestsPerSecond;
    this.refillRatePerMs = maxRequestsPerSecond / 1000;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRatePerMs);
    this.lastRefill = now;
  }

  async acquire(waitTimeoutMs = 4000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < waitTimeoutMs) {
      this.refill();
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return true;
      }
      // Wait for tokens to replenish
      const waitTime = Math.max(50, Math.ceil((1 - this.tokens) / this.refillRatePerMs));
      await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 250)));
    }

    return false;
  }
}

// Global singletons for server runtime
export const scanResultCache = new MemoryCache<any>(500, 300); // 5 min TTL
export const identityCache = new MemoryCache<any>(500, 1800); // 30 min TTL
export const domainRateLimiters = new Map<string, DomainRateLimiter>();

export function getDomainLimiter(domainOrHost: string, maxReqPerSec = 4): DomainRateLimiter {
  let limiter = domainRateLimiters.get(domainOrHost);
  if (!limiter) {
    limiter = new DomainRateLimiter(maxReqPerSec);
    domainRateLimiters.set(domainOrHost, limiter);
  }
  return limiter;
}
