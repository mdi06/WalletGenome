import {
  EtherscanTransaction,
  EtherscanTokenTransfer,
  EtherscanInternalTransaction,
  DataSourceResult,
  ProviderErrorCode,
} from './types';
import { isCEXAddress, getAddressLabel } from './labels';
import { getDomainLimiter } from './cache';
import { getLatestBlockNumber } from './rpc';
import { abortableDelay, linkAbortSignal, throwIfAborted } from './cancellation';

// Open Blockscout REST endpoints
const BLOCKSCOUT_APIS: Record<number, string> = {
  1: 'https://eth.blockscout.com/api',
  8453: 'https://base.blockscout.com/api',
  42161: 'https://arbitrum.blockscout.com/api',
  10: 'https://optimism.blockscout.com/api',
  137: 'https://polygon.blockscout.com/api',
};

const BLOCKSCOUT_REST_APIS: Record<number, string> = {
  1: 'https://eth.blockscout.com/api/v2',
  8453: 'https://base.blockscout.com/api/v2',
  42161: 'https://arbitrum.blockscout.com/api/v2',
  10: 'https://optimism.blockscout.com/api/v2',
};

const ROUTESCAN_APIS: Record<number, string> = {
  1: 'https://api.routescan.io/v2/network/mainnet/evm/1/etherscan/api',
};

// Keep this capability list explicit so a configured key is only sent to
// chains currently supported by the Blockscout multichain API.
const BLOCKSCOUT_PRO_CHAIN_IDS = new Set([1, 10, 8453, 42161]);
const ETHERSCAN_FREE_HISTORY_CHAIN_IDS = new Set([1, 42161]);
const BLOCKSCOUT_MAX_RESULT_WINDOW = 10_000;

function isPublicBlockscoutHostname(hostname: string): boolean {
  return hostname.endsWith('.blockscout.com') && hostname !== 'api.blockscout.com';
}

function supportsOrdinaryBlockscoutPagination(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith('.blockscout.com');
  } catch {
    return false;
  }
}

function blockscoutPageWindowLimit(url: string, offset: number): number | null {
  if (!supportsOrdinaryBlockscoutPagination(url)) return null;
  return Math.max(1, Math.floor(BLOCKSCOUT_MAX_RESULT_WINDOW / Math.max(1, offset)));
}

function isUsableApiKey(value: string | undefined): value is string {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  const compact = normalized.replace(/[^a-z0-9]/g, '');
  return normalized.length >= 8
    && !normalized.includes('placeholder')
    && !normalized.includes('yourapikey')
    && !normalized.includes('your_api_key')
    && compact !== 'youretherscanapikeyhere'
    && compact !== 'youretherscanapikey'
    && compact !== 'yourapikeyhere';
}

function getBlockscoutApiKey(): string | undefined {
  const key = process.env.BLOCKSCOUT_API_KEY || process.env.BLOCKSCOUT_PRO_API_KEY;
  return isUsableApiKey(key) ? key : undefined;
}

function paidEtherscanChainsEnabled(): boolean {
  return process.env.ETHERSCAN_ENABLE_PAID_CHAINS?.trim().toLowerCase() === 'true';
}

function getEtherscanV2ApiKey(customApiKey?: string): string | undefined {
  if (isUsableApiKey(customApiKey)) return customApiKey;
  return isUsableApiKey(process.env.ETHERSCAN_API_KEY)
    ? process.env.ETHERSCAN_API_KEY
    : undefined;
}

function getDedicatedApiKey(chainId: number): string | undefined {
  switch (chainId) {
    case 1: return process.env.ETHERSCAN_API_KEY;
    case 8453: return process.env.BASESCAN_API_KEY;
    case 42161: return process.env.ARBISCAN_API_KEY;
    case 10: return process.env.OPTIMISM_API_KEY || process.env.OPTIMISTIC_ETHERSCAN_API_KEY;
    case 137: return process.env.POLYGONSCAN_API_KEY;
    default: return undefined;
  }
}

/**
 * Resolves the appropriate API key for a given chain from environment variables or custom key.
 */
export function getApiKeyForChain(chainId: number, customApiKey?: string): string | undefined {
  if (isUsableApiKey(customApiKey)) {
    return customApiKey;
  }
  const dedicated = getDedicatedApiKey(chainId);
  return isUsableApiKey(dedicated)
    ? dedicated
    : isUsableApiKey(process.env.ETHERSCAN_API_KEY)
      ? process.env.ETHERSCAN_API_KEY
      : undefined;
}

function readPayloadField(data: unknown, field: 'message' | 'result' | 'status'): unknown {
  if (!data || typeof data !== 'object') return undefined;
  return (data as Record<string, unknown>)[field];
}

function normalizeStatus(status: unknown): string | undefined {
  if (typeof status === 'string') return status;
  if (typeof status === 'number') return String(status);
  return undefined;
}

function isRateLimitResponse(data: unknown): boolean {
  const rawMessage = readPayloadField(data, 'message');
  const rawResult = readPayloadField(data, 'result');
  const msg = (typeof rawMessage === 'string' ? rawMessage : '').toLowerCase();
  const res = (typeof rawResult === 'string' ? rawResult : '').toLowerCase();
  const combined = `${msg} ${res}`;
  return (
    combined.includes('rate limit') ||
    combined.includes('max rate') ||
    combined.includes('throttle') ||
    combined.includes('busy') ||
    combined.includes('too many request')
  );
}

function isEmptyResult(data: unknown): boolean {
  const rawMessage = readPayloadField(data, 'message');
  const rawResult = readPayloadField(data, 'result');
  if (Array.isArray(rawResult) && rawResult.length === 0) return true;
  const msg = (typeof rawMessage === 'string' ? rawMessage : '').toLowerCase();
  const res = (typeof rawResult === 'string' ? rawResult : '').toLowerCase();
  return (
    msg.includes('no transaction') ||
    msg.includes('no token') ||
    msg.includes('no internal') ||
    res.includes('no transaction') ||
    res.includes('no token')
  );
}

async function fetchWithTimeout(url: string, timeoutMs = 5000, parentSignal?: AbortSignal): Promise<Response> {
  throwIfAborted(parentSignal);
  const linked = linkAbortSignal(parentSignal);
  const timeoutId = setTimeout(() => linked.controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WalletGenome/2.0)' },
      signal: linked.signal,
    });
    throwIfAborted(parentSignal);
    return res;
  } finally {
    clearTimeout(timeoutId);
    linked.dispose();
  }
}

function buildCandidateUrls(
  address: string,
  chainId: number,
  action: string,
  apiKey?: string,
): string[] {
  const etherscanV2Key = getEtherscanV2ApiKey(apiKey);
  const urls: string[] = [];

  const makeUrl = (
    base: string,
    key?: string,
    chainIdParam?: { name: 'chainid' | 'chain_id'; value: number },
  ): string => {
    const url = new URL(base);
    if (chainIdParam) url.searchParams.set(chainIdParam.name, String(chainIdParam.value));
    url.searchParams.set('module', 'account');
    url.searchParams.set('action', action);
    url.searchParams.set('address', address);
    url.searchParams.set('sort', 'asc');
    if (key) url.searchParams.set('apikey', key);
    return url.toString();
  };

  const addEtherscanV2 = (): void => {
    if (!etherscanV2Key) return;
    urls.push(makeUrl('https://api.etherscan.io/v2/api', etherscanV2Key, {
      name: 'chainid',
      value: chainId,
    }));
  };

  const configuredFallbacks = process.env[`EXPLORER_FALLBACK_URLS_${chainId}`]
    ?.split(',')
    .map(value => value.trim())
    .filter(Boolean) ?? [];
  const addConfiguredFallbacks = (): void => {
    for (const fallback of configuredFallbacks) {
      try {
        urls.push(makeUrl(fallback));
      } catch {
        // Invalid deployment configuration is ignored; other candidates remain usable.
      }
    }
  };

  // Etherscan V2's free tier currently covers Ethereum and Arbitrum history.
  // Paid-only chains are attempted only when the deployment explicitly opts in.
  if (ETHERSCAN_FREE_HISTORY_CHAIN_IDS.has(chainId)) addEtherscanV2();

  // Blockscout Pro is a keyed multichain fallback for its supported set.
  const blockscoutApiKey = getBlockscoutApiKey();
  if (blockscoutApiKey && BLOCKSCOUT_PRO_CHAIN_IDS.has(chainId)) {
    urls.push(makeUrl('https://api.blockscout.com/v2/api', blockscoutApiKey, {
      name: 'chain_id',
      value: chainId,
    }));
  }

  const preferRoutescan = chainId === 1 && (action === 'tokentx' || action === 'txlistinternal');

  // Open per-chain indexers. Ethereum token/internal queries are materially
  // faster and more complete on Routescan; normal history remains Blockscout-first.
  const blockscoutBase = BLOCKSCOUT_APIS[chainId];
  const routescanBase = ROUTESCAN_APIS[chainId];
  if (preferRoutescan && routescanBase) {
    urls.push(makeUrl(routescanBase));
  }
  if (blockscoutBase) {
    urls.push(makeUrl(blockscoutBase));
  }

  // Routescan currently indexes only a subset of the selected chains.
  if (!preferRoutescan && routescanBase) {
    urls.push(makeUrl(routescanBase));
  }

  addConfiguredFallbacks();

  if (!ETHERSCAN_FREE_HISTORY_CHAIN_IDS.has(chainId) && paidEtherscanChainsEnabled()) {
    addEtherscanV2();
  }

  return [...new Set(urls)];
}

function errorCodeFor(error: unknown): ProviderErrorCode {
  return error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'provider_error';
}

export interface ExplorerFetchOptions {
  fetcher?: (url: string, timeoutMs: number, signal?: AbortSignal) => Promise<Response>;
  maxAttempts?: number;
  backoffBaseMs?: number;
  backoffJitterMs?: number;
  maxPages?: number;
  useBlockRangeSplitting?: boolean;
  endBlock?: number;
  maxRangeRequests?: number;
  rangeConcurrency?: number;
  requestTimeoutMs?: number;
  maxDurationMs?: number;
  signal?: AbortSignal;
}

type ResolvedExplorerPageOptions = Required<Pick<ExplorerFetchOptions,
  'fetcher' | 'maxAttempts' | 'backoffBaseMs' | 'backoffJitterMs' | 'requestTimeoutMs'>>
  & Pick<ExplorerFetchOptions, 'signal'>;

interface SuccessfulPage<T> {
  kind: 'success';
  records: T[];
}

interface FailedPage {
  kind: 'failure';
}

type ExplorerPageResult<T> = SuccessfulPage<T> | FailedPage;

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return abortableDelay(ms, signal);
}

function computeBackoffDelayMs(
  attempt: number,
  response: Response | null,
  baseMs: number,
  jitterMs: number,
): number {
  const retryAfter = response?.headers.get('retry-after');
  if (retryAfter) {
    const asSeconds = Number(retryAfter);
    if (Number.isFinite(asSeconds)) return Math.max(0, asSeconds * 1000);
    const retryAt = Date.parse(retryAfter);
    if (Number.isFinite(retryAt)) return Math.max(0, retryAt - Date.now());
  }

  const jitter = jitterMs > 0 ? Math.floor(Math.random() * jitterMs) : 0;
  const fallbackDelay = attempt * baseMs + jitter;
  return response?.status === 429
    ? Math.max(attempt * 1_000, fallbackDelay)
    : fallbackDelay;
}

function buildPageUrl(url: string, page: number, offset: number): string {
  const resolved = new URL(url);
  resolved.searchParams.set('page', String(page));
  resolved.searchParams.set('offset', String(offset));
  return resolved.toString();
}

function recordKey(record: unknown, fallbackIndex: number): string {
  if (!record || typeof record !== 'object') {
    return `primitive:${fallbackIndex}:${String(record)}`;
  }

  const item = record as Record<string, unknown>;
  const identityParts = [
    item.hash,
    item.traceId,
    item.transactionIndex,
    item.blockNumber,
    item.timeStamp,
    item.from,
    item.to,
    item.contractAddress,
    item.value,
    item.tokenSymbol,
    item.tokenName,
    item.type,
    item.nonce,
  ]
    .filter(value => value !== undefined && value !== null && value !== '')
    .map(value => String(value));

  if (identityParts.length === 0) {
    return `json:${fallbackIndex}:${JSON.stringify(item)}`;
  }

  return identityParts.join('|');
}

async function fetchExplorerPage<T>(
  candidateUrl: string,
  page: number,
  offset: number,
  options: ResolvedExplorerPageOptions,
  errors: DataSourceResult<T>['errors'],
): Promise<ExplorerPageResult<T>> {
  let hostname = 'api.etherscan.io';
  try {
    hostname = new URL(candidateUrl).hostname;
  } catch {}

  const publicBlockscout = isPublicBlockscoutHostname(hostname);
  const blockscout = hostname.endsWith('.blockscout.com');
  const limiter = getDomainLimiter(hostname, publicBlockscout ? 1 : hostname === 'api.blockscout.com' ? 4 : 3);
  const acquireTimeoutMs = blockscout ? 15_000 : 3_000;
  const pageUrl = buildPageUrl(candidateUrl, page, offset);

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      throwIfAborted(options.signal);
      const acquired = await limiter.acquire(acquireTimeoutMs, options.signal);
      if (!acquired) {
        errors.push({ code: 'rate_limited', message: `${hostname} could not schedule the request within the provider budget.` });
        if (attempt < options.maxAttempts) {
          await sleep(computeBackoffDelayMs(attempt, null, options.backoffBaseMs, options.backoffJitterMs), options.signal);
          continue;
        }
        return { kind: 'failure' };
      }

      const res = await options.fetcher(pageUrl, options.requestTimeoutMs, options.signal);
      throwIfAborted(options.signal);
      if (!res.ok) {
        const code = res.status === 429 ? 'rate_limited' : 'http_error';
        errors.push({ code, message: `${hostname} returned HTTP ${res.status} on page ${page}.` });
        if (attempt < options.maxAttempts && (res.status === 429 || res.status >= 500)) {
          await sleep(computeBackoffDelayMs(attempt, res, options.backoffBaseMs, options.backoffJitterMs), options.signal);
          continue;
        }
        return { kind: 'failure' };
      }

      const data: unknown = await res.json().catch(() => null);
      throwIfAborted(options.signal);
      if (!data) {
        errors.push({ code: 'invalid_response', message: `${hostname} returned invalid JSON on page ${page}.` });
        if (attempt < options.maxAttempts) {
          await sleep(computeBackoffDelayMs(attempt, res, options.backoffBaseMs, options.backoffJitterMs), options.signal);
          continue;
        }
        return { kind: 'failure' };
      }

      const status = normalizeStatus(readPayloadField(data, 'status'));
      const result = readPayloadField(data, 'result');

      if (Array.isArray(result) && (status === '1' || status === '2' || status === undefined)) {
        return { kind: 'success', records: result as T[] };
      }

      if (status === '0' && isEmptyResult(data)) {
        return { kind: 'success', records: [] };
      }

      if (isRateLimitResponse(data)) {
        errors.push({ code: 'rate_limited', message: `${hostname} rate-limited page ${page}.` });
        if (attempt < options.maxAttempts) {
          await sleep(computeBackoffDelayMs(attempt, res, options.backoffBaseMs, options.backoffJitterMs), options.signal);
          continue;
        }
        return { kind: 'failure' };
      }

      if (status === '0') {
        errors.push({ code: 'provider_error', message: `${hostname} rejected the explorer query on page ${page}.` });
        return { kind: 'failure' };
      }

      errors.push({ code: 'invalid_response', message: `${hostname} returned an unrecognized response on page ${page}.` });
      return { kind: 'failure' };
    } catch (error) {
      throwIfAborted(options.signal);
      errors.push({ code: errorCodeFor(error), message: `${hostname} could not complete page ${page}.` });
      if (attempt < options.maxAttempts) {
          await sleep(computeBackoffDelayMs(attempt, null, options.backoffBaseMs, options.backoffJitterMs), options.signal);
        continue;
      }
      return { kind: 'failure' };
    }
  }

  return { kind: 'failure' };
}

function withBlockRange(url: string, startBlock: number, endBlock: number): string {
  const resolved = new URL(url);
  resolved.searchParams.set('startblock', String(startBlock));
  resolved.searchParams.set('endblock', String(endBlock));
  return resolved.toString();
}

function withStartBlock(url: string, startBlock: number): string {
  const resolved = new URL(url);
  resolved.searchParams.set('startblock', String(startBlock));
  return resolved.toString();
}

function providerResultLimit(url: string, requestedLimit: number): number {
  try {
    const hostname = new URL(url).hostname;
    if (hostname.endsWith('.blockscout.com') || hostname === 'api.routescan.io') {
      return Math.max(requestedLimit, 10_000);
    }
  } catch {
    // Keep the conservative caller limit for malformed candidates.
  }
  return requestedLimit;
}

function recordBlockNumber(record: unknown): number | null {
  if (!record || typeof record !== 'object') return null;
  const raw = (record as Record<string, unknown>).blockNumber;
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function mergeUniqueRecords<T>(...groups: T[][]): T[] {
  const merged: T[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    for (const record of group) {
      const key = recordKey(record, merged.length);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(record);
      }
    }
  }
  return merged;
}

type BlockscoutRestDataset = 'transactions' | 'tokenTransfers' | 'internalTransactions';

interface BlockscoutRestPage {
  items?: unknown;
  next_page_params?: unknown;
}

function restField(item: Record<string, unknown>, field: string): unknown {
  return item[field];
}

function restString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

function restNestedHash(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  return restString((value as Record<string, unknown>).hash);
}

function restTimestamp(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(Math.floor(value));
  if (typeof value !== 'string') return '';
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? String(Math.floor(parsed / 1000)) : value;
}

function restErrorFlag(value: unknown): string {
  if (value === false || value === 0 || value === '0' || value === 'ok' || value === 'success') return '0';
  if (value === true || value === 1 || value === '1' || value === 'error' || value === 'failed') return '1';
  return '';
}

function normalizeRestTransaction(item: unknown): EtherscanTransaction | null {
  if (!item || typeof item !== 'object') return null;
  const raw = item as Record<string, unknown>;
  const status = restString(restField(raw, 'status')).toLowerCase();
  const isError = restErrorFlag(status === 'ok' ? 'ok' : status === 'error' ? 'error' : restField(raw, 'is_error'));
  const receiptStatus = status === 'ok' || status === 'success'
    ? '1'
    : status === 'error' || status === 'failed'
      ? '0'
      : restErrorFlag(restField(raw, 'receipt_status')) === '1' ? '0' : '';
  return {
    blockNumber: restString(restField(raw, 'block_number')),
    timeStamp: restTimestamp(restField(raw, 'timestamp')),
    hash: restString(restField(raw, 'hash')),
    nonce: restString(restField(raw, 'nonce')),
    blockHash: restString(restField(raw, 'block_hash')),
    transactionIndex: restString(restField(raw, 'position')),
    from: restNestedHash(restField(raw, 'from')),
    to: restNestedHash(restField(raw, 'to')),
    value: restString(restField(raw, 'value')),
    gas: restString(restField(raw, 'gas')),
    gasPrice: restString(restField(raw, 'gas_price')),
    isError,
    txreceipt_status: receiptStatus,
    input: restString(restField(raw, 'raw_input') ?? restField(raw, 'input')),
    contractAddress: restNestedHash(restField(raw, 'created_contract')),
    cumulativeGasUsed: restString(restField(raw, 'cumulative_gas_used')),
    gasUsed: restString(restField(raw, 'gas_used')),
    confirmations: restString(restField(raw, 'confirmations')),
    methodId: restString(restField(raw, 'method_id')),
    functionName: restString(restField(raw, 'method')),
  };
}

function normalizeRestTokenTransfer(item: unknown): EtherscanTokenTransfer | null {
  if (!item || typeof item !== 'object') return null;
  const raw = item as Record<string, unknown>;
  const token = raw.token && typeof raw.token === 'object' ? raw.token as Record<string, unknown> : {};
  return {
    blockNumber: restString(restField(raw, 'block_number')),
    timeStamp: restTimestamp(restField(raw, 'timestamp')),
    hash: restString(restField(raw, 'transaction_hash')),
    nonce: restString(restField(raw, 'nonce')),
    blockHash: restString(restField(raw, 'block_hash')),
    from: restNestedHash(restField(raw, 'from')),
    contractAddress: restString(token.address_hash),
    to: restNestedHash(restField(raw, 'to')),
    value: restString(raw.total && typeof raw.total === 'object'
      ? (raw.total as Record<string, unknown>).value
      : raw.value),
    tokenName: restString(token.name),
    tokenSymbol: restString(token.symbol),
    tokenDecimal: restString(token.decimals),
    transactionIndex: restString(restField(raw, 'transaction_index')),
    logIndex: restString(restField(raw, 'log_index')),
    gas: restString(restField(raw, 'gas')),
    gasPrice: restString(restField(raw, 'gas_price')),
    gasUsed: restString(restField(raw, 'gas_used')),
    cumulativeGasUsed: restString(restField(raw, 'cumulative_gas_used')),
    input: restString(restField(raw, 'raw_input') ?? restField(raw, 'input')),
    confirmations: restString(restField(raw, 'confirmations')),
  };
}

function normalizeRestInternalTransaction(item: unknown): EtherscanInternalTransaction | null {
  if (!item || typeof item !== 'object') return null;
  const raw = item as Record<string, unknown>;
  return {
    blockNumber: restString(restField(raw, 'block_number')),
    timeStamp: restTimestamp(restField(raw, 'timestamp')),
    hash: restString(restField(raw, 'transaction_hash')),
    from: restNestedHash(restField(raw, 'from')),
    to: restNestedHash(restField(raw, 'to')),
    value: restString(restField(raw, 'value')),
    contractAddress: restNestedHash(restField(raw, 'created_contract')),
    input: restString(restField(raw, 'raw_input') ?? restField(raw, 'input')),
    type: restString(restField(raw, 'type')),
    gas: restString(restField(raw, 'gas_limit')),
    gasUsed: restString(restField(raw, 'gas_used')),
    traceId: restString(restField(raw, 'index')),
    isError: restErrorFlag(restField(raw, 'success')) === '0' ? '1' : restErrorFlag(restField(raw, 'error')),
    errCode: restString(restField(raw, 'error')),
  };
}

function normalizeRestRecords<T>(dataset: BlockscoutRestDataset, items: unknown[]): T[] {
  const normalized = items.map(item => {
    switch (dataset) {
      case 'transactions': return normalizeRestTransaction(item);
      case 'tokenTransfers': return normalizeRestTokenTransfer(item);
      case 'internalTransactions': return normalizeRestInternalTransaction(item);
    }
  });
  return normalized.filter(record => record !== null) as unknown as T[];
}

function blockscoutRestPath(dataset: BlockscoutRestDataset): string {
  switch (dataset) {
    case 'transactions': return 'transactions';
    case 'tokenTransfers': return 'token-transfers';
    case 'internalTransactions': return 'internal-transactions';
  }
}

function isRestCursor(value: unknown): value is Record<string, string | number | boolean> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    && Object.values(value as Record<string, unknown>).every(item => (
      typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
    ));
}

function restCursorKey(cursor: Record<string, string | number | boolean>): string {
  return JSON.stringify(Object.entries(cursor).sort(([left], [right]) => left.localeCompare(right)));
}

async function fetchBlockscoutRestData<T>(
  address: string,
  chainId: number,
  dataset: BlockscoutRestDataset,
  options: ExplorerFetchOptions,
): Promise<DataSourceResult<T> | null> {
  const base = BLOCKSCOUT_REST_APIS[chainId];
  if (!base) return null;

  const errors: DataSourceResult<T>['errors'] = [];
  const fetcher = options.fetcher ?? fetchWithTimeout;
  const maxAttempts = options.maxAttempts ?? 3;
  const backoffBaseMs = options.backoffBaseMs ?? 250;
  const backoffJitterMs = options.backoffJitterMs ?? 100;
  const requestTimeoutMs = options.requestTimeoutMs ?? 12_000;
  const maxPages = options.maxPages ?? 500;
  const deadlineAt = Date.now() + (options.maxDurationMs ?? 200_000);
  const hostname = new URL(base).hostname;
  const limiter = getDomainLimiter(hostname, 1);
  const records: T[] = [];
  const seenCursors = new Set<string>();
  let nextParams: Record<string, string | number | boolean> | null = null;

  for (let page = 1; page <= maxPages; page++) {
    throwIfAborted(options.signal);
    if (Date.now() >= deadlineAt) {
      errors.push({ code: 'result_truncated', message: `Blockscout REST ${dataset} budget expired before full exhaustion.` });
      break;
    }

    const url = new URL(`${base}/addresses/${encodeURIComponent(address)}/${blockscoutRestPath(dataset)}`);
    if (nextParams) {
      for (const [key, value] of Object.entries(nextParams)) url.searchParams.set(key, String(value));
    }

    let pageData: BlockscoutRestPage | null = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let response: Response | null = null;
      try {
        const acquired = await limiter.acquire(15_000, options.signal);
        if (!acquired) {
          errors.push({ code: 'rate_limited', message: `${hostname} could not schedule REST ${dataset} page ${page}.` });
          continue;
        }
        response = await fetcher(url.toString(), requestTimeoutMs, options.signal);
        throwIfAborted(options.signal);
        if (!response.ok) {
          const code = response.status === 429 ? 'rate_limited' : 'http_error';
          errors.push({ code, message: `${hostname} returned HTTP ${response.status} for REST ${dataset} page ${page}.` });
          if (attempt < maxAttempts && (response.status === 429 || response.status >= 500)) {
            await sleep(computeBackoffDelayMs(attempt, response, backoffBaseMs, backoffJitterMs), options.signal);
            continue;
          }
          break;
        }
        const payload: unknown = await response.json().catch(() => null);
        if (!payload || typeof payload !== 'object' || !Array.isArray((payload as BlockscoutRestPage).items)) {
          errors.push({ code: 'invalid_response', message: `${hostname} returned invalid REST ${dataset} data on page ${page}.` });
          if (attempt < maxAttempts) {
            await sleep(computeBackoffDelayMs(attempt, response, backoffBaseMs, backoffJitterMs), options.signal);
            continue;
          }
          break;
        }
        pageData = payload as BlockscoutRestPage;
        break;
      } catch (error) {
        throwIfAborted(options.signal);
        errors.push({ code: errorCodeFor(error), message: `${hostname} could not complete REST ${dataset} page ${page}.` });
        if (attempt < maxAttempts) {
          await sleep(computeBackoffDelayMs(attempt, response, backoffBaseMs, backoffJitterMs), options.signal);
        }
      }
    }

    if (!pageData || !Array.isArray(pageData.items)) break;
    records.push(...normalizeRestRecords<T>(dataset, pageData.items));
    if (pageData.next_page_params === undefined || pageData.next_page_params === null) {
      return { data: mergeUniqueRecords(records), status: 'complete', errors: [] };
    }
    if (!isRestCursor(pageData.next_page_params)) {
      errors.push({ code: 'invalid_response', message: `${hostname} returned invalid REST ${dataset} pagination parameters.` });
      break;
    }
    const cursorKey = restCursorKey(pageData.next_page_params);
    if (seenCursors.has(cursorKey)) {
      errors.push({ code: 'provider_error', message: `${hostname} repeated REST ${dataset} pagination parameters.` });
      break;
    }
    seenCursors.add(cursorKey);
    nextParams = pageData.next_page_params;
  }

  if (records.length > 0) {
    return {
      data: mergeUniqueRecords(records),
      status: 'partial',
      errors: errors.length > 0 ? errors : [{ code: 'result_truncated', message: `Blockscout REST ${dataset} pagination was truncated.` }],
    };
  }
  return { data: [], status: 'unavailable', errors: errors.length > 0 ? errors : [{ code: 'provider_error', message: `${hostname} returned no REST ${dataset} data.` }] };
}

async function fetchWithBlockscoutRestFallback<T>(
  legacyResult: DataSourceResult<T>,
  address: string,
  chainId: number,
  dataset: BlockscoutRestDataset,
  options: ExplorerFetchOptions,
): Promise<DataSourceResult<T>> {
  if (legacyResult.status === 'complete') return legacyResult;
  const restResult = await fetchBlockscoutRestData<T>(address, chainId, dataset, options);
  if (!restResult) return legacyResult;
  if (restResult.status === 'complete' || restResult.data.length > legacyResult.data.length) return restResult;
  return {
    data: legacyResult.data,
    status: legacyResult.status,
    errors: [...legacyResult.errors, ...restResult.errors],
  };
}

interface RangeFetchResult<T> {
  complete: boolean;
  records: T[];
}

async function fetchProviderByBlockRange<T>(
  url: string,
  resultLimit: number,
  endBlock: number,
  options: Required<Pick<ExplorerFetchOptions,
    'fetcher' | 'maxAttempts' | 'backoffBaseMs' | 'backoffJitterMs' | 'maxPages' | 'maxRangeRequests' | 'rangeConcurrency' | 'requestTimeoutMs'>>
    & Pick<ExplorerFetchOptions, 'signal'>,
  errors: DataSourceResult<T>['errors'],
  deadlineAt: number,
): Promise<RangeFetchResult<T>> {
  let rangeRequests = 0;
  let providerHostname = 'api.etherscan.io';
  try {
    providerHostname = new URL(url).hostname;
  } catch {}
  const publicBlockscout = isPublicBlockscoutHostname(providerHostname);

  const paginateFixedRange = async (
    rangeUrl: string,
    firstRecords: T[],
    blockLabel: string,
  ): Promise<RangeFetchResult<T>> => {
    const pages: T[][] = [firstRecords];
    for (let page = 2; page <= options.maxPages; page++) {
      const pageResult = await fetchExplorerPage<T>(
        rangeUrl,
        page,
        resultLimit,
        options,
        errors,
      );
      if (pageResult.kind === 'failure') {
        return { complete: false, records: mergeUniqueRecords(...pages) };
      }
      pages.push(pageResult.records);
      if (pageResult.records.length < resultLimit) {
        return { complete: true, records: mergeUniqueRecords(...pages) };
      }
    }

    errors.push({
      code: 'result_truncated',
      message: `Explorer could not exhaust ${blockLabel} within ${options.maxPages} pages.`,
    });
    return { complete: false, records: mergeUniqueRecords(...pages) };
  };

  const fetchRange = async (
    startBlock: number,
    rangeEndBlock: number,
    allowInitialFanout = false,
  ): Promise<RangeFetchResult<T>> => {
    throwIfAborted(options.signal);
    if (Date.now() >= deadlineAt) {
      errors.push({
        code: 'result_truncated',
        message: 'Explorer history budget expired before every block range could be verified.',
      });
      return { complete: false, records: [] };
    }
    rangeRequests += 1;
    if (rangeRequests > options.maxRangeRequests) {
      errors.push({
        code: 'result_truncated',
        message: `Explorer exceeded the ${options.maxRangeRequests}-request range budget before proving full exhaustion.`,
      });
      return { complete: false, records: [] };
    }

    const rangeUrl = withBlockRange(url, startBlock, rangeEndBlock);
    const firstPage = await fetchExplorerPage<T>(
      rangeUrl,
      1,
      resultLimit,
      options,
      errors,
    );
    if (firstPage.kind === 'failure') return { complete: false, records: [] };
    if (firstPage.records.length < resultLimit) {
      return { complete: true, records: firstPage.records };
    }

    const numberedRecords = firstPage.records.map(recordBlockNumber);
    if (numberedRecords.every(block => block === null)) {
      return paginateFixedRange(rangeUrl, firstPage.records, `block range ${startBlock}-${rangeEndBlock}`);
    }
    if (numberedRecords.some(block => block === null)) {
      errors.push({
        code: 'invalid_response',
        message: `Provider omitted block numbers within requested range ${startBlock}-${rangeEndBlock}.`,
      });
      return { complete: false, records: firstPage.records };
    }
    if (numberedRecords.some(block => block !== null && (block < startBlock || block > rangeEndBlock))) {
      errors.push({
        code: 'invalid_response',
        message: `Provider ignored the requested block range ${startBlock}-${rangeEndBlock}.`,
      });
      return { complete: false, records: firstPage.records };
    }

    if (startBlock < rangeEndBlock) {
      if (allowInitialFanout && rangeEndBlock - startBlock >= 1_000) {
        const partitionCount = publicBlockscout ? 4 : 16;
        const rangeSize = rangeEndBlock - startBlock + 1;
        const chunkSize = Math.ceil(rangeSize / partitionCount);
        const ranges = Array.from({ length: partitionCount }, (_, index) => {
          const chunkStart = startBlock + index * chunkSize;
          return {
            start: chunkStart,
            end: Math.min(rangeEndBlock, chunkStart + chunkSize - 1),
          };
        }).filter(range => range.start <= range.end);
        const results = new Array<RangeFetchResult<T>>(ranges.length);
        let nextRange = 0;
        const worker = async (): Promise<void> => {
          while (true) {
            throwIfAborted(options.signal);
            const index = nextRange++;
            if (index >= ranges.length) return;
            results[index] = await fetchRange(ranges[index].start, ranges[index].end, false);
          }
        };
        const workerCount = publicBlockscout
          ? 1
          : Math.min(options.rangeConcurrency, ranges.length);
        await Promise.all(Array.from(
          { length: workerCount },
          () => worker(),
        ));
        return {
          complete: results.every(result => result.complete),
          records: mergeUniqueRecords(...results.map(result => result.records)),
        };
      }

      const midpoint = startBlock + Math.floor((rangeEndBlock - startBlock) / 2);
      const left = await fetchRange(startBlock, midpoint, false);
      if (!left.complete) {
        return { complete: false, records: mergeUniqueRecords(firstPage.records, left.records) };
      }
      const right = await fetchRange(midpoint + 1, rangeEndBlock, false);
      if (!right.complete) {
        return { complete: false, records: mergeUniqueRecords(firstPage.records, left.records, right.records) };
      }
      return { complete: true, records: mergeUniqueRecords(left.records, right.records) };
    }

    // An unusually busy single block can still exceed one page. Page only that block.
    return paginateFixedRange(rangeUrl, firstPage.records, `block ${startBlock}`);
  };

  return fetchRange(0, endBlock, true);
}

export async function fetchExplorerData<T>(
  urls: string[],
  resultLimit: number,
  options: ExplorerFetchOptions = {},
): Promise<DataSourceResult<T>> {
  throwIfAborted(options.signal);
  if (urls.length === 0) {
    return {
      data: [],
      status: 'unavailable',
      errors: [{ code: 'unsupported_chain', message: 'No supported explorer is configured for this chain.' }],
    };
  }

  const errors: DataSourceResult<T>['errors'] = [];
  const fetcher = options.fetcher ?? fetchWithTimeout;
  const maxAttempts = options.maxAttempts ?? 3;
  const backoffBaseMs = options.backoffBaseMs ?? 250;
  const backoffJitterMs = options.backoffJitterMs ?? 100;
  const maxPages = options.maxPages ?? 500;
  const maxRangeRequests = options.maxRangeRequests ?? 2_000;
  const rangeConcurrency = options.rangeConcurrency ?? 4;
  const requestTimeoutMs = options.requestTimeoutMs ?? 12_000;
  const deadlineAt = Date.now() + (options.maxDurationMs ?? 200_000);
  const pageOptions = {
    fetcher,
    maxAttempts,
    backoffBaseMs,
    backoffJitterMs,
    requestTimeoutMs,
    signal: options.signal,
  };
  let bestPartialData: T[] = [];
  let bestPartialErrors: DataSourceResult<T>['errors'] = [];

  for (const url of urls) {
    throwIfAborted(options.signal);
    const providerErrorsStart = errors.length;

    if (Date.now() >= deadlineAt) {
      errors.push({
        code: 'result_truncated',
        message: 'Explorer failover budget expired before another provider could be verified.',
      });
      break;
    }

    if (options.useBlockRangeSplitting && !supportsOrdinaryBlockscoutPagination(url)) {
      const rangeResultLimit = providerResultLimit(url, resultLimit);
      const rangeResult = await fetchProviderByBlockRange<T>(
        url,
        rangeResultLimit,
        options.endBlock ?? 999_999_999,
        { ...pageOptions, maxPages, maxRangeRequests, rangeConcurrency },
        errors,
        deadlineAt,
      );
      if (rangeResult.complete) {
        if (rangeResult.records.length === 0 && bestPartialData.length > 0) {
          continue;
        }
        return { data: rangeResult.records, status: 'complete', errors: [] };
      }
      if (rangeResult.records.length > bestPartialData.length) {
        bestPartialData = rangeResult.records;
        bestPartialErrors = errors.slice(providerErrorsStart);
      }
      continue;
    }

    const dedupedResults: T[] = [];
    const seenKeys = new Set<string>();
    const pageWindowLimit = blockscoutPageWindowLimit(url, resultLimit);
    let pageUrl = url;
    let page = 1;
    let totalPageRequests = 0;
    let windowStartBlock: number | null = null;
    let uniqueRecordsAtWindowStart = 0;
    let exhausted = false;
    let providerFailed = false;

    while (totalPageRequests < maxPages && !providerFailed && !exhausted) {
      throwIfAborted(options.signal);
      if (Date.now() >= deadlineAt) {
        errors.push({
          code: 'result_truncated',
          message: 'Explorer pagination budget expired before full exhaustion.',
        });
        providerFailed = true;
        break;
      }
      totalPageRequests += 1;
      const pageResult = await fetchExplorerPage<T>(
        pageUrl,
        page,
        resultLimit,
        pageOptions,
        errors,
      );

      if (pageResult.kind === 'failure') {
        if (dedupedResults.length > 0) {
          errors.push({
            code: 'provider_error',
            message: `Provider failed before proving full history exhaustion after ${dedupedResults.length} records.`,
          });
        }
        providerFailed = true;
        break;
      }

      if (windowStartBlock !== null && pageResult.records.length > 0) {
        const currentWindowStartBlock = windowStartBlock;
        const blockNumbers = pageResult.records.map(recordBlockNumber);
        if (blockNumbers.some(block => block === null || block < currentWindowStartBlock)) {
          errors.push({
            code: 'invalid_response',
            message: `Blockscout ignored the continuation starting at block ${currentWindowStartBlock}.`,
          });
          providerFailed = true;
          break;
        }
      }

      const beforeCount = dedupedResults.length;
      for (const record of pageResult.records) {
        const key = recordKey(record, dedupedResults.length);
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          dedupedResults.push(record);
        }
      }

      if (pageResult.records.length === 0 || pageResult.records.length < resultLimit) {
        exhausted = true;
        break;
      }

      if (pageWindowLimit !== null && page >= pageWindowLimit) {
        const blockNumbers = pageResult.records.map(recordBlockNumber);
        if (blockNumbers.some(block => block === null)) {
          errors.push({
            code: 'invalid_response',
            message: 'Blockscout omitted block numbers required to continue beyond its 10,000-record window.',
          });
          providerFailed = true;
          break;
        }

        const nextStartBlock = Math.max(...blockNumbers as number[]);
        if (dedupedResults.length === uniqueRecordsAtWindowStart) {
          errors.push({
            code: 'result_truncated',
            message: `Blockscout could not advance beyond block ${nextStartBlock} without risking omitted records.`,
          });
          providerFailed = true;
          break;
        }

        // The Etherscan-compatible Blockscout API caps page x offset at
        // 10,000. Reopen an overlapping window at the last observed block,
        // then deduplicate that boundary block as normal pagination resumes.
        pageUrl = withStartBlock(url, nextStartBlock);
        windowStartBlock = nextStartBlock;
        uniqueRecordsAtWindowStart = dedupedResults.length;
        page = 1;
        continue;
      }

      if (dedupedResults.length === beforeCount && windowStartBlock === null) {
        errors.push({
          code: 'provider_error',
          message: `Provider pagination looped without yielding new records on page ${page}.`,
        });
        providerFailed = true;
        break;
      }

      page += 1;
    }

    if (exhausted) {
      if (dedupedResults.length === 0 && bestPartialData.length > 0) {
        continue;
      }
      return {
        data: dedupedResults,
        status: 'complete',
        errors: [],
      };
    }

    if (errors.length === providerErrorsStart) {
      errors.push({
        code: 'result_truncated',
        message: `Explorer could not prove exhaustion within ${maxPages} pages.`,
      });
    }

    if (dedupedResults.length > bestPartialData.length) {
      bestPartialData = dedupedResults;
      bestPartialErrors = errors.slice(providerErrorsStart);
    }
  }

  if (bestPartialData.length > 0) {
    return {
      data: bestPartialData,
      status: 'partial',
      errors: bestPartialErrors.length > 0
        ? bestPartialErrors
        : [{
            code: 'result_truncated',
            message: 'Explorer providers returned partial history but none proved full exhaustion.',
          }],
    };
  }

  return { data: [], status: 'unavailable', errors };
}

export async function fetchNormalTransactions(
  address: string,
  chainId: number,
  apiKey?: string,
  offset = 1000,
  options: ExplorerFetchOptions = {},
): Promise<DataSourceResult<EtherscanTransaction>> {
  const urls = buildCandidateUrls(address, chainId, 'txlist', apiKey);
  const endBlock = options.endBlock ?? await getLatestBlockNumber(chainId, { signal: options.signal }) ?? 999_999_999;
  const legacyResult = await fetchExplorerData<EtherscanTransaction>(urls, offset, {
    ...options,
    endBlock,
    useBlockRangeSplitting: options.useBlockRangeSplitting ?? true,
  });
  return await fetchWithBlockscoutRestFallback(legacyResult, address, chainId, 'transactions', options);
}

export async function fetchTokenTransfers(
  address: string,
  chainId: number,
  apiKey?: string,
  offset = 1000,
  options: ExplorerFetchOptions = {},
): Promise<DataSourceResult<EtherscanTokenTransfer>> {
  const urls = buildCandidateUrls(address, chainId, 'tokentx', apiKey);
  const endBlock = options.endBlock ?? await getLatestBlockNumber(chainId, { signal: options.signal }) ?? 999_999_999;
  const legacyResult = await fetchExplorerData<EtherscanTokenTransfer>(urls, offset, {
    ...options,
    endBlock,
    useBlockRangeSplitting: options.useBlockRangeSplitting ?? true,
  });
  return await fetchWithBlockscoutRestFallback(legacyResult, address, chainId, 'tokenTransfers', options);
}

export async function fetchInternalTransactions(
  address: string,
  chainId: number,
  apiKey?: string,
  offset = 500,
  options: ExplorerFetchOptions = {},
): Promise<DataSourceResult<EtherscanInternalTransaction>> {
  const urls = buildCandidateUrls(address, chainId, 'txlistinternal', apiKey);
  const endBlock = options.endBlock ?? await getLatestBlockNumber(chainId, { signal: options.signal }) ?? 999_999_999;
  const legacyResult = await fetchExplorerData<EtherscanInternalTransaction>(urls, offset, {
    ...options,
    endBlock,
    useBlockRangeSplitting: options.useBlockRangeSplitting ?? true,
  });
  return await fetchWithBlockscoutRestFallback(legacyResult, address, chainId, 'internalTransactions', options);
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
