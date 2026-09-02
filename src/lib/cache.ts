/**
 * High-performance in-memory LRU Cache with TTL and Token Bucket Rate Limiter
 * for resilient multi-chain indexing and pricing.
 */

import { PERSISTENCE_POLICY } from './persistencePolicy';
import type { CacheSource, WalletIdentityReport, WalletScanResponse } from './types';
import { abortableDelay, cancellationErrorForSignal, linkAbortSignal, throwIfAborted } from './cancellation';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCache<T = unknown> {
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

interface CacheEnvelope<T> {
  value: T;
  fetchedAt: number;
}

function remainingTtlSeconds(fetchedAt: number, ttlSeconds: number): number {
  const ttlMs = Math.max(0, ttlSeconds * 1000);
  const ageMs = Math.max(0, Date.now() - fetchedAt);
  return Math.max(0, Math.min(ttlMs, ttlMs - ageMs)) / 1000;
}

export interface SharedCacheHit<T> {
  value: T;
  fetchedAt: number;
  source: Exclude<CacheSource, 'live'>;
}

interface RedisCommandResult {
  ok: boolean;
  result: unknown | null;
}

function sharedRedisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isCacheEnvelope(value: unknown): value is CacheEnvelope<unknown> {
  return isRecord(value)
    && 'value' in value
    && typeof value.fetchedAt === 'number'
    && Number.isFinite(value.fetchedAt);
}

async function redisCommand(command: readonly string[], parentSignal?: AbortSignal): Promise<RedisCommandResult> {
  const config = sharedRedisConfig();
  if (!config) return { ok: false, result: null };

  throwIfAborted(parentSignal);
  const linked = linkAbortSignal(parentSignal);
  const controller = linked.controller;
  const timeoutId = setTimeout(() => controller.abort(), 2_500);
  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(command),
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, result: null };
    const payload = await response.json() as unknown;
    throwIfAborted(parentSignal);
    if (!isRecord(payload) || !('result' in payload)) return { ok: false, result: null };
    return { ok: true, result: payload.result ?? null };
  } catch {
    const cancellation = cancellationErrorForSignal(parentSignal);
    if (cancellation) throw cancellation;
    return { ok: false, result: null };
  } finally {
    clearTimeout(timeoutId);
    linked.dispose();
  }
}

export function isSharedCacheConfigured(): boolean {
  return sharedRedisConfig() !== null;
}

/**
 * An explicit Upstash Redis REST adapter keeps provider-facing data shared
 * across server instances. Without credentials it remains a safe local
 * optimization, so development and correctness do not depend on Redis.
 */
export class SharedCache {
  private readonly localCache = new MemoryCache<CacheEnvelope<unknown>>(2_000, 3_600);

  async get<T>(key: string, ttlSeconds: number, signal?: AbortSignal): Promise<SharedCacheHit<T> | null> {
    throwIfAborted(signal);
    const local = this.localCache.get(key);
    if (local && isCacheEnvelope(local)) {
      const remainingTtl = remainingTtlSeconds(local.fetchedAt, ttlSeconds);
      if (remainingTtl <= 0) {
        this.localCache.delete(key);
      } else {
        return {
          value: local.value as T,
          fetchedAt: local.fetchedAt,
          source: 'memory',
        };
      }
    }

    if (!isSharedCacheConfigured()) return null;
    const response = await redisCommand(['GET', key], signal);
    if (!response.ok || typeof response.result !== 'string') return null;

    try {
      const parsed = JSON.parse(response.result) as unknown;
      if (!isCacheEnvelope(parsed)) return null;
      const remainingTtl = remainingTtlSeconds(parsed.fetchedAt, ttlSeconds);
      if (remainingTtl <= 0) return null;
      throwIfAborted(signal);
      this.localCache.set(key, parsed, remainingTtl);
      return {
        value: parsed.value as T,
        fetchedAt: parsed.fetchedAt,
        source: 'shared',
      };
    } catch {
      const cancellation = cancellationErrorForSignal(signal);
      if (cancellation) throw cancellation;
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number, fetchedAt = Date.now(), signal?: AbortSignal): Promise<void> {
    throwIfAborted(signal);
    const envelope: CacheEnvelope<T> = { value, fetchedAt };
    const remainingTtl = remainingTtlSeconds(fetchedAt, ttlSeconds);
    if (remainingTtl <= 0) {
      this.localCache.delete(key);
      return;
    }
    if (isSharedCacheConfigured()) {
      await redisCommand(['SET', key, JSON.stringify(envelope), 'EX', String(Math.max(1, Math.ceil(remainingTtl)))], signal);
    }
    throwIfAborted(signal);
    this.localCache.set(key, envelope as CacheEnvelope<unknown>, remainingTtl);
  }

  clearLocal(): void {
    this.localCache.clear();
  }
}

export interface SharedCounterResult {
  allowed: boolean;
  count: number;
  retryAfterSeconds: number;
  configured: boolean;
  unavailable: boolean;
}

const localSharedCounters = new MemoryCache<number>(10_000, 86_400);

/**
 * Uses Redis INCR/EXPIRE when configured. The local fallback is deliberately
 * best-effort and only exists for local development; deployment-wide quota
 * protection requires the shared Redis variables.
 */
export async function incrementSharedCounter(
  key: string,
  windowSeconds: number,
  limit: number,
  increment = 1,
  signal?: AbortSignal,
): Promise<SharedCounterResult> {
  throwIfAborted(signal);
  const configured = isSharedCacheConfigured();
  if (!configured) {
    const current = localSharedCounters.get(key) ?? 0;
    const next = current + increment;
    localSharedCounters.set(key, next, windowSeconds);
    return {
      allowed: next <= limit,
      count: next,
      retryAfterSeconds: next <= limit ? 0 : windowSeconds,
      configured: false,
      unavailable: false,
    };
  }

  const incremented = await redisCommand(['INCRBY', key, String(Math.max(1, Math.ceil(increment)))], signal);
  if (!incremented.ok || incremented.result === null) {
    return {
      allowed: false,
      count: 0,
      retryAfterSeconds: windowSeconds,
      configured: true,
      unavailable: true,
    };
  }

  const count = typeof incremented.result === 'number'
    ? incremented.result
    : Number(incremented.result);
  if (!Number.isSafeInteger(count)) {
    return {
      allowed: false,
      count: 0,
      retryAfterSeconds: windowSeconds,
      configured: true,
      unavailable: true,
    };
  }
  if (count === increment) {
    await redisCommand(['EXPIRE', key, String(Math.max(1, Math.ceil(windowSeconds)))], signal);
  }
  return {
    allowed: count <= limit,
    count,
    retryAfterSeconds: count <= limit ? 0 : windowSeconds,
    configured: true,
    unavailable: false,
  };
}

export async function acquireSharedLease(key: string, ttlSeconds: number, signal?: AbortSignal): Promise<{
  acquired: boolean;
  configured: boolean;
  unavailable: boolean;
}> {
  throwIfAborted(signal);
  const configured = isSharedCacheConfigured();
  if (!configured) {
    const acquired = !localSharedCounters.has(key);
    if (acquired) localSharedCounters.set(key, 1, ttlSeconds);
    return { acquired, configured: false, unavailable: false };
  }

  const response = await redisCommand([
    'SET', key, '1', 'EX', String(Math.max(1, Math.ceil(ttlSeconds))), 'NX',
  ], signal);
  if (!response.ok) return { acquired: false, configured: true, unavailable: true };
  return { acquired: response.result === 'OK', configured: true, unavailable: false };
}

export function resetSharedProtectionForTests(): void {
  localSharedCounters.clear();
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

  async acquire(waitTimeoutMs = 4000, signal?: AbortSignal): Promise<boolean> {
    throwIfAborted(signal);
    const startTime = Date.now();

    while (Date.now() - startTime < waitTimeoutMs) {
      this.refill();
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return true;
      }
      // Wait for tokens to replenish
      const waitTime = Math.max(50, Math.ceil((1 - this.tokens) / this.refillRatePerMs));
      await abortableDelay(Math.min(waitTime, 250), signal);
    }

    return false;
  }
}

// Best-effort, process-local optimizations. Correctness must not depend on a warm instance.
export const scanResultCache = new MemoryCache<WalletScanResponse>(
  500,
  PERSISTENCE_POLICY.caches.scanTtlSeconds,
);
export const sharedCache = new SharedCache();
export const identityCache = new MemoryCache<WalletIdentityReport>(
  500,
  PERSISTENCE_POLICY.caches.identityTtlSeconds,
);
export const domainRateLimiters = new Map<string, DomainRateLimiter>();

export function getDomainLimiter(domainOrHost: string, maxReqPerSec = 4): DomainRateLimiter {
  let limiter = domainRateLimiters.get(domainOrHost);
  if (!limiter) {
    limiter = new DomainRateLimiter(maxReqPerSec);
    domainRateLimiters.set(domainOrHost, limiter);
  }
  return limiter;
}
