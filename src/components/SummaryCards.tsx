'use client';

import { Fuel, Shield, Skull, ShieldCheck, Layers } from 'lucide-react';
import { MultiChainScanResult } from '@/lib/types';

interface SummaryCardsProps {
  data: MultiChainScanResult;
}

function formatUSD(value: number): string {
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'var(--accent-emerald)';
    case 'B': return 'var(--accent-blue)';
    case 'C': return 'var(--accent-amber)';
    case 'D': return '#f97316';
    case 'F': return 'var(--accent-red)';
    default: return 'var(--accent-indigo)';
  }
}

function getGradeDimColor(grade: string): string {
  switch (grade) {
    case 'A': return 'var(--accent-emerald-dim)';
    case 'B': return 'var(--accent-blue-dim)';
    case 'C': return 'var(--accent-amber-dim)';
    case 'D': return 'rgba(249, 115, 22, 0.15)';
    case 'F': return 'var(--accent-red-dim)';
    default: return 'var(--accent-indigo-dim)';
  }
}

export default function SummaryCards({ data }: SummaryCardsProps) {
  const riskScore = data.aggregated.riskScore ?? 0;
  const riskGrade = data.aggregated.riskGrade ?? 'A';
  const totalProtocols = data.chains.reduce((sum, c) => sum + (c.interactionsSummary?.topProtocols?.length || 0), 0);

  const cards = [
    {
      icon: <ShieldCheck size={22} />,
      label: 'Risk Score',
      value: `${riskScore}/100`,
      sub: `Grade ${riskGrade}`,
      color: getGradeColor(riskGrade),
      bg: getGradeDimColor(riskGrade),
    },
    {
      icon: <Fuel size={22} />,
      label: 'Total Gas Spent',
      value: `${(data.aggregated.totalGasETH || 0).toFixed(4)} ETH`,
      sub: `≈ ${formatUSD(data.aggregated.totalGasUSD)} · ${data.aggregated.totalTransactions} txs`,
      color: 'var(--accent-blue)',
      bg: 'var(--accent-blue-dim)',
    },
    {
      icon: <Layers size={22} />,
      label: 'Protocols & DApps',
      value: String(totalProtocols),
      sub: `Across ${data.chains.length} scanned networks`,
      color: 'var(--accent-indigo)',
      bg: 'var(--accent-indigo-dim)',
    },
    {
      icon: <Shield size={22} />,
      label: 'Risky Approvals',
      value: String(data.aggregated.totalHighRiskApprovals),
      sub: `${data.chains.reduce((sum, c) => sum + (c.approvalSummary?.totalApprovals || 0), 0)} total active`,
      color: 'var(--accent-amber)',
      bg: 'var(--accent-amber-dim)',
    },
    {
      icon: <Skull size={22} />,
      label: 'Dead Assets',
      value: String(data.aggregated.totalDeadAssets),
      sub: `${formatUSD(data.chains.reduce((sum, c) => sum + (c.graveyardSummary?.totalPeakValueLost || 0), 0))} peak value lost`,
      color: 'var(--accent-purple)',
      bg: 'var(--accent-purple-dim)',
    },
  ];

  return (
    <div style={styles.grid}>
      {cards.map((card, i) => (
        <div
          key={i}
          className="glass-card animate-fade-in-up"
          style={{ ...styles.card, animationDelay: `${i * 80}ms` }}
        >
          <div style={{ ...styles.iconBox, background: card.bg, color: card.color }}>
            {card.icon}
          </div>
          <div style={styles.content}>
            <span style={styles.label}>{card.label}</span>
            <span style={{ ...styles.value, color: card.color }}>{card.value}</span>
            <span style={styles.sub}>{card.sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 'var(--space-md)',
    marginBottom: 'var(--space-xl)',
  },
  card: {
    padding: 'var(--space-lg)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-md)',
    opacity: 0,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  label: {
    fontSize: '0.8rem',
    color: 'var(--text-tertiary)',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  value: {
    fontSize: '1.35rem',
    fontWeight: 700,
    lineHeight: 1.2,
    fontFamily: 'var(--font-mono)',
  },
  sub: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
  },
};
