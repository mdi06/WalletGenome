'use client';

import React, { useState } from 'react';
import { Fuel, ArrowUpDown, Shield, Skull, Fingerprint, Layers, Network, Terminal } from 'lucide-react';
import { MultiChainScanResult } from '@/lib/types';
import GasSummaryPanel from './GasSummaryPanel';
import TransferTable from './TransferTable';
import ApprovalAudit from './ApprovalAudit';
import Graveyard from './Graveyard';
import BehavioralFingerprint from './BehavioralFingerprint';
import RiskScore from './RiskScore';
import ActivityHeatmap from './ActivityHeatmap';
import InteractionsPanel from './InteractionsPanel';
import CapitalFlowGraph from './CapitalFlowGraph';
import SybilRadar from './SybilRadar';
import IdentityCard from './IdentityCard';
import TelemetryHudBanner from './TelemetryHudBanner';

interface DashboardProps {
  data: MultiChainScanResult;
}

type TabId = 'telemetry' | 'profile' | 'flow' | 'interactions' | 'gas' | 'transfers' | 'approvals' | 'graveyard';

interface Tab {
  id: TabId;
  label: string;
  code: string;
  count?: number;
}

export default function Dashboard({ data }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('telemetry');

  const approvalCount = data.chains.reduce((sum, c) => sum + c.approvalSummary.totalApprovals, 0);
  const deadCount = data.aggregated.totalDeadAssets;
  const protocolCount = data.chains.reduce((sum, c) => sum + (c.interactionsSummary?.topProtocols?.length || 0), 0);

  const tabs: Tab[] = [
    { id: 'telemetry', code: '00', label: 'TELEMETRY_HUD' },
    { id: 'profile', code: '01', label: 'PROFILE & RISK' },
    { id: 'flow', code: '02', label: 'CAPITAL_FLOW_GRAPH' },
    { id: 'interactions', code: '03', label: 'PROTOCOLS & DAPPS', count: protocolCount },
    { id: 'gas', code: '04', label: 'GAS_ACCOUNTING' },
    { id: 'transfers', code: '05', label: 'TRANSFERS_LOG' },
    { id: 'approvals', code: '06', label: 'APPROVAL_AUDIT', count: approvalCount },
    { id: 'graveyard', code: '07', label: 'GRAVEYARD', count: deadCount },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ── Always Display The Telemetry HUD Banner (From Screenshot) ── */}
      <TelemetryHudBanner data={data} />

      {/* ── Tactical Telemetry Tab Navigation Bar ── */}
      <div className="telemetry-chassis p-2 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded text-xs font-mono font-bold tracking-wider transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#ff8c00] text-black shadow-[0_0_12px_rgba(255,140,0,0.35)]'
                    : 'bg-[#11131b] hover:bg-[#1c202d] text-gray-400 border border-[#262a39]'
                }`}
              >
                <span className={isActive ? 'text-black/70' : 'text-[#d8a758]'}>[{tab.code}]</span>
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isActive ? 'bg-black/20 text-black' : 'bg-[#1a1d29] text-gray-400'
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

      {/* ── Tab Content Views ── */}
      <div className="min-h-[400px]">
        {activeTab === 'telemetry' && (
          <div className="space-y-6">
            <IdentityCard identity={data.identityReport} address={data.address} />
            <SybilRadar report={data.sybilReport} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BehavioralFingerprint results={data.chains} />
              <RiskScore results={data.chains} />
            </div>
            <ActivityHeatmap results={data.chains} />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6">
            <IdentityCard identity={data.identityReport} address={data.address} />
            <SybilRadar report={data.sybilReport} />
            <BehavioralFingerprint results={data.chains} />
            <RiskScore results={data.chains} />
            <ActivityHeatmap results={data.chains} />
          </div>
        )}

        {activeTab === 'flow' && <CapitalFlowGraph results={data.chains} />}
        {activeTab === 'interactions' && <InteractionsPanel results={data.chains} />}
        {activeTab === 'gas' && <GasSummaryPanel results={data.chains} />}
        {activeTab === 'transfers' && <TransferTable results={data.chains} />}
        {activeTab === 'approvals' && <ApprovalAudit results={data.chains} />}
        {activeTab === 'graveyard' && <Graveyard results={data.chains} />}
      </div>
    </div>
  );
}
