'use client';

import { useState } from 'react';
import { Check, Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { CHAINS } from '@/lib/chains';
import type { IndexingStatus } from '@/lib/indexingStatus';
import type { MultiChainScanResult } from '@/lib/types';

interface LoadedScanSummaryProps {
  address: string;
  chainIds: readonly number[];
  evidenceMode: IndexingStatus;
  onEdit: () => void;
  data?: MultiChainScanResult;
  onRefresh?: () => void;
  isLoading?: boolean;
}

const EVIDENCE_LABELS: Record<IndexingStatus, string> = {
  ready: 'Ready',
  scanning: 'Scanning',
  completed: 'Live scan',
  saved: 'Saved snapshot',
  partial: 'Partial evidence',
  unavailable: 'Evidence unavailable',
};

export default function LoadedScanSummary({
  address,
  chainIds,
  evidenceMode,
  onEdit,
  data,
  onRefresh,
  isLoading = false,
}: LoadedScanSummaryProps) {
  const [showFullAddress, setShowFullAddress] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const chainNames = chainIds.map(chainId => CHAINS[chainId]?.name ?? 'Chain ' + chainId).join(', ');
  const shortAddress = address.length > 16
    ? address.slice(0, 8) + '…' + address.slice(-6)
    : address;
  const cacheMetadata = data?.cacheMetadata;
  const historyCacheCount = cacheMetadata?.historyDatasets?.filter(dataset => dataset.source !== 'live').length ?? 0;
  const fetchedLabel = cacheMetadata
    ? new Intl.DateTimeFormat('en', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short',
      }).format(new Date(cacheMetadata.fetchedAt))
    : null;
  const evidenceLabel = data?.cached ? 'Cached result' : EVIDENCE_LABELS[evidenceMode];

  const handleCopy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(address);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  };

  return (
    <section aria-label="Loaded scan summary" className="card-3d flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between md:gap-1 md:p-2">
      <div className="min-w-0 space-y-1 md:space-y-0.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#4b5563]">Loaded wallet scan</span>
          <span className="badge-3d bg-[#d0d0d0] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0a0a0a]">
            {evidenceLabel}
          </span>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="min-w-0 flex-1 break-all text-sm font-black text-[#0a0a0a] md:text-base" title={address}>
            <span className="md:hidden">{shortAddress}</span>
            <span className="hidden md:inline">{address}</span>
          </h2>
          <div className="flex shrink-0 items-center gap-1 md:hidden">
            <button
              type="button"
              aria-expanded={showFullAddress}
              aria-controls="loaded-scan-full-address"
              aria-label={showFullAddress ? 'Hide full wallet address' : 'View full wallet address'}
              onClick={() => setShowFullAddress(current => !current)}
              className="btn-3d-neutral inline-flex min-h-11 items-center gap-1 px-2 text-[10px] font-black uppercase tracking-wider text-[#0a0a0a]"
            >
              {showFullAddress ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}
              <span>{showFullAddress ? 'Hide address' : 'Full address'}</span>
            </button>
            <button
              type="button"
              aria-label="Copy wallet address"
              title="Copy wallet address"
              onClick={() => void handleCopy()}
              className="btn-3d-neutral inline-flex min-h-11 min-w-11 items-center justify-center text-[#4b5563]"
            >
              {copyStatus === 'copied' ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
            </button>
          </div>
          <span className="sr-only" role="status" aria-live="polite">
            {copyStatus === 'copied' ? 'Wallet address copied.' : copyStatus === 'failed' ? 'Unable to copy wallet address.' : ''}
          </span>
        </div>
        <div id="loaded-scan-full-address" hidden={!showFullAddress} className="border border-[#c8c8c8] bg-[#f5f5f5] px-2 py-2 font-mono text-[11px] leading-relaxed text-[#0a0a0a] md:hidden">
            <span className="break-all">{address}</span>
        </div>
        <dl className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] font-bold uppercase tracking-wider text-[#4b5563]">
          <div>
            <dt className="inline">Networks: </dt>
            <dd className="inline normal-case">{chainNames || 'None selected'}</dd>
          </div>
          {fetchedLabel && (
            <div>
              <dt className="inline">{data?.cached ? 'Fetched: ' : 'Scanned: '}</dt>
              <dd className="inline normal-case">{fetchedLabel}</dd>
            </div>
          )}
          {historyCacheCount > 0 && (
            <div>
              <dt className="inline">History: </dt>
              <dd className="inline normal-case">{historyCacheCount} cached dataset{historyCacheCount === 1 ? '' : 's'}</dd>
            </div>
          )}
        </dl>
      </div>
      <div className="flex w-full shrink-0 flex-col gap-2 md:w-auto md:flex-row">
        {onRefresh && data?.cacheMetadata && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Refresh wallet data (limited to once every five minutes)"
            className="btn-3d-neutral inline-flex min-h-11 w-full items-center justify-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider text-[#0a0a0a] disabled:cursor-wait disabled:opacity-60 md:min-h-9 md:w-auto md:py-1.5"
            title="Refresh is limited to once every five minutes per caller"
          >
            <RefreshCw size={13} aria-hidden="true" className={isLoading ? 'animate-spin' : ''} />
            {isLoading ? 'Refreshing…' : 'Refresh data'}
          </button>
        )}
        <button
          type="button"
          onClick={onEdit}
          className="btn-3d-neutral inline-flex min-h-11 w-full items-center justify-center px-4 py-2 text-xs font-black uppercase tracking-wider text-[#0a0a0a] md:min-h-9 md:w-auto md:py-1.5"
        >
          Edit scan
        </button>
      </div>
    </section>
  );
}
