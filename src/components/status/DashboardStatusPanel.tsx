import type { DataAvailabilityError, DataAvailabilityStatus, MultiChainScanResult } from '@/lib/types';
import ProviderStatusSummary from './ProviderStatusSummary';

interface GroupedProviderError {
  error: DataAvailabilityError;
  count: number;
}

export function groupProviderErrors(errors: readonly DataAvailabilityError[]): GroupedProviderError[] {
  const grouped = new Map<string, GroupedProviderError>();
  for (const error of errors) {
    const key = [error.source, error.code, error.provider ?? '', error.message].join('|');
    const existing = grouped.get(key);
    if (existing) existing.count++;
    else grouped.set(key, { error, count: 1 });
  }
  return [...grouped.values()];
}

function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString('en-US')} ${count === 1 ? singular : plural}`;
}

export function priceCoverageSummary(errors: readonly DataAvailabilityError[]): string | null {
  const spotEstimateCount = errors
    .filter(error => error.source === 'prices' && error.code === 'spot_estimate')
    .reduce((sum, error) => sum + (error.count ?? 0), 0);
  const unpricedCount = errors
    .filter(error => error.source === 'prices' && error.code === 'unpriced')
    .reduce((sum, error) => sum + (error.count ?? 0), 0);
  const parts: string[] = [];
  if (spotEstimateCount > 0) {
    parts.push(`${countLabel(spotEstimateCount, 'value')} ${spotEstimateCount === 1 ? 'uses' : 'use'} a current-price estimate`);
  }
  if (unpricedCount > 0) {
    parts.push(`${countLabel(unpricedCount, 'value')} ${unpricedCount === 1 ? 'remains' : 'remain'} unpriced`);
  }
  return parts.length > 0 ? `${parts.join('; ')}. Affected USD totals exclude these values.` : null;
}

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
  const priceOnlyWarning = !availabilityMessage
    && data.availability.some(chain => chain.prices !== 'complete')
    && data.availability.every(chain => [
      chain.transactions,
      chain.tokenTransfers,
      chain.internalTransactions,
    ].every(status => status === 'complete'));
  const affectedPriceChains = data.availability.filter(chain => chain.prices !== 'complete').length;
  const title = priceOnlyWarning
    ? 'Partial price coverage'
    : availabilityMessage ? `${data.status} history data` : 'Provider warnings';
  const summary = priceOnlyWarning
    ? `Prices are incomplete on ${countLabel(affectedPriceChains, 'network')}. Wallet history is complete.`
    : availabilityMessage
    ? isUnavailable
      ? 'History providers did not return enough verified data.'
      : 'Some history data is incomplete; available records remain visible.'
    : `${chainWarnings.length} provider warning${chainWarnings.length === 1 ? '' : 's'} need attention.`;

  return (
    <ProviderStatusSummary title={title} summary={summary} tone={isUnavailable ? 'unavailable' : 'warning'}>
      {availabilityMessage && <p className="text-sm font-bold">{availabilityMessage}</p>}

      {chainWarnings.length > 0 && !priceOnlyWarning && (
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
        {data.availability.map(chain => {
          const groupedErrors = groupProviderErrors(chain.errors);
          const coverageSummary = priceCoverageSummary(chain.errors);
          const technicalErrors = groupedErrors.filter(({ error }) => (
            error.code !== 'spot_estimate' && error.code !== 'unpriced'
          ));
          return <div key={chain.chainId} className="border border-[#c8c8c8] p-3 text-xs">
            <div className="font-black">{chain.chainName}</div>
            <dl className="mt-2 grid grid-cols-2 gap-2 font-mono sm:grid-cols-4">
              <div><dt>Transactions</dt><dd className="font-bold">{chain.transactions}</dd></div>
              <div><dt>Token transfers</dt><dd className="font-bold">{chain.tokenTransfers}</dd></div>
              <div><dt>Internal txs</dt><dd className="font-bold">{chain.internalTransactions}</dd></div>
              <div><dt>Prices</dt><dd className="font-bold">{chain.prices}</dd></div>
            </dl>
            {coverageSummary && <p className="mt-3 font-bold text-[#78350f]">{coverageSummary}</p>}
            {technicalErrors.length > 0 && (
              <details className="mt-3 border-t border-[#d6b48f] pt-2">
                <summary className="cursor-pointer font-black text-[#78350f] outline-none focus-visible:outline-2 focus-visible:outline-[#963300]">
                  Technical provider details ({technicalErrors.length})
                </summary>
              <ul className="mt-2 list-disc pl-5 text-[#991b1b]">
                {technicalErrors.map(({ error, count }) => (
                  <li key={`${error.source}-${error.code}-${error.provider ?? ''}-${error.message}`}>
                    {error.source}: {error.message}
                    {count > 1 && (error.source === 'prices'
                      ? ` (${count} affected price groups)`
                      : ` (${count} repeated entries)`)}
                  </li>
                ))}
              </ul>
              </details>
            )}
          </div>;
        })}
      </div>
    </ProviderStatusSummary>
  );
}
