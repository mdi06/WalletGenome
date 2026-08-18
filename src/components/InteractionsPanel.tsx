'use client';

import React, { useState } from 'react';
import { ScanResult, ProtocolInteraction, AddressInteraction, ProtocolContractDetail } from '@/lib/types';
import { getExplorerAddressUrl, getChainConfig } from '@/lib/chains';
import { ArrowUpRight, ArrowDownLeft, ExternalLink, Search, Layers, Users, Zap, Filter, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  results: ScanResult[];
}

type SubTab = 'protocols' | 'counterparties';
type CategoryFilter = 'all' | 'swap' | 'bridge' | 'lending' | 'perps' | 'staking' | 'nft';

function formatUSD(val: number): string {
  if (Math.abs(val) >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
  if (Math.abs(val) >= 1000) return `$${(val / 1000).toFixed(2)}K`;
  return `$${val.toFixed(2)}`;
}

function truncAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function InteractionsPanel({ results }: Props) {
  const [activeTab, setActiveTab] = useState<SubTab>('protocols');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProtocols, setExpandedProtocols] = useState<Set<string>>(new Set());

  const toggleExpand = (protocolKey: string) => {
    setExpandedProtocols(prev => {
      const next = new Set(prev);
      if (next.has(protocolKey)) next.delete(protocolKey);
      else next.add(protocolKey);
      return next;
    });
  };

  // Roll up protocols across scanned chains
  const protocolGroupMap = new Map<string, {
    name: string;
    protocol: string;
    category: string;
    txCount: number;
    totalGasETH: number;
    totalGasUSD: number;
    totalVolumeUSD: number;
    lastInteractionDate: string;
    chains: Set<number>;
    contracts: Map<string, ProtocolContractDetail>;
  }>();

  const counterpartyMap = new Map<string, AddressInteraction>();

  for (const r of results) {
    if (!r.interactionsSummary) continue;

    for (const p of r.interactionsSummary.topProtocols || []) {
      const key = (p.protocol || p.name).toLowerCase();
      const existing = protocolGroupMap.get(key) || {
        name: p.name,
        protocol: p.protocol || p.name,
        category: p.category as string,
        txCount: 0,
        totalGasETH: 0,
        totalGasUSD: 0,
        totalVolumeUSD: 0,
        lastInteractionDate: p.lastInteractionDate,
        chains: new Set<number>(),
        contracts: new Map<string, ProtocolContractDetail>(),
      };

      existing.txCount += p.txCount;
      existing.totalGasETH += p.totalGasETH;
      existing.totalGasUSD += p.totalGasUSD;
      existing.totalVolumeUSD += p.totalVolumeUSD;
      existing.chains.add(p.chainId);

      if (p.contracts && p.contracts.length > 0) {
        for (const c of p.contracts) {
          const cKey = `${c.contractAddress}-${c.chainId}`;
          existing.contracts.set(cKey, c);
        }
      } else {
        const cKey = `${(p as any).contractAddress || key}-${p.chainId}`;
        existing.contracts.set(cKey, {
          name: p.name,
          contractAddress: (p as any).contractAddress || '',
          txCount: p.txCount,
          totalGasETH: p.totalGasETH,
          totalGasUSD: p.totalGasUSD,
          totalVolumeUSD: p.totalVolumeUSD,
          lastInteractionDate: p.lastInteractionDate,
          chainId: p.chainId,
        });
      }

      protocolGroupMap.set(key, existing);
    }

    for (const c of r.interactionsSummary.topCounterparties || []) {
      const key = `${c.address}-${c.chainId}`;
      if (!counterpartyMap.has(key)) {
        counterpartyMap.set(key, { ...c });
      } else {
        const existing = counterpartyMap.get(key)!;
        existing.inboundCount += c.inboundCount;
        existing.outboundCount += c.outboundCount;
        existing.inboundUSD += c.inboundUSD;
        existing.outboundUSD += c.outboundUSD;
        existing.totalTxCount += c.totalTxCount;
        existing.netFlowUSD += c.netFlowUSD;
      }
    }
  }

  const mergedProtocols = Array.from(protocolGroupMap.values())
    .map(g => ({
      name: g.name,
      protocol: g.protocol,
      category: g.category,
      txCount: g.txCount,
      totalGasETH: g.totalGasETH,
      totalGasUSD: g.totalGasUSD,
      totalVolumeUSD: g.totalVolumeUSD,
      lastInteractionDate: g.lastInteractionDate,
      activeChains: Array.from(g.chains),
      contracts: Array.from(g.contracts.values()).sort((a, b) => b.txCount - a.txCount),
    }))
    .sort((a, b) => b.txCount - a.txCount || b.totalGasETH - a.totalGasETH);

  const mergedCounterparties = Array.from(counterpartyMap.values()).sort((a, b) => b.totalTxCount - a.totalTxCount);

  // Filter by search & category
  const q = searchQuery.toLowerCase().trim();
  const filteredProtocols = mergedProtocols.filter(p => {
    const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.protocol.toLowerCase().includes(q) || p.contracts.some(c => c.name.toLowerCase().includes(q) || c.contractAddress.toLowerCase().includes(q));
    const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const filteredCounterparties = mergedCounterparties.filter(
    c => !q || (c.label && c.label.toLowerCase().includes(q)) || c.address.toLowerCase().includes(q) || c.type.toLowerCase().includes(q)
  );

  return (
    <div style={styles.container} className="animate-fade-in-up">
      {/* Top Stat Summary */}
      <div style={styles.statsRow}>
        <div className="glass-card" style={styles.statCard}>
          <div style={{ ...styles.iconBox, background: 'var(--accent-indigo-dim)', color: 'var(--accent-indigo)' }}>
            <Layers size={20} />
          </div>
          <div>
            <span style={styles.statLabel}>Total Protocol Families</span>
            <span style={styles.statValue}>{mergedProtocols.length}</span>
          </div>
        </div>

        <div className="glass-card" style={styles.statCard}>
          <div style={{ ...styles.iconBox, background: 'var(--accent-blue-dim)', color: 'var(--accent-blue)' }}>
            <Users size={20} />
          </div>
          <div>
            <span style={styles.statLabel}>Counterparty Addresses</span>
            <span style={styles.statValue}>{mergedCounterparties.length}</span>
          </div>
        </div>

        {mergedProtocols.length > 0 && (
          <div className="glass-card" style={styles.statCard}>
            <div style={{ ...styles.iconBox, background: 'var(--accent-emerald-dim)', color: 'var(--accent-emerald)' }}>
              <Zap size={20} />
            </div>
            <div>
              <span style={styles.statLabel}>Most Interacted Protocol</span>
              <span style={{ ...styles.statValue, fontSize: '1.1rem' }}>{mergedProtocols[0].name}</span>
              <span style={styles.statSub}>{mergedProtocols[0].txCount} calls across {mergedProtocols[0].contracts.length} contracts</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Tab Controls */}
      <div style={styles.controlsRow}>
        <div style={styles.subTabBar}>
          <button
            onClick={() => setActiveTab('protocols')}
            style={{
              ...styles.subTab,
              background: activeTab === 'protocols' ? 'var(--accent-indigo-dim)' : 'var(--bg-glass)',
              borderColor: activeTab === 'protocols' ? 'var(--accent-indigo)' : 'var(--border-primary)',
              color: activeTab === 'protocols' ? 'var(--accent-indigo)' : 'var(--text-secondary)',
            }}
          >
            <Layers size={16} /> Protocols & DApps ({mergedProtocols.length})
          </button>
          <button
            onClick={() => setActiveTab('counterparties')}
            style={{
              ...styles.subTab,
              background: activeTab === 'counterparties' ? 'var(--accent-indigo-dim)' : 'var(--bg-glass)',
              borderColor: activeTab === 'counterparties' ? 'var(--accent-indigo)' : 'var(--border-primary)',
              color: activeTab === 'counterparties' ? 'var(--accent-indigo)' : 'var(--text-secondary)',
            }}
          >
            <Users size={16} /> Counterparty Addresses ({mergedCounterparties.length})
          </button>
        </div>

        <div style={styles.searchBox}>
          <Search size={16} color="var(--text-tertiary)" />
          <input
            type="text"
            placeholder={activeTab === 'protocols' ? 'Search Uniswap, Across, Hyperliquid...' : 'Search address, Binance, Coinbase...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </div>

      {/* Category Pills for Protocols */}
      {activeTab === 'protocols' && (
        <div style={styles.filterPills}>
          <span style={styles.filterLabel}><Filter size={14} /> Filter Category:</span>
          {(['all', 'swap', 'bridge', 'lending', 'perps', 'staking', 'nft'] as CategoryFilter[]).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              style={{
                ...styles.pill,
                background: categoryFilter === cat ? 'var(--accent-indigo)' : 'var(--bg-tertiary)',
                color: categoryFilter === cat ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {cat === 'all' ? 'All Protocols' : cat === 'swap' ? 'DEX / Swaps' : cat.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* Protocols Table with Expandable Contract Roll-ups */}
      {activeTab === 'protocols' && (
        <div className="glass-card table-container">
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Protocol Family</th>
                <th style={styles.th}>Category</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Total Calls</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Gas Spent</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Est. Volume</th>
                <th style={styles.th}>Networks</th>
                <th style={styles.th}>Contracts</th>
              </tr>
            </thead>
            <tbody>
              {filteredProtocols.length === 0 ? (
                <tr>
                  <td colSpan={8} style={styles.noData}>No protocols found matching &quot;{searchQuery}&quot;</td>
                </tr>
              ) : (
                filteredProtocols.map((p, i) => {
                  const key = p.protocol.toLowerCase();
                  const isExpanded = expandedProtocols.has(key);
                  const hasMultipleContracts = p.contracts.length > 1;

                  return (
                    <React.Fragment key={key}>
                      <tr
                        style={{
                          ...styles.tr,
                          cursor: hasMultipleContracts ? 'pointer' : 'default',
                          background: isExpanded ? 'rgba(129, 140, 248, 0.05)' : undefined,
                        }}
                        onClick={() => hasMultipleContracts && toggleExpand(key)}
                      >
                        <td style={{ ...styles.td, color: 'var(--text-tertiary)', fontSize: '0.8rem', width: 30 }}>{i + 1}</td>
                        <td style={styles.td}>
                          <div style={styles.protocolCell}>
                            <span style={styles.protocolName}>{p.name}</span>
                            <span style={styles.protocolSubInfo}>
                              {p.contracts.length === 1
                                ? truncAddr(p.contracts[0].contractAddress)
                                : `${p.contracts.length} contracts rolled up`}
                            </span>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.catBadge, background: getCategoryBg(p.category), color: getCategoryColor(p.category) }}>
                            {formatCategory(p.category)}
                          </span>
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                          {p.txCount}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          <div style={styles.gasCell}>
                            <span>{p.totalGasETH.toFixed(4)} ETH</span>
                            {p.totalGasUSD > 0 && <span style={styles.gasUSD}>≈ {formatUSD(p.totalGasUSD)}</span>}
                          </div>
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600, color: p.totalVolumeUSD > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                          {p.totalVolumeUSD > 0 ? formatUSD(p.totalVolumeUSD) : '—'}
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {p.activeChains.map(cid => {
                              const chain = getChainConfig(cid);
                              return (
                                <span key={cid} style={{ ...styles.chainBadge, background: `${chain.color}20`, color: chain.color }}>
                                  {chain.shortName}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td style={styles.td}>
                          {hasMultipleContracts ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(key);
                              }}
                              style={styles.expandButton}
                            >
                              <span>{p.contracts.length} contracts</span>
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          ) : (
                            <a
                              href={getExplorerAddressUrl(p.contracts[0]?.chainId || 1, p.contracts[0]?.contractAddress || '')}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={styles.link}
                              title="View on explorer"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Sub-Contracts Accordion */}
                      {isExpanded && (
                        <tr style={styles.subContractRow}>
                          <td colSpan={8} style={{ padding: '0 16px 12px 42px' }}>
                            <div style={styles.subContractsContainer}>
                              <div style={styles.subContractHeader}>
                                <span>Underlying Smart Contracts ({p.contracts.length})</span>
                              </div>
                              <div style={styles.subContractList}>
                                {p.contracts.map((c, ci) => {
                                  const chain = getChainConfig(c.chainId);
                                  return (
                                    <div key={ci} style={styles.subContractItem}>
                                      <div style={styles.subContractLeft}>
                                        <span style={styles.subContractName}>{c.name}</span>
                                        <span className="mono" style={styles.subContractAddr}>{truncAddr(c.contractAddress)}</span>
                                        <span style={{ ...styles.chainBadge, background: `${chain.color}20`, color: chain.color, fontSize: '0.68rem' }}>
                                          {chain.shortName}
                                        </span>
                                      </div>
                                      <div style={styles.subContractRight}>
                                        <span style={styles.subContractCalls}>{c.txCount} calls</span>
                                        <span style={styles.subContractGas}>{c.totalGasETH.toFixed(4)} ETH</span>
                                        <a
                                          href={getExplorerAddressUrl(c.chainId, c.contractAddress)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={styles.link}
                                          title="View on explorer"
                                        >
                                          <ExternalLink size={13} />
                                        </a>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Counterparties Table */}
      {activeTab === 'counterparties' && (
        <div className="glass-card table-container">
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Counterparty Address</th>
                <th style={styles.th}>Type</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Total Txs</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Inflow (Recv)</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Outflow (Sent)</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Net Flow</th>
                <th style={styles.th}>Network</th>
                <th style={styles.th}>Last Active</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {filteredCounterparties.length === 0 ? (
                <tr>
                  <td colSpan={10} style={styles.noData}>No counterparty addresses found matching &quot;{searchQuery}&quot;</td>
                </tr>
              ) : (
                filteredCounterparties.map((c, i) => {
                  const chain = getChainConfig(c.chainId);
                  const isNetPositive = c.netFlowUSD >= 0;
                  return (
                    <tr key={`${c.address}-${c.chainId}-${i}`} style={styles.tr}>
                      <td style={{ ...styles.td, color: 'var(--text-tertiary)', fontSize: '0.8rem', width: 30 }}>{i + 1}</td>
                      <td style={styles.td}>
                        <div style={styles.addressCell}>
                          {c.label ? (
                            <span style={styles.labelBadge}>{c.label}</span>
                          ) : (
                            <span className="mono truncate-address">{truncAddr(c.address)}</span>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.typeBadge, background: getTypeBg(c.type), color: getTypeColor(c.type) }}>
                          {c.type.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {c.totalTxCount}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                          {c.inboundCount > 0 && <ArrowDownLeft size={12} />}
                          <span>{c.inboundUSD > 0 ? formatUSD(c.inboundUSD) : c.inboundCount > 0 ? `${c.inboundCount} txs` : '—'}</span>
                        </div>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--accent-red)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                          {c.outboundCount > 0 && <ArrowUpRight size={12} />}
                          <span>{c.outboundUSD > 0 ? formatUSD(c.outboundUSD) : c.outboundCount > 0 ? `${c.outboundCount} txs` : '—'}</span>
                        </div>
                      </td>
                      <td style={{
                        ...styles.td,
                        textAlign: 'right',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: Math.abs(c.netFlowUSD) < 0.01 ? 'var(--text-tertiary)' : isNetPositive ? 'var(--accent-emerald)' : 'var(--accent-red)',
                      }}>
                        {Math.abs(c.netFlowUSD) < 0.01 ? '$0.00' : `${isNetPositive ? '+' : ''}${formatUSD(c.netFlowUSD)}`}
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.chainBadge, background: `${chain.color}20`, color: chain.color }}>
                          {chain.shortName}
                        </span>
                      </td>
                      <td style={{ ...styles.td, fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                        {c.lastInteractionDate}
                      </td>
                      <td style={styles.td}>
                        <a
                          href={getExplorerAddressUrl(c.chainId, c.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.link}
                          title="View address on explorer"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatCategory(cat: string): string {
  switch (cat) {
    case 'swap': return 'DEX / Swap';
    case 'bridge': return 'Bridge';
    case 'lending': return 'Lending';
    case 'perps': return 'Perps';
    case 'staking': return 'Staking';
    case 'nft': return 'NFT';
    default: return 'Contract';
  }
}

function getCategoryBg(cat: string): string {
  switch (cat) {
    case 'swap': return 'rgba(96, 165, 250, 0.15)';
    case 'bridge': return 'rgba(167, 139, 250, 0.15)';
    case 'lending': return 'rgba(52, 211, 153, 0.15)';
    case 'perps': return 'rgba(249, 115, 22, 0.15)';
    case 'staking': return 'rgba(251, 191, 36, 0.15)';
    case 'nft': return 'rgba(236, 72, 153, 0.15)';
    default: return 'var(--bg-tertiary)';
  }
}

function getCategoryColor(cat: string): string {
  switch (cat) {
    case 'swap': return 'var(--accent-blue)';
    case 'bridge': return 'var(--accent-purple)';
    case 'lending': return 'var(--accent-emerald)';
    case 'perps': return '#f97316';
    case 'staking': return 'var(--accent-amber)';
    case 'nft': return '#ec4899';
    default: return 'var(--text-secondary)';
  }
}

function getTypeBg(type: string): string {
  switch (type) {
    case 'cex': return 'rgba(245, 158, 11, 0.15)';
    case 'dex': return 'rgba(96, 165, 250, 0.15)';
    case 'bridge': return 'rgba(167, 139, 250, 0.15)';
    default: return 'var(--bg-tertiary)';
  }
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'cex': return 'var(--accent-amber)';
    case 'dex': return 'var(--accent-blue)';
    case 'bridge': return 'var(--accent-purple)';
    default: return 'var(--text-tertiary)';
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-lg)',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 'var(--space-md)',
  },
  statCard: {
    padding: 'var(--space-md) var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    display: 'block',
  },
  statValue: {
    fontSize: '1.35rem',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
    display: 'block',
  },
  statSub: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },
  controlsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 'var(--space-md)',
    flexWrap: 'wrap' as const,
  },
  subTabBar: {
    display: 'flex',
    gap: 'var(--space-sm)',
    flexWrap: 'wrap' as const,
  },
  subTab: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 'var(--radius-full)',
    borderWidth: 1,
    borderStyle: 'solid',
    fontSize: '0.85rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    fontFamily: 'var(--font-sans)',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    background: 'var(--bg-glass)',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-full)',
    padding: '6px 14px',
    minWidth: 280,
  },
  searchInput: {
    background: 'none',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    width: '100%',
    fontFamily: 'var(--font-sans)',
  },
  filterPills: {
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
  pill: {
    padding: '4px 12px',
    borderRadius: 'var(--radius-full)',
    border: 'none',
    fontSize: '0.75rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    fontFamily: 'var(--font-sans)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.85rem',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: 600,
    fontSize: '0.72rem',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: 'var(--border-primary)',
    whiteSpace: 'nowrap' as const,
  },
  tr: {
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: 'var(--border-primary)',
    transition: 'background var(--transition-fast)',
  },
  td: {
    padding: '12px 16px',
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap' as const,
  },
  protocolCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  protocolName: {
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  protocolSubInfo: {
    fontSize: '0.72rem',
    color: 'var(--text-tertiary)',
  },
  expandButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 10px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-full)',
    color: 'var(--accent-indigo)',
    fontSize: '0.75rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  subContractRow: {
    background: 'rgba(0, 0, 0, 0.25)',
    borderBottom: '1px solid var(--border-primary)',
  },
  subContractsContainer: {
    padding: '8px 12px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-secondary)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  subContractHeader: {
    fontSize: '0.72rem',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    fontWeight: 600,
    marginBottom: 2,
  },
  subContractList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  subContractItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 10px',
    background: 'var(--bg-tertiary)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8rem',
  },
  subContractLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
  },
  subContractName: {
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  subContractAddr: {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
  },
  subContractRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
  },
  subContractCalls: {
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
  },
  subContractGas: {
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.78rem',
  },
  addressCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-xs)',
  },
  catBadge: {
    padding: '2px 8px',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.72rem',
    fontWeight: 600,
  },
  typeBadge: {
    padding: '2px 6px',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.68rem',
    fontWeight: 700,
    letterSpacing: '0.04em',
  },
  labelBadge: {
    padding: '2px 8px',
    background: 'var(--accent-indigo-dim)',
    color: 'var(--accent-indigo)',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  chainBadge: {
    padding: '2px 8px',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.72rem',
    fontWeight: 600,
  },
  gasCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  gasUSD: {
    fontSize: '0.72rem',
    color: 'var(--text-tertiary)',
  },
  link: {
    color: 'var(--text-tertiary)',
    display: 'flex',
    alignItems: 'center',
    transition: 'color var(--transition-fast)',
  },
  noData: {
    padding: 'var(--space-xl)',
    textAlign: 'center',
    color: 'var(--text-tertiary)',
  },
};
