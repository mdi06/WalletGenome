'use client';

import { useState } from 'react';
import { Search, Loader2, Wallet, Key, Sparkles } from 'lucide-react';
import { CHAINS, SUPPORTED_CHAIN_IDS } from '@/lib/chains';

interface WalletInputProps {
  onScan: (address: string, chainIds: number[], isDemo?: boolean, customApiKey?: string) => void;
  isLoading: boolean;
}

const SAMPLE_WALLETS = [
  {
    name: 'Sample Wallet ($2,000 Loss Scenario)',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28',
    isDemo: true,
  },
  {
    name: 'Vitalik.eth',
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    isDemo: false,
  },
];

export default function WalletInput({ onScan, isLoading }: WalletInputProps) {
  const [address, setAddress] = useState('');
  const [selectedChains, setSelectedChains] = useState<number[]>([1, 8453, 42161, 56, 10]);
  const [error, setError] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState('');

  const toggleChain = (chainId: number) => {
    setSelectedChains(prev => {
      if (prev.includes(chainId)) {
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== chainId);
      }
      return [...prev, chainId];
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = address.trim();
    if (!trimmed) {
      setError('Please enter a wallet address');
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      setError('Invalid EVM address. Must be 0x followed by 40 hex characters.');
      return;
    }

    onScan(trimmed, selectedChains, false, apiKey.trim() || undefined);
  };

  const handleSelectSample = (sample: typeof SAMPLE_WALLETS[0]) => {
    setAddress(sample.address);
    setError('');
    onScan(sample.address, selectedChains, sample.isDemo, apiKey.trim() || undefined);
  };

  return (
    <div style={styles.container}>
      <div style={styles.heroSection}>
        <div style={styles.iconWrapper}>
          <Wallet size={32} color="var(--accent-indigo)" />
        </div>
        <h1 style={styles.title}>
          Wallet <span style={styles.titleAccent}>Analytics</span>
        </h1>
        <p style={styles.subtitle}>
          Deep EVM financial forensics: sum gas fees in USD, trace biggest transfers, audit token approvals, and pinpoint lost or misdirected funds.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputWrapper}>
          <Search size={20} color="var(--text-tertiary)" style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Enter EVM address (0x...)"
            value={address}
            onChange={(e) => { setAddress(e.target.value); setError(''); }}
            style={styles.input}
            disabled={isLoading}
            spellCheck={false}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={isLoading}
            style={{
              ...styles.button,
              ...(isLoading ? styles.buttonDisabled : {}),
            }}
          >
            {isLoading ? (
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              'Scan Wallet'
            )}
          </button>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {/* Quick sample chips */}
        <div style={styles.sampleRow}>
          <span style={styles.sampleLabel}>
            <Sparkles size={13} color="var(--accent-indigo)" /> Try Sample:
          </span>
          {SAMPLE_WALLETS.map(sample => (
            <button
              key={sample.address}
              type="button"
              onClick={() => handleSelectSample(sample)}
              disabled={isLoading}
              style={styles.sampleChip}
            >
              {sample.name}
            </button>
          ))}
        </div>

        {/* Chains & Options */}
        <div style={styles.controlsRow}>
          <div style={styles.chainSelector}>
            <span style={styles.chainLabel}>Chains:</span>
            <div style={styles.chainButtons}>
              {SUPPORTED_CHAIN_IDS.map(chainId => {
                const chain = CHAINS[chainId];
                const isSelected = selectedChains.includes(chainId);
                return (
                  <button
                    key={chainId}
                    type="button"
                    onClick={() => toggleChain(chainId)}
                    style={{
                      ...styles.chainButton,
                      background: isSelected ? `${chain.color}25` : 'var(--bg-glass)',
                      borderColor: isSelected ? `${chain.color}70` : 'var(--border-primary)',
                      color: isSelected ? chain.color : 'var(--text-secondary)',
                    }}
                  >
                    <span>{chain.icon}</span>
                    <span>{chain.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowKeyInput(!showKeyInput)}
            style={styles.keyToggle}
          >
            <Key size={13} />
            <span>{showKeyInput ? 'Hide API Key' : 'Custom Etherscan Key'}</span>
          </button>
        </div>

        {showKeyInput && (
          <div style={styles.keyInputBox} className="glass-card animate-fade-in">
            <label style={styles.keyLabel}>Optional Etherscan API Key (V2):</label>
            <input
              type="password"
              placeholder="Paste your Etherscan API key here"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={styles.keyInputField}
            />
            <span style={styles.keyHelp}>
              Leave empty to use server default / built-in simulated demo mode.
            </span>
          </div>
        )}
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-xl)',
    padding: 'var(--space-3xl) 0 var(--space-2xl)',
  },
  heroSection: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-md)',
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 'var(--radius-lg)',
    background: 'var(--accent-indigo-dim)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 'var(--space-sm)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--border-accent)',
  },
  title: {
    fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
    fontWeight: 800,
    letterSpacing: '-0.03em',
    lineHeight: 1.1,
  },
  titleAccent: {
    background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-blue), var(--accent-purple))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    fontSize: '1.05rem',
    color: 'var(--text-secondary)',
    maxWidth: 580,
    lineHeight: 1.6,
  },
  form: {
    width: '100%',
    maxWidth: 720,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    background: 'var(--bg-card)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--border-secondary)',
    borderRadius: 'var(--radius-lg)',
    padding: '6px 6px 6px 16px',
    boxShadow: 'var(--shadow-md)',
  },
  searchIcon: {
    flexShrink: 0,
  },
  input: {
    flex: 1,
    background: 'none',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    fontFamily: 'var(--font-mono)',
    padding: '12px 8px',
  },
  button: {
    flexShrink: 0,
    padding: '12px 28px',
    background: 'linear-gradient(135deg, var(--accent-indigo), #4f46e5)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    transition: 'all var(--transition-fast)',
    boxShadow: '0 2px 10px rgba(99, 102, 241, 0.3)',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  error: {
    color: 'var(--accent-red)',
    fontSize: '0.85rem',
    paddingLeft: 8,
  },
  sampleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  },
  sampleLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-tertiary)',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  sampleChip: {
    background: 'var(--bg-glass)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--border-primary)',
    borderRadius: 'var(--radius-full)',
    padding: '4px 12px',
    color: 'var(--text-accent)',
    fontSize: '0.78rem',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  controlsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap' as const,
    gap: 'var(--space-md)',
    marginTop: 'var(--space-xs)',
  },
  chainSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
  },
  chainLabel: {
    fontSize: '0.82rem',
    color: 'var(--text-tertiary)',
  },
  chainButtons: {
    display: 'flex',
    gap: 'var(--space-xs)',
  },
  chainButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 12px',
    borderRadius: 'var(--radius-full)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--border-primary)',
    background: 'var(--bg-glass)',
    color: 'var(--text-secondary)',
    fontSize: '0.8rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  keyToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: 'none',
    color: 'var(--text-tertiary)',
    fontSize: '0.8rem',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  keyInputBox: {
    padding: 'var(--space-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xs)',
  },
  keyLabel: {
    fontSize: '0.78rem',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  keyInputField: {
    background: 'var(--bg-secondary)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--border-primary)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 12px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.85rem',
    outline: 'none',
  },
  keyHelp: {
    fontSize: '0.72rem',
    color: 'var(--text-tertiary)',
  },
};
