'use client';

import React, { useState, useMemo } from 'react';
import { ScanResult } from '@/lib/types';
import { getChainConfig, getExplorerAddressUrl } from '@/lib/chains';
import { Network, Filter, ExternalLink } from 'lucide-react';
import { isBurnAddress } from '@/lib/labels';

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

export default function CapitalFlowGraph({ results }: Props) {
  const [minVolume, setMinVolume] = useState<number>(100);
  const [selectedChain, setSelectedChain] = useState<number | 'all'>('all');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const userAddress = results[0]?.address?.toLowerCase() || '';

  const handleNodeClick = (node: GraphNode) => {
    if (node.address) {
      const url = getExplorerAddressUrl(node.chainId || 1, node.address);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Extract graph nodes and links from results
  const { nodes, links, totalInflowUSD, totalOutflowUSD, totalDeFiVolumeUSD } = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();
    const linkList: GraphLink[] = [];

    let sumInflow = 0;
    let sumOutflow = 0;
    let sumDeFi = 0;

    // 1. Central Wallet Node
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

    // 2. Extract Protocols & DApps
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
        sumDeFi += p.totalVolumeUSD;
        nodeMap.set(pId, existing);

        linkList.push({
          source: 'center',
          target: pId,
          volumeUSD: p.totalVolumeUSD,
          txCount: p.txCount,
          chainId: p.chainId,
          color: getCategoryColor(p.category as string),
        });
      }
    }

    // 3. Extract Inflows & Outflows from Counterparties
    for (const r of activeResults) {
      for (const c of r.interactionsSummary?.topCounterparties || []) {
        const cAddr = c.address.toLowerCase();
        if (cAddr === userAddress || isBurnAddress(cAddr)) continue;

        // Inflow Source Node
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
          sumInflow += c.inboundUSD;
          nodeMap.set(inId, existing);

          linkList.push({
            source: inId,
            target: 'center',
            volumeUSD: c.inboundUSD,
            txCount: c.inboundCount,
            chainId: c.chainId,
            color: 'var(--accent-emerald)',
          });
        }

        // Outflow Destination Node
        if (c.outboundUSD >= minVolume || (c.outboundCount > 0 && minVolume === 0)) {
          const outId = `out-${cAddr}`;
          const label = c.label || truncAddr(c.address);

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
            x: 0,
            y: 0,
          };

          existing.volumeUSD += c.outboundUSD;
          existing.txCount += c.outboundCount;
          sumOutflow += c.outboundUSD;
          nodeMap.set(outId, existing);

          linkList.push({
            source: 'center',
            target: outId,
            volumeUSD: c.outboundUSD,
            txCount: c.outboundCount,
            chainId: c.chainId,
            color: 'var(--accent-amber)',
          });
        }
      }
    }

    // 4. Calculate Positions for 3-Column Visual Layout
    const inflowNodes = Array.from(nodeMap.values()).filter(n => n.type === 'inflow').slice(0, 7);
    const protocolNodes = Array.from(nodeMap.values()).filter(n => n.type === 'protocol').slice(0, 8);
    const outflowNodes = Array.from(nodeMap.values()).filter(n => n.type === 'outflow').slice(0, 7);

    // Layout Inflows on Left (X: 100)
    inflowNodes.forEach((node, i) => {
      const step = 500 / (inflowNodes.length + 1);
      node.x = 100;
      node.y = 40 + (i + 1) * step;
    });

    // Layout Protocols Top & Bottom (X: 450, Y: staggered top and bottom)
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

    // Layout Outflows on Right (X: 800)
    outflowNodes.forEach((node, i) => {
      const step = 500 / (outflowNodes.length + 1);
      node.x = 800;
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
      totalInflowUSD: sumInflow,
      totalOutflowUSD: sumOutflow,
      totalDeFiVolumeUSD: sumDeFi,
    };
  }, [results, minVolume, selectedChain, userAddress]);

  const activeNodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  // Filter highlights
  const highlightedLinks = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>();
    const set = new Set<string>();
    for (const l of links) {
      if (l.source === hoveredNodeId || l.target === hoveredNodeId) {
        set.add(`${l.source}->${l.target}`);
      }
    }
    return set;
  }, [hoveredNodeId, links]);

  const hoveredNode = hoveredNodeId ? activeNodeMap.get(hoveredNodeId) : null;

  return (
    <div style={styles.container} className="animate-fade-in-up">
      {/* Top Banner & Stats */}
      <div style={styles.headerCard} className="glass-card">
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}>
            <Network size={22} color="var(--accent-indigo)" />
          </div>
          <div>
            <h3 style={styles.headerTitle}>Arkham-Style Capital Flow Graph</h3>
            <p style={styles.headerDesc}>
              Visual on-chain bridge and fund intelligence. Click on any node or address to open its block explorer scan.
            </p>
          </div>
        </div>

        <div style={styles.flowMetrics}>
          <FlowMetric label="Total Inflow" value={formatUSD(totalInflowUSD)} color="var(--accent-emerald)" />
          <FlowMetric label="DeFi Volume" value={formatUSD(totalDeFiVolumeUSD)} color="var(--accent-indigo)" />
          <FlowMetric label="Total Outflow" value={formatUSD(totalOutflowUSD)} color="var(--accent-amber)" />
        </div>
      </div>

      {/* Graph Filter Controls */}
      <div style={styles.controlsRow}>
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}><Filter size={14} /> Min Volume:</span>
          {[0, 100, 500, 2000, 10000].map(amt => (
            <button
              key={amt}
              onClick={() => setMinVolume(amt)}
              style={{
                ...styles.filterBtn,
                background: minVolume === amt ? 'var(--accent-indigo)' : 'var(--bg-glass)',
                color: minVolume === amt ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {amt === 0 ? 'All' : `$${amt >= 1000 ? amt/1000 + 'K' : amt}+`}
            </button>
          ))}
        </div>

        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>Network:</span>
          {[{ id: 'all', label: 'All Chains' }, { id: 1, label: 'Ethereum' }, { id: 42161, label: 'Arbitrum' }, { id: 8453, label: 'Base' }, { id: 10, label: 'Optimism' }].map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedChain(c.id as any)}
              style={{
                ...styles.filterBtn,
                background: selectedChain === c.id ? 'var(--accent-indigo)' : 'var(--bg-glass)',
                color: selectedChain === c.id ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive SVG Canvas */}
      <div className="glass-card" style={styles.canvasCard}>
        <svg viewBox="0 0 900 560" style={styles.svgCanvas}>
          <defs>
            {/* Background Grid Pattern */}
            <pattern id="graph-grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="15" cy="15" r="1" fill="rgba(255, 255, 255, 0.04)" />
            </pattern>

            {/* Gradients */}
            <linearGradient id="inflowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.8" />
            </linearGradient>

            <linearGradient id="outflowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.8" />
            </linearGradient>

            {/* Glow Filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid Background */}
          <rect width="900" height="560" fill="url(#graph-grid)" />

          {/* Column Header Annotations */}
          <text x="100" y="24" textAnchor="middle" style={styles.colHeader}>INFLOW SOURCES (CEX / WALLETS)</text>
          <text x="450" y="24" textAnchor="middle" style={styles.colHeader}>DEFI PROTOCOLS & CORE WALLET</text>
          <text x="800" y="24" textAnchor="middle" style={styles.colHeader}>OUTFLOW DESTINATIONS</text>

          {/* Directed Links with Curved Bezier & Particle Animation */}
          {links.map((link, i) => {
            const src = activeNodeMap.get(link.source);
            const tgt = activeNodeMap.get(link.target);
            if (!src || !tgt) return null;

            const isHovered = hoveredNodeId && (link.source === hoveredNodeId || link.target === hoveredNodeId);
            const linkKey = `${link.source}->${link.target}`;
            const isDimmed = hoveredNodeId && !isHovered;

            const dx = tgt.x - src.x;
            const dy = tgt.y - src.y;
            const cx1 = src.x + dx * 0.5;
            const cy1 = src.y;
            const cx2 = src.x + dx * 0.5;
            const cy2 = tgt.y;

            const pathD = `M ${src.x} ${src.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tgt.x} ${tgt.y}`;
            const strokeWidth = Math.max(2, Math.min(8, Math.log10(link.volumeUSD + 10) * 1.5));

            return (
              <g key={i} style={{ opacity: isDimmed ? 0.15 : 1, transition: 'all 0.3s ease' }}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={link.color}
                  strokeWidth={strokeWidth}
                  strokeOpacity={isHovered ? 0.9 : 0.35}
                  filter={isHovered ? 'url(#glow)' : undefined}
                />
                <path
                  d={pathD}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={Math.max(1.5, strokeWidth * 0.6)}
                  strokeOpacity={isHovered ? 0.9 : 0.6}
                  strokeDasharray="6, 12"
                  className="graph-flow-line"
                />
              </g>
            );
          })}

          {/* Render Nodes */}
          {nodes.map(node => {
            const isHovered = hoveredNodeId === node.id;
            const isDimmed = hoveredNodeId && !isHovered && !highlightedLinks.has(`center->${node.id}`) && !highlightedLinks.has(`${node.id}->center`);

            if (node.type === 'center') {
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={() => handleNodeClick(node)}
                  style={{ cursor: 'pointer', opacity: isDimmed ? 0.3 : 1, transition: 'all 0.3s ease' }}
                >
                  <circle r="44" fill="rgba(129, 140, 248, 0.15)" className="pulse-center" />
                  <circle r="34" fill="var(--bg-tertiary)" stroke="var(--accent-indigo)" strokeWidth="3" filter="url(#glow)" />
                  <text y="-6" textAnchor="middle" fill="#ffffff" style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-sans)' }}>
                    Your Wallet
                  </text>
                  <text y="12" textAnchor="middle" fill="var(--accent-indigo)" style={{ fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    {node.subLabel}
                  </text>
                </g>
              );
            }

            const nodeColor = getNodeColor(node);

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onClick={() => handleNodeClick(node)}
                style={{ cursor: 'pointer', opacity: isDimmed ? 0.25 : 1, transition: 'all 0.3s ease' }}
              >
                {/* Node Box */}
                <rect
                  x="-75"
                  y="-22"
                  width="150"
                  height="44"
                  rx="10"
                  fill="var(--bg-secondary)"
                  stroke={isHovered ? '#ffffff' : nodeColor}
                  strokeWidth={isHovered ? 2 : 1.2}
                  filter={isHovered ? 'url(#glow)' : undefined}
                />

                {/* Node Dot */}
                <circle cx="-58" cy="0" r="5" fill={nodeColor} />

                {/* Node Title */}
                <text x="-46" y="-3" fill="#ffffff" style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
                  {node.label.length > 14 ? node.label.slice(0, 13) + '…' : node.label}
                </text>

                {/* Node Value */}
                <text x="-46" y="12" fill={nodeColor} style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {formatUSD(node.volumeUSD)} · {node.txCount} txs
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Inspector Card with Clickable Explorer Action */}
        {hoveredNode && (
          <div style={styles.tooltipCard}>
            <div style={styles.tooltipHeader}>
              <span style={{ ...styles.tooltipDot, background: getNodeColor(hoveredNode) }} />
              <span style={styles.tooltipTitle}>{hoveredNode.label}</span>
              <span style={styles.tooltipBadge}>{hoveredNode.type.toUpperCase()}</span>
            </div>
            <div style={styles.tooltipMetrics}>
              {hoveredNode.address && (
                <div>
                  <span style={styles.tooltipLabel}>Address:</span>
                  <span className="mono" style={{ ...styles.tooltipVal, fontSize: '0.74rem' }}>
                    {truncAddr(hoveredNode.address)}
                  </span>
                </div>
              )}
              <div>
                <span style={styles.tooltipLabel}>Total Volume:</span>
                <span style={styles.tooltipVal}>{formatUSD(hoveredNode.volumeUSD)}</span>
              </div>
              <div>
                <span style={styles.tooltipLabel}>Transactions:</span>
                <span style={styles.tooltipVal}>{hoveredNode.txCount} calls</span>
              </div>
              {hoveredNode.category && (
                <div>
                  <span style={styles.tooltipLabel}>Category:</span>
                  <span style={styles.tooltipVal}>{hoveredNode.category}</span>
                </div>
              )}
            </div>

            {/* Clickable Action */}
            {hoveredNode.address && (
              <button
                type="button"
                onClick={() => handleNodeClick(hoveredNode)}
                style={styles.explorerBtn}
              >
                <span>Open Block Explorer</span>
                <ExternalLink size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes flowDash {
          to {
            stroke-dashoffset: -36;
          }
        }
        .graph-flow-line {
          animation: flowDash 1.2s linear infinite;
        }
        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.15); opacity: 0.4; }
        }
        .pulse-center {
          animation: pulseGlow 2.5s ease-in-out infinite;
          transform-origin: center;
        }
      `}</style>
    </div>
  );
}

function FlowMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={styles.flowMetricItem}>
      <span style={styles.flowMetricLabel}>{label}</span>
      <span style={{ ...styles.flowMetricValue, color }}>{value}</span>
    </div>
  );
}

function getNodeColor(node: GraphNode): string {
  if (node.type === 'inflow') return 'var(--accent-emerald)';
  if (node.type === 'outflow') return 'var(--accent-amber)';
  if (node.type === 'protocol') return getCategoryColor(node.category || '');
  return 'var(--accent-indigo)';
}

function getCategoryColor(cat: string): string {
  switch (cat) {
    case 'swap': return 'var(--accent-blue)';
    case 'bridge': return 'var(--accent-purple)';
    case 'lending': return 'var(--accent-emerald)';
    case 'perps': return '#f97316';
    case 'staking': return 'var(--accent-amber)';
    case 'nft': return '#ec4899';
    default: return 'var(--accent-indigo)';
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
  },
  headerCard: {
    padding: 'var(--space-lg)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: 'var(--space-md)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
    maxWidth: 500,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 'var(--radius-md)',
    background: 'var(--accent-indigo-dim)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: 2,
  },
  headerDesc: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
  },
  flowMetrics: {
    display: 'flex',
    gap: 'var(--space-lg)',
    flexWrap: 'wrap' as const,
  },
  flowMetricItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  flowMetricLabel: {
    fontSize: '0.72rem',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    fontWeight: 500,
  },
  flowMetricValue: {
    fontSize: '1.25rem',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
  },
  controlsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 'var(--space-md)',
    flexWrap: 'wrap' as const,
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-xs)',
    flexWrap: 'wrap' as const,
  },
  filterLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginRight: 4,
  },
  filterBtn: {
    padding: '4px 12px',
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--border-primary)',
    fontSize: '0.75rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    fontFamily: 'var(--font-sans)',
  },
  canvasCard: {
    padding: 'var(--space-md)',
    position: 'relative' as const,
    overflow: 'hidden' as const,
    borderRadius: 'var(--radius-lg)',
    background: 'radial-gradient(ellipse at center, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.9) 100%)',
  },
  svgCanvas: {
    width: '100%',
    height: 'auto',
    maxHeight: 560,
    display: 'block',
  },
  colHeader: {
    fill: 'var(--text-tertiary)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.08em',
    fontFamily: 'var(--font-sans)',
  },
  tooltipCard: {
    position: 'absolute' as const,
    bottom: 20,
    right: 20,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-secondary)',
    borderRadius: 'var(--radius-md)',
    padding: '14px 16px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minWidth: 230,
    zIndex: 10,
  },
  tooltipHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  tooltipDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
  tooltipTitle: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    flex: 1,
  },
  tooltipBadge: {
    fontSize: '0.68rem',
    padding: '2px 6px',
    borderRadius: 'var(--radius-full)',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-tertiary)',
    fontWeight: 600,
  },
  tooltipMetrics: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    fontSize: '0.78rem',
  },
  tooltipLabel: {
    color: 'var(--text-tertiary)',
    marginRight: 6,
  },
  tooltipVal: {
    fontWeight: 600,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
  },
  explorerBtn: {
    marginTop: 4,
    padding: '6px 12px',
    background: 'var(--accent-indigo-dim)',
    border: '1px solid var(--accent-indigo)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--accent-indigo)',
    fontSize: '0.78rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
};
