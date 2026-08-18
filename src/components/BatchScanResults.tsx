'use client';

import { ExternalLink, AlertTriangle, Search, CheckCircle } from 'lucide-react';

interface BatchLossHit {
  wallet: string;
  walletLabel: string | null;
  chain: string;
  chainId: number;
  hash: string;
  to: string;
  tokenSymbol: string;
  amount: number;
  valueUSD: number;
  date: string;
  explorerUrl: string;
}

interface BatchScanResult {
  totalWalletsScanned: number;
  totalChainsPerWallet: number;
  totalPairsScanned: number;
  hitsFound: number;
  hits: BatchLossHit[];
}

interface Props {
  result: BatchScanResult;
}

const CHAIN_COLORS: Record<number, string> = {
  1: '#627EEA',
  8453: '#0052FF',
  42161: '#28A0F0',
  56: '#F0B90B',
  10: '#FF0420',
};

export default function BatchScanResults({ result }: Props) {
  if (result.hitsFound === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.successCard}>
          <CheckCircle size={48} color="#22c55e" />
          <h2 style={styles.successTitle}>No Suspicious Transfers Found</h2>
          <p style={styles.successText}>
            Scanned {result.totalWalletsScanned} wallets across {result.totalChainsPerWallet} chains
            ({result.totalPairsScanned.toLocaleString()} wallet-chain pairs).
            No outbound stablecoin transfers to unknown addresses were detected above the threshold.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.summaryCard}>
        <AlertTriangle size={24} color="#f97316" />
        <div>
          <h2 style={styles.summaryTitle}>
            {result.hitsFound} Suspicious Transfer{result.hitsFound > 1 ? 's' : ''} Found
          </h2>
          <p style={styles.summaryText}>
            Scanned {result.totalWalletsScanned} wallets × {result.totalChainsPerWallet} chains.
            The following outbound stablecoin transfers went to addresses you never interacted with again.
          </p>
        </div>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>From Wallet</th>
              <th style={styles.th}>Chain</th>
              <th style={styles.th}>Amount</th>
              <th style={styles.th}>To Address</th>
              <th style={styles.th}>Tx</th>
            </tr>
          </thead>
          <tbody>
            {result.hits.map((hit, i) => (
              <tr key={`${hit.hash}-${i}`} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                <td style={styles.td}>{hit.date}</td>
                <td style={styles.td}>
                  <span style={styles.walletAddr}>
                    {hit.walletLabel ? (
                      <span title={hit.wallet}>{hit.walletLabel}</span>
                    ) : (
                      `${hit.wallet.slice(0, 8)}...${hit.wallet.slice(-6)}`
                    )}
                  </span>
                </td>
                <td style={styles.td}>
                  <span style={{ ...styles.chainBadge, backgroundColor: `${CHAIN_COLORS[hit.chainId] || '#666'}20`, color: CHAIN_COLORS[hit.chainId] || '#999', border: `1px solid ${CHAIN_COLORS[hit.chainId] || '#666'}40` }}>
                    {hit.chain}
                  </span>
                </td>
                <td style={styles.tdAmount}>
                  <span style={styles.amount}>
                    {hit.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {hit.tokenSymbol}
                  </span>
                  <span style={styles.usd}>${hit.valueUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </td>
                <td style={styles.td}>
                  <code style={styles.toAddr}>{hit.to.slice(0, 10)}...{hit.to.slice(-6)}</code>
                </td>
                <td style={styles.td}>
                  <a
                    href={hit.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.link}
                  >
                    View <ExternalLink size={12} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  successCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    padding: '3rem 2rem',
    borderRadius: '16px',
    background: 'rgba(34, 197, 94, 0.05)',
    border: '1px solid rgba(34, 197, 94, 0.2)',
    textAlign: 'center',
  },
  successTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#22c55e',
    margin: 0,
  },
  successText: {
    fontSize: '0.95rem',
    color: 'rgba(255,255,255,0.6)',
    margin: 0,
    maxWidth: '500px',
  },
  summaryCard: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-start',
    padding: '1.25rem 1.5rem',
    borderRadius: '12px',
    background: 'rgba(249, 115, 22, 0.08)',
    border: '1px solid rgba(249, 115, 22, 0.25)',
  },
  summaryTitle: {
    fontSize: '1.2rem',
    fontWeight: 700,
    color: '#f97316',
    margin: '0 0 0.25rem 0',
  },
  summaryText: {
    fontSize: '0.9rem',
    color: 'rgba(255,255,255,0.6)',
    margin: 0,
  },
  tableWrapper: {
    overflowX: 'auto',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.02)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.9rem',
  },
  th: {
    textAlign: 'left',
    padding: '0.85rem 1rem',
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 600,
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '0.85rem 1rem',
    color: 'rgba(255,255,255,0.85)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    whiteSpace: 'nowrap',
  },
  tdAmount: {
    padding: '0.85rem 1rem',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    whiteSpace: 'nowrap',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  trEven: { background: 'transparent' },
  trOdd: { background: 'rgba(255,255,255,0.015)' },
  walletAddr: {
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.7)',
  },
  chainBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  amount: {
    fontWeight: 700,
    color: '#ef4444',
    fontSize: '0.95rem',
  },
  usd: {
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.45)',
  },
  toAddr: {
    fontFamily: 'monospace',
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.5)',
    background: 'rgba(255,255,255,0.05)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  link: {
    color: 'var(--accent-indigo)',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.85rem',
  },
};
