import {
  EtherscanTransaction,
  EtherscanTokenTransfer,
  EtherscanInternalTransaction,
} from './types';
import { isCEXAddress, getAddressLabel } from './labels';
import { getDomainLimiter } from './cache';

// Direct Explorer API base endpoints
const CHAIN_API_ENDPOINTS: Record<number, string> = {
  1: 'https://api.etherscan.io/api',
  8453: 'https://api.basescan.org/api',
  42161: 'https://api.arbiscan.io/api',
  56: 'https://api.bscscan.com/api',
  10: 'https://api-optimistic.etherscan.io/api',
  137: 'https://api.polygonscan.com/api',
};

// Open Blockscout REST endpoints
const BLOCKSCOUT_APIS: Record<number, string> = {
  1: 'https://eth.blockscout.com/api',
  8453: 'https://base.blockscout.com/api',
  42161: 'https://arbitrum.blockscout.com/api',
  10: 'https://optimism.blockscout.com/api',
  137: 'https://polygon.blockscout.com/api',
};

/**
 * Resolves the appropriate API key for a given chain from environment variables or custom key.
 */
export function getApiKeyForChain(chainId: number, customApiKey?: string): string | undefined {
  if (customApiKey && customApiKey !== 'YourEtherscanApiKeyHere') {
    return customApiKey;
  }
  switch (chainId) {
    case 1:
      return process.env.ETHERSCAN_API_KEY;
    case 8453:
      return process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY;
    case 42161:
      return process.env.ARBISCAN_API_KEY || process.env.ETHERSCAN_API_KEY;
    case 56:
      return process.env.BSCSCAN_API_KEY || process.env.ETHERSCAN_API_KEY;
    case 10:
      return process.env.OPTIMISM_API_KEY || process.env.OPTIMISTIC_ETHERSCAN_API_KEY || process.env.ETHERSCAN_API_KEY;
    case 137:
      return process.env.POLYGONSCAN_API_KEY || process.env.ETHERSCAN_API_KEY;
    default:
      return process.env.ETHERSCAN_API_KEY;
  }
}

function isRateLimitResponse(data: any): boolean {
  if (!data) return false;
  const msg = (typeof data.message === 'string' ? data.message : '').toLowerCase();
  const res = (typeof data.result === 'string' ? data.result : '').toLowerCase();
  const combined = `${msg} ${res}`;
  return (
    combined.includes('rate limit') ||
    combined.includes('max rate') ||
    combined.includes('throttle') ||
    combined.includes('busy') ||
    combined.includes('too many request')
  );
}

function isEmptyResult(data: any): boolean {
  if (!data) return false;
  if (Array.isArray(data.result) && data.result.length === 0) return true;
  const msg = (typeof data.message === 'string' ? data.message : '').toLowerCase();
  const res = (typeof data.result === 'string' ? data.result : '').toLowerCase();
  return (
    msg.includes('no transaction') ||
    msg.includes('no token') ||
    msg.includes('no internal') ||
    res.includes('no transaction') ||
    res.includes('no token')
  );
}

async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WalletGenome/2.0)' },
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildCandidateUrls(
  address: string,
  chainId: number,
  action: string,
  apiKey?: string,
  extraParams: string = ''
): string[] {
  const resolvedKey = getApiKeyForChain(chainId, apiKey);
  const urls: string[] = [];

  // 1. Direct dedicated Explorer API (if key or public)
  const chainApiBase = CHAIN_API_ENDPOINTS[chainId];
  if (chainApiBase) {
    const keyParam = resolvedKey && resolvedKey !== 'YourEtherscanApiKeyHere' ? `&apikey=${resolvedKey}` : '';
    urls.push(`${chainApiBase}?module=account&action=${action}&address=${address}&sort=desc${keyParam}${extraParams}`);
  }

  // 2. Unified Etherscan v2 API
  if (resolvedKey && resolvedKey !== 'YourEtherscanApiKeyHere') {
    urls.push(`https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=${action}&address=${address}&sort=desc&apikey=${resolvedKey}${extraParams}`);
  }

  // 3. Blockscout open API (high-quality fallback)
  const blockscoutBase = BLOCKSCOUT_APIS[chainId];
  if (blockscoutBase) {
    urls.push(`${blockscoutBase}?module=account&action=${action}&address=${address}&sort=desc${extraParams}`);
  }

  return urls;
}

async function fetchExplorerData<T>(urls: string[]): Promise<T[]> {
  for (const url of urls) {
    let hostname = 'api.etherscan.io';
    try {
      hostname = new URL(url).hostname;
    } catch {}

    const limiter = getDomainLimiter(hostname, 4);

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        // Respect rate limiter before triggering fetch
        await limiter.acquire(3000);

        const res = await fetchWithTimeout(url, 4500);
        if (!res.ok) {
          if (attempt < 2) {
            const backoff = (attempt + 1) * 300 + Math.floor(Math.random() * 150);
            await new Promise(r => setTimeout(r, backoff));
            continue;
          }
          break; // move to next URL
        }

        const data = await res.json().catch(() => null);
        if (!data) break;

        // Successful result array
        if (data.status === '1' && Array.isArray(data.result)) {
          return data.result as T[];
        }

        // Legitimate empty result
        if (data.status === '0' && isEmptyResult(data)) {
          return [];
        }

        // Rate-limited response (200 OK NOTOK / Rate Limit reached)
        if (isRateLimitResponse(data)) {
          if (attempt < 2) {
            const backoff = (attempt + 1) * 500 + Math.floor(Math.random() * 200);
            await new Promise(r => setTimeout(r, backoff));
            continue;
          }
          break; // try next candidate URL
        }

        // Other status 0 (e.g. invalid query or temporary error)
        if (data.status === '0') {
          break;
        }
      } catch {
        if (attempt < 2) {
          const backoff = (attempt + 1) * 200 + Math.floor(Math.random() * 100);
          await new Promise(r => setTimeout(r, backoff));
        }
      }
    }
  }

  return [];
}

export async function fetchNormalTransactions(
  address: string,
  chainId: number,
  apiKey?: string,
  offset = 1000
): Promise<EtherscanTransaction[]> {
  const urls = buildCandidateUrls(address, chainId, 'txlist', apiKey, `&offset=${offset}&page=1`);
  return await fetchExplorerData<EtherscanTransaction>(urls);
}

export async function fetchTokenTransfers(
  address: string,
  chainId: number,
  apiKey?: string,
  offset = 1000
): Promise<EtherscanTokenTransfer[]> {
  const urls = buildCandidateUrls(address, chainId, 'tokentx', apiKey, `&offset=${offset}&page=1`);
  return await fetchExplorerData<EtherscanTokenTransfer>(urls);
}

export async function fetchInternalTransactions(
  address: string,
  chainId: number,
  apiKey?: string,
  offset = 500
): Promise<EtherscanInternalTransaction[]> {
  const urls = buildCandidateUrls(address, chainId, 'txlistinternal', apiKey, `&offset=${offset}&page=1`);
  return await fetchExplorerData<EtherscanInternalTransaction>(urls);
}

/**
 * Fast On-Chain Sweeper Check (with 1.5s hard timeout)
 */
export async function checkRecipientSweptToCEX(
  recipientAddress: string,
  chainId: number
): Promise<string | null> {
  if (!recipientAddress || !/^0x[a-fA-F0-9]{40}$/i.test(recipientAddress)) {
    return null;
  }

  const lower = recipientAddress.toLowerCase();

  if (isCEXAddress(lower)) {
    return getAddressLabel(lower) || 'CEX';
  }

  const endpoint = BLOCKSCOUT_APIS[chainId];
  if (!endpoint) return null;

  try {
    const res = await fetchWithTimeout(`${endpoint}?module=account&action=tokentx&address=${lower}&offset=3&page=1`, 1500);
    if (res.ok) {
      const data = await res.json();
      if (data.status === '1' && Array.isArray(data.result)) {
        for (const tx of data.result) {
          if ((tx.from || '').toLowerCase() === lower) {
            const toAddr = (tx.to || '').toLowerCase();
            if (isCEXAddress(toAddr)) {
              const label = getAddressLabel(toAddr);
              return label ? `${label.split(' ')[0]} Deposit Address` : 'CEX Deposit Address';
            }
          }
        }
      }
    }
  } catch {
    // Ignore timeout
  }

  return null;
}
