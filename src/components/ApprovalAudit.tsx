'use client';

import { ScanResult, TokenApproval } from '@/lib/types';
import { getExplorerAddressUrl } from '@/lib/chains';
import { ExternalLink } from 'lucide-react';

interface Props {
  results: ScanResult[];
}

export default function ApprovalAudit({ results }: Props) {
  const allApprovals: (TokenApproval & { chainName: string })[] = [];
  for (const r of results) {
    if (r.approvalSummary?.activeApprovals) {
      for (const a of r.approvalSummary.activeApprovals) {
        allApprovals.push({ ...a, chainName: r.chainName });
      }
    }
  }

  const totalApprovals = allApprovals.length;
  const highRisk = allApprovals.filter(a => a.riskLevel === 'high').length;
  const unlimited = allApprovals.filter(a => a.isUnlimited).length;

  return (
    <div className="space-y-6">
      {/* Top Metric Cards (Sharp Square Toned Gray Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-[#dedede] border border-[#cecece] text-[#0a0a0a] space-y-1 shadow-sm">
          <div className="text-[11px] font-extrabold text-[#555555] uppercase tracking-wider">TOTAL ACTIVE PERMISSIONS</div>
          <div className="text-3xl font-black text-[#0a0a0a] font-mono">{totalApprovals}</div>
        </div>

        <div className="p-5 bg-[#dedede] border border-[#cecece] text-[#0a0a0a] space-y-1 shadow-sm">
          <div className="text-[11px] font-extrabold text-[#555555] uppercase tracking-wider">HIGH RISK EXPOSURE</div>
          <div className="text-3xl font-black text-[#dc2626] font-mono">{highRisk}</div>
        </div>

        <div className="p-5 bg-[#dedede] border border-[#cecece] text-[#0a0a0a] space-y-1 shadow-sm">
          <div className="text-[11px] font-extrabold text-[#555555] uppercase tracking-wider">UNLIMITED ALLOWANCES</div>
          <div className="text-3xl font-black text-[#ff5500] font-mono">{unlimited}</div>
        </div>
      </div>

      {/* Approvals Table */}
      <div className="border border-[#cecece] bg-[#dedede] overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#d4d4d4] border-b border-[#cecece] text-[10px] font-extrabold text-[#555555] uppercase tracking-wider">
              <th className="py-3 px-4">TOKEN</th>
              <th className="py-3 px-4">SPENDER DAPP</th>
              <th className="py-3 px-4">ALLOWANCE</th>
              <th className="py-3 px-4">RISK LEVEL</th>
              <th className="py-3 px-4">LAST UPDATED</th>
              <th className="py-3 px-4 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#cecece] text-xs font-bold text-[#0a0a0a]">
            {allApprovals.map((a, i) => (
              <tr key={i} className="hover:bg-[#d5d5d5] transition-colors">
                <td className="py-3.5 px-4 font-mono font-black text-[#0a0a0a]">
                  {a.tokenSymbol}
                </td>
                <td className="py-3.5 px-4 font-mono">
                  <div className="font-bold text-[#0a0a0a]">{a.spenderLabel || `${a.spender.slice(0, 6)}...${a.spender.slice(-4)}`}</div>
                  {a.spenderLabel && <div className="text-[10px] text-[#555555] font-mono">{a.spender}</div>}
                </td>
                <td className="py-3.5 px-4 font-mono font-bold">
                  {a.isUnlimited ? (
                    <span className="text-[#ff5500]">UNLIMITED (∞)</span>
                  ) : (
                    <span className="text-[#0a0a0a]">{a.allowance}</span>
                  )}
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 uppercase ${
                      a.riskLevel === 'high'
                        ? 'bg-[#dc2626]/10 text-[#dc2626] border border-[#dc2626]/30'
                        : a.riskLevel === 'medium'
                        ? 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30'
                        : 'bg-[#059669]/10 text-[#059669] border border-[#059669]/30'
                    }`}
                  >
                    {a.riskLevel}
                  </span>
                </td>
                <td className="py-3.5 px-4 font-mono text-[#555555] text-[11px]">
                  {a.timestamp ? new Date(a.timestamp * 1000).toLocaleDateString() : a.date || '—'}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <a
                    href={getExplorerAddressUrl(a.chainId, a.spender)}
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
    </div>
  );
}
