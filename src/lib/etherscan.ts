import {
  EtherscanTransaction,
  EtherscanTokenTransfer,
  EtherscanInternalTransaction,
} from './types';
import { getChainConfig } from './chains';
import { isCEXAddress, getAddressLabel } from './labels';

// Open Blockscout REST endpoints
const BLOCKSCOUT_APIS: Record<number, string> = {
  1: 'https://eth.blockscout.com/api',
  8453: 'https://base.blockscout.com/api',
  42161: 'https://arbitrum.blockscout.com/api',
  10: 'https://optimism.blockscout.com/api',
  137: 'https://polygon.blockscout.com/api',
};

async function fetchWithRetry(url: string, retries = 2, delayMs = 300): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, {
        headers: { 'User-Agent': 'WalletForensics/1.0' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return fetch(url);
}

function buildUrls(address: string, chainId: number, action: string, apiKey?: string, extraParams: string = ''): string[] {
  const urls: string[] = [];

  const blockscoutBase = BLOCKSCOUT_APIS[chainId];
  if (blockscoutBase) {
    urls.push(`${blockscoutBase}?module=account&action=${action}&address=${address}&sort=desc${extraParams}`);
  }

  if (apiKey && apiKey !== 'YourEtherscanApiKeyHere') {
    urls.push(`https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=${action}&address=${address}&sort=desc&apikey=${apiKey}${extraParams}`);
  }

  const chain = getChainConfig(chainId);
  if (chain.explorerUrl.includes('etherscan.io') || chain.explorerUrl.includes('basescan.org') || chain.explorerUrl.includes('arbiscan.io') || chain.explorerUrl.includes('bscscan.com')) {
    const keyParam = (apiKey && apiKey !== 'YourEtherscanApiKeyHere') ? `&apikey=${apiKey}` : '';
    urls.push(`${chain.explorerUrl}/api?module=account&action=${action}&address=${address}&sort=desc${keyParam}${extraParams}`);
  }

  return urls;
}

export async function fetchNormalTransactions(
  address: string,
  chainId: number,
  apiKey?: string,
  offset = 10000
): Promise<EtherscanTransaction[]> {
  const urls = buildUrls(address, chainId, 'txlist', apiKey, `&offset=${offset}&page=1`);

  for (const url of urls) {
    try {
      const res = await fetchWithRetry(url, 2, 200);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status === '1' && Array.isArray(data.result)) {
        return data.result as EtherscanTransaction[];
      }
      if (data.status === '0' && (data.message === 'No transactions found' || data.result?.length === 0)) {
        return [];
      }
    } catch {
      continue;
    }
  }

  return [];
}

export async function fetchTokenTransfers(
  address: string,
  chainId: number,
  apiKey?: string,
  offset = 10000
): Promise<EtherscanTokenTransfer[]> {
  const urls = buildUrls(address, chainId, 'tokentx', apiKey, `&offset=${offset}&page=1`);

  for (const url of urls) {
    try {
      const res = await fetchWithRetry(url, 2, 200);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status === '1' && Array.isArray(data.result)) {
        return data.result as EtherscanTokenTransfer[];
      }
      if (data.status === '0' && (data.message === 'No token transfers found' || data.message === 'No transactions found' || data.result?.length === 0)) {
        return [];
      }
    } catch {
      continue;
    }
  }

  return [];
}

export async function fetchInternalTransactions(
  address: string,
  chainId: number,
  apiKey?: string,
  offset = 5000
): Promise<EtherscanInternalTransaction[]> {
  const urls = buildUrls(address, chainId, 'txlistinternal', apiKey, `&offset=${offset}&page=1`);

  for (const url of urls) {
    try {
      const res = await fetchWithRetry(url, 2, 200);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status === '1' && Array.isArray(data.result)) {
        return data.result as EtherscanInternalTransaction[];
      }
    } catch {
      continue;
    }
  }

  return [];
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`${endpoint}?module=account&action=tokentx&address=${lower}&offset=3&page=1`, {
      headers: { 'User-Agent': 'WalletForensics/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

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
