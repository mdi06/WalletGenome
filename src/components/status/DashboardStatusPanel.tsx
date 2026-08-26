import type { DataAvailabilityStatus, MultiChainScanResult } from '@/lib/types';
import ProviderStatusSummary from './ProviderStatusSummary';

export function getAvailabilityMessage(status: DataAvailabilityStatus): string | null {
  if (status === 'complete') return null;
  return status === 'partial'
    ? 'Partial history scan — available records are shown below; conclusions that require complete wallet history are withheld.'
    : 'Scan unavailable — history providers did not return enough verified data for analytics.';
}

export default function DashboardStatusPanel({ data }: { data: MultiChainScanResult }) {
  const availabilityMessage = getAvailabilityMessage(data.status);
  const chainWarnings = data.chainWarnings ?? [];
  const hasProviderWarnings = Boolean(availabilityMessage) || chainWarnings.length > 0;

  if (!hasProviderWarnings) {
    return (
      <div className="border-2 border-[#d97706] bg-[#fffbeb] p-5 text-[#78350f]" role="status">
        <h2 className="text-sm font-black uppercase tracking-wider">Reporting metrics unavailable</h2>
        <p className="mt-2 text-sm font-bold">The scan completed, but definitive risk or behavioral Sybil metrics were not produced. No fallback score or grade is shown.</p>
      </div>
    );
  }

  const isUnavailable = data.status === 'unavailable';
  const title = availabilityMessage ? `${data.status} history data` : 'Provider warnings';
  const summary = availabilityMessage
    ? isUnavailable
      ? 'History providers did not return enough verified data.'
      : 'Some history data is incomplete; available records remain visible.'
    : `${chainWarnings.length} provider warning${chainWarnings.length === 1 ? '' : 's'} need attention.`;

  return (
    <ProviderStatusSummary title={title} summary={summary} tone={isUnavailable ? 'unavailable' : 'warning'}>
      {availabilityMessage && <p className="text-sm font-bold">{availabilityMessage}</p>}

      {chainWarnings.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider">Provider warnings</h3>
          <ul className="list-disc space-y-1 pl-5 text-xs font-bold">
            {chainWarnings.map(warning => (
              <li key={`${warning.chainId}-${warning.message}`}>{warning.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider">Data availability by chain</h3>
        {data.availability.map(chain => (
          <div key={chain.chainId} className="border border-[#c8c8c8] p-3 text-xs">
            <div className="font-black">{chain.chainName}</div>
            <dl className="mt-2 grid grid-cols-2 gap-2 font-mono sm:grid-cols-4">
              <div><dt>Transactions</dt><dd className="font-bold">{chain.transactions}</dd></div>
              <div><dt>Token transfers</dt><dd className="font-bold">{chain.tokenTransfers}</dd></div>
              <div><dt>Internal txs</dt><dd className="font-bold">{chain.internalTransactions}</dd></div>
              <div><dt>Prices</dt><dd className="font-bold">{chain.prices}</dd></div>
            </dl>
            {chain.errors.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-[#991b1b]">
                {chain.errors.map((error, index) => (
                  <li key={`${error.source}-${error.code}-${index}`}>
                    {error.source}: {error.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </ProviderStatusSummary>
  );
}
