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
  // LINK
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

  return null;
}
