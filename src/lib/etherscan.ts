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

// Open Blockscout REST endpoints
const BLOCKSCOUT_APIS: Record<number, string> = {
  1: 'https://eth.blockscout.com/api',
  8453: 'https://base.blockscout.com/api',
  42161: 'https://arbitrum.blockscout.com/api',
  10: 'https://optimism.blockscout.com/api',
  137: 'https://polygon.blockscout.com/api',
};

const ROUTESCAN_APIS: Record<number, string> = {
  1: 'https://api.routescan.io/v2/network/mainnet/evm/1/etherscan/api',
};

// Blockscout Pro does not currently index Base. Keep this capability
// list explicit so a configured key is never sent to an unsupported chain.
const BLOCKSCOUT_PRO_CHAIN_IDS = new Set([1, 10, 42161]);
const ETHERSCAN_FREE_HISTORY_CHAIN_IDS = new Set([1, 42161]);

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

interface ExplorerFetchOptions {
  fetcher?: (url: string, timeoutMs: number) => Promise<Response>;
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
}

interface SuccessfulPage<T> {
  kind: 'success';
  records: T[];
}

interface FailedPage {
  kind: 'failure';
}

type ExplorerPageResult<T> = SuccessfulPage<T> | FailedPage;

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise(resolve => setTimeout(resolve, ms));
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
  return attempt * baseMs + jitter;
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
  options: Required<Pick<ExplorerFetchOptions, 'fetcher' | 'maxAttempts' | 'backoffBaseMs' | 'backoffJitterMs' | 'requestTimeoutMs'>>,
  errors: DataSourceResult<T>['errors'],
): Promise<ExplorerPageResult<T>> {
  let hostname = 'api.etherscan.io';
  try {
    hostname = new URL(candidateUrl).hostname;
  } catch {}

  const limiter = getDomainLimiter(hostname, hostname === 'api.blockscout.com' ? 5 : 3);
  const pageUrl = buildPageUrl(candidateUrl, page, offset);

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      const acquired = await limiter.acquire(3000);
      if (!acquired) {
        errors.push({ code: 'rate_limited', message: `${hostname} could not schedule the request within the provider budget.` });
        if (attempt < options.maxAttempts) {
          await sleep(computeBackoffDelayMs(attempt, null, options.backoffBaseMs, options.backoffJitterMs));
          continue;
        }
        return { kind: 'failure' };
      }

      const res = await options.fetcher(pageUrl, options.requestTimeoutMs);
      if (!res.ok) {
        const code = res.status === 429 ? 'rate_limited' : 'http_error';
        errors.push({ code, message: `${hostname} returned HTTP ${res.status} on page ${page}.` });
        if (attempt < options.maxAttempts && (res.status === 429 || res.status >= 500)) {
          await sleep(computeBackoffDelayMs(attempt, res, options.backoffBaseMs, options.backoffJitterMs));
          continue;
        }
        return { kind: 'failure' };
      }

      const data: unknown = await res.json().catch(() => null);
      if (!data) {
        errors.push({ code: 'invalid_response', message: `${hostname} returned invalid JSON on page ${page}.` });
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
          await sleep(computeBackoffDelayMs(attempt, res, options.backoffBaseMs, options.backoffJitterMs));
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
      errors.push({ code: errorCodeFor(error), message: `${hostname} could not complete page ${page}.` });
      if (attempt < options.maxAttempts) {
        await sleep(computeBackoffDelayMs(attempt, null, options.backoffBaseMs, options.backoffJitterMs));
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

interface RangeFetchResult<T> {
  complete: boolean;
  records: T[];
}

async function fetchProviderByBlockRange<T>(
  url: string,
  resultLimit: number,
  endBlock: number,
  options: Required<Pick<ExplorerFetchOptions,
    'fetcher' | 'maxAttempts' | 'backoffBaseMs' | 'backoffJitterMs' | 'maxPages' | 'maxRangeRequests' | 'rangeConcurrency' | 'requestTimeoutMs'>>,
  errors: DataSourceResult<T>['errors'],
  deadlineAt: number,
): Promise<RangeFetchResult<T>> {
  let rangeRequests = 0;

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
        const partitionCount = 16;
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
          while (nextRange < ranges.length) {
            const index = nextRange++;
            results[index] = await fetchRange(ranges[index].start, ranges[index].end, false);
          }
        };
        await Promise.all(Array.from(
          { length: Math.min(options.rangeConcurrency, ranges.length) },
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
  let bestPartialData: T[] = [];
  let bestPartialErrors: DataSourceResult<T>['errors'] = [];

  for (const url of urls) {
    const providerErrorsStart = errors.length;

    if (Date.now() >= deadlineAt) {
      errors.push({
        code: 'result_truncated',
        message: 'Explorer failover budget expired before another provider could be verified.',
      });
      break;
    }

    if (options.useBlockRangeSplitting) {
      const rangeResultLimit = providerResultLimit(url, resultLimit);
      const rangeResult = await fetchProviderByBlockRange<T>(
        url,
        rangeResultLimit,
        options.endBlock ?? 999_999_999,
        { fetcher, maxAttempts, backoffBaseMs, backoffJitterMs, maxPages, maxRangeRequests, rangeConcurrency, requestTimeoutMs },
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
    let exhausted = false;
    let providerFailed = false;

    for (let page = 1; page <= maxPages && !providerFailed && !exhausted; page++) {
      if (Date.now() >= deadlineAt) {
        errors.push({
          code: 'result_truncated',
          message: 'Explorer pagination budget expired before full exhaustion.',
        });
        providerFailed = true;
        break;
      }
      const pageResult = await fetchExplorerPage<T>(
        url,
        page,
        resultLimit,
        { fetcher, maxAttempts, backoffBaseMs, backoffJitterMs, requestTimeoutMs },
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

      if (dedupedResults.length === beforeCount) {
        errors.push({
          code: 'provider_error',
          message: `Provider pagination looped without yielding new records on page ${page}.`,
        });
        providerFailed = true;
        break;
      }
    }

    if (exhausted) {
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
  const endBlock = options.endBlock ?? await getLatestBlockNumber(chainId) ?? 999_999_999;
  return await fetchExplorerData<EtherscanTransaction>(urls, offset, {
    ...options,
    endBlock,
    useBlockRangeSplitting: options.useBlockRangeSplitting ?? true,
  });
}

export async function fetchTokenTransfers(
  address: string,
  chainId: number,
  apiKey?: string,
  offset = 1000,
  options: ExplorerFetchOptions = {},
): Promise<DataSourceResult<EtherscanTokenTransfer>> {
  const urls = buildCandidateUrls(address, chainId, 'tokentx', apiKey);
  const endBlock = options.endBlock ?? await getLatestBlockNumber(chainId) ?? 999_999_999;
  return await fetchExplorerData<EtherscanTokenTransfer>(urls, offset, {
    ...options,
    endBlock,
    useBlockRangeSplitting: options.useBlockRangeSplitting ?? true,
  });
}

export async function fetchInternalTransactions(
  address: string,
  chainId: number,
  apiKey?: string,
  offset = 500,
  options: ExplorerFetchOptions = {},
): Promise<DataSourceResult<EtherscanInternalTransaction>> {
  const urls = buildCandidateUrls(address, chainId, 'txlistinternal', apiKey);
  const endBlock = options.endBlock ?? await getLatestBlockNumber(chainId) ?? 999_999_999;
  return await fetchExplorerData<EtherscanInternalTransaction>(urls, offset, {
    ...options,
    endBlock,
    useBlockRangeSplitting: options.useBlockRangeSplitting ?? true,
  });
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
