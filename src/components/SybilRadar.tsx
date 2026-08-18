'use client';

import React from 'react';
import { SybilReport } from '@/lib/types';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  report?: SybilReport;
}

export default function SybilRadar({ report }: Props) {
  if (!report) return null;

  const sybilProb = report.mediaScore?.sybilProbability ?? (report.isFlagged ? 85 : 0.02);
  const isClean = sybilProb <= 30;
  const isSuspicious = sybilProb > 30 && sybilProb <= 60;
  const isHighRisk = sybilProb > 60;

  const verdictLabel = isClean
    ? 'Organic Human'
    : isSuspicious
    ? 'Moderate Activity / Farmer'
    : 'High Sybil Risk';

  const explanation = report.mediaScore?.explanation || (
    isClean
      ? 'Behavior matches an organic power user across multi-month engagement, healthy capital depth, and cross-protocol diversity.'
      : isSuspicious
      ? 'Moderate on-chain footprint; exhibits repetitive interaction patterns or lower capital retention.'
      : 'Elevated automation risk: Short activity lifespan, scripted execution bursts, or flagged in public airdrop exclusions.'
  );

  return (
    <div className="p-5 bg-[#dedede] border border-[#cecece] text-[#0a0a0a] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
      {/* Left: Sybil Probability & Verdict */}
      <div className="flex items-center gap-4">
        <div
          className={`w-11 h-11 border flex items-center justify-center flex-shrink-0 ${
            isClean
              ? 'bg-[#059669]/10 text-[#059669] border-[#059669]/30'
              : isSuspicious
              ? 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30'
              : 'bg-[#dc2626]/10 text-[#dc2626] border-[#dc2626]/30'
          }`}
        >
          {isClean ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold text-[#555555] uppercase tracking-wider">
              SYBIL PROBABILITY
            </span>
            <span className="text-sm font-black text-[#0a0a0a] font-mono">
              {sybilProb}%
            </span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 border ${
                isClean
                  ? 'bg-[#059669]/10 text-[#059669] border-[#059669]/30'
                  : isSuspicious
                  ? 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30'
                  : 'bg-[#dc2626]/10 text-[#dc2626] border-[#dc2626]/30'
              }`}
            >
              {verdictLabel}
            </span>
          </div>
          <p className="text-xs text-[#444444] max-w-xl pt-0.5 leading-normal font-medium">
            {explanation}
          </p>
        </div>
      </div>

      {/* Right: Database Sync Pills */}
      <div className="flex items-center gap-1.5 flex-wrap justify-start md:justify-end">
        {report.matches.map(m => {
          const isFlagged = m.flagged;
          return (
            <div
              key={m.databaseId}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#d4d4d4] border border-[#c4c4c4] text-xs font-bold text-[#0a0a0a]"
            >
              {isFlagged ? (
                <XCircle size={12} className="text-[#dc2626]" />
              ) : (
                <CheckCircle2 size={12} className="text-[#059669]" />
              )}
              <span>{formatDbName(m.databaseId)}</span>
              <span className={`text-[10px] font-mono font-bold ${isFlagged ? 'text-[#dc2626]' : 'text-[#059669]'}`}>
                {isFlagged ? 'FLAGGED' : 'CLEAN'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDbName(id: string): string {
  switch (id) {
    case 'layerzero': return 'LayerZero Sybil';
    case 'hop': return 'Hop Protocol';
    case 'umbra': return 'Umbra Mixer';
    case 'ofac': return 'OFAC Sanctions';
    case 'trusta': return 'Trusta MEDIA';
    default: return id;
  }
}
