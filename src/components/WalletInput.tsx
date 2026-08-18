'use client';

import React, { useState } from 'react';
import { Terminal, Shield, Sparkles, CornerDownLeft } from 'lucide-react';
import { CHAINS, SUPPORTED_CHAIN_IDS } from '@/lib/chains';

interface Props {
  onScan: (address: string, chainIds: number[]) => void;
  isLoading: boolean;
}

const SAMPLE_WALLETS = [
  { label: '0xd353b...78cA (Active DeFi Trader)', address: '0xd353bDE2c00ca5EE95461031808aD34Bcb2c78cA' },
  { label: '0xd8dA6...6045 (Vitalik.eth)', address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' },
];

export default function WalletInput({ onScan, isLoading }: Props) {
  const [inputAddress, setInputAddress] = useState('');
  const [selectedChains, setSelectedChains] = useState<number[]>([1, 8453, 42161, 10]);
  const [error, setError] = useState<string | null>(null);

  const toggleChain = (chainId: number) => {
    setSelectedChains(prev =>
      prev.includes(chainId) ? prev.filter(id => id !== chainId) : [...prev, chainId]
    );
  };

  const handleScan = (addrToScan?: string) => {
    const target = (addrToScan || inputAddress).trim();
    if (!target) {
      setError('Please input an EVM wallet address.');
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(target)) {
      setError('Invalid format: must be 0x followed by 40 hexadecimal characters.');
      return;
    }
    if (selectedChains.length === 0) {
      setError('Select at least one chain to execute telemetry scan.');
      return;
    }

    setError(null);
    onScan(target, selectedChains);
  };

  return (
    <div className="telemetry-chassis p-5 md:p-6 space-y-5 animate-fade-in-up">
      <div className="flex justify-between items-center border-b border-[#282c3b] pb-3">
        <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#d8a758]">
          <Terminal size={15} color="#ff8c00" />
          <span>TARGET_INTERFACE // TELEMETRY_INITIALIZER</span>
        </div>
        <span className="text-[10px] text-[#9ec098] font-mono tracking-widest bg-[#111912] px-2 py-0.5 rounded border border-[#1b3820]">
          NETWORK_STATUS: READY
        </span>
      </div>

      {/* Input Row */}
      <div className="space-y-2">
        <label className="text-[11px] text-gray-400 tracking-wider font-semibold block">
          TARGET_EVM_ADDRESS (HEX):
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="0x... (e.g. 0xd353bDE2c00ca5EE95461031808aD34Bcb2c78cA)"
              value={inputAddress}
              onChange={e => {
                setInputAddress(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={e => e.key === 'Enter' && !isLoading && handleScan()}
              className="w-full bg-[#10121a] border border-[#2b3040] focus:border-[#ff8c00] focus:outline-none text-white font-mono text-sm px-4 py-3 rounded tracking-wider transition-colors placeholder:text-gray-600"
            />
          </div>

          <button
            onClick={() => handleScan()}
            disabled={isLoading}
            className="bg-[#ff8c00] hover:bg-[#ffa324] text-black font-mono font-bold text-xs uppercase tracking-widest px-6 py-3 rounded flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(255,140,0,0.3)] disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <span>INDEXING_CHAIN_DATA...</span>
            ) : (
              <>
                <span>EXECUTE_SCAN</span>
                <CornerDownLeft size={14} />
              </>
            )}
          </button>
        </div>
        {error && (
          <p className="text-xs text-[#ef4444] font-mono tracking-wide mt-1">
            ERR // {error}
          </p>
        )}
      </div>

      {/* Tactical Chain Selection Switches */}
      <div className="space-y-2 pt-2 border-t border-[#282c3b]">
        <span className="text-[11px] text-[#e2b868] font-bold tracking-wider block">
          ACTIVE_RADAR_CHAINS:
        </span>
        <div className="flex flex-wrap gap-2">
          {SUPPORTED_CHAIN_IDS.map(id => {
            const c = CHAINS[id];
            const isSelected = selectedChains.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleChain(id)}
                className={`text-xs font-mono px-3 py-1.5 rounded border transition-all flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-[#182318] border-[#9ec098] text-[#9ec098] shadow-[0_0_8px_rgba(158,192,152,0.2)]'
                    : 'bg-[#11131a] border-[#282c3b] text-gray-500 hover:text-gray-400'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#9ec098]' : 'bg-gray-600'}`} />
                <span>[{c.shortName.toUpperCase()}]</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset Target Wallets */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
          FAST_TELEMETRY_PRESETS:
        </span>
        {SAMPLE_WALLETS.map((sample, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setInputAddress(sample.address);
              handleScan(sample.address);
            }}
            className="text-[11px] font-mono text-gray-400 hover:text-[#ff8c00] bg-[#12141c] px-2.5 py-1 rounded border border-[#232733] hover:border-[#ff8c00]/50 transition-colors cursor-pointer"
          >
            {sample.label}
          </button>
        ))}
      </div>
    </div>
  );
}
