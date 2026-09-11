import { NextRequest, NextResponse } from 'next/server';
import { processWalletScan } from '@/lib/services/scanService';
import { formatScanProgress } from '@/lib/scanProgress';
import { RequestCancellationError, throwIfAborted } from '@/lib/cancellation';
import {
  SCAN_REQUEST_TIMEOUT_MS,
  RequestPolicyError,
  acquireRequestSlot,
  enforceRequestRateLimit,
  enforceRefreshRateLimit,
  parseJsonBody,
  runWithTimeout,
  validateScanRequest,
} from '@/lib/api/requestPolicy';
import {
  countAvailabilityStatuses,
  createScanRequestTelemetry,
  logScanRequest,
  type ScanRequestTelemetry,
} from '@/lib/api/requestTelemetry';
import { authentication } from '@/lib/supabase/requireUser';

export const maxDuration = 300;
export const runtime = 'nodejs';

function scanErrorMessage(error: unknown): string {
  if (error instanceof RequestPolicyError) return error.message;
  if (error instanceof Error && (error.message.includes('provide an EVM wallet') || error.message.includes('Unable to resolve ENS'))) {
    return error.message;
  }
  return 'An unexpected error occurred while analyzing the wallet.';
}

function createScanProgressStream(
  address: string,
  chainIds: number[],
  forceRefresh: boolean,
  releaseSlot: () => void,
  telemetry: ScanRequestTelemetry,
  requestSignal: AbortSignal,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const startedAt = Date.now();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      let streamOpen = !requestSignal.aborted;
      const onDisconnect = () => {
        streamOpen = false;
      };
      requestSignal.addEventListener('abort', onDisconnect, { once: true });
      const send = (event: unknown) => {
        if (!streamOpen) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          streamOpen = false;
        }
      };

      let workStarted = false;
      const timedScan = runWithTimeout(
        signal => {
          workStarted = true;
          const scanWork = processWalletScan(address, chainIds, '', false, {
            forceRefresh,
            signal,
            onProgress: progress => send({
              type: 'progress',
              progress: formatScanProgress(progress, 'running'),
              startedAt,
              updatedAt: Date.now(),
            }),
          });
          void scanWork.then(releaseSlot, releaseSlot);
          return scanWork;
        },
        SCAN_REQUEST_TIMEOUT_MS,
        { signal: requestSignal },
      );

      void timedScan
        .then(result => {
          send({ type: 'result', result });
          logScanRequest(telemetry, {
            outcome: 'completed',
            statusCode: 200,
            targetCount: 1,
            chainCount: chainIds.length,
            resultStatus: result.status,
            availabilityCounts: countAvailabilityStatuses(result.availability.flatMap(item => [
              item.transactions,
              item.tokenTransfers,
              item.internalTransactions,
              item.prices,
            ])),
            failureCodes: result.availability.flatMap(item => item.errors.map(error => error.code)),
          });
        })
        .catch((error: unknown) => {
          if (error instanceof RequestCancellationError) {
            logScanRequest(telemetry, {
              outcome: 'cancelled',
              statusCode: 499,
              targetCount: 1,
              chainCount: chainIds.length,
              resultStatus: 'unavailable',
              failureCodes: [error.reason === 'deadline' ? 'request_timeout' : 'client_disconnect'],
            });
            return;
          }
          send({ type: 'error', error: scanErrorMessage(error) });
          logScanRequest(telemetry, {
            outcome: 'failed',
            statusCode: error instanceof RequestPolicyError ? error.status : 200,
            targetCount: 1,
            chainCount: chainIds.length,
            resultStatus: 'unavailable',
            failureCodes: [error instanceof RequestPolicyError ? error.code : 'unexpected_error'],
          });
        })
        .finally(() => {
          if (!workStarted) releaseSlot();
          requestSignal.removeEventListener('abort', onDisconnect);
          if (!streamOpen) return;
          streamOpen = false;
          try {
            controller.close();
          } catch {
            // The client may have closed the connection after receiving the result.
          }
        });
    },
  });
}

export async function POST(request: NextRequest) {
  const telemetry = createScanRequestTelemetry(request, 'scan');
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
        { error: 'Sign in with Google to run a live scan.', code: 'authentication_required' },
        { status: 401, headers: { 'Cache-Control': 'no-store', 'X-Request-ID': telemetry.requestId } },
      );
    }
    const body = await parseJsonBody(request, 'scan');
    const { address, chainIds, refresh = false } = validateScanRequest(body);
    enforceRequestRateLimit(request, 'scan');
    if (refresh) await enforceRefreshRateLimit(request, 'scan', request.signal);
    const routeReleaseSlot = acquireRequestSlot('scan');
    releaseSlot = routeReleaseSlot;

    if (request.headers.get('accept')?.includes('application/x-ndjson')) {
      const stream = createScanProgressStream(address, chainIds, refresh, routeReleaseSlot, telemetry, request.signal);
      releaseSlot = undefined;
      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'application/x-ndjson; charset=utf-8',
          'Cache-Control': 'no-store, no-transform',
          'X-Content-Type-Options': 'nosniff',
          'X-Request-ID': telemetry.requestId,
        },
      });
    }

    const responseData = await runWithTimeout(
      signal => {
        workStarted = true;
        const scanWork = processWalletScan(address, chainIds, '', false, {
          forceRefresh: refresh,
          signal,
        });
        void scanWork.then(routeReleaseSlot, routeReleaseSlot);
        return scanWork;
      },
      SCAN_REQUEST_TIMEOUT_MS,
      { signal: request.signal },
    );
    throwIfAborted(request.signal);

    logScanRequest(telemetry, {
      outcome: 'completed',
      statusCode: 200,
      targetCount: 1,
      chainCount: chainIds.length,
      resultStatus: responseData.status,
      availabilityCounts: countAvailabilityStatuses(responseData.availability.flatMap(item => [
        item.transactions,
        item.tokenTransfers,
        item.internalTransactions,
        item.prices,
      ])),
      failureCodes: responseData.availability.flatMap(item => item.errors.map(error => error.code)),
    });

    return NextResponse.json(responseData, {
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
            ...(error.status === 429 ? { 'Retry-After': error.code === 'refresh_rate_limited' ? '300' : '60' } : {}),
            'Cache-Control': 'no-store',
            'X-Request-ID': telemetry.requestId,
          },
        },
      );
    }

    if (error instanceof Error && (error.message.includes('provide an EVM wallet') || error.message.includes('Unable to resolve ENS'))) {
      logScanRequest(telemetry, {
        outcome: 'rejected',
        statusCode: 400,
        failureCodes: ['invalid_target'],
      });
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: { 'Cache-Control': 'no-store', 'X-Request-ID': telemetry.requestId } },
      );
    }

    logScanRequest(telemetry, {
      outcome: 'failed',
      statusCode: 500,
      failureCodes: ['unexpected_error'],
    });

    return NextResponse.json(
      { error: 'An unexpected error occurred while analyzing the wallet.' },
      { status: 500, headers: { 'Cache-Control': 'no-store', 'X-Request-ID': telemetry.requestId } }
    );
  }
}
