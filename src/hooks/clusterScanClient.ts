import type { ClusterScanResult } from '@/lib/types';

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
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || `HTTP ${response.status}`);
  }

  return response.json() as Promise<ClusterScanResult>;
}
