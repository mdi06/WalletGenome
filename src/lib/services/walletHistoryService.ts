import {
  fetchInternalTransactions,
  fetchNormalTransactions,
  fetchTokenTransfers,
} from '@/lib/etherscan';
import {
  createMoralisQuotaBudget,
  fetchMoralisInternalTransactions,
  fetchMoralisTokenTransfers,
  fetchMoralisTransactions,
  MoralisQuotaBudget,
} from '@/lib/moralis';
import {
  DataAvailabilityStatus,
  DataSourceResult,
  EtherscanInternalTransaction,
  EtherscanTokenTransfer,
  EtherscanTransaction,
} from '@/lib/types';
import { sharedCache } from '@/lib/cache';
import { PERSISTENCE_POLICY } from '@/lib/persistencePolicy';
import type { CacheSource } from '@/lib/types';
import { throwIfAborted } from '@/lib/cancellation';

const EXPLORER_HISTORY_BUDGET_MS = 150_000;
const MORALIS_FALLBACK_BUDGET_MS = 60_000;
const HISTORY_CACHE_VERSION = 'v1';

export type HistoryDatasetName = 'transactions' | 'tokenTransfers' | 'internalTransactions';

export interface HistoryDatasetCacheMetadata {
  fetchedAt: number;
  source: CacheSource;
}

export interface WalletHistoryCacheMetadata {
  datasets: Partial<Record<HistoryDatasetName, HistoryDatasetCacheMetadata>>;
}

export interface WalletHistorySources {
  transactions: DataSourceResult<EtherscanTransaction>;
  tokenTransfers: DataSourceResult<EtherscanTokenTransfer>;
  internalTransactions: DataSourceResult<EtherscanInternalTransaction>;
  cacheMetadata?: WalletHistoryCacheMetadata;
}

export interface WalletHistoryCacheOptions {
  cacheReadEnabled?: boolean;
  cacheWriteEnabled?: boolean;
  signal?: AbortSignal;
  onDatasetComplete?: (progress: {
    chainId: number;
    dataset: HistoryDatasetName;
    source: 'explorer' | 'moralis';
    status: DataAvailabilityStatus;
  }) => void;
}

type MoralisDatasetFetcher<T> = (
  address: string,
  chainId: number,
  quotaBudget: MoralisQuotaBudget,
  maxDurationMs: number,
  signal?: AbortSignal,
) => Promise<DataSourceResult<T> | null>;

export interface WalletHistoryServiceOptions {
  quotaBudget?: MoralisQuotaBudget;
  explorerFetcher?: (
    address: string,
    chainId: number,
    apiKey: string,
    signal?: AbortSignal,
  ) => Promise<WalletHistorySources>;
  moralisTransactionsFetcher?: MoralisDatasetFetcher<EtherscanTransaction>;
  moralisTokenTransfersFetcher?: MoralisDatasetFetcher<EtherscanTokenTransfer>;
  moralisInternalTransactionsFetcher?: MoralisDatasetFetcher<EtherscanInternalTransaction>;
  cacheReadEnabled?: boolean;
  cacheWriteEnabled?: boolean;
  signal?: AbortSignal;
  onDatasetComplete?: WalletHistoryCacheOptions['onDatasetComplete'];
}

function historyCacheKey(
  provider: 'explorer' | 'moralis',
  address: string,
  chainId: number,
  dataset: HistoryDatasetName,
): string {
  return `wallet-analytics:${HISTORY_CACHE_VERSION}:history:${provider}:${address.toLowerCase()}:${chainId}:${dataset}`;
}

interface CachedDatasetResult<T> {
  result: DataSourceResult<T> | null;
  metadata?: HistoryDatasetCacheMetadata;
}

function unavailableDataset<T>(): DataSourceResult<T> {
  return {
    data: [],
    status: 'unavailable',
    errors: [{ code: 'provider_error', message: 'No fallback dataset was available.' }],
  };
}

async function fetchDatasetWithCache<T>(
  key: string,
  fetcher: () => Promise<DataSourceResult<T> | null>,
  cacheReadEnabled: boolean,
  cacheWriteEnabled: boolean,
  signal?: AbortSignal,
): Promise<CachedDatasetResult<T>> {
  throwIfAborted(signal);
  if (cacheReadEnabled) {
    const cached = await sharedCache.get<DataSourceResult<T>>(
      key,
      PERSISTENCE_POLICY.caches.historyDatasetTtlSeconds,
      signal,
    );
    if (cached?.value.status === 'complete') {
      return {
        result: cached.value,
        metadata: { fetchedAt: cached.fetchedAt, source: cached.source },
      };
    }
  }

  const result = await fetcher();
  throwIfAborted(signal);
  if (!result || result.status !== 'complete') return { result };

  const fetchedAt = Date.now();
  if (cacheWriteEnabled) {
    await sharedCache.set(
      key,
      result,
      PERSISTENCE_POLICY.caches.historyDatasetTtlSeconds,
      fetchedAt,
      signal,
    );
  }
  return { result, metadata: { fetchedAt, source: 'live' } };
}

function historyMetadata(
  datasets: Array<[HistoryDatasetName, HistoryDatasetCacheMetadata | undefined]>,
): WalletHistoryCacheMetadata | undefined {
  const entries = datasets.reduce<Partial<Record<HistoryDatasetName, HistoryDatasetCacheMetadata>>>(
    (result, [dataset, metadata]) => {
      if (metadata) result[dataset] = metadata;
      return result;
    },
    {},
  );
  return Object.keys(entries).length > 0 ? { datasets: entries } : undefined;
}

function mergeHistoryMetadata(
  primary: WalletHistoryCacheMetadata | undefined,
  updates: Array<[HistoryDatasetName, HistoryDatasetCacheMetadata | undefined]>,
): WalletHistoryCacheMetadata | undefined {
  const datasets: Partial<Record<HistoryDatasetName, HistoryDatasetCacheMetadata>> = {
    ...(primary?.datasets ?? {}),
  };
  for (const [dataset, metadata] of updates) {
    if (metadata) datasets[dataset] = metadata;
  }
  return Object.keys(datasets).length > 0 ? { datasets } : undefined;
}

function mergeErrors<T>(
  primary: DataSourceResult<T>,
  fallback: DataSourceResult<T>,
): DataSourceResult<T>['errors'] {
  const unique = new Map<string, DataSourceResult<T>['errors'][number]>();
  for (const error of [...primary.errors, ...fallback.errors]) {
    unique.set(`${error.code}:${error.message}`, error);
  }
  return [...unique.values()];
}

function mergeIncompleteResults<T>(
  primary: DataSourceResult<T>,
  fallback: DataSourceResult<T> | null,
  keyFor: (record: T) => string,
): DataSourceResult<T> {
  if (primary.status === 'complete' || !fallback) return primary;
  if (fallback.status === 'complete') return fallback;

  const records = new Map<string, T>();
  for (const record of [...primary.data, ...fallback.data]) {
    const key = keyFor(record);
    if (!records.has(key)) records.set(key, record);
  }

  const data = [...records.values()];
  return {
    data,
    status: data.length > 0 ? 'partial' : 'unavailable',
    errors: mergeErrors(primary, fallback),
  };
}

export async function fetchExplorerHistorySources(
  address: string,
  chainId: number,
  apiKey: string,
  cacheOptions: WalletHistoryCacheOptions = {},
): Promise<WalletHistorySources> {
  const cacheReadEnabled = cacheOptions.cacheReadEnabled ?? !apiKey;
  const cacheWriteEnabled = cacheOptions.cacheWriteEnabled ?? !apiKey;
  const options = {
    maxDurationMs: EXPLORER_HISTORY_BUDGET_MS,
    signal: cacheOptions.signal,
  };
  const fetchDataset = async <T>(
    dataset: HistoryDatasetName,
    operation: () => Promise<CachedDatasetResult<T>>,
  ): Promise<CachedDatasetResult<T>> => {
    const result = await operation();
    cacheOptions.onDatasetComplete?.({
      chainId,
      dataset,
      source: 'explorer',
      status: result.result?.status ?? 'unavailable',
    });
    return result;
  };
  const [transactions, tokenTransfers, internalTransactions] = await Promise.all([
    fetchDataset('transactions', () => fetchDatasetWithCache(
      historyCacheKey('explorer', address, chainId, 'transactions'),
      () => fetchNormalTransactions(address, chainId, apiKey, 1_000, options),
      cacheReadEnabled,
      cacheWriteEnabled,
      cacheOptions.signal,
    )),
    fetchDataset('tokenTransfers', () => fetchDatasetWithCache(
      historyCacheKey('explorer', address, chainId, 'tokenTransfers'),
      () => fetchTokenTransfers(address, chainId, apiKey, 1_000, options),
      cacheReadEnabled,
      cacheWriteEnabled,
      cacheOptions.signal,
    )),
    fetchDataset('internalTransactions', () => fetchDatasetWithCache(
      historyCacheKey('explorer', address, chainId, 'internalTransactions'),
      () => fetchInternalTransactions(address, chainId, apiKey, 500, options),
      cacheReadEnabled,
      cacheWriteEnabled,
      cacheOptions.signal,
    )),
  ]);
  return {
    transactions: transactions.result ?? unavailableDataset<EtherscanTransaction>(),
    tokenTransfers: tokenTransfers.result ?? unavailableDataset<EtherscanTokenTransfer>(),
    internalTransactions: internalTransactions.result ?? unavailableDataset<EtherscanInternalTransaction>(),
    cacheMetadata: historyMetadata([
      ['transactions', transactions.metadata],
      ['tokenTransfers', tokenTransfers.metadata],
      ['internalTransactions', internalTransactions.metadata],
    ]),
  };
}

export function isWalletHistoryComplete(history: WalletHistorySources): boolean {
  return history.transactions.status === 'complete'
    && history.tokenTransfers.status === 'complete'
    && history.internalTransactions.status === 'complete';
}

function defaultMoralisTransactionsFetcher(
  address: string,
  chainId: number,
  quotaBudget: MoralisQuotaBudget,
  maxDurationMs: number,
  signal?: AbortSignal,
): Promise<DataSourceResult<EtherscanTransaction> | null> {
  return fetchMoralisTransactions(address, chainId, { quotaBudget, maxDurationMs, signal });
}

function defaultMoralisTokenTransfersFetcher(
  address: string,
  chainId: number,
  quotaBudget: MoralisQuotaBudget,
  maxDurationMs: number,
  signal?: AbortSignal,
): Promise<DataSourceResult<EtherscanTokenTransfer> | null> {
  return fetchMoralisTokenTransfers(address, chainId, { quotaBudget, maxDurationMs, signal });
}

function defaultMoralisInternalTransactionsFetcher(
  address: string,
  chainId: number,
  quotaBudget: MoralisQuotaBudget,
  maxDurationMs: number,
  signal?: AbortSignal,
): Promise<DataSourceResult<EtherscanInternalTransaction> | null> {
  return fetchMoralisInternalTransactions(address, chainId, { quotaBudget, maxDurationMs, signal });
}

export async function fetchWalletHistorySources(
  address: string,
  chainId: number,
  etherscanApiKey = '',
  options: WalletHistoryServiceOptions = {},
): Promise<WalletHistorySources> {
  const cacheReadEnabled = options.cacheReadEnabled ?? !options.explorerFetcher;
  const cacheWriteEnabled = options.cacheWriteEnabled ?? !options.explorerFetcher;
  const explorer = options.explorerFetcher
    ? await options.explorerFetcher(address, chainId, etherscanApiKey, options.signal)
    : await fetchExplorerHistorySources(address, chainId, etherscanApiKey, {
      cacheReadEnabled,
      cacheWriteEnabled,
      signal: options.signal,
      onDatasetComplete: options.onDatasetComplete,
    });

  // This is the core quota invariant: successful indexed explorers end the
  // provider pipeline without touching Moralis.
  return applyWalletHistoryFallback(address, chainId, explorer, {
    ...options,
    cacheReadEnabled,
    cacheWriteEnabled,
  });
}

export async function applyWalletHistoryFallback(
  address: string,
  chainId: number,
  explorer: WalletHistorySources,
  options: Omit<WalletHistoryServiceOptions, 'explorerFetcher'> = {},
): Promise<WalletHistorySources> {
  throwIfAborted(options.signal);
  // This is the core quota invariant: successful indexed explorers end the
  // provider pipeline without touching Moralis.
  if (isWalletHistoryComplete(explorer)) return explorer;

  const quotaBudget = options.quotaBudget ?? createMoralisQuotaBudget();
  const transactionsFetcher = options.moralisTransactionsFetcher ?? defaultMoralisTransactionsFetcher;
  const tokenTransfersFetcher = options.moralisTokenTransfersFetcher ?? defaultMoralisTokenTransfersFetcher;
  const internalTransactionsFetcher = options.moralisInternalTransactionsFetcher
    ?? defaultMoralisInternalTransactionsFetcher;
  const cacheReadEnabled = options.cacheReadEnabled ?? true;
  const cacheWriteEnabled = options.cacheWriteEnabled ?? true;
  const fallbackDeadlineAt = Date.now() + MORALIS_FALLBACK_BUDGET_MS;
  const remainingFallbackBudgetMs = (): number => Math.max(0, fallbackDeadlineAt - Date.now());

  // Run fallback datasets in product-value order against the shared CU cap.
  // Parallel requests make whichever promise reserves quota first win, which
  // can starve normal wallet history while spending the same total allowance.
  const transactionsFallback = explorer.transactions.status === 'complete'
    ? null
    : await fetchDatasetWithCache(
        historyCacheKey('moralis', address, chainId, 'transactions'),
        () => transactionsFetcher(address, chainId, quotaBudget, remainingFallbackBudgetMs(), options.signal),
        cacheReadEnabled,
        cacheWriteEnabled,
        options.signal,
      );
  const tokenTransfersFallback = explorer.tokenTransfers.status === 'complete'
    ? null
    : await fetchDatasetWithCache(
        historyCacheKey('moralis', address, chainId, 'tokenTransfers'),
        () => tokenTransfersFetcher(address, chainId, quotaBudget, remainingFallbackBudgetMs(), options.signal),
        cacheReadEnabled,
        cacheWriteEnabled,
        options.signal,
      );
  const internalTransactionsFallback = explorer.internalTransactions.status === 'complete'
    ? null
    : await fetchDatasetWithCache(
        historyCacheKey('moralis', address, chainId, 'internalTransactions'),
        () => internalTransactionsFetcher(address, chainId, quotaBudget, remainingFallbackBudgetMs(), options.signal),
        cacheReadEnabled,
        cacheWriteEnabled,
        options.signal,
      );

  for (const [dataset, result] of [
    ['transactions', transactionsFallback],
    ['tokenTransfers', tokenTransfersFallback],
    ['internalTransactions', internalTransactionsFallback],
  ] as const) {
    if (result) {
      options.onDatasetComplete?.({
        chainId,
        dataset,
        source: 'moralis',
        status: result.result?.status ?? 'unavailable',
      });
    }
  }

  return {
    transactions: mergeIncompleteResults(
      explorer.transactions,
      transactionsFallback?.result ?? null,
      transaction => transaction.hash,
    ),
    tokenTransfers: mergeIncompleteResults(
      explorer.tokenTransfers,
      tokenTransfersFallback?.result ?? null,
      transfer => `${transfer.hash}:${transfer.logIndex ?? ''}:${transfer.contractAddress}:${transfer.from}:${transfer.to}:${transfer.value}`,
    ),
    internalTransactions: mergeIncompleteResults(
      explorer.internalTransactions,
      internalTransactionsFallback?.result ?? null,
      transaction => `${transaction.hash}:${transaction.traceId}:${transaction.from}:${transaction.to}:${transaction.value}`,
    ),
    cacheMetadata: mergeHistoryMetadata(explorer.cacheMetadata, [
      ['transactions', transactionsFallback?.metadata],
      ['tokenTransfers', tokenTransfersFallback?.metadata],
      ['internalTransactions', internalTransactionsFallback?.metadata],
    ]),
  };
}
