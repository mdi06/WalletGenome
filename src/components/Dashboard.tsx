'use client';

import React, { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { MultiChainScanResult } from '@/lib/types';
import BehavioralFingerprint from './BehavioralFingerprint';
import RiskScore from './RiskScore';
import SybilRadar from './SybilRadar';
import IdentityCard from './IdentityCard';
import { ExternalLink } from 'lucide-react';
import { buildDashboardViewModel } from '@/lib/viewModels/dashboardViewModels';
import DashboardStatusPanel, { getAvailabilityMessage } from './status/DashboardStatusPanel';
import { getNextTabIndex } from '@/lib/accessibility/tabs';
import { formatNativeTokenValue } from '@/lib/utils/dashboardUtils';

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
  showStatusPanel?: boolean;
}

type TabId = 'dna' | 'flow' | 'protocols' | 'gas' | 'transfers' | 'approvals';

export default function Dashboard({ data, showStatusPanel = true }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('dna');
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});

  const { aggregated, metrics, sybilReport, identityReport } = data;
  const availabilityMessage = getAvailabilityMessage(data.status);
  const hasProviderWarnings = Boolean(availabilityMessage) || (data.chainWarnings?.length ?? 0) > 0;
  const hasDefinitiveMetrics = metrics.riskScore !== null
    && metrics.riskGrade !== null
    && metrics.sybilProbability !== null;
  if (data.chains.length === 0) {
    return showStatusPanel ? <DashboardStatusPanel data={data} /> : null;
  }

  const {
    approvalCount,
    chainActivity,
    chainActivityStatus,
    formattedGasUSD,
    persona,
    primaryName,
    protocolBadges,
    protocolCount,
    radarData,
    riskGrade,
    riskScore,
    sybilProbability: sybilProb,
    totalGasETH,
  } = buildDashboardViewModel(data);

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'dna', label: 'BEHAVIORAL DNA' },
    { id: 'flow', label: 'FLOW GRAPH' },
    { id: 'protocols', label: 'PROTOCOLS', count: protocolCount },
    { id: 'gas', label: 'GAS FEES' },
    { id: 'transfers', label: 'TRANSFERS' },
    { id: 'approvals', label: 'APPROVALS', count: approvalCount },
  ];

  const scrollDashboardTabIntoView = (tabId: TabId) => {
    const tab = tabRefs.current[tabId];
    if (!tab) return;

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    tab.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  };

  const handleDashboardTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const nextIndex = getNextTabIndex(tabs.findIndex(tab => tab.id === activeTab), tabs.length, event.key);
    if (nextIndex === null) return;
    event.preventDefault();
    const nextTab = tabs[nextIndex].id;
    setActiveTab(nextTab);
    document.getElementById(`dashboard-${nextTab}-tab`)?.focus();
    scrollDashboardTabIntoView(nextTab);
  };



  return (
    <div className="min-w-0 space-y-4 md:space-y-5 animate-fade-in-up">
      {showStatusPanel && hasProviderWarnings && <DashboardStatusPanel data={data} />}

      {/* ── Tab Navigation Bar & Export Action ── */}
      <div
        className="dashboard-tabs-scroll-region horizontal-scroll-region flex items-center justify-between gap-3 overflow-x-auto border-b border-[#c8c8c8] px-0 pb-1 md:px-1 md:pb-2.5 md:pt-2"
        tabIndex={0}
        aria-label="Dashboard sections; scroll horizontally for more tabs"
      >
        <div
          className="flex min-w-max items-center gap-1 md:gap-3"
          role="tablist"
          aria-label="Wallet dashboard sections"
        >
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`dashboard-${tab.id}-tab`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`dashboard-${tab.id}-panel`}
                tabIndex={isActive ? 0 : -1}
                data-active={isActive}
                ref={element => {
                  tabRefs.current[tab.id] = element;
                }}
                onKeyDown={handleDashboardTabKeyDown}
                onClick={() => {
                  setActiveTab(tab.id);
                  scrollDashboardTabIntoView(tab.id);
                }}
                className="dashboard-tab relative inline-flex min-h-11 shrink-0 items-center gap-2 px-3 py-2 text-xs font-black tracking-wider transition-colors whitespace-nowrap cursor-pointer md:min-h-9 md:px-3.5 md:py-1.5"
              >
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 badge-3d ${
                      isActive ? 'bg-[#ff5500] text-[#0a0a0a]' : 'bg-[#d0d0d0] text-[#333333]'
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
      {tabs.filter(tab => tab.id !== activeTab).map(tab => (
        <div
          key={`${tab.id}-placeholder`}
          id={`dashboard-${tab.id}-panel`}
          role="tabpanel"
          aria-labelledby={`dashboard-${tab.id}-tab`}
          hidden
        />
      ))}
      {activeTab === 'dna' && (
        <div
          id="dashboard-dna-panel"
          role="tabpanel"
          aria-labelledby="dashboard-dna-tab"
          className="space-y-6 md:space-y-5"
        >
          {/* Universal Resolved Identity Banner */}
          <IdentityCard identity={identityReport} address={data.address} />

          {/* Sybil Radar Bar */}
          <SybilRadar report={sybilReport} />

          {/* Main 3-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-5 items-start">
            
            {/* ══════════════ LEFT COLUMN (Span 3) ══════════════ */}
            <div className="lg:col-span-3 space-y-6 lg:space-y-5">
              
              {/* Persona Identity Card */}
              <section aria-labelledby="persona-identity-heading" className="card-3d p-6 lg:p-5 text-[#0a0a0a] flex flex-col items-center text-center space-y-4">
                <span id="persona-identity-heading" className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider">
                  PERSONA IDENTITY
                </span>

                <div className="w-20 h-20 btn-3d-orange flex items-center justify-center text-[#0a0a0a]">
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
              </section>

              {/* Security Ratings */}
              <section aria-labelledby="security-ratings-heading" className="card-3d p-6 lg:p-5 text-[#0a0a0a] space-y-4">
                <div className="flex justify-between items-center">
                  <span id="security-ratings-heading" className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider">
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
              </section>

            </div>

            {/* ══════════════ CENTER COLUMN (Span 6) ══════════════ */}
            <div className="lg:col-span-6 space-y-6 lg:space-y-5">
              
              {/* Activity Heatmap (LTM) */}
              <section aria-labelledby="transaction-heatmap-heading" className="card-3d p-6 lg:p-5 text-[#0a0a0a] space-y-3">
                <div className="flex justify-between items-center">
                  <span id="transaction-heatmap-heading" className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider">
                    TRANSACTION HEATMAP (LTM)
                  </span>
                  <span className="btn-3d-neutral text-xs font-bold font-mono px-2 py-0.5 text-[#0a0a0a]">
                    {aggregated.totalTransactions} Total Txs
                  </span>
                </div>

                <ActivityHeatmap results={data.chains} />
              </section>

              {/* Protocol Identity Badges */}
              <section aria-labelledby="protocol-badges-heading" className="card-3d p-6 lg:p-5 text-[#0a0a0a] space-y-3">
                <span id="protocol-badges-heading" className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider block">
                  PROTOCOL IDENTITY BADGES
                </span>

                {protocolBadges.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {protocolBadges.map((badge, i) => (
                      <span
                        key={i}
                        className={`text-xs font-mono font-bold px-3 py-1.5 tracking-wider ${
                          i === 0
                            ? 'btn-3d-orange text-[#0a0a0a]'
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
              </section>

              {/* Lifetime Gas & Chain Activity */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <section aria-labelledby="lifetime-gas-heading" className="card-3d p-6 lg:p-5 space-y-2 text-[#0a0a0a]">
                  <span id="lifetime-gas-heading" className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider block">
                    LIFETIME GAS
                  </span>
                  <div className="text-3xl font-black text-orange-ink font-mono truncate">
                    {formatNativeTokenValue(totalGasETH, 'ETH')}
                  </div>
                  <div className="text-xs font-bold text-[#4b5563] font-mono">
                    Total Spent (≈ {formattedGasUSD})
                  </div>
                </section>

                <section aria-labelledby="chain-activity-heading" className="card-3d p-6 lg:p-5 space-y-3 text-[#0a0a0a]">
                  <div className="flex items-center justify-between gap-3">
                    <span id="chain-activity-heading" className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider">
                      CHAIN ACTIVITY
                    </span>
                    <span className={`badge-3d text-[9px] font-mono font-bold px-2 py-0.5 border ${
                      chainActivityStatus === 'complete'
                        ? 'bg-[#059669]/10 text-[#047857] border-[#059669]/30'
                        : chainActivityStatus === 'partial'
                          ? 'bg-[#f59e0b]/10 text-[#a14f08] border-[#f59e0b]/30'
                          : 'bg-[#dc2626]/10 text-[#b91c1c] border-[#dc2626]/30'
                    }`}>
                      {chainActivityStatus === 'complete'
                        ? 'COMPLETE'
                        : chainActivityStatus === 'partial'
                          ? 'PARTIAL DATA'
                          : 'UNAVAILABLE'}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-[#6b7280] font-mono">
                    NORMAL WALLET TRANSACTIONS BY SELECTED CHAIN
                  </p>
                  <div className="space-y-2.5">
                    {chainActivity.map(chain => (
                      <div key={chain.chainId} className="space-y-1">
                        <div className="flex items-center justify-between gap-3 text-xs font-bold">
                          <span className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2 h-2 flex-shrink-0 border border-black/20"
                              style={{ backgroundColor: chain.color }}
                            />
                            <span className="truncate">{chain.chainName}</span>
                          </span>
                          <span className="font-mono text-[#0a0a0a] whitespace-nowrap">
                            {chain.status === 'unavailable'
                              ? 'UNAVAILABLE'
                              : chain.transactionCount === null
                                ? 'COUNT UNKNOWN'
                                : `${chain.transactionCount.toLocaleString()}${chain.status === 'partial' ? '+' : ''} TXS${chain.sharePercent !== null ? ` · ${chain.sharePercent}%` : ''}`}
                          </span>
                        </div>
                        {chain.sharePercent !== null ? (
                          <div className="h-1.5 well-recessed overflow-hidden">
                            <div
                              className="h-full"
                              style={{ width: `${chain.sharePercent}%`, backgroundColor: chain.color }}
                            />
                          </div>
                        ) : chain.status === 'partial' ? (
                          <div className="text-[9px] font-mono font-bold text-[#a14f08] uppercase">
                            At least this many records returned
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* 6-Dimension Quantitative Breakdown */}
              <BehavioralFingerprint results={data.chains} />

            </div>

            {/* ══════════════ RIGHT COLUMN (Span 3) ══════════════ */}
            <div className="lg:col-span-3 space-y-6 lg:space-y-5">
              
              {/* 3D Risk Grade Card */}
              <section aria-labelledby="risk-grade-heading" className="card-3d p-6 lg:p-5 text-[#0a0a0a] space-y-4">
                <span id="risk-grade-heading" className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider block">
                  RISK GRADE
                </span>

                <div className="text-7xl font-black text-orange-ink font-mono leading-none">
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
              </section>

              {/* Real Interactive Behavioral Radar */}
              <section aria-labelledby="behavioral-radar-heading" className="card-3d p-6 lg:p-5 text-[#0a0a0a] space-y-4 overflow-hidden">
                <span id="behavioral-radar-heading" className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider block">
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
              </section>

              {/* Risk Score Factor Deductions */}
              {hasDefinitiveMetrics && <RiskScore results={data.chains} />}

            </div>

          </div>
        </div>
      )}

      {/* ── Other Tab Views ── */}
      {activeTab === 'flow' && (
        <div id="dashboard-flow-panel" role="tabpanel" aria-labelledby="dashboard-flow-tab" className="border-t border-[#c8c8c8] pt-6 lg:pt-5">
          <CapitalFlowGraph results={data.chains} metrics={data.metrics} />
        </div>
      )}
      {activeTab === 'protocols' && (
        <div id="dashboard-protocols-panel" role="tabpanel" aria-labelledby="dashboard-protocols-tab" className="border-t border-[#c8c8c8] pt-6 lg:pt-5">
          <InteractionsPanel results={data.chains} />
        </div>
      )}
      {activeTab === 'gas' && (
        <div id="dashboard-gas-panel" role="tabpanel" aria-labelledby="dashboard-gas-tab" className="border-t border-[#c8c8c8] pt-6 lg:pt-5">
          <GasSummaryPanel results={data.chains} />
        </div>
      )}
      {activeTab === 'transfers' && (
        <div id="dashboard-transfers-panel" role="tabpanel" aria-labelledby="dashboard-transfers-tab" className="border-t border-[#c8c8c8] pt-6 lg:pt-5">
          <TransferTable results={data.chains} />
        </div>
      )}
      {activeTab === 'approvals' && (
        <div id="dashboard-approvals-panel" role="tabpanel" aria-labelledby="dashboard-approvals-tab" className="border-t border-[#c8c8c8] pt-6 lg:pt-5">
          <ApprovalAudit results={data.chains} />
        </div>
      )}
    </div>
  );
}
// Force recompile
