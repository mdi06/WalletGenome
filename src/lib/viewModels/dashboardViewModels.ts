import type { BulkWrappedWallet, ClusterScanResult, MultiChainScanResult } from '../types';
import {
  computeAggregatedRadarData,
  extractProtocolBadges,
  formatCompactUSD,
} from '../utils/dashboardUtils';

export type ClusterSortField = 'gas' | 'inflow' | 'sybil' | 'risk' | 'txs';

export function buildDashboardViewModel(data: MultiChainScanResult) {
  const { aggregated, chains, identityReport, metrics } = data;
  const totalGasUSD = aggregated.totalGasUSD || 0;
  const totalInflowUSD = metrics.inflowUSD;
  const capitalFlowCoverage = metrics.capitalFlowCoverage;
  return {
    totalGasETH: aggregated.totalGasETH || 0,
    totalGasUSD,
    totalInflowUSD,
    formattedGasUSD: formatCompactUSD(totalGasUSD),
    formattedInflowUSD: totalInflowUSD === null ? 'Unavailable' : formatCompactUSD(totalInflowUSD),
    capitalFlowCoverage,
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
  };
}

export function buildClusterSummary(data: ClusterScanResult) {
  const total = data.totalWallets;
  const directLinks = data.linkages.length;
  const directTransfers = data.linkages.reduce((sum, linkage) => sum + linkage.txCount, 0);
  const topHub = data.sharedCounterparties[0];
  const topHubOverlapPct = topHub && total > 0 ? Math.round((topHub.sharedCount / total) * 100) : 0;

  let coordinationLevel: 'HIGH COORDINATION CLUSTER' | 'MODERATE OVERLAP' | 'INDEPENDENT PORTFOLIO';
  let coordinationColor = 'bg-[#059669]/10 text-[#059669] border-[#059669]/30';
  if (directTransfers >= 5 || topHubOverlapPct >= 75) {
    coordinationLevel = 'HIGH COORDINATION CLUSTER';
    coordinationColor = 'bg-[#ff5500]/10 text-[#ff5500] border-[#ff5500]/30';
  } else if (directLinks > 0 || topHubOverlapPct >= 40) {
    coordinationLevel = 'MODERATE OVERLAP';
    coordinationColor = 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30';
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
  if (coordinationLevel === 'HIGH COORDINATION CLUSTER') {
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
