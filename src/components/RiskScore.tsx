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
    <div className="card-3d p-6 text-[#0a0a0a] space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider block">
          RISK FACTOR DECOMPOSITION
        </span>
        {results.length > 1 && (
          <span className="btn-3d-neutral text-[10px] font-mono font-bold text-[#0a0a0a] px-2 py-0.5">
            {results.length} CHAINS AUDITED
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        {hasRisks ? (
          factorList.map((f, i) => (
            <div key={i} className="well-recessed-light flex items-start gap-3 p-3 text-xs">
              <div className="mt-0.5 text-[#ff5500] flex-shrink-0">
                {f.severity === 'critical' ? <AlertTriangle size={15} /> : <FileWarning size={15} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-black text-[#0a0a0a]">{f.label}</span>
                    {results.length > 1 && f.chainName && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 bg-[#d0d0d0] text-[#333333]">
                        {f.chainName}
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-black text-[#ff5500]">
                    +{f.impact}
                  </span>
                </div>
                <p className="text-[11px] text-[#4b5563] leading-snug pt-0.5 text-pretty">{f.description}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="well-recessed-light flex items-start gap-3 p-3">
            <div className="mt-0.5 text-green-600 flex-shrink-0">
              <ShieldCheck size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#0a0a0a]">Clean History</span>
                <span className="text-xs font-mono font-bold text-green-700">+0</span>
              </div>
              <p className="text-[11px] text-[#4b5563] leading-snug pt-0.5 text-pretty">
                No significant risk factors detected across {results.length > 1 ? `all ${results.length} scanned chains` : 'the scanned chain'}. This wallet has a clean on-chain record.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
