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
    <div className="p-6 bg-[#dedede] border border-[#cecece] text-[#0a0a0a] space-y-4 shadow-sm">
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-extrabold text-[#555555] uppercase tracking-wider block">
          RISK FACTOR DECOMPOSITION
        </span>
        {results.length > 1 && (
          <span className="text-[10px] font-mono font-bold text-[#555555]">
            {results.length} CHAINS AUDITED
          </span>
        )}
      </div>

      <div className="space-y-3">
        {hasRisks ? (
          factorList.map((f, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-[#d5d5d5] border border-[#c8c8c8]">
              <div className="mt-0.5 text-[#ff5500]">
                {f.severity === 'critical' ? <AlertTriangle size={15} /> : <FileWarning size={15} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-xs font-bold text-[#0a0a0a]">{f.label}</span>
                    {results.length > 1 && f.chainName && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 bg-[#cecece] text-[#333333]">
                        {f.chainName}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono font-bold text-[#ff5500]">
                    +{f.impact}
                  </span>
                </div>
                <p className="text-[11px] text-[#555555] leading-snug pt-0.5">{f.description}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-start gap-3 p-3 bg-[#d5d5d5] border border-[#c8c8c8]">
            <div className="mt-0.5 text-green-600">
              <ShieldCheck size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#0a0a0a]">Clean History</span>
                <span className="text-xs font-mono font-bold text-green-700">+0</span>
              </div>
              <p className="text-[11px] text-[#555555] leading-snug pt-0.5">
                No significant risk factors detected across {results.length > 1 ? `all ${results.length} scanned chains` : 'the scanned chain'}. This wallet has a clean on-chain record.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
