import { getDomainLimiter } from './cache';
import {
  DataSourceResult,
  EtherscanInternalTransaction,
  EtherscanTokenTransfer,
  EtherscanTransaction,
  ProviderErrorCode,
} from './types';

const MORALIS_BASE_URL = 'https://deep-index.moralis.io/api/v2.2';
const MORALIS_HOSTNAME = 'deep-index.moralis.io';
const DEFAULT_MORALIS_SCAN_CU_BUDGET = 3_000;

const MORALIS_CHAINS: Record<number, string> = {
  1: 'eth',
  10: 'optimism',
  8453: 'base',
  42161: 'arbitrum',
};

type MoralisFetcher = (
  url: string,
  apiKey: string,
  timeoutMs: number,
) => Promise<Response>;

export interface MoralisFetchOptions {
  apiKey?: string;
  fetcher?: MoralisFetcher;
  quotaBudget?: MoralisQuotaBudget;
  requestTimeoutMs?: number;
  maxAttempts?: number;
  maxPages?: number;
  maxDurationMs?: number;
  backoffBaseMs?: number;
}

interface MoralisPage {
  records: Record<string, unknown>[];
  cursor: string | null;
}

interface MoralisDatasetSpec<T> {
  pathFor(address: string): string;
  computeUnits: number;
  configureUrl?(url: URL): void;
  normalize(records: Record<string, unknown>[], walletAddress: string): T[];
  label: string;
}

export class MoralisQuotaBudget {
  private usedComputeUnits = 0;
  private blockedReason: string | null = null;

  constructor(readonly maxComputeUnits: number) {}

  tryReserve(computeUnits: number): boolean {
    if (this.blockedReason || computeUnits <= 0) return false;
    if (this.usedComputeUnits + computeUnits > this.maxComputeUnits) return false;
    this.usedComputeUnits += computeUnits;
    return true;
  }

  block(reason: string): void {
    this.blockedReason = reason;
  }

  get used(): number {
    return this.usedComputeUnits;
  }

  get remaining(): number {
    return Math.max(0, this.maxComputeUnits - this.usedComputeUnits);
  }

  get blocked(): boolean {
    return this.blockedReason !== null;
  }

  get blockReason(): string | null {
    return this.blockedReason;
  }
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function createMoralisQuotaBudget(maxComputeUnits?: number): MoralisQuotaBudget {
  const configured = maxComputeUnits ?? positiveInteger(
    process.env.MORALIS_MAX_FALLBACK_CU_PER_SCAN,
    DEFAULT_MORALIS_SCAN_CU_BUDGET,
  );
  return new MoralisQuotaBudget(configured);
}

function isUsableApiKey(value: string | undefined): value is string {
  if (!value) return false;
  const compact = value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return compact.length >= 8
    && compact !== 'yourmoralisapikeyhere'
    && compact !== 'yourmoralisapikey'
    && compact !== 'yourapikeyhere'
    && !compact.includes('placeholder');
}

export function getMoralisApiKey(override?: string): string | undefined {
  if (isUsableApiKey(override)) return override;
  return isUsableApiKey(process.env.MORALIS_API_KEY)
    ? process.env.MORALIS_API_KEY
    : undefined;
}

export function hasMoralisApiKey(): boolean {
  return getMoralisApiKey() !== undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : String(value);
}

function readArray(record: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const value = record[key];
  if (!Array.isArray(value)) return [];
  return value.map(asRecord).filter((item): item is Record<string, unknown> => item !== null);
}

function timestampSeconds(value: string): string {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? String(Math.floor(timestamp / 1000)) : '';
}

function methodId(input: string): string {
  return input.startsWith('0x') && input.length >= 10 ? input.slice(0, 10) : '';
}

function normalizeNormalTransaction(
  record: Record<string, unknown>,
  walletAddress: string,
): EtherscanTransaction | null {
  const from = readString(record, 'from_address');
  const to = readString(record, 'to_address');
  const lowerWallet = walletAddress.toLowerCase();
  if (from.toLowerCase() !== lowerWallet && to.toLowerCase() !== lowerWallet) return null;

  const input = readString(record, 'input');
  const receiptStatus = readString(record, 'receipt_status');
  const decodedCall = asRecord(record.decoded_call);
  return {
    blockNumber: readString(record, 'block_number'),
    timeStamp: timestampSeconds(readString(record, 'block_timestamp')),
    hash: readString(record, 'hash'),
    nonce: readString(record, 'nonce'),
    blockHash: readString(record, 'block_hash'),
    transactionIndex: readString(record, 'transaction_index'),
    from,
    to,
    value: readString(record, 'value') || '0',
    gas: readString(record, 'gas'),
    gasPrice: readString(record, 'gas_price'),
    isError: receiptStatus === '0' ? '1' : '0',
    txreceipt_status: receiptStatus,
    input,
    contractAddress: readString(record, 'receipt_contract_address'),
    cumulativeGasUsed: readString(record, 'receipt_cumulative_gas_used'),
    gasUsed: readString(record, 'receipt_gas_used'),
    confirmations: '0',
    methodId: methodId(input),
    functionName: decodedCall ? readString(decodedCall, 'label') : readString(record, 'method_label'),
  };
}

function normalizeTokenTransfer(
  transfer: Record<string, unknown>,
  walletAddress: string,
): EtherscanTokenTransfer | null {
  const from = readString(transfer, 'from_address');
  const to = readString(transfer, 'to_address');
  const lowerWallet = walletAddress.toLowerCase();
  if (from.toLowerCase() !== lowerWallet && to.toLowerCase() !== lowerWallet) return null;

  return {
    blockNumber: readString(transfer, 'block_number'),
    timeStamp: timestampSeconds(readString(transfer, 'block_timestamp')),
    hash: readString(transfer, 'transaction_hash'),
    nonce: '',
    blockHash: readString(transfer, 'block_hash'),
    from,
    contractAddress: readString(transfer, 'address'),
    to,
    value: readString(transfer, 'value') || '0',
    tokenName: readString(transfer, 'token_name'),
    tokenSymbol: readString(transfer, 'token_symbol'),
    tokenDecimal: readString(transfer, 'token_decimals') || '18',
    transactionIndex: readString(transfer, 'transaction_index'),
    logIndex: readString(transfer, 'log_index'),
    gas: '',
    gasPrice: '',
    gasUsed: '',
    cumulativeGasUsed: '',
    input: '',
    confirmations: '0',
  };
}

function normalizeInternalTransactions(
  parent: Record<string, unknown>,
  walletAddress: string,
): EtherscanInternalTransaction[] {
  const lowerWallet = walletAddress.toLowerCase();
  const parentHash = readString(parent, 'hash');
  const parentBlock = readString(parent, 'block_number');
  const parentTimestamp = timestampSeconds(readString(parent, 'block_timestamp'));

  return readArray(parent, 'internal_transactions')
    .filter(transaction => {
      const from = readString(transaction, 'from') || readString(transaction, 'from_address');
      const to = readString(transaction, 'to') || readString(transaction, 'to_address');
      return from.toLowerCase() === lowerWallet || to.toLowerCase() === lowerWallet;
    })
    .map((transaction, index) => {
      const error = readString(transaction, 'error');
      return {
        blockNumber: readString(transaction, 'block_number') || parentBlock,
        timeStamp: timestampSeconds(readString(transaction, 'block_timestamp')) || parentTimestamp,
        hash: readString(transaction, 'transaction_hash') || parentHash,
        from: readString(transaction, 'from') || readString(transaction, 'from_address'),
        to: readString(transaction, 'to') || readString(transaction, 'to_address'),
        value: readString(transaction, 'value') || '0',
        contractAddress: readString(transaction, 'contract_address'),
        input: readString(transaction, 'input'),
        type: readString(transaction, 'type'),
        gas: readString(transaction, 'gas'),
        gasUsed: readString(transaction, 'gas_used'),
        traceId: readString(transaction, 'trace_id') || `${parentHash}:${index}`,
        isError: error ? '1' : '0',
        errCode: error,
      };
    });
}

function dedupeBy<T>(records: T[], keyFor: (record: T) => string): T[] {
  const unique = new Map<string, T>();
  for (const record of records) {
    const key = keyFor(record);
    if (!unique.has(key)) unique.set(key, record);
  }
  return [...unique.values()];
}

async function defaultFetcher(url: string, apiKey: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'WalletGenome/2.0',
        'X-API-Key': apiKey,
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function providerErrorCode(error: unknown): ProviderErrorCode {
  return error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'provider_error';
}

function sleep(ms: number): Promise<void> {
  return ms > 0 ? new Promise(resolve => setTimeout(resolve, ms)) : Promise.resolve();
}

async function responseBody(response: Response): Promise<string> {
  return response.clone().text().catch(() => '');
}

async function fetchMoralisPage(
  url: string,
  apiKey: string,
  computeUnits: number,
  quotaBudget: MoralisQuotaBudget,
  options: Required<Pick<MoralisFetchOptions,
    'fetcher' | 'requestTimeoutMs' | 'maxAttempts' | 'backoffBaseMs'>>,
): Promise<{ page: MoralisPage | null; code?: ProviderErrorCode; message?: string }> {
  const limiter = getDomainLimiter(MORALIS_HOSTNAME, 4);

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    if (quotaBudget.blocked) {
      return {
        page: null,
        code: 'quota_exhausted',
        message: quotaBudget.blockReason ?? 'Moralis account quota is exhausted.',
      };
    }
    if (!quotaBudget.tryReserve(computeUnits)) {
      return {
        page: null,
        code: 'quota_exhausted',
        message: `Moralis fallback stopped before exceeding the ${quotaBudget.maxComputeUnits}-CU scan budget.`,
      };
    }

    try {
      const acquired = await limiter.acquire(5_000);
      if (!acquired) {
        return {
          page: null,
          code: 'rate_limited',
          message: 'Moralis could not schedule the fallback request within its provider budget.',
        };
      }

      const response = await options.fetcher(url, apiKey, options.requestTimeoutMs);
      if (!response.ok) {
        const body = (await responseBody(response)).toLowerCase();
        const quotaExhausted = body.includes('quota')
          || body.includes('included usage has been consumed')
          || body.includes('daily limit');
        const code: ProviderErrorCode = quotaExhausted
          ? 'quota_exhausted'
          : response.status === 429
            ? 'rate_limited'
            : 'http_error';
        if (quotaExhausted) quotaBudget.block('Moralis account quota is exhausted.');
        if (attempt < options.maxAttempts && !quotaExhausted && (response.status === 429 || response.status >= 500)) {
          const retryAfterSeconds = Number(response.headers.get('retry-after'));
          await sleep(Number.isFinite(retryAfterSeconds)
            ? Math.max(0, retryAfterSeconds * 1000)
            : attempt * options.backoffBaseMs);
          continue;
        }
        return {
          page: null,
          code,
          message: quotaExhausted
            ? 'Moralis reported that the account quota is exhausted.'
            : `Moralis returned HTTP ${response.status} while loading fallback data.`,
        };
      }

      const payload: unknown = await response.json().catch(() => null);
      const record = asRecord(payload);
      if (!record || !Array.isArray(record.result)) {
        return {
          page: null,
          code: 'invalid_response',
          message: 'Moralis returned an unrecognized fallback response.',
        };
      }

      const records = record.result
        .map(asRecord)
        .filter((item): item is Record<string, unknown> => item !== null);
      const rawCursor = record.cursor;
      const cursor = typeof rawCursor === 'string' && rawCursor.length > 0 ? rawCursor : null;
      return { page: { records, cursor } };
    } catch (error) {
      if (attempt < options.maxAttempts) {
        await sleep(attempt * options.backoffBaseMs);
        continue;
      }
      return {
        page: null,
        code: providerErrorCode(error),
        message: 'Moralis could not complete the fallback request.',
      };
    }
  }

  return { page: null, code: 'provider_error', message: 'Moralis fallback request failed.' };
}

function unavailable<T>(code: ProviderErrorCode, message: string): DataSourceResult<T> {
  return { data: [], status: 'unavailable', errors: [{ code, message }] };
}

async function fetchMoralisDataset<T>(
  address: string,
  chainId: number,
  spec: MoralisDatasetSpec<T>,
  keyFor: (record: T) => string,
  options: MoralisFetchOptions = {},
): Promise<DataSourceResult<T> | null> {
  const apiKey = getMoralisApiKey(options.apiKey);
  if (!apiKey) return null;

  const chain = MORALIS_CHAINS[chainId];
  if (!chain) {
    return unavailable('unsupported_chain', `Moralis does not support configured chain ${chainId}.`);
  }

  const fetcher = options.fetcher ?? defaultFetcher;
  const requestTimeoutMs = options.requestTimeoutMs ?? 12_000;
  const maxAttempts = options.maxAttempts ?? 2;
  const maxPages = options.maxPages ?? positiveInteger(process.env.MORALIS_MAX_PAGES_PER_DATASET, 100);
  const backoffBaseMs = options.backoffBaseMs ?? 500;
  const quotaBudget = options.quotaBudget ?? createMoralisQuotaBudget();
  const deadlineAt = Date.now() + (options.maxDurationMs ?? 60_000);
  const records: T[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | null = null;
  let complete = false;
  let failure: { code: ProviderErrorCode; message: string } | null = null;

  for (let page = 1; page <= maxPages; page += 1) {
    if (Date.now() >= deadlineAt) {
      failure = {
        code: 'result_truncated',
        message: `Moralis ${spec.label} fallback expired before cursor exhaustion.`,
      };
      break;
    }

    const url = new URL(`${MORALIS_BASE_URL}${spec.pathFor(address)}`);
    url.searchParams.set('chain', chain);
    url.searchParams.set('order', 'ASC');
    url.searchParams.set('limit', '100');
    spec.configureUrl?.(url);
    if (cursor) url.searchParams.set('cursor', cursor);

    const result = await fetchMoralisPage(
      url.toString(),
      apiKey,
      spec.computeUnits,
      quotaBudget,
      { fetcher, requestTimeoutMs, maxAttempts, backoffBaseMs },
    );
    if (!result.page) {
      failure = {
        code: result.code ?? 'provider_error',
        message: result.message ?? `Moralis ${spec.label} fallback failed.`,
      };
      break;
    }

    records.push(...spec.normalize(result.page.records, address));
    if (!result.page.cursor) {
      complete = true;
      break;
    }
    if (seenCursors.has(result.page.cursor)) {
      failure = {
        code: 'invalid_response',
        message: `Moralis repeated a ${spec.label} cursor before proving exhaustion.`,
      };
      break;
    }
    seenCursors.add(result.page.cursor);
    cursor = result.page.cursor;
  }

  if (!complete && !failure) {
    failure = {
      code: 'result_truncated',
      message: `Moralis exceeded the ${maxPages}-page ${spec.label} limit before proving exhaustion.`,
    };
  }

  const data = dedupeBy(records, keyFor);
  if (data.length === 0 && !complete) {
    return unavailable(
      failure?.code ?? 'provider_error',
      failure?.message ?? `Moralis ${spec.label} fallback is unavailable.`,
    );
  }

  return {
    data,
    status: complete ? 'complete' : 'partial',
    errors: failure ? [failure] : [],
  };
}

export function fetchMoralisTransactions(
  address: string,
  chainId: number,
  options: MoralisFetchOptions = {},
): Promise<DataSourceResult<EtherscanTransaction> | null> {
  return fetchMoralisDataset(
    address,
    chainId,
    {
      pathFor: wallet => `/${wallet}`,
      computeUnits: 30,
      label: 'normal-transaction',
      normalize: (records, wallet) => records
        .map(record => normalizeNormalTransaction(record, wallet))
        .filter((record): record is EtherscanTransaction => record !== null && record.hash.length > 0),
    },
    transaction => transaction.hash,
    options,
  );
}

export function fetchMoralisTokenTransfers(
  address: string,
  chainId: number,
  options: MoralisFetchOptions = {},
): Promise<DataSourceResult<EtherscanTokenTransfer> | null> {
  return fetchMoralisDataset(
    address,
    chainId,
    {
      pathFor: wallet => `/${wallet}/erc20/transfers`,
      computeUnits: 50,
      label: 'ERC-20-transfer',
      normalize: (records, wallet) => records
        .map(record => normalizeTokenTransfer(record, wallet))
        .filter((record): record is EtherscanTokenTransfer => record !== null && record.hash.length > 0),
    },
    transfer => `${transfer.hash}:${transfer.logIndex ?? ''}:${transfer.contractAddress}:${transfer.from}:${transfer.to}:${transfer.value}`,
    options,
  );
}

export function fetchMoralisInternalTransactions(
  address: string,
  chainId: number,
  options: MoralisFetchOptions = {},
): Promise<DataSourceResult<EtherscanInternalTransaction> | null> {
  return fetchMoralisDataset(
    address,
    chainId,
    {
      pathFor: wallet => `/${wallet}/verbose`,
      computeUnits: 50,
      label: 'internal-transaction',
      configureUrl: url => url.searchParams.set('include', 'internal_transactions'),
      normalize: (records, wallet) => records.flatMap(record => normalizeInternalTransactions(record, wallet)),
    },
    transaction => `${transaction.hash}:${transaction.traceId}:${transaction.from}:${transaction.to}:${transaction.value}`,
    options,
  );
}
