import type { ClusterScanResult, DataAvailabilityStatus } from '@/lib/types';
import ProviderStatusSummary from './ProviderStatusSummary';

export function getClusterAvailabilityMessage(status: DataAvailabilityStatus): string | null {
  if (status === 'complete') return null;
  return status === 'partial'
    ? 'Cluster scan is partial. Aggregates and coordination conclusions are withheld because one or more wallets lack complete provider data.'
    : 'Cluster scan is unavailable. No wallet returned enough verified provider data for cluster analytics.';
}

export default function ClusterStatusPanel({ data }: { data: ClusterScanResult }) {
  const message = getClusterAvailabilityMessage(data.status);
  if (!message) return null;

  const isUnavailable = data.status === 'unavailable';
  const summary = isUnavailable
    ? 'No wallet returned enough verified provider data.'
    : `${data.requestedWallets - data.totalWallets} wallet${data.requestedWallets - data.totalWallets === 1 ? '' : 's'} need provider follow-up.`;

  return (
    <ProviderStatusSummary
      title={`${data.status} cluster scan`}
      summary={summary}
      tone={isUnavailable ? 'unavailable' : 'warning'}
    >
      <p className="text-sm font-bold">{message}</p>
      <p className="text-xs">
        {data.totalWallets} of {data.requestedWallets} wallets completed with verified provider data.
      </p>
      {data.failedWallets.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider">Incomplete wallets</h3>
          {data.failedWallets.map(wallet => (
            <div key={wallet.target} className="border border-[#c8c8c8] p-3 text-xs">
              <div className="font-mono font-black break-all">{wallet.target}</div>
              <div className="mt-1 font-bold uppercase">{wallet.status}</div>
              <ul className="mt-2 list-disc pl-5 text-[#991b1b]">
                {wallet.reasons.map((reason, index) => (
                  <li key={`${reason.source}-${reason.code}-${index}`}>{reason.message}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </ProviderStatusSummary>
  );
}
