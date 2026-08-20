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
      setError('Please enter an EVM address or ENS domain.');
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(target) && !/^[a-zA-Z0-9-.]+\.eth$/i.test(target) && !target.includes('.')) {
      setError('Invalid EVM address (0x...) or ENS domain (.eth) format.');
      return;
    }
    setError(null);
    onScan(target, selectedChains);
  };

  return (
    <div className="space-y-2">
      {/* ── 3D Tactile Input Console ── */}
      <div className={`card-3d transition-all px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-3 ${
        isLoading ? 'border-[#ff5500] ring-2 ring-[#ff5500]/30' : 'border-[#c2c2c2]'
      }`}>
        
        {/* Left: Search Icon & Recessed Address Input Well */}
        <div className="well-recessed-light flex items-center gap-3 flex-1 w-full px-3 py-2">
          <Search size={18} className={`flex-shrink-0 transition-colors ${isLoading ? 'text-[#ff5500]' : 'text-gray-500'}`} />
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

        {/* Right: Network Filter Pills & 3D Scan Action Button */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {SUPPORTED_CHAIN_IDS.map(id => {
            const c = CHAINS[id];
            const isSelected = selectedChains.includes(id);
            return (
              <button
                key={id}
                type="button"
                disabled={isLoading}
                onClick={() => toggleChain(id)}
                className={`text-xs font-bold px-3 py-1.5 cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'btn-3d-black text-white'
                    : 'btn-3d-neutral text-[#4b5563]'
                } ${isLoading ? 'opacity-80' : ''}`}
              >
                <span className={isSelected ? 'led-live rounded-full' : 'w-1.5 h-1.5 rounded-full bg-gray-400'} />
                <span>{c.shortName}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => handleScan()}
            disabled={isLoading}
            className={`ml-1.5 font-mono font-black text-xs px-5 py-2.5 flex items-center gap-2 cursor-pointer select-none ${
              isLoading
                ? 'btn-3d-orange animate-pulse-glow'
                : 'btn-3d-orange'
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
        <p className="card-3d border-l-4 border-l-[#ef4444] text-xs text-[#ef4444] font-bold p-2.5 animate-fade-in-up">
          {error}
        </p>
      )}
    </div>
  );
}
