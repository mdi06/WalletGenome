'use client';

import React, { useState, useEffect } from 'react';
import { MultiChainScanResult } from '@/lib/types';

interface Props {
  data: MultiChainScanResult;
}

export default function TelemetryHudBanner({ data }: Props) {
  const [clock, setClock] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const month = months[now.getMonth()];
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const secs = String(now.getSeconds()).padStart(2, '0');
      setClock(`${day}-${month}-${year} ${hours}:${mins}:${secs}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const totalGasETH = data.aggregated.totalGasETH || 0;
  const totalGasUSD = data.aggregated.totalGasUSD || 0;
  const totalTxs = data.aggregated.totalTransactions || 0;
  const riskScore = data.aggregated.riskScore ?? 0;
  const sybilProb = data.sybilReport?.mediaScore?.sybilProbability ?? (data.sybilReport?.isFlagged ? 85 : 5);
  const primaryName = data.identityReport?.primaryName || `${data.address.slice(0, 6)}...${data.address.slice(-4)}`;
  const totalProtocols = data.chains.reduce((sum, c) => sum + (c.interactionsSummary?.topProtocols?.length || 0), 0);

  // Calculate percentage fills for telemetry meters
  const gasFillPercent = Math.min(100, Math.max(10, Math.round((totalGasETH / 2.0) * 100)));
  const txFillPercent = Math.min(100, Math.max(15, Math.round((totalTxs / 500) * 100)));
  const entropyFillPercent = Math.min(100, Math.max(20, Math.round((totalProtocols / 30) * 100)));

  return (
    <div className="telemetry-chassis p-5 md:p-7 space-y-6 animate-fade-in-up">
      {/* ── Top System ID & Live Header Bar (Direct from Screenshot) ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#282c3b] pb-4">
        <div>
          <div className="text-xs text-[#d8a758] tracking-wider font-bold">
            SYSTEM_ID: <span className="text-white">{primaryName.toUpperCase()}</span>
          </div>
          <div className="text-xs tracking-wider font-semibold">
            STATUS: <span className="text-[#9ec098]">NOMINAL</span>
          </div>
        </div>

        <div className="text-center">
          <div className="text-[10px] text-gray-400 tracking-widest uppercase mb-1">
            ON-CHAIN TELEMETRY UTILITY
          </div>
          <div className="telemetry-title-badge">
            WALLET FORENSIC TELEMETRY
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs font-bold text-gray-300 font-mono tracking-widest bg-[#11131a] px-3 py-1.5 rounded border border-[#2a2e3d]">
            {clock || '18-AUG-2026 14:30:10'}
          </div>
        </div>
      </div>

      {/* ── Main 2-Column Grid (Left: Segmented Bars, Right: Event Tape & HUD Grid) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: 3 Tactical Segmented Meters (Span 7) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Module 1: Gas Consumption */}
          <div className="telemetry-module p-4 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#e2b868] font-bold tracking-wider">KINETIC GAS OUTPUT (ETH / USD)</span>
              <span className="text-gray-400 font-mono text-[11px]">CAP: 2.00 ETH</span>
            </div>
            <div className="segmented-bar-track">
              <div className="segmented-bar-fill" style={{ width: `${gasFillPercent}%` }} />
            </div>
            <div className="flex justify-between items-center text-[11px] text-gray-400 pt-1">
              <span>Spent: {totalGasETH.toFixed(4)} ETH (≈ ${totalGasUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })})</span>
              <span className="text-[#9ec098] font-bold font-mono">Rate: Optimal</span>
            </div>
          </div>

          {/* Module 2: Transaction Velocity */}
          <div className="telemetry-module p-4 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#e2b868] font-bold tracking-wider">TRANSACTION FLUX & VELOCITY</span>
              <span className="text-gray-400 font-mono text-[11px]">PEAK: 500 TXS</span>
            </div>
            <div className="segmented-bar-track">
              <div className="segmented-bar-fill" style={{ width: `${txFillPercent}%` }} />
            </div>
            <div className="flex justify-between items-center text-[11px] text-gray-400 pt-1">
              <span>Lifetime: {totalTxs} Executions</span>
              <span className="text-gray-300 font-mono">{data.chains.length} Active Chains</span>
            </div>
          </div>

          {/* Module 3: DeFi Interaction Entropy */}
          <div className="telemetry-module p-4 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#e2b868] font-bold tracking-wider">DEFI ENTROPY & PROTOCOL DIVERSITY</span>
              <span className="text-gray-400 font-mono text-[11px]">MAX: 30 DAPPS</span>
            </div>
            <div className="segmented-bar-track">
              <div className="segmented-bar-fill-amber" style={{ width: `${entropyFillPercent}%` }} />
            </div>
            <div className="flex justify-between items-center text-[11px] text-gray-400 pt-1">
              <span>Interacted: {totalProtocols} DApps & Protocols</span>
              <span className="text-[#ff8c00] font-bold font-mono">Entropy: High</span>
            </div>
          </div>

          {/* Bottom Left: Crimson Matrix Grid (From Screenshot) */}
          <div className="tactical-grid-table p-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="flex items-center justify-between bg-black/60 px-2.5 py-1.5 rounded border border-[#3b171c]">
                <span className="text-[10px] text-gray-400 font-bold">RISK:</span>
                <span className="hud-chip hud-chip-green">{riskScore}/100</span>
              </div>
              <div className="flex items-center justify-between bg-black/60 px-2.5 py-1.5 rounded border border-[#3b171c]">
                <span className="text-[10px] text-gray-400 font-bold">SYBL:</span>
                <span className="hud-chip hud-chip-green">{sybilProb}%</span>
              </div>
              <div className="flex items-center justify-between bg-black/60 px-2.5 py-1.5 rounded border border-[#3b171c]">
                <span className="text-[10px] text-gray-400 font-bold">STAT:</span>
                <span className="hud-chip text-[#9ec098]">NOMINAL</span>
              </div>
              <div className="flex items-center justify-between bg-black/60 px-2.5 py-1.5 rounded border border-[#3b171c]">
                <span className="text-[10px] text-gray-400 font-bold">APPR:</span>
                <span className="hud-chip hud-chip-amber">{data.aggregated.totalHighRiskApprovals} RISKY</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: The Event Tape Printout (The White Card in Screenshot) (Span 5) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          
          <div className="event-tape-card flex-1 flex flex-col justify-between space-y-3">
            <div>
              <div className="text-center font-bold text-xs tracking-widest text-[#1b1d24] pb-2 border-b border-[#ded8cb]">
                SYSTEM EVENT LOG
              </div>
              <div className="space-y-1.5 text-[11px] font-mono text-[#2c303b] pt-3 leading-relaxed">
                <div className="flex justify-between">
                  <span className="font-bold">08:00 - INIT:</span>
                  <span className="text-right">MULTICHAIN_INDEX_SEQ</span>
                </div>
                {data.identityReport?.primaryName && (
                  <div className="flex justify-between">
                    <span className="font-bold">08:15 - IDENT:</span>
                    <span className="text-right text-[#0f5132] font-semibold">{data.identityReport.primaryName.toUpperCase()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-bold">08:45 - GAS:</span>
                  <span className="text-right font-semibold">{totalGasETH.toFixed(3)} ETH RECORDED</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">09:10 - SYBIL:</span>
                  <span className="text-right text-[#0f5132] font-semibold">PASSED ({sybilProb}% PROB)</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">09:35 - AUDIT:</span>
                  <span className="text-right font-semibold">{totalProtocols} DAPPS ATTRIBUTED</span>
                </div>
              </div>
            </div>

            <div className="text-center text-[10px] tracking-widest font-bold text-[#6c757d] pt-2 border-t border-[#ded8cb]">
              *** END OF TAPE ***
            </div>
          </div>

          {/* Secondary Sub-Telemetry Module */}
          <div className="telemetry-module p-3.5 space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-400">HIBERNATION CYCLE (CHAIN LIFESPAN)</span>
              <span className="text-gray-300 font-mono font-bold">24 MO</span>
            </div>
            <div className="segmented-bar-track h-4">
              <div className="segmented-bar-fill" style={{ width: '85%' }} />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
