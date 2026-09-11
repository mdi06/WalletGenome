'use client';

import React, { useState, useMemo } from 'react';
import { Layers, ArrowRight, Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { CHAINS, SUPPORTED_CHAIN_IDS } from '@/lib/chains';
import { MAX_BATCH_WALLETS } from '@/lib/api/constants';
import { CLUSTER_SAMPLE_ADDRESSES } from '@/lib/clusterDemoSnapshot';

interface Props {
  onScanCluster: (addresses: string[], chainIds: number[], trigger?: HTMLElement) => void;
  onLoadSavedClusterSnapshot: () => void;
  onClusterInputChange?: () => void;
  isLoading: boolean;
}

interface ParsedClusterInput {
  validAddresses: string[];
  duplicateAddresses: string[];
  duplicateEntryCount: number;
  invalidEntries: string[];
  invalidEntryCount: number;
}

export function parseBulkWalletEntries(rawText: string): ParsedClusterInput {
  const tokens = rawText
    .split(/[\n,\s]+/)
    .map(token => token.trim().toLowerCase())
    .filter(token => token.length > 0);
  const validTokens = tokens.filter(token => /^0x[a-f0-9]{40}$/i.test(token));
  const invalidTokens = tokens.filter(token => !/^0x[a-f0-9]{40}$/i.test(token));
  const tokenCounts = new Map<string, number>();

  validTokens.forEach(token => tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1));

  return {
    validAddresses: Array.from(tokenCounts.keys()),
    duplicateAddresses: Array.from(tokenCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([address]) => address),
    duplicateEntryCount: validTokens.length - tokenCounts.size,
    invalidEntries: Array.from(new Set(invalidTokens)),
    invalidEntryCount: invalidTokens.length,
  };
}

export default function BulkScanInput({ onScanCluster, onLoadSavedClusterSnapshot, onClusterInputChange, isLoading }: Props) {
  const [rawText, setRawText] = useState('');
  const [selectedChains, setSelectedChains] = useState<number[]>([1, 8453, 42161]);
  const [error, setError] = useState<string | null>(null);

  const parsedInput = useMemo(() => parseBulkWalletEntries(rawText), [rawText]);
  const hasRejectedEntries = parsedInput.duplicateEntryCount > 0 || parsedInput.invalidEntryCount > 0;
  const addressDescriptionIds = [
    error ? 'bulk-address-error' : null,
    hasRejectedEntries ? 'bulk-address-rejected' : null,
  ].filter((id): id is string => id !== null).join(' ') || undefined;

  const toggleChain = (chainId: number) => {
    setSelectedChains(prev =>
      prev.includes(chainId)
        ? (prev.length > 1 ? prev.filter(id => id !== chainId) : prev)
        : [...prev, chainId]
    );
  };

  const handleLoadSample = () => {
    onClusterInputChange?.();
    setRawText(CLUSTER_SAMPLE_ADDRESSES.join('\n'));
    if (error) setError(null);
  };

  const handleSubmit = (event?: React.SyntheticEvent<HTMLElement>) => {
    if (hasRejectedEntries) {
      setError('Remove invalid or duplicate wallet entries before scanning.');
      return;
    }
    if (parsedInput.validAddresses.length === 0) {
      setError('Please paste at least 1 valid EVM address (0x...).');
      return;
    }
    if (parsedInput.validAddresses.length > MAX_BATCH_WALLETS) {
      setError(`Please limit each cluster scan to ${MAX_BATCH_WALLETS} wallets.`);
      return;
    }
    setError(null);
    onScanCluster(
      parsedInput.validAddresses,
      selectedChains,
      event?.currentTarget instanceof HTMLElement ? event.currentTarget : undefined,
    );
  };

  return (
    <div className="space-y-3 card-3d p-5 md:p-4">
      {/* ── Top Bar ── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-2">
        <div className="flex flex-col md:flex-row items-center gap-2 text-center md:text-left">
          <div className="flex items-center justify-center gap-1.5">
            <Layers size={16} className="text-orange-ink shrink-0" />
            <span className="text-xs font-black uppercase text-[#0a0a0a] tracking-wider">
              MULTI-WALLET CLUSTER MATRIX SCANNER
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 btn-3d-neutral text-[#4b5563]">
            BATCH MODE
          </span>
        </div>

        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
          <button
            type="button"
            onClick={handleLoadSample}
            disabled={isLoading}
            className="w-full justify-center btn-3d-neutral min-h-11 md:min-h-9 text-xs font-bold text-orange-ink hover:text-black px-2.5 py-1 flex items-center gap-1.5 cursor-pointer md:w-auto"
          >
            <Sparkles size={12} className="text-orange-ink" />
            <span>Fill Sample Addresses (4)</span>
          </button>
          <button
            type="button"
            onClick={onLoadSavedClusterSnapshot}
            disabled={isLoading}
            className="w-full justify-center btn-3d-neutral min-h-11 md:min-h-9 text-xs font-bold text-[#0a0a0a] hover:text-orange-ink px-2.5 py-1 flex items-center gap-1.5 cursor-pointer md:w-auto"
          >
            <Layers size={12} className="text-orange-ink" />
            <span>Load Saved Cluster Example</span>
          </button>
        </div>
      </div>

      {/* ── Textarea Input Well ── */}
      <div className="well-recessed-light p-1 focus-within:border-[#0a0a0a] focus-within:ring-2 focus-within:ring-[#0a0a0a]/20 focus-within:ring-offset-1">
        <label htmlFor="bulk-address-input" className="sr-only">
          Paste EVM addresses separated by new lines, commas, or spaces
        </label>
        <textarea
          id="bulk-address-input"
          aria-label="Paste EVM addresses to scan"
          aria-invalid={Boolean(error) || hasRejectedEntries}
          aria-describedby={addressDescriptionIds}
          value={rawText}
          disabled={isLoading}
          onChange={e => {
            onClusterInputChange?.();
            setRawText(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Paste EVM addresses separated by new lines, commas, or spaces:&#10;0x2e21f5d34208a3d5483f9829f2709e9005bf15f2&#10;0x163473950fbcfcfc31ac7ad0eec26f5fe549046c"
          rows={4}
          className="w-full bg-transparent p-2.5 text-xs font-mono font-bold text-[#0a0a0a] focus:outline-none placeholder:text-gray-400 placeholder:font-sans resize-none"
        />
      </div>

      {/* Counter Badge */}
      <div aria-live="polite" className="flex flex-wrap items-center justify-center lg:justify-end gap-1.5 text-[11px] font-mono font-bold pt-1">
        {parsedInput.validAddresses.length > 0 ? (
          <span className="text-[#047857] flex items-center gap-1">
            <CheckCircle2 size={12} />
            {parsedInput.validAddresses.length}/{MAX_BATCH_WALLETS} unique valid {parsedInput.validAddresses.length === 1 ? 'address' : 'addresses'}
          </span>
        ) : (
          <span className="text-gray-400">0 addresses</span>
        )}
        {parsedInput.duplicateEntryCount > 0 && (
          <span className="text-[#b45300]">· {parsedInput.duplicateEntryCount} duplicate {parsedInput.duplicateEntryCount === 1 ? 'entry' : 'entries'}</span>
        )}
        {parsedInput.invalidEntryCount > 0 && (
          <span className="text-[#b91c1c]">· {parsedInput.invalidEntryCount} invalid {parsedInput.invalidEntryCount === 1 ? 'entry' : 'entries'}</span>
        )}
      </div>

      {hasRejectedEntries && (
        <div id="bulk-address-rejected" role="alert" className="flex items-start gap-1.5 text-xs text-[#92400e] font-bold card-3d border-l-4 border-l-[#f59e0b] p-2">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p>Remove invalid or duplicate entries before Cluster Scan runs.</p>
            {parsedInput.invalidEntries.length > 0 && (
              <p>
                Invalid: <span className="break-all font-mono">{parsedInput.invalidEntries.join(', ')}</span>
              </p>
            )}
            {parsedInput.duplicateAddresses.length > 0 && (
              <p>
                Duplicates: <span className="break-all font-mono">{parsedInput.duplicateAddresses.join(', ')}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Bottom Controls Row: Chains & Scan Action ── */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 pt-1">

        {/* Network Selector Pills */}
        <div role="group" aria-label="Select target EVM networks for cluster" className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-1.5 w-full lg:w-auto">
          <span className="text-[11px] font-extrabold text-[#4b5563] uppercase">
            Networks:
          </span>
          <div className="grid grid-cols-4 md:flex items-center gap-1.5 w-full md:w-auto">
            {SUPPORTED_CHAIN_IDS.map(id => {
              const c = CHAINS[id];
              const isSelected = selectedChains.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`Toggle ${c.name} network`}
                  disabled={isLoading}
                  onClick={() => toggleChain(id)}
                  className={`justify-center min-h-11 md:min-h-9 text-[10px] md:text-xs font-bold px-1.5 md:px-2.5 py-1 cursor-pointer flex items-center gap-1 md:gap-1.5 ${isSelected
                      ? 'btn-3d-black text-white'
                      : 'btn-3d-neutral text-[#4b5563]'
                    }`}
                >
                  <span aria-hidden="true" className={isSelected ? 'led-live rounded-full' : 'w-1.5 h-1.5 rounded-full bg-gray-400'} />
                  <span>{c.shortName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || parsedInput.validAddresses.length === 0 || hasRejectedEntries}
          className={`w-full lg:w-auto min-h-11 font-mono font-black text-xs px-5 py-2.5 flex items-center justify-center gap-2 cursor-pointer select-none text-white ${isLoading
              ? 'btn-3d-orange animate-pulse-glow'
              : 'btn-3d-orange disabled:opacity-50'
            }`}
        >
          {isLoading ? (
            <>
              <Loader2 size={13} className="animate-spin text-white" />
              <span>SCANNING CLUSTER ({parsedInput.validAddresses.length} WALLETS)...</span>
            </>
          ) : (
            <>
              <span>SCAN CLUSTER ({parsedInput.validAddresses.length})</span>
              <ArrowRight size={13} strokeWidth={3} />
            </>
          )}
        </button>
      </div>

      {error && (
        <div id="bulk-address-error" role="alert" className="flex items-center gap-1.5 text-xs text-[#ef4444] font-bold pt-1 card-3d border-l-4 border-l-[#ef4444] p-2">
          <AlertCircle size={13} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
