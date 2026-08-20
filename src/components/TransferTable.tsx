'use client';

import { useState } from 'react';
import { ScanResult, ProcessedTokenTransfer } from '@/lib/types';
import { getExplorerTxUrl } from '@/lib/chains';
import { ArrowDownLeft, ArrowUpRight, ExternalLink } from 'lucide-react';

interface Props {
  results: ScanResult[];
}

export default function TransferTable({ results }: Props) {
  const [filter, setFilter] = useState<'all' | 'in' | 'out'>('all');
  const [selectedChain, setSelectedChain] = useState<number | 'all'>('all');

  const allTransfers: (ProcessedTokenTransfer & { chainName: string })[] = [];
  for (const r of results) {
    if (selectedChain !== 'all' && r.chainId !== selectedChain) continue;
    if (r.transferSummary) {
      if (filter === 'all' || filter === 'in') {
        for (const t of r.transferSummary.topInbound || []) {
          allTransfers.push({ ...t, chainName: r.chainName });
        }
      }
      if (filter === 'all' || filter === 'out') {
        for (const t of r.transferSummary.topOutbound || []) {
          allTransfers.push({ ...t, chainName: r.chainName });
        }
      }
    }
  }

  allTransfers.sort((a, b) => (b.valueUSD || 0) - (a.valueUSD || 0));

  return (
    <div className="space-y-4">
      {/* ── Controls Row ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {(['all', 'in', 'out'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 text-xs font-bold cursor-pointer ${
                filter === f
                  ? 'btn-3d-black text-white'
                  : 'btn-3d-neutral text-[#4b5563]'
              }`}
            >
              {f === 'all' ? 'All Transfers' : f === 'in' ? 'Inbound' : 'Outbound'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {[{ id: 'all', label: 'All Chains' }, { id: 1, label: 'Ethereum' }, { id: 42161, label: 'Arbitrum' }, { id: 8453, label: 'Base' }, { id: 10, label: 'Optimism' }].map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedChain(c.id as any)}
              className={`px-3 py-1 text-xs font-bold cursor-pointer ${
                selectedChain === c.id
                  ? 'btn-3d-black text-white'
                  : 'btn-3d-neutral text-[#4b5563]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table Container Well ── */}
      <div className="well-recessed-light overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#d0d0d0] border-b border-[#c2c2c2] text-[10px] font-extrabold text-[#4b5563] uppercase tracking-wider">
              <th className="py-3 px-4">DIRECTION</th>
              <th className="py-3 px-4">TOKEN</th>
              <th className="py-3 px-4 text-right">AMOUNT</th>
              <th className="py-3 px-4 text-right">USD VALUE</th>
              <th className="py-3 px-4">COUNTERPARTY</th>
              <th className="py-3 px-4">TIME</th>
              <th className="py-3 px-4 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#c8c8c8] text-xs font-bold text-[#0a0a0a]">
            {allTransfers.map((t, i) => {
              const counterparty = t.direction === 'in' ? t.from : t.to;
              const counterpartyLabel = t.direction === 'in' ? t.fromLabel : t.toLabel;

              return (
                <tr key={i} className="hover:bg-white/60 transition-colors">
                  <td className="py-3.5 px-4">
                    {t.direction === 'in' ? (
                      <span className="badge-3d inline-flex items-center gap-1 text-[#047857] bg-[#059669]/15 px-2 py-0.5 font-mono font-bold text-[11px] border border-[#059669]/40">
                        <ArrowDownLeft size={12} /> IN
                      </span>
                    ) : (
                      <span className="badge-3d inline-flex items-center gap-1 text-[#b33c00] bg-[#ff5500]/15 px-2 py-0.5 font-mono font-bold text-[11px] border border-[#ff5500]/40">
                        <ArrowUpRight size={12} /> OUT
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-black text-[#0a0a0a]">
                    {t.tokenSymbol}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-[#0a0a0a]">
                    {t.valueFormatted.toFixed(4)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-black text-[#0a0a0a]">
                    {t.valueUSD ? `$${t.valueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <div className="font-bold text-[#0a0a0a]">{counterpartyLabel || `${counterparty.slice(0, 6)}...${counterparty.slice(-4)}`}</div>
                    {counterpartyLabel && <div className="text-[10px] text-[#6b7280] font-mono">{counterparty}</div>}
                  </td>
                  <td className="py-3.5 px-4 text-[#6b7280] font-mono text-[11px]">
                    {t.timestamp ? new Date(t.timestamp * 1000).toLocaleDateString() : t.date || '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <a
                      href={getExplorerTxUrl(t.chainId, t.hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#6b7280] hover:text-black inline-block p-1"
                    >
                      <ExternalLink size={13} className="ml-auto" />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
