'use client';

import React from 'react';
import { SybilReport } from '@/lib/types';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

interface Props {
  report?: SybilReport;
}

export default function SybilRadar({ report }: Props) {
  if (!report) return null;

  const sybilProb = report.mediaScore?.sybilProbability ?? null;
  const blacklistMatches = report.matches.filter(match => match.databaseId !== 'trusta' && match.flagged);
  const hasBlacklistMatch = blacklistMatches.length > 0;
  const isClean = !hasBlacklistMatch && sybilProb !== null && sybilProb <= 30;
  const isSuspicious = !hasBlacklistMatch && sybilProb !== null && sybilProb > 30 && sybilProb <= 60;

  const verdictLabel = hasBlacklistMatch
    ? 'Blacklist Match'
    : sybilProb === null
      ? 'Behavioral Score Unavailable'
      : isClean
        ? 'Organic-Like Behavior'
        : isSuspicious
          ? 'Moderate Activity / Farmer'
          : 'High Sybil Risk';

  const explanation = hasBlacklistMatch
    ? `Positive match in ${blacklistMatches.map(match => match.databaseName).join(', ')}. The ${sybilProb === null ? 'unavailable' : `${sybilProb}%`} behavioral risk score is separate from blacklist status.`
    : report.mediaScore?.explanation ?? 'Behavioral risk scoring is unavailable for this scan.';
  const scoreNote = 'Local MEDIA-style heuristic; not a live Trusta score.';

  return (
    <section aria-labelledby="behavioral-sybil-risk-heading" className="card-3d flex min-w-0 flex-col items-start justify-between gap-4 p-3 text-[#0a0a0a] sm:p-4 md:flex-row md:items-center md:p-5">
      {/* Left: Behavioral Sybil Risk & Verdict */}
      <div className="flex min-w-0 w-full items-start gap-3 md:w-auto md:gap-4">
        <div
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center border badge-3d ${
            hasBlacklistMatch
              ? 'bg-[#dc2626]/15 text-[#b91c1c] border-[#dc2626]/40'
              : isClean
              ? 'bg-[#059669]/15 text-[#047857] border-[#059669]/40'
              : isSuspicious
              ? 'bg-[#f59e0b]/15 text-[#b45309] border-[#f59e0b]/40'
              : 'bg-[#dc2626]/15 text-[#b91c1c] border-[#dc2626]/40'
          }`}
        >
          {isClean ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 md:gap-2">
            <span id="behavioral-sybil-risk-heading" className="basis-full text-[11px] font-extrabold uppercase tracking-wider text-[#4b5563] md:basis-auto">
              BEHAVIORAL SYBIL RISK
            </span>
            <span className="shrink-0 text-sm font-black text-[#0a0a0a] font-mono">
              {sybilProb === null ? 'Unavailable' : `${sybilProb}%`}
            </span>
            <span
              className={`badge-3d shrink-0 border px-2 py-0.5 text-[11px] font-bold ${
                hasBlacklistMatch
                  ? 'bg-[#dc2626]/15 text-[#b91c1c] border-[#dc2626]/40'
                  : isClean
                  ? 'bg-[#059669]/15 text-[#047857] border-[#059669]/40'
                  : isSuspicious
                  ? 'bg-[#f59e0b]/15 text-[#b45309] border-[#f59e0b]/40'
                  : 'bg-[#dc2626]/15 text-[#b91c1c] border-[#dc2626]/40'
              }`}
            >
              {verdictLabel}
            </span>
          </div>
          <p className="w-full max-w-xl pt-1 text-xs font-medium leading-normal text-[#374151] text-pretty">
            {explanation}
          </p>
          <p className="w-full max-w-xl text-[10px] leading-normal text-[#6b7280] font-mono">
            {scoreNote}
          </p>
        </div>
      </div>

      {/* Right: Database Sync 3D Pills */}
      <div className="grid w-full min-w-0 grid-cols-1 gap-2 md:flex md:w-auto md:flex-wrap md:justify-end">
        {report.matches.map(m => {
          const isFlagged = m.flagged;
          const isBehaviorUnavailable = m.databaseId === 'trusta' && sybilProb === null;
          return (
            <div
              key={m.databaseId}
              className="btn-3d-neutral grid w-full min-w-0 grid-cols-[minmax(0,1fr)_max-content] items-center gap-2 px-3 py-2 text-xs font-bold text-[#0a0a0a] md:h-8 md:w-[180px] md:min-h-0 md:grid-cols-[minmax(0,1fr)_max-content] md:px-3 md:py-0"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                {isFlagged ? (
                  <span className="w-2 h-2 rounded-full bg-[#dc2626] shadow-sm animate-pulse flex-shrink-0" />
                ) : isBehaviorUnavailable ? (
                  <span className="w-2 h-2 rounded-full bg-[#9ca3af] flex-shrink-0" />
                ) : (
                  <span className="led-clean rounded-full flex-shrink-0" />
                )}
                <span className="min-w-0 break-words leading-snug">{formatDbName(m.databaseId)}</span>
              </div>
              <span className={`shrink-0 text-right text-[10px] font-mono font-bold ${
                isFlagged ? 'text-[#dc2626]' : isBehaviorUnavailable ? 'text-[#6b7280]' : 'text-[#047857]'
              }`}>
                {isFlagged ? 'FLAGGED' : isBehaviorUnavailable ? 'UNAVAILABLE' : 'CLEAN'}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function formatDbName(id: string): string {
  switch (id) {
    case 'arbitrumFoundation': return 'Arbitrum Foundation';
    case 'layerzero': return 'LayerZero Sybil';
    case 'hop': return 'Hop Protocol';
    case 'umbra': return 'Umbra Mixer';
    case 'ofac': return 'OFAC Sanctions';
    case 'trusta': return 'Behavioral heuristic';
    default: return id;
  }
}
