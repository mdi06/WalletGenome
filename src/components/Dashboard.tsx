'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { MultiChainScanResult } from '@/lib/types';
import BehavioralFingerprint from './BehavioralFingerprint';
import RiskScore from './RiskScore';
import SybilRadar from './SybilRadar';
import IdentityCard from './IdentityCard';
import { ExternalLink } from 'lucide-react';
import { buildDashboardViewModel } from '@/lib/viewModels/dashboardViewModels';
import DashboardStatusPanel, { getAvailabilityMessage } from './status/DashboardStatusPanel';

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

interface DashboardProps {
  data: MultiChainScanResult;
}

type TabId = 'dna' | 'flow' | 'protocols' | 'gas' | 'transfers' | 'approvals';

export default function Dashboard({ data }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('dna');

  const { aggregated, metrics, sybilReport, identityReport } = data;
  const availabilityMessage = getAvailabilityMessage(data.status);
  const hasDefinitiveMetrics = metrics.riskScore !== null
    && metrics.riskGrade !== null
    && metrics.sybilProbability !== null;
  if (data.chains.length === 0) {
    return <DashboardStatusPanel data={data} />;
  }

  const {
    approvalCount,
    capitalFlowCoverage,
    formattedGasUSD,
    formattedInflowUSD,
    persona,
    primaryName,
    protocolBadges,
    protocolCount,
    radarData,
    riskGrade,
    riskScore,
    sybilProbability: sybilProb,
    totalGasETH,
    totalInflowUSD,
  } = buildDashboardViewModel(data);

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'dna', label: 'BEHAVIORAL DNA' },
    { id: 'flow', label: 'FLOW GRAPH' },
    { id: 'protocols', label: 'PROTOCOLS', count: protocolCount },
    { id: 'gas', label: 'GAS FEES' },
    { id: 'transfers', label: 'TRANSFERS' },
    { id: 'approvals', label: 'APPROVALS', count: approvalCount },
  ];



  return (
    <div className="space-y-6 animate-fade-in-up">
      {availabilityMessage && <DashboardStatusPanel data={data} />}

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
      <div className="flex items-center justify-between border-b border-[#c8c8c8] pt-2 pb-2.5 px-1 overflow-x-auto gap-3">
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
                      {riskGrade === null ? 'N/A' : riskGrade === 'A' ? 'A+' : riskGrade}
                    </div>
                    <div className="text-[10px] font-bold text-[#4b5563] uppercase tracking-wider">
                      WORST-CHAIN RISK GRADE
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-[#0a0a0a] font-mono">
                      {sybilProb === null
                        ? metrics.blacklistStatus === 'unavailable'
                          ? 'N/A'
                          : metrics.blacklistStatus.toUpperCase()
                        : `${sybilProb}%`}
                    </div>
                    <div className="text-[10px] font-bold text-[#4b5563] uppercase tracking-wider">
                      {sybilProb === null ? 'BLACKLIST STATUS' : 'SYBIL PROB.'}
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
                    Grade {riskGrade ?? 'N/A'}
                  </span>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-[#0a0a0a] font-mono">
                    {riskScore ?? 'N/A'}
                  </span>
                  <span className="text-sm font-bold text-[#4b5563] font-mono">/ 100 RISK</span>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[#333333]">Worst-chain risk</span>
                      <span className="text-[#0a0a0a] font-mono">
                        {riskScore === null ? 'Withheld' : riskScore > 50 ? 'High' : riskScore > 25 ? 'Med' : 'Low'}
                      </span>
                    </div>
                    <div className="h-2 well-recessed overflow-hidden">
                      <div className="h-full bg-black" style={{ width: `${Math.min(100, riskScore ?? 0)}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[#333333]">High-risk approvals</span>
                      <span className="text-[#0a0a0a] font-mono">
                        {aggregated.totalHighRiskApprovals} count
                      </span>
                    </div>
                    <div className="h-2 well-recessed overflow-hidden">
                      <div
                        className="h-full bg-[#ff5500]"
                        style={{ width: `${Math.min(100, aggregated.totalHighRiskApprovals * 25 || 10)}%` }}
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
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider block">
                      VERIFIED CAPITAL FLOW
                    </span>
                    <span className={`text-[9px] font-black font-mono uppercase px-1.5 py-0.5 border ${
                      capitalFlowCoverage.status === 'complete'
                        ? 'text-[#047857] border-[#059669]/40 bg-[#059669]/10'
                        : capitalFlowCoverage.status === 'partial'
                          ? 'text-[#b45309] border-[#f59e0b]/50 bg-[#f59e0b]/10'
                          : 'text-[#b91c1c] border-[#dc2626]/40 bg-[#dc2626]/10'
                    }`}>
                      {capitalFlowCoverage.status}
                    </span>
                  </div>
                  <div className="text-3xl font-black text-[#0a0a0a] font-mono truncate" title={totalInflowUSD === null ? 'Unavailable because wallet history is incomplete or no eligible transfer leg has a historical price' : `$${totalInflowUSD.toLocaleString('en-US')} verified historical inflow`}>
                    {formattedInflowUSD}
                  </div>
                  <div className="text-xs font-bold text-[#4b5563] font-mono">
                    Verified Historical Inflow
                  </div>
                  {capitalFlowCoverage.status === 'partial' && (
                    <div className="text-[10px] font-bold text-[#92400e] leading-snug">
                      {capitalFlowCoverage.coveragePercent}% coverage · {capitalFlowCoverage.verifiedLegs}/{capitalFlowCoverage.totalLegs} transfer values included.{' '}
                      {capitalFlowCoverage.excludedSpotEstimateLegs} current-price estimates and {capitalFlowCoverage.unpricedLegs} unpriced values excluded.
                    </div>
                  )}
                  {capitalFlowCoverage.status === 'complete' && (
                    <div className="text-[10px] font-bold text-[#047857]">
                      Complete historical coverage · {capitalFlowCoverage.verifiedLegs} transfer values included.
                    </div>
                  )}
                  {capitalFlowCoverage.status === 'unavailable' && (
                    <div className="text-[10px] font-bold text-[#b91c1c] leading-snug">
                      Requires complete wallet history and at least one historically priced transfer value.
                    </div>
                  )}
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
                  {riskGrade ?? 'N/A'}
                </div>

                <p className="text-xs font-bold text-[#374151] leading-relaxed text-pretty">
                  {riskGrade === null
                    ? 'Withheld until every selected history dataset is complete. Available records remain visible in the other tabs.'
                    : riskGrade === 'A'
                    ? 'No scored security factor exceeded the documented low-risk thresholds.'
                    : riskGrade === 'B'
                    ? 'Minor scored security warnings were detected on at least one selected chain.'
                    : 'Elevated scored security factors were detected on at least one selected chain.'}
                </p>

                <div className="border-t border-[#c8c8c8] pt-3 space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-[#4b5563]">Worst-chain risk score</span>
                    <span className="text-[#0a0a0a] font-mono">{riskScore === null ? 'Withheld' : `${riskScore} / 100`}</span>
                  </div>
                  <div className="h-2 well-recessed overflow-hidden">
                    <div
                      className="h-full bg-[#ff5500]"
                      style={{ width: `${riskScore ?? 0}%` }}
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
              {hasDefinitiveMetrics && <RiskScore results={data.chains} />}

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
    </div>
  );
}
// Force recompile
