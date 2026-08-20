'use client';

import React from 'react';
import { ScanResult, RiskFactor } from '@/lib/types';
import { AlertTriangle, FileWarning, ShieldCheck } from 'lucide-react';

interface Props {
  results: ScanResult[];
}

export default function RiskScore({ results }: Props) {
  if (!results || results.length === 0) return null;

  // Aggregate all risk factors across all scanned chains
  const factorList: Array<RiskFactor & { chainName: string; chainId: number }> = [];

  results.forEach(r => {
    const chainName = r.chainName || `Chain ${r.chainId}`;
    if (r.riskAssessment?.factors) {
      r.riskAssessment.factors.forEach(f => {
        if (f.label !== 'Clean History' && f.impact > 0) {
          factorList.push({
            ...f,
            chainName,
            chainId: r.chainId,
          });
        }
      });
    }
  });

  // Sort by impact descending
  factorList.sort((a, b) => b.impact - a.impact);

  const hasRisks = factorList.length > 0;

  return (
    <div className="card-3d p-5 text-[#0a0a0a] space-y-4">
      <div className="flex justify-between items-center gap-2">
        <span className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider block">
          RISK FACTOR DECOMPOSITION
        </span>
        {results.length > 1 && (
          <span className="btn-3d-neutral text-[10px] font-mono font-bold text-[#0a0a0a] px-2 py-0.5 whitespace-nowrap flex-shrink-0">
            {results.length} CHAINS AUDITED
          </span>
        )}
      </div>

      <div className="space-y-3">
        {hasRisks ? (
          factorList.map((f, i) => (
            <div key={i} className="well-recessed-light p-3.5 space-y-2 text-xs">
              {/* Top Row: Icon + Label + Score */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <div className="mt-0.5 text-[#ff5500] flex-shrink-0">
                    {f.severity === 'critical' ? <AlertTriangle size={15} /> : <FileWarning size={15} />}
                  </div>
                  <div className="min-w-0">
                    <span className="font-black text-[#0a0a0a] text-xs leading-snug block">
                      {f.label}
                    </span>
                  </div>
                </div>

                <span className="font-mono font-black text-[#ff5500] text-xs flex-shrink-0 pl-1 pt-0.5">
                  +{f.impact}
                </span>
              </div>

              {/* Chain Badge (If Multi-Chain) */}
              {results.length > 1 && f.chainName && (
                <div className="pl-6">
                  <span className="inline-block text-[9px] font-mono font-bold px-2 py-0.5 bg-[#d8dade] text-[#1f2937] border border-[#c4c6cc]">
                    {f.chainName}
                  </span>
                </div>
              )}

              {/* Description */}
              <p className="text-[11px] text-[#4b5563] leading-relaxed pl-6 text-pretty">
                {f.description}
              </p>
            </div>
          ))
        ) : (
          <div className="well-recessed-light p-3.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="text-green-600 flex-shrink-0">
                  <ShieldCheck size={15} />
                </div>
                <span className="text-xs font-bold text-[#0a0a0a]">Clean History</span>
              </div>
              <span className="text-xs font-mono font-bold text-green-700 flex-shrink-0">+0</span>
            </div>
            <p className="text-[11px] text-[#4b5563] leading-relaxed pl-6 text-pretty">
              No significant risk factors detected across {results.length > 1 ? `all ${results.length} scanned chains` : 'the scanned chain'}. This wallet has a clean on-chain record.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
