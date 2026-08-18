'use client';

import React, { useState, useEffect } from 'react';
import { MultiChainScanResult } from '@/lib/types';
import WalletInput from '@/components/WalletInput';
import Dashboard from '@/components/Dashboard';
import ProgressBar from '@/components/ProgressBar';
import { SUPPORTED_CHAIN_IDS } from '@/lib/chains';

const PRESET_WALLETS = [
  { label: '0xd353b...78cA (Animus · Multi-Chain · 5 Socials)', address: '0xd353bDE2c00ca5EE95461031808aD34Bcb2c78cA' },
  { label: '0xd8dA6...6045 (Vitalik.eth · Multi-Chain · 6 Socials)', address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' },
];

export default function Home() {
  const [result, setResult] = useState<MultiChainScanResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentAddress, setCurrentAddress] = useState('0xd353bDE2c00ca5EE95461031808aD34Bcb2c78cA');

  useEffect(() => {
    // Scan all supported chains by default to aggregate complete lifetime gas and transactions
    handleScan(currentAddress, [...SUPPORTED_CHAIN_IDS]);
  }, []);

  const handleScan = async (address: string, chainIds: number[]) => {
    setIsLoading(true);
    setError(null);
    setCurrentAddress(address);
    setProgress('Indexing EVM block state & resolving multi-chain forensics...');

    try {
      setProgress(`Scanning ${chainIds.length} active chains & Web3.bio identity graph...`);

      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, chainIds, isDemo: false }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data: MultiChainScanResult = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan execution failed.');
    } finally {
      setIsLoading(false);
      setProgress('');
    }
  };

  return (
    <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ── Top Brand Header ── */}
      <header className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-xl sm:text-2xl font-black tracking-tight text-black font-sans uppercase">
            WALLETGENOME<span className="text-[#ff5500]">.</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-black text-white text-[11px] font-bold tracking-wider px-3 py-1">
            NODE: V4.2.0
          </span>
          <span className="bg-[#ff5500] text-white text-[11px] font-bold tracking-wider px-3 py-1">
            LIVE INDEXING
          </span>
        </div>
      </header>

      {/* ── Capsule Address Input & Network Selector ── */}
      <div className="space-y-2">
        <WalletInput
          onScan={handleScan}
          isLoading={isLoading}
          initialAddress={currentAddress}
        />

        {/* Preset Wallets Bar */}
        <div className="flex items-center gap-2 flex-wrap px-1">
          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
            FAST DEMO PRESETS:
          </span>
          {PRESET_WALLETS.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setCurrentAddress(p.address);
                handleScan(p.address, [...SUPPORTED_CHAIN_IDS]);
              }}
              className="text-xs font-mono font-bold text-gray-700 hover:text-black bg-white hover:bg-gray-100 px-3 py-1 border border-gray-200 shadow-sm transition-colors cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Progress Bar */}
      {isLoading && <ProgressBar message={progress} />}

      {/* Error Alert */}
      {error && (
        <div className="bg-white border-l-4 border-l-[#ef4444] p-4 text-xs font-bold text-[#ef4444]">
          {error}
        </div>
      )}

      {/* ── Full Dashboard View ── */}
      {result && <Dashboard data={result} />}
    </main>
  );
}
