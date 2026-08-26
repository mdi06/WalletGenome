'use client';

import { useMemo, useState } from 'react';
import { RiskLevel, ScanResult } from '@/lib/types';
import { getExplorerAddressUrl } from '@/lib/chains';
import { ChevronLeft, ChevronRight, ExternalLink, Search } from 'lucide-react';
import { formatCompactUSD } from '@/lib/utils/dashboardUtils';
import FilterDropdown from '@/components/FilterDropdown';
import type { FilterDropdownOption } from '@/components/FilterDropdown';

interface Props {
  results: ScanResult[];
}

const APPROVALS_PAGE_SIZE = 50;

export default function ApprovalAudit({ results }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | RiskLevel>('all');
  const [chainFilter, setChainFilter] = useState<number | 'all'>('all');
  const [openDropdown, setOpenDropdown] = useState<'risk' | 'chain' | null>(null);
  const [page, setPage] = useState(1);

  const riskOptions: readonly FilterDropdownOption<'all' | RiskLevel>[] = [
    { value: 'all', label: 'All risk levels' },
    { value: 'high', label: 'High risk' },
    { value: 'medium', label: 'Medium risk' },
    { value: 'low', label: 'Low risk' },
  ];

  const allApprovals = useMemo(() => results.flatMap(result => (
    result.approvalSummary?.activeApprovals?.map(approval => ({
      ...approval,
      chainName: result.chainName,
    })) ?? []
  )), [results]);

  const chainOptions = useMemo(() => (
    [...new Map(allApprovals.map(approval => [approval.chainId, approval.chainName])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
  ), [allApprovals]);

  const filteredApprovals = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return allApprovals.filter(approval => {
      if (riskFilter !== 'all' && approval.riskLevel !== riskFilter) return false;
      if (chainFilter !== 'all' && approval.chainId !== chainFilter) return false;
      if (!normalizedQuery) return true;

      return [
        approval.tokenName,
        approval.tokenSymbol,
        approval.tokenAddress,
        approval.spender,
        approval.spenderLabel ?? '',
        approval.chainName,
      ].some(value => value.toLowerCase().includes(normalizedQuery));
    });
  }, [allApprovals, chainFilter, riskFilter, searchQuery]);

  const pageCount = Math.max(1, Math.ceil(filteredApprovals.length / APPROVALS_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * APPROVALS_PAGE_SIZE;
  const visibleApprovals = filteredApprovals.slice(pageStart, pageStart + APPROVALS_PAGE_SIZE);
  const firstVisible = filteredApprovals.length === 0 ? 0 : pageStart + 1;
  const lastVisible = Math.min(pageStart + APPROVALS_PAGE_SIZE, filteredApprovals.length);

  const updateSearchQuery = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const updateRiskFilter = (value: 'all' | RiskLevel) => {
    setRiskFilter(value);
    setPage(1);
  };

  const updateChainFilter = (value: number | 'all') => {
    setChainFilter(value);
    setPage(1);
  };

  const chainFilterOptions: readonly FilterDropdownOption<number | 'all'>[] = [
    { value: 'all', label: 'All chains' },
    ...chainOptions.map(([chainId, chainName]) => ({ value: chainId, label: chainName })),
  ];

  const totalApprovals = allApprovals.length;
  const highRisk = allApprovals.filter(a => a.riskLevel === 'high').length;
  const unlimited = allApprovals.filter(a => a.isUnlimited).length;
  const exposureComplete = results.every(result => result.approvalSummary.exposureStatus === 'complete');
  const totalExposureUSD = exposureComplete
    ? results.reduce((sum, result) => sum + (result.approvalSummary.totalExposureUSD ?? 0), 0)
    : null;

  return (
    <div className="space-y-6">
      {/* Top metrics */}
      <div className="grid grid-cols-1 border-y border-[#c8c8c8] sm:grid-cols-2 lg:grid-cols-4 sm:divide-x sm:divide-y-0 sm:divide-[#c8c8c8]">
        <div className="space-y-1 border-b border-[#c8c8c8] px-0 py-4 text-[#0a0a0a] sm:border-b-0 sm:px-5">
          <div className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider">EST. APPROVAL EXPOSURE</div>
          <div className="text-3xl font-black text-[#0a0a0a] font-mono">
            {totalExposureUSD === null ? 'Unavailable' : formatCompactUSD(totalExposureUSD)}
          </div>
          <div className="text-[10px] text-[#6b7280]">Balance-capped; see per-row provenance.</div>
        </div>
        <div className="space-y-1 border-b border-[#c8c8c8] px-0 py-4 text-[#0a0a0a] sm:border-b-0 sm:px-5">
          <div className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider">TOTAL ACTIVE PERMISSIONS</div>
          <div className="text-3xl font-black text-[#0a0a0a] font-mono">{totalApprovals}</div>
        </div>

        <div className="space-y-1 border-b border-[#c8c8c8] px-0 py-4 text-[#0a0a0a] sm:border-b-0 sm:px-5">
          <div className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider">HIGH-RISK SPENDERS</div>
          <div className="text-3xl font-black text-[#dc2626] font-mono">{highRisk}</div>
          <div className="text-[10px] text-[#6b7280]">Count, not USD exposure.</div>
        </div>

        <div className="space-y-1 px-0 py-4 text-[#0a0a0a] sm:px-5">
          <div className="text-[11px] font-extrabold text-[#4b5563] uppercase tracking-wider">UNLIMITED ALLOWANCES</div>
          <div className="text-3xl font-black text-[#ff5500] font-mono">{unlimited}</div>
        </div>
      </div>

      <section aria-label="Approval table controls" className="card-3d flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label htmlFor="approval-search" className="min-w-0 flex-1">
            <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-[#4b5563]">Search approvals</span>
            <span className="flex min-h-11 items-center gap-2 border-2 border-[#0a0a0a] bg-white px-3">
              <Search size={14} aria-hidden="true" className="shrink-0 text-[#6b7280]" />
              <input
                id="approval-search"
                type="search"
                value={searchQuery}
                onChange={event => updateSearchQuery(event.target.value)}
                placeholder="Token, spender, address, or chain"
                className="min-w-0 flex-1 bg-transparent text-xs font-bold text-[#0a0a0a] outline-none placeholder:font-medium placeholder:text-[#6b7280]"
              />
            </span>
          </label>

          <FilterDropdown
            id="approval-risk-filter"
            label="Risk"
            ariaLabel="Filter approvals by risk"
            value={riskFilter}
            options={riskOptions}
            isOpen={openDropdown === 'risk'}
            onChange={updateRiskFilter}
            onOpenChange={isOpen => setOpenDropdown(isOpen ? 'risk' : null)}
          />

          <FilterDropdown
            id="approval-chain-filter"
            label="Chain"
            ariaLabel="Filter approvals by chain"
            value={chainFilter}
            options={chainFilterOptions}
            isOpen={openDropdown === 'chain'}
            onChange={updateChainFilter}
            onOpenChange={isOpen => setOpenDropdown(isOpen ? 'chain' : null)}
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-[#c8c8c8] pt-3 text-xs font-bold text-[#4b5563] sm:flex-row sm:items-center sm:justify-between">
          <p aria-live="polite">
            {filteredApprovals.length === 0
              ? 'No approvals match the current filters.'
              : `Showing ${firstVisible}–${lastVisible} of ${filteredApprovals.length} matching approvals`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous approvals page"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="btn-3d-neutral inline-flex min-h-11 min-w-11 items-center justify-center disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={15} aria-hidden="true" />
            </button>
            <span aria-label={`Approvals page ${currentPage} of ${pageCount}`} className="min-w-24 text-center font-mono">
              Page {currentPage} of {pageCount}
            </span>
            <button
              type="button"
              aria-label="Next approvals page"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage === pageCount}
              className="btn-3d-neutral inline-flex min-h-11 min-w-11 items-center justify-center disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* Approvals Table Well */}
      <div
        className="horizontal-scroll-region well-recessed-light overflow-hidden overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label={`Token approvals table; showing ${firstVisible} to ${lastVisible} of ${filteredApprovals.length} matching approvals; scroll horizontally for all columns`}
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#d0d0d0] border-b border-[#c2c2c2] text-[10px] font-extrabold text-[#4b5563] uppercase tracking-wider">
              <th className="py-3 px-4">TOKEN</th>
              <th className="py-3 px-4">CHAIN</th>
              <th className="py-3 px-4">SPENDER DAPP</th>
              <th className="py-3 px-4">ALLOWANCE</th>
              <th className="py-3 px-4">EST. EXPOSURE</th>
              <th className="py-3 px-4">RISK LEVEL</th>
              <th className="py-3 px-4">LAST UPDATED</th>
              <th className="py-3 px-4 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#c8c8c8] text-xs font-bold text-[#0a0a0a]">
            {visibleApprovals.map(a => (
              <tr key={`${a.chainId}:${a.tokenAddress}:${a.spender}`} className="hover:bg-white/60 transition-colors">
                <td className="py-3.5 px-4 font-mono font-black text-[#0a0a0a]">
                  {a.tokenSymbol}
                </td>
                <td className="py-3.5 px-4 font-bold text-[#4b5563]">
                  {a.chainName}
                </td>
                <td className="py-3.5 px-4 font-mono">
                  <div className="font-bold text-[#0a0a0a]">{a.spenderLabel || `${a.spender.slice(0, 6)}...${a.spender.slice(-4)}`}</div>
                  {a.spenderLabel && <div className="text-[10px] text-[#6b7280] font-mono">{a.spender}</div>}
                </td>
                <td className="py-3.5 px-4 font-mono font-bold">
                  {a.isUnlimited ? (
                    <span className="text-[#ff5500]">UNLIMITED (∞)</span>
                  ) : (
                    <span className="text-[#0a0a0a]">
                      {a.allowanceAmount === null ? a.allowance : `${a.allowanceAmount.toLocaleString()} ${a.tokenSymbol}`}
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4 font-mono">
                  {a.exposureStatus === 'unavailable' ? (
                    <span className="text-[#6b7280]">Unavailable (balance or price unknown)</span>
                  ) : a.exposureStatus === 'zero_balance' ? (
                    <span className="text-[#6b7280]">$0 (zero reconstructed balance)</span>
                  ) : (
                    <div>
                      <div className="font-black">{formatCompactUSD(a.estimatedExposureUSD)}</div>
                      <div className="text-[10px] text-[#6b7280]">{a.estimatedExposureUSDProvenance.replaceAll('_', ' ')}</div>
                    </div>
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
                    aria-label={`View ${a.spenderLabel || a.spender} on block explorer`}
                    className="text-[#6b7280] hover:text-black inline-flex min-h-11 min-w-11 items-center justify-center p-1"
                  >
                    <ExternalLink size={13} className="ml-auto" />
                  </a>
                </td>
              </tr>
            ))}
            {visibleApprovals.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-xs font-bold text-[#6b7280]">
                  No approvals match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
