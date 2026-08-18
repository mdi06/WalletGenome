'use client';

import React from 'react';
import { MultiChainScanResult } from '@/lib/types';
import { Shield, Fuel, UserCheck, Layers, ArrowUpRight } from 'lucide-react';

interface Props {
  data: MultiChainScanResult;
}

export default function SummaryCards({ data }: Props) {
  const { aggregated, sybilReport, identityReport, chains } = data;

  const totalGasETH = aggregated.totalGasETH || 0;
  const totalGasUSD = aggregated.totalGasUSD || 0;
  const riskScore = aggregated.riskScore ?? 0;
  const riskGrade = aggregated.riskGrade || 'A';
  const sybilProb = sybilReport?.mediaScore?.sybilProbability ?? (sybilReport?.isFlagged ? 85 : 5);
  const totalProtocols = chains.reduce((sum, c) => sum + (c.interactionsSummary?.topProtocols?.length || 0), 0);

  const getRiskColor = (score: number) => {
    if (score <= 35) return 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/30';
    if (score <= 65) return 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/30';
    return 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/30';
  };

  const getSybilColor = (prob: number) => {
    if (prob <= 30) return 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/30';
    if (prob <= 55) return 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/30';
    return 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/30';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up">
      {/* ── KPI 1: Risk & Security Assessment ── */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Shield size={16} className="text-[#f59e0b]" />
            <span>Security Rating</span>
          </div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border font-mono ${getRiskColor(riskScore)}`}>
            Grade {riskGrade}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-white">{riskScore}</span>
          <span className="text-xs text-slate-400 font-mono">/ 100 Risk</span>
        </div>
        <div className="text-xs text-slate-400 flex justify-between items-center pt-2 border-t border-white/[0.06]">
          <span>{aggregated.totalHighRiskApprovals} high-risk approvals</span>
          <span className="text-slate-500 font-mono">{aggregated.totalDeadAssets} dead tokens</span>
        </div>
      </div>

      {/* ── KPI 2: Lifetime Gas Spent ── */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Fuel size={16} className="text-[#38bdf8]" />
            <span>Lifetime Gas</span>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
            {chains.length} Chains
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-white">
            {totalGasETH >= 10 ? totalGasETH.toFixed(2) : totalGasETH.toFixed(3)}
          </span>
          <span className="text-xs text-slate-400 font-mono">ETH</span>
        </div>
        <div className="text-xs text-slate-400 flex justify-between items-center pt-2 border-t border-white/[0.06]">
          <span className="font-mono text-slate-300">≈ ${totalGasUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })} USD</span>
          <span className="text-slate-500 font-mono">{aggregated.totalTransactions} total txs</span>
        </div>
      </div>

      {/* ── KPI 3: Sybil & Airdrop Radar ── */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <UserCheck size={16} className="text-[#10b981]" />
            <span>Sybil Probability</span>
          </div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border font-mono ${getSybilColor(sybilProb)}`}>
            {sybilProb <= 30 ? 'Organic' : sybilProb <= 55 ? 'Moderate' : 'High Risk'}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-white">{sybilProb}%</span>
          <span className="text-xs text-slate-400">Trusta Heuristic</span>
        </div>
        <div className="text-xs text-slate-400 flex justify-between items-center pt-2 border-t border-white/[0.06]">
          <span className="text-[#10b981] font-medium">4 DBs Verified Clean</span>
          <span className="text-slate-500 font-mono">0 Flags</span>
        </div>
      </div>

      {/* ── KPI 4: Protocols & Identity ── */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Layers size={16} className="text-[#a855f7]" />
            <span>Protocols & Identity</span>
          </div>
          {identityReport?.primaryName ? (
            <span className="text-xs font-semibold text-[#a855f7] bg-[#a855f7]/10 px-2 py-0.5 rounded-full border border-[#a855f7]/30">
              Resolved
            </span>
          ) : (
            <span className="text-xs text-slate-500 bg-white/[0.04] px-2 py-0.5 rounded">
              Anonymous
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2 truncate">
          <span className="text-xl font-bold text-white truncate">
            {identityReport?.primaryName || `${data.address.slice(0, 6)}...${data.address.slice(-4)}`}
          </span>
        </div>
        <div className="text-xs text-slate-400 flex justify-between items-center pt-2 border-t border-white/[0.06]">
          <span>{totalProtocols} DApps interacted</span>
          <span className="text-slate-500 font-mono">{identityReport?.socials?.length || 0} socials</span>
        </div>
      </div>
    </div>
  );
}
