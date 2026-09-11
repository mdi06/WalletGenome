import { NextRequest, NextResponse } from 'next/server';
import { processBatchScan } from '@/lib/services/batchScanService';
import { RequestCancellationError, throwIfAborted } from '@/lib/cancellation';
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
import { authentication } from '@/lib/supabase/requireUser';

export const maxDuration = 300;
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const telemetry = createScanRequestTelemetry(request, 'batch-scan');
  let releaseSlot: (() => void) | undefined;
  let workStarted = false;

  try {
    if (!await authentication.getAuthenticatedUser()) {
      logScanRequest(telemetry, {
        outcome: 'rejected',
        statusCode: 401,
        failureCodes: ['authentication_required'],
      });
      return NextResponse.json(
        { error: 'Sign in with Google to run a live cluster scan.', code: 'authentication_required' },
        { status: 401, headers: { 'Cache-Control': 'no-store', 'X-Request-ID': telemetry.requestId } },
      );
    }
    const body = await parseJsonBody(request, 'batch');
    const { addresses: uniqueTargets, chainIds } = validateBatchRequest(body);
    enforceRequestRateLimit(request, 'batch');
    const routeReleaseSlot = acquireRequestSlot('batch');
    releaseSlot = routeReleaseSlot;
    const clusterData = await runWithTimeout(
      signal => {
        workStarted = true;
        const batchWork = processBatchScan(uniqueTargets, chainIds, { signal });
        void batchWork.then(routeReleaseSlot, routeReleaseSlot);
        return batchWork;
      },
      BATCH_REQUEST_TIMEOUT_MS,
      { signal: request.signal },
    );
    throwIfAborted(request.signal);

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
      headers: { 'Cache-Control': 'no-store', 'X-Request-ID': telemetry.requestId },
    });

  } catch (error: unknown) {
    if (releaseSlot && !workStarted) releaseSlot();

    if (error instanceof RequestCancellationError) {
      logScanRequest(telemetry, {
        outcome: 'cancelled',
        statusCode: 499,
        failureCodes: [error.reason === 'deadline' ? 'request_timeout' : 'client_disconnect'],
      });
      return new Response(null, {
        status: 499,
        headers: { 'Cache-Control': 'no-store', 'X-Request-ID': telemetry.requestId },
      });
    }

    if (error instanceof RequestPolicyError) {
      logScanRequest(telemetry, {
        outcome: error.code === 'request_timeout' ? 'failed' : 'rejected',
        statusCode: error.status,
        failureCodes: [error.code],
      });
      return NextResponse.json(
        { error: error.message, code: error.code },
        {
          status: error.status,
          headers: {
            ...(error.status === 429 ? { 'Retry-After': '60' } : {}),
            'Cache-Control': 'no-store',
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
      { status: 500, headers: { 'Cache-Control': 'no-store', 'X-Request-ID': telemetry.requestId } }
    );
  }
}
