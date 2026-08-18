'use client';

import { Skull, Clock } from 'lucide-react';
import { ScanResult, DeadAsset } from '@/lib/types';
import { getChainConfig } from '@/lib/chains';

interface GraveyardProps {
  results: ScanResult[];
}

function formatUSD(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

export default function Graveyard({ results }: GraveyardProps) {
  const allDead = results.flatMap(r => r.graveyardSummary.deadAssets);
  const totalPeakLost = allDead.reduce((sum, a) => sum + (a.peakValueUSD ?? 0), 0);

  if (allDead.length === 0) {
    return (
      <div className="glass-card animate-fade-in-up" style={styles.emptyCard}>
        <div style={styles.emptyIcon}>🎉</div>
        <h3 style={styles.emptyTitle}>No Dead Assets Found</h3>
        <p style={styles.emptyText}>
          Your wallet doesn&apos;t appear to hold any worthless tokens. Nice portfolio hygiene!
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up" style={styles.container}>
      {/* Header */}
      <div className="glass-card" style={styles.header}>
        <Skull size={24} color="var(--accent-purple)" />
        <div>
          <div style={styles.headerTitle}>Token Graveyard</div>
          <div style={styles.headerSub}>
            {allDead.length} dead token{allDead.length !== 1 ? 's' : ''}
            {totalPeakLost > 0 && ` · ${formatUSD(totalPeakLost)} peak value lost`}
          </div>
        </div>
      </div>

      {/* Tombstones grid */}
      <div style={styles.grid}>
        {allDead.map((asset, i) => (
          <TombstoneCard key={`${asset.contractAddress}-${i}`} asset={asset} index={i} />
        ))}
      </div>
    </div>
  );
}

function TombstoneCard({ asset, index }: { asset: DeadAsset; index: number }) {
  const chain = getChainConfig(asset.chainId);

  return (
    <div
      className="glass-card"
      style={{
        ...styles.tombstone,
        animationDelay: `${index * 60}ms`,
      }}
    >
      <div style={styles.tombstoneHeader}>
        <span style={styles.tokenSymbol}>{asset.tokenSymbol}</span>
        <span style={{ ...styles.chainDot, background: chain.color }} title={chain.name} />
      </div>

      <div style={styles.tokenName}>{asset.tokenName}</div>

      <div style={styles.balanceRow}>
        <span style={styles.balanceLabel}>Balance</span>
        <span style={styles.balanceValue}>
          {asset.balance >= 1000
            ? asset.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })
            : asset.balance.toFixed(2)}
        </span>
      </div>

      {asset.peakValueUSD !== null && asset.peakValueUSD > 0 && (
        <div style={styles.peakRow}>
          <span style={styles.peakLabel}>Peak value</span>
          <span style={styles.peakValue}>{formatUSD(asset.peakValueUSD)}</span>
        </div>
      )}

      <div style={styles.dateRow}>
        <Clock size={12} color="var(--text-tertiary)" />
        <span style={styles.dateText}>Last active: {asset.lastActivityDate}</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' },
  header: {
    padding: 'var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
  },
  headerTitle: { fontSize: '1.1rem', fontWeight: 700 },
  headerSub: { fontSize: '0.85rem', color: 'var(--text-secondary)' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 'var(--space-md)',
  },
  tombstone: {
    padding: 'var(--space-lg)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-sm)',
    animation: 'fadeInUp 0.4s ease-out forwards',
    opacity: 0,
    background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(15,12,20,0.9) 100%)',
    borderTop: '2px solid var(--accent-purple)',
  },
  tombstoneHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tokenSymbol: {
    fontSize: '1.1rem',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
  },
  chainDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
  tokenName: {
    fontSize: '0.78rem',
    color: 'var(--text-tertiary)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  balanceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 'var(--space-sm)',
  },
  balanceLabel: { fontSize: '0.75rem', color: 'var(--text-tertiary)' },
  balanceValue: {
    fontSize: '0.9rem',
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-secondary)',
  },
  peakRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  peakLabel: { fontSize: '0.75rem', color: 'var(--text-tertiary)' },
  peakValue: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--accent-red)',
    fontFamily: 'var(--font-mono)',
    textDecoration: 'line-through',
  },
  dateRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginTop: 'var(--space-xs)',
  },
  dateText: { fontSize: '0.72rem', color: 'var(--text-tertiary)' },
  emptyCard: {
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-md)',
  },
  emptyIcon: { fontSize: '2.5rem' },
  emptyTitle: { fontSize: '1.2rem', fontWeight: 600 },
  emptyText: { fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: 400 },
};
