import type {
  BulkWrappedWallet,
  ClusterScanResult,
  DataAvailabilityStatus,
  MultiChainScanResult,
} from '../types';
import { getChainConfig } from '../chains';
import {
  computeAggregatedRadarData,
  extractProtocolBadges,
  formatCompactUSD,
} from '../utils/dashboardUtils';

export type ClusterSortField = 'gas' | 'inflow' | 'sybil' | 'risk' | 'txs';

export interface ChainActivityItem {
  chainId: number;
  chainName: string;
  color: string;
  transactionCount: number | null;
  sharePercent: number | null;
  status: DataAvailabilityStatus;
}

function buildChainActivity(data: MultiChainScanResult): {
  chainActivity: ChainActivityItem[];
  chainActivityStatus: DataAvailabilityStatus;
} {
  const chainById = new Map(data.chains.map(chain => [chain.chainId, chain]));
  const availabilityById = new Map(data.availability.map(chain => [chain.chainId, chain]));
  const chainIds = [
    ...data.availability.map(chain => chain.chainId),
    ...data.chains
      .map(chain => chain.chainId)
      .filter(chainId => !availabilityById.has(chainId)),
  ];
  const statuses = chainIds.map(chainId => (
    availabilityById.get(chainId)?.transactions
      ?? (data.status === 'complete' ? 'complete' : 'partial')
  ));
  const chainActivityStatus: DataAvailabilityStatus = statuses.length > 0 && statuses.every(status => status === 'complete')
    ? 'complete'
    : statuses.length > 0 && statuses.every(status => status === 'unavailable')
      ? 'unavailable'
      : 'partial';
  const canCalculateShares = chainActivityStatus === 'complete';
  const returnedTransactionTotal = data.chains.reduce((sum, chain) => sum + chain.transactionCount, 0);

  return {
    chainActivityStatus,
    chainActivity: chainIds.map((chainId, index) => {
      const chain = chainById.get(chainId);
      const availability = availabilityById.get(chainId);
      const status = statuses[index];
      const transactionCount = status === 'unavailable' ? null : (chain?.transactionCount ?? null);
      const sharePercent = canCalculateShares && transactionCount !== null && returnedTransactionTotal > 0
        ? Math.round((transactionCount / returnedTransactionTotal) * 100)
        : null;

      return {
        chainId,
        chainName: availability?.chainName ?? chain?.chainName ?? `Chain ${chainId}`,
        color: getChainConfig(chainId).color,
        transactionCount,
        sharePercent,
        status,
      };
    }),
  };
}

export function buildDashboardViewModel(data: MultiChainScanResult) {
  const { aggregated, chains, identityReport, metrics } = data;
  const totalGasUSD = aggregated.totalGasUSD || 0;
  const chainActivity = buildChainActivity(data);
  return {
    totalGasETH: aggregated.totalGasETH || 0,
    totalGasUSD,
    formattedGasUSD: formatCompactUSD(totalGasUSD),
    riskScore: metrics.riskScore,
    riskGrade: metrics.riskGrade,
    sybilProbability: metrics.sybilProbability,
    primaryName: identityReport?.primaryName || `${data.address.slice(0, 6)}...${data.address.slice(-4)}`,
    persona: chains.find(chain => chain.fingerprint?.persona && chain.fingerprint.persona !== 'New Wallet')?.fingerprint?.persona
      || chains[0]?.fingerprint?.persona
      || 'Alpha Hunter',
    approvalCount: chains.reduce((sum, chain) => sum + (chain.approvalSummary?.totalApprovals || 0), 0),
    protocolCount: chains.reduce((sum, chain) => sum + (chain.interactionsSummary?.topProtocols?.length || 0), 0),
    protocolBadges: extractProtocolBadges(data),
    radarData: computeAggregatedRadarData(chains),
    ...chainActivity,
  };
}

export function buildClusterSummary(data: ClusterScanResult) {
  const total = data.totalWallets;
  const directLinks = data.linkages.length;
  const directTransfers = data.linkages.reduce((sum, linkage) => sum + linkage.txCount, 0);
  const topHub = data.sharedCounterparties[0];
  const topHubOverlapPct = topHub && total > 0 ? Math.round((topHub.sharedCount / total) * 100) : 0;

  let coordinationLevel: 'HIGH COORDINATION CLUSTER' | 'MODERATE OVERLAP' | 'INDEPENDENT PORTFOLIO' | 'SAVED EXAMPLE';
  let coordinationColor = 'bg-[#059669]/10 text-[#047857] border-[#059669]/30';
  if (data.source === 'saved') {
    coordinationLevel = 'SAVED EXAMPLE';
    coordinationColor = 'bg-[#e5e7eb] text-[#4b5563] border-[#9ca3af]';
  } else if (directTransfers >= 5 || topHubOverlapPct >= 75) {
    coordinationLevel = 'HIGH COORDINATION CLUSTER';
    coordinationColor = 'bg-[#ff5500]/10 text-orange-ink border-[#ff5500]/30';
  } else if (directLinks > 0 || topHubOverlapPct >= 40) {
    coordinationLevel = 'MODERATE OVERLAP';
    coordinationColor = 'bg-[#f59e0b]/10 text-[#92400e] border-[#f59e0b]/30';
  } else {
    coordinationLevel = 'INDEPENDENT PORTFOLIO';
  }

  const personaCounts = new Map<string, number>();
  data.wallets.forEach(wallet => {
    personaCounts.set(wallet.persona, (personaCounts.get(wallet.persona) || 0) + 1);
  });
  let dominantPersona = 'Active Trader';
  let dominantPersonaCount = 0;
  for (const [persona, count] of personaCounts.entries()) {
    if (count > dominantPersonaCount) {
      dominantPersonaCount = count;
      dominantPersona = persona;
    }
  }

  let narrative: string;
  if (data.source === 'saved') {
    narrative = 'This saved cluster example contains no modeled connection evidence. It is a non-live fixture, not evidence that the submitted wallets are independent.';
  } else if (coordinationLevel === 'HIGH COORDINATION CLUSTER') {
    narrative = `Evidence shows ${directTransfers} direct inter-wallet transactions across ${directLinks} directional chain linkages, with ${topHubOverlapPct}% of wallets sharing the leading counterparty (${topHub?.label || topHub?.address.slice(0, 6) + '...' || 'none'}). This is an overlap signal, not proof of common control.`;
  } else if (coordinationLevel === 'MODERATE OVERLAP') {
    narrative = `Moderate overlap detected across ${total} wallets: ${directTransfers} evidence-backed direct transactions and shared counterparties from the complete transfer datasets. Dominant archetype: ${dominantPersona}.`;
  } else {
    narrative = 'No direct transfers or shared counterparties were detected between the submitted wallets in the complete returned transfer datasets.';
  }

  return {
    coordinationLevel,
    coordinationColor,
    dominantPersona,
    dominantPersonaPct: total > 0 ? Math.round((dominantPersonaCount / total) * 100) : 0,
    narrative,
    directLinks,
    directTransfers,
    topHub,
    topHubOverlapPct,
  };
}

export function sortClusterWallets(
  wallets: readonly BulkWrappedWallet[],
  sortField: ClusterSortField,
  ascending: boolean,
): BulkWrappedWallet[] {
  const value = (wallet: BulkWrappedWallet): number => {
    switch (sortField) {
      case 'gas': return wallet.totalGasUSD;
      case 'inflow': return wallet.totalInflowUSD;
      case 'sybil': return wallet.sybilProbability;
      case 'risk': return wallet.riskScore;
      case 'txs': return wallet.transactionCount;
    }
  };
  return [...wallets].sort((left, right) => (
    ascending ? value(left) - value(right) : value(right) - value(left)
  ));
}
