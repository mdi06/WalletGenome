'use client';

import React, { useState, useMemo } from 'react';
import { ReportingMetrics, ScanResult } from '@/lib/types';
import { getExplorerAddressUrl } from '@/lib/chains';
import { ExternalLink, ArrowUpRight, ArrowDownLeft, Trophy } from 'lucide-react';
import { isBurnAddress, isPureTokenContract, PROTOCOL_REGISTRY } from '@/lib/labels';
import { formatCompactUSD } from '@/lib/utils/dashboardUtils';

interface Props {
  results: ScanResult[];
  metrics: ReportingMetrics;
}

interface GraphNode {
  id: string;
  label: string;
  subLabel?: string;
  chainName?: string;
  type: 'inflow' | 'center' | 'protocol' | 'outflow';
  category?: string;
  volumeUSD: number;
  txCount: number;
  chainId: number;
  address: string;
  x: number;
  y: number;
  isTopRecipient?: boolean;
}

interface GraphLink {
  source: string;
  target: string;
  volumeUSD: number;
  txCount: number;
  token?: string;
  chainId: number;
  color: string;
}

export const FLOW_GRAPH_NODE_WIDTH = 130;
export const FLOW_GRAPH_NODE_GAP = 20;
const FLOW_GRAPH_CANVAS_WIDTH = 900;

interface GraphNodePosition {
  x: number;
  y: number;
}

export function layoutProtocolNodes<T extends GraphNodePosition>(
  protocolNodes: readonly T[],
): T[] {
  if (protocolNodes.length === 0) return [];

  const topCount = Math.ceil(protocolNodes.length / 2);
  const rows = [
    { nodes: protocolNodes.slice(0, topCount), y: 70 },
    { nodes: protocolNodes.slice(topCount), y: 490 },
  ];

  return rows.flatMap(row => {
    const rowWidth = row.nodes.length * FLOW_GRAPH_NODE_WIDTH
      + Math.max(0, row.nodes.length - 1) * FLOW_GRAPH_NODE_GAP;
    const firstCenterX = (FLOW_GRAPH_CANVAS_WIDTH - rowWidth) / 2
      + FLOW_GRAPH_NODE_WIDTH / 2;

    return row.nodes.map((node, index) => ({
      ...node,
      x: firstCenterX + index * (FLOW_GRAPH_NODE_WIDTH + FLOW_GRAPH_NODE_GAP),
      y: row.y,
    }));
  });
}

function truncAddr(addr: string): string {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function isKnownSmartContractOrToken(address: string, type: string): boolean {
  const lower = address.toLowerCase();
  if (isPureTokenContract(lower)) return true;
  if (isBurnAddress(lower)) return true;
  if (PROTOCOL_REGISTRY[lower]) return true;
  if (type === 'contract' || type === 'dex' || type === 'bridge') return true;
  return false;
}

export function formatGraphVolume(volumeUSD: number, txCount: number): string {
  return txCount > 0 && volumeUSD <= 0 ? 'Unavailable' : formatCompactUSD(volumeUSD);
}

export function formatGraphSummaryValue(value: number | null): string {
  return value === null ? 'Unavailable' : formatCompactUSD(value);
}

export function formatGraphNetworkLabel(chainName: string | undefined, chainId: number): string {
  return chainName?.trim() || `Chain ${chainId}`;
}

export default function CapitalFlowGraph({ results, metrics }: Props) {
  const [minVolume, setMinVolume] = useState<number>(0);
  const [selectedChain, setSelectedChain] = useState<number | 'all'>('all');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const userAddress = results[0]?.address?.toLowerCase() || '';
  const coverage = metrics.capitalFlowCoverage;
  const observedInflowUSD = results.reduce(
    (sum, result) => sum + result.transferSummary.totalInboundUSD,
    0,
  );
  const observedOutflowUSD = results.reduce(
    (sum, result) => sum + result.transferSummary.totalOutboundUSD,
    0,
  );
  const hasObservedLowerBound = metrics.inflowUSD === null
    && metrics.outflowUSD === null
    && coverage.verifiedLegs > 0;
  const displayedInflowUSD = hasObservedLowerBound ? observedInflowUSD : metrics.inflowUSD;
  const displayedOutflowUSD = hasObservedLowerBound ? observedOutflowUSD : metrics.outflowUSD;
  const displayedNetFlowUSD = displayedInflowUSD === null || displayedOutflowUSD === null
    ? null
    : displayedInflowUSD - displayedOutflowUSD;
  const flowSummaryTitle = hasObservedLowerBound
    ? 'Observed Priced Flow Summary'
    : coverage.status === 'unavailable'
      ? 'Flow Value Availability'
      : 'Verified Flow Summary';
  const flowSummaryDescription = hasObservedLowerBound
    ? 'Historically priced native and token transfer legs returned by this incomplete scan.'
    : coverage.status === 'unavailable'
      ? 'No complete historically priced transfer values are available for this scan.'
      : 'Historically priced native and token transfer legs across the selected scan chains.';
  const formattedNetFlow = displayedNetFlowUSD === null
    ? 'Unavailable'
    : displayedNetFlowUSD < 0
      ? `-${formatCompactUSD(Math.abs(displayedNetFlowUSD))}`
      : formatCompactUSD(displayedNetFlowUSD);

  const handleNodeClick = (node: GraphNode | { chainId: number; address: string }) => {
    if (node.address) {
      const url = getExplorerAddressUrl(node.chainId || 1, node.address);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // 1. Calculate Top Interacted Wallets (Excluding Smart Contracts and Token Contracts)
  const { topOutboundWallets, topInboundWallets, mostInteractedWallet } = useMemo(() => {
    const outboundMap = new Map<string, { address: string; label: string | null; type: string; txCount: number; volumeUSD: number; chainId: number }>();
    const inboundMap = new Map<string, { address: string; label: string | null; type: string; txCount: number; volumeUSD: number; chainId: number }>();

    const activeResults = selectedChain === 'all'
      ? results
      : results.filter(r => r.chainId === selectedChain);

    activeResults.forEach(r => {
      r.interactionsSummary?.topCounterparties?.forEach(c => {
        const cAddr = c.address.toLowerCase();
        if (cAddr === userAddress || isBurnAddress(cAddr)) return;

        const isContract = isKnownSmartContractOrToken(cAddr, c.type);

        // Outbound Recipient Wallets (EOA / CEX Wallets)
        if (!isContract && (c.outboundCount > 0 || c.outboundUSD > 0)) {
          const existing = outboundMap.get(cAddr) || {
            address: c.address,
            label: c.label,
            type: c.type,
            txCount: 0,
            volumeUSD: 0,
            chainId: r.chainId,
          };
          existing.txCount += c.outboundCount;
          existing.volumeUSD += c.outboundUSD;
          outboundMap.set(cAddr, existing);
        }

        // Inbound Funding Wallets
        if (!isContract && (c.inboundCount > 0 || c.inboundUSD > 0)) {
          const existing = inboundMap.get(cAddr) || {
            address: c.address,
            label: c.label,
            type: c.type,
            txCount: 0,
            volumeUSD: 0,
            chainId: r.chainId,
          };
          existing.txCount += c.inboundCount;
          existing.volumeUSD += c.inboundUSD;
          inboundMap.set(cAddr, existing);
        }
      });
    });

    const sortedOutbound = Array.from(outboundMap.values()).sort((a, b) => b.txCount - a.txCount || b.volumeUSD - a.volumeUSD);
    const sortedInbound = Array.from(inboundMap.values()).sort((a, b) => b.txCount - a.txCount || b.volumeUSD - a.volumeUSD);

    return {
      topOutboundWallets: sortedOutbound,
      topInboundWallets: sortedInbound,
      mostInteractedWallet: sortedOutbound[0] || null,
    };
  }, [results, selectedChain, userAddress]);

  // 2. Extract Graph Topology
  const { nodes, links } = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();
    const linkList: GraphLink[] = [];

    nodeMap.set('center', {
      id: 'center',
      label: 'Your Wallet',
      subLabel: truncAddr(userAddress),
      type: 'center',
      volumeUSD: 0,
      txCount: 0,
      chainId: 1,
      address: userAddress,
      x: 450,
      y: 280,
    });

    const activeResults = selectedChain === 'all'
      ? results
      : results.filter(r => r.chainId === selectedChain);

    // Protocols
    for (const r of activeResults) {
      for (const p of r.interactionsSummary?.topProtocols || []) {
        if (p.totalVolumeUSD < minVolume && p.txCount < 2) continue;
        const pId = `proto-${p.chainId}-${p.protocol || p.name}`;
        const contractAddr = p.contracts && p.contracts.length > 0
          ? p.contracts[0].contractAddress
          : '';

        const existing = nodeMap.get(pId) || {
          id: pId,
          label: p.name,
          subLabel: p.protocol !== p.name ? p.protocol : undefined,
          chainName: p.chainName,
          type: 'protocol',
          category: p.category as string,
          volumeUSD: 0,
          txCount: 0,
          chainId: p.chainId,
          address: contractAddr,
          x: 0,
          y: 0,
        };

        existing.volumeUSD += p.totalVolumeUSD;
        existing.txCount += p.txCount;
        nodeMap.set(pId, existing);

        linkList.push({
          source: 'center',
          target: pId,
          volumeUSD: p.totalVolumeUSD,
          txCount: p.txCount,
          chainId: p.chainId,
          color: '#3b82f6',
        });
      }
    }

    // Counterparties
    for (const r of activeResults) {
      for (const c of r.interactionsSummary?.topCounterparties || []) {
        const cAddr = c.address.toLowerCase();
        if (cAddr === userAddress || isBurnAddress(cAddr) || isPureTokenContract(cAddr)) continue;

        // Inflows
        if (c.inboundUSD >= minVolume || (c.inboundCount > 0 && minVolume === 0)) {
          const inId = `in-${cAddr}`;
          const label = c.label || truncAddr(c.address);

          const existing = nodeMap.get(inId) || {
            id: inId,
            label,
            subLabel: c.type.toUpperCase(),
            type: 'inflow',
            category: c.type,
            volumeUSD: 0,
            txCount: 0,
            chainId: c.chainId,
            address: c.address,
            x: 0,
            y: 0,
          };

          existing.volumeUSD += c.inboundUSD;
          existing.txCount += c.inboundCount;
          nodeMap.set(inId, existing);

          linkList.push({
            source: inId,
            target: 'center',
            volumeUSD: c.inboundUSD,
            txCount: c.inboundCount,
            chainId: c.chainId,
            color: '#059669',
          });
        }

        // Outflows
        if (c.outboundUSD >= minVolume || (c.outboundCount > 0 && minVolume === 0)) {
          const outId = `out-${cAddr}`;
          const label = c.label || truncAddr(c.address);
          const isTop = mostInteractedWallet && mostInteractedWallet.address.toLowerCase() === cAddr;

          const existing = nodeMap.get(outId) || {
            id: outId,
            label,
            subLabel: c.type.toUpperCase(),
            type: 'outflow',
            category: c.type,
            volumeUSD: 0,
            txCount: 0,
            chainId: c.chainId,
            address: c.address,
            isTopRecipient: isTop,
            x: 0,
            y: 0,
          };

          existing.volumeUSD += c.outboundUSD;
          existing.txCount += c.outboundCount;
          nodeMap.set(outId, existing);

          linkList.push({
            source: 'center',
            target: outId,
            volumeUSD: c.outboundUSD,
            txCount: c.outboundCount,
            chainId: c.chainId,
            color: isTop ? '#ff5500' : '#f59e0b',
          });
        }
      }
    }

    const inflowNodes = Array.from(nodeMap.values()).filter(n => n.type === 'inflow').slice(0, 7);
    const protocolNodes = Array.from(nodeMap.values()).filter(n => n.type === 'protocol').slice(0, 8);
    const outflowNodes = Array.from(nodeMap.values()).filter(n => n.type === 'outflow').slice(0, 7);

    inflowNodes.forEach((node, i) => {
      const step = 500 / (inflowNodes.length + 1);
      node.x = 110;
      node.y = 40 + (i + 1) * step;
    });

    const positionedProtocolNodes = layoutProtocolNodes(protocolNodes);

    outflowNodes.forEach((node, i) => {
      const step = 500 / (outflowNodes.length + 1);
      node.x = 790;
      node.y = 40 + (i + 1) * step;
    });

    const activeNodes = [
      nodeMap.get('center')!,
      ...inflowNodes,
      ...positionedProtocolNodes,
      ...outflowNodes,
    ];

    const activeNodeIds = new Set(activeNodes.map(n => n.id));
    const activeLinks = linkList.filter(
      l => activeNodeIds.has(l.source) && activeNodeIds.has(l.target)
    );

    return {
      nodes: activeNodes,
      links: activeLinks,
    };
  }, [results, minVolume, selectedChain, userAddress, mostInteractedWallet]);

  const activeNodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  const hoveredNode = hoveredNodeId ? activeNodeMap.get(hoveredNodeId) : null;

  return (
    <div className="space-y-7">
      <section aria-labelledby="flow-summary-heading" className="card-3d space-y-4 p-4 text-[#0a0a0a] sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 id="flow-summary-heading" className="text-xs font-black uppercase tracking-wider">{flowSummaryTitle}</h3>
            <p className="text-[11px] font-bold text-[#4b5563] mt-1">
              {flowSummaryDescription}
            </p>
          </div>
          <span className={`text-[10px] font-black font-mono uppercase px-2 py-1 border self-start ${
            hasObservedLowerBound
              ? 'text-[#b45309] border-[#f59e0b]/50 bg-[#f59e0b]/10'
              : coverage.status === 'complete'
              ? 'text-[#047857] border-[#059669]/40 bg-[#059669]/10'
              : coverage.status === 'partial'
                ? 'text-[#b45309] border-[#f59e0b]/50 bg-[#f59e0b]/10'
                : 'text-[#b91c1c] border-[#dc2626]/40 bg-[#dc2626]/10'
          }`}>
            {hasObservedLowerBound
              ? 'Incomplete lower bound'
              : coverage.status === 'partial'
                ? 'Partial lower-bound estimate'
                : coverage.status}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="well-recessed-light p-4">
            <div className="text-[10px] font-black text-[#4b5563] uppercase">
              {hasObservedLowerBound ? 'Observed Priced Inflow' : 'Verified Inflow'}
            </div>
            <div className={`text-xl font-black font-mono mt-1 ${displayedInflowUSD === null ? 'text-[#92400e]' : 'text-[#047857]'}`}>
              {formatGraphSummaryValue(displayedInflowUSD)}
            </div>
            {displayedInflowUSD === null && <div className="mt-1 text-[10px] font-bold text-[#92400e]">USD value unavailable</div>}
          </div>
          <div className="well-recessed-light p-4">
            <div className="text-[10px] font-black text-[#4b5563] uppercase">
              {hasObservedLowerBound ? 'Observed Priced Outflow' : 'Verified Outflow'}
            </div>
            <div className={`text-xl font-black font-mono mt-1 ${displayedOutflowUSD === null ? 'text-[#92400e]' : 'text-orange-ink'}`}>
              {formatGraphSummaryValue(displayedOutflowUSD)}
            </div>
            {displayedOutflowUSD === null && <div className="mt-1 text-[10px] font-bold text-[#92400e]">USD value unavailable</div>}
          </div>
          <div className="well-recessed-light p-4">
            <div className="text-[10px] font-black text-[#4b5563] uppercase">
              {hasObservedLowerBound ? 'Net Observed Priced Flow' : 'Net Verified Flow'}
            </div>
            <div className={`text-xl font-black font-mono mt-1 ${
              displayedNetFlowUSD !== null && displayedNetFlowUSD < 0 ? 'text-[#b91c1c]' : 'text-[#0a0a0a]'
            }`}>
              {formattedNetFlow}
            </div>
            {displayedNetFlowUSD === null && <div className="mt-1 text-[10px] font-bold text-[#92400e]">Cannot derive from unavailable values</div>}
          </div>
        </div>

        {coverage.status === 'partial' && (
          <div className="border-l-4 border-[#f59e0b] bg-[#fffbeb] px-3 py-2 text-[11px] font-bold text-[#92400e]">
            {coverage.coveragePercent}% count coverage · {coverage.verifiedLegs}/{coverage.totalLegs} eligible transfer values included.{' '}
            {coverage.excludedSpotEstimateLegs} current-price estimates and {coverage.unpricedLegs} unpriced values excluded.{' '}
            These totals are verified lower bounds, not complete lifetime USD flow.
          </div>
        )}
        {hasObservedLowerBound && (
          <div className="border-l-4 border-[#f59e0b] bg-[#fffbeb] px-3 py-2 text-[11px] font-bold text-[#92400e]">
            Incomplete-history lower bound from {coverage.verifiedLegs.toLocaleString('en-US')} returned historically priced or stablecoin transfer values.{' '}
            {coverage.excludedSpotEstimateLegs.toLocaleString('en-US')} current-price estimates and{' '}
            {coverage.unpricedLegs.toLocaleString('en-US')} returned unpriced values are excluded.{' '}
            Missing history is unknown. These are transfer-volume lower bounds, not wallet balance, profit, or complete lifetime totals.
          </div>
        )}
        {coverage.status === 'unavailable' && !hasObservedLowerBound && (
          <div className="border-l-4 border-[#dc2626] bg-[#fef2f2] px-3 py-2 text-[11px] font-bold text-[#991b1b]">
            Verified flow totals require complete wallet history and at least one historically priced transfer value.
          </div>
        )}
      </section>

      {/* ── Highlighted recipient evidence ── */}
      {mostInteractedWallet ? (
        <section aria-labelledby="most-interacted-heading" className="card-3d flex flex-col items-start justify-between gap-4 p-4 text-[#0a0a0a] md:flex-row md:items-center sm:p-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 btn-3d-orange text-[#0a0a0a] flex items-center justify-center font-black text-xl flex-shrink-0">
              <Trophy size={24} />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span id="most-interacted-heading" className="text-[10px] font-extrabold tracking-widest text-orange-ink uppercase">
                  MOST INTERACTED RECIPIENT WALLET
                </span>
                <span className="badge-3d text-[10px] font-mono font-bold px-2 py-0.5 bg-[#d0d0d0] text-[#0a0a0a]">
                  {mostInteractedWallet.type.toUpperCase()} WALLET
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black font-mono tracking-tight text-[#0a0a0a]">
                  {mostInteractedWallet.label || mostInteractedWallet.address}
                </span>
                <button
                  type="button"
                  aria-label={`View ${mostInteractedWallet.label || mostInteractedWallet.address} on block explorer`}
                  onClick={() => handleNodeClick(mostInteractedWallet)}
                  className="min-h-11 min-w-11 md:min-h-9 md:min-w-9 inline-flex items-center justify-center text-[#6b7280] hover:text-orange-ink transition-colors cursor-pointer"
                  title="View on Explorer"
                >
                  <ExternalLink size={13} />
                </button>
              </div>
            </div>
          </div>

          <div className="grid w-full grid-cols-1 gap-2 font-mono sm:grid-cols-2 md:w-auto">
            <div className="well-recessed-light min-w-40 p-3">
              <div className="text-[10px] font-bold text-[#4b5563] uppercase">TRANSACTIONS SENT</div>
              <div className="text-xl font-black text-orange-ink">{mostInteractedWallet.txCount} TXS</div>
            </div>
            <div className="well-recessed-light min-w-48 p-3">
              <div className="text-[10px] font-bold text-[#4b5563] uppercase">TOTAL CAPITAL SENT</div>
              <div className={`text-xl font-black ${mostInteractedWallet.volumeUSD > 0 ? 'text-[#0a0a0a]' : 'text-[#92400e]'}`}>
                {formatGraphVolume(mostInteractedWallet.volumeUSD, mostInteractedWallet.txCount)}
              </div>
              {mostInteractedWallet.volumeUSD <= 0 && <div className="text-[10px] font-bold text-[#92400e]">USD value unavailable</div>}
            </div>
          </div>
        </section>
      ) : (
        <div className="card-3d p-4 text-[#4b5563] text-xs font-mono font-bold">
          No external recipient EOA wallets recorded in outbound transfer events.
        </div>
      )}

      {/* ── Controls Row ── */}
      <div className="card-3d flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="horizontal-scroll-region flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
          <span className="shrink-0 text-xs font-bold text-[#4b5563] uppercase">Min Volume:</span>
          {[0, 100, 500, 2000, 10000].map(amt => (
            <button
              key={amt}
              onClick={() => setMinVolume(amt)}
              className={`min-h-11 px-3 py-1 md:min-h-9 md:px-2.5 cursor-pointer text-xs font-bold ${
                minVolume === amt
                  ? 'btn-3d-black text-white'
                  : 'btn-3d-neutral text-[#4b5563]'
              }`}
            >
              {amt === 0 ? 'All' : `$${amt >= 1000 ? amt/1000 + 'K' : amt}+`}
            </button>
          ))}
        </div>

        <div className="horizontal-scroll-region flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
          <span className="shrink-0 text-xs font-bold text-[#4b5563] uppercase">Network:</span>
          {([
            { id: 'all', label: 'All' },
            { id: 1, label: 'Ethereum' },
            { id: 42161, label: 'Arbitrum' },
            { id: 8453, label: 'Base' },
            { id: 10, label: 'Optimism' },
          ] as Array<{ id: number | 'all'; label: string }>).map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedChain(c.id)}
              className={`min-h-11 px-3 py-1 md:min-h-9 md:px-2.5 cursor-pointer text-xs font-bold ${
                selectedChain === c.id
                  ? 'btn-3d-black text-white'
                  : 'btn-3d-neutral text-[#4b5563]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Interactive SVG Topology Canvas ── */}
      <section aria-labelledby="capital-flow-graph-heading" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#c8c8c8] pb-3">
          <div>
            <h3 id="capital-flow-graph-heading" className="text-sm font-black uppercase tracking-wider text-[#0a0a0a]">Capital Flow Graph</h3>
            <p className="mt-1 text-[11px] font-bold text-[#4b5563]">Primary flow view · scroll horizontally on narrow screens</p>
          </div>
          <span className="font-mono text-[10px] font-bold text-[#6b7280]">{nodes.length} nodes · {links.length} connections</span>
        </div>
        <div className="relative overflow-hidden border border-[#222222] bg-[#0d0f17] shadow-2xl rounded-sm">
          <div
            className="horizontal-scroll-region flow-graph-scroll overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label={`Interactive capital flow graph with ${nodes.length} nodes and ${links.length} connections; scroll horizontally for the full graph.`}
          >
            <div className="min-w-[720px] p-4">
        <div className="sr-only">
          <h3>Capital flow graph summary</h3>
          <p>{nodes.length} nodes and {links.length} connections are shown for the selected filters.</p>
          <ul>
            {nodes.filter(node => node.type !== 'center').map(node => (
              <li key={node.id}>
                {node.type}: {node.label}
                {node.type === 'protocol' && ` on ${formatGraphNetworkLabel(node.chainName, node.chainId)}`}
                , {node.txCount} transactions, {formatGraphVolume(node.volumeUSD, node.txCount)}.
              </li>
            ))}
          </ul>
        </div>
        <svg viewBox="0 0 900 560" className="block h-auto w-full" aria-hidden="true">
          <defs>
            <pattern id="flow-grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="15" cy="15" r="1" fill="rgba(255, 255, 255, 0.05)" />
            </pattern>
          </defs>

          <rect width="900" height="560" fill="url(#flow-grid)" />

          <text x="110" y="24" textAnchor="middle" fill="#8b92a5" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>INFLOW SOURCES (CEX / WALLETS)</text>
          <text x="450" y="24" textAnchor="middle" fill="#8b92a5" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>DEFI PROTOCOLS & CORE WALLET</text>
          <text x="790" y="24" textAnchor="middle" fill="#8b92a5" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>OUTFLOW DESTINATIONS</text>

          {/* Links */}
          {links.map((link, i) => {
            const src = activeNodeMap.get(link.source);
            const tgt = activeNodeMap.get(link.target);
            if (!src || !tgt) return null;

            const dx = tgt.x - src.x;
            const cx1 = src.x + dx * 0.5;
            const cy1 = src.y;
            const cx2 = src.x + dx * 0.5;
            const cy2 = tgt.y;

            const pathD = `M ${src.x} ${src.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tgt.x} ${tgt.y}`;

            return (
              <g key={i}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={link.color}
                  strokeWidth="2.5"
                  strokeOpacity="0.4"
                />
                <path
                  d={pathD}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeOpacity="0.8"
                  strokeDasharray="4, 8"
                  className="graph-flow-line"
                />
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const isHovered = hoveredNodeId === node.id;

            if (node.type === 'center') {
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onFocus={() => setHoveredNodeId(node.id)}
                  onBlur={() => setHoveredNodeId(null)}
                  onClick={() => handleNodeClick(node)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNodeClick(node)}
                  tabIndex={0}
                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-ink"
                  style={{ cursor: 'pointer' }}
                >
                  <circle r="36" fill="#000000" stroke="#ff5500" strokeWidth="3" />
                  <text y="-4" textAnchor="middle" fill="#ffffff" style={{ fontSize: 11, fontWeight: 800 }}>
                    Your Wallet
                  </text>
                  <text y="12" textAnchor="middle" fill="#ff5500" style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace' }}>
                    {node.subLabel}
                  </text>
                </g>
              );
            }

            const nodeBorder = node.isTopRecipient
              ? '#ff5500'
              : node.type === 'inflow'
              ? '#059669'
              : node.type === 'outflow'
              ? '#f59e0b'
              : '#3b82f6';
            const networkLabel = node.type === 'protocol'
              ? formatGraphNetworkLabel(node.chainName, node.chainId)
              : null;
            const nodeBoxHeight = networkLabel ? 48 : 36;
            const nodeBoxY = networkLabel ? -24 : -18;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onFocus={() => setHoveredNodeId(node.id)}
                onBlur={() => setHoveredNodeId(null)}
                onClick={() => handleNodeClick(node)}
                onKeyDown={(e) => e.key === 'Enter' && handleNodeClick(node)}
                tabIndex={0}
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-ink"
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={-FLOW_GRAPH_NODE_WIDTH / 2}
                  y={nodeBoxY}
                  width={FLOW_GRAPH_NODE_WIDTH}
                  height={nodeBoxHeight}
                  fill="#11131a"
                  stroke={isHovered ? '#ffffff' : nodeBorder}
                  strokeWidth={node.isTopRecipient || isHovered ? 2 : 1}
                />
                <text x="0" y={networkLabel ? -10 : -2} textAnchor="middle" fill="#ffffff" style={{ fontSize: 11, fontWeight: 700 }}>
                  {node.label.length > 13 ? node.label.slice(0, 12) + '…' : node.label}
                </text>
                {networkLabel && (
                  <text className="flow-network-label" x="0" y="2" textAnchor="middle" fill="#a4adbf" style={{ fontSize: 8, fontWeight: 700 }}>
                    {networkLabel}
                  </text>
                )}
                <text x="0" y={networkLabel ? 16 : 11} textAnchor="middle" fill={nodeBorder} style={{ fontSize: 9, fontWeight: 700, fontFamily: 'monospace' }}>
                  {node.isTopRecipient ? `★ TOP (${node.txCount} txs)` : `${formatGraphVolume(node.volumeUSD, node.txCount)} · ${node.txCount} txs`}
                </text>
              </g>
            );
          })}
        </svg>
            </div>
          </div>

        {/* Hover Inspector Card */}
        {hoveredNode && (
          <div className="absolute bottom-3 left-3 right-3 z-10 min-w-0 space-y-2 border border-[#cecece] bg-[#dedede] p-4 text-[#0a0a0a] shadow-2xl sm:bottom-4 sm:left-auto sm:right-4 sm:min-w-[220px] sm:max-w-[280px]">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-[#0a0a0a]">{hoveredNode.label}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-[#d0d0d0] uppercase">{hoveredNode.type}</span>
            </div>
            <div className="text-xs space-y-1 font-mono">
              {hoveredNode.type === 'protocol' && (
                <div className="flex justify-between text-[#555555]">
                  <span>Network:</span>
                  <span className="font-bold text-[#0a0a0a]">{formatGraphNetworkLabel(hoveredNode.chainName, hoveredNode.chainId)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#555555]">
                <span>Address:</span>
                <span className="font-bold text-[#0a0a0a]">{truncAddr(hoveredNode.address)}</span>
              </div>
              <div className="flex justify-between text-[#555555]">
                <span>Volume:</span>
                <span className={hoveredNode.volumeUSD > 0 ? 'font-bold text-[#0a0a0a]' : 'font-bold text-[#92400e]'}>
                  {formatGraphVolume(hoveredNode.volumeUSD, hoveredNode.txCount)}
                </span>
              </div>
              <div className="flex justify-between text-[#555555]">
                <span>Transactions:</span>
                <span className="font-bold text-orange-ink">{hoveredNode.txCount} calls</span>
              </div>
            </div>
            {hoveredNode.address && (
              <button
                type="button"
                onClick={() => handleNodeClick(hoveredNode)}
                className="w-full min-h-11 md:min-h-9 mt-2 bg-black hover:bg-[#b33c00] text-white text-xs font-bold py-1.5 md:py-1 px-3 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Open Block Explorer</span>
                <ExternalLink size={12} />
              </button>
            )}
          </div>
        )}
        </div>
      </section>

      <details className="border-y border-[#c8c8c8] p-3 text-xs text-[#0a0a0a]">
        <summary className="min-h-11 md:min-h-9 cursor-pointer py-3 md:py-2 font-bold">Accessible capital flow data</summary>
        <ul className="mt-2 space-y-2 border-t border-[#c8c8c8] pt-3">
          {nodes.filter(node => node.type !== 'center').map(node => (
            <li key={node.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>
                {node.type}: {node.label}
                {node.type === 'protocol' && ` on ${formatGraphNetworkLabel(node.chainName, node.chainId)}`}
                , {node.txCount} transactions, {formatGraphVolume(node.volumeUSD, node.txCount)}.
              </span>
              {node.address && (
                <a
                  href={getExplorerAddressUrl(node.chainId, node.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-3d-neutral inline-flex min-h-11 md:min-h-9 items-center justify-center px-3 py-2 md:py-1.5 font-bold"
                >
                  Open {node.label}{node.type === 'protocol' ? ` on ${formatGraphNetworkLabel(node.chainName, node.chainId)}` : ''} on explorer
                </a>
              )}
            </li>
          ))}
        </ul>
      </details>

      {/* ── Ranked counterparty evidence ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-5 pt-2">
        
        {/* Left: Top Outbound Wallets (You Sent To) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#0a0a0a] uppercase tracking-wider flex items-center gap-1.5">
              <ArrowUpRight size={15} className="text-orange-ink" />
              TOP RECIPIENT WALLETS (MOST SENT TO)
            </span>
            <span className="text-xs font-bold font-mono text-[#555555]">
              {topOutboundWallets.length} EOA Wallets
            </span>
          </div>

          <div
            className="horizontal-scroll-region border border-[#cecece] bg-[#dedede] overflow-hidden overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Capital inflows table; scroll horizontally for all columns"
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#d4d4d4] border-b border-[#cecece] text-[10px] font-extrabold text-[#555555] uppercase tracking-wider">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">RECIPIENT WALLET</th>
                  <th className="py-2.5 px-3 text-right">TXS SENT</th>
                  <th className="py-2.5 px-3 text-right">VOLUME</th>
                  <th className="py-2.5 px-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#cecece] text-xs font-bold text-[#0a0a0a]">
                {topOutboundWallets.slice(0, 7).map((w, i) => (
                  <tr key={w.address} className="hover:bg-[#d5d5d5] transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[#777777]">{i + 1}</td>
                    <td className="py-2.5 px-3 font-mono">
                      <div className="font-bold text-[#0a0a0a]">{w.label || truncAddr(w.address)}</div>
                      {w.label && <div className="text-[10px] text-[#555555]">{truncAddr(w.address)}</div>}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-orange-ink">
                      {w.txCount} txs
                    </td>
                    <td className={`py-2.5 px-3 text-right font-mono font-bold ${w.volumeUSD > 0 ? 'text-[#0a0a0a]' : 'text-[#92400e]'}`}>
                      {formatGraphVolume(w.volumeUSD, w.txCount)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleNodeClick(w)}
                        className="inline-flex min-h-11 min-w-11 md:min-h-9 md:min-w-9 items-center justify-center text-[#555555] hover:text-black cursor-pointer"
                        title="View on Explorer"
                      >
                        <ExternalLink size={13} className="ml-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Top Inbound Wallets (Sent Funds to You) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#0a0a0a] uppercase tracking-wider flex items-center gap-1.5">
              <ArrowDownLeft size={15} className="text-[#047857]" />
              TOP FUNDING WALLETS (MOST RECEIVED FROM)
            </span>
            <span className="text-xs font-bold font-mono text-[#555555]">
              {topInboundWallets.length} Senders
            </span>
          </div>

          <div
            className="horizontal-scroll-region border border-[#cecece] bg-[#dedede] overflow-hidden overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Capital outflows table; scroll horizontally for all columns"
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#d4d4d4] border-b border-[#cecece] text-[10px] font-extrabold text-[#555555] uppercase tracking-wider">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">SENDER WALLET</th>
                  <th className="py-2.5 px-3 text-right">TXS RECEIVED</th>
                  <th className="py-2.5 px-3 text-right">VOLUME</th>
                  <th className="py-2.5 px-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#cecece] text-xs font-bold text-[#0a0a0a]">
                {topInboundWallets.slice(0, 7).map((w, i) => (
                  <tr key={w.address} className="hover:bg-[#d5d5d5] transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[#777777]">{i + 1}</td>
                    <td className="py-2.5 px-3 font-mono">
                      <div className="font-bold text-[#0a0a0a]">{w.label || truncAddr(w.address)}</div>
                      {w.label && <div className="text-[10px] text-[#555555]">{truncAddr(w.address)}</div>}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-[#047857]">
                      {w.txCount} txs
                    </td>
                    <td className={`py-2.5 px-3 text-right font-mono font-bold ${w.volumeUSD > 0 ? 'text-[#0a0a0a]' : 'text-[#92400e]'}`}>
                      {formatGraphVolume(w.volumeUSD, w.txCount)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleNodeClick(w)}
                        className="inline-flex min-h-11 min-w-11 md:min-h-9 md:min-w-9 items-center justify-center text-[#555555] hover:text-black cursor-pointer"
                        title="View on Explorer"
                      >
                        <ExternalLink size={13} className="ml-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <style jsx>{`
        @keyframes flowDash {
          to { stroke-dashoffset: -24; }
        }
        .graph-flow-line {
          animation: flowDash 1.2s linear infinite;
        }
      `}</style>
    </div>
  );
}
