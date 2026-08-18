'use client';

import React from 'react';
import { ScanResult } from '@/lib/types';
import { AlertTriangle, FileWarning } from 'lucide-react';

interface Props {
  results: ScanResult[];
}

export default function RiskScore({ results }: Props) {
  const result = results[0];
  if (!result || !result.riskAssessment) return null;

  const { factors } = result.riskAssessment;

  return (
    <div className="p-6 bg-[#dedede] border border-[#cecece] text-[#0a0a0a] space-y-4 shadow-sm">
      <span className="text-[11px] font-extrabold text-[#555555] uppercase tracking-wider block">
        RISK FACTOR DECOMPOSITION
      </span>

      <div className="space-y-3">
        {factors.map((f, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-[#d5d5d5] border border-[#c8c8c8]">
            <div className="mt-0.5 text-[#ff5500]">
              {f.severity === 'critical' ? <AlertTriangle size={15} /> : <FileWarning size={15} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#0a0a0a]">{f.label}</span>
                <span className="text-xs font-mono font-bold text-[#ff5500]">
                  +{f.impact}
                </span>
              </div>
              <p className="text-[11px] text-[#555555] leading-snug pt-0.5">{f.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
