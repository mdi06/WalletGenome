import { getChainConfig, getKnownTokenAsset, isStablecoinContract } from './chains';
import { MemoryCache, getDomainLimiter, sharedCache } from './cache';
import {
  abortableDelay,
  cancellationErrorForSignal,
  linkAbortSignal,
  RequestCancellationError,
  throwIfAborted,
} from './cancellation';
import type {
  DataAvailabilityError,
  DataAvailabilityStatus,
  PriceProvenance,
  PriceQuote,
  ProviderErrorCode,
} from './types';

const SECONDS_PER_DAY = 86_400;
const MAX_HISTORY_RANGE_DAYS = 366;
const MAX_MERGE_GAP_DAYS = 31;
const DEFI_LLAMA_BATCH_POINT_LIMIT = 250;
const DEFI_LLAMA_HISTORICAL_URL_LIMIT = 6_000;
const DEFI_LLAMA_CURRENT_TOKEN_LIMIT = 40;
const COINGECKO_FALLBACK_TOKEN_LIMIT = 2;
const COINGECKO_FALLBACK_RANGE_LIMIT = 2;
const MAX_PROVIDER_RETRIES = 2;
const CURRENT_PRICE_TTL_SECONDS = 300;
const HISTORICAL_PRICE_TTL_SECONDS = 365 * SECONDS_PER_DAY;
const UNSUPPORTED_RESOLUTION_TTL_SECONDS = 300;
const RESOLUTION_TTL_SECONDS = 30 * SECONDS_PER_DAY;
const DEFAULT_PRICING_BUDGET_MS = 12_000;

const STABLE_IDS = new Set([
  'tether', 'usd-coin', 'dai', 'true-usd', 'frax', 'usdt', 'usdc', 'busd',
  'binance-usd', 'usde', 'ethena-usde', 'pyusd', 'fdusd', 'crvusd',
]);

const DEFI_LLAMA_CHAIN_KEYS: Record<number, string> = {
  1: 'ethereum',
  8453: 'base',
  42161: 'arbitrum',
  10: 'optimism',
};

const COINGECKO_PLATFORM_IDS: Record<number, string> = {
  1: 'ethereum',
  8453: 'base',
  42161: 'arbitrum-one',
  10: 'optimistic-ethereum',
};

type PriceSource = 'defillama' | 'coingecko' | 'stablecoin_assumption';

export interface PriceAssetReference {
  chainId?: number;
  contractAddress?: string | null;
  coingeckoId?: string;
}

export interface PriceRequest extends PriceAssetReference {
  timestamp: number;
  quoteCurrency?: string;
}

interface HistoricalPriceRange {
  from: number;
  to: number;
  requiredDateKeys: string[];
}

export interface ResolvedPriceAsset {
  assetId: string;
  chainId?: number;
  contractAddress?: string;
  coingeckoId?: string;
  defillamaKey: string;
  known: boolean;
}

interface ResolutionCacheEntry {
  status: 'resolved' | 'unsupported';
  asset?: ResolvedPriceAsset;
  provider?: string;
  reason?: string;
}

interface PriceCacheRecord {
  priceUSD: number;
  provenance: Exclude<PriceProvenance, 'unpriced'>;
  source: PriceSource;
  timestamp: number;
  fetchedAt: number;
  asset: string;
  quoteCurrency: string;
}

interface ProviderFailure {
  code: ProviderErrorCode;
  message: string;
  provider: string;
  asset?: string;
  chainId?: number;
  dates?: string[];
}

interface DefiLlamaHistoricalPoint {
  timestamp?: unknown;
  price?: unknown;
}

interface DefiLlamaBatchHistoricalResponse {
  coins?: Record<string, { prices?: DefiLlamaHistoricalPoint[] }>;
}

interface DefiLlamaCurrentCoin {
  price?: unknown;
  timestamp?: unknown;
  confidence?: unknown;
}

interface DefiLlamaCurrentResponse {
  coins?: Record<string, DefiLlamaCurrentCoin>;
}

interface CoinGeckoHistoricalResponse {
  prices?: unknown;
}

interface CoinGeckoConfig {
  plan: CoinGeckoPlan;
  baseUrl: string;
  headers: Record<string, string>;
  maxHistoricalDays: number;
}

type CoinGeckoPlan = 'public' | 'demo' | 'basic' | 'analyst' | 'lite' | 'pro' | 'enterprise';

interface NormalizedPriceRequest {
  asset: ResolvedPriceAsset;
  timestamp: number;
  dateKey: string;
  quoteCurrency: string;
  stablecoin: boolean;
  dynamicContract: boolean;
}

const historicalPriceCache = new MemoryCache<PriceCacheRecord>(20_000, HISTORICAL_PRICE_TTL_SECONDS);
const currentPriceCache = new MemoryCache<PriceCacheRecord>(5_000, CURRENT_PRICE_TTL_SECONDS);
const resolutionCache = new MemoryCache<ResolutionCacheEntry>(5_000, UNSUPPORTED_RESOLUTION_TTL_SECONDS);
const inFlightProviderOperations = new Map<string, Promise<unknown>>();

export function dateKeyFromTimestamp(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function startOfUtcDay(timestamp: number): number {
  return Math.floor(timestamp / SECONDS_PER_DAY) * SECONDS_PER_DAY;
}

function dailyLookupTimestamp(timestamp: number): number {
  return startOfUtcDay(timestamp) + (SECONDS_PER_DAY / 2);
}

function currentUtcDateKey(): string {
  return dateKeyFromTimestamp(Math.floor(Date.now() / 1000));
}

function historicalTtlSeconds(dateKey: string): number {
  return dateKey < currentUtcDateKey()
    ? HISTORICAL_PRICE_TTL_SECONDS
    : CURRENT_PRICE_TTL_SECONDS;
}

function normalizeQuoteCurrency(quoteCurrency?: string): string {
  const normalized = (quoteCurrency ?? 'usd').trim().toLowerCase();
  return /^[a-z0-9]{2,12}$/.test(normalized) ? normalized : 'usd';
}

function isValidContractAddress(contractAddress?: string | null): contractAddress is string {
  return typeof contractAddress === 'string'
    && /^0x[a-fA-F0-9]{40}$/.test(contractAddress.trim());
}

export function canonicalPriceAssetId(asset: PriceAssetReference): string | null {
  if (asset.contractAddress !== undefined && asset.contractAddress !== null
    && !isValidContractAddress(asset.contractAddress)) return null;
  if (isValidContractAddress(asset.contractAddress) && Number.isSafeInteger(asset.chainId)) {
    return `token:${asset.chainId}:${asset.contractAddress.trim().toLowerCase()}`;
  }
  if (Number.isSafeInteger(asset.chainId) && !asset.contractAddress) {
    return `native:${asset.chainId}`;
  }
  if (typeof asset.coingeckoId === 'string' && asset.coingeckoId.trim()) {
    return `coingecko:${asset.coingeckoId.trim().toLowerCase()}`;
  }
  return null;
}

function providerAssetKey(asset: PriceAssetReference): string | null {
  if (asset.contractAddress !== undefined && asset.contractAddress !== null
    && !isValidContractAddress(asset.contractAddress)) return null;
  if (isValidContractAddress(asset.contractAddress) && Number.isSafeInteger(asset.chainId)) {
    const chainId = asset.chainId as number;
    const known = getKnownTokenAsset(chainId, asset.contractAddress);
    if (known) return `coingecko:${known.coingeckoId}`;
    const chainKey = DEFI_LLAMA_CHAIN_KEYS[chainId];
    return chainKey ? `${chainKey}:${asset.contractAddress.trim().toLowerCase()}` : null;
  }
  if (Number.isSafeInteger(asset.chainId) && !asset.contractAddress) {
    try {
      return `coingecko:${getChainConfig(asset.chainId as number).nativeToken.coingeckoId}`;
    } catch {
      return null;
    }
  }
  if (typeof asset.coingeckoId === 'string' && asset.coingeckoId.trim()) {
    return `coingecko:${asset.coingeckoId.trim().toLowerCase()}`;
  }
  return null;
}

function normalizeRequest(request: PriceRequest): NormalizedPriceRequest | null {
  const assetId = canonicalPriceAssetId(request);
  const defillamaKey = providerAssetKey(request);
  if (!assetId || !defillamaKey || !Number.isFinite(request.timestamp) || request.timestamp <= 0) {
    return null;
  }

  const hasContract = isValidContractAddress(request.contractAddress);
  const chainId = Number.isSafeInteger(request.chainId) ? request.chainId : undefined;
  const knownToken = hasContract && chainId !== undefined
    ? getKnownTokenAsset(chainId, request.contractAddress)
    : null;
  const coingeckoId = knownToken?.coingeckoId
    ?? (hasContract ? undefined : request.coingeckoId?.trim().toLowerCase());

  return {
    asset: {
      assetId,
      chainId,
      contractAddress: hasContract ? request.contractAddress?.trim().toLowerCase() : undefined,
      coingeckoId,
      defillamaKey,
      known: Boolean(knownToken) || !hasContract,
    },
    timestamp: request.timestamp,
    dateKey: dateKeyFromTimestamp(request.timestamp),
    quoteCurrency: normalizeQuoteCurrency(request.quoteCurrency),
    stablecoin: knownToken?.stablecoin === true
      || (!hasContract && coingeckoId !== undefined && STABLE_IDS.has(coingeckoId)),
    dynamicContract: hasContract && !knownToken,
  };
}

function deduplicateRequests(requests: PriceRequest[]): NormalizedPriceRequest[] {
  const unique = new Map<string, NormalizedPriceRequest>();
  for (const request of requests) {
    const normalized = normalizeRequest(request);
    if (!normalized) continue;
    const key = `${normalized.asset.assetId}:${normalized.dateKey}:${normalized.quoteCurrency}`;
    if (!unique.has(key)) unique.set(key, normalized);
  }
  return [...unique.values()];
}

function historicalCacheKey(assetId: string, dateKey: string, quoteCurrency: string): string {
  return `walletgenome:price:historical:v2:${assetId}:${dateKey}:${quoteCurrency}`;
}

function currentCacheKey(assetId: string, quoteCurrency: string): string {
  return `walletgenome:price:current:v2:${assetId}:${quoteCurrency}`;
}

function resolutionCacheKey(asset: ResolvedPriceAsset): string {
  // v3 invalidates negative entries written before transient provider failures
  // were separated from confirmed unsupported contracts.
  return `walletgenome:price:resolution:v3:${asset.assetId}`;
}

function remainingTtlSeconds(fetchedAt: number, ttlSeconds: number): number {
  return Math.max(0, ttlSeconds - Math.max(0, Date.now() - fetchedAt) / 1000);
}

function isValidPrice(value: unknown): value is number {
  // A provider's zero is not a meaningful asset quote. Treat it as missing so
  // downstream USD fields cannot turn an unavailable price into an exact $0.
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isResolved(normalized: NormalizedPriceRequest): boolean {
  return !normalized.dynamicContract
    || resolutionCache.get(resolutionCacheKey(normalized.asset))?.status === 'resolved';
}

function markResolved(asset: ResolvedPriceAsset): void {
  const entry: ResolutionCacheEntry = { status: 'resolved', asset };
  resolutionCache.set(resolutionCacheKey(asset), entry, RESOLUTION_TTL_SECONDS);
  void sharedCache.set(resolutionCacheKey(asset), entry, RESOLUTION_TTL_SECONDS).catch(() => undefined);
}

function markUnsupported(asset: ResolvedPriceAsset, reason: string): void {
  const entry: ResolutionCacheEntry = {
    status: 'unsupported',
    provider: 'defillama/coingecko',
    reason,
  };
  resolutionCache.set(resolutionCacheKey(asset), entry, UNSUPPORTED_RESOLUTION_TTL_SECONDS);
  // The local negative cache is immediate; Redis persistence must not extend
  // the scan after the provider budget has been spent.
  void sharedCache.set(resolutionCacheKey(asset), entry, UNSUPPORTED_RESOLUTION_TTL_SECONDS).catch(() => undefined);
}

function recordToQuote(record: PriceCacheRecord): PriceQuote {
  return {
    priceUSD: record.priceUSD,
    provenance: record.provenance,
    source: record.source,
    timestamp: record.timestamp,
    fetchedAt: record.fetchedAt,
    asset: record.asset,
    quoteCurrency: record.quoteCurrency,
  };
}

async function cacheHistoricalRecord(record: PriceCacheRecord, dateKey: string, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  const ttlSeconds = historicalTtlSeconds(dateKey);
  const key = historicalCacheKey(record.asset, dateKey, record.quoteCurrency);
  historicalPriceCache.set(key, record, ttlSeconds);
  await sharedCache.set(key, record, ttlSeconds, record.fetchedAt, signal);
}

async function cacheCurrentRecord(record: PriceCacheRecord, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  const key = currentCacheKey(record.asset, record.quoteCurrency);
  currentPriceCache.set(key, record, CURRENT_PRICE_TTL_SECONDS);
  await sharedCache.set(key, record, CURRENT_PRICE_TTL_SECONDS, record.fetchedAt, signal);
}

async function loadHistoricalRecord(
  asset: ResolvedPriceAsset,
  dateKey: string,
  quoteCurrency: string,
  signal?: AbortSignal,
): Promise<PriceCacheRecord | null> {
  const key = historicalCacheKey(asset.assetId, dateKey, quoteCurrency);
  const local = historicalPriceCache.get(key);
  if (local) return local;

  const ttlSeconds = historicalTtlSeconds(dateKey);
  const shared = await sharedCache.get<PriceCacheRecord>(key, ttlSeconds, signal);
  if (!shared || !isValidPrice(shared.value.priceUSD)) return null;
  const remaining = remainingTtlSeconds(shared.fetchedAt, ttlSeconds);
  if (remaining <= 0) return null;
  historicalPriceCache.set(key, shared.value, remaining);
  return shared.value;
}

async function loadCurrentRecord(
  asset: ResolvedPriceAsset,
  quoteCurrency: string,
  signal?: AbortSignal,
): Promise<PriceCacheRecord | null> {
  const key = currentCacheKey(asset.assetId, quoteCurrency);
  const local = currentPriceCache.get(key);
  if (local) return local;
  const shared = await sharedCache.get<PriceCacheRecord>(key, CURRENT_PRICE_TTL_SECONDS, signal);
  if (!shared || !isValidPrice(shared.value.priceUSD)) return null;
  const remaining = remainingTtlSeconds(shared.fetchedAt, CURRENT_PRICE_TTL_SECONDS);
  if (remaining <= 0) return null;
  currentPriceCache.set(key, shared.value, remaining);
  return shared.value;
}

async function loadResolution(asset: ResolvedPriceAsset, signal?: AbortSignal): Promise<ResolutionCacheEntry | null> {
  const key = resolutionCacheKey(asset);
  const local = resolutionCache.get(key);
  if (local) return local;
  const shared = await sharedCache.get<ResolutionCacheEntry>(key, RESOLUTION_TTL_SECONDS, signal);
  if (!shared) return null;
  const ttl = shared.value.status === 'resolved' ? RESOLUTION_TTL_SECONDS : UNSUPPORTED_RESOLUTION_TTL_SECONDS;
  const remaining = remainingTtlSeconds(shared.fetchedAt, ttl);
  if (remaining <= 0) return null;
  resolutionCache.set(key, shared.value, remaining);
  return shared.value;
}

function hasUnsupportedResolution(request: NormalizedPriceRequest): boolean {
  return request.dynamicContract
    && resolutionCache.get(resolutionCacheKey(request.asset))?.status === 'unsupported';
}

async function runBounded<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
  signal?: AbortSignal,
): Promise<void> {
  let nextIndex = 0;
  const runWorker = async (): Promise<void> => {
    while (true) {
      throwIfAborted(signal);
      const index = nextIndex++;
      if (index >= items.length) return;
      await worker(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()));
}

function retryAfterMilliseconds(headers: Headers): number | null {
  const value = headers.get('retry-after');
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(10_000, seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.min(10_000, Math.max(0, date - Date.now())) : null;
}

function providerFailure(
  code: ProviderErrorCode,
  message: string,
  provider: string,
  asset?: ResolvedPriceAsset,
  dates?: string[],
): ProviderFailure {
  return {
    code,
    message,
    provider,
    asset: asset?.assetId,
    chainId: asset?.chainId,
    dates,
  };
}

async function fetchJsonWithRetry<T>(
  url: string | URL,
  init: RequestInit,
  provider: string,
  signal?: AbortSignal,
  timeoutMs = 8_000,
): Promise<{ data: T | null; failure?: ProviderFailure }> {
  let lastFailure: ProviderFailure = providerFailure(
    'provider_error',
    `${provider} did not return a usable response.`,
    provider,
  );

  for (let attempt = 0; attempt <= MAX_PROVIDER_RETRIES; attempt++) {
    throwIfAborted(signal);
    const linked = linkAbortSignal(signal);
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      linked.controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(url, { ...init, signal: linked.signal });
      throwIfAborted(signal);
      if (response.ok) {
        try {
          const data = await response.json() as T;
          throwIfAborted(signal);
          return { data };
        } catch {
          const cancellation = cancellationErrorForSignal(signal);
          if (cancellation) throw cancellation;
          lastFailure = providerFailure('invalid_response', `${provider} returned invalid JSON.`, provider);
        }
      } else {
        const retryable = response.status === 429 || response.status >= 500;
        const code: ProviderErrorCode = response.status === 429
          ? 'rate_limited'
          : response.status === 401 || response.status === 403
            ? 'authentication_failure'
            : response.status === 404
              ? 'unsupported_token'
              : 'http_error';
        lastFailure = providerFailure(code, `${provider} returned HTTP ${response.status}.`, provider);
        if (!retryable || attempt >= MAX_PROVIDER_RETRIES) return { data: null, failure: lastFailure };
        const retryDelay = retryAfterMilliseconds(response.headers) ?? 250 * Math.pow(2, attempt);
        await abortableDelay(retryDelay, signal);
        continue;
      }
    } catch {
      const cancellation = cancellationErrorForSignal(signal);
      if (cancellation) throw cancellation;
      lastFailure = providerFailure(
        timedOut ? 'timeout' : 'provider_error',
        timedOut
          ? `${provider} timed out after ${timeoutMs}ms.`
          : `${provider} request failed before a usable response was received.`,
        provider,
      );
      if (attempt < MAX_PROVIDER_RETRIES) {
        await abortableDelay(250 * Math.pow(2, attempt), signal);
        continue;
      }
    } finally {
      clearTimeout(timeoutId);
      linked.dispose();
    }
  }

  return { data: null, failure: lastFailure };
}

async function coalesced<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const existing = inFlightProviderOperations.get(key);
  if (existing) return existing as Promise<T>;
  const promise = operation().finally(() => {
    if (inFlightProviderOperations.get(key) === promise) inFlightProviderOperations.delete(key);
  });
  inFlightProviderOperations.set(key, promise);
  return promise;
}

async function fetchDefiLlamaCurrentPrices(
  assets: readonly NormalizedPriceRequest[],
  signal?: AbortSignal,
): Promise<ProviderFailure[]> {
  const candidates = assets.filter(item => !item.stablecoin);
  if (candidates.length === 0) return [];

  const failures: ProviderFailure[] = [];
  const uniqueByProviderKey = new Map<string, NormalizedPriceRequest[]>();
  for (const candidate of candidates) {
    const group = uniqueByProviderKey.get(candidate.asset.defillamaKey) ?? [];
    group.push(candidate);
    uniqueByProviderKey.set(candidate.asset.defillamaKey, group);
  }
  const unresolved = [...uniqueByProviderKey.values()].filter(group => group.some(item => !currentPriceCache.has(
    currentCacheKey(item.asset.assetId, item.quoteCurrency),
  )));
  const batches: NormalizedPriceRequest[][][] = [];
  for (let offset = 0; offset < unresolved.length; offset += DEFI_LLAMA_CURRENT_TOKEN_LIMIT) {
    batches.push(unresolved.slice(offset, offset + DEFI_LLAMA_CURRENT_TOKEN_LIMIT));
  }

  await runBounded(batches, 2, async batch => {
    throwIfAborted(signal);
    const items = batch.flat();
    const providerKeys = [...new Set(batch.map(group => group[0].asset.defillamaKey))];
    const url = `https://coins.llama.fi/prices/current/${providerKeys.join(',')}`;
    const result = await coalesced(`defillama:current:${providerKeys.slice().sort().join(',')}`, async () => {
      const acquired = await getDomainLimiter('coins.llama.fi', 5).acquire(2_000, signal);
      if (!acquired) {
        return {
          data: null,
          failure: providerFailure(
            'rate_limited',
            'DefiLlama pricing was rate-limited before the request could be sent.',
            'DefiLlama current prices',
          ),
        };
      }
      return fetchJsonWithRetry<DefiLlamaCurrentResponse>(
        url,
        { headers: { Accept: 'application/json' } },
        'DefiLlama current prices',
        signal,
        3_500,
      );
    });
    throwIfAborted(signal);

    const coinsByKey = new Map(Object.entries(result.data?.coins ?? {}).map(([key, value]) => [key.toLowerCase(), value]));
    const writes: Promise<void>[] = [];
    for (const item of items) {
      const coin = coinsByKey.get(item.asset.defillamaKey.toLowerCase());
      const price = coin?.price;
      if (isValidPrice(price)) {
        if (item.dynamicContract) markResolved(item.asset);
        writes.push(cacheCurrentRecord({
          priceUSD: price,
          provenance: 'spot_estimate',
          source: 'defillama',
          timestamp: typeof coin?.timestamp === 'number' && Number.isFinite(coin.timestamp)
            ? coin.timestamp
            : Math.floor(Date.now() / 1000),
          fetchedAt: Date.now(),
          asset: item.asset.assetId,
          quoteCurrency: item.quoteCurrency,
        }, signal));
      } else if (item.dynamicContract && (
        !result.failure || result.failure.code === 'unsupported_token'
      )) {
        // Cache a contract as unsupported only when the provider answered
        // successfully without that exact contract, or explicitly returned
        // 404. Timeouts, rate limits, auth failures, and 5xx responses say
        // nothing about whether the token itself is supported.
        markUnsupported(item.asset, 'No trusted contract-based provider price was returned.');
      }
    }
    await Promise.all(writes);
    if (result.failure) {
      for (const item of items) {
        if (!currentPriceCache.has(currentCacheKey(item.asset.assetId, item.quoteCurrency))) {
          failures.push({ ...result.failure, asset: item.asset.assetId, chainId: item.asset.chainId });
        }
      }
    }
  }, signal);

  return failures;
}

function buildHistoricalPriceRanges(timestamps: number[]): HistoricalPriceRange[] {
  const requiredDays = [...new Set(
    timestamps
      .filter(timestamp => Number.isFinite(timestamp) && timestamp > 0)
      .map(startOfUtcDay),
  )].sort((a, b) => a - b);
  if (requiredDays.length === 0) return [];

  const ranges: HistoricalPriceRange[] = [];
  let rangeStart = requiredDays[0];
  let previousDay = requiredDays[0];
  let requiredDateKeys = [dateKeyFromTimestamp(requiredDays[0])];
  for (const day of requiredDays.slice(1)) {
    const gapDays = (day - previousDay) / SECONDS_PER_DAY;
    const rangeDays = (day - rangeStart) / SECONDS_PER_DAY;
    if (!(gapDays <= MAX_MERGE_GAP_DAYS && rangeDays <= MAX_HISTORY_RANGE_DAYS)) {
      ranges.push({ from: rangeStart, to: previousDay + SECONDS_PER_DAY, requiredDateKeys });
      rangeStart = day;
      requiredDateKeys = [];
    }
    previousDay = day;
    requiredDateKeys.push(dateKeyFromTimestamp(day));
  }
  ranges.push({ from: rangeStart, to: previousDay + SECONDS_PER_DAY, requiredDateKeys });
  return ranges;
}

function loadHistoricalFromMemory(request: NormalizedPriceRequest): boolean {
  return request.stablecoin || historicalPriceCache.has(historicalCacheKey(
    request.asset.assetId,
    request.dateKey,
    request.quoteCurrency,
  ));
}

function historicalRequestCoins(requests: readonly NormalizedPriceRequest[]): Record<string, number[]> {
  const timestampsByProviderKey = new Map<string, Set<number>>();
  for (const request of requests) {
    const timestamps = timestampsByProviderKey.get(request.asset.defillamaKey) ?? new Set<number>();
    timestamps.add(dailyLookupTimestamp(request.timestamp));
    timestampsByProviderKey.set(request.asset.defillamaKey, timestamps);
  }
  return Object.fromEntries(
    [...timestampsByProviderKey].map(([providerKey, timestamps]) => [
      providerKey,
      [...timestamps].sort((a, b) => a - b),
    ]),
  );
}

function historicalRequestUrl(requests: readonly NormalizedPriceRequest[]): URL {
  const url = new URL('https://coins.llama.fi/batchHistorical');
  url.searchParams.set('coins', JSON.stringify(historicalRequestCoins(requests)));
  url.searchParams.set('searchWidth', '12h');
  return url;
}

function historicalPointCount(requests: readonly NormalizedPriceRequest[]): number {
  return Object.values(historicalRequestCoins(requests)).reduce((sum, timestamps) => sum + timestamps.length, 0);
}

function historicalBatchRequests(
  requests: readonly NormalizedPriceRequest[],
): Array<{ assets: NormalizedPriceRequest[]; points: number }> {
  const batches: Array<{ assets: NormalizedPriceRequest[]; points: number }> = [];
  let current: NormalizedPriceRequest[] = [];
  let points = 0;
  for (const request of requests) {
    if (request.stablecoin) continue;
    const candidate = [...current, request];
    const candidatePoints = historicalPointCount(candidate);
    const candidateUrlLength = historicalRequestUrl(candidate).toString().length;
    if (current.length > 0 && (
      candidatePoints > DEFI_LLAMA_BATCH_POINT_LIMIT
      || candidateUrlLength > DEFI_LLAMA_HISTORICAL_URL_LIMIT
    )) {
      batches.push({ assets: current, points });
      current = [request];
      points = historicalPointCount(current);
      continue;
    }
    current = candidate;
    points = candidatePoints;
  }
  if (current.length > 0) batches.push({ assets: current, points });
  return batches;
}

async function fetchDefiLlamaHistoricalPrices(
  requests: readonly NormalizedPriceRequest[],
  signal?: AbortSignal,
): Promise<ProviderFailure[]> {
  const failures: ProviderFailure[] = [];
  const batches = historicalBatchRequests(requests.filter(request => !loadHistoricalFromMemory(request)));

  await runBounded(batches, 2, async batch => {
    throwIfAborted(signal);
    const byProviderKey = new Map<string, NormalizedPriceRequest[]>();
    for (const item of batch.assets) {
      const group = byProviderKey.get(item.asset.defillamaKey) ?? [];
      group.push(item);
      byProviderKey.set(item.asset.defillamaKey, group);
    }
    const url = historicalRequestUrl(batch.assets);
    const result = await coalesced(`defillama:historical:${url.searchParams.get('coins')}`, async () => {
      const acquired = await getDomainLimiter('coins.llama.fi', 5).acquire(2_000, signal);
      if (!acquired) {
        return {
          data: null,
          failure: providerFailure(
            'rate_limited',
            'DefiLlama historical pricing was rate-limited before the request could be sent.',
            'DefiLlama historical prices',
          ),
        };
      }
      return fetchJsonWithRetry<DefiLlamaBatchHistoricalResponse>(
        url,
        { headers: { Accept: 'application/json' } },
        'DefiLlama historical prices',
        signal,
        10_000,
      );
    });
    throwIfAborted(signal);

    const responseCoins = new Map(Object.entries(result.data?.coins ?? {}).map(([key, value]) => [key.toLowerCase(), value]));
    const writes: Promise<void>[] = [];
    for (const [providerKey, group] of byProviderKey) {
      const points = responseCoins.get(providerKey.toLowerCase())?.prices ?? [];
      for (const item of group) {
        const requestedTimestamp = dailyLookupTimestamp(item.timestamp);
        const closest = points.reduce<DefiLlamaHistoricalPoint | null>((best, point) => {
          if (typeof point.timestamp !== 'number' || !isValidPrice(point.price)) return best;
          if (!best || typeof best.timestamp !== 'number') return point;
          return Math.abs(point.timestamp - requestedTimestamp) < Math.abs(best.timestamp - requestedTimestamp)
            ? point
            : best;
        }, null);
        if (closest && typeof closest.timestamp === 'number' && isValidPrice(closest.price)
          && Math.abs(closest.timestamp - requestedTimestamp) <= SECONDS_PER_DAY) {
          if (item.dynamicContract) markResolved(item.asset);
          writes.push(cacheHistoricalRecord({
            priceUSD: closest.price,
            provenance: 'historical',
            source: 'defillama',
            timestamp: closest.timestamp,
            fetchedAt: Date.now(),
            asset: item.asset.assetId,
            quoteCurrency: item.quoteCurrency,
          }, item.dateKey, signal));
        }
      }
      if (result.failure) {
        failures.push({
          ...result.failure,
          asset: group[0]?.asset.assetId,
          chainId: group[0]?.asset.chainId,
          dates: [...new Set(group.map(item => item.dateKey))],
        });
      }
    }
    await Promise.all(writes);
  }, signal);

  return failures;
}

function parseCoinGeckoPlan(value: string | undefined): CoinGeckoPlan | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'free' || normalized === 'keyless') return 'public';
  if (normalized === 'paid') return 'pro';
  return ['public', 'demo', 'basic', 'analyst', 'lite', 'pro', 'enterprise'].includes(normalized)
    ? normalized as CoinGeckoPlan
    : null;
}

function usableApiKey(apiKey?: string): string | null {
  const value = apiKey?.trim();
  if (!value || /^yourcoingeckoapikeyhere$/i.test(value)) return null;
  return value;
}

function coinGeckoConfig(apiKey?: string): CoinGeckoConfig {
  const configuredPlan = parseCoinGeckoPlan(process.env.COINGECKO_API_PLAN);
  const key = usableApiKey(apiKey);
  const plan = configuredPlan ?? (key ? 'demo' : 'public');
  const paid = plan !== 'public' && plan !== 'demo';
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'WalletGenome/2.0',
  };
  // The setup guide calls an unlabelled key a Demo key. Explicit paid plans
  // still select the Pro endpoint and never send the key as Demo auth.
  if (key && plan === 'demo') headers['x-cg-demo-api-key'] = key;
  if (key && paid) headers['x-cg-pro-api-key'] = key;

  const maxHistoricalDays = configuredPlan === null
    ? Number.POSITIVE_INFINITY
    : plan === 'public' || plan === 'demo'
      ? 365
      : plan === 'basic'
        ? 730
        : Number.POSITIVE_INFINITY;
  return {
    plan,
    baseUrl: paid ? 'https://pro-api.coingecko.com/api/v3' : 'https://api.coingecko.com/api/v3',
    headers,
    maxHistoricalDays,
  };
}

function coingeckoHistoricalUrl(
  asset: ResolvedPriceAsset,
  range: HistoricalPriceRange,
  quoteCurrency: string,
  config: CoinGeckoConfig,
): URL | null {
  let path: string;
  if (asset.contractAddress && asset.chainId !== undefined) {
    const platform = COINGECKO_PLATFORM_IDS[asset.chainId];
    if (!platform) return null;
    path = `/coins/${platform}/contract/${asset.contractAddress}/market_chart/range`;
  } else if (asset.coingeckoId) {
    path = `/coins/${encodeURIComponent(asset.coingeckoId)}/market_chart/range`;
  } else {
    return null;
  }
  const url = new URL(`${config.baseUrl}${path}`);
  url.searchParams.set('vs_currency', quoteCurrency);
  url.searchParams.set('from', String(range.from));
  url.searchParams.set('to', String(range.to));
  return url;
}

function datesWithinCoinGeckoWindow(
  dates: readonly string[],
  maxHistoricalDays: number,
): { allowed: string[]; blocked: string[] } {
  if (!Number.isFinite(maxHistoricalDays)) return { allowed: [...dates], blocked: [] };
  const cutoff = startOfUtcDay(Math.floor(Date.now() / 1000) - maxHistoricalDays * SECONDS_PER_DAY);
  const cutoffKey = dateKeyFromTimestamp(cutoff);
  return {
    allowed: dates.filter(date => date >= cutoffKey),
    blocked: dates.filter(date => date < cutoffKey),
  };
}

async function prefetchTokenPrices(
  requestGroup: NormalizedPriceRequest,
  requests: readonly NormalizedPriceRequest[],
  apiKey: string | undefined,
  maxRanges: number,
  signal?: AbortSignal,
): Promise<ProviderFailure[]> {
  const config = coinGeckoConfig(apiKey);
  const failures: ProviderFailure[] = [];
  if (config.plan !== 'public' && config.plan !== 'demo'
    && !config.headers['x-cg-pro-api-key']) {
    failures.push(providerFailure(
      'authentication_failure',
      `CoinGecko ${config.plan} pricing requires a configured paid API key; the request was not sent.`,
      'CoinGecko historical prices',
      requestGroup.asset,
    ));
    return failures;
  }
  const missing = requests.filter(request => !loadHistoricalFromMemory(request));
  const missingDates = [...new Set(missing.map(request => request.dateKey))];
  const windowed = datesWithinCoinGeckoWindow(missingDates, config.maxHistoricalDays);
  if (windowed.blocked.length > 0) {
    failures.push(providerFailure(
      'unavailable_historical_date',
      `CoinGecko ${config.plan} access does not include the requested historical date window.`,
      'CoinGecko historical prices',
      requestGroup.asset,
      windowed.blocked,
    ));
  }
  if (windowed.allowed.length === 0) return failures;

  const allowedRequests = missing.filter(request => windowed.allowed.includes(request.dateKey));
  const ranges = buildHistoricalPriceRanges(allowedRequests.map(request => request.timestamp));
  let attemptedRanges = 0;
  let usePublicFallback = false;
  const publicHeaders: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'WalletGenome/2.0',
  };
  for (const range of ranges) {
    if (attemptedRanges >= maxRanges) break;
    attemptedRanges += 1;
    throwIfAborted(signal);
    const url = coingeckoHistoricalUrl(requestGroup.asset, range, requestGroup.quoteCurrency, config);
    if (!url) {
      failures.push(providerFailure(
        'unsupported_token',
        'CoinGecko has no configured contract platform for this asset.',
        'CoinGecko historical prices',
        requestGroup.asset,
        range.requiredDateKeys,
      ));
      continue;
    }
    const fetchRange = async (headers: Record<string, string>, authMode: 'configured' | 'public') => coalesced(
      `coingecko:historical:${authMode}:${url.toString()}`,
      async () => {
      const acquired = await getDomainLimiter(url.hostname, 4).acquire(2_000, signal);
      if (!acquired) {
        return {
          data: null,
          failure: providerFailure(
            'rate_limited',
            'CoinGecko pricing was rate-limited before the request could be sent.',
            'CoinGecko historical prices',
          ),
        };
      }
      return fetchJsonWithRetry<CoinGeckoHistoricalResponse>(
        url,
        { headers },
        'CoinGecko historical prices',
        signal,
        8_000,
      );
      },
    );
    let result = await fetchRange(usePublicFallback ? publicHeaders : config.headers, usePublicFallback ? 'public' : 'configured');
    if (result.failure?.code === 'authentication_failure'
      && config.plan === 'demo'
      && config.headers['x-cg-demo-api-key']) {
      // A stale or revoked Demo key must not disable CoinGecko's working
      // keyless endpoint. Retry this range without the rejected credential,
      // then keep using the public mode for the rest of this token request.
      usePublicFallback = true;
      result = await fetchRange(publicHeaders, 'public');
    }
    throwIfAborted(signal);
    if (result.failure) {
      failures.push({
        ...result.failure,
        asset: requestGroup.asset.assetId,
        chainId: requestGroup.asset.chainId,
        dates: range.requiredDateKeys,
      });
      continue;
    }

    const points = Array.isArray(result.data?.prices)
      ? result.data.prices.filter((point): point is [number, number] => (
        Array.isArray(point)
        && typeof point[0] === 'number'
        && isValidPrice(point[1])
      ))
      : [];
    if (points.length === 0) {
      failures.push(providerFailure(
        'unavailable_historical_date',
        'CoinGecko returned no historical price points for the requested dates.',
        'CoinGecko historical prices',
        requestGroup.asset,
        range.requiredDateKeys,
      ));
      continue;
    }

    if (requestGroup.dynamicContract) markResolved(requestGroup.asset);
    const writes: Promise<void>[] = [];
    for (const dateKey of range.requiredDateKeys) {
      const requestedTimestamp = dailyLookupTimestamp(Date.parse(`${dateKey}T00:00:00Z`) / 1000);
      const closest = points.reduce<[number, number] | null>((best, point) => {
        if (!best) return point;
        return Math.abs(point[0] / 1000 - requestedTimestamp) < Math.abs(best[0] / 1000 - requestedTimestamp)
          ? point
          : best;
      }, null);
      if (!closest || Math.abs(closest[0] / 1000 - requestedTimestamp) > SECONDS_PER_DAY) {
        failures.push(providerFailure(
          'unavailable_historical_date',
          'CoinGecko returned points outside the requested historical date.',
          'CoinGecko historical prices',
          requestGroup.asset,
          [dateKey],
        ));
        continue;
      }
      writes.push(cacheHistoricalRecord({
        priceUSD: closest[1],
        provenance: 'historical',
        source: 'coingecko',
        timestamp: Math.floor(closest[0] / 1000),
        fetchedAt: Date.now(),
        asset: requestGroup.asset.assetId,
        quoteCurrency: requestGroup.quoteCurrency,
      }, dateKey, signal));
    }
    await Promise.all(writes);
  }
  return failures;
}

function uniqueFailures(failures: readonly ProviderFailure[]): ProviderFailure[] {
  const seen = new Set<string>();
  return failures.filter(failure => {
    const key = [failure.code, failure.provider, failure.asset, failure.chainId, (failure.dates ?? []).join(',')].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function failureToAvailabilityError(failure: ProviderFailure): Omit<DataAvailabilityError, 'source'> {
  return {
    code: failure.code,
    message: failure.message,
    provider: failure.provider,
    asset: failure.asset,
    dates: failure.dates,
    chainId: failure.chainId,
  };
}

function statusForCoverage(states: readonly boolean[]): DataAvailabilityStatus {
  if (states.length === 0 || states.every(Boolean)) return 'complete';
  return states.some(Boolean) ? 'partial' : 'unavailable';
}

export interface PriceChainAvailability {
  chainId: number;
  historicalStatus: DataAvailabilityStatus;
  currentStatus: DataAvailabilityStatus;
  errors: Omit<DataAvailabilityError, 'source'>[];
}

export interface PriceAvailabilityResult {
  status: DataAvailabilityStatus;
  historicalStatus: DataAvailabilityStatus;
  currentStatus: DataAvailabilityStatus;
  errors: Omit<DataAvailabilityError, 'source'>[];
  byChain: PriceChainAvailability[];
}

function emptyPriceResult(): PriceAvailabilityResult {
  return { status: 'complete', historicalStatus: 'complete', currentStatus: 'complete', errors: [], byChain: [] };
}

function quoteFromStablecoin(asset: ResolvedPriceAsset, timestamp: number, quoteCurrency: string): PriceQuote {
  return quoteCurrency === 'usd'
    ? {
        priceUSD: 1,
        provenance: 'stablecoin_assumption',
        source: 'stablecoin_assumption',
        timestamp: dailyLookupTimestamp(timestamp),
        fetchedAt: Date.now(),
        asset: asset.assetId,
        quoteCurrency,
      }
    : { priceUSD: null, provenance: 'unpriced' };
}

function syncAssetFromReference(reference: PriceAssetReference): ResolvedPriceAsset | null {
  const assetId = canonicalPriceAssetId(reference);
  const defillamaKey = providerAssetKey(reference);
  if (!assetId || !defillamaKey) return null;
  const hasContract = isValidContractAddress(reference.contractAddress);
  const chainId = Number.isSafeInteger(reference.chainId) ? reference.chainId : undefined;
  const known = hasContract && chainId !== undefined ? getKnownTokenAsset(chainId, reference.contractAddress) : null;
  return {
    assetId,
    chainId,
    contractAddress: hasContract ? reference.contractAddress?.trim().toLowerCase() : undefined,
    coingeckoId: known?.coingeckoId ?? (hasContract ? undefined : reference.coingeckoId?.trim().toLowerCase()),
    defillamaKey,
    known: Boolean(known) || !hasContract,
  };
}

export function getCachedPriceQuote(
  assetReference: PriceAssetReference | string,
  timestamp: number,
  quoteCurrency = 'usd',
): PriceQuote {
  const reference: PriceAssetReference = typeof assetReference === 'string'
    ? { coingeckoId: assetReference }
    : assetReference;
  const normalizedCurrency = normalizeQuoteCurrency(quoteCurrency);
  const asset = syncAssetFromReference(reference);
  if (!asset || !Number.isFinite(timestamp) || timestamp <= 0) return { priceUSD: null, provenance: 'unpriced' };
  const normalized = normalizeRequest({ ...reference, timestamp, quoteCurrency: normalizedCurrency });
  if (normalized?.stablecoin) return quoteFromStablecoin(asset, timestamp, normalizedCurrency);
  if (normalized?.dynamicContract && !isResolved(normalized)) return { priceUSD: null, provenance: 'unpriced' };

  const historical = historicalPriceCache.get(historicalCacheKey(asset.assetId, dateKeyFromTimestamp(timestamp), normalizedCurrency));
  if (historical) return recordToQuote(historical);
  const current = currentPriceCache.get(currentCacheKey(asset.assetId, normalizedCurrency));
  if (current) return recordToQuote(current);
  const known = asset.contractAddress && asset.chainId !== undefined
    ? getKnownTokenAsset(asset.chainId, asset.contractAddress)
    : null;
  if (known) {
    const legacyAsset = syncAssetFromReference({ coingeckoId: known.coingeckoId });
    const legacyCurrent = legacyAsset
      ? currentPriceCache.get(currentCacheKey(legacyAsset.assetId, normalizedCurrency))
      : null;
    if (legacyCurrent) return recordToQuote(legacyCurrent);
  }
  return { priceUSD: null, provenance: 'unpriced' };
}

export function getCachedCurrentPriceQuote(
  assetReference: PriceAssetReference | string,
  quoteCurrency = 'usd',
): PriceQuote {
  const reference: PriceAssetReference = typeof assetReference === 'string'
    ? { coingeckoId: assetReference }
    : assetReference;
  const normalizedCurrency = normalizeQuoteCurrency(quoteCurrency);
  const asset = syncAssetFromReference(reference);
  if (!asset) return { priceUSD: null, provenance: 'unpriced' };
  const timestamp = Math.floor(Date.now() / 1000);
  const normalized = normalizeRequest({ ...reference, timestamp, quoteCurrency: normalizedCurrency });
  if (normalized?.stablecoin) return quoteFromStablecoin(asset, timestamp, normalizedCurrency);
  if (normalized?.dynamicContract && !isResolved(normalized)) return { priceUSD: null, provenance: 'unpriced' };
  const current = currentPriceCache.get(currentCacheKey(asset.assetId, normalizedCurrency));
  if (current) return recordToQuote(current);
  const known = asset.contractAddress && asset.chainId !== undefined
    ? getKnownTokenAsset(asset.chainId, asset.contractAddress)
    : null;
  if (known) {
    const legacyAsset = syncAssetFromReference({ coingeckoId: known.coingeckoId });
    const legacyCurrent = legacyAsset
      ? currentPriceCache.get(currentCacheKey(legacyAsset.assetId, normalizedCurrency))
      : null;
    if (legacyCurrent) return recordToQuote(legacyCurrent);
  }
  return { priceUSD: null, provenance: 'unpriced' };
}

export function isTrustedTokenContract(chainId: number, contractAddress?: string | null): boolean {
  if (!isValidContractAddress(contractAddress)) return false;
  if (getKnownTokenAsset(chainId, contractAddress) || isStablecoinContract(chainId, contractAddress)) return true;
  const asset = syncAssetFromReference({ chainId, contractAddress });
  return asset ? resolutionCache.get(resolutionCacheKey(asset))?.status === 'resolved' : false;
}

export function resolveCoingeckoId(chainId: number, contractAddress?: string | null): string | null {
  if (!isValidContractAddress(contractAddress)) return null;
  return getKnownTokenAsset(chainId, contractAddress)?.coingeckoId ?? null;
}

export async function resolvePriceAsset(
  chainId: number,
  contractAddress: string,
  options: { signal?: AbortSignal } = {},
): Promise<ResolvedPriceAsset | null> {
  const asset = syncAssetFromReference({ chainId, contractAddress });
  if (!asset) return null;
  const known = getKnownTokenAsset(chainId, contractAddress);
  if (known) return asset;
  const cached = await loadResolution(asset, options.signal);
  return cached?.status === 'resolved' ? cached.asset ?? null : null;
}

function groupByAsset(requests: readonly NormalizedPriceRequest[]): Map<string, NormalizedPriceRequest[]> {
  const grouped = new Map<string, NormalizedPriceRequest[]>();
  for (const request of requests) {
    const group = grouped.get(request.asset.assetId) ?? [];
    group.push(request);
    grouped.set(request.asset.assetId, group);
  }
  return grouped;
}

function budgetMilliseconds(options: { budgetMs?: number }): number {
  const configured = Number(process.env.PRICE_LOOKUP_BUDGET_MS);
  const candidate = options.budgetMs ?? (Number.isFinite(configured) ? configured : DEFAULT_PRICING_BUDGET_MS);
  return Math.max(500, Math.min(60_000, Math.floor(candidate)));
}

function isDeadlineCancellation(signal: AbortSignal): boolean {
  return signal.aborted
    && signal.reason instanceof RequestCancellationError
    && signal.reason.reason === 'deadline';
}

function appendBudgetFailure(
  failures: ProviderFailure[],
  requests: readonly NormalizedPriceRequest[],
): void {
  const missingDates = requests
    .filter(request => !loadHistoricalFromMemory(request))
    .map(request => request.dateKey);
  failures.push({
    code: 'pricing_budget_exhausted',
    message: 'Pricing stopped after the configured pricing time budget expired; remaining quotes are unavailable.',
    provider: 'pricing',
    dates: [...new Set(missingDates)].slice(0, 50),
  });
}

export async function batchFetchPrices(
  requests: PriceRequest[],
  apiKey?: string,
  options: { signal?: AbortSignal; budgetMs?: number } = {},
): Promise<PriceAvailabilityResult> {
  throwIfAborted(options.signal);
  const normalizedRequests = deduplicateRequests(requests);
  if (normalizedRequests.length === 0) return emptyPriceResult();

  const linked = linkAbortSignal(options.signal);
  const budgetTimeout = setTimeout(() => {
    linked.controller.abort(new RequestCancellationError('deadline'));
  }, budgetMilliseconds(options));
  const failures: ProviderFailure[] = [];
  try {
    const resolutions = normalizedRequests.filter(request => request.dynamicContract);
    await runBounded(resolutions, 8, async request => {
      await loadResolution(request.asset, linked.signal);
    }, linked.signal);
    const activeRequests = normalizedRequests.filter(request => !hasUnsupportedResolution(request));

    const currentLoads = activeRequests.filter(request => !request.stablecoin);
    await runBounded(currentLoads, 8, async request => {
      await loadCurrentRecord(request.asset, request.quoteCurrency, linked.signal);
    }, linked.signal);
    const historicalLoads = activeRequests.filter(request => !request.stablecoin);
    await runBounded(historicalLoads, 8, async request => {
      await loadHistoricalRecord(request.asset, request.dateKey, request.quoteCurrency, linked.signal);
    }, linked.signal);

    failures.push(...await fetchDefiLlamaCurrentPrices(activeRequests, linked.signal));
    failures.push(...await fetchDefiLlamaHistoricalPrices(activeRequests, linked.signal));

    const grouped = groupByAsset(activeRequests);
    const fallbackGroups = [...grouped.values()]
      .map(group => ({ group, missingCount: group.filter(request => !loadHistoricalFromMemory(request)).length }))
      .filter(item => item.missingCount > 0)
      .sort((a, b) => b.missingCount - a.missingCount)
      .slice(0, COINGECKO_FALLBACK_TOKEN_LIMIT);
    const fallbackFailures = await Promise.all(fallbackGroups.map(item => (
      prefetchTokenPrices(item.group[0], item.group, apiKey, COINGECKO_FALLBACK_RANGE_LIMIT, linked.signal)
    )));
    failures.push(...fallbackFailures.flat());
  } catch (error) {
    if (options.signal?.aborted) throwIfAborted(options.signal);
    if (!isDeadlineCancellation(linked.signal)) throw error;
    appendBudgetFailure(failures, normalizedRequests);
  } finally {
    clearTimeout(budgetTimeout);
    linked.dispose();
  }

  throwIfAborted(options.signal);

  const grouped = groupByAsset(normalizedRequests);
  const finalFailures = [...uniqueFailures(failures)];
  for (const [assetId, group] of grouped) {
    const first = group[0];
    const confirmedUnsupported = hasUnsupportedResolution(first);
    const missingDates = [...new Set(group
      .filter(request => !request.stablecoin && !loadHistoricalFromMemory(request))
      .map(request => request.dateKey))];
    for (const dateKey of missingDates) {
      const matching = finalFailures.some(failure => failure.asset === assetId
        && (!failure.dates || failure.dates.includes(dateKey)));
      if (!matching) {
        finalFailures.push(providerFailure(
          confirmedUnsupported ? 'unsupported_token' : 'unavailable_historical_date',
          confirmedUnsupported
            ? 'The token was not verified by a contract-based pricing provider and remains unpriced.'
            : 'No provider returned a price for the requested historical UTC date.',
          'DefiLlama/CoinGecko',
          first.asset,
          [dateKey],
        ));
      }
    }
    if (!group.some(request => request.stablecoin) && group.some(request => !currentPriceCache.has(
      currentCacheKey(request.asset.assetId, request.quoteCurrency),
    ))) {
      const currentFailure = finalFailures.some(failure => failure.asset === assetId && !failure.dates);
      if (!currentFailure) {
        finalFailures.push(providerFailure(
          'unpriced',
          'No current spot quote was available; current-price-dependent views remain unavailable.',
          'DefiLlama current prices',
          first.asset,
        ));
      }
    }
  }

  const historicalStates = normalizedRequests.map(request => request.stablecoin || loadHistoricalFromMemory(request));
  const currentStates = normalizedRequests
    .filter(request => !request.stablecoin)
    .map(request => currentPriceCache.has(currentCacheKey(request.asset.assetId, request.quoteCurrency)));
  const historicalStatus = statusForCoverage(historicalStates);
  const currentStatus = statusForCoverage(currentStates);
  const status = historicalStatus === 'complete' && currentStatus === 'complete'
    ? 'complete'
    : historicalStates.some(Boolean) || currentStates.some(Boolean)
      ? 'partial'
      : 'unavailable';

  const byChain = [...new Set(normalizedRequests.map(request => request.asset.chainId).filter((id): id is number => id !== undefined))]
    .map(chainId => {
      const chainRequests = normalizedRequests.filter(request => request.asset.chainId === chainId);
      return {
        chainId,
        historicalStatus: statusForCoverage(chainRequests.map(request => request.stablecoin || loadHistoricalFromMemory(request))),
        currentStatus: statusForCoverage(chainRequests.filter(request => !request.stablecoin).map(request => (
          currentPriceCache.has(currentCacheKey(request.asset.assetId, request.quoteCurrency))
        ))),
        errors: finalFailures
          .filter(failure => failure.chainId === chainId || failure.chainId === undefined)
          .map(failureToAvailabilityError),
      };
    });

  return {
    status,
    historicalStatus,
    currentStatus,
    errors: finalFailures.map(failureToAvailabilityError),
    byChain,
  };
}

export function clearPriceCachesForTests(): void {
  historicalPriceCache.clear();
  currentPriceCache.clear();
  resolutionCache.clear();
  inFlightProviderOperations.clear();
}
