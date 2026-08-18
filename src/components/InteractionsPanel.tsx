'use client';

import React, { useState, useMemo } from 'react';
import { ScanResult, ProtocolInteraction } from '@/lib/types';
import { getExplorerAddressUrl } from '@/lib/chains';
import { ExternalLink, ChevronDown, ChevronRight, Search } from 'lucide-react';

interface Props {
  results: ScanResult[];
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
        const key = p.name.toLowerCase();
        const existing = map.get(key);
        if (existing) {
          existing.txCount += p.txCount;
          existing.totalGasETH += p.totalGasETH;
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
    const list: any[] = [];
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

  const toggleExpand = (name: string) => {
    setExpandedProtocols(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const categories = ['all', 'swap', 'bridge', 'lending', 'perps', 'staking', 'nft'];

  return (
    <div className="space-y-6">
      {/* ── Top Summary Header Metrics (Sharp Square Toned Gray Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-[#dedede] border border-[#cecece] text-[#0a0a0a] space-y-1 shadow-sm">
          <div className="text-[11px] font-extrabold text-[#555555] uppercase tracking-wider">
            TOTAL PROTOCOL FAMILIES
          </div>
          <div className="text-3xl font-black text-[#0a0a0a] font-mono">
            {protocols.length}
          </div>
        </div>

        <div className="p-5 bg-[#dedede] border border-[#cecece] text-[#0a0a0a] space-y-1 shadow-sm">
          <div className="text-[11px] font-extrabold text-[#555555] uppercase tracking-wider">
            COUNTERPARTY ADDRESSES
          </div>
          <div className="text-3xl font-black text-[#0a0a0a] font-mono">
            {counterparties.length}
          </div>
        </div>

        <div className="p-5 bg-[#dedede] border border-[#cecece] text-[#0a0a0a] space-y-1 shadow-sm">
          <div className="text-[11px] font-extrabold text-[#555555] uppercase tracking-wider">
            MOST INTERACTED PROTOCOL
          </div>
          <div className="text-xl font-black text-[#ff5500] truncate">
            {protocols[0]?.name || 'N/A'}
          </div>
          <div className="text-xs font-bold text-[#555555] font-mono">
            {protocols[0]?.txCount || 0} calls across {protocols[0]?.contracts?.length || 1} contracts
          </div>
        </div>
      </div>

      {/* ── View Switcher & Search Bar ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('protocols')}
            className={`px-4 py-2 text-xs font-black transition-all cursor-pointer ${
              activeView === 'protocols'
                ? 'bg-black text-white shadow-sm'
                : 'bg-[#d8d8d8] text-[#333333] hover:bg-black hover:text-white'
            }`}
          >
            Protocols & DApps ({protocols.length})
          </button>
          <button
            onClick={() => setActiveView('counterparties')}
            className={`px-4 py-2 text-xs font-black transition-all cursor-pointer ${
              activeView === 'counterparties'
                ? 'bg-black text-white shadow-sm'
                : 'bg-[#d8d8d8] text-[#333333] hover:bg-black hover:text-white'
            }`}
          >
            Counterparty Addresses ({counterparties.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-3 text-[#777777]" />
          <input
            type="text"
            placeholder="Search Uniswap, Aave..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#dedede] border border-[#cecece] text-xs font-semibold text-[#0a0a0a] pl-8 pr-3 py-2 focus:outline-none focus:border-black"
          />
        </div>
      </div>

      {/* ── Category Filter Pills ── */}
      {activeView === 'protocols' && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-xs font-bold text-[#555555] uppercase tracking-wider mr-1">
            Filter Category:
          </span>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs font-bold px-3 py-1 transition-all cursor-pointer uppercase ${
                selectedCategory === cat
                  ? 'bg-[#ff5500] text-white shadow-sm'
                  : 'bg-[#d8d8d8] text-[#333333] hover:bg-black hover:text-white'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
      )}

      {/* ── Data Table ── */}
      <div className="border border-[#cecece] bg-[#dedede] overflow-hidden overflow-x-auto">
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
              {filteredProtocols.map((p, i) => {
                const isExpanded = expandedProtocols.has(p.name);
                const hasSubContracts = p.contracts && p.contracts.length > 1;

                return (
                  <React.Fragment key={p.name}>
                    <tr className="hover:bg-[#d5d5d5] transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[#777777]">{i + 1}</td>
                      <td className="py-3.5 px-4 font-extrabold text-[#0a0a0a] flex items-center gap-2">
                        {p.name}
                        {p.protocol !== p.name && (
                          <span className="text-[10px] font-semibold text-[#555555]">({p.protocol})</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-[#d0d0d0] text-[#0a0a0a] text-[10px] font-bold px-2 py-0.5 uppercase">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-[#ff5500]">{p.txCount}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-[#0a0a0a]">
                        <div>{p.totalGasETH.toFixed(4)} ETH</div>
                        <div className="text-[10px] font-normal text-[#555555]">≈ ${p.totalGasUSD.toFixed(2)}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-[#0a0a0a]">
                        {p.totalVolumeUSD > 0 ? `$${p.totalVolumeUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-[#ff5500]/10 text-[#ff5500] text-[10px] font-bold px-2 py-0.5 border border-[#ff5500]/30">
                          ETH
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {hasSubContracts ? (
                          <button
                            onClick={() => toggleExpand(p.name)}
                            className="text-xs font-bold text-[#ff5500] hover:underline flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            <span>{p.contracts.length} contracts</span>
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        ) : (
                          <a
                            href={getExplorerAddressUrl(1, p.contracts?.[0]?.contractAddress || '')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#555555] hover:text-black"
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
                              <div key={c.contractAddress} className="flex justify-between items-center bg-[#dedede] p-2.5 border border-[#cecece]">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-[#0a0a0a]">{c.name || 'Contract'}:</span>
                                  <span className="text-[#555555]">{c.contractAddress}</span>
                                </div>
                                <div className="flex items-center gap-4 text-right font-bold text-[#0a0a0a]">
                                  <span>{c.txCount} calls</span>
                                  <span>{c.totalGasETH.toFixed(4)} ETH</span>
                                  <a
                                    href={getExplorerAddressUrl(1, c.contractAddress)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#555555] hover:text-black"
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
              })}
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
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-[#059669]">
                    {c.inboundUSD > 0 ? `$${c.inboundUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-[#ff5500]">
                    {c.outboundUSD > 0 ? `$${c.outboundUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <a
                      href={getExplorerAddressUrl(c.chainId || 1, c.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#555555] hover:text-black"
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
