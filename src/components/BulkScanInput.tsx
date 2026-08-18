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
  '0x11E4857Bb9993a50c685A79AFfb4F1a64Ffb44E4', // hayden.eth
  '0x2e21f5d32841cf8c73797824da4f8ab080003a0c', // stani.eth
  '0x28c6c06298d514db089934071355e5743bf21d60', // Binance 14
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
    <div className="space-y-3 bg-white border border-[#cecece] p-5 shadow-sm">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-[#ff5500]" />
          <span className="text-xs font-black uppercase text-[#0a0a0a] tracking-wider">
            MULTI-WALLET CLUSTER MATRIX SCANNER
          </span>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-[#dedede] text-[#555555]">
            UP TO 30 WALLETS
          </span>
        </div>

        <button
          type="button"
          onClick={handleLoadSample}
          disabled={isLoading}
          className="text-xs font-bold text-[#ff5500] hover:text-black flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Sparkles size={12} />
          <span>Load Sample Cluster (4 Wallets)</span>
        </button>
      </div>

      {/* ── Textarea Input ── */}
      <div className="relative">
        <textarea
          value={rawText}
          disabled={isLoading}
          onChange={e => {
            setRawText(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Paste EVM addresses separated by new lines, commas, or spaces:&#10;0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&#10;0x11E4857Bb9993a50c685A79AFfb4F1a64Ffb44E4"
          rows={4}
          className="w-full bg-[#fafafa] border border-[#cecece] p-3 text-xs font-mono font-bold text-[#0a0a0a] focus:outline-none focus:border-black placeholder:text-gray-400 placeholder:font-sans resize-none"
        />

        {/* Counter Badge */}
        <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5 text-[11px] font-mono font-bold">
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
          <span className="text-[11px] font-extrabold text-[#555555] uppercase pr-1">
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
                className={`text-xs font-bold px-3 py-1 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-[#f4f4f4] text-gray-600 border border-gray-200 hover:border-black'
                }`}
              >
                {c.shortName}
              </button>
            );
          })}
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || parsedAddresses.length === 0}
          className={`font-mono font-black text-xs px-5 py-2 transition-all flex items-center justify-center gap-2 cursor-pointer select-none text-white ${
            isLoading
              ? 'bg-[#ff5500] animate-pulse-glow shadow-md'
              : 'bg-[#ff5500] hover:bg-[#e04b00] disabled:opacity-50'
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
        <div className="flex items-center gap-1.5 text-xs text-[#ef4444] font-bold pt-1">
          <AlertCircle size={13} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
