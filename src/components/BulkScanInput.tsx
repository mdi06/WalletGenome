'use client';

import React, { useState, useMemo } from 'react';
import { Layers, ArrowRight, Loader2, Copy, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { CHAINS, SUPPORTED_CHAIN_IDS } from '@/lib/chains';

interface Props {
  onScanCluster: (addresses: string[], chainIds: number[]) => void;
  isLoading: boolean;
}

const SAMPLE_CLUSTER = [
  '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // vitalik.eth
  '0x3DdfA8eC3052539b6C9549F12cEA2C295cfF5296', // justinsun.eth
  '0x50EC05AD9D29a73367175E26E962D714E96896C3', // hayden.eth
  '0x2e21f5d34208a3d5483f9829f2709e9005bf15f2', // stani.eth
];

export default function BulkScanInput({ onScanCluster, isLoading }: Props) {
  const [rawText, setRawText] = useState('');
  const [selectedChains, setSelectedChains] = useState<number[]>([1, 8453, 42161]);
  const [error, setError] = useState<string | null>(null);

  // Parse valid addresses dynamically
  const parsedAddresses = useMemo(() => {
    const tokens = rawText
      .split(/[\n,\s]+/)
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    const valid = Array.from(new Set(tokens.filter(t => /^0x[a-f0-9]{40}$/i.test(t))));
    return valid;
  }, [rawText]);

  const toggleChain = (chainId: number) => {
    setSelectedChains(prev =>
      prev.includes(chainId)
        ? (prev.length > 1 ? prev.filter(id => id !== chainId) : prev)
        : [...prev, chainId]
    );
  };

  const handleLoadSample = () => {
    setRawText(SAMPLE_CLUSTER.join('\n'));
    if (error) setError(null);
  };

  const handleSubmit = () => {
    if (parsedAddresses.length === 0) {
      setError('Please paste at least 1 valid EVM address (0x...).');
      return;
    }
    if (parsedAddresses.length > 30) {
      setError('Cluster scan is currently capped at 30 wallets per batch for performance.');
      return;
    }
    setError(null);
    onScanCluster(parsedAddresses, selectedChains);
  };

  return (
    <div className="space-y-3 card-3d p-5">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-[#ff5500]" />
          <span className="text-xs font-black uppercase text-[#0a0a0a] tracking-wider">
            MULTI-WALLET CLUSTER MATRIX SCANNER
          </span>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 btn-3d-neutral text-[#4b5563]">
            UP TO 30 WALLETS
          </span>
        </div>

        <button
          type="button"
          onClick={handleLoadSample}
          disabled={isLoading}
          className="btn-3d-neutral text-xs font-bold text-[#ff5500] hover:text-black px-2.5 py-1 flex items-center gap-1.5 cursor-pointer"
        >
          <Sparkles size={12} className="text-[#ff5500]" />
          <span>Load Sample Cluster (4 Wallets)</span>
        </button>
      </div>

      {/* ── Textarea Input Well ── */}
      <div className="relative well-recessed-light p-1">
        <textarea
          value={rawText}
          disabled={isLoading}
          onChange={e => {
            setRawText(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Paste EVM addresses separated by new lines, commas, or spaces:&#10;0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&#10;0x50EC05AD9D29a73367175E26E962D714E96896C3"
          rows={4}
          className="w-full bg-transparent p-2.5 text-xs font-mono font-bold text-[#0a0a0a] focus:outline-none placeholder:text-gray-400 placeholder:font-sans resize-none"
        />

        {/* Counter Badge */}
        <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5 text-[11px] font-mono font-bold bg-white/80 px-2 py-0.5 border border-gray-200 shadow-sm">
          {parsedAddresses.length > 0 ? (
            <span className="text-[#059669] flex items-center gap-1">
              <CheckCircle2 size={12} />
              {parsedAddresses.length} valid {parsedAddresses.length === 1 ? 'address' : 'addresses'}
            </span>
          ) : (
            <span className="text-gray-400">0 addresses</span>
          )}
        </div>
      </div>

      {/* ── Bottom Controls Row: Chains & Scan Action ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        
        {/* Network Selector Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-extrabold text-[#4b5563] uppercase pr-1">
            Networks:
          </span>
          {SUPPORTED_CHAIN_IDS.map(id => {
            const c = CHAINS[id];
            const isSelected = selectedChains.includes(id);
            return (
              <button
                key={id}
                type="button"
                disabled={isLoading}
                onClick={() => toggleChain(id)}
                className={`text-xs font-bold px-3 py-1 cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'btn-3d-black text-white'
                    : 'btn-3d-neutral text-[#4b5563]'
                }`}
              >
                <span className={isSelected ? 'led-live rounded-full' : 'w-1.5 h-1.5 rounded-full bg-gray-400'} />
                <span>{c.shortName}</span>
              </button>
            );
          })}
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || parsedAddresses.length === 0}
          className={`font-mono font-black text-xs px-5 py-2.5 flex items-center justify-center gap-2 cursor-pointer select-none text-white ${
            isLoading
              ? 'btn-3d-orange animate-pulse-glow'
              : 'btn-3d-orange disabled:opacity-50'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 size={13} className="animate-spin text-white" />
              <span>SCANNING CLUSTER ({parsedAddresses.length} WALLETS)...</span>
            </>
          ) : (
            <>
              <span>SCAN CLUSTER ({parsedAddresses.length})</span>
              <ArrowRight size={13} strokeWidth={3} />
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-[#ef4444] font-bold pt-1 card-3d border-l-4 border-l-[#ef4444] p-2">
          <AlertCircle size={13} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
