'use client';

import React from 'react';
import { ScanResult } from '@/lib/types';

interface Props {
  results: ScanResult[];
}

export default function BehavioralFingerprint({ results }: Props) {
  const fp = results[0]?.fingerprint;
  if (!fp || !fp.dimensions) return null;

  return (
    <div className="p-6 bg-[#dedede] border border-[#cecece] text-[#0a0a0a] space-y-4 shadow-sm">
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-extrabold text-[#555555] uppercase tracking-wider">
          6-DIMENSION QUANTITATIVE BREAKDOWN
        </span>
        <span className="text-xs font-bold text-[#555555] font-mono">
          {fp.uniqueContracts} Contracts · {fp.activeMonths} Months
        </span>
      </div>

      <div className="space-y-4 pt-1">
        {fp.dimensions.map((dim, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-[#0a0a0a]">{dim.axis}</span>
              <span className="font-mono font-bold text-[#0a0a0a]">{dim.score} / 100</span>
            </div>
            <div className="h-2 bg-[#cecece] overflow-hidden">
              <div
                className={`h-full transition-all ${
                  dim.score > 70 ? 'bg-[#ff5500]' : 'bg-[#0a0a0a]'
                }`}
                style={{ width: `${dim.score}%` }}
              />
            </div>
            <p className="text-[11px] text-[#555555]">{dim.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
