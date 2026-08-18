'use client';

import { useState } from 'react';
import { Fuel, ArrowUpDown, Shield, Skull, Fingerprint, Layers, Network } from 'lucide-react';
import { MultiChainScanResult } from '@/lib/types';
import SummaryCards from './SummaryCards';
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

interface DashboardProps {
  data: MultiChainScanResult;
}

type TabId = 'profile' | 'flow' | 'interactions' | 'gas' | 'transfers' | 'approvals' | 'graveyard';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

export default function Dashboard({ data }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  const approvalCount = data.chains.reduce((sum, c) => sum + c.approvalSummary.totalApprovals, 0);
  const deadCount = data.aggregated.totalDeadAssets;
  const protocolCount = data.chains.reduce((sum, c) => sum + (c.interactionsSummary?.topProtocols?.length || 0), 0);

  const tabs: Tab[] = [
    { id: 'profile', label: 'Profile & Risk', icon: <Fingerprint size={16} /> },
    { id: 'flow', label: 'Flow Graph', icon: <Network size={16} /> },
    { id: 'interactions', label: 'Protocols & Addresses', icon: <Layers size={16} />, count: protocolCount },
    { id: 'gas', label: 'Gas Fees', icon: <Fuel size={16} /> },
    { id: 'transfers', label: 'Transfers', icon: <ArrowUpDown size={16} /> },
    { id: 'approvals', label: 'Approvals', icon: <Shield size={16} />, count: approvalCount },
    { id: 'graveyard', label: 'Graveyard', icon: <Skull size={16} />, count: deadCount },
  ];

  return (
    <div style={styles.container} className="animate-fade-in-up">
      {/* Wallet info */}
      <div style={styles.walletInfo}>
        <div style={styles.walletAddress}>
          {data.identityReport?.primaryName ? (
            <span style={styles.primaryNameHighlight}>{data.identityReport.primaryName}</span>
          ) : null}
          <span className="mono" style={{ color: 'var(--text-secondary)' }}>
            {data.address.slice(0, 6)}...{data.address.slice(-4)}
          </span>
        </div>
        <span style={styles.chainList}>
          {data.chains.map(c => c.chainName).join(' · ')}
        </span>
      </div>

      {/* Summary cards */}
      <SummaryCards data={data} />

      {/* Tab navigation */}
      <div style={styles.tabBar}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tab,
                borderBottom: isActive ? '2px solid var(--accent-indigo)' : '2px solid transparent',
                color: isActive ? 'var(--accent-indigo)' : 'var(--text-secondary)',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span
                  style={{
                    ...styles.tabCount,
                    ...(isActive ? styles.tabCountActive : {}),
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div style={styles.tabContent}>
        {activeTab === 'profile' && (
          <div style={styles.profileContent}>
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

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-lg)',
    paddingTop: 'var(--space-xl)',
  },
  walletInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
    flexWrap: 'wrap' as const,
  },
  walletAddress: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: '0.95rem',
    fontWeight: 600,
    padding: '6px 16px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-full)',
  },
  primaryNameHighlight: {
    color: 'var(--accent-indigo)',
    fontWeight: 700,
  },
  chainList: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  tabBar: {
    display: 'flex',
    gap: 'var(--space-xs)',
    overflowX: 'auto',
    paddingBottom: 2,
    borderBottom: '1px solid var(--border-primary)',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 16px',
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    background: 'none',
    fontSize: '0.85rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    whiteSpace: 'nowrap' as const,
    fontFamily: 'var(--font-sans)',
  },
  tabCount: {
    padding: '1px 7px',
    borderRadius: 'var(--radius-full)',
    background: 'var(--bg-tertiary)',
    fontSize: '0.72rem',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
  },
  tabCountActive: {
    background: 'var(--accent-indigo-dim)',
    color: 'var(--accent-indigo)',
  },
  tabContent: {
    minHeight: 300,
  },
  profileContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-lg)',
  },
};
