'use client';

import React, { useState, useEffect } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { CHAINS, SUPPORTED_CHAIN_IDS } from '@/lib/chains';

interface Props {
  onScan: (address: string, chainIds: number[]) => void;
  isLoading: boolean;
  initialAddress?: string;
}

export default function WalletInput({ onScan, isLoading, initialAddress }: Props) {
  const [inputAddress, setInputAddress] = useState(initialAddress || '0xd353bDE2c00ca5EE95461031808aD34Bcb2c78cA');
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
    if (!/^0x[a-fA-F0-9]{40}$/.test(target)) {
      setError('Invalid EVM address format.');
      return;
    }
    setError(null);
    onScan(target, selectedChains);
  };

  return (
    <div className="space-y-2">
      {/* ── Sharp Square Input Bar ── */}
      <div className="bg-white border border-[#d4d4d4] px-4 sm:px-6 py-3 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Left: Search Icon & Address Input */}
        <div className="flex items-center gap-3 flex-1 w-full">
          <Search size={18} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={inputAddress}
            onChange={e => {
              setInputAddress(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={e => e.key === 'Enter' && !isLoading && handleScan()}
            placeholder="Enter EVM address (0x...)"
            className="w-full bg-transparent border-none text-[#0a0a0a] font-mono text-sm sm:text-base font-bold focus:outline-none placeholder:text-gray-400 placeholder:font-sans"
          />
        </div>

        {/* Right: Network Filter Pills & Scan Action */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {SUPPORTED_CHAIN_IDS.map(id => {
            const c = CHAINS[id];
            const isSelected = selectedChains.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleChain(id)}
                className={`text-xs font-bold px-3 py-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-black text-white'
                    : 'bg-[#f4f4f4] text-gray-600 border border-gray-200 hover:border-black'
                }`}
              >
                {c.shortName}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => handleScan()}
            disabled={isLoading}
            className="ml-2 bg-[#ff5500] hover:bg-[#e04b00] text-white font-black text-xs px-4 py-1.5 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? 'SCANNING...' : 'SCAN'}
            <ArrowRight size={13} strokeWidth={3} />
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-[#ef4444] font-bold px-1">
          {error}
        </p>
      )}
    </div>
  );
}
