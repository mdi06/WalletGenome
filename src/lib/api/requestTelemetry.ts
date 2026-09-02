import { randomUUID } from 'node:crypto';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

export type ScanRouteName = 'scan' | 'batch-scan';
export type ScanRequestOutcome = 'completed' | 'rejected' | 'failed' | 'cancelled';

export interface ScanRequestTelemetry {
  requestId: string;
  route: ScanRouteName;
  startedAt: number;
}

export interface ScanRequestLogDetails {
  outcome: ScanRequestOutcome;
  statusCode: number;
  targetCount?: number;
  chainCount?: number;
  resultStatus?: 'complete' | 'partial' | 'unavailable';
  availabilityCounts?: Record<'complete' | 'partial' | 'unavailable', number>;
  failureCodes?: string[];
}

export function countAvailabilityStatuses(
  statuses: Array<'complete' | 'partial' | 'unavailable'>,
): Record<'complete' | 'partial' | 'unavailable', number> {
  return statuses.reduce((counts, status) => {
    counts[status] += 1;
    return counts;
  }, { complete: 0, partial: 0, unavailable: 0 });
}

function requestIdFromHeader(request: Request): string | null {
  const supplied = request.headers.get('x-request-id')?.trim();
  return supplied && REQUEST_ID_PATTERN.test(supplied) ? supplied : null;
}

export function createScanRequestTelemetry(
  request: Request,
  route: ScanRouteName,
): ScanRequestTelemetry {
  return {
    requestId: requestIdFromHeader(request) ?? randomUUID(),
    route,
    startedAt: Date.now(),
  };
}

export function logScanRequest(
  telemetry: ScanRequestTelemetry,
  details: ScanRequestLogDetails,
): void {
  const failureCodes = details.failureCodes
    ? [...new Set(details.failureCodes)].sort()
    : undefined;

  console.info(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'wallet_scan_request',
    requestId: telemetry.requestId,
    route: telemetry.route,
    durationMs: Math.max(0, Date.now() - telemetry.startedAt),
    ...details,
    failureCodes,
  }));
}
