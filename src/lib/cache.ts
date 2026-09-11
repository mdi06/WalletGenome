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
  sizeBytes: number;
}

export interface MemoryCacheOptions {
  maxBytes?: number;
  maxItemBytes?: number;
}

export interface MemoryCacheStats {
  items: number;
  bytes: number;
  maxItems: number;
  maxBytes: number;
  maxItemBytes: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
}

const DEFAULT_MAX_BYTES = 16 * 1024 * 1024;
const DEFAULT_MAX_ITEM_BYTES = 4 * 1024 * 1024;

function estimateValueBytes(value: unknown): number {
  try {
    const serialized = JSON.stringify(value);
    return typeof serialized === 'string'
      ? new TextEncoder().encode(serialized).byteLength
      : 0;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

export class MemoryCache<T = unknown> {
  private store = new Map<string, CacheEntry<T>>();
  private maxItems: number;
  private defaultTtlMs: number;
  private maxBytes: number;
  private maxItemBytes: number;
  private totalBytes = 0;
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(maxItems = 1000, defaultTtlSeconds = 300, options: MemoryCacheOptions = {}) {
    this.maxItems = Math.max(1, maxItems);
    this.defaultTtlMs = defaultTtlSeconds * 1000;
    this.maxBytes = Math.max(1, options.maxBytes ?? DEFAULT_MAX_BYTES);
    this.maxItemBytes = Math.max(1, Math.min(options.maxItemBytes ?? DEFAULT_MAX_ITEM_BYTES, this.maxBytes));
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      this.misses++;
      return null;
    }

    // Refresh LRU position (delete & re-set)
    this.store.delete(key);
    this.store.set(key, entry);
    this.hits++;
    return entry.value;
  }

  set(key: string, value: T, ttlSeconds?: number): void {
    const ttlMs = ttlSeconds !== undefined ? ttlSeconds * 1000 : this.defaultTtlMs;
    const sizeBytes = estimateValueBytes(value);
    if (sizeBytes > this.maxItemBytes) return;

    if (this.store.has(key)) this.delete(key);

    while (
      this.store.size >= this.maxItems
      || this.totalBytes + sizeBytes > this.maxBytes
    ) {
      const oldestKey = this.store.keys().next().value;
      if (typeof oldestKey !== 'string') break;
      this.delete(oldestKey);
      this.evictions++;
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      sizeBytes,
    });
    this.totalBytes += sizeBytes;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    this.totalBytes = Math.max(0, this.totalBytes - entry.sizeBytes);
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
    this.totalBytes = 0;
  }

  getStats(): MemoryCacheStats {
    const lookups = this.hits + this.misses;
    return {
      items: this.store.size,
      bytes: this.totalBytes,
      maxItems: this.maxItems,
      maxBytes: this.maxBytes,
      maxItemBytes: this.maxItemBytes,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate: lookups > 0 ? this.hits / lookups : 0,
    };
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

export interface RedisMetrics {
  requests: number;
  failures: number;
  totalLatencyMs: number;
}

const redisMetrics: RedisMetrics = { requests: 0, failures: 0, totalLatencyMs: 0 };

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
  const startedAt = Date.now();
  redisMetrics.requests++;
  let failed = false;
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
    if (!response.ok) {
      failed = true;
      return { ok: false, result: null };
    }
    const payload = await response.json() as unknown;
    throwIfAborted(parentSignal);
    if (!isRecord(payload) || !('result' in payload)) {
      failed = true;
      return { ok: false, result: null };
    }
    return { ok: true, result: payload.result ?? null };
  } catch {
    failed = true;
    const cancellation = cancellationErrorForSignal(parentSignal);
    if (cancellation) throw cancellation;
    return { ok: false, result: null };
  } finally {
    clearTimeout(timeoutId);
    redisMetrics.totalLatencyMs += Math.max(0, Date.now() - startedAt);
    if (failed) redisMetrics.failures++;
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
  private readonly localCache = new MemoryCache<CacheEnvelope<unknown>>(2_000, 3_600, {
    maxBytes: 16 * 1024 * 1024,
    maxItemBytes: 4 * 1024 * 1024,
  });

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

  getLocalStats(): MemoryCacheStats {
    return this.localCache.getStats();
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
  { maxBytes: 32 * 1024 * 1024, maxItemBytes: 4 * 1024 * 1024 },
);
export const sharedCache = new SharedCache();
export const identityCache = new MemoryCache<WalletIdentityReport>(
  500,
  PERSISTENCE_POLICY.caches.identityTtlSeconds,
  { maxBytes: 8 * 1024 * 1024, maxItemBytes: 512 * 1024 },
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

export interface CacheMetrics {
  scanResultCache: MemoryCacheStats;
  identityCache: MemoryCacheStats;
  sharedLocalCache: MemoryCacheStats;
  redis: RedisMetrics & { averageLatencyMs: number };
}

export function getCacheMetrics(): CacheMetrics {
  return {
    scanResultCache: scanResultCache.getStats(),
    identityCache: identityCache.getStats(),
    sharedLocalCache: sharedCache.getLocalStats(),
    redis: {
      ...redisMetrics,
      averageLatencyMs: redisMetrics.requests > 0
        ? redisMetrics.totalLatencyMs / redisMetrics.requests
        : 0,
    },
  };
}
