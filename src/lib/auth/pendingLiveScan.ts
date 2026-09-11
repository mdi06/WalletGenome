export const PENDING_LIVE_SCAN_KEY = 'walletgenome.pending-live-scan';

export type PendingLiveScan =
  | { mode: 'single'; address: string; chainIds: number[]; forceRefresh?: boolean }
  | { mode: 'cluster'; addresses: string[]; chainIds: number[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isChainIds(value: unknown): value is number[] {
  return Array.isArray(value)
    && value.length > 0
    && value.every(chainId => typeof chainId === 'number' && Number.isInteger(chainId));
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.length > 0
    && value.every(item => typeof item === 'string' && item.length > 0);
}

export function parsePendingLiveScan(serialized: string | null): PendingLiveScan | null {
  if (!serialized) return null;

  try {
    const value: unknown = JSON.parse(serialized);
    if (!isRecord(value) || !isChainIds(value.chainIds)) return null;

    if (value.mode === 'single' && typeof value.address === 'string' && value.address.length > 0) {
      return {
        mode: 'single',
        address: value.address,
        chainIds: [...value.chainIds],
        ...(typeof value.forceRefresh === 'boolean' ? { forceRefresh: value.forceRefresh } : {}),
      };
    }

    if (value.mode === 'cluster' && isNonEmptyStringArray(value.addresses)) {
      return {
        mode: 'cluster',
        addresses: [...value.addresses],
        chainIds: [...value.chainIds],
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function serializePendingLiveScan(scan: PendingLiveScan): string {
  return JSON.stringify(scan);
}
