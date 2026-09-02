'use client';

import React, { useState, useMemo } from 'react';
import { AddressInteraction, ScanResult, ProtocolInteraction } from '@/lib/types';
import { getExplorerAddressUrl } from '@/lib/chains';
import { ExternalLink, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { formatCategoryLabel, formatFiatUSD, formatNativeTokenValue } from '@/lib/utils/dashboardUtils';

interface Props {
  results: ScanResult[];
}

interface UnclassifiedBreakdownEntry {
  category: string;
  label: string;
  callCount: number;
  contractCount: number;
}

function isUnclassifiedProtocol(protocol: ProtocolInteraction): boolean {
  return protocol.protocol.trim().toLowerCase() === 'other';
}

export default function InteractionsPanel({ results }: Props) {
  const [activeView, setActiveView] = useState<'protocols' | 'counterparties'>('protocols');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedProtocols, setExpandedProtocols] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const protocols = useMemo(() => {
    const map = new Map<string, ProtocolInteraction>();
    results.forEach(r => {
      r.interactionsSummary?.topProtocols?.forEach(p => {
        const key = `${p.chainId}:${p.name.toLowerCase()}`;
        const existing = map.get(key);
        if (existing) {
          existing.txCount += p.txCount;
          existing.totalGasNative += p.totalGasNative;
          existing.totalGasUSD += p.totalGasUSD;
          existing.totalVolumeUSD += p.totalVolumeUSD;
          const mergedContracts = [...(existing.contracts || []), ...(p.contracts || [])];
          existing.contracts = Array.from(new Map(mergedContracts.map(c => [c.contractAddress.toLowerCase(), c])).values());
        } else {
          map.set(key, { ...p, contracts: p.contracts ? [...p.contracts] : [] });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => b.txCount - a.txCount);
  }, [results]);

  const counterparties = useMemo(() => {
    const list: AddressInteraction[] = [];
    results.forEach(r => {
      r.interactionsSummary?.topCounterparties?.forEach(c => {
        list.push({ ...c, chainId: r.chainId });
      });
    });
    return list.sort((a, b) => (b.inboundUSD + b.outboundUSD) - (a.inboundUSD + a.outboundUSD));
  }, [results]);

  const filteredProtocols = useMemo(() => {
    return protocols.filter(p => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.protocol.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [protocols, selectedCategory, searchQuery]);

  const unclassifiedBreakdown = useMemo<UnclassifiedBreakdownEntry[]>(() => {
    const categoryMap = new Map<string, { label: string; callCount: number; contracts: Set<string> }>();

    protocols.filter(isUnclassifiedProtocol).forEach(protocol => {
      const category = protocol.category.toLowerCase();
      const entry = categoryMap.get(category) || {
        label: formatCategoryLabel(category),
        callCount: 0,
        contracts: new Set<string>(),
      };

      entry.callCount += protocol.txCount;
      protocol.contracts.forEach(contract => {
        entry.contracts.add(`${contract.chainId}:${contract.contractAddress.toLowerCase()}`);
      });
      categoryMap.set(category, entry);
    });

    return Array.from(categoryMap.entries())
      .map(([category, entry]) => ({
        category,
        label: entry.label,
        callCount: entry.callCount,
        contractCount: entry.contracts.size,
      }))
      .sort((a, b) => b.callCount - a.callCount || b.contractCount - a.contractCount);
  }, [protocols]);

  const topProtocol = protocols[0];
  const topProtocolIsUnclassified = topProtocol ? isUnclassifiedProtocol(topProtocol) : false;
  const unclassifiedContractCount = unclassifiedBreakdown.reduce((sum, entry) => sum + entry.contractCount, 0);

  const toggleExpand = (name: string) => {
    setExpandedProtocols(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const categories = ['all', 'swap', 'bridge', 'lending', 'perps', 'staking', 'nft', 'approval', 'contract_interaction', 'unknown'];

  return (
    <div className="space-y-6 md:space-y-5">
      {/* ── Top Summary Header Metrics ── */}
      <section className="card-3d space-y-4 p-4 text-[#0a0a0a] sm:p-5">
        <div className="text-xs font-bold text-[#4b5563]">
          USD gas and volume values use timestamp-matched historical prices or explicit stablecoin assumptions. Estimated or unpriced scans are withheld before this view renders.
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="well-recessed-light p-4 space-y-1 text-[#0a0a0a]">
            <div className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider">
              TOTAL PROTOCOL FAMILIES
            </div>
            <div className="text-3xl font-black text-[#0a0a0a] font-mono">
              {protocols.length}
            </div>
          </div>

          <div className="well-recessed-light p-4 space-y-1 text-[#0a0a0a]">
            <div className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider">
              COUNTERPARTY ADDRESSES
            </div>
            <div className="text-3xl font-black text-[#0a0a0a] font-mono">
              {counterparties.length}
            </div>
          </div>

          <div className="well-recessed-light p-4 space-y-1 text-[#0a0a0a]">
            <div className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider">
              MOST INTERACTED PROTOCOL
            </div>
            <div className="text-xl font-black text-orange-ink truncate">
              {topProtocolIsUnclassified ? 'Unclassified contracts' : topProtocol?.name || 'N/A'}
            </div>
            <div className="text-xs font-bold text-[#4b5563] font-mono">
              {topProtocolIsUnclassified
                ? `${topProtocol?.txCount || 0} calls across ${unclassifiedContractCount} unclassified contracts`
                : `${topProtocol?.txCount || 0} calls across ${topProtocol?.contracts?.length || 1} contracts`}
            </div>
          </div>
        </div>
      </section>

      {unclassifiedBreakdown.length > 0 && (
        <section aria-labelledby="unclassified-activity-heading" className="card-3d space-y-3 p-4 text-[#0a0a0a] sm:p-5 md:p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id="unclassified-activity-heading" className="text-[11px] font-extrabold tracking-wider text-[#4b5563] uppercase">
              UNCLASSIFIED ACTIVITY BREAKDOWN
            </h3>
            <span className="text-xs font-bold text-[#4b5563]">
              Largest category: {unclassifiedBreakdown[0].label}
            </span>
          </div>
          <p className="text-xs font-bold leading-relaxed text-[#4b5563]">
            These calls reached contracts that are not mapped to a named protocol. Category signals remain visible so the activity can be reviewed without presenting an unsupported protocol identity.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="list" aria-label="Unclassified activity categories">
            {unclassifiedBreakdown.map(entry => (
              <div key={entry.category} role="listitem" className="flex items-center justify-between gap-3 well-recessed-light px-3 py-2 text-xs font-bold">
                <span>{entry.label}</span>
                <span className="shrink-0 font-mono text-[#4b5563]">
                  {entry.callCount} calls · {entry.contractCount} contract{entry.contractCount === 1 ? '' : 's'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── View Switcher & Search Bar ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('protocols')}
            aria-pressed={activeView === 'protocols'}
            aria-controls="protocols-panel"
            className={`min-h-11 md:min-h-9 px-4 md:px-3 py-2 md:py-1.5 text-xs font-black cursor-pointer ${
              activeView === 'protocols'
                ? 'btn-3d-black text-white'
                : 'btn-3d-neutral text-[#4b5563] hover:text-black'
            }`}
          >
            Protocols & DApps ({protocols.length})
          </button>
          <button
            onClick={() => setActiveView('counterparties')}
            aria-pressed={activeView === 'counterparties'}
            aria-controls="protocols-panel"
            className={`min-h-11 md:min-h-9 px-4 md:px-3 py-2 md:py-1.5 text-xs font-black cursor-pointer ${
              activeView === 'counterparties'
                ? 'btn-3d-black text-white'
                : 'btn-3d-neutral text-[#4b5563] hover:text-black'
            }`}
          >
            Counterparty Addresses ({counterparties.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64 well-recessed-light focus-within:border-[#963300] focus-within:ring-2 focus-within:ring-[#963300]/30 focus-within:ring-offset-1">
          <Search size={14} className="absolute left-3 top-3 text-gray-500" />
          <input
            type="text"
            aria-label="Search protocols and counterparties"
            placeholder="Search Uniswap, Aave..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs font-bold text-[#0a0a0a] pl-8 pr-3 py-2 focus:outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* ── Category Filter Pills ── */}
      {activeView === 'protocols' && (
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-xs font-bold text-[#4b5563] uppercase tracking-wider mr-1">
            Filter Category:
          </span>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              aria-pressed={selectedCategory === cat}
              className={`min-h-11 text-xs font-bold px-3 py-1 md:min-h-9 md:px-2.5 cursor-pointer uppercase ${
                selectedCategory === cat
                  ? 'btn-3d-orange text-[#0a0a0a]'
                  : 'btn-3d-neutral text-[#4b5563]'
              }`}
            >
              {cat === 'all' ? 'All' : formatCategoryLabel(cat)}
            </button>
          ))}
        </div>
      )}

      {/* ── Data Table Well ── */}
      <div
        id="protocols-panel"
        className="horizontal-scroll-region well-recessed-light overflow-hidden overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label="Protocol and counterparty interactions; scroll horizontally for all columns"
      >
        {activeView === 'protocols' ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#d4d4d4] border-b border-[#cecece] text-[10px] font-extrabold text-[#555555] uppercase tracking-wider">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">PROTOCOL FAMILY</th>
                <th className="py-3 px-4">CATEGORY</th>
                <th className="py-3 px-4 text-right">TOTAL CALLS</th>
                <th className="py-3 px-4 text-right">GAS SPENT</th>
                <th className="py-3 px-4 text-right">EST. VOLUME</th>
                <th className="py-3 px-4">NETWORKS</th>
                <th className="py-3 px-4 text-right">CONTRACTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#cecece] text-xs font-bold text-[#0a0a0a]">
              {filteredProtocols.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <span className="text-xs font-mono font-bold text-[#6b7280]">NO MATCHING PROTOCOLS FOUND</span>
                      {(searchQuery !== '' || selectedCategory !== 'all') && (
                        <button 
                          onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                          className="btn-3d-neutral px-4 py-2 text-[10px] font-black uppercase tracking-wider text-[#0a0a0a]"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProtocols.map((p, i) => {
                  const protocolKey = `${p.chainId}:${p.name}`;
                  const isExpanded = expandedProtocols.has(protocolKey);
                  const hasSubContracts = p.contracts && p.contracts.length > 1;
                  const isUnclassified = isUnclassifiedProtocol(p);

                  return (
                    <React.Fragment key={protocolKey}>
                      <tr className="hover:bg-[#d5d5d5] transition-colors">
                        <td className="py-3.5 px-4 font-mono text-[#777777]">{i + 1}</td>
                        <td className="py-3.5 px-4 font-extrabold text-[#0a0a0a] flex items-center gap-2">
                          {isUnclassified ? 'Unclassified contracts' : p.name}
                          {!isUnclassified && p.protocol !== p.name && (
                            <span className="text-[10px] font-semibold text-[#555555]">({p.protocol})</span>
                          )}
                        </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-[#d0d0d0] text-[#0a0a0a] text-[10px] font-bold px-2 py-0.5 uppercase">
                          {formatCategoryLabel(p.category)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-orange-ink">{p.txCount}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-[#0a0a0a]">
                        <div>{formatNativeTokenValue(p.totalGasNative, p.nativeTokenSymbol)}</div>
                        <div className="text-[10px] font-normal text-[#555555]">≈ {formatFiatUSD(p.totalGasUSD)}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-[#0a0a0a]">
                        {p.totalVolumeUSD > 0 ? `$${p.totalVolumeUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-[#ff5500]/10 text-orange-ink text-[10px] font-bold px-2 py-0.5 border border-[#ff5500]/30">
                          {p.chainName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {hasSubContracts ? (
                          <button
                            onClick={() => toggleExpand(protocolKey)}
                            aria-pressed={isExpanded}
                            className="text-xs font-bold text-orange-ink hover:underline flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            <span>{p.contracts.length} contracts</span>
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        ) : (
                          <a
                            href={getExplorerAddressUrl(p.chainId, p.contracts?.[0]?.contractAddress || '')}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`View ${p.name} contract on block explorer`}
                            className="inline-flex min-h-11 min-w-11 md:min-h-9 md:min-w-9 items-center justify-center text-[#555555] hover:text-black"
                          >
                            <ExternalLink size={13} className="ml-auto" />
                          </a>
                        )}
                      </td>
                    </tr>

                    {/* Expandable Sub-contract Accordion Rows */}
                    {isExpanded && p.contracts && (
                      <tr className="bg-[#d4d4d4]">
                        <td colSpan={8} className="p-4 space-y-2">
                          <div className="text-[10px] font-extrabold text-[#555555] uppercase tracking-wider">
                            UNDERLYING CONTRACTS ({p.contracts.length})
                          </div>
                          <div className="space-y-1.5 font-mono text-xs">
                            {p.contracts.map(c => (
                              <div key={`${c.chainId}:${c.contractAddress}`} className="flex justify-between items-center bg-[#dedede] p-2.5 border border-[#cecece]">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-[#0a0a0a]">{c.name || 'Contract'}:</span>
                                  <span className="text-[#555555]">{c.contractAddress}</span>
                                </div>
                                <div className="flex items-center gap-4 text-right font-bold text-[#0a0a0a]">
                                  <span>{c.txCount} calls</span>
                                  <span>{formatNativeTokenValue(c.totalGasNative, c.nativeTokenSymbol)}</span>
                                  <a
                                    href={getExplorerAddressUrl(c.chainId, c.contractAddress)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`View ${c.name || 'contract'} on block explorer`}
                                    className="inline-flex min-h-11 min-w-11 md:min-h-9 md:min-w-9 items-center justify-center text-[#555555] hover:text-black"
                                  >
                                    <ExternalLink size={12} />
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              }))}
            </tbody>
          </table>
        ) : (
          /* Counterparties Table */
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#d4d4d4] border-b border-[#cecece] text-[10px] font-extrabold text-[#555555] uppercase tracking-wider">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">COUNTERPARTY</th>
                <th className="py-3 px-4">TYPE</th>
                <th className="py-3 px-4 text-right">INBOUND</th>
                <th className="py-3 px-4 text-right">OUTBOUND</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#cecece] text-xs font-bold text-[#0a0a0a]">
              {counterparties.map((c, i) => (
                <tr key={i} className="hover:bg-[#d5d5d5] transition-colors">
                  <td className="py-3.5 px-4 font-mono text-[#777777]">{i + 1}</td>
                  <td className="py-3.5 px-4 font-mono">
                    <div className="font-bold text-[#0a0a0a]">{c.label || c.address}</div>
                    {c.label && <div className="text-[10px] text-[#555555]">{c.address}</div>}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="bg-[#d0d0d0] text-[#0a0a0a] text-[10px] font-bold px-2 py-0.5 uppercase">
                      {c.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-[#047857]">
                    {c.inboundUSD > 0 ? `$${c.inboundUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-orange-ink">
                    {c.outboundUSD > 0 ? `$${c.outboundUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <a
                      href={getExplorerAddressUrl(c.chainId || 1, c.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View ${c.label || c.address} on block explorer`}
                      className="inline-flex min-h-11 min-w-11 md:min-h-9 md:min-w-9 items-center justify-center text-[#555555] hover:text-black"
                    >
                      <ExternalLink size={13} className="ml-auto" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
