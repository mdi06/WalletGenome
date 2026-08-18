'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BulkWrappedWallet, ClusterLinkage } from '@/lib/types';
import { formatCompactUSD } from './Dashboard';
import { ZoomIn, ZoomOut, RotateCcw, ArrowRight, Move, ExternalLink, GitFork } from 'lucide-react';
import { getExplorerAddressUrl } from '@/lib/chains';

interface Props {
  wallets: BulkWrappedWallet[];
  linkages: ClusterLinkage[];
  sharedCounterparties: { address: string; label: string | null; sharedCount: number }[];
  onInspectWallet: (address: string) => void;
}

interface ClusterNode {
  id: string;
  address: string;
  name: string;
  type: 'batch_wallet' | 'shared_hub';
  persona?: string;
  riskGrade?: string;
  sybilProb?: number;
  totalGasUSD?: number;
  totalInflowUSD?: number;
  sharedCount?: number;
  x: number;
  y: number;
}

interface RenderLink {
  id: string;
  source: string;
  target: string;
  sourceNode: ClusterNode;
  targetNode: ClusterNode;
  type: 'direct' | 'hub';
  txCount?: number;
  volumeUSD?: number;
  chainId?: number;
  lastDate?: string;
  detail?: string;
  color: string;
}

export default function ClusterFlowGraph({
  wallets,
  linkages,
  sharedCounterparties,
  onInspectWallet,
}: Props) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<RenderLink | null>(null);
  const [selectedLink, setSelectedLink] = useState<RenderLink | null>(null);

  // ── Spacious Canvas Dimensions ──
  const CANVAS_WIDTH = 1600;
  const CANVAS_HEIGHT = 1200;
  const centerX = CANVAS_WIDTH / 2;
  const centerY = CANVAS_HEIGHT / 2;

  // ── Pan & Zoom States (Hardware Accelerated) ──
  const initialScale = wallets.length > 20 ? 0.52 : wallets.length > 10 ? 0.68 : 0.88;
  const [scale, setScale] = useState<number>(initialScale);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Native Isolated Wheel Event to Prevent Page Scroll & Stutter ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const zoomFactor = -e.deltaY * 0.0018;
      setScale(prev => {
        const next = prev + zoomFactor;
        return Math.min(3.2, Math.max(0.25, next));
      });
    };

    el.addEventListener('wheel', onWheelNative, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheelNative);
    };
  }, []);

  const { nodes, links } = useMemo(() => {
    const nodeList: ClusterNode[] = [];
    const nodeMap = new Map<string, ClusterNode>();

    // Generous orbital radius ensuring ample whitespace between all wallet cards
    const orbitalRadius = Math.max(320, wallets.length * 24.5);

    // 1. Arrange Batch Wallets in an orbital circle with generous spacing
    wallets.forEach((w, i) => {
      const angle = (2 * Math.PI * i) / wallets.length - Math.PI / 2;
      const x = centerX + orbitalRadius * Math.cos(angle);
      const y = centerY + orbitalRadius * Math.sin(angle);

      const node: ClusterNode = {
        id: w.address.toLowerCase(),
        address: w.address,
        name: w.primaryName || `${w.address.slice(0, 6)}...${w.address.slice(-4)}`,
        type: 'batch_wallet',
        persona: w.persona,
        riskGrade: w.riskGrade,
        sybilProb: w.sybilProbability,
        totalGasUSD: w.totalGasUSD,
        totalInflowUSD: w.totalInflowUSD,
        x,
        y,
      };

      nodeList.push(node);
      nodeMap.set(w.address.toLowerCase(), node);
    });

    // 2. Arrange Top Shared Hubs in the center / inner circle with clean separation
    const topHubs = sharedCounterparties.slice(0, 4);
    topHubs.forEach((hub, i) => {
      const hubAngle = (2 * Math.PI * i) / (topHubs.length || 1);
      const hubRadius = topHubs.length > 1 ? 140 : 0;
      const x = centerX + hubRadius * Math.cos(hubAngle);
      const y = centerY + hubRadius * Math.sin(hubAngle);

      const hubId = `hub-${hub.address.toLowerCase()}`;
      const node: ClusterNode = {
        id: hubId,
        address: hub.address,
        name: hub.label || `${hub.address.slice(0, 6)}...${hub.address.slice(-4)}`,
        type: 'shared_hub',
        sharedCount: hub.sharedCount,
        x,
        y,
      };

      nodeList.push(node);
      nodeMap.set(hubId, node);
    });

    // 3. Construct Visual Links
    const linkList: RenderLink[] = [];

    // Direct Inter-Wallet Links
    linkages.forEach((l, idx) => {
      const src = nodeMap.get(l.source.toLowerCase());
      const tgt = nodeMap.get(l.target.toLowerCase());
      if (src && tgt) {
        linkList.push({
          id: `direct-${l.source}-${l.target}-${idx}`,
          source: l.source.toLowerCase(),
          target: l.target.toLowerCase(),
          sourceNode: src,
          targetNode: tgt,
          type: 'direct',
          txCount: l.txCount,
          volumeUSD: l.volumeUSD,
          chainId: l.chainId || 1,
          lastDate: l.lastDate,
          detail: l.detail,
          color: '#ff5500',
        });
      }
    });

    // Shared Hub Links
    topHubs.forEach(hub => {
      const hubNode = nodeMap.get(`hub-${hub.address.toLowerCase()}`);
      if (!hubNode) return;

      wallets.forEach((w, wIdx) => {
        const hasCounterparty = w.counterparties?.some(c => c.address.toLowerCase() === hub.address.toLowerCase());
        if (hasCounterparty) {
          const wNode = nodeMap.get(w.address.toLowerCase());
          if (wNode) {
            linkList.push({
              id: `hub-${w.address}-${hub.address}-${wIdx}`,
              source: w.address.toLowerCase(),
              target: hubNode.id,
              sourceNode: wNode,
              targetNode: hubNode,
              type: 'hub',
              color: '#3b82f6',
            });
          }
        }
      });
    });

    return {
      nodes: nodeList,
      links: linkList,
    };
  }, [wallets, linkages, sharedCounterparties]);

  const activeNodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  const activeHoveredNode = hoveredNodeId ? activeNodeMap.get(hoveredNodeId) : null;
  const activeSelectedNode = selectedNodeId ? activeNodeMap.get(selectedNodeId) : null;
  const inspectorNode = activeSelectedNode || activeHoveredNode;

  const activeLink = selectedLink || hoveredLink;

  // ── Drag & Pan Handlers (Lag-Free) ──
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(prev => Math.min(3.2, prev + 0.2));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(prev => Math.max(0.25, prev - 0.2));
  };

  const handleResetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(initialScale);
    setPan({ x: 0, y: 0 });
    setSelectedNodeId(null);
    setSelectedLink(null);
  };

  return (
    <div className="space-y-4">
      {/* ── Top Status Strip & Navigation Legend ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#dedede] border border-[#cecece] text-xs font-mono font-bold text-[#0a0a0a]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-[#ff5500] animate-pulse-dot" />
          <span>ALL {wallets.length} WALLETS MAPPED IN CLUSTER TOPOLOGY</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5 text-[#ff5500]">
            <span className="w-3 h-1 bg-[#ff5500]" /> Direct Transfer ({linkages.length})
          </span>
          {sharedCounterparties.length > 0 && (
            <span className="flex items-center gap-1.5 text-[#3b82f6]">
              <span className="w-3 h-1 bg-[#3b82f6]" /> Shared Counterparty Hubs ({sharedCounterparties.length})
            </span>
          )}
        </div>
      </div>

      {/* ── High-Performance Interactive Canvas Container ── */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative bg-[#0d0f17] border border-[#cecece] shadow-inner overflow-hidden select-none touch-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          height: '660px',
          overscrollBehavior: 'contain',
        }}
      >
        {/* Floating Zoom & Pan Toolbar */}
        <div
          className="absolute top-4 left-4 z-20 flex items-center gap-1 bg-[#11131a]/95 backdrop-blur-md border border-[#333333] p-1.5 shadow-2xl text-white"
          onMouseDown={e => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
            title="Zoom In (+)"
          >
            <ZoomIn size={15} />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
            title="Zoom Out (-)"
          >
            <ZoomOut size={15} />
          </button>
          <div className="w-[1px] h-4 bg-[#333333] mx-1" />
          <span className="text-[10px] font-mono font-black px-1.5 text-[#ff5500]">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1.5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
            title="Reset View"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Pan / Drag Hint Badge */}
        <div className="absolute top-4 right-4 z-20 hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#11131a]/90 backdrop-blur-md border border-[#333333] text-[10px] font-mono font-bold text-gray-300">
          <Move size={11} className="text-[#ff5500]" />
          <span>Hover Transfers or Wallets to Inspect · Drag to Move</span>
        </div>

        {/* Main Transformable SVG Canvas with Hardware Acceleration */}
        <svg
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
          className="w-full h-full block"
          style={{ willChange: 'transform' }}
        >
          <defs>
            <pattern id="cluster-grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="1.2" fill="rgba(255, 255, 255, 0.06)" />
            </pattern>
          </defs>

          <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="url(#cluster-grid-pattern)" />

          {/* Subtitle */}
          <text x={centerX} y="45" textAnchor="middle" fill="#8b92a5" style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em' }}>
            INTER-WALLET CAPITAL MOVEMENTS & SHARED ECOSYSTEM HUBS
          </text>

          {/* GPU-Accelerated Scalable & Pannable Group */}
          <g
            transform={`translate(${pan.x}, ${pan.y}) translate(${centerX * (1 - scale)}, ${centerY * (1 - scale)}) scale(${scale})`}
            style={{
              transformOrigin: `${centerX}px ${centerY}px`,
              willChange: 'transform',
            }}
          >
            {/* Links */}
            {links.map((link) => {
              const src = link.sourceNode;
              const tgt = link.targetNode;

              const dx = tgt.x - src.x;
              const dy = tgt.y - src.y;
              const cx = (src.x + tgt.x) / 2 - dy * 0.15;
              const cy = (src.y + tgt.y) / 2 + dx * 0.15;

              const pathD = `M ${src.x} ${src.y} Q ${cx} ${cy}, ${tgt.x} ${tgt.y}`;
              const isDirect = link.type === 'direct';
              const isLinkActive = (hoveredLink?.id === link.id) || (selectedLink?.id === link.id);

              return (
                <g key={link.id}>
                  {/* Invisible Thicker Hover Hit-Area Path */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={isDirect ? '24' : '16'}
                    onMouseEnter={() => setHoveredLink(link)}
                    onMouseLeave={() => setHoveredLink(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLink(link);
                      setSelectedNodeId(null);
                    }}
                    style={{ cursor: 'pointer' }}
                  />

                  {/* Visible Flow Line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isLinkActive ? '#ffffff' : link.color}
                    strokeWidth={isLinkActive ? '5' : (isDirect ? '2.5' : '1.5')}
                    strokeOpacity={isLinkActive ? '1' : (isDirect ? '0.6' : '0.22')}
                    style={{ pointerEvents: 'none', transition: 'stroke-width 0.15s, stroke 0.15s' }}
                  />

                  {isDirect && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke={isLinkActive ? '#ff5500' : '#ffffff'}
                      strokeWidth={isLinkActive ? '2.5' : '1.5'}
                      strokeOpacity="0.95"
                      strokeDasharray="4, 8"
                      className="cluster-flow-line"
                      style={{ pointerEvents: 'none' }}
                    />
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map(node => {
              const isHovered = hoveredNodeId === node.id || selectedNodeId === node.id;
              const isConnectedToActiveLink = activeLink && (activeLink.sourceNode.id === node.id || activeLink.targetNode.id === node.id);

              if (node.type === 'shared_hub') {
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNodeId(node.id);
                      setSelectedLink(null);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      r="36"
                      fill="#151926"
                      stroke={isHovered || isConnectedToActiveLink ? '#ffffff' : '#3b82f6'}
                      strokeWidth={isHovered || isConnectedToActiveLink ? 4 : 2}
                    />
                    <text y="-4" textAnchor="middle" fill="#ffffff" style={{ fontSize: 10.5, fontWeight: 800 }}>
                      {node.name.length > 11 ? node.name.slice(0, 10) + '…' : node.name}
                    </text>
                    <text y="12" textAnchor="middle" fill="#3b82f6" style={{ fontSize: 9.5, fontWeight: 700, fontFamily: 'monospace' }}>
                      {node.sharedCount} Wallets
                    </text>
                  </g>
                );
              }

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNodeId(node.id);
                    setSelectedLink(null);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x="-65"
                    y="-19"
                    width="130"
                    height="38"
                    fill="#11131a"
                    stroke={isHovered || isConnectedToActiveLink ? '#ffffff' : '#ff5500'}
                    strokeWidth={isHovered || isConnectedToActiveLink ? 3.5 : 1.8}
                  />
                  <text x="0" y="-3" textAnchor="middle" fill="#ffffff" style={{ fontSize: 10.5, fontWeight: 800 }}>
                    {node.name.length > 15 ? node.name.slice(0, 14) + '…' : node.name}
                  </text>
                  <text x="0" y="11" textAnchor="middle" fill="#ff5500" style={{ fontSize: 8.5, fontWeight: 700, fontFamily: 'monospace' }}>
                    {node.persona?.toUpperCase()}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* ── Transfer Link Hover Inspector HUD (Direct Transaction Details) ── */}
        {activeLink && activeLink.type === 'direct' && !inspectorNode && (
          <div
            className="absolute bottom-4 right-4 bg-[#dedede] text-[#0a0a0a] p-4 shadow-2xl border border-[#ff5500] min-w-[280px] space-y-2 z-10 animate-fade-in-up"
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#cecece] pb-2">
              <span className="font-black text-xs uppercase text-[#0a0a0a] flex items-center gap-1.5">
                <GitFork size={13} className="text-[#ff5500]" />
                DIRECT INTER-WALLET TRANSFER
              </span>
              <span className="text-[9px] font-mono font-black px-2 py-0.5 bg-[#ff5500] text-white uppercase">
                {activeLink.txCount} TXS
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2 bg-[#d5d5d5] border border-[#c8c8c8] space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#555555]">Sender:</span>
                  <span className="font-black text-[#0a0a0a] truncate max-w-[150px]">{activeLink.sourceNode.name}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#555555]">Recipient:</span>
                  <span className="font-black text-[#0a0a0a] truncate max-w-[150px]">{activeLink.targetNode.name}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-[#555555]">Transferred Volume:</span>
                <span className="font-black text-base text-[#ff5500]">{formatCompactUSD(activeLink.volumeUSD || 0)}</span>
              </div>

              {activeLink.lastDate && (
                <div className="flex justify-between items-center text-[11px] text-[#555555]">
                  <span>Last Activity:</span>
                  <span className="font-bold text-[#0a0a0a]">{activeLink.lastDate}</span>
                </div>
              )}
            </div>

            <a
              href={getExplorerAddressUrl(activeLink.chainId || 1, activeLink.sourceNode.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full mt-2 bg-black hover:bg-[#ff5500] text-white text-xs font-bold py-1.5 px-3 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>View On Block Explorer</span>
              <ExternalLink size={12} />
            </a>
          </div>
        )}

        {/* ── Node Hover / Selection Inspector HUD ── */}
        {inspectorNode && (
          <div
            className="absolute bottom-4 right-4 bg-[#dedede] text-[#0a0a0a] p-4 shadow-2xl border border-[#cecece] min-w-[260px] space-y-2 z-10 animate-fade-in-up"
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="font-black text-sm text-[#0a0a0a] truncate max-w-[160px]">{inspectorNode.name}</span>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-black text-white uppercase">
                {inspectorNode.type === 'shared_hub' ? 'SHARED HUB' : inspectorNode.persona}
              </span>
            </div>

            <div className="text-xs space-y-1 font-mono pt-1">
              <div className="flex justify-between text-[#555555]">
                <span>Address:</span>
                <span className="font-bold text-[#0a0a0a]">{`${inspectorNode.address.slice(0, 6)}...${inspectorNode.address.slice(-4)}`}</span>
              </div>

              {inspectorNode.type === 'batch_wallet' ? (
                <>
                  <div className="flex justify-between text-[#555555]">
                    <span>Risk Grade:</span>
                    <span className="font-bold text-[#0a0a0a]">{inspectorNode.riskGrade} (Sybil: {inspectorNode.sybilProb}%)</span>
                  </div>
                  <div className="flex justify-between text-[#555555]">
                    <span>Lifetime Gas:</span>
                    <span className="font-bold text-[#ff5500]">{formatCompactUSD(inspectorNode.totalGasUSD || 0)}</span>
                  </div>
                  <div className="flex justify-between text-[#555555]">
                    <span>Inflow Depth:</span>
                    <span className="font-bold text-[#0a0a0a]">{formatCompactUSD(inspectorNode.totalInflowUSD || 0)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-[#555555]">
                  <span>Shared Overlap:</span>
                  <span className="font-bold text-[#3b82f6]">Used by {inspectorNode.sharedCount} wallets</span>
                </div>
              )}
            </div>

            {inspectorNode.type === 'batch_wallet' && (
              <button
                type="button"
                onClick={() => onInspectWallet(inspectorNode.address)}
                className="w-full mt-2 bg-black hover:bg-[#ff5500] text-white text-xs font-bold py-1.5 px-3 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Deep Dive Single Scan</span>
                <ArrowRight size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes clusterFlow {
          to { stroke-dashoffset: -24; }
        }
        .cluster-flow-line {
          animation: clusterFlow 1.2s linear infinite;
        }
      `}</style>
    </div>
  );
}
