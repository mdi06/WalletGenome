import { ProcessedTokenTransfer, ScanResult } from './types';
import { deduplicateTokenTransfers, getTokenTransferIdentity } from './analysis/transfers';
import { isTrustedTokenContract } from './prices';

export type TransferTableRow = ProcessedTokenTransfer & { chainName: string };

export const TRANSFER_TABLE_PAGE_SIZE = 50;

export function normalizeTransferTablePricing(transfer: TransferTableRow): TransferTableRow {
  // Saved snapshots can contain prices produced before contract-aware pricing
  // was enforced. Never carry a legacy ticker-only value into the UI.
  if (isTrustedTokenContract(transfer.chainId, transfer.contractAddress)) return transfer;

  return {
    ...transfer,
    valueUSD: null,
    valueUSDProvenance: 'unpriced',
  };
}

export function collectTransferTableRows(
  results: readonly ScanResult[],
  directionFilter: 'all' | 'in' | 'out',
  selectedChain: number | 'all',
): TransferTableRow[] {
  const transfers: TransferTableRow[] = [];

  for (const result of results) {
    if (selectedChain !== 'all' && result.chainId !== selectedChain) continue;

    if (result.transferSummary) {
      if (directionFilter === 'all' || directionFilter === 'in') {
        for (const transfer of result.transferSummary.topInbound || []) {
          transfers.push(normalizeTransferTablePricing({ ...transfer, chainName: result.chainName }));
        }
      }
      if (directionFilter === 'all' || directionFilter === 'out') {
        for (const transfer of result.transferSummary.topOutbound || []) {
          transfers.push(normalizeTransferTablePricing({ ...transfer, chainName: result.chainName }));
        }
      }
    }
  }

  return deduplicateTokenTransfers(transfers)
    .sort((a, b) => (b.valueUSD || 0) - (a.valueUSD || 0));
}

export function getTransferSearchText(transfer: TransferTableRow): string {
  const counterparty = transfer.direction === 'in' ? transfer.from : transfer.to;
  const counterpartyLabel = transfer.direction === 'in' ? transfer.fromLabel : transfer.toLabel;

  return [
    transfer.tokenName,
    transfer.tokenSymbol,
    transfer.contractAddress,
    transfer.hash,
    counterparty,
    counterpartyLabel ?? '',
    transfer.chainName,
  ].join(' ').toLowerCase();
}

export function filterTransferTableRows(
  transfers: readonly TransferTableRow[],
  searchQuery: string,
): TransferTableRow[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (!normalizedQuery) return [...transfers];

  return transfers.filter(transfer => getTransferSearchText(transfer).includes(normalizedQuery));
}

export interface TransferTablePage<T> {
  currentPage: number;
  pageCount: number;
  items: T[];
  firstVisible: number;
  lastVisible: number;
}

export function paginateTransferTable<T>(
  items: readonly T[],
  page: number,
  pageSize: number = TRANSFER_TABLE_PAGE_SIZE,
): TransferTablePage<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const pageStart = (currentPage - 1) * pageSize;

  return {
    currentPage,
    pageCount,
    items: items.slice(pageStart, pageStart + pageSize),
    firstVisible: items.length === 0 ? 0 : pageStart + 1,
    lastVisible: Math.min(pageStart + pageSize, items.length),
  };
}

export function getTransferTableRowKey(transfer: TransferTableRow): string {
  return getTokenTransferIdentity(transfer);
}
