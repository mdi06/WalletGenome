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
  DataSourceResult,
  EtherscanInternalTransaction,
  EtherscanTokenTransfer,
  EtherscanTransaction,
} from '@/lib/types';

const EXPLORER_HISTORY_BUDGET_MS = 150_000;
const MORALIS_FALLBACK_BUDGET_MS = 60_000;

export interface WalletHistorySources {
  transactions: DataSourceResult<EtherscanTransaction>;
  tokenTransfers: DataSourceResult<EtherscanTokenTransfer>;
  internalTransactions: DataSourceResult<EtherscanInternalTransaction>;
}

type MoralisDatasetFetcher<T> = (
  address: string,
  chainId: number,
  quotaBudget: MoralisQuotaBudget,
  maxDurationMs: number,
) => Promise<DataSourceResult<T> | null>;

export interface WalletHistoryServiceOptions {
  quotaBudget?: MoralisQuotaBudget;
  explorerFetcher?: (
    address: string,
    chainId: number,
    apiKey: string,
  ) => Promise<WalletHistorySources>;
  moralisTransactionsFetcher?: MoralisDatasetFetcher<EtherscanTransaction>;
  moralisTokenTransfersFetcher?: MoralisDatasetFetcher<EtherscanTokenTransfer>;
  moralisInternalTransactionsFetcher?: MoralisDatasetFetcher<EtherscanInternalTransaction>;
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
): Promise<WalletHistorySources> {
  const options = { maxDurationMs: EXPLORER_HISTORY_BUDGET_MS };
  const [transactions, tokenTransfers, internalTransactions] = await Promise.all([
    fetchNormalTransactions(address, chainId, apiKey, 1_000, options),
    fetchTokenTransfers(address, chainId, apiKey, 1_000, options),
    fetchInternalTransactions(address, chainId, apiKey, 500, options),
  ]);
  return { transactions, tokenTransfers, internalTransactions };
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
): Promise<DataSourceResult<EtherscanTransaction> | null> {
  return fetchMoralisTransactions(address, chainId, { quotaBudget, maxDurationMs });
}

function defaultMoralisTokenTransfersFetcher(
  address: string,
  chainId: number,
  quotaBudget: MoralisQuotaBudget,
  maxDurationMs: number,
): Promise<DataSourceResult<EtherscanTokenTransfer> | null> {
  return fetchMoralisTokenTransfers(address, chainId, { quotaBudget, maxDurationMs });
}

function defaultMoralisInternalTransactionsFetcher(
  address: string,
  chainId: number,
  quotaBudget: MoralisQuotaBudget,
  maxDurationMs: number,
): Promise<DataSourceResult<EtherscanInternalTransaction> | null> {
  return fetchMoralisInternalTransactions(address, chainId, { quotaBudget, maxDurationMs });
}

export async function fetchWalletHistorySources(
  address: string,
  chainId: number,
  etherscanApiKey = '',
  options: WalletHistoryServiceOptions = {},
): Promise<WalletHistorySources> {
  const explorer = await (options.explorerFetcher ?? fetchExplorerHistorySources)(
    address,
    chainId,
    etherscanApiKey,
  );

  // This is the core quota invariant: successful indexed explorers end the
  // provider pipeline without touching Moralis.
  return applyWalletHistoryFallback(address, chainId, explorer, options);
}

export async function applyWalletHistoryFallback(
  address: string,
  chainId: number,
  explorer: WalletHistorySources,
  options: Omit<WalletHistoryServiceOptions, 'explorerFetcher'> = {},
): Promise<WalletHistorySources> {
  // This is the core quota invariant: successful indexed explorers end the
  // provider pipeline without touching Moralis.
  if (isWalletHistoryComplete(explorer)) return explorer;

  const quotaBudget = options.quotaBudget ?? createMoralisQuotaBudget();
  const transactionsFetcher = options.moralisTransactionsFetcher ?? defaultMoralisTransactionsFetcher;
  const tokenTransfersFetcher = options.moralisTokenTransfersFetcher ?? defaultMoralisTokenTransfersFetcher;
  const internalTransactionsFetcher = options.moralisInternalTransactionsFetcher
    ?? defaultMoralisInternalTransactionsFetcher;
  const fallbackDeadlineAt = Date.now() + MORALIS_FALLBACK_BUDGET_MS;
  const remainingFallbackBudgetMs = (): number => Math.max(0, fallbackDeadlineAt - Date.now());

  // Run fallback datasets in product-value order against the shared CU cap.
  // Parallel requests make whichever promise reserves quota first win, which
  // can starve normal wallet history while spending the same total allowance.
  const transactionsFallback = explorer.transactions.status === 'complete'
    ? null
    : await transactionsFetcher(address, chainId, quotaBudget, remainingFallbackBudgetMs());
  const tokenTransfersFallback = explorer.tokenTransfers.status === 'complete'
    ? null
    : await tokenTransfersFetcher(address, chainId, quotaBudget, remainingFallbackBudgetMs());
  const internalTransactionsFallback = explorer.internalTransactions.status === 'complete'
    ? null
    : await internalTransactionsFetcher(address, chainId, quotaBudget, remainingFallbackBudgetMs());

  return {
    transactions: mergeIncompleteResults(
      explorer.transactions,
      transactionsFallback,
      transaction => transaction.hash,
    ),
    tokenTransfers: mergeIncompleteResults(
      explorer.tokenTransfers,
      tokenTransfersFallback,
      transfer => `${transfer.hash}:${transfer.logIndex ?? ''}:${transfer.contractAddress}:${transfer.from}:${transfer.to}:${transfer.value}`,
    ),
    internalTransactions: mergeIncompleteResults(
      explorer.internalTransactions,
      internalTransactionsFallback,
      transaction => `${transaction.hash}:${transaction.traceId}:${transaction.from}:${transaction.to}:${transaction.value}`,
    ),
  };
}
