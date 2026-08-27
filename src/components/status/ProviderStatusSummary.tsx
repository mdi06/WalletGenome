'use client';

import type { ReactNode } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';

interface ProviderStatusSummaryProps {
  title: string;
  summary: string;
  tone: 'warning' | 'unavailable';
  children: ReactNode;
}

export default function ProviderStatusSummary({
  title,
  summary,
  tone,
  children,
}: ProviderStatusSummaryProps) {
  const toneClasses = tone === 'unavailable'
    ? {
        container: 'border-[#dc2626] bg-[#fef2f2] text-[#7f1d1d]',
        icon: 'text-[#dc2626]',
        detail: 'border-[#dc2626]/30 bg-white/70',
      }
    : {
        container: 'border-[#d97706] bg-[#fffbeb] text-[#78350f]',
        icon: 'text-[#d97706]',
        detail: 'border-[#d97706]/30 bg-white/70',
      };

  return (
    <details className={`animate-fade-in-up overflow-hidden border-2 ${toneClasses.container}`}>
      <summary className="group flex min-h-11 md:min-h-10 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 md:py-2 font-bold outline-none focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#963300] [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-start gap-2.5">
          <AlertTriangle size={16} aria-hidden="true" className={`mt-0.5 shrink-0 ${toneClasses.icon}`} />
          <span className="min-w-0">
            <span className="block text-sm font-black uppercase tracking-wider">{title}</span>
            <span className="mt-0.5 block text-xs font-bold">{summary}</span>
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-black uppercase tracking-wider">
          Details
          <ChevronDown size={15} aria-hidden="true" className="transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className={`space-y-4 md:space-y-3 border-t-2 p-4 md:p-3 ${toneClasses.detail}`} role="region" aria-label={`${title} details`}>
        {children}
      </div>
    </details>
  );
}
