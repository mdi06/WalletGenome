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
      <div className="card-3d p-5 space-y-3 text-[#0a0a0a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[#4b5563] uppercase tracking-wider">
            <Shield size={16} className="text-[#ff5500]" />
            <span>Security Rating</span>
          </div>
          <span className={`badge-3d text-xs font-bold px-2 py-0.5 border font-mono ${getRiskColor(riskScore)}`}>
            Grade {riskGrade}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black font-mono text-[#0a0a0a]">{riskScore}</span>
          <span className="text-xs text-[#4b5563] font-mono">/ 100 Risk</span>
        </div>
        <div className="text-xs text-[#4b5563] flex justify-between items-center pt-2 border-t border-[#c8c8c8]">
          <span>{aggregated.totalHighRiskApprovals} high-risk approvals</span>
          <span className="text-[#6b7280] font-mono">{aggregated.totalDeadAssets} dead tokens</span>
        </div>
      </div>

      {/* ── KPI 2: Lifetime Gas Spent ── */}
      <div className="card-3d p-5 space-y-3 text-[#0a0a0a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[#4b5563] uppercase tracking-wider">
            <Fuel size={16} className="text-[#ff5500]" />
            <span>Lifetime Gas</span>
          </div>
          <span className="btn-3d-neutral text-xs font-mono text-[#0a0a0a] px-2 py-0.5">
            {chains.length} Chains
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black font-mono text-[#ff5500]">
            {totalGasETH >= 10 ? totalGasETH.toFixed(2) : totalGasETH.toFixed(3)}
          </span>
          <span className="text-xs text-[#4b5563] font-mono">ETH</span>
        </div>
        <div className="text-xs text-[#4b5563] flex justify-between items-center pt-2 border-t border-[#c8c8c8]">
          <span className="font-mono text-[#0a0a0a] font-bold">≈ ${totalGasUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })} USD</span>
          <span className="text-[#6b7280] font-mono">{aggregated.totalTransactions} total txs</span>
        </div>
      </div>

      {/* ── KPI 3: Sybil & Airdrop Radar ── */}
      <div className="card-3d p-5 space-y-3 text-[#0a0a0a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[#4b5563] uppercase tracking-wider">
            <UserCheck size={16} className="text-[#059669]" />
            <span>Sybil Probability</span>
          </div>
          <span className={`badge-3d text-xs font-bold px-2 py-0.5 border font-mono ${getSybilColor(sybilProb)}`}>
            {sybilProb <= 30 ? 'Organic' : sybilProb <= 55 ? 'Moderate' : 'High Risk'}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black font-mono text-[#0a0a0a]">{sybilProb}%</span>
          <span className="text-xs text-[#4b5563]">Trusta Heuristic</span>
        </div>
        <div className="text-xs text-[#4b5563] flex justify-between items-center pt-2 border-t border-[#c8c8c8]">
          <span className="text-[#059669] font-bold">4 DBs Verified Clean</span>
          <span className="text-[#6b7280] font-mono">0 Flags</span>
        </div>
      </div>

      {/* ── KPI 4: Protocols & Identity ── */}
      <div className="card-3d p-5 space-y-3 text-[#0a0a0a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[#4b5563] uppercase tracking-wider">
            <Layers size={16} className="text-[#ff5500]" />
            <span>Protocols & Identity</span>
          </div>
          {identityReport?.primaryName ? (
            <span className="badge-3d text-xs font-bold text-[#059669] bg-[#059669]/15 px-2 py-0.5 border border-[#059669]/40">
              Resolved
            </span>
          ) : (
            <span className="btn-3d-neutral text-xs text-[#6b7280] px-2 py-0.5">
              Anonymous
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2 truncate">
          <span className="text-xl font-black text-[#0a0a0a] truncate">
            {identityReport?.primaryName || `${data.address.slice(0, 6)}...${data.address.slice(-4)}`}
          </span>
        </div>
        <div className="text-xs text-[#4b5563] flex justify-between items-center pt-2 border-t border-[#c8c8c8]">
          <span>{totalProtocols} DApps interacted</span>
          <span className="text-[#6b7280] font-mono">{identityReport?.socials?.length || 0} socials</span>
        </div>
      </div>
    </div>
  );
}
