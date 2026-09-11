import { formatDemoSnapshotDate, type DemoWallet } from '@/lib/demoWallets';
import type { MultiChainScanResult } from '@/lib/types';
import { getAvailabilityMessage } from './status/DashboardStatusPanel';

interface DemoSnapshotNoticeProps {
  demo: DemoWallet;
  onRunFreshScan: (trigger?: HTMLElement) => void;
  isLoading: boolean;
  data?: MultiChainScanResult;
}

export default function DemoSnapshotNotice({
  demo,
  onRunFreshScan,
  isLoading,
  data,
}: DemoSnapshotNoticeProps) {
  const availabilityMessage = data ? getAvailabilityMessage(data.status) : null;
  const chainWarnings = data?.chainWarnings ?? [];

  return (
    <section
      aria-label="Evidence status"
      className="overflow-hidden border border-[#d6b48f] border-l-4 border-l-[#b33c00] bg-[#fff7ed] shadow-none"
    >
      <div className="flex flex-col gap-2 p-3 md:gap-1 md:p-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-black uppercase tracking-wider text-[#0a0a0a]">Saved snapshot · Non-live</p>
          </div>
          <p className="mt-0.5 md:mt-0 text-xs font-medium text-[#4b5563]">
            Saved public data for {demo.name}. Updated {formatDemoSnapshotDate(demo.generatedAt)}. This view does not spend provider API quota.
          </p>
          {data && (
            <p className="mt-0.5 md:mt-0 text-xs font-bold text-[#4b5563]">
              History evidence: {data.status}. {availabilityMessage ? 'Review data quality details below.' : 'No history completeness warning was reported.'}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={event => onRunFreshScan(event.currentTarget)}
          disabled={isLoading}
          className="btn-3d-black min-h-11 shrink-0 px-4 py-2 text-xs font-black uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Run fresh scan
        </button>
      </div>

      {data && (
        <details className="border-t border-[#d6b48f] bg-white/60">
          <summary className="flex min-h-11 md:min-h-9 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 md:py-1.5 text-xs font-black uppercase tracking-wider text-[#0a0a0a] outline-none focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#963300] [&::-webkit-details-marker]:hidden">
            <span>Review data quality</span>
            <span className="font-mono text-[10px] text-[#4b5563]">{data.status}</span>
          </summary>
          <div className="space-y-3 md:space-y-2 border-t border-[#c8c8c8] p-3 md:p-2.5 text-xs font-bold text-[#4b5563]" role="region" aria-label="Saved snapshot data quality details">
            <p>{availabilityMessage ?? 'All returned chain datasets are marked complete.'}</p>
            {chainWarnings.length > 0 && (
              <div>
                <h3 className="font-black uppercase tracking-wider text-[#0a0a0a]">Provider warnings</h3>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {chainWarnings.map(warning => <li key={`${warning.chainId}-${warning.message}`}>{warning.message}</li>)}
                </ul>
              </div>
            )}
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {data.availability.map(chain => (
                <div key={chain.chainId} className="border border-[#c8c8c8] p-2">
                  <dt className="font-black text-[#0a0a0a]">{chain.chainName}</dt>
                  <dd className="mt-1 space-y-0.5 font-mono text-[10px]">
                    <div>Transactions: {chain.transactions}</div>
                    <div>Transfers: {chain.tokenTransfers}</div>
                    <div>Prices: {chain.prices}</div>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </details>
      )}
    </section>
  );
}
