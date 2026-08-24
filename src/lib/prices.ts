import { STABLECOINS, TOKEN_COINGECKO_IDS } from './chains';
import { MemoryCache, getDomainLimiter } from './cache';
import { DataAvailabilityStatus, DataAvailabilityError, PriceQuote } from './types';

// In-memory LRU price caches with TTL to prevent memory leaks and OOM crashes
const priceCache = new MemoryCache<number>(10000, 86400); // 24h TTL
const currentPriceCache = new MemoryCache<number>(2000, 300); // 5m TTL

const SECONDS_PER_DAY = 86_400;
const MAX_HISTORY_RANGE_DAYS = 366;
const MAX_MERGE_GAP_DAYS = 31;
const DEFI_LLAMA_BATCH_POINT_LIMIT = 250;
const COINGECKO_FALLBACK_TOKEN_LIMIT = 2;
const COINGECKO_FALLBACK_RANGE_LIMIT = 2;

const STABLE_IDS = new Set([
  'tether',
  'usd-coin',
  'dai',
  'true-usd',
  'frax',
  'usdt',
  'usdc',
  'busd',
  'binance-usd',
  'usde',
  'ethena-usde',
  'pyusd',
  'fdusd',
  'crvusd',
]);

function dateKeyFromTimestamp(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

interface HistoricalPriceRange {
  from: number;
  to: number;
  requiredDateKeys: string[];
}

interface DefiLlamaHistoricalPoint {
  timestamp?: number;
  price?: number;
}

interface DefiLlamaBatchHistoricalResponse {
  coins?: Record<string, { prices?: DefiLlamaHistoricalPoint[] }>;
}

function startOfUtcDay(timestamp: number): number {
  return Math.floor(timestamp / SECONDS_PER_DAY) * SECONDS_PER_DAY;
}

function dailyLookupTimestamp(timestamp: number): number {
  return startOfUtcDay(timestamp) + (SECONDS_PER_DAY / 2);
}

function hasHistoricalPrice(coingeckoId: string, timestamp: number): boolean {
  return STABLE_IDS.has(coingeckoId.toLowerCase())
    || priceCache.has(`${coingeckoId}-${dateKeyFromTimestamp(timestamp)}`);
}

function buildDefiLlamaHistoricalBatches(
  requestsByToken: Map<string, number[]>,
): Array<Record<string, number[]>> {
  const batches: Array<Record<string, number[]>> = [];
  let batch: Record<string, number[]> = {};
  let batchPointCount = 0;

  for (const [tokenId, timestamps] of requestsByToken) {
    if (STABLE_IDS.has(tokenId.toLowerCase())) continue;
    const dailyTimestamps = [...new Set(
      timestamps
        .filter(timestamp => Number.isFinite(timestamp) && timestamp > 0)
        .filter(timestamp => !hasHistoricalPrice(tokenId, timestamp))
        .map(dailyLookupTimestamp),
    )].sort((a, b) => a - b);

    let offset = 0;
    while (offset < dailyTimestamps.length) {
      const availablePoints = DEFI_LLAMA_BATCH_POINT_LIMIT - batchPointCount;
      const slice = dailyTimestamps.slice(offset, offset + availablePoints);
      batch[`coingecko:${tokenId}`] = slice;
      batchPointCount += slice.length;
      offset += slice.length;

      if (batchPointCount >= DEFI_LLAMA_BATCH_POINT_LIMIT) {
        batches.push(batch);
        batch = {};
        batchPointCount = 0;
      }
    }
  }

  if (batchPointCount > 0) batches.push(batch);
  return batches;
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
    const belongsToCurrentRange = gapDays <= MAX_MERGE_GAP_DAYS
      && rangeDays <= MAX_HISTORY_RANGE_DAYS;

    if (!belongsToCurrentRange) {
      ranges.push({
        from: rangeStart,
        to: previousDay + SECONDS_PER_DAY,
        requiredDateKeys,
      });
      rangeStart = day;
      requiredDateKeys = [];
    }

    previousDay = day;
    requiredDateKeys.push(dateKeyFromTimestamp(day));
  }

  ranges.push({
    from: rangeStart,
    to: previousDay + SECONDS_PER_DAY,
    requiredDateKeys,
  });
  return ranges;
}

async function fetchDefiLlamaCurrentPrices(coingeckoIds: string[]): Promise<boolean> {
  const validIds = coingeckoIds.filter(id => id && !STABLE_IDS.has(id.toLowerCase()));
  if (validIds.length === 0) return true;

  const unresolvedIds = validIds.filter(id => !currentPriceCache.has(id));
  if (unresolvedIds.length === 0) return true;

  const limiter = getDomainLimiter('coins.llama.fi', 5);
  const hasToken = await limiter.acquire(2000);
  if (!hasToken) return false;

  const coinsParam = unresolvedIds.map(id => `coingecko:${id}`).join(',');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://coins.llama.fi/prices/current/${coinsParam}`, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data?.coins) {
        for (const [key, coinData] of Object.entries<Record<string, unknown>>(data.coins)) {
          const id = key.replace('coingecko:', '');
          const price = coinData?.price;
          if (typeof price === 'number') {
            currentPriceCache.set(id, price);
          }
        }
      }
    }
  } catch {
    // Ignore DefiLlama timeout gracefully
  }

  return validIds.every(id => currentPriceCache.has(id));
}

async function fetchDefiLlamaHistoricalPrices(
  requestsByToken: Map<string, number[]>,
): Promise<void> {
  const batches = buildDefiLlamaHistoricalBatches(requestsByToken);
  if (batches.length === 0) return;

  const limiter = getDomainLimiter('coins.llama.fi', 5);
  for (const batch of batches) {
    const hasToken = await limiter.acquire(3000);
    if (!hasToken) continue;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    try {
      const url = new URL('https://coins.llama.fi/batchHistorical');
      url.searchParams.set('coins', JSON.stringify(batch));
      url.searchParams.set('searchWidth', '12h');
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });
      if (!res.ok) continue;

      const data = await res.json() as DefiLlamaBatchHistoricalResponse;
      for (const [coinKey, coinData] of Object.entries(data.coins ?? {})) {
        const tokenId = coinKey.replace(/^coingecko:/, '');
        const requestedTimestamps = batch[coinKey] ?? [];
        for (const point of coinData.prices ?? []) {
          if (typeof point.timestamp !== 'number' || typeof point.price !== 'number') continue;
          const pointTimestamp = point.timestamp;
          const pointPrice = point.price;
          const requestedTimestamp = requestedTimestamps.reduce<number | null>((closest, candidate) => {
            if (closest === null) return candidate;
            return Math.abs(candidate - pointTimestamp) < Math.abs(closest - pointTimestamp)
              ? candidate
              : closest;
          }, null);
          if (requestedTimestamp === null || Math.abs(requestedTimestamp - pointTimestamp) > SECONDS_PER_DAY) {
            continue;
          }
          priceCache.set(`${tokenId}-${dateKeyFromTimestamp(requestedTimestamp)}`, pointPrice);
        }
      }
    } catch {
      // CoinGecko receives a small, bounded fallback opportunity below.
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

async function prefetchTokenPrices(
  coingeckoId: string,
  timestamps: number[],
  apiKey?: string,
  maxRanges = Number.POSITIVE_INFINITY,
): Promise<boolean> {
  if (!coingeckoId) return false;
  const lower = coingeckoId.toLowerCase();
  if (STABLE_IDS.has(lower)) {
    return true;
  }

  const missingTimestamps = timestamps.filter(timestamp => (
    !priceCache.has(`${coingeckoId}-${dateKeyFromTimestamp(timestamp)}`)
  ));
  const ranges = buildHistoricalPriceRanges(missingTimestamps);
  if (ranges.length === 0) return true;

  const limiter = getDomainLimiter('api.coingecko.com', 4);
  const maxRetries = 2;

  for (const range of ranges.slice(0, maxRanges)) {
    let rangeLoaded = false;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const hasToken = await limiter.acquire(5000);
      if (!hasToken) {
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 200 * Math.pow(2, attempt)));
        }
        continue;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      try {
        const url = new URL(
          `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coingeckoId)}/market_chart/range`,
        );
        url.searchParams.set('vs_currency', 'usd');
        url.searchParams.set('from', String(range.from));
        url.searchParams.set('to', String(range.to));

        const headers: Record<string, string> = {
          'Accept': 'application/json',
          'User-Agent': 'WalletAnalytics/2.0',
        };
        if (apiKey && apiKey !== 'YourCoinGeckoApiKeyHere') {
          headers['x-cg-demo-api-key'] = apiKey;
        }

        const res = await fetch(url, { headers, signal: controller.signal });
        if (res.status === 429 && attempt < maxRetries) {
          const retryAfterSeconds = Number(res.headers.get('retry-after'));
          const retryDelayMs = Number.isFinite(retryAfterSeconds)
            ? Math.min(retryAfterSeconds * 1000, 5000)
            : 500 * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, retryDelayMs));
          continue;
        }

        if (!res.ok) break;

        const data = await res.json();
        if (Array.isArray(data.prices) && data.prices.length > 0) {
          for (const [timeMs, price] of data.prices) {
            if (typeof timeMs === 'number' && typeof price === 'number') {
              const dateKey = dateKeyFromTimestamp(Math.floor(timeMs / 1000));
              priceCache.set(`${coingeckoId}-${dateKey}`, price);
            }
          }
          rangeLoaded = range.requiredDateKeys.every(dateKey => (
            priceCache.has(`${coingeckoId}-${dateKey}`)
          ));
          if (rangeLoaded) break;
        }
      } catch {
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 200 * Math.pow(2, attempt)));
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }

    if (!rangeLoaded) return false;
  }

  return ranges.length <= maxRanges;
}

export function getCachedPriceQuote(coingeckoId: string, timestamp: number): PriceQuote {
  if (!coingeckoId) return { priceUSD: null, provenance: 'unpriced' };
  const lower = coingeckoId.toLowerCase();

  // Stablecoins are always $1
  if (STABLE_IDS.has(lower)) {
    return { priceUSD: 1, provenance: 'stablecoin_assumption' };
  }

  const dateKey = dateKeyFromTimestamp(timestamp);
  const cacheKey = `${coingeckoId}-${dateKey}`;

  const cachedDaily = priceCache.get(cacheKey);
  if (cachedDaily !== null) {
    return { priceUSD: cachedDaily, provenance: 'historical' };
  }

  // Fallback to current spot price if known
  const cachedCurrent = currentPriceCache.get(coingeckoId);
  if (cachedCurrent !== null) {
    return { priceUSD: cachedCurrent, provenance: 'spot_estimate' };
  }

  return { priceUSD: null, provenance: 'unpriced' };
}

/**
 * Returns a current market quote without consulting the historical daily cache.
 * `spot_estimate` remains the canonical provenance label for a provider spot
 * quote; callers decide whether spot is an estimate or the correct time basis
 * for the metric they are calculating.
 */
export function getCachedCurrentPriceQuote(coingeckoId: string): PriceQuote {
  if (!coingeckoId) return { priceUSD: null, provenance: 'unpriced' };
  const lower = coingeckoId.toLowerCase();

  if (STABLE_IDS.has(lower)) {
    return { priceUSD: 1, provenance: 'stablecoin_assumption' };
  }

  const cachedCurrent = currentPriceCache.get(coingeckoId);
  return cachedCurrent === null
    ? { priceUSD: null, provenance: 'unpriced' }
    : { priceUSD: cachedCurrent, provenance: 'spot_estimate' };
}

export interface PriceAvailabilityResult {
  status: DataAvailabilityStatus;
  errors: Omit<DataAvailabilityError, 'source'>[];
}

export async function batchFetchPrices(
  requests: Array<{ coingeckoId: string; timestamp: number }>,
  apiKey?: string
): Promise<PriceAvailabilityResult> {
  const requestsByToken = new Map<string, number[]>();
  for (const request of requests) {
    if (!request.coingeckoId) continue;
    const timestamps = requestsByToken.get(request.coingeckoId) ?? [];
    timestamps.push(request.timestamp);
    requestsByToken.set(request.coingeckoId, timestamps);
  }
  const uniqueTokenIds = [...requestsByToken.keys()];
  if (uniqueTokenIds.length === 0) return { status: 'complete', errors: [] };

  // 1. Fetch current price baseline for all tokens in one fast DefiLlama request
  const currentPricesComplete = await fetchDefiLlamaCurrentPrices(uniqueTokenIds);

  // 2. Resolve all required asset-days through DefiLlama's batch endpoint.
  await fetchDefiLlamaHistoricalPrices(requestsByToken);

  // 3. Give only the highest-impact unresolved tokens a small CoinGecko range
  // fallback. This keeps a free-tier provider failure from dominating scan time.
  const fallbackTokenIds = uniqueTokenIds
    .map(tokenId => ({
      tokenId,
      missingCount: (requestsByToken.get(tokenId) ?? []).filter(timestamp => (
        !hasHistoricalPrice(tokenId, timestamp)
      )).length,
    }))
    .filter(item => item.missingCount > 0)
    .sort((a, b) => b.missingCount - a.missingCount)
    .slice(0, COINGECKO_FALLBACK_TOKEN_LIMIT)
    .map(item => item.tokenId);

  await Promise.all(fallbackTokenIds.map(tokenId => (
    prefetchTokenPrices(
      tokenId,
      requestsByToken.get(tokenId) ?? [],
      apiKey,
      COINGECKO_FALLBACK_RANGE_LIMIT,
    )
  )));

  const requestedHistoricalStates = [...requestsByToken.entries()].flatMap(([tokenId, timestamps]) => (
    [...new Set(timestamps.map(dateKeyFromTimestamp))].map(dateKey => (
      STABLE_IDS.has(tokenId.toLowerCase()) || priceCache.has(`${tokenId}-${dateKey}`)
    ))
  ));
  const historicalPricesComplete = requestedHistoricalStates.every(Boolean);
  const anyHistoricalPriceAvailable = requestedHistoricalStates.some(Boolean);
  const anyPriceDataAvailable = currentPricesComplete || anyHistoricalPriceAvailable;
  const status: DataAvailabilityStatus = currentPricesComplete && historicalPricesComplete
    ? 'complete'
    : anyPriceDataAvailable
      ? 'partial'
      : 'unavailable';

  const errors: PriceAvailabilityResult['errors'] = [];
  if (!currentPricesComplete) {
    errors.push({ code: 'provider_error', message: 'Current token prices are incomplete.' });
  }
  if (!historicalPricesComplete) {
    errors.push({ code: 'provider_error', message: 'Historical token prices are incomplete.' });
  }

  return { status, errors };
}

// Known verified token contract addresses to prevent fake token spoofing
const VERIFIED_TOKEN_ADDRESSES: Record<string, string> = {
  // WETH
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'ethereum',
  '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': 'ethereum',
  '0x4200000000000000000000000000000000000006': 'ethereum',
  // WBTC
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'wrapped-bitcoin',
  '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f': 'wrapped-bitcoin',
  // UNI
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 'uniswap',
  '0x514910771af9ca656af840dff83e8264ecf986ca': 'chainlink',
  // AAVE
  '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': 'aave',
  // ARB
  '0x912ce59144191c1204e64559fe8253a0e49e6548': 'arbitrum',
  // OP
  '0x4200000000000000000000000000000000000042': 'optimism',
};

export function resolveCoingeckoId(
  contractAddress?: string | null,
  tokenSymbol?: string | null
): string | null {
  if (contractAddress && typeof contractAddress === 'string') {
    const lower = contractAddress.toLowerCase();
    if (STABLECOINS[lower]) {
      return STABLECOINS[lower].coingeckoId;
    }
    if (VERIFIED_TOKEN_ADDRESSES[lower]) {
      return VERIFIED_TOKEN_ADDRESSES[lower];
    }
  }

  if (tokenSymbol && typeof tokenSymbol === 'string') {
    const sym = tokenSymbol.toUpperCase().trim();
    if (TOKEN_COINGECKO_IDS[sym]) {
      return TOKEN_COINGECKO_IDS[sym];
    }
  }

  return null;
}
