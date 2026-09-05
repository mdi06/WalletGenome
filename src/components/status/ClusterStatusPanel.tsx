import type { ClusterScanResult, DataAvailabilityStatus } from '@/lib/types';
import ProviderStatusSummary from './ProviderStatusSummary';

export function getClusterAvailabilityMessage(status: DataAvailabilityStatus): string | null {
  if (status === 'complete') return null;
  return status === 'partial'
    ? 'Cluster scan is partial. Aggregates and coordination conclusions are withheld because one or more targets are not eligible wallet accounts or lack complete provider data.'
    : 'Cluster scan is unavailable. No eligible wallet returned enough verified data for cluster analytics.';
}

export default function ClusterStatusPanel({ data }: { data: ClusterScanResult }) {
  const message = getClusterAvailabilityMessage(data.status);
  if (!message) return null;

  const isUnavailable = data.status === 'unavailable';
  const attentionCount = data.failedWallets.length;
  const summary = isUnavailable
    ? 'No eligible wallet returned enough verified data.'
    : `${attentionCount} target${attentionCount === 1 ? ' needs' : 's need'} attention.`;

  return (
    <ProviderStatusSummary
      title={`${data.status} cluster scan`}
      summary={summary}
      tone={isUnavailable ? 'unavailable' : 'warning'}
    >
      <p className="text-sm font-bold">{message}</p>
      <p className="text-xs">
        {data.totalWallets} of {data.requestedWallets} targets completed with verified wallet data.
      </p>
      {data.failedWallets.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider">Targets needing attention</h3>
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
