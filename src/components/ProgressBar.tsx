'use client';

import React, { useEffect, useState } from 'react';
import { CHAINS, SUPPORTED_CHAIN_IDS } from '@/lib/chains';
import { ShieldCheck, Dna } from 'lucide-react';
import type { LiveScanProgress } from '@/lib/scanProgress';

interface ProgressBarProps {
  message: string;
  progress?: number; // 0-100
  scan?: LiveScanProgress;
}

const PHASE_LABELS: Record<LiveScanProgress['phase'], string> = {
  resolving: 'Preparing scan',
  fetching: 'Fetching wallet history',
  pricing: 'Checking historical prices',
  analyzing: 'Building forensic report',
  finalizing: 'Running final checks',
};

function formatElapsed(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export default function ProgressBar({ message, progress, scan }: ProgressBarProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const selectedChainIds = scan?.chainIds ?? [...SUPPORTED_CHAIN_IDS];
  const completedChainIds = new Set(scan?.completedChainIds ?? []);
  const completedChains = scan?.completedChains ?? 0;
  const totalChains = scan?.totalChains ?? selectedChainIds.length;
  const recordsFound = scan?.recordsFound ?? 0;
  const elapsed = scan ? formatElapsed(now - scan.startedAt) : null;
  const secondsSinceUpdate = scan ? Math.max(0, Math.floor((now - scan.lastUpdatedAt) / 1000)) : 0;
  const providerStatus = secondsSinceUpdate >= 15
    ? `Waiting for a provider response (${secondsSinceUpdate}s since last update). The scan is still running.`
    : 'Live updates active';

  return (
    <div className="card-3d p-6 lg:p-5 text-[#0a0a0a] space-y-5 animate-fade-in-up" aria-busy="true">
      
      {/* ── Top Status Header & Spinning Radar Wheel ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        
        {/* Left: Dual-Ring Spinning Industrial Radar + Live Message */}
        <div className="flex items-center gap-3.5">
          <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
            {/* Outer Spinning Dash Ring */}
            <div className="absolute inset-0 border-2 border-dashed border-[#ff5500] animate-radar rounded-none" />
            {/* Inner Rotating Square */}
            <div className="w-5 h-5 btn-3d-black flex items-center justify-center text-white font-mono text-[9px] font-black">
              <Dna size={12} className="text-[#ff5500] animate-pulse" />
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="led-live" />
              <span className="text-[10px] font-mono font-extrabold tracking-widest text-orange-ink uppercase">
                ACTIVE MULTI-CHAIN PIPELINE
              </span>
            </div>
            <div className="text-sm sm:text-base font-black font-mono text-[#0a0a0a] tracking-tight" role="status" aria-live="polite">
              {message || 'Scanning active chains & resolving on-chain forensics...'}
            </div>
          </div>
        </div>

        {/* Right: Security & Sync Badge */}
        <div className="flex items-center gap-1.5 self-start sm:self-center">
          <span className="badge-3d text-[11px] font-mono font-bold px-2.5 py-1 text-[#0a0a0a] flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-[#059669]" />
            <span>PROVIDER SYNC ACTIVE</span>
          </span>
        </div>

      </div>

      {/* ── High-Tech Animated Laser Progress Bar ── */}
      <div className="space-y-1.5">
        <div
          className="well-recessed h-2.5 w-full relative overflow-hidden"
          role="progressbar"
          aria-label="Wallet scan progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={typeof progress === 'number' ? Math.min(100, Math.max(0, progress)) : undefined}
        >
          {typeof progress === 'number' ? (
            <div
              className="h-full bg-[#ff5500] transition-all duration-300 shadow-sm"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          ) : (
            <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[#ff5500] to-transparent animate-laser opacity-90" />
          )}
        </div>

        <div className="flex justify-between items-center gap-3 text-[10px] font-mono font-bold text-[#4b5563]">
          <span>{scan ? PHASE_LABELS[scan.phase].toUpperCase() : 'INDEXING WALLET HISTORY'}</span>
          <span className="text-[#0a0a0a] uppercase font-mono">{providerStatus}</span>
        </div>
      </div>

      {scan && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" aria-label="Live scan counters">
          <div className="well-recessed px-3 py-2">
            <div className="text-[9px] font-extrabold uppercase tracking-wider text-[#6b7280]">History records found</div>
            <div className="font-mono text-base font-black">{recordsFound.toLocaleString('en-US')}</div>
          </div>
          <div className="well-recessed px-3 py-2">
            <div className="text-[9px] font-extrabold uppercase tracking-wider text-[#6b7280]">Chain progress</div>
            <div className="font-mono text-base font-black">{completedChains} of {totalChains} chains complete</div>
          </div>
          <div className="well-recessed px-3 py-2">
            <div className="text-[9px] font-extrabold uppercase tracking-wider text-[#6b7280]">Elapsed time</div>
            <div className="font-mono text-base font-black">{elapsed}</div>
          </div>
        </div>
      )}

      {/* ── Active Target Chain Chips with Live Pulse Lights ── */}
      <div className="pt-2.5 border-t border-[#c8c8c8] flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[10px] font-extrabold text-[#4b5563] uppercase tracking-wider">
          TARGET NETWORKS:
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedChainIds.map(id => {
            const chain = CHAINS[id];
            if (!chain) return null;
            const isComplete = completedChainIds.has(id) || Boolean(scan && scan.phase !== 'resolving' && scan.phase !== 'fetching');
            return (
              <div
                key={id}
                className="badge-3d inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold text-[#0a0a0a]"
              >
                <span className={isComplete ? 'led-clean' : 'led-live'} />
                <span>{chain.name}</span>
                <span className="text-[8px] text-[#6b7280] uppercase">{isComplete ? 'complete' : 'scanning'}</span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
