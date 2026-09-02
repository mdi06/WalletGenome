import { batchFetchPrices } from '@/lib/prices';
import { collectPriceRequests, runAnalysis, processInternalTransactions, processTransactions, processTokenTransfers } from '@/lib/scanner';
import { getChainConfig } from '@/lib/chains';
import { loadKnownWallets } from '@/lib/knownWalletsServer';
import { checkSybilStatus } from '@/lib/sybil/sybilService';
import { computeMediaScore } from '@/lib/sybil/mediaScoring';
import { resolveWalletIdentity } from '@/lib/identity/identityService';
import { resolveEnsOrAddress } from '@/lib/ens';
import { scanResultCache, sharedCache } from '@/lib/cache';
import { enforceSharedQuota, mapWithConcurrency } from '@/lib/api/requestPolicy';
import { buildReportingMetrics } from '@/lib/reportingContract';
import { collectWalletClusterEvidence } from '@/lib/clusterAnalysis';
import { PERSISTENCE_POLICY } from '@/lib/persistencePolicy';
import {
  applyWalletHistoryFallback,
  fetchExplorerHistorySources,
  isWalletHistoryComplete,
} from '@/lib/services/walletHistoryService';
import type { WalletHistoryCacheOptions } from '@/lib/services/walletHistoryService';
import { createMoralisQuotaBudget } from '@/lib/moralis';
import {
  ChainDataAvailability,
  DataAvailabilityError,
  DataAvailabilityStatus,
  DataSourceName,
  DataSourceResult,
  EtherscanInternalTransaction,
  EtherscanTokenTransfer,
  EtherscanTransaction,
  PriceProvenanceSummary,
  RiskGrade,
  CachedHistoryDataset,
  WalletScanResponse,
} from '@/lib/types';
import type { HistoryDatasetName } from '@/lib/services/walletHistoryService';
import type { ScanProgressDetail } from '@/lib/scanProgress';
import { throwIfAborted } from '@/lib/cancellation';

// All selected chains run concurrently. Per-provider domain limiters in the
// explorer/RPC clients enforce the actual upstream request budgets.
const CHAIN_SCAN_CONCURRENCY = 5;
const CHAIN_ANALYSIS_CONCURRENCY = 5;

export type ProcessWalletScanProgress = ScanProgressDetail;

interface ProcessWalletScanOptions {
  onProgress?: (progress: ProcessWalletScanProgress) => void;
  forceRefresh?: boolean;
  signal?: AbortSignal;
}

const HISTORY_DATASETS = ['transactions', 'tokenTransfers', 'internalTransactions'] as const satisfies readonly HistoryDatasetName[];
const inFlightScans = new Map<string, Promise<WalletScanResponse>>();

function reportCacheKey(address: string, chains: readonly number[]): string {
  return `wallet-analytics:report:v2:${address.toLowerCase()}:${[...chains].sort((a, b) => a - b).join(',')}`;
}

function reportExpiresAt(response: WalletScanResponse, fetchedAt: number): number {
  const canonicalExpiresAt = fetchedAt + PERSISTENCE_POLICY.caches.scanTtlSeconds * 1000;
  const declaredExpiresAt = response.cacheMetadata?.expiresAt;
  return typeof declaredExpiresAt === 'number' && Number.isFinite(declaredExpiresAt)
    ? Math.min(declaredExpiresAt, canonicalExpiresAt)
    : canonicalExpiresAt;
}

function remainingReportTtlSeconds(response: WalletScanResponse, fetchedAt: number): number {
  return Math.max(0, reportExpiresAt(response, fetchedAt) - Date.now()) / 1000;
}

function cacheReportLocally(cacheKey: string, response: WalletScanResponse, fetchedAt: number): boolean {
  const remainingTtl = remainingReportTtlSeconds(response, fetchedAt);
  if (remainingTtl <= 0) {
    scanResultCache.delete(cacheKey);
    return false;
  }
  scanResultCache.set(cacheKey, response, remainingTtl);
  return true;
}

function withCachedMetadata(
  response: WalletScanResponse,
  source: 'memory' | 'shared',
  fetchedAt: number,
): WalletScanResponse {
  const expiresAt = reportExpiresAt(response, fetchedAt);
  return {
    ...response,
    cached: true,
    cacheMetadata: {
      ...(response.cacheMetadata ?? {
        fetchedAt,
        expiresAt,
        refreshAvailableAt: fetchedAt + PERSISTENCE_POLICY.caches.refreshCooldownSeconds * 1000,
      }),
      fetchedAt,
      source,
      expiresAt,
      refreshAvailableAt: response.cacheMetadata?.refreshAvailableAt
        ?? fetchedAt + PERSISTENCE_POLICY.caches.refreshCooldownSeconds * 1000,
    },
  };
}

function unavailableSource<T>(message: string): DataSourceResult<T> {
  return {
    data: [],
    status: 'unavailable',
    errors: [{ code: 'provider_error', message }],
  };
}

function sourceErrors(
  source: DataSourceName,
  errors: DataSourceResult<unknown>['errors'],
): DataAvailabilityError[] {
  return errors.map(error => ({ source, ...error }));
}

export function summarizeAvailability(availability: ChainDataAvailability[]): DataAvailabilityStatus {
  const explorerStatuses = availability.flatMap(item => [
    item.transactions,
    item.tokenTransfers,
    item.internalTransactions,
  ]);
  if (explorerStatuses.length === 0 || explorerStatuses.every(status => status === 'unavailable')) {
    return 'unavailable';
  }
  return explorerStatuses.every(status => status === 'complete') ? 'complete' : 'partial';
}

export function moralisBudgetPerFallbackChain(totalBudget: number, fallbackChainCount: number): number {
  if (fallbackChainCount <= 0) return totalBudget;
  return Math.max(1, Math.floor(totalBudget / fallbackChainCount));
}

function countHistoryRecords(history: {
  transactions: DataSourceResult<EtherscanTransaction>;
  tokenTransfers: DataSourceResult<EtherscanTokenTransfer>;
  internalTransactions: DataSourceResult<EtherscanInternalTransaction>;
}): number {
  return history.transactions.data.length
    + history.tokenTransfers.data.length
    + history.internalTransactions.data.length;
}

async function runWalletScan(
  address: string,
  chains: number[],
  customApiKey: string = '',
  includeClusterEvidence: boolean = false,
  options: ProcessWalletScanOptions = {},
  historyCacheOptions: WalletHistoryCacheOptions = {},
): Promise<WalletScanResponse> {
  const etherscanKey = customApiKey || '';
  const coingeckoKey = process.env.COINGECKO_API_KEY || '';

  const knownWallets = loadKnownWallets();
  throwIfAborted(options.signal);

  // Fetch wallet identity in parallel with chain data
  // Keep the parallel identity request observed even when another chain
  // aborts first; otherwise a late cancellation rejection becomes unhandled.
  const identityPromise = resolveWalletIdentity(address, options.signal).then(
    identity => ({ ok: true as const, identity }),
    error => ({ ok: false as const, error }),
  );
  let completedChains = 0;
  let queriedChains = 0;
  let recordsFound = 0;
  const completedChainIds: number[] = [];
  const explorerRecordCounts = new Map<number, number>();
  options.onProgress?.({
    phase: 'fetching',
    completedChains,
    queriedChains,
    totalChains: chains.length,
    completedChainIds,
    recordsFound,
  });

  const explorerChainsData = await mapWithConcurrency(
    chains,
    CHAIN_SCAN_CONCURRENCY,
    async (chainId) => {
      let chainName = `Chain ${chainId}`;
      try {
        chainName = getChainConfig(chainId).name;
      } catch {
        const unsupported = {
          code: 'unsupported_chain' as const,
          message: `Chain ${chainId} is not supported by the configured explorer providers.`,
        };
        const unavailableHistory = {
          chainId,
          chainName,
          transactions: { data: [], status: 'unavailable', errors: [unsupported] } as DataSourceResult<EtherscanTransaction>,
          tokenTransfers: { data: [], status: 'unavailable', errors: [unsupported] } as DataSourceResult<EtherscanTokenTransfer>,
          internalTransactions: { data: [], status: 'unavailable', errors: [unsupported] } as DataSourceResult<EtherscanInternalTransaction>,
          cacheMetadata: undefined,
        };
        queriedChains += 1;
        explorerRecordCounts.set(chainId, 0);
        options.onProgress?.({
          phase: 'fetching', completedChains, queriedChains, totalChains: chains.length,
          currentChainId: chainId, currentChainName: chainName,
          completedChainIds: [...completedChainIds], recordsFound,
        });
        return unavailableHistory;
      }

      const history = await fetchExplorerHistorySources(
        address,
        chainId,
        etherscanKey,
        historyCacheOptions,
      ).catch(() => {
        throwIfAborted(options.signal);
        return {
          transactions: unavailableSource<EtherscanTransaction>(`${chainName} transaction data could not be loaded.`),
          tokenTransfers: unavailableSource<EtherscanTokenTransfer>(`${chainName} token transfer data could not be loaded.`),
          internalTransactions: unavailableSource<EtherscanInternalTransaction>(`${chainName} internal transaction data could not be loaded.`),
          cacheMetadata: undefined,
        };
      });
      const { transactions, tokenTransfers, internalTransactions } = history;
      const chainRecordCount = countHistoryRecords(history);
      explorerRecordCounts.set(chainId, chainRecordCount);
      queriedChains += 1;
      recordsFound += chainRecordCount;
      options.onProgress?.({
        phase: 'fetching', completedChains, queriedChains, totalChains: chains.length,
        currentChainId: chainId, currentChainName: chainName,
        completedChainIds: [...completedChainIds], recordsFound,
      });
      return { chainId, chainName, transactions, tokenTransfers, internalTransactions, cacheMetadata: history.cacheMetadata };
    },
    { signal: options.signal },
  );

  const fallbackCandidates = explorerChainsData.filter(chain => !isWalletHistoryComplete(chain));
  const totalMoralisBudget = createMoralisQuotaBudget().maxComputeUnits;
  const perChainMoralisBudget = moralisBudgetPerFallbackChain(
    totalMoralisBudget,
    fallbackCandidates.length,
  );

  // Partition the configured scan budget across only the chains that need a
  // fallback. One noisy or quota-blocked chain cannot consume another chain's
  // local allocation, while total reserved CU remains within the scan cap.
  const rawChainsData = await mapWithConcurrency(
    explorerChainsData,
    CHAIN_SCAN_CONCURRENCY,
    async (chain) => {
      throwIfAborted(options.signal);
      const history = isWalletHistoryComplete(chain)
        ? chain
        : await applyWalletHistoryFallback(address, chain.chainId, chain, {
            quotaBudget: createMoralisQuotaBudget(perChainMoralisBudget),
            ...historyCacheOptions,
          });

      const finalRecordCount = countHistoryRecords(history);
      recordsFound = Math.max(0, recordsFound - (explorerRecordCounts.get(chain.chainId) ?? 0) + finalRecordCount);
      completedChains += 1;
      completedChainIds.push(chain.chainId);
      options.onProgress?.({
        phase: 'fetching',
        completedChains,
        queriedChains,
        totalChains: chains.length,
        currentChainId: chain.chainId,
        currentChainName: chain.chainName,
        completedChainIds: [...completedChainIds],
        recordsFound,
      });

      return { ...chain, ...history };
    },
    { signal: options.signal },
  );

  throwIfAborted(options.signal);
  const identityResult = await identityPromise;
  if (!identityResult.ok) throw identityResult.error;
  const identityReport = identityResult.identity;
  const finishedProgress = {
    completedChains: chains.length,
    queriedChains: chains.length,
    totalChains: chains.length,
    completedChainIds: [...completedChainIds],
    recordsFound,
  };
  options.onProgress?.({ phase: 'pricing', ...finishedProgress });

  // Consolidate price fetching once across all chains with DefiLlama + CoinGecko batching
  const allPriceRequests = rawChainsData.flatMap(chain => (
    chain.transactions.status === 'unavailable' && chain.tokenTransfers.status === 'unavailable'
      ? []
      : collectPriceRequests(chain.transactions.data, chain.tokenTransfers.data, chain.chainId)
  ));
  await batchFetchPrices(allPriceRequests, coingeckoKey, { signal: options.signal }).catch(() => {
    throwIfAborted(options.signal);
    return undefined;
  });

  const availability: ChainDataAvailability[] = rawChainsData.map(chain => {
    return {
      chainId: chain.chainId,
      chainName: chain.chainName,
      transactions: chain.transactions.status,
      tokenTransfers: chain.tokenTransfers.status,
      internalTransactions: chain.internalTransactions.status,
      prices: 'complete' as const,
      errors: [
        ...sourceErrors('transactions', chain.transactions.errors),
        ...sourceErrors('tokenTransfers', chain.tokenTransfers.errors),
        ...sourceErrors('internalTransactions', chain.internalTransactions.errors),
      ],
    };
  });
  options.onProgress?.({ phase: 'analyzing', ...finishedProgress });

  // Run deep analysis in parallel for each chain
  const chainAnalysisResults = await mapWithConcurrency(
    rawChainsData,
    CHAIN_ANALYSIS_CONCURRENCY,
    async ({ chainId, transactions, tokenTransfers, internalTransactions }) => {
      throwIfAborted(options.signal);
      if (
        transactions.status === 'unavailable'
        && tokenTransfers.status === 'unavailable'
        && internalTransactions.status === 'unavailable'
      ) {
        return null;
      }
      const normalTxs = transactions.data;
      const internalTxs = internalTransactions.data;
      const rawTokenTransfers = tokenTransfers.data;
      const analysis = await runAnalysis(normalTxs, rawTokenTransfers, address, chainId, knownWallets, internalTxs);
      const processedTxs = processTransactions(normalTxs, chainId, knownWallets);
      const processedTransfers = processTokenTransfers(rawTokenTransfers, address, chainId, knownWallets);
      const processedInternals = processInternalTransactions(internalTxs, address, chainId, knownWallets);
      return { analysis, processedTxs, processedInternals, processedTransfers };
    },
    { signal: options.signal },
  );

  const validChainData = chainAnalysisResults.filter((r): r is NonNullable<typeof r> => r !== null);
  const validResults = validChainData.map(r => r.analysis);
  const allTransactions = validChainData.flatMap(r => r.processedTxs);
  const allInternalTransactions = validChainData.flatMap(r => r.processedInternals);
  const allTokenTransfers = validChainData.flatMap(r => r.processedTransfers);

  const availabilityRank: Record<DataAvailabilityStatus, number> = {
    complete: 0,
    partial: 1,
    unavailable: 2,
  };
  for (const result of validResults) {
    const chainAvailability = availability.find(item => item.chainId === result.chainId);
    if (!chainAvailability) continue;
    chainAvailability.prices = result.priceProvenance.status;
    if (result.priceProvenance.spotEstimate > 0) {
      chainAvailability.errors.push({
        source: 'prices',
        code: 'spot_estimate',
        message: `${result.priceProvenance.spotEstimate} transaction or transfer valuations used current token prices because date-specific prices were unavailable. These estimates are excluded from verified historical capital flow and definitive historical USD metrics.`,
      });
    }
    if (result.priceProvenance.unpriced > 0) {
      chainAvailability.errors.push({
        source: 'prices',
        code: 'unpriced',
        message: `${result.priceProvenance.unpriced} values could not be priced and remain unavailable.`,
      });
    }
  }

  const status = summarizeAvailability(availability);
  const historyWarnings = availability
    .filter(item => [item.transactions, item.tokenTransfers, item.internalTransactions].some(value => value !== 'complete'))
    .map(item => ({
      chainId: item.chainId,
      chainName: item.chainName,
      message: `${item.chainName} has incomplete history data. Conclusions that require full wallet history are unavailable.`,
    }));
  const priceWarnings = availability
    .filter(item => item.prices !== 'complete')
    .map(item => ({
      chainId: item.chainId,
      chainName: item.chainName,
      message: `${item.chainName} has incomplete historical prices. Verified capital flow includes historically priced legs only; excluded values and coverage are shown separately. Other price-dependent USD metrics may remain unavailable.`,
    }));
  const chainWarnings = [...historyWarnings, ...priceWarnings];

  const GRADE_ORDER: Record<string, number> = { F: 5, D: 4, C: 3, B: 2, A: 1 };
  const worstRiskGrade = validResults.reduce<RiskGrade>((worst, r) => {
    const g = r.riskAssessment?.grade || 'A';
    return (GRADE_ORDER[g] || 1) > (GRADE_ORDER[worst] || 1) ? g : worst;
  }, 'A');

  const ethChains = validResults.filter(r => {
    try {
      return getChainConfig(r.chainId).nativeToken.symbol === 'ETH';
    } catch {
      return true;
    }
  });

  const priceProvenance = validResults.reduce<PriceProvenanceSummary>((summary, result) => {
    summary.historical += result.priceProvenance.historical;
    summary.spotEstimate += result.priceProvenance.spotEstimate;
    summary.stablecoinAssumption += result.priceProvenance.stablecoinAssumption;
    summary.unpriced += result.priceProvenance.unpriced;
    if (availabilityRank[result.priceProvenance.status] > availabilityRank[summary.status]) {
      summary.status = result.priceProvenance.status;
    }
    return summary;
  }, {
    historical: 0,
    spotEstimate: 0,
    stablecoinAssumption: 0,
    unpriced: 0,
    status: 'complete',
  });

  const aggregated = {
    totalGasETH: ethChains.reduce((sum, r) => sum + (r.gasSummary?.totalGasETH || 0), 0),
    totalGasUSD: validResults.reduce((sum, r) => sum + (r.gasSummary?.totalGasUSD || 0), 0),
    totalHighRiskApprovals: validResults.reduce((sum, r) => sum + (r.approvalSummary?.highRiskCount || 0), 0),
    totalUnlimitedApprovals: validResults.reduce((sum, r) => sum + (r.approvalSummary?.unlimitedCount || 0), 0),
    totalTransactions: validResults.reduce((sum, r) => sum + (r.transactionCount || 0), 0),
    worstChainRiskScore: status === 'complete' && validResults.length > 0
      ? Math.max(...validResults.map(r => r.riskAssessment?.score || 0))
      : null,
    worstChainRiskGrade: status === 'complete' ? worstRiskGrade : null,
    priceProvenance,
  };

  const allInboundUSD = validResults.reduce((sum, r) => sum + (r.transferSummary?.totalInboundUSD || 0), 0);
  const allOutboundUSD = validResults.reduce((sum, r) => sum + (r.transferSummary?.totalOutboundUSD || 0), 0);
  const totalVolumeUSD = allInboundUSD + allOutboundUSD;
  const uniqueContracts = validResults.reduce((sum, r) => sum + (r.fingerprint?.uniqueContracts || 0), 0);

  const mediaScore = status === 'complete'
    ? computeMediaScore({
        address,
        transactions: allTransactions,
        tokenTransfers: allTokenTransfers,
        uniqueContractCount: uniqueContracts || 5,
        activeChainsCount: validResults.length,
        totalVolumeUSD,
        totalGasUSD: aggregated.totalGasUSD,
        includeMonetary: priceProvenance.status === 'complete',
      })
    : undefined;
  options.onProgress?.({ phase: 'finalizing', ...finishedProgress });

  // Address-list checks do not depend on explorer or price completeness. The
  // Behavioral scoring requires complete history. When historical prices are
  // incomplete, its monetary dimension is omitted and the remaining behavioral
  // dimensions are reweighted instead of treating a price failure as a Sybil failure.
  const sybilReport = await checkSybilStatus(address, mediaScore, options.signal);
  throwIfAborted(options.signal);

  const metrics = buildReportingMetrics(validResults, status, priceProvenance, sybilReport);

  const historyDatasets: CachedHistoryDataset[] = rawChainsData.flatMap(chain => HISTORY_DATASETS.flatMap(dataset => {
    const metadata = chain.cacheMetadata?.datasets[dataset];
    return metadata
      ? [{ chainId: chain.chainId, dataset, fetchedAt: metadata.fetchedAt, source: metadata.source }]
      : [];
  }));
  const fetchedAt = Date.now();

  const responseData: WalletScanResponse = {
    address,
    status,
    availability,
    chains: validResults,
    aggregated,
    sybilReport,
    identityReport,
    metrics,
    chainWarnings: chainWarnings.length > 0 ? chainWarnings : undefined,
    allInboundUSD,
    allOutboundUSD,
    cacheMetadata: {
      fetchedAt,
      source: 'live',
      expiresAt: fetchedAt + PERSISTENCE_POLICY.caches.scanTtlSeconds * 1000,
      refreshAvailableAt: fetchedAt + PERSISTENCE_POLICY.caches.refreshCooldownSeconds * 1000,
      historyDatasets,
    },
    clusterEvidence: includeClusterEvidence
      ? collectWalletClusterEvidence(address, allTransactions, allInternalTransactions, allTokenTransfers)
      : undefined,
  };

  return responseData;
}

export async function processWalletScan(
  inputAddress: string,
  chainIds: number[],
  customApiKey = '',
  includeClusterEvidence = false,
  options: ProcessWalletScanOptions = {},
): Promise<WalletScanResponse> {
  throwIfAborted(options.signal);
  options.onProgress?.({ phase: 'resolving', totalChains: chainIds.length });
  const rawTarget = (inputAddress || '').trim();
  if (!rawTarget) {
    throw new Error('Please provide an EVM wallet address or ENS domain.');
  }

  let address = rawTarget;
  if (!/^0x[a-fA-F0-9]{40}$/.test(rawTarget)) {
    const resolved = await resolveEnsOrAddress(rawTarget, options.signal);
    if (!resolved) {
      throw new Error(`Unable to resolve ENS domain "${rawTarget}". Please check the name or provide a valid 0x address.`);
    }
    address = resolved;
  }

  const chains: number[] = (chainIds && chainIds.length > 0) ? chainIds : [1];
  const canUseReportCache = !customApiKey && !includeClusterEvidence;
  const historyCacheOptions: WalletHistoryCacheOptions = {
    cacheReadEnabled: canUseReportCache && !options.forceRefresh,
    cacheWriteEnabled: canUseReportCache,
    signal: options.signal,
  };
  const cacheKey = reportCacheKey(address, chains);
  const coalescingKey = `${cacheKey}:cluster=${includeClusterEvidence ? '1' : '0'}:custom=${customApiKey ? '1' : '0'}:refresh=${options.forceRefresh ? '1' : '0'}`;

  if (canUseReportCache && !options.forceRefresh) {
    const localCached = scanResultCache.get(cacheKey);
    if (localCached) {
      throwIfAborted(options.signal);
      const fetchedAt = localCached.cacheMetadata?.fetchedAt;
      if (typeof fetchedAt === 'number' && remainingReportTtlSeconds(localCached, fetchedAt) > 0) {
        return withCachedMetadata(localCached, 'memory', fetchedAt);
      }
      scanResultCache.delete(cacheKey);
    }

    const sharedCached = await sharedCache.get<WalletScanResponse>(
      cacheKey,
      PERSISTENCE_POLICY.caches.scanTtlSeconds,
      options.signal,
    );
    if (sharedCached) {
      throwIfAborted(options.signal);
      if (cacheReportLocally(cacheKey, sharedCached.value, sharedCached.fetchedAt)) {
        return withCachedMetadata(sharedCached.value, sharedCached.source, sharedCached.fetchedAt);
      }
    }
  }

  const existing = options.signal ? undefined : inFlightScans.get(coalescingKey);
  if (existing) return existing;

  const scanWork = (async () => {
    if (canUseReportCache) await enforceSharedQuota('scan', 1, options.signal);
    throwIfAborted(options.signal);
    const result = await runWalletScan(
      address,
      chains,
      customApiKey,
      includeClusterEvidence,
      options,
      historyCacheOptions,
    );

    // Complete history is the cacheability boundary. Price warnings remain in
    // the cached payload, so a missing quote never causes history to download
    // again just to reconstruct the same truthful partial-price report.
    throwIfAborted(options.signal);
    if (canUseReportCache && result.status === 'complete') {
      const fetchedAt = result.cacheMetadata?.fetchedAt ?? Date.now();
      cacheReportLocally(cacheKey, result, fetchedAt);
      await sharedCache.set(cacheKey, result, PERSISTENCE_POLICY.caches.scanTtlSeconds, fetchedAt, options.signal);
    }
    return result;
  })();

  if (!options.signal) inFlightScans.set(coalescingKey, scanWork);
  try {
    return await scanWork;
  } finally {
    if (!options.signal && inFlightScans.get(coalescingKey) === scanWork) inFlightScans.delete(coalescingKey);
  }
}
