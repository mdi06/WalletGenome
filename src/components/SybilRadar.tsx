'use client';

import React from 'react';
import { SybilReport } from '@/lib/types';
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  report?: SybilReport;
}

export default function SybilRadar({ report }: Props) {
  if (!report) {
    return null;
  }

  const sybilProb = report.mediaScore?.sybilProbability ?? (report.isFlagged ? 85 : 5);
  const isClean = sybilProb <= 30 && !report.isFlagged;
  const isSuspicious = sybilProb > 30 && sybilProb <= 55 && !report.isFlagged;

  const statusColor = isClean
    ? 'var(--accent-emerald)'
    : isSuspicious
    ? 'var(--accent-amber)'
    : 'var(--accent-red)';

  const statusBg = isClean
    ? 'var(--accent-emerald-dim)'
    : isSuspicious
    ? 'var(--accent-amber-dim)'
    : 'var(--accent-red-dim)';

  const verdictLabel = isClean
    ? 'Organic Human'
    : isSuspicious
    ? 'Moderate Activity / Farmer'
    : 'High Sybil Risk';

  const explanation = report.mediaScore?.explanation || (
    isClean
      ? 'Multi-month activity, high protocol diversity, and capital depth confirm authentic human usage.'
      : isSuspicious
      ? 'Moderate on-chain footprint; exhibits repetitive interaction patterns or lower capital retention.'
      : 'Elevated automation risk: Short activity lifespan, scripted execution bursts, or flagged in public airdrop exclusions.'
  );

  return (
    <div className="glass-card animate-fade-in-up" style={styles.card}>
      {/* Left: Sybil Probability Hero & Explanation */}
      <div style={styles.heroSection}>
        <div style={{ ...styles.iconBox, background: statusBg, color: statusColor }}>
          {isClean ? <ShieldCheck size={26} /> : isSuspicious ? <AlertTriangle size={26} /> : <ShieldAlert size={26} />}
        </div>
        <div style={styles.heroText}>
          <span style={styles.heroLabel}>Sybil Probability</span>
          <div style={styles.probRow}>
            <span style={{ ...styles.probValue, color: statusColor }}>{sybilProb}%</span>
            <span
              style={{
                ...styles.verdictBadge,
                background: statusBg,
                color: statusColor,
                borderColor: statusColor,
              }}
            >
              {verdictLabel}
            </span>
          </div>
          <span style={styles.explanationText}>
            {explanation}
          </span>
        </div>
      </div>

      {/* Vertical Divider */}
      <div style={styles.divider} />

      {/* Right: Compact Database Checks */}
      <div style={styles.checksSection}>
        <div style={styles.checkGrid}>
          {report.matches.map(m => {
            const isFlagged = m.flagged;
            const badgeColor = isFlagged ? 'var(--accent-red)' : 'var(--accent-emerald)';

            return (
              <div key={m.databaseId} style={styles.checkPill}>
                {isFlagged ? (
                  <XCircle size={13} color="var(--accent-red)" />
                ) : (
                  <CheckCircle2 size={13} color="var(--accent-emerald)" />
                )}
                <span style={styles.checkName}>{formatDbName(m.databaseId)}</span>
                <span style={{ ...styles.statusTag, color: badgeColor }}>
                  {isFlagged ? 'FLAGGED' : 'CLEAN'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatDbName(id: string): string {
  switch (id) {
    case 'layerzero': return 'LayerZero Sybil';
    case 'hop': return 'Hop Protocol';
    case 'umbra': return 'Umbra Mixer';
    case 'ofac': return 'OFAC Sanctions';
    case 'trusta': return 'Trusta MEDIA';
    default: return id;
  }
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    padding: 'var(--space-md) var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--space-lg)',
    flexWrap: 'wrap' as const,
  },
  heroSection: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-md)',
    maxWidth: 480,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  heroText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  heroLabel: {
    fontSize: '0.72rem',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    fontWeight: 600,
  },
  probRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
  },
  probValue: {
    fontSize: '1.55rem',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
    lineHeight: 1,
  },
  verdictBadge: {
    fontSize: '0.72rem',
    fontWeight: 700,
    padding: '2px 10px',
    borderRadius: 'var(--radius-full)',
    borderWidth: 1,
    borderStyle: 'solid',
    letterSpacing: '0.02em',
  },
  explanationText: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.35,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 38,
    background: 'var(--border-primary)',
    display: 'none',
  },
  checksSection: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  checkGrid: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-xs)',
    flexWrap: 'wrap' as const,
    justifyContent: 'flex-end',
  },
  checkPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 10px',
    background: 'var(--bg-tertiary)',
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--border-primary)',
    fontSize: '0.75rem',
  },
  checkName: {
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  statusTag: {
    fontSize: '0.68rem',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.04em',
  },
};
