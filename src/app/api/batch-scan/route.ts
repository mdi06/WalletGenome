import { NextRequest, NextResponse } from 'next/server';
import { processBatchScan } from '@/lib/services/batchScanService';
import {
  BATCH_REQUEST_TIMEOUT_MS,
  RequestPolicyError,
  acquireRequestSlot,
  enforceRequestRateLimit,
  parseJsonBody,
  runWithTimeout,
  validateBatchRequest,
} from '@/lib/api/requestPolicy';
import {
  countAvailabilityStatuses,
  createScanRequestTelemetry,
  logScanRequest,
} from '@/lib/api/requestTelemetry';

export const maxDuration = 300;
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const telemetry = createScanRequestTelemetry(request, 'batch-scan');

  try {
    const body = await parseJsonBody(request, 'batch');
    const { addresses: uniqueTargets, chainIds } = validateBatchRequest(body);
    enforceRequestRateLimit(request, 'batch');
    const releaseSlot = acquireRequestSlot('batch');
    const batchWork = processBatchScan(uniqueTargets, chainIds);
    void batchWork.then(releaseSlot, releaseSlot);
    const clusterData = await runWithTimeout(batchWork, BATCH_REQUEST_TIMEOUT_MS);

    logScanRequest(telemetry, {
      outcome: 'completed',
      statusCode: 200,
      targetCount: uniqueTargets.length,
      chainCount: chainIds.length,
      resultStatus: clusterData.status,
      availabilityCounts: countAvailabilityStatuses([
        ...clusterData.wallets.map(() => 'complete' as const),
        ...clusterData.failedWallets.map(wallet => wallet.status),
      ]),
      failureCodes: clusterData.failedWallets.flatMap(wallet => wallet.reasons.map(reason => reason.code)),
    });

    return NextResponse.json(clusterData, {
      headers: { 'X-Request-ID': telemetry.requestId },
    });

  } catch (error: unknown) {
    if (error instanceof RequestPolicyError) {
      logScanRequest(telemetry, {
        outcome: 'rejected',
        statusCode: error.status,
        failureCodes: [error.code],
      });
      return NextResponse.json(
        { error: error.message, code: error.code },
        {
          status: error.status,
          headers: {
            ...(error.status === 429 ? { 'Retry-After': '60' } : {}),
            'X-Request-ID': telemetry.requestId,
          },
        },
      );
    }
    logScanRequest(telemetry, {
      outcome: 'failed',
      statusCode: 500,
      failureCodes: ['unexpected_error'],
    });
    return NextResponse.json(
      { error: 'An unexpected error occurred while analyzing the cluster.' },
      { status: 500, headers: { 'X-Request-ID': telemetry.requestId } }
    );
  }
}
