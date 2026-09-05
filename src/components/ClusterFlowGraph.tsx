'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { BulkWrappedWallet, ClusterLinkage, SharedCounterparty } from '@/lib/types';
import { formatCompactUSD } from '@/lib/utils/dashboardUtils';
import { ZoomIn, ZoomOut, RotateCcw, ArrowRight, Move, ExternalLink, GitFork } from 'lucide-react';
import { getExplorerTxUrl } from '@/lib/chains';
import { useAnimationVisibility } from '@/hooks/useAnimationVisibility';

interface Props {
  wallets: BulkWrappedWallet[];
  linkages: ClusterLinkage[];
  sharedCounterparties: SharedCounterparty[];
  onInspectWallet: (address: string) => void;
  isSavedSnapshot?: boolean;
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
  volumeUSD?: number | null;
  valueStatus?: ClusterLinkage['valueStatus'];
  evidenceTxHashes?: string[];
  chainId?: number;
  lastDate?: string;
  detail?: string;
  color: string;
}

export interface ClusterFlowGraphPointerTarget {
  setPointerCapture: (pointerId: number) => void;
  hasPointerCapture: (pointerId: number) => boolean;
  releasePointerCapture: (pointerId: number) => void;
}

export interface ClusterFlowGraphPointerEvent {
  pointerId: number;
  pointerType: string;
  button: number;
  clientX: number;
  clientY: number;
  currentTarget: ClusterFlowGraphPointerTarget;
}

export interface ClusterFlowGraphInteractionState {
  pan: { x: number; y: number };
  scale: number;
  isDragging: boolean;
}

interface ClusterFlowGraphInteractionOptions {
  initialScale: number;
  initialPan?: { x: number; y: number };
  onChange?: (state: ClusterFlowGraphInteractionState) => void;
  requestAnimationFrame?: (callback: () => void) => number;
  cancelAnimationFrame?: (frameId: number) => void;
}

export interface ClusterFlowGraphInteraction {
  pointerDown: (event: ClusterFlowGraphPointerEvent) => void;
  pointerMove: (event: ClusterFlowGraphPointerEvent) => void;
  pointerUp: (event: ClusterFlowGraphPointerEvent) => void;
  pointerCancel: (event: ClusterFlowGraphPointerEvent) => void;
  lostPointerCapture: (event: ClusterFlowGraphPointerEvent) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: (initialScale?: number) => void;
  getState: () => ClusterFlowGraphInteractionState;
  dispose: () => void;
}

const TOUCH_DRAG_THRESHOLD = 8;

export function createClusterFlowGraphInteraction(
  options: ClusterFlowGraphInteractionOptions,
): ClusterFlowGraphInteraction {
  const requestFrame = options.requestAnimationFrame ?? ((callback: () => void) => requestAnimationFrame(callback));
  const cancelFrame = options.cancelAnimationFrame ?? ((frameId: number) => cancelAnimationFrame(frameId));
  const initialPan = options.initialPan ?? { x: 0, y: 0 };
  const state: ClusterFlowGraphInteractionState = {
    pan: { ...initialPan },
    scale: options.initialScale,
    isDragging: false,
  };

  let resetScale = options.initialScale;
  let activePointerId: number | null = null;
  let latestPointer = { x: 0, y: 0 };
  let dragStart = { x: 0, y: 0 };
  let touchGesture: {
    startX: number;
    startY: number;
    axis: 'undecided' | 'horizontal' | 'vertical';
  } | null = null;
  let pendingFrame: number | null = null;
  let disposed = false;

  const notify = () => {
    options.onChange?.({
      pan: { ...state.pan },
      scale: state.scale,
      isDragging: state.isDragging,
    });
  };

  const cancelPendingPanFrame = () => {
    if (pendingFrame !== null) {
      cancelFrame(pendingFrame);
      pendingFrame = null;
    }
  };

  const schedulePanFrame = () => {
    if (pendingFrame !== null || disposed) return;

    pendingFrame = requestFrame(() => {
      if (disposed) {
        pendingFrame = null;
        return;
      }

      state.pan = {
        x: latestPointer.x - dragStart.x,
        y: latestPointer.y - dragStart.y,
      };
      pendingFrame = null;
      notify();
    });
  };

  const releasePointerCapture = (event: ClusterFlowGraphPointerEvent) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const pointerDown = (event: ClusterFlowGraphPointerEvent) => {
    if (disposed || event.button !== 0 || activePointerId !== null) return;

    activePointerId = event.pointerId;
    latestPointer = { x: event.clientX, y: event.clientY };
    dragStart = { x: event.clientX - state.pan.x, y: event.clientY - state.pan.y };

    if (event.pointerType === 'touch') {
      touchGesture = {
        startX: event.clientX,
        startY: event.clientY,
        axis: 'undecided',
      };
      state.isDragging = false;
      notify();
      return;
    }

    touchGesture = null;
    state.isDragging = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    notify();
  };

  const pointerMove = (event: ClusterFlowGraphPointerEvent) => {
    if (disposed || activePointerId !== event.pointerId) return;
    latestPointer = { x: event.clientX, y: event.clientY };

    if (event.pointerType === 'touch') {
      if (!touchGesture) return;

      if (touchGesture.axis === 'undecided') {
        const deltaX = event.clientX - touchGesture.startX;
        const deltaY = event.clientY - touchGesture.startY;
        if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < TOUCH_DRAG_THRESHOLD) return;

        if (Math.abs(deltaX) <= Math.abs(deltaY)) {
          touchGesture.axis = 'vertical';
          return;
        }

        touchGesture.axis = 'horizontal';
        state.isDragging = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        notify();
      }

      if (touchGesture.axis !== 'horizontal') return;
    } else if (!state.isDragging) {
      return;
    }

    schedulePanFrame();
  };

  const pointerUp = (event: ClusterFlowGraphPointerEvent) => {
    if (disposed || activePointerId !== event.pointerId) return;

    const shouldCommitFinalPosition = event.pointerType !== 'touch' || touchGesture?.axis === 'horizontal';
    if (shouldCommitFinalPosition) {
      latestPointer = { x: event.clientX, y: event.clientY };
      schedulePanFrame();
    }

    activePointerId = null;
    state.isDragging = false;
    touchGesture = null;
    notify();
    releasePointerCapture(event);
  };

  const pointerCancel = (event: ClusterFlowGraphPointerEvent) => {
    if (disposed || activePointerId !== event.pointerId) return;

    activePointerId = null;
    state.isDragging = false;
    touchGesture = null;
    cancelPendingPanFrame();
    notify();
    releasePointerCapture(event);
  };

  const lostPointerCapture = (event: ClusterFlowGraphPointerEvent) => {
    if (disposed || activePointerId !== event.pointerId) return;

    activePointerId = null;
    state.isDragging = false;
    touchGesture = null;
    cancelPendingPanFrame();
    notify();
  };

  const zoomIn = () => {
    if (disposed) return;
    state.scale = Math.min(3.2, state.scale + 0.2);
    notify();
  };

  const zoomOut = () => {
    if (disposed) return;
    state.scale = Math.max(0.25, state.scale - 0.2);
    notify();
  };

  const resetZoom = (nextInitialScale = resetScale) => {
    if (disposed) return;
    resetScale = nextInitialScale;
    state.scale = nextInitialScale;
    state.pan = { x: 0, y: 0 };
    notify();
  };

  const getState = (): ClusterFlowGraphInteractionState => ({
    pan: { ...state.pan },
    scale: state.scale,
    isDragging: state.isDragging,
  });

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    activePointerId = null;
    state.isDragging = false;
    touchGesture = null;
    cancelPendingPanFrame();
  };

  return {
    pointerDown,
    pointerMove,
    pointerUp,
    pointerCancel,
    lostPointerCapture,
    zoomIn,
    zoomOut,
    resetZoom,
    getState,
    dispose,
  };
}

export function formatClusterConnectionSummary({
  sourceName,
  targetName,
  type,
  txCount,
}: {
  sourceName: string;
  targetName: string;
  type: RenderLink['type'];
  txCount?: number;
}): string {
  const relationship = type === 'direct'
    ? `${txCount ?? 0} transactions`
    : 'shared counterparty connection';

  return `${sourceName} to ${targetName}: ${relationship}.`;
}

export default function ClusterFlowGraph({
  wallets,
  linkages,
  sharedCounterparties,
  onInspectWallet,
  isSavedSnapshot = false,
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
  const [graphInteraction] = useState<ClusterFlowGraphInteraction>(() => createClusterFlowGraphInteraction({
    initialScale,
    onChange: nextState => {
      setPan(nextState.pan);
      setScale(nextState.scale);
      setIsDragging(nextState.isDragging);
    },
  }));
  const containerRef = useRef<HTMLDivElement>(null);
  const graphVisibility = useAnimationVisibility(containerRef);

  useEffect(() => {
    return () => {
      graphInteraction.dispose();
    };
  }, [graphInteraction]);

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
          valueStatus: l.valueStatus,
          evidenceTxHashes: l.evidenceTxHashes,
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
        const hasCounterparty = hub.walletAddresses.includes(w.address.toLowerCase());
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
  }, [wallets, linkages, sharedCounterparties, centerX, centerY]);

  const activeNodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  const activeHoveredNode = hoveredNodeId ? activeNodeMap.get(hoveredNodeId) : null;
  const activeSelectedNode = selectedNodeId ? activeNodeMap.get(selectedNodeId) : null;
  const inspectorNode = activeSelectedNode || activeHoveredNode;

  const activeLink = selectedLink || hoveredLink;

  // ── Drag & Pan Handlers (Pointer Events & RAF) ──
  const handlePointerDown = (e: React.PointerEvent) => graphInteraction.pointerDown(e);
  const handlePointerMove = (e: React.PointerEvent) => graphInteraction.pointerMove(e);
  const handlePointerUp = (e: React.PointerEvent) => graphInteraction.pointerUp(e);
  const handlePointerCancel = (e: React.PointerEvent) => graphInteraction.pointerCancel(e);
  const handleLostPointerCapture = (e: React.PointerEvent) => graphInteraction.lostPointerCapture(e);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    graphInteraction.zoomIn();
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    graphInteraction.zoomOut();
  };

  const handleResetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    graphInteraction.resetZoom(initialScale);
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
          <span className="flex items-center gap-1.5 text-orange-ink">
            <span className="w-3 h-1 bg-[#ff5500]" /> Direct Transfer ({linkages.length})
          </span>
          {sharedCounterparties.length > 0 && (
            <span className="flex items-center gap-1.5 text-[#1d4ed8]">
              <span className="w-3 h-1 bg-[#3b82f6]" /> Shared Counterparty Hubs ({sharedCounterparties.length})
            </span>
          )}
        </div>
      </div>

      {/* ── High-Performance Interactive Canvas Container ── */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handleLostPointerCapture}
        className={`relative bg-[#0d0f17] border border-[#cecece] shadow-inner overflow-hidden select-none touch-pan-y ${
          graphVisibility.isVisible ? '' : 'graph-animations-paused'
        } ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          height: '660px',
        }}
      >
        <div className="sr-only">
          <h3>Cluster flow graph summary</h3>
          <p>{nodes.length} wallet or hub nodes and {links.length} evidence-backed connections.</p>
          <ul>
            {links.map(link => (
              <li key={link.id}>
                {formatClusterConnectionSummary({
                  sourceName: link.sourceNode.name,
                  targetName: link.targetNode.name,
                  type: link.type,
                  txCount: link.txCount,
                })}
              </li>
            ))}
          </ul>
        </div>
        {nodes.length === 0 ? (
          <div className="absolute inset-4 z-10 flex items-center justify-center border border-dashed border-[#4b5563] bg-[#11131a]/90 p-5 text-center text-xs font-mono font-bold text-gray-200">
            No wallet nodes found in returned data.
          </div>
        ) : links.length === 0 ? (
          <div
            role="status"
            className="absolute bottom-4 left-4 right-4 z-10 border border-[#4b5563] bg-[#11131a]/95 p-3 text-xs text-gray-200 shadow-2xl"
          >
            <p className="font-black uppercase tracking-wider text-white">
              {isSavedSnapshot ? 'No connection evidence is included in this saved example.' : 'No connections found in returned data.'}
            </p>
            <p className="mt-1">Wallet nodes remain mapped. This is not a rendering error.</p>
          </div>
        ) : null}

        {/* Floating Zoom & Pan Toolbar */}
        <div
          className="absolute top-4 left-4 z-20 flex items-center gap-1 bg-[#11131a]/95 backdrop-blur-md border border-[#333333] p-1.5 shadow-2xl text-white"
          onMouseDown={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label="Zoom in on cluster graph"
            onClick={handleZoomIn}
            className="min-h-11 min-w-11 md:min-h-9 md:min-w-9 p-1.5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
            title="Zoom In (+)"
          >
            <ZoomIn size={15} />
          </button>
          <button
            type="button"
            aria-label="Zoom out on cluster graph"
            onClick={handleZoomOut}
            className="min-h-11 min-w-11 md:min-h-9 md:min-w-9 p-1.5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
            title="Zoom Out (-)"
          >
            <ZoomOut size={15} />
          </button>
          <div className="w-[1px] h-4 bg-[#333333] mx-1" />
          <span className="text-[10px] font-mono font-black px-1.5 text-[#ff5500]" aria-live="polite">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            aria-label="Reset cluster graph view"
            onClick={handleResetZoom}
            className="min-h-11 min-w-11 md:min-h-9 md:min-w-9 p-1.5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
            title="Reset View"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Pan / Drag Hint Badge */}
        <div className="absolute top-4 right-4 z-20 hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#11131a]/90 backdrop-blur-md border border-[#333333] text-[10px] font-mono font-bold text-gray-300">
          <Move size={11} className="text-[#ff5500]" />
          <span>Use zoom buttons · Drag to move · Page scrolling stays native</span>
        </div>

        {/* Main Transformable SVG Canvas with Hardware Acceleration */}
        <svg
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
          className="w-full h-full block"
          style={{ willChange: 'transform' }}
          aria-hidden="true"
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
                    <text y="12" textAnchor="middle" fill="#3b82f6" className="font-mono" style={{ fontSize: 9.5, fontWeight: 700 }}>
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
                  <text x="0" y="11" textAnchor="middle" fill="#ff5500" className="font-mono" style={{ fontSize: 8.5, fontWeight: 700 }}>
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
                <GitFork size={13} className="text-orange-ink" />
                DIRECT INTER-WALLET TRANSFER
              </span>
              <span className="text-[9px] font-mono font-black px-2 py-0.5 bg-[#ff5500] text-[#0a0a0a] uppercase">
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
                <span className="font-black text-base text-orange-ink">
                  {activeLink.volumeUSD === null ? `Unavailable (${activeLink.valueStatus})` : formatCompactUSD(activeLink.volumeUSD ?? 0)}
                </span>
              </div>

              {activeLink.lastDate && (
                <div className="flex justify-between items-center text-[11px] text-[#555555]">
                  <span>Last Activity:</span>
                  <span className="font-bold text-[#0a0a0a]">{activeLink.lastDate}</span>
                </div>
              )}
            </div>

            <a
              href={getExplorerTxUrl(activeLink.chainId || 1, activeLink.evidenceTxHashes?.[0] ?? '')}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-11 md:min-h-9 mt-2 bg-black hover:bg-[#b33c00] text-white text-xs font-bold py-1.5 md:py-1 px-3 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
                    <span className="font-bold text-[#0a0a0a]">
                      {isSavedSnapshot ? 'N/A' : `${inspectorNode.riskGrade} (Sybil: ${inspectorNode.sybilProb}%)`}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#555555]">
                    <span>Lifetime Gas:</span>
                    <span className="font-bold text-orange-ink">{isSavedSnapshot ? 'N/A' : formatCompactUSD(inspectorNode.totalGasUSD || 0)}</span>
                  </div>
                  <div className="flex justify-between text-[#555555]">
                    <span>Inflow Depth:</span>
                    <span className="font-bold text-[#0a0a0a]">{isSavedSnapshot ? 'N/A' : formatCompactUSD(inspectorNode.totalInflowUSD || 0)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-[#555555]">
                  <span>Shared Overlap:</span>
                  <span className="font-bold text-[#1d4ed8]">Used by {inspectorNode.sharedCount} wallets</span>
                </div>
              )}
            </div>

            {inspectorNode.type === 'batch_wallet' && (
              <button
                type="button"
                onClick={() => onInspectWallet(inspectorNode.address)}
                className="w-full min-h-11 md:min-h-9 mt-2 bg-black hover:bg-[#b33c00] text-white text-xs font-bold py-1.5 md:py-1 px-3 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Deep Dive Single Scan</span>
                <ArrowRight size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      <details className="card-3d mt-3 p-3 text-xs text-[#0a0a0a]">
        <summary className="min-h-11 md:min-h-9 cursor-pointer py-3 md:py-2 font-bold">Accessible cluster graph data</summary>
        <div className="mt-2 grid gap-4 border-t border-[#c8c8c8] pt-3 lg:grid-cols-2">
          <div>
            <h3 className="font-black">Wallets and shared hubs</h3>
            <ul className="mt-2 space-y-2">
              {nodes.map(node => (
                <li key={node.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>{node.name}: {node.type === 'shared_hub' ? `used by ${node.sharedCount} wallets` : `${node.persona}, risk ${node.riskGrade}`}.</span>
                  {node.type === 'batch_wallet' ? (
                    <button
                      type="button"
                      onClick={() => onInspectWallet(node.address)}
                      className="btn-3d-neutral min-h-11 md:min-h-9 px-3 py-2 md:py-1.5 font-bold"
                    >
                      Inspect {node.name}
                    </button>
                  ) : (
                    <span className="font-mono text-[11px]" title={node.address}>{node.address}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-black">Evidence-backed connections</h3>
            <ul className="mt-2 space-y-2">
              {links.map(link => (
                <li key={link.id}>
                  {formatClusterConnectionSummary({
                    sourceName: link.sourceNode.name,
                    targetName: link.targetNode.name,
                    type: link.type,
                    txCount: link.txCount,
                  })}
                  {link.type === 'direct' && link.evidenceTxHashes?.[0] && (
                    <a
                      href={getExplorerTxUrl(link.chainId || 1, link.evidenceTxHashes[0])}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 font-bold text-[#b33c00] underline"
                    >
                      View evidence
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </details>

      <style jsx>{`
        @keyframes clusterFlow {
          to { stroke-dashoffset: -24; }
        }
        .cluster-flow-line {
          animation: clusterFlow 1.2s linear infinite;
        }
        .graph-animations-paused .cluster-flow-line {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
