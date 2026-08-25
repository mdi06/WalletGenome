import type { MultiChainScanResult } from '@/lib/types';
import type { DemoWallet } from '@/lib/demoWallets';

export interface DemoSnapshotEnvelope {
  schemaVersion: 1;
  generatedAt: string;
  chainIds: number[];
  result: MultiChainScanResult;
}

type SnapshotFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function isDemoSnapshotEnvelope(value: unknown): value is DemoSnapshotEnvelope {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DemoSnapshotEnvelope>;
  return candidate.schemaVersion === 1
    && typeof candidate.generatedAt === 'string'
    && Array.isArray(candidate.chainIds)
    && candidate.chainIds.every(chainId => Number.isInteger(chainId))
    && Boolean(candidate.result)
    && typeof candidate.result?.address === 'string'
    && Array.isArray(candidate.result?.chains);
}

export async function loadDemoSnapshot(
  demo: DemoWallet,
  fetcher: SnapshotFetcher = fetch,
  signal?: AbortSignal,
): Promise<DemoSnapshotEnvelope> {
  const response = await fetcher(demo.snapshotPath, {
    method: 'GET',
    cache: 'force-cache',
    signal,
  });

  if (!response.ok) {
    throw new Error(`Saved demo snapshot is unavailable (HTTP ${response.status}).`);
  }

  const payload: unknown = await response.json();
  if (!isDemoSnapshotEnvelope(payload)) {
    throw new Error('Saved demo snapshot has an invalid format.');
  }
  if (payload.generatedAt !== demo.generatedAt) {
    throw new Error('Saved demo snapshot metadata is out of sync.');
  }
  if (payload.result.address.toLowerCase() !== demo.address.toLowerCase()) {
    throw new Error('Saved demo snapshot does not match the selected wallet.');
  }

  return payload;
}
