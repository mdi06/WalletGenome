import { ProcessedTransaction, ProcessedTokenTransfer, TransferSummary } from '../types';

function hasVerifiedHistoricalValue(
  leg: ProcessedTransaction | ProcessedTokenTransfer,
): boolean {
  return leg.valueUSD !== null
    && (leg.valueUSDProvenance === 'historical' || leg.valueUSDProvenance === 'stablecoin_assumption');
}

export function getTokenTransferIdentity(transfer: ProcessedTokenTransfer): string {
  const hash = transfer.hash.trim().toLowerCase();
  const logIndex = transfer.logIndex?.trim();

  if (hash && logIndex) {
    return `${transfer.chainId}:${hash}:log:${logIndex}`;
  }

  return [
    'fallback',
    transfer.chainId,
    hash,
    transfer.direction,
    transfer.contractAddress.trim().toLowerCase(),
    transfer.from.trim().toLowerCase(),
    transfer.to.trim().toLowerCase(),
    transfer.value,
  ].join(':');
}

export function deduplicateTokenTransfers<T extends ProcessedTokenTransfer>(
  transfers: readonly T[],
): T[] {
  const seen = new Set<string>();

  return transfers.filter(transfer => {
    const identity = getTokenTransferIdentity(transfer);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

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
  const uniqueTokenTransfers = deduplicateTokenTransfers(tokenTransfers);
  const tokenOutbound = uniqueTokenTransfers
    .filter(t => t.direction === 'out')
    .sort((a, b) => (b.valueUSD ?? 0) - (a.valueUSD ?? 0))
    .slice(0, topN);

  const tokenInbound = uniqueTokenTransfers
    .filter(t => t.direction === 'in')
    .sort((a, b) => (b.valueUSD ?? 0) - (a.valueUSD ?? 0))
    .slice(0, topN);

  // Totals
  const eligibleNativeInbound = transactions.filter(tx =>
    tx.to.toLowerCase() === lower && tx.valueFormatted > 0 && !tx.isError
  );
  const eligibleNativeOutbound = transactions.filter(tx =>
    tx.from.toLowerCase() === lower && tx.valueFormatted > 0 && !tx.isError
  );
  const eligibleTokenInbound = uniqueTokenTransfers.filter(t => t.direction === 'in' && t.valueFormatted > 0);
  const eligibleTokenOutbound = uniqueTokenTransfers.filter(t => t.direction === 'out' && t.valueFormatted > 0);
  const eligibleLegs = [
    ...eligibleNativeInbound,
    ...eligibleNativeOutbound,
    ...eligibleTokenInbound,
    ...eligibleTokenOutbound,
  ];
  const verifiedLegs = eligibleLegs.filter(hasVerifiedHistoricalValue);
  const excludedSpotEstimateLegs = eligibleLegs.filter(leg => leg.valueUSDProvenance === 'spot_estimate').length;
  const unpricedLegs = eligibleLegs.filter(leg => leg.valueUSDProvenance === 'unpriced').length;
  const totalLegs = eligibleLegs.length;

  const totalInboundUSD = [...eligibleNativeInbound, ...eligibleTokenInbound]
    .filter(hasVerifiedHistoricalValue)
    .reduce((sum, leg) => sum + (leg.valueUSD ?? 0), 0);
  const totalOutboundUSD = [...eligibleNativeOutbound, ...eligibleTokenOutbound]
    .filter(hasVerifiedHistoricalValue)
    .reduce((sum, leg) => sum + (leg.valueUSD ?? 0), 0);

  const coveragePercent = totalLegs === 0
    ? 100
    : Math.round((verifiedLegs.length / totalLegs) * 100);
  const status = totalLegs > 0 && verifiedLegs.length === 0
    ? 'unavailable'
    : verifiedLegs.length < totalLegs
      ? 'partial'
      : 'complete';

  return {
    topInbound: tokenInbound,
    topOutbound: tokenOutbound,
    topNativeInbound: nativeInbound,
    topNativeOutbound: nativeOutbound,
    totalInboundUSD,
    totalOutboundUSD,
    capitalFlowCoverage: {
      verifiedLegs: verifiedLegs.length,
      totalLegs,
      excludedSpotEstimateLegs,
      unpricedLegs,
      coveragePercent,
      status,
    },
  };
}
