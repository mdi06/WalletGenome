'use client';

import React, { useState, useEffect } from 'react';
import { Search, ArrowRight, Loader2 } from 'lucide-react';
import { CHAINS, SUPPORTED_CHAIN_IDS } from '@/lib/chains';

interface Props {
  onScan: (address: string, chainIds: number[]) => void;
  isLoading: boolean;
  initialAddress?: string;
}

export default function WalletInput({ onScan, isLoading, initialAddress }: Props) {
  const [inputAddress, setInputAddress] = useState(initialAddress || '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
  const [selectedChains, setSelectedChains] = useState<number[]>([...SUPPORTED_CHAIN_IDS]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialAddress) {
      setInputAddress(initialAddress);
    }
  }, [initialAddress]);

  const toggleChain = (chainId: number) => {
    setSelectedChains(prev =>
      prev.includes(chainId)
        ? (prev.length > 1 ? prev.filter(id => id !== chainId) : prev)
        : [...prev, chainId]
    );
  };

  const handleScan = (addrToScan?: string) => {
    const target = (addrToScan || inputAddress).trim();
    if (!target) {
      setError('Please enter an EVM address.');
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(target) && !target.endsWith('.eth')) {
      setError('Invalid EVM address or domain format.');
      return;
    }
    setError(null);
    onScan(target, selectedChains);
  };

  return (
    <div className="space-y-2">
      {/* ── Sharp Square Input Bar ── */}
      <div className={`bg-white border transition-all px-4 sm:px-6 py-3 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 ${
        isLoading ? 'border-[#ff5500] shadow-md shadow-[#ff5500]/10' : 'border-[#d4d4d4]'
      }`}>
        
        {/* Left: Search Icon & Address Input */}
        <div className="flex items-center gap-3 flex-1 w-full">
          <Search size={18} className={`flex-shrink-0 transition-colors ${isLoading ? 'text-[#ff5500]' : 'text-gray-400'}`} />
          <input
            type="text"
            value={inputAddress}
            disabled={isLoading}
            onChange={e => {
              setInputAddress(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={e => e.key === 'Enter' && !isLoading && handleScan()}
            placeholder="Enter EVM address (0x...) or ENS name (vitalik.eth)"
            className="w-full bg-transparent border-none text-[#0a0a0a] font-mono text-sm sm:text-base font-bold focus:outline-none placeholder:text-gray-400 placeholder:font-sans disabled:opacity-75"
          />
        </div>

        {/* Right: Network Filter Pills & Interactive Scan Action Button */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {SUPPORTED_CHAIN_IDS.map(id => {
            const c = CHAINS[id];
            const isSelected = selectedChains.includes(id);
            return (
              <button
                key={id}
                type="button"
                disabled={isLoading}
                onClick={() => toggleChain(id)}
                className={`text-xs font-bold px-3 py-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-[#f4f4f4] text-gray-600 border border-gray-200 hover:border-black hover:bg-gray-100'
                } ${isLoading ? 'opacity-80' : ''}`}
              >
                {c.shortName}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => handleScan()}
            disabled={isLoading}
            className={`ml-2 text-white font-mono font-black text-xs px-4 py-2 transition-all flex items-center gap-2 cursor-pointer select-none ${
              isLoading
                ? 'bg-[#ff5500] animate-pulse-glow shadow-md shadow-[#ff5500]/40'
                : 'bg-[#ff5500] hover:bg-[#e04b00] shadow-sm hover:shadow-md'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 size={13} className="animate-spin text-white flex-shrink-0" />
                <span className="tracking-wider">SCANNING...</span>
              </>
            ) : (
              <>
                <span className="tracking-wider">SCAN</span>
                <ArrowRight size={13} strokeWidth={3} className="group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-[#ef4444] font-bold px-1 animate-fade-in-up">
          {error}
        </p>
      )}
    </div>
  );
}
