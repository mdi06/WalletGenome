import { STABLECOINS, TOKEN_COINGECKO_IDS } from './chains';

// In-memory price cache: key = "tokenId-YYYY-MM-DD", value = USD price
const priceCache = new Map<string, number>();
const loadedCharts = new Set<string>();

function dateKeyFromTimestamp(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export async function prefetchTokenChart(coingeckoId: string, apiKey?: string): Promise<void> {
  if (!coingeckoId || loadedCharts.has(coingeckoId)) return;
  loadedCharts.add(coingeckoId);

  // Stablecoins are always $1
  if (['tether', 'usd-coin', 'dai', 'true-usd', 'frax', 'usdt', 'usdc'].includes(coingeckoId.toLowerCase())) {
    return;
  }

  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coingeckoId}/market_chart?vs_currency=usd&days=max&interval=daily`;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'WalletAnalytics/1.0',
    };
    if (apiKey && apiKey !== 'YourCoinGeckoApiKeyHere') {
      headers['x-cg-demo-api-key'] = apiKey;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) return;

    const data = await res.json();
    if (Array.isArray(data.prices)) {
      for (const [timeMs, price] of data.prices) {
        if (typeof price === 'number') {
          const dateKey = dateKeyFromTimestamp(Math.floor(timeMs / 1000));
          priceCache.set(`${coingeckoId}-${dateKey}`, price);
        }
      }
    }
  } catch (err) {
    console.warn(`Could not prefetch chart for ${coingeckoId}:`, err);
  }
}

export function getCachedPrice(coingeckoId: string, timestamp: number): number | null {
  if (!coingeckoId) return null;
  const lower = coingeckoId.toLowerCase();

  // Stablecoins are always $1
  if (['tether', 'usd-coin', 'dai', 'true-usd', 'frax', 'usdt', 'usdc'].includes(lower)) {
    return 1.0;
  }

  const dateKey = dateKeyFromTimestamp(timestamp);
  const cacheKey = `${coingeckoId}-${dateKey}`;

  if (priceCache.has(cacheKey)) {
    return priceCache.get(cacheKey)!;
  }

  // Fallback to nearest day
  const prefix = `${coingeckoId}-`;
  for (const [key, price] of priceCache) {
    if (key.startsWith(prefix)) {
      return price;
    }
  }

  // Fallback for ETH
  if (coingeckoId === 'ethereum') {
    return 2800;
  }

  return null;
}

export async function batchFetchPrices(
  requests: Array<{ coingeckoId: string; timestamp: number }>,
  apiKey?: string
): Promise<void> {
  const uniqueTokenIds = [...new Set(requests.map(r => r.coingeckoId).filter(Boolean))];

  await Promise.all(
    uniqueTokenIds.slice(0, 5).map(tokenId => prefetchTokenChart(tokenId, apiKey))
  );
}

export function resolveCoingeckoId(
  contractAddress?: string | null,
  tokenSymbol?: string | null
): string | null {
  if (contractAddress && typeof contractAddress === 'string') {
    const lower = contractAddress.toLowerCase();
    if (STABLECOINS[lower]) {
      return STABLECOINS[lower].coingeckoId;
    }
  }

  if (tokenSymbol && typeof tokenSymbol === 'string') {
    const symbolUpper = tokenSymbol.toUpperCase();
    if (TOKEN_COINGECKO_IDS[symbolUpper]) {
      return TOKEN_COINGECKO_IDS[symbolUpper];
    }
  }

  return null;
}
