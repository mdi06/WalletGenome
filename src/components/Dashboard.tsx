'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { MultiChainScanResult } from '@/lib/types';
import BehavioralFingerprint from './BehavioralFingerprint';
import RiskScore from './RiskScore';
import SybilRadar from './SybilRadar';
import IdentityCard from './IdentityCard';
import { ExternalLink } from 'lucide-react';
import { formatCompactUSD, extractProtocolBadges, computeAggregatedRadarData } from '@/lib/utils/dashboardUtils';

export { formatCompactUSD, extractProtocolBadges };

const BehavioralRadarChart = dynamic(() => import('./BehavioralRadarChart'), {
  loading: () => (
    <div className="w-full h-52 flex items-center justify-center text-xs font-mono font-bold text-gray-400 uppercase tracking-wider animate-pulse">
      Rendering Radar...
    </div>
  ),
  ssr: false,
});

const CapitalFlowGraph = dynamic(() => import('./CapitalFlowGraph'), {
  loading: () => (
    <div className="p-12 text-center text-xs font-mono font-bold text-gray-500 uppercase tracking-wider animate-pulse">
      Rendering Capital Flow Topology Graph...
    </div>
  ),
  ssr: false,
});

const ActivityHeatmap = dynamic(() => import('./ActivityHeatmap'), {
  loading: () => (
    <div className="p-8 text-center text-xs font-mono font-bold text-gray-500 uppercase tracking-wider animate-pulse">
      Rendering Activity Heatmap...
    </div>
  ),
  ssr: false,
});

const InteractionsPanel = dynamic(() => import('./InteractionsPanel'), {
  loading: () => (
    <div className="p-8 text-center text-xs font-mono font-bold text-gray-500 uppercase tracking-wider animate-pulse">
      Loading Protocols...
    </div>
  ),
  ssr: false,
});

const GasSummaryPanel = dynamic(() => import('./GasSummaryPanel'), {
  loading: () => (
    <div className="p-8 text-center text-xs font-mono font-bold text-gray-500 uppercase tracking-wider animate-pulse">
      Loading Gas Fees...
    </div>
  ),
  ssr: false,
});

const TransferTable = dynamic(() => import('./TransferTable'), {
  loading: () => (
    <div className="p-8 text-center text-xs font-mono font-bold text-gray-500 uppercase tracking-wider animate-pulse">
      Loading Transfers...
    </div>
  ),
  ssr: false,
});

const ApprovalAudit = dynamic(() => import('./ApprovalAudit'), {
  loading: () => (
    <div className="p-8 text-center text-xs font-mono font-bold text-gray-500 uppercase tracking-wider animate-pulse">
      Loading Approvals...
    </div>
  ),
  ssr: false,
});

const Graveyard = dynamic(() => import('./Graveyard'), {
  loading: () => (
    <div className="p-8 text-center text-xs font-mono font-bold text-gray-500 uppercase tracking-wider animate-pulse">
      Loading Graveyard...
    </div>
  ),
  ssr: false,
});

interface DashboardProps {
  data: MultiChainScanResult;
}

type TabId = 'dna' | 'flow' | 'protocols' | 'gas' | 'transfers' | 'approvals' | 'graveyard';

export default function Dashboard({ data }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('dna');

  const { aggregated, sybilReport, identityReport, chains } = data;

  const totalGasETH = aggregated.totalGasETH || 0;
  const totalGasUSD = aggregated.totalGasUSD || 0;
  const riskScore = aggregated.riskScore ?? 0;
  const riskGrade = aggregated.riskGrade || 'A';
  const sybilProb = sybilReport?.mediaScore?.sybilProbability ?? (sybilReport?.isFlagged ? 85 : 0.02);
  const primaryName = identityReport?.primaryName || `${data.address.slice(0, 6)}...${data.address.slice(-4)}`;
  const persona = chains.find(c => c.fingerprint?.persona && c.fingerprint.persona !== 'New Wallet')?.fingerprint?.persona || chains[0]?.fingerprint?.persona || 'Alpha Hunter';

  const approvalCount = chains.reduce((sum, c) => sum + (c.approvalSummary?.totalApprovals || 0), 0);
  const deadCount = aggregated.totalDeadAssets;
  const protocolCount = chains.reduce((sum, c) => sum + (c.interactionsSummary?.topProtocols?.length || 0), 0);
  const totalInflowUSD = chains.reduce((sum, c) => sum + (c.transferSummary?.totalInboundUSD || 0), 0);

  const formatCurrencyValue = (val: any): string => {
    if (val === null || val === undefined) return '$0';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
    if (isNaN(num) || !isFinite(num) || num === 0) return '$0';
    const abs = Math.abs(num);
    if (abs >= 1e12) {
      const inT = num / 1e12;
      if (inT > 999.99) return '>$999T';
      return `$${inT.toFixed(2)}T`;
    }
    if (abs >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    if (abs >= 1) return `$${num.toFixed(2)}`;
    return `$${num.toFixed(3)}`;
  };

  const formattedInflowUSD = formatCurrencyValue(totalInflowUSD);
  const formattedGasUSD = formatCurrencyValue(totalGasUSD);

  // Extract Protocol Badges
  const protocolBadges = extractProtocolBadges(data);

  // Radar Data for Recharts aggregated across all chains
  const radarData = computeAggregatedRadarData(chains);

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'dna', label: 'BEHAVIORAL DNA' },
    { id: 'flow', label: 'FLOW GRAPH' },
    { id: 'protocols', label: 'PROTOCOLS', count: protocolCount },
    { id: 'gas', label: 'GAS FEES' },
    { id: 'transfers', label: 'TRANSFERS' },
    { id: 'approvals', label: 'APPROVALS', count: approvalCount },
    { id: 'graveyard', label: 'GRAVEYARD', count: deadCount },
  ];



  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ── Chain Warnings / Degradation Alert ── */}
      {data.chainWarnings && data.chainWarnings.length > 0 && (
        <div className="bg-[#fffbeb] border-l-4 border-l-[#f59e0b] p-3 space-y-1 text-xs border border-[#fde68a]">
          {data.chainWarnings.map((w, idx) => (
            <div key={idx} className="font-bold text-[#92400e] flex items-center gap-2">
              <span>⚠️</span>
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab Navigation Bar & Export Action ── */}
      <div className="flex items-center justify-between border-b border-[#c8c8c8] pb-2.5 px-1 overflow-x-auto gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 text-xs font-black tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? 'btn-3d-black text-white'
                    : 'btn-3d-neutral text-[#4b5563] hover:text-black font-bold'
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 badge-3d ${
                      isActive ? 'bg-[#ff5500] text-white' : 'bg-[#d0d0d0] text-[#333333]'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Views ── */}
      {activeTab === 'dna' && (
        <div className="space-y-6">
          {/* Universal Resolved Identity Banner */}
          <IdentityCard identity={identityReport} address={data.address} />

          {/* Sybil Radar Bar */}
          <SybilRadar report={sybilReport} />

          {/* Main 3-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ══════════════ LEFT COLUMN (Span 3) ══════════════ */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Persona Identity Card */}
              <div className="card-3d p-6 text-[#0a0a0a] flex flex-col items-center text-center space-y-4">
                <span className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider">
                  PERSONA IDENTITY
                </span>

                <div className="w-20 h-20 btn-3d-orange flex items-center justify-center text-white">
                  <span className="text-3xl font-black">🧬</span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-[#0a0a0a] tracking-tight truncate max-w-[200px]">
                    {primaryName}
                  </h3>
                  <div className="btn-3d-black text-white text-[10px] font-extrabold tracking-widest uppercase px-3 py-1">
                    {persona.toUpperCase()}
                  </div>
                </div>

                {/* Social Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap justify-center pt-1">
                  {identityReport?.socials && identityReport.socials.length > 0 ? (
                    identityReport.socials.map((s, i) => (
                      <a
                        key={i}
                        href={s.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-3d-neutral text-xs font-bold text-[#0a0a0a] px-2.5 py-1 flex items-center gap-1 cursor-pointer"
                      >
                        <span>{s.platform === 'twitter' ? 'X' : s.platform.toUpperCase()}</span>
                        <ExternalLink size={10} />
                      </a>
                    ))
                  ) : (
                    <>
                      <a
                        href={`https://debank.com/profile/${data.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-3d-neutral text-xs font-bold text-[#0a0a0a] px-3 py-1 cursor-pointer"
                      >
                        Debank
                      </a>
                      <a
                        href={`https://etherscan.io/address/${data.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-3d-neutral text-xs font-bold text-[#0a0a0a] px-3 py-1 cursor-pointer"
                      >
                        Etherscan
                      </a>
                    </>
                  )}
                </div>

                {/* Sunken Bottom Stats Well */}
                <div className="w-full well-recessed-light p-3 grid grid-cols-2 gap-2 text-center">
                  <div>
                    <div className="text-lg font-black text-[#0a0a0a] font-mono">
                      {riskGrade === 'A' ? 'A+' : riskGrade}
                    </div>
                    <div className="text-[10px] font-bold text-[#4b5563] uppercase tracking-wider">
                      TRUST SCORE
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-[#0a0a0a] font-mono">
                      {sybilProb}%
                    </div>
                    <div className="text-[10px] font-bold text-[#4b5563] uppercase tracking-wider">
                      SYBIL PROB.
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Ratings Card */}
              <div className="card-3d p-6 text-[#0a0a0a] space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider">
                    SECURITY RATINGS
                  </span>
                  <span className="btn-3d-neutral text-xs font-bold font-mono px-2 py-0.5 text-[#0a0a0a]">
                    Grade {riskGrade}
                  </span>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-[#0a0a0a] font-mono">
                    {Math.max(10, 100 - riskScore)}
                  </span>
                  <span className="text-sm font-bold text-[#4b5563] font-mono">/ 100</span>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[#333333]">Smart Contract Risk</span>
                      <span className="text-[#0a0a0a] font-mono">
                        {riskScore > 50 ? 'High' : riskScore > 25 ? 'Med' : 'Low'}
                      </span>
                    </div>
                    <div className="h-2 well-recessed overflow-hidden">
                      <div className="h-full bg-black" style={{ width: `${Math.min(100, riskScore)}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[#333333]">Approval Exposure</span>
                      <span className="text-[#0a0a0a] font-mono">
                        {aggregated.totalHighRiskApprovals > 0 ? `${aggregated.totalHighRiskApprovals} Risky` : 'Clean'}
                      </span>
                    </div>
                    <div className="h-2 well-recessed overflow-hidden">
                      <div
                        className="h-full bg-[#ff5500]"
                        style={{ width: `${Math.min(100, aggregated.totalHighRiskApprovals * 25 || 10)}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[#333333]">Dead Assets</span>
                      <span className="text-[#0a0a0a] font-mono">
                        {aggregated.totalDeadAssets > 0 ? `${aggregated.totalDeadAssets} Dead` : 'None'}
                      </span>
                    </div>
                    <div className="h-2 well-recessed overflow-hidden">
                      <div
                        className="h-full bg-black"
                        style={{ width: `${Math.min(100, aggregated.totalDeadAssets * 10 || 5)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* ══════════════ CENTER COLUMN (Span 6) ══════════════ */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Activity Heatmap (LTM) */}
              <div className="card-3d p-6 text-[#0a0a0a] space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider">
                    TRANSACTION HEATMAP (LTM)
                  </span>
                  <span className="btn-3d-neutral text-xs font-bold font-mono px-2 py-0.5 text-[#0a0a0a]">
                    {aggregated.totalTransactions} Total Txs
                  </span>
                </div>

                <ActivityHeatmap results={data.chains} />
              </div>

              {/* Protocol Identity Badges */}
              <div className="card-3d p-6 text-[#0a0a0a] space-y-3">
                <span className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider block">
                  PROTOCOL IDENTITY BADGES
                </span>

                {protocolBadges.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {protocolBadges.map((badge, i) => (
                      <span
                        key={i}
                        className={`text-xs font-mono font-bold px-3 py-1.5 tracking-wider ${
                          i === 0
                            ? 'btn-3d-orange text-white'
                            : 'btn-3d-neutral text-[#0a0a0a]'
                        }`}
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-mono font-bold text-[#6b7280] pt-1">
                    NO DIRECT PROTOCOL BADGES DETECTED ON SCANNED CHAINS
                  </p>
                )}
              </div>

              {/* Metric Double Card (Lifetime Gas & Capital Flow) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Left: Lifetime Gas */}
                <div className="card-3d p-6 text-[#0a0a0a] space-y-2">
                  <span className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider block">
                    LIFETIME GAS
                  </span>
                  <div className="text-3xl font-black text-[#ff5500] font-mono truncate">
                    {totalGasETH >= 10 ? totalGasETH.toFixed(2) : totalGasETH.toFixed(3)} ETH
                  </div>
                  <div className="text-xs font-bold text-[#4b5563] font-mono">
                    Total Spent (≈ {formattedGasUSD})
                  </div>
                </div>

                {/* Right: Capital Flow */}
                <div className="card-3d p-6 text-[#0a0a0a] space-y-2 overflow-hidden">
                  <span className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider block">
                    CAPITAL FLOW
                  </span>
                  <div className="text-3xl font-black text-[#0a0a0a] font-mono truncate" title={`$${Number(totalInflowUSD || 0).toLocaleString('en-US')}`}>
                    {formattedInflowUSD}
                  </div>
                  <div className="text-xs font-bold text-[#4b5563] font-mono">
                    Total Inflow Across Chains
                  </div>
                </div>

              </div>

              {/* 6-Dimension Quantitative Breakdown */}
              <BehavioralFingerprint results={data.chains} />

            </div>

            {/* ══════════════ RIGHT COLUMN (Span 3) ══════════════ */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* 3D Risk Grade Card */}
              <div className="card-3d p-6 text-[#0a0a0a] space-y-4">
                <span className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider block">
                  RISK GRADE
                </span>

                <div className="text-7xl font-black text-[#ff5500] font-mono leading-none">
                  {riskGrade}
                </div>

                <p className="text-xs font-bold text-[#374151] leading-relaxed text-pretty">
                  {riskGrade === 'A'
                    ? 'High probability of human-controlled entity. Low risk of malicious automation.'
                    : riskGrade === 'B'
                    ? 'Established on-chain activity with standard DeFi and approval permissions.'
                    : 'Elevated risk factors detected: Verify approvals and high failed transactions.'}
                </p>

                <div className="border-t border-[#c8c8c8] pt-3 space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-[#4b5563]">Aggression Level</span>
                    <span className="text-[#0a0a0a] font-mono">Medium</span>
                  </div>
                  <div className="h-2 well-recessed overflow-hidden">
                    <div
                      className="h-full bg-[#ff5500]"
                      style={{ width: '65%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Real Interactive Behavioral Radar */}
              <div className="card-3d p-6 text-[#0a0a0a] space-y-4 overflow-hidden">
                <span className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider block">
                  BEHAVIORAL RADAR
                </span>

                <BehavioralRadarChart radarData={radarData} />

                {/* Radar Insights */}
                <div className="border-t border-[#c8c8c8] pt-3 space-y-2 text-xs font-bold">
                  {radarData.slice(0, 3).map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-[#374151]">
                      <span className={`w-2 h-2 ${i === 0 ? 'bg-[#ff5500]' : i === 1 ? 'bg-black' : 'bg-[#6b7280]'}`} />
                      <span>{d.subject}: <span className="text-black font-mono font-black">{d.value}/100</span></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Score Factor Deductions */}
              <RiskScore results={data.chains} />

            </div>

          </div>
        </div>
      )}

      {/* ── Other Tab Views (3D Enclosures) ── */}
      {activeTab === 'flow' && (
        <div className="card-3d p-6">
          <CapitalFlowGraph results={data.chains} />
        </div>
      )}
      {activeTab === 'protocols' && (
        <div className="card-3d p-6">
          <InteractionsPanel results={data.chains} />
        </div>
      )}
      {activeTab === 'gas' && (
        <div className="card-3d p-6">
          <GasSummaryPanel results={data.chains} />
        </div>
      )}
      {activeTab === 'transfers' && (
        <div className="card-3d p-6">
          <TransferTable results={data.chains} />
        </div>
      )}
      {activeTab === 'approvals' && (
        <div className="card-3d p-6">
          <ApprovalAudit results={data.chains} />
        </div>
      )}
      {activeTab === 'graveyard' && (
        <div className="card-3d p-6">
          <Graveyard results={data.chains} />
        </div>
      )}
    </div>
  );
}
// Force recompile
