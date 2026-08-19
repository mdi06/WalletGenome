'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { MultiChainScanResult } from '@/lib/types';
import InteractionsPanel from './InteractionsPanel';
import GasSummaryPanel from './GasSummaryPanel';
import TransferTable from './TransferTable';
import ApprovalAudit from './ApprovalAudit';
import Graveyard from './Graveyard';
import BehavioralFingerprint from './BehavioralFingerprint';
import RiskScore from './RiskScore';
import SybilRadar from './SybilRadar';
import IdentityCard from './IdentityCard';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { ExternalLink, Download } from 'lucide-react';
import { formatCompactUSD, extractProtocolBadges, computeAggregatedRadarData } from '@/lib/utils/dashboardUtils';

export { formatCompactUSD, extractProtocolBadges };

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

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `walletgenome-forensics-${data.address.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
      <div className="flex items-center justify-between border-b border-[#cecece] px-1 overflow-x-auto gap-4">
        <div className="flex items-center gap-6 sm:gap-8">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3.5 text-xs sm:text-sm font-black tracking-wider transition-all whitespace-nowrap cursor-pointer relative flex items-center gap-1.5 ${
                  isActive
                    ? 'text-black font-black'
                    : 'text-[#666666] hover:text-black font-bold'
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 ${
                      isActive ? 'bg-black text-white' : 'bg-[#cecece] text-[#333333]'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#ff5500]" />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleExportJson}
          className="mb-2 bg-[#dedede] hover:bg-black hover:text-white border border-[#cecece] text-[#0a0a0a] text-[11px] font-bold px-2.5 py-1.5 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          title="Export Complete Forensic JSON Report"
        >
          <Download size={12} className="text-[#ff5500]" />
          <span className="hidden sm:inline">EXPORT REPORT (.JSON)</span>
          <span className="sm:hidden">EXPORT</span>
        </button>
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
              <div className="p-6 bg-[#dedede] border border-[#cecece] text-[#0a0a0a] flex flex-col items-center text-center space-y-4 shadow-sm">
                <span className="text-[11px] font-extrabold text-[#555555] uppercase tracking-wider">
                  PERSONA IDENTITY
                </span>

                <div className="w-20 h-20 bg-[#ff5500] flex items-center justify-center text-white shadow-md shadow-[#ff5500]/25">
                  <span className="text-3xl font-black">🧬</span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-black text-[#0a0a0a] tracking-tight truncate max-w-[200px]">
                    {primaryName}
                  </h3>
                  <div className="bg-black text-white text-[10px] font-extrabold tracking-widest uppercase px-3 py-1">
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
                        className="text-xs font-bold text-[#0a0a0a] hover:text-white bg-[#d4d4d4] hover:bg-black px-2.5 py-1 transition-colors flex items-center gap-1 border border-[#c4c4c4]"
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
                        className="text-xs font-bold text-[#0a0a0a] hover:text-white bg-[#d4d4d4] hover:bg-black px-3 py-1 transition-colors border border-[#c4c4c4]"
                      >
                        Debank
                      </a>
                      <a
                        href={`https://etherscan.io/address/${data.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-[#0a0a0a] hover:text-white bg-[#d4d4d4] hover:bg-black px-3 py-1 transition-colors border border-[#c4c4c4]"
                      >
                        Etherscan
                      </a>
                    </>
                  )}
                </div>

                {/* Dotted Divider & Bottom Stats */}
                <div className="w-full border-t border-dashed border-[#cecece] pt-4 grid grid-cols-2 gap-2 text-center">
                  <div>
                    <div className="text-lg font-black text-[#0a0a0a] font-mono">
                      {riskGrade === 'A' ? 'A+' : riskGrade}
                    </div>
                    <div className="text-[10px] font-bold text-[#555555] uppercase tracking-wider">
                      TRUST SCORE
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-[#0a0a0a] font-mono">
                      {sybilProb}%
                    </div>
                    <div className="text-[10px] font-bold text-[#555555] uppercase tracking-wider">
                      SYBIL PROB.
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Ratings Card */}
              <div className="p-6 bg-[#dedede] border border-[#cecece] text-[#0a0a0a] space-y-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-extrabold text-[#555555] uppercase tracking-wider">
                    SECURITY RATINGS
                  </span>
                  <span className="text-xs font-bold font-mono px-2 py-0.5 bg-[#d0d0d0] text-[#0a0a0a]">
                    Grade {riskGrade}
                  </span>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-[#0a0a0a] font-mono">
                    {Math.max(10, 100 - riskScore)}
                  </span>
                  <span className="text-sm font-bold text-[#555555] font-mono">/ 100</span>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[#333333]">Smart Contract Risk</span>
                      <span className="text-[#0a0a0a] font-mono">
                        {riskScore > 50 ? 'High' : riskScore > 25 ? 'Med' : 'Low'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#cecece] overflow-hidden">
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
                    <div className="h-1.5 bg-[#cecece] overflow-hidden">
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
                    <div className="h-1.5 bg-[#cecece] overflow-hidden">
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
              <div className="p-6 bg-[#dedede] border border-[#cecece] text-[#0a0a0a] space-y-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-extrabold text-[#555555] uppercase tracking-wider">
                    TRANSACTION HEATMAP (LTM)
                  </span>
                  <span className="text-xs font-bold font-mono text-[#555555]">
                    {aggregated.totalTransactions} Total Txs
                  </span>
                </div>

                <ActivityHeatmap results={data.chains} />
              </div>

                {/* Protocol Identity Badges */}
                <div className="p-6 bg-[#dedede] border border-[#cecece] text-[#0a0a0a] space-y-3 shadow-sm">
                  <span className="text-[11px] font-extrabold text-[#555555] uppercase tracking-wider block">
                    PROTOCOL IDENTITY BADGES
                  </span>

                  {protocolBadges.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {protocolBadges.map((badge, i) => (
                        <span
                          key={i}
                          className={`text-xs font-mono font-bold px-3 py-1 tracking-wider ${
                            i === 0
                              ? 'bg-[#ff5500] text-white'
                              : 'bg-[#cecece] text-[#0a0a0a]'
                          }`}
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs font-mono font-bold text-[#777777] pt-1">
                      NO DIRECT PROTOCOL BADGES DETECTED ON SCANNED CHAINS
                    </p>
                  )}
                </div>

              {/* Metric Double Card (Lifetime Gas & Capital Flow) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Left: Lifetime Gas */}
                <div className="p-6 bg-[#dedede] border border-[#cecece] text-[#0a0a0a] space-y-2 shadow-sm">
                  <span className="text-[11px] font-extrabold text-[#555555] uppercase tracking-wider block">
                    LIFETIME GAS
                  </span>
                  <div className="text-3xl font-black text-[#ff5500] font-mono truncate">
                    {totalGasETH >= 10 ? totalGasETH.toFixed(2) : totalGasETH.toFixed(3)} ETH
                  </div>
                  <div className="text-xs font-bold text-[#555555] font-mono">
                    Total Spent (≈ {formatCompactUSD(totalGasUSD)})
                  </div>
                </div>

                {/* Right: Capital Flow */}
                <div className="p-6 bg-[#dedede] border border-[#cecece] text-[#0a0a0a] space-y-2 shadow-sm overflow-hidden">
                  <span className="text-[11px] font-extrabold text-[#555555] uppercase tracking-wider block">
                    CAPITAL FLOW
                  </span>
                  <div className="text-3xl font-black text-[#0a0a0a] font-mono truncate" title={`$${totalInflowUSD.toLocaleString('en-US')}`}>
                    {formatCompactUSD(totalInflowUSD)}
                  </div>
                  <div className="text-xs font-bold text-[#555555] font-mono">
                    Total Inflow Across Chains
                  </div>
                </div>

              </div>

              {/* 6-Dimension Quantitative Breakdown */}
              <BehavioralFingerprint results={data.chains} />

            </div>

            {/* ══════════════ RIGHT COLUMN (Span 3) ══════════════ */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Toned Gray Risk Grade Card */}
              <div className="p-6 bg-[#dedede] border border-[#cecece] text-[#0a0a0a] space-y-4 shadow-sm">
                <span className="text-[11px] font-extrabold text-[#555555] uppercase tracking-wider block">
                  RISK GRADE
                </span>

                <div className="text-7xl font-black text-[#ff5500] font-mono leading-none">
                  {riskGrade}
                </div>

                <p className="text-xs font-bold text-[#333333] leading-relaxed">
                  {riskGrade === 'A'
                    ? 'High probability of human-controlled entity. Low risk of malicious automation.'
                    : riskGrade === 'B'
                    ? 'Established on-chain activity with standard DeFi and approval permissions.'
                    : 'Elevated risk factors detected: Verify approvals and high failed transactions.'}
                </p>

                <div className="border-t border-dashed border-[#cecece] pt-3 space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-[#555555]">Aggression Level</span>
                    <span className="text-[#0a0a0a] font-mono">Medium</span>
                  </div>
                  <div className="h-1.5 bg-[#cecece] overflow-hidden">
                    <div
                      className="h-full bg-[#ff5500]"
                      style={{ width: '65%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Real Interactive Behavioral Radar */}
              <div className="p-6 bg-[#dedede] border border-[#cecece] text-[#0a0a0a] space-y-4 shadow-sm overflow-hidden">
                <span className="text-[11px] font-extrabold text-[#555555] uppercase tracking-wider block">
                  BEHAVIORAL RADAR
                </span>

                <div className="w-full h-52 flex items-center justify-center -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="70%" margin={{ top: 10, right: 25, bottom: 10, left: 25 }}>
                      <PolarGrid stroke="#cecece" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#555555', fontSize: 8.5, fontWeight: 700 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar
                        name="Wallet Score"
                        dataKey="value"
                        stroke="#ff5500"
                        strokeWidth={2}
                        fill="#ff5500"
                        fillOpacity={0.25}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Radar Insights */}
                <div className="border-t border-[#cecece] pt-3 space-y-2 text-xs font-bold">
                  {radarData.slice(0, 3).map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-[#333333]">
                      <span className={`w-2 h-2 ${i === 0 ? 'bg-[#ff5500]' : i === 1 ? 'bg-black' : 'bg-[#777777]'}`} />
                      <span>{d.subject}: <span className="text-black">{d.value}/100</span></span>
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

      {/* ── Other Tab Views ── */}
      {activeTab === 'flow' && (
        <div className="p-6 bg-[#dedede] border border-[#cecece]">
          <CapitalFlowGraph results={data.chains} />
        </div>
      )}
      {activeTab === 'protocols' && (
        <div className="p-6 bg-[#dedede] border border-[#cecece]">
          <InteractionsPanel results={data.chains} />
        </div>
      )}
      {activeTab === 'gas' && (
        <div className="p-6 bg-[#dedede] border border-[#cecece]">
          <GasSummaryPanel results={data.chains} />
        </div>
      )}
      {activeTab === 'transfers' && (
        <div className="p-6 bg-[#dedede] border border-[#cecece]">
          <TransferTable results={data.chains} />
        </div>
      )}
      {activeTab === 'approvals' && (
        <div className="p-6 bg-[#dedede] border border-[#cecece]">
          <ApprovalAudit results={data.chains} />
        </div>
      )}
      {activeTab === 'graveyard' && (
        <div className="p-6 bg-[#dedede] border border-[#cecece]">
          <Graveyard results={data.chains} />
        </div>
      )}
    </div>
  );
}
