import { getDomainLimiter } from './cache';
import { linkAbortSignal, throwIfAborted } from './cancellation';

const DEFAULT_RPC_ENDPOINTS: Record<number, readonly string[]> = {
  1: [
    'https://cloudflare-eth.com',
    'https://ethereum-rpc.publicnode.com',
  ],
  8453: [
    'https://mainnet.base.org',
  ],
  42161: [
    'https://arb1.arbitrum.io/rpc',
  ],
  10: [
    'https://mainnet.optimism.io',
  ],
};

interface RpcHeadOptions {
  fetcher?: typeof fetch;
  timeoutMs?: number;
  endpoints?: readonly string[];
  signal?: AbortSignal;
}

interface JsonRpcResponse {
  result?: unknown;
  error?: { message?: string };
}

const cachedHeads = new Map<number, { blockNumber: number; expiresAt: number }>();
const inFlightHeads = new Map<number, Promise<number | null>>();
const HEAD_CACHE_TTL_MS = 15_000;

function configuredRpcEndpoints(chainId: number): string[] {
  const custom = process.env[`RPC_FALLBACK_URLS_${chainId}`]
    ?.split(',')
    .map(value => value.trim())
    .filter(Boolean) ?? [];
  return [...(DEFAULT_RPC_ENDPOINTS[chainId] ?? []), ...custom];
}

async function postRpc(
  endpoint: string,
  method: 'eth_chainId' | 'eth_blockNumber',
  fetcher: typeof fetch,
  timeoutMs: number,
  parentSignal?: AbortSignal,
): Promise<string> {
  throwIfAborted(parentSignal);
  const linked = linkAbortSignal(parentSignal);
  const timeout = setTimeout(() => linked.controller.abort(), timeoutMs);
  try {
    const response = await fetcher(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: [] }),
      signal: linked.signal,
    });
    if (!response.ok) throw new Error(`RPC returned HTTP ${response.status}`);
    const payload = await response.json() as JsonRpcResponse;
    throwIfAborted(parentSignal);
    if (payload.error || typeof payload.result !== 'string') {
      throw new Error(payload.error?.message || 'RPC returned an invalid response');
    }
    return payload.result;
  } finally {
    clearTimeout(timeout);
    linked.dispose();
  }
}

function parseHexQuantity(value: string): number {
  if (!/^0x[0-9a-f]+$/i.test(value)) throw new Error('RPC returned an invalid hex quantity');
  const parsed = Number.parseInt(value.slice(2), 16);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error('RPC quantity is outside the safe integer range');
  return parsed;
}

/**
 * Returns a validated chain head using official RPCs before configured mirrors.
 * RPCs provide canonical chain state, not address-indexed transaction history.
 */
export async function getLatestBlockNumber(
  chainId: number,
  options: RpcHeadOptions = {},
): Promise<number | null> {
  if (!options.endpoints) {
    const cached = cachedHeads.get(chainId);
    if (cached && cached.expiresAt > Date.now()) return cached.blockNumber;
    if (!options.signal) {
      const inFlight = inFlightHeads.get(chainId);
      if (inFlight) return inFlight;
    }
  }

  const request = resolveLatestBlockNumber(chainId, options);
  if (!options.endpoints && !options.signal) inFlightHeads.set(chainId, request);
  try {
    return await request;
  } finally {
    if (!options.endpoints && !options.signal) inFlightHeads.delete(chainId);
  }
}

async function resolveLatestBlockNumber(
  chainId: number,
  options: RpcHeadOptions,
): Promise<number | null> {
  throwIfAborted(options.signal);

  const endpoints = options.endpoints ? [...options.endpoints] : configuredRpcEndpoints(chainId);
  if (endpoints.length === 0) return null;

  const fetcher = options.fetcher ?? fetch;
  const timeoutMs = options.timeoutMs ?? 4_000;

  for (const endpoint of endpoints) {
    try {
      const hostname = new URL(endpoint).hostname;
      const limiter = getDomainLimiter(hostname, 4);
      if (!await limiter.acquire(3_000, options.signal)) continue;

      const returnedChainId = parseHexQuantity(await postRpc(
        endpoint,
        'eth_chainId',
        fetcher,
        timeoutMs,
        options.signal,
      ));
      if (returnedChainId !== chainId) continue;

      if (!await limiter.acquire(3_000, options.signal)) continue;
      const blockNumber = parseHexQuantity(await postRpc(
        endpoint,
        'eth_blockNumber',
        fetcher,
        timeoutMs,
        options.signal,
      ));
      if (!options.endpoints) {
        cachedHeads.set(chainId, { blockNumber, expiresAt: Date.now() + HEAD_CACHE_TTL_MS });
      }
      return blockNumber;
    } catch {
      throwIfAborted(options.signal);
      // Try the next official or configured mirror.
    }
  }

  return null;
}

export function resetRpcHeadCacheForTests(): void {
  cachedHeads.clear();
  inFlightHeads.clear();
}
