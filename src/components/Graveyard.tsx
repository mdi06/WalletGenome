'use client';

import { ScanResult, DeadAsset } from '@/lib/types';
import { ExternalLink } from 'lucide-react';
import { getExplorerAddressUrl } from '@/lib/chains';

interface Props {
  results: ScanResult[];
}

export default function Graveyard({ results }: Props) {
  const allDead: (DeadAsset & { chainName: string })[] = [];
  let totalPeakValueLost = 0;
  
  for (const r of results) {
    if (r.graveyardSummary) {
      totalPeakValueLost += r.graveyardSummary.totalPeakValueLost || 0;
      for (const d of r.graveyardSummary.deadAssets || []) {
        allDead.push({ ...d, chainName: r.chainName });
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card (Sharp Square Toned Gray Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 bg-[#dedede] border border-[#cecece] text-[#0a0a0a] space-y-1 shadow-sm">
          <div className="text-[11px] font-extrabold text-[#555555] uppercase tracking-wider">
            TOTAL DEAD ASSETS
          </div>
          <div className="text-3xl font-black text-[#0a0a0a] font-mono">
            {allDead.length}
          </div>
          <div className="text-xs font-bold text-[#555555]">
            Tokens with zero liquidity, abandoned pools, or dead contracts
          </div>
        </div>

        <div className="p-5 bg-[#dedede] border border-[#cecece] text-[#0a0a0a] space-y-1 shadow-sm">
          <div className="text-[11px] font-extrabold text-[#555555] uppercase tracking-wider">
            PEAK ESTIMATED VALUE LOST
          </div>
          <div className="text-3xl font-black text-[#dc2626] font-mono">
            ${totalPeakValueLost.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs font-bold text-[#555555]">
            Historical peak valuation that has depreciated to $0
          </div>
        </div>
      </div>

      {/* Dead Assets Table */}
      {allDead.length > 0 ? (
        <div className="border border-[#cecece] bg-[#dedede] overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#d4d4d4] border-b border-[#cecece] text-[10px] font-extrabold text-[#555555] uppercase tracking-wider">
                <th className="py-3 px-4">TOKEN</th>
                <th className="py-3 px-4">BALANCE</th>
                <th className="py-3 px-4 text-right">PEAK VALUE</th>
                <th className="py-3 px-4">CHAIN</th>
                <th className="py-3 px-4 text-right">CONTRACT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#cecece] text-xs font-bold text-[#0a0a0a]">
              {allDead.map((d, i) => (
                <tr key={i} className="hover:bg-[#d5d5d5] transition-colors">
                  <td className="py-3.5 px-4 font-mono font-black text-[#0a0a0a]">
                    {d.tokenSymbol || d.tokenName}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#0a0a0a]">
                    {d.balance.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-black text-[#dc2626]">
                    {d.peakValueUSD ? `$${d.peakValueUSD.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#555555] text-[11px]">
                    {d.chainName}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <a
                      href={getExplorerAddressUrl(d.chainId, d.contractAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#555555] hover:text-black"
                    >
                      <ExternalLink size={13} className="ml-auto" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center bg-[#dedede] border border-[#cecece] text-xs font-bold text-[#555555] font-mono">
          NO DEAD ASSETS DETECTED IN THIS WALLET
        </div>
      )}
    </div>
  );
}
