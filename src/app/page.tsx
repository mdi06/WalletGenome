'use client';

import React, { useState } from 'react';
import { MultiChainScanResult } from '@/lib/types';
import WalletInput from '@/components/WalletInput';
import Dashboard from '@/components/Dashboard';
import ProgressBar from '@/components/ProgressBar';
import BatchScanResults from '@/components/BatchScanResults';
import { Info, Search, Loader2, Terminal, Shield, Activity, Network, Fingerprint, Fuel, Layers } from 'lucide-react';

export default function Home() {
  const [result, setResult] = useState<MultiChainScanResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Batch scan state
  const [isBatchScanning, setIsBatchScanning] = useState(false);
  const [batchProgress, setBatchProgress] = useState('');
  const [batchResult, setBatchResult] = useState<any>(null);
  const [batchError, setBatchError] = useState<string | null>(null);

  const handleScan = async (address: string, chainIds: number[]) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setBatchResult(null);
    setProgress('INITIALIZING_EVM_INDEXER...');

    try {
      setProgress(`SCANNING ${chainIds.length} CHAINS // DECODING CALLDATA...`);

      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, chainIds, isDemo: false }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setProgress('CALCULATING_BEHAVIORAL_ENTROPY_AND_SYBIL_RADAR...');
      const data: MultiChainScanResult = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during scan.');
    } finally {
      setIsLoading(false);
      setProgress('');
    }
  };

  const handleBatchScan = async () => {
    setIsBatchScanning(true);
    setBatchError(null);
    setBatchResult(null);
    setResult(null);
    setBatchProgress('INITIALIZING_BATCH_SWEEPER (362 WALLETS)...');

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
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : 'Batch sweep failed.');
    } finally {
      setIsBatchScanning(false);
      setBatchProgress('');
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ── Top Sci-Fi Telemetry Brand Header ── */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#242838] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#ff8c00] rounded-sm shadow-[0_0_8px_#ff8c00]" />
            <h1 className="text-xl md:text-2xl font-bold tracking-widest text-white font-mono uppercase">
              WALLET_GENOME <span className="text-[#9ec098] font-normal text-sm">// V2.4</span>
            </h1>
          </div>
          <p className="text-xs text-gray-400 font-mono tracking-wider mt-1">
            ON-CHAIN BEHAVIORAL FORENSICS · CAPITAL FLOW TOPOLOGY · SYBIL RADAR
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-[#9ec098] bg-[#121c13] px-3 py-1 rounded border border-[#203f23]">
            ● MULTICHAIN_INDEXER: ONLINE
          </span>
        </div>
      </header>

      {/* ── Main Interactive Scan Console ── */}
      <WalletInput onScan={handleScan} isLoading={isLoading} />

      {/* Loading Progress */}
      {isLoading && <ProgressBar message={progress} />}

      {/* Batch Sweeper Loading */}
      {isBatchScanning && (
        <div className="telemetry-chassis p-6 flex items-start gap-4 border-l-4 border-l-[#ff8c00] animate-fade-in">
          <Loader2 size={22} className="animate-spin text-[#ff8c00] flex-shrink-0" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white tracking-wider">BATCH_SWEEP_IN_PROGRESS</h3>
            <p className="text-xs text-gray-300 font-mono">{batchProgress}</p>
            <p className="text-[11px] text-gray-500 font-mono">362 wallets × 5 chains = 1,810 execution pairs. Please hold...</p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="telemetry-chassis p-5 border-l-4 border-l-[#ef4444] animate-fade-in space-y-1">
          <div className="text-xs font-bold text-[#ef4444] tracking-wider">ERR // SCAN_FAILED</div>
          <p className="text-xs text-gray-300 font-mono">{error}</p>
        </div>
      )}

      {/* Batch Error */}
      {batchError && (
        <div className="telemetry-chassis p-5 border-l-4 border-l-[#ef4444] animate-fade-in space-y-1">
          <div className="text-xs font-bold text-[#ef4444] tracking-wider">ERR // BATCH_SWEEP_FAILED</div>
          <p className="text-xs text-gray-300 font-mono">{batchError}</p>
        </div>
      )}

      {/* Scan Results View */}
      {result && (
        <div className="space-y-6 animate-fade-in">
          {result.notice && (
            <div className="telemetry-chassis p-3.5 border-l-4 border-l-[#38bdf8] flex items-center gap-3">
              <Info size={16} className="text-[#38bdf8] flex-shrink-0" />
              <span className="text-xs font-mono text-gray-300">{result.notice}</span>
            </div>
          )}
          <Dashboard data={result} />
        </div>
      )}

      {/* Batch Results View */}
      {batchResult && (
        <div className="animate-fade-in">
          <BatchScanResults result={batchResult} />
        </div>
      )}

      {/* ── Feature Matrix When Idle ── */}
      {!isLoading && !isBatchScanning && !result && !batchResult && !error && !batchError && (
        <section className="space-y-6 pt-4">
          <div className="flex items-center justify-between border-b border-[#242838] pb-3">
            <span className="text-xs font-bold text-[#e2b868] tracking-widest uppercase">
              // TELEMETRY_CAPABILITIES_MANIFEST
            </span>
            <span className="text-[10px] text-gray-500 font-mono">MODULES_ONLINE: 07</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TELEMETRY_FEATURES.map((feat, i) => (
              <div
                key={i}
                className="telemetry-module p-5 space-y-3 hover:border-[#ff8c00]/40 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-[#ff8c00] font-mono">[{feat.code}]</span>
                  <span className="text-xs text-[#9ec098] font-mono bg-[#141f15] px-2 py-0.5 rounded border border-[#213f24]">
                    {feat.badge}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white tracking-wider font-mono">
                  {feat.title}
                </h3>
                <p className="text-xs text-gray-400 font-mono leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

const TELEMETRY_FEATURES = [
  {
    code: 'MOD_01',
    badge: 'SHANNON_ENTROPY',
    title: 'BEHAVIORAL_GENOME_RADAR',
    desc: '6-dimension quantitative radar measuring DeFi diversity, capital efficiency, execution cadence, and trading personas.',
  },
  {
    code: 'MOD_02',
    badge: 'ARKHAM_TOPOLOGY',
    title: 'CAPITAL_FLOW_GRAPH',
    desc: 'Directed Bezier flow network mapping fund origins from CEX on-ramps through DeFi protocol routing to exit destinations.',
  },
  {
    code: 'MOD_03',
    badge: 'AUTO_SYNC_24H',
    title: 'SYBIL_&_SANCTION_RADAR',
    desc: 'In-memory O(1) cross-referencing against LayerZero, Hop Protocol, Umbra, OFAC, and Trusta MEDIA models.',
  },
  {
    code: 'MOD_04',
    badge: 'WEB3_BIO_GRAPH',
    title: 'UNIVERSAL_IDENTITY_RESOLVER',
    desc: 'Resolves linked ENS domains, Farcaster Warpcast handles, Lens profiles, Twitter/X, Discord, and GitHub accounts.',
  },
  {
    code: 'MOD_05',
    badge: 'MULTICHAIN_DEEP',
    title: 'GAS_ACCOUNTING_ENGINE',
    desc: '10,000-tx deep pagination computing lifetime gas expenditure in native tokens and historical USD valuation across L1/L2s.',
  },
  {
    code: 'MOD_06',
    badge: 'CALLDATA_SPENDER',
    title: 'PROTOCOL_ATTRIBUTION_ROLLUP',
    desc: 'Decodes ERC-20 approval spenders to attribute interactions to true DApp brands rather than pure token assets.',
  },
];
