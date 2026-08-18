'use client';

import { useState } from 'react';
import WalletInput from '@/components/WalletInput';
import Dashboard from '@/components/Dashboard';
import ProgressBar from '@/components/ProgressBar';
import BatchScanResults from '@/components/BatchScanResults';
import { MultiChainScanResult } from '@/lib/types';
import { Info, Search, Loader2 } from 'lucide-react';

interface ExtendedScanResult extends MultiChainScanResult {
  isDemo?: boolean;
  notice?: string;
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<ExtendedScanResult | null>(null);

  // Batch scan state
  const [isBatchScanning, setIsBatchScanning] = useState(false);
  const [batchProgress, setBatchProgress] = useState('');
  const [batchResult, setBatchResult] = useState<any>(null);
  const [batchError, setBatchError] = useState('');

  const handleScan = async (
    address: string,
    chainIds: number[],
    isDemo: boolean = false,
    customApiKey?: string
  ) => {
    setIsLoading(true);
    setError('');
    setResult(null);
    setBatchResult(null);
    setProgress('Connecting to EVM nodes & querying ledger...');

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, chainIds, isDemo, customApiKey }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
      setProgress('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setProgress('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchScan = async () => {
    setIsBatchScanning(true);
    setBatchError('');
    setBatchResult(null);
    setResult(null);
    setBatchProgress('Scanning all wallets from known_wallets.txt across 5 chains... This may take several minutes.');

    try {
      const response = await fetch('/api/batch-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chainIds: [1, 8453, 42161, 56, 10], minValueUSD: 500 }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setBatchResult(data);
      setBatchProgress('');
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : 'Batch scan failed');
      setBatchProgress('');
    } finally {
      setIsBatchScanning(false);
    }
  };

  return (
    <div className="page-container">
      <WalletInput onScan={handleScan} isLoading={isLoading} />

      {/* Batch Scan Button */}
      {!isLoading && !isBatchScanning && !result && !batchResult && (
        <div style={styles.batchSection}>
          <div style={styles.divider}>
            <span style={styles.dividerLine} />
            <span style={styles.dividerText}>or</span>
            <span style={styles.dividerLine} />
          </div>
          <button onClick={handleBatchScan} style={styles.batchButton}>
            <Search size={18} />
            Scan All My Wallets — Find Lost Funds
          </button>
          <p style={styles.batchHint}>
            Reads all 362 addresses from known_wallets.txt and scans across Ethereum, Base, Arbitrum, BSC & Optimism for suspicious outbound stablecoin transfers.
          </p>
        </div>
      )}

      {isLoading && <ProgressBar message={progress} />}

      {isBatchScanning && (
        <div style={styles.batchLoadingCard} className="glass-card animate-fade-in">
          <Loader2 size={24} className="animate-spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-indigo)' }} />
          <div>
            <p style={styles.batchLoadingTitle}>Batch Scan in Progress</p>
            <p style={styles.batchLoadingText}>{batchProgress}</p>
            <p style={styles.batchLoadingSubtext}>Scanning 362 wallets × 5 chains = 1,810 wallet-chain pairs. Please wait...</p>
          </div>
        </div>
      )}

      {error && (
        <div style={styles.errorCard} className="glass-card animate-fade-in">
          <span style={styles.errorIcon}>⚠️</span>
          <div>
            <p style={styles.errorTitle}>Scan Failed</p>
            <p style={styles.errorMessage}>{error}</p>
          </div>
        </div>
      )}

      {batchError && (
        <div style={styles.errorCard} className="glass-card animate-fade-in">
          <span style={styles.errorIcon}>⚠️</span>
          <div>
            <p style={styles.errorTitle}>Batch Scan Failed</p>
            <p style={styles.errorMessage}>{batchError}</p>
          </div>
        </div>
      )}

      {batchResult && (
        <div className="animate-fade-in">
          <BatchScanResults result={batchResult} />
        </div>
      )}

      {result && (
        <div className="animate-fade-in">
          {result.notice && (
            <div className="glass-card" style={styles.noticeCard}>
              <Info size={18} color="var(--accent-blue)" style={{ flexShrink: 0 }} />
              <span style={styles.noticeText}>{result.notice}</span>
            </div>
          )}
          <Dashboard data={result} />
        </div>
      )}

      {!isLoading && !isBatchScanning && !result && !batchResult && !error && !batchError && (
        <div style={styles.features}>
          <div style={styles.featureGrid}>
            {FEATURES.map((f, i) => (
              <div key={i} className="glass-card" style={{ ...styles.featureCard, animationDelay: `${i * 80}ms` }}>
                <span style={styles.featureIcon}>{f.icon}</span>
                <h3 style={styles.featureName}>{f.name}</h3>
                <p style={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const FEATURES = [
  {
    icon: '🧬',
    name: 'Behavioral Profiling',
    desc: '6-dimension radar fingerprint analyzing DeFi diversity, capital efficiency, risk appetite, and trading personas.',
  },
  {
    icon: '🛡️',
    name: 'Composite Risk Score',
    desc: '0–100 risk engine evaluating approval exposure, failed transactions, and contract vulnerabilities.',
  },
  {
    icon: '⛽',
    name: 'Deep Gas Forensics',
    desc: 'Accurate multi-chain gas fee calculations in ETH and USD with monthly volume and category breakdowns.',
  },
  {
    icon: '🕒',
    name: 'Activity Heatmap',
    desc: '24×7 UTC temporal distribution grid uncovering timezone patterns and execution habits.',
  },
  {
    icon: '🕵️',
    name: 'Sybil & Blacklist Radar',
    desc: 'Auto-syncs with LayerZero, Hop Protocol, Umbra, and OFAC sanctions databases in-memory with 0ms lookups.',
  },
  {
    icon: '🗺️',
    name: 'Arkham-Style Flow Graph',
    desc: 'Interactive 3-column network topology visualizing liquidity origins, bridge hops, and DeFi routing.',
  },
  {
    icon: '🔓',
    name: 'Approval & Exposure Audit',
    desc: 'Audit unlimited token permissions and calculate estimated USD capital at risk.',
  },
];

const styles: Record<string, React.CSSProperties> = {
  errorCard: {
    padding: 'var(--space-lg)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-md)',
    borderLeft: '3px solid var(--accent-red)',
    maxWidth: 600,
    margin: '0 auto',
  },
  errorIcon: { fontSize: '1.5rem', flexShrink: 0 },
  errorTitle: { fontWeight: 600, marginBottom: 4 },
  errorMessage: { fontSize: '0.9rem', color: 'var(--text-secondary)' },
  noticeCard: {
    padding: '12px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    borderLeft: '3px solid var(--accent-blue)',
    marginBottom: 'var(--space-md)',
  },
  noticeText: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  features: {
    padding: 'var(--space-xl) 0',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 'var(--space-md)',
  },
  featureCard: {
    padding: 'var(--space-lg)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-sm)',
    animation: 'fadeInUp 0.5s ease-out forwards',
    opacity: 0,
  },
  featureIcon: { fontSize: '1.8rem' },
  featureName: { fontSize: '1rem', fontWeight: 600 },
  featureDesc: { fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 },
  // Batch scan styles
  batchSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    margin: '1.5rem auto 0',
    maxWidth: 560,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  batchButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '14px 28px',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#fff',
    background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 20px rgba(249,115,22,0.3)',
  },
  batchHint: {
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    maxWidth: '480px',
    lineHeight: 1.5,
  },
  batchLoadingCard: {
    padding: '2rem',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    maxWidth: 600,
    margin: '2rem auto 0',
    borderLeft: '3px solid var(--accent-indigo)',
  },
  batchLoadingTitle: {
    fontWeight: 600,
    fontSize: '1.1rem',
    marginBottom: '0.25rem',
  },
  batchLoadingText: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
  },
  batchLoadingSubtext: {
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.35)',
    marginTop: '0.5rem',
  },
};
