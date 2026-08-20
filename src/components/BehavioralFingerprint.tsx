'use client';

import React from 'react';
import { ScanResult } from '@/lib/types';

interface Props {
  results: ScanResult[];
}

export default function BehavioralFingerprint({ results }: Props) {
  if (!results || results.length === 0) return null;

  // Aggregate multi-chain metrics
  const totalUniqueContracts = results.reduce((sum, r) => sum + (r.fingerprint?.uniqueContracts || 0), 0);
  const maxActiveMonths = Math.max(...results.map(r => r.fingerprint?.activeMonths || 0), 1);

  // Dimension axes definition
  const dimensionAxes = [
    'DeFi Diversity',
    'Activity',
    'Capital Efficiency',
    'Risk Appetite',
    'Maturity',
    'Network Breadth',
  ];

  const dimensions = dimensionAxes.map(axis => {
    const matchingDims = results
      .map(r => {
        const dim = r.fingerprint?.dimensions?.find(d => d.axis === axis || d.axis.toLowerCase().includes(axis.toLowerCase()));
        return {
          dim,
          chainName: r.chainName || `Chain ${r.chainId}`,
        };
      })
      .filter((item): item is { dim: NonNullable<typeof item.dim>; chainName: string } => Boolean(item.dim));

    if (matchingDims.length === 0) {
      return {
        axis,
        score: 0,
        detail: 'No activity detected',
      };
    }

    const avgScore = Math.round(
      matchingDims.reduce((sum, item) => sum + item.dim.score, 0) / matchingDims.length
    );

    let detail = matchingDims[0].dim.detail;
    if (results.length > 1) {
      detail = matchingDims.map(m => `${m.chainName}: ${m.dim.score}/100`).join(' · ');
    }

    return {
      axis,
      score: avgScore,
      detail,
    };
  });

  return (
    <div className="card-3d p-6 text-[#0a0a0a] space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider">
          6-DIMENSION QUANTITATIVE BREAKDOWN
        </span>
        <span className="btn-3d-neutral text-xs font-bold text-[#0a0a0a] font-mono px-2 py-0.5">
          {totalUniqueContracts} Contracts · {maxActiveMonths} Months
        </span>
      </div>

      <div className="space-y-4 pt-1">
        {dimensions.map((dim, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-[#0a0a0a]">{dim.axis}</span>
              <span className="font-mono font-bold text-[#0a0a0a]">{dim.score} / 100</span>
            </div>
            <div className="h-2.5 well-recessed overflow-hidden">
              <div
                className={`h-full transition-all ${
                  dim.score > 70 ? 'bg-[#ff5500]' : 'bg-[#0a0a0a]'
                }`}
                style={{ width: `${dim.score}%` }}
              />
            </div>
            <p className="text-[11px] text-[#4b5563] truncate font-medium" title={dim.detail}>{dim.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
