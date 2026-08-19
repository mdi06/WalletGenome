import { STABLECOINS, TOKEN_COINGECKO_IDS } from './chains';
import { MemoryCache, getDomainLimiter } from './cache';

// In-memory LRU price caches with TTL to prevent memory leaks and OOM crashes
const priceCache = new MemoryCache<number>(10000, 86400); // 24h TTL
const currentPriceCache = new MemoryCache<number>(2000, 300); // 5m TTL
const loadedCharts = new MemoryCache<boolean>(1000, 3600); // 1h TTL

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

async function fetchDefiLlamaCurrentPrices(coingeckoIds: string[]): Promise<void> {
  const validIds = coingeckoIds.filter(id => id && !STABLE_IDS.has(id.toLowerCase()));
  if (validIds.length === 0) return;

  const limiter = getDomainLimiter('coins.llama.fi', 5);
  await limiter.acquire(2000);

  const coinsParam = validIds.map(id => `coingecko:${id}`).join(',');
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
        const todayKey = dateKeyFromTimestamp(Math.floor(Date.now() / 1000));
        for (const [key, coinData] of Object.entries<any>(data.coins)) {
          const id = key.replace('coingecko:', '');
          const price = coinData?.price;
          if (typeof price === 'number') {
            currentPriceCache.set(id, price);
            priceCache.set(`${id}-${todayKey}`, price);
          }
        }
      }
    }
  } catch {
    // Ignore DefiLlama timeout gracefully
  }
}

export async function prefetchTokenChart(coingeckoId: string, apiKey?: string): Promise<void> {
  if (!coingeckoId || loadedCharts.has(coingeckoId)) return;

  const lower = coingeckoId.toLowerCase();
  if (STABLE_IDS.has(lower)) {
    return;
  }

  const limiter = getDomainLimiter('api.coingecko.com', 4);
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const hasToken = await limiter.acquire(3000);
    if (!hasToken && attempt < maxRetries) {
      await new Promise(r => setTimeout(r, 200 * Math.pow(2, attempt)));
      continue;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const url = `https://api.coingecko.com/api/v3/coins/${coingeckoId}/market_chart?vs_currency=usd&days=max&interval=daily`;
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'User-Agent': 'WalletAnalytics/2.0',
      };
      if (apiKey && apiKey !== 'YourCoinGeckoApiKeyHere') {
        headers['x-cg-demo-api-key'] = apiKey;
      }

      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.status === 429 && attempt < maxRetries) {
        // Back off on rate limit and retry
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
        continue;
      }

      if (!res.ok) return;

      const data = await res.json();
      if (Array.isArray(data.prices)) {
        for (const [timeMs, price] of data.prices) {
          if (typeof price === 'number') {
            const dateKey = dateKeyFromTimestamp(Math.floor(timeMs / 1000));
            priceCache.set(`${coingeckoId}-${dateKey}`, price);
          }
        }
        // Only mark chart as loaded upon successful resolution
        loadedCharts.set(coingeckoId, true);
      }
      return;
    } catch {
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 200 * Math.pow(2, attempt)));
      }
    }
  }
}

export function getCachedPrice(coingeckoId: string, timestamp: number): number | null {
  if (!coingeckoId) return null;
  const lower = coingeckoId.toLowerCase();

  // Stablecoins are always $1
  if (STABLE_IDS.has(lower)) {
    return 1.0;
  }

  const dateKey = dateKeyFromTimestamp(timestamp);
  const cacheKey = `${coingeckoId}-${dateKey}`;

  const cachedDaily = priceCache.get(cacheKey);
  if (cachedDaily !== null) {
    return cachedDaily;
  }

  // Fallback to current spot price if known
  const cachedCurrent = currentPriceCache.get(coingeckoId);
  if (cachedCurrent !== null) {
    return cachedCurrent;
  }

  return null;
}

export async function batchFetchPrices(
  requests: Array<{ coingeckoId: string; timestamp: number }>,
  apiKey?: string
): Promise<void> {
  const uniqueTokenIds = [...new Set(requests.map(r => r.coingeckoId).filter(Boolean))];
  if (uniqueTokenIds.length === 0) return;

  // 1. Fetch current price baseline for all tokens in one fast DefiLlama request
  await fetchDefiLlamaCurrentPrices(uniqueTokenIds);

  // 2. Fetch full historical daily charts in concurrency batches of 4
  const BATCH_SIZE = 4;
  for (let i = 0; i < uniqueTokenIds.length; i += BATCH_SIZE) {
    const slice = uniqueTokenIds.slice(i, i + BATCH_SIZE);
    await Promise.all(slice.map(tokenId => prefetchTokenChart(tokenId, apiKey)));
  }
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
