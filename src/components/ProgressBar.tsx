'use client';

import React from 'react';
import { CHAINS, SUPPORTED_CHAIN_IDS } from '@/lib/chains';
import { ShieldCheck, Dna } from 'lucide-react';

interface ProgressBarProps {
  message: string;
  progress?: number; // 0-100
}

export default function ProgressBar({ message, progress }: ProgressBarProps) {
  return (
    <div className="p-6 bg-[#dedede] border border-[#cecece] shadow-sm space-y-5 animate-fade-in-up">
      
      {/* ── Top Status Header & Spinning Radar Wheel ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        
        {/* Left: Dual-Ring Spinning Industrial Radar + Live Message */}
        <div className="flex items-center gap-3.5">
          <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
            {/* Outer Spinning Dash Ring */}
            <div className="absolute inset-0 border-2 border-dashed border-[#ff5500] animate-radar rounded-none" />
            {/* Inner Rotating Square */}
            <div className="w-5 h-5 bg-black flex items-center justify-center text-white font-mono text-[9px] font-black">
              <Dna size={12} className="text-[#ff5500] animate-pulse" />
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#ff5500] animate-pulse-dot flex-shrink-0" />
              <span className="text-[10px] font-mono font-extrabold tracking-widest text-[#ff5500] uppercase">
                ACTIVE MULTI-CHAIN PIPELINE
              </span>
            </div>
            <div className="text-sm sm:text-base font-black font-mono text-[#0a0a0a] tracking-tight">
              {message || 'Scanning active chains & resolving on-chain forensics...'}
            </div>
          </div>
        </div>

        {/* Right: Security & Sync Badge */}
        <div className="flex items-center gap-1.5 self-start sm:self-center">
          <span className="text-[11px] font-mono font-bold px-2.5 py-1 bg-[#d4d4d4] border border-[#c4c4c4] text-[#0a0a0a] flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-[#059669]" />
            <span>RPC & WEB3.BIO SYNC</span>
          </span>
        </div>

      </div>

      {/* ── High-Tech Animated Laser Progress Bar ── */}
      <div className="space-y-1.5">
        <div className="h-2 w-full bg-[#cecece] relative overflow-hidden">
          {typeof progress === 'number' ? (
            <div
              className="h-full bg-[#ff5500] transition-all duration-300 shadow-sm"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          ) : (
            <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[#ff5500] to-transparent animate-laser opacity-90" />
          )}
        </div>

        <div className="flex justify-between items-center text-[10px] font-mono font-bold text-[#555555]">
          <span>INDEXING CALLED CONTRACTS & TRANSFERS</span>
          <span className="text-[#0a0a0a] uppercase">PARALLEL THREADS: 5</span>
        </div>
      </div>

      {/* ── Active Target Chain Chips with Live Pulse Lights ── */}
      <div className="pt-2 border-t border-[#cecece] flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[10px] font-extrabold text-[#555555] uppercase tracking-wider">
          TARGET NETWORKS:
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {SUPPORTED_CHAIN_IDS.map(id => {
            const chain = CHAINS[id];
            return (
              <div
                key={id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#d4d4d4] border border-[#c4c4c4] text-[10px] font-mono font-bold text-[#0a0a0a]"
              >
                <span className="w-1.5 h-1.5 bg-[#059669] animate-pulse-dot" />
                <span>{chain.name}</span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
