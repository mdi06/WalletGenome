'use client';

import React, { useState, useMemo } from 'react';
import { ClusterScanResult } from '@/lib/types';
import { formatCompactUSD } from './Dashboard';
import ClusterFlowGraph from './ClusterFlowGraph';
import { Download, Table, GitFork, ShieldAlert, ShieldCheck, Sparkles, AlertTriangle, Layers, Dna, ArrowRight } from 'lucide-react';

interface Props {
  data: ClusterScanResult;
  onInspectWallet: (address: string) => void;
}

type BulkTabId = 'leaderboard' | 'flow';
type SortField = 'gas' | 'inflow' | 'sybil' | 'risk' | 'txs';

export default function BulkDashboard({ data, onInspectWallet }: Props) {
  const [activeTab, setActiveTab] = useState<BulkTabId>('leaderboard');
  const [sortField, setSortField] = useState<SortField>('gas');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // ── Compute Cluster Intelligence & Summary ──
  const summary = useMemo(() => {
    const total = data.totalWallets;
    const directLinks = data.linkages.length;
    const topHub = data.sharedCounterparties[0];
    const topHubOverlapPct = topHub && total > 0 ? Math.round((topHub.sharedCount / total) * 100) : 0;

    // Coordination level
    let coordinationLevel: 'HIGH COORDINATION CLUSTER' | 'MODERATE OVERLAP' | 'INDEPENDENT PORTFOLIO';
    let coordinationColor = 'bg-[#059669]/10 text-[#059669] border-[#059669]/30';

    if (directLinks >= 5 || topHubOverlapPct >= 75) {
      coordinationLevel = 'HIGH COORDINATION CLUSTER';
      coordinationColor = 'bg-[#ff5500]/10 text-[#ff5500] border-[#ff5500]/30';
    } else if (directLinks > 0 || topHubOverlapPct >= 40) {
      coordinationLevel = 'MODERATE OVERLAP';
      coordinationColor = 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30';
    } else {
      coordinationLevel = 'INDEPENDENT PORTFOLIO';
      coordinationColor = 'bg-[#059669]/10 text-[#059669] border-[#059669]/30';
    }

    // Dominant Persona
    const personaCounts = new Map<string, number>();
    data.wallets.forEach(w => {
      personaCounts.set(w.persona, (personaCounts.get(w.persona) || 0) + 1);
    });
    let dominantPersona = 'Active Trader';
    let maxPCount = 0;
    for (const [p, c] of personaCounts.entries()) {
      if (c > maxPCount) {
        maxPCount = c;
        dominantPersona = p;
      }
    }

    // Auto-Generated Executive Narrative
    let narrative = '';
    if (coordinationLevel === 'HIGH COORDINATION CLUSTER') {
      narrative = `This cluster exhibits strong on-chain synchronicity: ${directLinks} direct inter-wallet transfers detected with ${topHubOverlapPct}% of wallets sharing central interaction hubs (${topHub?.label || topHub?.address.slice(0, 6) + '...' || 'Contracts'}). Behavior is consistent with a coordinated campaign or shared parent-child asset distribution.`;
    } else if (coordinationLevel === 'MODERATE OVERLAP') {
      narrative = `Moderate ecosystem overlap detected across ${total} wallets. While direct inter-wallet routing is limited (${directLinks} transfers), wallets share common protocol hubs and liquidity endpoints. Dominant archetype: ${dominantPersona}.`;
    } else {
      narrative = `The submitted batch consists of independent addresses with no direct transfer linkages. Accounts operate autonomously with distinct protocol footprints and diverse interaction profiles.`;
    }

    return {
      coordinationLevel,
      coordinationColor,
      dominantPersona,
      dominantPersonaPct: total > 0 ? Math.round((maxPCount / total) * 100) : 0,
      narrative,
      directLinks,
      topHub,
      topHubOverlapPct,
    };
  }, [data]);

  const sortedWallets = useMemo(() => {
    const list = [...data.wallets];
    list.sort((a, b) => {
      let valA = 0;
      let valB = 0;
      switch (sortField) {
        case 'gas':
          valA = a.totalGasUSD;
          valB = b.totalGasUSD;
          break;
        case 'inflow':
          valA = a.totalInflowUSD;
          valB = b.totalInflowUSD;
          break;
        case 'sybil':
          valA = a.sybilProbability;
          valB = b.sybilProbability;
          break;
        case 'risk':
          valA = a.riskScore;
          valB = b.riskScore;
          break;
        case 'txs':
          valA = a.transactionCount;
          valB = b.transactionCount;
          break;
      }
      return sortAsc ? valA - valB : valB - valA;
    });
    return list;
  }, [data.wallets, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Address', 'Primary Name', 'Persona', 'Risk Grade', 'Sybil Prob (%)', 'Lifetime Gas (USD)', 'Total Inflow (USD)', 'Transactions', 'High Risk Approvals'];
    const rows = sortedWallets.map(w => [
      w.address,
      w.primaryName || '',
      w.persona,
      w.riskGrade,
      w.sybilProbability,
      w.totalGasUSD.toFixed(2),
      w.totalInflowUSD.toFixed(2),
      w.transactionCount,
      w.highRiskApprovalsCount,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `walletgenome_cluster_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      
      {/* ── 1. Top Cluster Metric KPI Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Total Wallets */}
        <div className="card-3d p-4 text-[#0a0a0a] space-y-1">
          <div className="text-[10px] font-extrabold text-[#4b5563] uppercase tracking-wider">
            WALLETS SCANNED
          </div>
          <div className="text-2xl font-black font-mono text-[#0a0a0a]">
            {data.totalWallets} Wallets
          </div>
          <div className="text-[11px] font-bold text-[#4b5563] font-mono">
            {data.totalTransactions.toLocaleString()} Total Txs
          </div>
        </div>

        {/* Combined Gas */}
        <div className="card-3d p-4 text-[#0a0a0a] space-y-1">
          <div className="text-[10px] font-extrabold text-[#4b5563] uppercase tracking-wider">
            COMBINED LIFETIME GAS
          </div>
          <div className="text-2xl font-black font-mono text-[#ff5500]">
            {formatCompactUSD(data.totalGasUSD)}
          </div>
          <div className="text-[11px] font-bold text-[#4b5563] font-mono">
            Across active chains
          </div>
        </div>

        {/* Total Capital Moved */}
        <div className="card-3d p-4 text-[#0a0a0a] space-y-1">
          <div className="text-[10px] font-extrabold text-[#4b5563] uppercase tracking-wider">
            COMBINED INFLOWS
          </div>
          <div className="text-2xl font-black font-mono text-[#0a0a0a]">
            {formatCompactUSD(data.totalInflowUSD)}
          </div>
          <div className="text-[11px] font-bold text-[#4b5563] font-mono">
            Aggregate capital depth
          </div>
        </div>

        {/* Cluster Sybil Exposure */}
        <div className="card-3d p-4 text-[#0a0a0a] space-y-1">
          <div className="text-[10px] font-extrabold text-[#4b5563] uppercase tracking-wider">
            AVG SYBIL PROBABILITY
          </div>
          <div className={`text-2xl font-black font-mono ${data.flaggedCount > 0 ? 'text-[#dc2626]' : 'text-[#059669]'}`}>
            {typeof data.avgSybilProbability === 'number' ? data.avgSybilProbability.toFixed(2) : Number(data.avgSybilProbability || 0).toFixed(2)}%
          </div>
          <div className="text-[11px] font-bold text-[#4b5563] font-mono">
            {data.flaggedCount > 0 ? `${data.flaggedCount} Flagged Wallets` : 'All Wallets Clean'}
          </div>
        </div>

        {/* Critical Approvals */}
        <div className="card-3d p-4 text-[#0a0a0a] space-y-1">
          <div className="text-[10px] font-extrabold text-[#4b5563] uppercase tracking-wider">
            HIGH-RISK APPROVALS
          </div>
          <div className="text-2xl font-black font-mono text-[#dc2626]">
            {data.totalHighRiskApprovals}
          </div>
          <div className="text-[11px] font-bold text-[#4b5563] font-mono">
            Require revocation audit
          </div>
        </div>

      </div>

      {/* ── 2. Automated Forensic Findings & AI Summary Card ── */}
      <div className="card-3d p-6 text-[#0a0a0a] space-y-4">
        
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#c8c8c8] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 btn-3d-black text-[#ff5500] flex items-center justify-center font-black flex-shrink-0">
              <Sparkles size={16} />
            </div>
            <div>
              <span className="text-xs font-black uppercase text-[#0a0a0a] tracking-wider block">
                CLUSTER FORENSIC EXECUTIVE SUMMARY
              </span>
              <span className="text-[10px] font-bold text-[#4b5563]">
                Automated multi-wallet behavioral intelligence & correlation analysis
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`badge-3d text-[10px] font-mono font-black px-3 py-1 border uppercase ${summary.coordinationColor}`}>
              {summary.coordinationLevel}
            </span>
          </div>
        </div>

        {/* Executive Narrative Paragraph */}
        <p className="text-xs sm:text-sm text-[#1f2937] font-medium leading-relaxed text-pretty">
          {summary.narrative}
        </p>

        {/* 3 Structured Key Takeaways */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          
          <div className="well-recessed-light p-3 space-y-1">
            <div className="text-[10px] font-extrabold text-[#4b5563] uppercase tracking-wider flex items-center gap-1">
              <GitFork size={12} className="text-[#ff5500]" />
              INTER-WALLET LINKAGE
            </div>
            <div className="text-sm font-black font-mono text-[#0a0a0a]">
              {summary.directLinks > 0 ? `${summary.directLinks} Direct Transfers` : 'Zero Direct Links'}
            </div>
            <div className="text-[11px] text-[#4b5563]">
              {summary.directLinks > 0 ? 'Direct capital moved between members' : 'No cross-wallet transfers'}
            </div>
          </div>

          <div className="well-recessed-light p-3 space-y-1">
            <div className="text-[10px] font-extrabold text-[#4b5563] uppercase tracking-wider flex items-center gap-1">
              <Layers size={12} className="text-[#3b82f6]" />
              CENTRAL HUB OVERLAP
            </div>
            <div className="text-sm font-black font-mono text-[#0a0a0a]">
              {summary.topHubOverlapPct}% Common Overlap
            </div>
            <div className="text-[11px] text-[#4b5563] truncate">
              {summary.topHub ? `${summary.topHub.sharedCount} wallets used ${summary.topHub.label || summary.topHub.address.slice(0, 6) + '...'}` : 'No dominant hub'}
            </div>
          </div>

          <div className="well-recessed-light p-3 space-y-1">
            <div className="text-[10px] font-extrabold text-[#4b5563] uppercase tracking-wider flex items-center gap-1">
              <Dna size={12} className="text-[#059669]" />
              DOMINANT ARCHETYPE
            </div>
            <div className="text-sm font-black font-mono text-[#0a0a0a]">
              {summary.dominantPersona} ({summary.dominantPersonaPct}%)
            </div>
            <div className="text-[11px] text-[#4b5563]">
              Primary behavior pattern in cluster
            </div>
          </div>

        </div>
      </div>

      {/* ── 3. Cluster Sub-Tabs Navigation ── */}
      <div className="flex items-center gap-3 border-b border-[#c8c8c8] pb-2.5 px-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('leaderboard')}
          className={`px-3.5 py-2 text-xs font-black tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'leaderboard'
              ? 'btn-3d-black text-white'
              : 'btn-3d-neutral text-[#4b5563] hover:text-black font-bold'
          }`}
        >
          <Table size={14} className={activeTab === 'leaderboard' ? 'text-[#ff5500]' : ''} />
          <span>CLUSTER LEADERBOARD</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.2 badge-3d ${activeTab === 'leaderboard' ? 'bg-[#ff5500] text-white' : 'bg-[#d0d0d0] text-black'}`}>
            {data.totalWallets}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('flow')}
          className={`px-3.5 py-2 text-xs font-black tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'flow'
              ? 'btn-3d-black text-white'
              : 'btn-3d-neutral text-[#4b5563] hover:text-black font-bold'
          }`}
        >
          <GitFork size={14} className={activeTab === 'flow' ? 'text-[#ff5500]' : ''} />
          <span>INTER-WALLET FLOW GRAPH</span>
          <span
            className={`text-[10px] font-mono px-1.5 py-0.2 badge-3d ${
              data.linkages.length > 0 ? 'bg-[#ff5500] text-white' : 'bg-[#d0d0d0] text-[#333333]'
            }`}
          >
            {data.linkages.length > 0 ? `${data.linkages.length} LINKED` : 'ALL WALLETS'}
          </span>
        </button>
      </div>

      {/* ── 4. Tab Views ── */}

      {/* Tab A: Leaderboard View */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6">
          {/* Direct Linkages & Shared Counterparties Quick Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Direct Linkages */}
            <div className="card-3d p-5 text-[#0a0a0a] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-[#0a0a0a] flex items-center gap-1.5">
                  <GitFork size={14} className="text-[#ff5500]" />
                  DIRECT INTER-WALLET TRANSFERS
                </span>
                <span className="btn-3d-neutral text-[10px] font-mono font-bold px-2 py-0.5 text-[#0a0a0a]">
                  {data.linkages.length} CONNECTIONS
                </span>
              </div>

              {data.linkages.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {data.linkages.map((l, i) => (
                    <div key={i} className="well-recessed-light p-2 text-xs font-mono font-bold flex items-center justify-between">
                      <span className="text-[#0a0a0a] truncate">{l.detail}</span>
                      <span className="badge-3d text-[9px] font-black uppercase px-2 py-0.5 bg-[#ff5500] text-white flex-shrink-0 ml-2">LINKED</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#4b5563] py-2">
                  No direct token or ETH transfers detected between the wallets in this batch.
                </p>
              )}
            </div>

            {/* Shared Counterparties */}
            <div className="card-3d p-5 text-[#0a0a0a] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-[#0a0a0a] flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-[#3b82f6] inline-block rounded-full" />
                  TOP SHARED COUNTERPARTIES & HUBS
                </span>
                <span className="btn-3d-neutral text-[10px] font-mono font-bold px-2 py-0.5 text-[#0a0a0a]">
                  {data.sharedCounterparties.length} HUBS
                </span>
              </div>

              {data.sharedCounterparties.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {data.sharedCounterparties.map((sc, i) => (
                    <div key={i} className="well-recessed-light p-2 text-xs font-mono font-bold flex items-center justify-between">
                      <div className="truncate">
                        <span className="text-[#0a0a0a] font-black">{sc.label || `${sc.address.slice(0, 6)}...${sc.address.slice(-4)}`}</span>
                        {sc.label && <span className="text-[10px] text-[#4b5563] ml-2">{`${sc.address.slice(0, 6)}...`}</span>}
                      </div>
                      <span className="badge-3d text-[10px] font-bold px-2 py-0.5 bg-[#d0d0d0] text-[#0a0a0a] flex-shrink-0 ml-2">
                        Used by {sc.sharedCount} / {data.totalWallets} wallets
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#4b5563] py-2">
                  No significant shared funding sources or overlapping counterparties detected.
                </p>
              )}
            </div>

          </div>

          {/* Leaderboard Table Container */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-black uppercase text-[#0a0a0a] tracking-wider block">
                  CLUSTER WALLET AUDIT LEADERBOARD
                </span>
                <span className="text-[11px] font-bold text-[#4b5563]">
                  Click column headers to sort · Click "Inspect" for full single-wallet forensic breakdown
                </span>
              </div>

              <button
                type="button"
                onClick={handleExportCSV}
                className="btn-3d-black text-white font-bold text-xs px-3.5 py-1.5 flex items-center gap-1.5 cursor-pointer"
              >
                <Download size={12} />
                <span>EXPORT CSV</span>
              </button>
            </div>

            <div className="well-recessed-light overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#d0d0d0] border-b border-[#c2c2c2] text-[10px] font-extrabold text-[#4b5563] uppercase tracking-wider">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">WALLET IDENTITY</th>
                    <th className="py-3 px-4">PERSONA</th>
                    <th
                      onClick={() => handleSort('risk')}
                      className="py-3 px-4 cursor-pointer hover:text-black transition-colors"
                    >
                      RISK GRADE {sortField === 'risk' && (sortAsc ? '▲' : '▼')}
                    </th>
                    <th
                      onClick={() => handleSort('sybil')}
                      className="py-3 px-4 cursor-pointer hover:text-black transition-colors"
                    >
                      SYBIL PROB. {sortField === 'sybil' && (sortAsc ? '▲' : '▼')}
                    </th>
                    <th
                      onClick={() => handleSort('gas')}
                      className="py-3 px-4 text-right cursor-pointer hover:text-black transition-colors"
                    >
                      LIFETIME GAS {sortField === 'gas' && (sortAsc ? '▲' : '▼')}
                    </th>
                    <th
                      onClick={() => handleSort('inflow')}
                      className="py-3 px-4 text-right cursor-pointer hover:text-black transition-colors"
                    >
                      NET INFLOW {sortField === 'inflow' && (sortAsc ? '▲' : '▼')}
                    </th>
                    <th
                      onClick={() => handleSort('txs')}
                      className="py-3 px-4 text-right cursor-pointer hover:text-black transition-colors"
                    >
                      TRANSACTIONS {sortField === 'txs' && (sortAsc ? '▲' : '▼')}
                    </th>
                    <th className="py-3 px-4 text-right">ACTION</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#c8c8c8] text-xs font-bold text-[#0a0a0a]">
                  {sortedWallets.map((w, idx) => (
                    <tr key={w.address} className="hover:bg-white/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[#6b7280]">{idx + 1}</td>
                      
                      {/* Wallet Identity & Socials */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-[#0a0a0a] flex items-center gap-1.5">
                          <span>{w.primaryName || `${w.address.slice(0, 6)}...${w.address.slice(-4)}`}</span>
                          {w.socialsCount > 0 && (
                            <span className="badge-3d text-[9px] font-sans font-bold px-1.5 py-0.2 bg-[#059669]/15 text-[#047857] border border-[#059669]/40">
                              {w.socialsCount} Socials
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#4b5563]">{w.address}</div>
                      </td>

                      {/* Persona */}
                      <td className="py-3.5 px-4">
                        <span className="btn-3d-black text-[10px] font-extrabold uppercase px-2 py-0.5 text-white">
                          {w.persona}
                        </span>
                      </td>

                      {/* Risk Grade */}
                      <td className="py-3.5 px-4 font-mono font-black">
                        <span
                          className={`text-sm ${
                            w.riskGrade === 'A'
                              ? 'text-[#047857]'
                              : w.riskGrade === 'B'
                              ? 'text-[#0a0a0a]'
                              : 'text-[#dc2626]'
                          }`}
                        >
                          {w.riskGrade}
                        </span>
                        <span className="text-[10px] text-[#4b5563] font-normal ml-1">({w.riskScore})</span>
                      </td>

                      {/* Sybil Probability */}
                      <td className="py-3.5 px-4 font-mono">
                        <span
                          className={`font-bold ${
                            w.sybilProbability <= 30
                              ? 'text-[#047857]'
                              : w.sybilProbability <= 60
                              ? 'text-[#b45309]'
                              : 'text-[#dc2626]'
                          }`}
                        >
                          {w.sybilProbability}%
                        </span>
                        {w.isFlagged && (
                          <span className="badge-3d ml-1 text-[9px] font-black uppercase text-[#b91c1c] bg-[#dc2626]/15 px-1.5 py-0.5 border border-[#dc2626]/40">
                            FLAGGED
                          </span>
                        )}
                      </td>

                      {/* Lifetime Gas */}
                      <td className="py-3.5 px-4 text-right font-mono font-black text-[#ff5500]">
                        {formatCompactUSD(w.totalGasUSD)}
                      </td>

                      {/* Inflow */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0a0a0a]">
                        {formatCompactUSD(w.totalInflowUSD)}
                      </td>

                      {/* Transactions */}
                      <td className="py-3.5 px-4 text-right font-mono text-[#0a0a0a]">
                        {w.transactionCount.toLocaleString()} txs
                      </td>

                      {/* Action: Deep Dive */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onInspectWallet(w.address)}
                          className="btn-3d-black text-white text-[11px] font-bold py-1 px-3 cursor-pointer"
                        >
                          Inspect →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab B: Interactive Flow Graph View */}
      {activeTab === 'flow' && (
        <div className="card-3d p-6">
          <ClusterFlowGraph
            wallets={data.wallets}
            linkages={data.linkages}
            sharedCounterparties={data.sharedCounterparties}
            onInspectWallet={onInspectWallet}
          />
        </div>
      )}

    </div>
  );
}
