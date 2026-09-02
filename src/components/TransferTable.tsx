'use client';

import { useMemo, useRef, useState } from 'react';
import { ScanResult } from '@/lib/types';
import { getExplorerTxUrl } from '@/lib/chains';
import {
  collectTransferTableRows,
  filterTransferTableRows,
  paginateTransferTable,
  TRANSFER_TABLE_PAGE_SIZE,
  getTransferTableRowKey,
} from '@/lib/transferTable';
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, ExternalLink, Search, X } from 'lucide-react';

interface Props {
  results: ScanResult[];
}

const TRANSFER_CHAIN_FILTERS: Array<{ id: number | 'all'; label: string }> = [
  { id: 'all', label: 'All Chains' },
  { id: 1, label: 'Ethereum' },
  { id: 42161, label: 'Arbitrum' },
  { id: 8453, label: 'Base' },
  { id: 10, label: 'Optimism' },
];

export default function TransferTable({ results }: Props) {
  const [filter, setFilter] = useState<'all' | 'in' | 'out'>('all');
  const [selectedChain, setSelectedChain] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const allTransfers = useMemo(
    () => collectTransferTableRows(results, filter, selectedChain),
    [filter, results, selectedChain],
  );
  const filteredTransfers = useMemo(
    () => filterTransferTableRows(allTransfers, searchQuery),
    [allTransfers, searchQuery],
  );
  const paginatedTransfers = paginateTransferTable(filteredTransfers, page, TRANSFER_TABLE_PAGE_SIZE);

  const updateSearchQuery = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const updateFilter = (value: 'all' | 'in' | 'out') => {
    setFilter(value);
    setPage(1);
  };

  const updateSelectedChain = (value: number | 'all') => {
    setSelectedChain(value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <section aria-labelledby="top-token-transfers-heading" className="border-b border-[#c8c8c8] pb-3">
        <h3 id="top-token-transfers-heading" className="text-sm font-black uppercase tracking-wider text-[#0a0a0a]">Top token transfers</h3>
        <p id="top-token-transfers-scope" className="mt-1 text-[11px] font-bold leading-relaxed text-[#4b5563]">
          Subset of the highest-value token transfers returned for each chain and direction (up to 20 per group). Search, direction, network, and pagination apply only to this subset. Rows are sorted by USD value descending; native and internal transfers are not shown.
        </p>
      </section>
      {/* ── Controls Row ── */}
      <section aria-label="Transfer table controls" className="card-3d flex flex-col gap-3 p-3 md:p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <label htmlFor="transfer-search" className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-[#4b5563]">Search top token transfers</label>
            <span className="flex min-h-11 items-center gap-2 border border-[#b8bbc3] bg-white px-3 focus-within:border-[#0a0a0a] focus-within:ring-2 focus-within:ring-[#0a0a0a]/20 focus-within:ring-offset-1 md:min-h-9">
              <Search size={14} aria-hidden="true" className="shrink-0 text-[#6b7280]" />
              <input
                ref={searchInputRef}
                id="transfer-search"
                type="text"
                inputMode="search"
                value={searchQuery}
                onChange={event => updateSearchQuery(event.target.value)}
                placeholder="Search this subset by token, contract, hash, or counterparty"
                aria-describedby="top-token-transfers-scope"
                className="min-w-0 flex-1 bg-transparent text-base font-bold text-[#0a0a0a] outline-none placeholder:font-medium placeholder:text-[#6b7280] md:text-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear transfer search"
                  title="Clear transfer search"
                  onClick={() => {
                    updateSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center text-[#4b5563] hover:text-[#0a0a0a] md:min-h-9 md:min-w-9"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 md:flex md:flex-wrap md:items-center" role="group" aria-label="Transfer direction filters">
            {(['all', 'in', 'out'] as const).map(f => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => updateFilter(f)}
                className={`min-h-11 w-full justify-center px-2 py-1.5 text-center text-xs font-bold cursor-pointer md:min-h-9 md:w-auto md:justify-start md:px-3 md:py-1 ${
                  filter === f
                    ? 'btn-3d-black text-white'
                    : 'btn-3d-neutral text-[#4b5563]'
                }`}
              >
                {f === 'all' ? 'All Top Token Transfers' : f === 'in' ? 'Inbound' : 'Outbound'}
              </button>
            ))}
          </div>

          <label htmlFor="transfer-network" className="w-full md:hidden">
            <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-[#4b5563]">Network</span>
            <select
              id="transfer-network"
              value={selectedChain === 'all' ? 'all' : String(selectedChain)}
              onChange={event => updateSelectedChain(event.target.value === 'all' ? 'all' : Number(event.target.value))}
              className="min-h-11 w-full border border-[#b8bbc3] bg-white px-3 text-base font-bold text-[#0a0a0a] focus:border-[#963300] focus:outline-none focus:ring-2 focus:ring-[#963300]/30 focus:ring-offset-1"
            >
              {TRANSFER_CHAIN_FILTERS.map(chain => (
                <option key={chain.id} value={chain.id}>{chain.label}</option>
              ))}
            </select>
          </label>

          <div className="hidden flex-wrap items-center gap-2 md:flex" role="group" aria-label="Transfer network filters">
            {TRANSFER_CHAIN_FILTERS.map(c => (
              <button
                key={c.id}
                type="button"
                aria-pressed={selectedChain === c.id}
                onClick={() => updateSelectedChain(c.id === 'all' ? 'all' : Number(c.id))}
                className={`min-h-11 px-3 py-1 md:min-h-9 text-xs font-bold cursor-pointer ${
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

        <div className="flex flex-col gap-3 border-t border-[#c8c8c8] pt-3 text-xs font-bold text-[#4b5563] md:flex-row md:items-center md:justify-between">
          <p aria-live="polite">
            {filteredTransfers.length === 0
              ? 'No top token transfers match the current filters.'
              : `Showing ${paginatedTransfers.firstVisible}–${paginatedTransfers.lastVisible} of ${filteredTransfers.length} matching top token transfers`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous top token transfers page"
              onClick={() => setPage(paginatedTransfers.currentPage - 1)}
              disabled={paginatedTransfers.currentPage === 1}
              className="btn-3d-neutral inline-flex min-h-11 min-w-11 md:min-h-9 md:min-w-9 items-center justify-center disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={15} aria-hidden="true" />
            </button>
            <span aria-label={`Top token transfers page ${paginatedTransfers.currentPage} of ${paginatedTransfers.pageCount}`} className="min-w-24 text-center font-mono">
              Page {paginatedTransfers.currentPage} of {paginatedTransfers.pageCount}
            </span>
            <button
              type="button"
              aria-label="Next top token transfers page"
              onClick={() => setPage(paginatedTransfers.currentPage + 1)}
              disabled={paginatedTransfers.currentPage === paginatedTransfers.pageCount}
              className="btn-3d-neutral inline-flex min-h-11 min-w-11 md:min-h-9 md:min-w-9 items-center justify-center disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Table Container Well ── */}
      <div
        className="horizontal-scroll-region well-recessed-light overflow-hidden overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label="Top token transfers table; native and internal transfers are not shown; scroll horizontally for all columns"
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#d0d0d0] border-b border-[#c2c2c2] text-[10px] font-extrabold text-[#4b5563] uppercase tracking-wider">
              <th className="py-3 px-4">DIRECTION</th>
              <th className="py-3 px-4">CHAIN</th>
              <th className="py-3 px-4">TOKEN</th>
              <th className="py-3 px-4 text-right">AMOUNT</th>
              <th className="py-3 px-4 text-right">USD VALUE</th>
              <th className="py-3 px-4">COUNTERPARTY</th>
              <th className="py-3 px-4">TIME</th>
              <th className="py-3 px-4 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#c8c8c8] text-xs font-bold text-[#0a0a0a]">
            {paginatedTransfers.items.map(t => {
              const counterparty = t.direction === 'in' ? t.from : t.to;
              const counterpartyLabel = t.direction === 'in' ? t.fromLabel : t.toLabel;

              return (
                <tr key={getTransferTableRowKey(t)} className="hover:bg-white/60 transition-colors">
                  <td className="py-5 md:py-1.5 px-4">
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
                  <td className="py-5 md:py-1.5 px-4 font-bold text-[#4b5563]">
                    {t.chainName}
                  </td>
                  <td className="py-5 md:py-1.5 px-4 font-mono font-black text-[#0a0a0a]">
                    <div className="font-black">{t.tokenName || 'Unknown Token'}</div>
                    <div className="text-[10px] font-bold text-[#4b5563]">{t.tokenSymbol || '???'}</div>
                    {t.contractAddress ? (
                      <div
                        className="mt-1 text-[9px] font-bold text-[#6b7280]"
                        title={t.contractAddress}
                        aria-label={`Token contract ${t.contractAddress}`}
                      >
                        Contract {`${t.contractAddress.slice(0, 6)}...${t.contractAddress.slice(-4)}`}
                      </div>
                    ) : (
                      <div className="mt-1 text-[9px] font-bold uppercase text-[#6b7280]">Contract unavailable</div>
                    )}
                  </td>
                  <td className="py-5 md:py-1.5 px-4 text-right font-mono text-[#0a0a0a]">
                    {t.valueFormatted.toFixed(4)}
                  </td>
                  <td className="py-5 md:py-1.5 px-4 text-right font-mono font-black text-[#0a0a0a]">
                    <div>
                      {t.valueUSD !== null
                        ? `$${t.valueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : 'Unavailable'}
                    </div>
                    <div className="text-[9px] font-bold uppercase text-[#6b7280]">
                      {t.valueUSDProvenance.replaceAll('_', ' ')}
                    </div>
                  </td>
                  <td className="py-5 md:py-1.5 px-4 font-mono">
                    <div className="font-bold text-[#0a0a0a]">{counterpartyLabel || `${counterparty.slice(0, 6)}...${counterparty.slice(-4)}`}</div>
                    {counterpartyLabel && <div className="text-[10px] text-[#6b7280] font-mono">{counterparty}</div>}
                  </td>
                  <td className="py-5 md:py-1.5 px-4 text-[#6b7280] font-mono text-[11px]">
                    {t.timestamp ? new Date(t.timestamp * 1000).toLocaleDateString() : t.date || '—'}
                  </td>
                  <td className="py-5 md:py-1.5 px-4 text-right">
                    <a
                      href={getExplorerTxUrl(t.chainId, t.hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View ${t.tokenSymbol} transfer on block explorer`}
                      className="text-[#6b7280] hover:text-black inline-flex min-h-11 min-w-11 md:min-h-9 md:min-w-9 items-center justify-center p-1"
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
