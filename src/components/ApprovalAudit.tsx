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
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-3d p-5 text-[#0a0a0a] space-y-1">
          <div className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider">TOTAL ACTIVE PERMISSIONS</div>
          <div className="text-3xl font-black text-[#0a0a0a] font-mono">{totalApprovals}</div>
        </div>

        <div className="card-3d p-5 text-[#0a0a0a] space-y-1">
          <div className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider">HIGH RISK EXPOSURE</div>
          <div className="text-3xl font-black text-[#dc2626] font-mono">{highRisk}</div>
        </div>

        <div className="card-3d p-5 text-[#0a0a0a] space-y-1">
          <div className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider">UNLIMITED ALLOWANCES</div>
          <div className="text-3xl font-black text-[#ff5500] font-mono">{unlimited}</div>
        </div>
      </div>

      {/* Approvals Table Well */}
      <div className="well-recessed-light overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#d0d0d0] border-b border-[#c2c2c2] text-[10px] font-extrabold text-[#4b5563] uppercase tracking-wider">
              <th className="py-3 px-4">TOKEN</th>
              <th className="py-3 px-4">SPENDER DAPP</th>
              <th className="py-3 px-4">ALLOWANCE</th>
              <th className="py-3 px-4">RISK LEVEL</th>
              <th className="py-3 px-4">LAST UPDATED</th>
              <th className="py-3 px-4 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#c8c8c8] text-xs font-bold text-[#0a0a0a]">
            {allApprovals.map((a, i) => (
              <tr key={i} className="hover:bg-white/60 transition-colors">
                <td className="py-3.5 px-4 font-mono font-black text-[#0a0a0a]">
                  {a.tokenSymbol}
                </td>
                <td className="py-3.5 px-4 font-mono">
                  <div className="font-bold text-[#0a0a0a]">{a.spenderLabel || `${a.spender.slice(0, 6)}...${a.spender.slice(-4)}`}</div>
                  {a.spenderLabel && <div className="text-[10px] text-[#6b7280] font-mono">{a.spender}</div>}
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
                    className={`badge-3d text-[10px] font-bold px-2 py-0.5 uppercase ${
                      a.riskLevel === 'high'
                        ? 'bg-[#dc2626]/15 text-[#b91c1c] border border-[#dc2626]/40'
                        : a.riskLevel === 'medium'
                        ? 'bg-[#f59e0b]/15 text-[#b45309] border border-[#f59e0b]/40'
                        : 'bg-[#059669]/15 text-[#047857] border border-[#059669]/40'
                    }`}
                  >
                    {a.riskLevel}
                  </span>
                </td>
                <td className="py-3.5 px-4 font-mono text-[#6b7280] text-[11px]">
                  {a.timestamp ? new Date(a.timestamp * 1000).toLocaleDateString() : a.date || '—'}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <a
                    href={getExplorerAddressUrl(a.chainId, a.spender)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#6b7280] hover:text-black inline-block p-1"
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
