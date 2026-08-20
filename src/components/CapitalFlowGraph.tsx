'use client';

import React, { useState, useMemo } from 'react';
import { ScanResult } from '@/lib/types';
import { getExplorerAddressUrl } from '@/lib/chains';
import { ExternalLink, ArrowUpRight, ArrowDownLeft, Trophy } from 'lucide-react';
import { isBurnAddress, isPureTokenContract, PROTOCOL_REGISTRY } from '@/lib/labels';

interface Props {
  results: ScanResult[];
}

interface GraphNode {
  id: string;
  label: string;
  subLabel?: string;
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

function formatUSD(val: number): string {
  if (Math.abs(val) >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
  if (Math.abs(val) >= 1000) return `$${(val / 1000).toFixed(1)}K`;
  return `$${val.toFixed(0)}`;
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

export default function CapitalFlowGraph({ results }: Props) {
  const [minVolume, setMinVolume] = useState<number>(0);
  const [selectedChain, setSelectedChain] = useState<number | 'all'>('all');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const userAddress = results[0]?.address?.toLowerCase() || '';

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
        const pId = `proto-${p.protocol || p.name}`;
        const contractAddr = p.contracts && p.contracts.length > 0
          ? p.contracts[0].contractAddress
          : (p as any).contractAddress || '';

        const existing = nodeMap.get(pId) || {
          id: pId,
          label: p.name,
          subLabel: p.protocol !== p.name ? p.protocol : undefined,
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

    const protoTop = protocolNodes.slice(0, Math.ceil(protocolNodes.length / 2));
    const protoBottom = protocolNodes.slice(Math.ceil(protocolNodes.length / 2));

    protoTop.forEach((node, i) => {
      const step = 400 / (protoTop.length + 1);
      node.x = 250 + (i + 1) * step;
      node.y = 70;
    });

    protoBottom.forEach((node, i) => {
      const step = 400 / (protoBottom.length + 1);
      node.x = 250 + (i + 1) * step;
      node.y = 490;
    });

    outflowNodes.forEach((node, i) => {
      const step = 500 / (outflowNodes.length + 1);
      node.x = 790;
      node.y = 40 + (i + 1) * step;
    });

    const activeNodes = [
      nodeMap.get('center')!,
      ...inflowNodes,
      ...protocolNodes,
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
    <div className="space-y-6">
      {/* ── Top Hero: Most Interacted Recipient Wallet Banner ── */}
      {mostInteractedWallet ? (
        <div className="card-3d p-5 text-[#0a0a0a] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 btn-3d-orange text-white flex items-center justify-center font-black text-xl flex-shrink-0">
              <Trophy size={24} />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold tracking-widest text-[#ff5500] uppercase">
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
                  onClick={() => handleNodeClick(mostInteractedWallet)}
                  className="text-[#6b7280] hover:text-[#ff5500] transition-colors cursor-pointer"
                  title="View on Explorer"
                >
                  <ExternalLink size={13} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 font-mono self-start md:self-center border-t md:border-t-0 border-[#c8c8c8] pt-2 md:pt-0 w-full md:w-auto justify-between md:justify-end">
            <div>
              <div className="text-[10px] font-bold text-[#4b5563] uppercase">TRANSACTIONS SENT</div>
              <div className="text-xl font-black text-[#ff5500]">{mostInteractedWallet.txCount} TXS</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#4b5563] uppercase">TOTAL CAPITAL SENT</div>
              <div className="text-xl font-black text-[#0a0a0a]">{formatUSD(mostInteractedWallet.volumeUSD)}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card-3d p-4 text-[#4b5563] text-xs font-mono font-bold">
          No external recipient EOA wallets recorded in outbound transfer events.
        </div>
      )}

      {/* ── Controls Row ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#4b5563] uppercase">Min Volume:</span>
          {[0, 100, 500, 2000, 10000].map(amt => (
            <button
              key={amt}
              onClick={() => setMinVolume(amt)}
              className={`px-3 py-1 text-xs font-bold cursor-pointer ${
                minVolume === amt
                  ? 'btn-3d-black text-white'
                  : 'btn-3d-neutral text-[#4b5563]'
              }`}
            >
              {amt === 0 ? 'All' : `$${amt >= 1000 ? amt/1000 + 'K' : amt}+`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#4b5563] uppercase">Network:</span>
          {[{ id: 'all', label: 'All' }, { id: 1, label: 'Ethereum' }, { id: 42161, label: 'Arbitrum' }, { id: 8453, label: 'Base' }, { id: 10, label: 'Optimism' }].map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedChain(c.id as any)}
              className={`px-3 py-1 text-xs font-bold cursor-pointer ${
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
      <div className="relative bg-[#0d0f17] p-4 overflow-hidden border border-[#222222] shadow-2xl rounded-sm">
        <svg viewBox="0 0 900 560" className="w-full h-auto max-h-[560px] block">
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
            const dy = tgt.y - src.y;
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
                  onClick={() => handleNodeClick(node)}
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

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onClick={() => handleNodeClick(node)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x="-65"
                  y="-18"
                  width="130"
                  height="36"
                  fill="#11131a"
                  stroke={isHovered ? '#ffffff' : nodeBorder}
                  strokeWidth={node.isTopRecipient || isHovered ? 2 : 1}
                />
                <text x="0" y="-2" textAnchor="middle" fill="#ffffff" style={{ fontSize: 11, fontWeight: 700 }}>
                  {node.label.length > 13 ? node.label.slice(0, 12) + '…' : node.label}
                </text>
                <text x="0" y="11" textAnchor="middle" fill={nodeBorder} style={{ fontSize: 9, fontWeight: 700, fontFamily: 'monospace' }}>
                  {node.isTopRecipient ? `★ TOP (${node.txCount} txs)` : `${formatUSD(node.volumeUSD)} · ${node.txCount} txs`}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Inspector Card */}
        {hoveredNode && (
          <div className="absolute bottom-4 right-4 bg-[#dedede] text-[#0a0a0a] p-4 shadow-2xl border border-[#cecece] min-w-[220px] space-y-2 z-10">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-[#0a0a0a]">{hoveredNode.label}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-[#d0d0d0] uppercase">{hoveredNode.type}</span>
            </div>
            <div className="text-xs space-y-1 font-mono">
              <div className="flex justify-between text-[#555555]">
                <span>Address:</span>
                <span className="font-bold text-[#0a0a0a]">{truncAddr(hoveredNode.address)}</span>
              </div>
              <div className="flex justify-between text-[#555555]">
                <span>Volume:</span>
                <span className="font-bold text-[#0a0a0a]">{formatUSD(hoveredNode.volumeUSD)}</span>
              </div>
              <div className="flex justify-between text-[#555555]">
                <span>Transactions:</span>
                <span className="font-bold text-[#ff5500]">{hoveredNode.txCount} calls</span>
              </div>
            </div>
            {hoveredNode.address && (
              <button
                type="button"
                onClick={() => handleNodeClick(hoveredNode)}
                className="w-full mt-2 bg-black hover:bg-[#ff5500] text-white text-xs font-bold py-1.5 px-3 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Open Block Explorer</span>
                <ExternalLink size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Ranked Counterparties Tables (Square Toned Gray Cards) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        
        {/* Left: Top Outbound Wallets (You Sent To) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#0a0a0a] uppercase tracking-wider flex items-center gap-1.5">
              <ArrowUpRight size={15} className="text-[#ff5500]" />
              TOP RECIPIENT WALLETS (MOST SENT TO)
            </span>
            <span className="text-xs font-bold font-mono text-[#555555]">
              {topOutboundWallets.length} EOA Wallets
            </span>
          </div>

          <div className="border border-[#cecece] bg-[#dedede] overflow-hidden overflow-x-auto">
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
                    <td className="py-2.5 px-3 text-right font-mono font-black text-[#ff5500]">
                      {w.txCount} txs
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0a0a0a]">
                      {formatUSD(w.volumeUSD)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleNodeClick(w)}
                        className="text-[#555555] hover:text-black cursor-pointer"
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
              <ArrowDownLeft size={15} className="text-[#059669]" />
              TOP FUNDING WALLETS (MOST RECEIVED FROM)
            </span>
            <span className="text-xs font-bold font-mono text-[#555555]">
              {topInboundWallets.length} Senders
            </span>
          </div>

          <div className="border border-[#cecece] bg-[#dedede] overflow-hidden overflow-x-auto">
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
                    <td className="py-2.5 px-3 text-right font-mono font-black text-[#059669]">
                      {w.txCount} txs
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0a0a0a]">
                      {formatUSD(w.volumeUSD)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleNodeClick(w)}
                        className="text-[#555555] hover:text-black cursor-pointer"
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
