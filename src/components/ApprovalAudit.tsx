'use client';

import { Shield, ShieldAlert, ShieldCheck, ExternalLink, DollarSign } from 'lucide-react';
import { ScanResult, TokenApproval } from '@/lib/types';
import { getExplorerAddressUrl, getChainConfig } from '@/lib/chains';

interface ApprovalAuditProps {
  results: ScanResult[];
}

function truncAddr(addr: string): string {
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

function formatUSD(val: number): string {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(2)}K`;
  return `$${val.toFixed(2)}`;
}

export default function ApprovalAudit({ results }: ApprovalAuditProps) {
  const allApprovals = results.flatMap(r => r.approvalSummary.activeApprovals);
  const highRisk = allApprovals.filter(a => a.riskLevel === 'high');
  const totalExposure = results.reduce(
    (sum, r) => sum + (r.approvalSummary.totalExposureUSD || 0),
    0
  );

  if (allApprovals.length === 0) {
    return (
      <div className="glass-card animate-fade-in-up" style={styles.emptyCard}>
        <ShieldCheck size={40} color="var(--accent-emerald)" />
        <h3 style={styles.emptyTitle}>No Active Approvals</h3>
        <p style={styles.emptyText}>
          No token approvals detected for this wallet. Either no approvals were made or they&apos;ve all been revoked.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up" style={styles.container}>
      {/* Stats */}
      <div style={styles.statsRow}>
        <div className="glass-card" style={styles.stat}>
          <Shield size={18} color="var(--text-secondary)" />
          <span style={styles.statValue}>{allApprovals.length}</span>
          <span style={styles.statLabel}>Active approvals</span>
        </div>
        {highRisk.length > 0 && (
          <div className="glass-card" style={{ ...styles.stat, borderColor: 'rgba(248,113,113,0.3)' }}>
            <ShieldAlert size={18} color="var(--accent-red)" />
            <span style={{ ...styles.statValue, color: 'var(--accent-red)' }}>{highRisk.length}</span>
            <span style={styles.statLabel}>High risk</span>
          </div>
        )}
        <div className="glass-card" style={styles.stat}>
          <span style={{ ...styles.statValue, color: 'var(--accent-amber)' }}>
            {allApprovals.filter(a => a.isUnlimited).length}
          </span>
          <span style={styles.statLabel}>Unlimited</span>
        </div>
        {totalExposure > 0 && (
          <div className="glass-card" style={{ ...styles.stat, borderColor: 'rgba(251,191,36,0.3)' }}>
            <DollarSign size={18} color="var(--accent-amber)" />
            <span style={{ ...styles.statValue, color: 'var(--accent-amber)' }}>{formatUSD(totalExposure)}</span>
            <span style={styles.statLabel}>Est. Exposed Value</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass-card table-container">
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Risk</th>
              <th style={styles.th}>Token</th>
              <th style={styles.th}>Spender</th>
              <th style={styles.th}>Allowance</th>
              <th style={styles.th}>Est. Exposure</th>
              <th style={styles.th}>Chain</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {allApprovals.map((approval, i) => (
              <ApprovalRow key={`${approval.hash}-${i}`} approval={approval} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ApprovalRow({ approval }: { approval: TokenApproval }) {
  const chain = getChainConfig(approval.chainId);

  return (
    <tr style={styles.tr}>
      <td style={styles.td}>
        <span className={`badge badge-${approval.riskLevel}`}>
          {approval.riskLevel === 'high' ? '🔴' : approval.riskLevel === 'medium' ? '🟡' : '🟢'}
          {' '}{approval.riskLevel}
        </span>
      </td>
      <td style={{ ...styles.td, fontWeight: 600 }}>{approval.tokenSymbol}</td>
      <td style={styles.td}>
        {approval.spenderLabel ? (
          <span style={styles.labelBadge}>{approval.spenderLabel}</span>
        ) : (
          <span className="mono truncate-address">{truncAddr(approval.spender)}</span>
        )}
      </td>
      <td style={styles.td}>
        {approval.isUnlimited ? (
          <span style={{ color: 'var(--accent-amber)', fontWeight: 600, fontSize: '0.8rem' }}>∞ Unlimited</span>
        ) : (
          <span style={{ fontSize: '0.8rem' }}>{approval.allowance}</span>
        )}
      </td>
      <td style={{ ...styles.td, fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
        {approval.estimatedExposureUSD && approval.estimatedExposureUSD > 0
          ? formatUSD(approval.estimatedExposureUSD)
          : '—'}
      </td>
      <td style={styles.td}>
        <span style={{ ...styles.chainBadge, background: `${chain.color}20`, color: chain.color }}>
          {chain.shortName}
        </span>
      </td>
      <td style={{ ...styles.td, fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{approval.date}</td>
      <td style={styles.td}>
        <a
          href={getExplorerAddressUrl(approval.chainId, approval.spender)}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.link}
          title="View spender on explorer"
        >
          <ExternalLink size={14} />
        </a>
      </td>
    </tr>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' },
  statsRow: {
    display: 'flex',
    gap: 'var(--space-md)',
    flexWrap: 'wrap' as const,
  },
  stat: {
    padding: 'var(--space-md) var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--border-primary)',
  },
  statValue: { fontSize: '1.3rem', fontWeight: 700 },
  statLabel: { fontSize: '0.8rem', color: 'var(--text-secondary)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: 600,
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: 'var(--border-primary)',
  },
  tr: {
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: 'var(--border-primary)',
  },
  td: { padding: '12px 16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' as const },
  labelBadge: {
    padding: '2px 8px',
    background: 'var(--accent-indigo-dim)',
    color: 'var(--accent-indigo)',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  chainBadge: {
    padding: '2px 8px',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.72rem',
    fontWeight: 600,
  },
  link: { color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center' },
  emptyCard: {
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-md)',
  },
  emptyTitle: { fontSize: '1.2rem', fontWeight: 600 },
  emptyText: { fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: 400 },
};
