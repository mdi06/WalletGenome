import { ProcessedTransaction, ProcessedTokenTransfer, TransferSummary } from '../types';

export function analyzeTransfers(
  transactions: ProcessedTransaction[],
  tokenTransfers: ProcessedTokenTransfer[],
  walletAddress: string,
  topN: number = 20
): TransferSummary {
  const lower = walletAddress.toLowerCase();

  // Native token transfers (ETH)
  const nativeOutbound = transactions
    .filter(tx => tx.from.toLowerCase() === lower && tx.valueFormatted > 0 && !tx.isError)
    .sort((a, b) => (b.valueUSD ?? 0) - (a.valueUSD ?? 0))
    .slice(0, topN);

  const nativeInbound = transactions
    .filter(tx => tx.to.toLowerCase() === lower && tx.valueFormatted > 0)
    .sort((a, b) => (b.valueUSD ?? 0) - (a.valueUSD ?? 0))
    .slice(0, topN);

  // Token transfers
  const tokenOutbound = tokenTransfers
    .filter(t => t.direction === 'out')
    .sort((a, b) => (b.valueUSD ?? 0) - (a.valueUSD ?? 0))
    .slice(0, topN);

  const tokenInbound = tokenTransfers
    .filter(t => t.direction === 'in')
    .sort((a, b) => (b.valueUSD ?? 0) - (a.valueUSD ?? 0))
    .slice(0, topN);

  // Totals
  const totalInboundUSD =
    tokenTransfers.filter(t => t.direction === 'in').reduce((sum, t) => sum + (t.valueUSD ?? 0), 0) +
    transactions.filter(tx => tx.to.toLowerCase() === lower).reduce((sum, tx) => sum + (tx.valueUSD ?? 0), 0);

  const totalOutboundUSD =
    tokenTransfers.filter(t => t.direction === 'out').reduce((sum, t) => sum + (t.valueUSD ?? 0), 0) +
    transactions.filter(tx => tx.from.toLowerCase() === lower && tx.valueFormatted > 0).reduce((sum, tx) => sum + (tx.valueUSD ?? 0), 0);

  return {
    topInbound: tokenInbound,
    topOutbound: tokenOutbound,
    topNativeInbound: nativeInbound,
    topNativeOutbound: nativeOutbound,
    totalInboundUSD,
    totalOutboundUSD,
  };
}
