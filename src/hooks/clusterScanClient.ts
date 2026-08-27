import type { ClusterScanResult } from '@/lib/types';
import { unsuccessfulResponseError } from './scanClientError';

interface RunClusterScanRequestOptions {
  addresses: string[];
  chainIds: number[];
  fetchImpl?: typeof fetch;
}

export async function runClusterScanRequest({
  addresses,
  chainIds,
  fetchImpl = fetch,
}: RunClusterScanRequestOptions): Promise<ClusterScanResult> {
  const response = await fetchImpl('/api/batch-scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ addresses, chainIds }),
  });

  if (!response.ok) {
    throw await unsuccessfulResponseError(response);
  }

  return response.json() as Promise<ClusterScanResult>;
}
