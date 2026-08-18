'use client';

import { useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, ExternalLink } from 'lucide-react';
import { ScanResult } from '@/lib/types';
import { getExplorerTxUrl, getChainConfig } from '@/lib/chains';
import { getAddressLabel } from '@/lib/labels';

interface TransferTableProps {
  results: ScanResult[];
}

function formatUSD(v: number): string {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(2)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

function truncAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

type Tab = 'outbound' | 'inbound';

export default function TransferTable({ results }: TransferTableProps) {
  const [tab, setTab] = useState<Tab>('outbound');

  // Merge transfers across chains
  const allOutbound = results.flatMap(r => [
    ...r.transferSummary.topOutbound.map(t => ({
      date: t.date,
      token: t.tokenSymbol,
      amount: t.valueFormatted,
      valueUSD: t.valueUSD ?? 0,
      counterparty: t.to,
      label: t.toLabel,
      hash: t.hash,
      chainId: t.chainId,
    })),
    ...r.transferSummary.topNativeOutbound.map(t => ({
      date: t.date,
      token: 'ETH',
      amount: t.valueFormatted,
      valueUSD: t.valueUSD ?? 0,
      counterparty: t.to,
      label: t.toLabel,
      hash: t.hash,
      chainId: t.chainId,
    })),
  ]).sort((a, b) => b.valueUSD - a.valueUSD).slice(0, 25);

  const allInbound = results.flatMap(r => [
    ...r.transferSummary.topInbound.map(t => ({
      date: t.date,
      token: t.tokenSymbol,
      amount: t.valueFormatted,
      valueUSD: t.valueUSD ?? 0,
      counterparty: t.from,
      label: t.fromLabel,
      hash: t.hash,
      chainId: t.chainId,
    })),
    ...r.transferSummary.topNativeInbound.map(t => ({
      date: t.date,
      token: 'ETH',
      amount: t.valueFormatted,
      valueUSD: t.valueUSD ?? 0,
      counterparty: t.from,
      label: t.fromLabel,
      hash: t.hash,
      chainId: t.chainId,
    })),
  ]).sort((a, b) => b.valueUSD - a.valueUSD).slice(0, 25);

  const data = tab === 'outbound' ? allOutbound : allInbound;

  return (
    <div className="animate-fade-in-up">
      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => setTab('outbound')}
          style={{
            ...styles.tab,
            background: tab === 'outbound' ? 'var(--accent-indigo-dim)' : 'var(--bg-glass)',
            borderColor: tab === 'outbound' ? 'var(--accent-indigo)' : 'var(--border-primary)',
            color: tab === 'outbound' ? 'var(--accent-indigo)' : 'var(--text-secondary)',
          }}
        >
          <ArrowUpRight size={16} /> Sent
        </button>
        <button
          onClick={() => setTab('inbound')}
          style={{
            ...styles.tab,
            background: tab === 'inbound' ? 'var(--accent-indigo-dim)' : 'var(--bg-glass)',
            borderColor: tab === 'inbound' ? 'var(--accent-indigo)' : 'var(--border-primary)',
            color: tab === 'inbound' ? 'var(--accent-indigo)' : 'var(--text-secondary)',
          }}
        >
          <ArrowDownLeft size={16} /> Received
        </button>
      </div>

      {/* Table */}
      <div className="glass-card table-container">
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Token</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>USD Value</th>
              <th style={styles.th}>{tab === 'outbound' ? 'To' : 'From'}</th>
              <th style={styles.th}>Chain</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={7} style={styles.noData}>No transfers found</td>
              </tr>
            ) : (
              data.map((row, i) => {
                const label = row.label || getAddressLabel(row.counterparty);
                const chain = getChainConfig(row.chainId);
                return (
                  <tr key={`${row.hash}-${i}`} style={styles.tr}>
                    <td style={styles.td}>{row.date}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{row.token}</td>
                    <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {row.amount >= 1000 ? row.amount.toLocaleString(undefined, { maximumFractionDigits: 2 }) : row.amount.toFixed(4)}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {row.valueUSD > 0 ? formatUSD(row.valueUSD) : '—'}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.address}>
                        {label ? (
                          <span style={styles.labelBadge}>{label}</span>
                        ) : (
                          <span className="mono truncate-address">{truncAddr(row.counterparty)}</span>
                        )}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.chainBadge, background: `${chain.color}20`, color: chain.color }}>
                        {chain.shortName}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <a
                        href={getExplorerTxUrl(row.chainId, row.hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.link}
                      >
                        <ExternalLink size={14} />
                      </a>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  tabs: {
    display: 'flex',
    gap: 'var(--space-sm)',
    marginBottom: 'var(--space-md)',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 'var(--radius-full)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--border-primary)',
    background: 'var(--bg-glass)',
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.85rem',
  },
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
    transition: 'background var(--transition-fast)',
  },
  td: {
    padding: '12px 16px',
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap' as const,
  },
  noData: {
    padding: 'var(--space-xl)',
    textAlign: 'center',
    color: 'var(--text-tertiary)',
  },
  address: {
    display: 'flex',
    alignItems: 'center',
  },
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
  link: {
    color: 'var(--text-tertiary)',
    display: 'flex',
    alignItems: 'center',
    transition: 'color var(--transition-fast)',
  },
};
