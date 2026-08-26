import { NextRequest, NextResponse } from 'next/server';
import { processWalletScan } from '@/lib/services/scanService';
import { formatScanProgress } from '@/lib/scanProgress';
import {
  SCAN_REQUEST_TIMEOUT_MS,
  RequestPolicyError,
  acquireRequestSlot,
  enforceRequestRateLimit,
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
  releaseSlot: () => void,
  telemetry: ScanRequestTelemetry,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const startedAt = Date.now();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      let streamOpen = true;
      const send = (event: unknown) => {
        if (!streamOpen) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          streamOpen = false;
        }
      };

      const scanWork = processWalletScan(address, chainIds, '', false, {
        onProgress: progress => send({
          type: 'progress',
          progress: formatScanProgress(progress, 'running'),
          startedAt,
          updatedAt: Date.now(),
        }),
      });

      void runWithTimeout(scanWork, SCAN_REQUEST_TIMEOUT_MS)
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
          send({ type: 'error', error: scanErrorMessage(error) });
          logScanRequest(telemetry, {
            outcome: 'failed',
            statusCode: 200,
            targetCount: 1,
            chainCount: chainIds.length,
            resultStatus: 'unavailable',
            failureCodes: [error instanceof RequestPolicyError ? error.code : 'unexpected_error'],
          });
        })
        .finally(() => {
          releaseSlot();
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

  try {
    const body = await parseJsonBody(request, 'scan');
    const { address, chainIds } = validateScanRequest(body);
    enforceRequestRateLimit(request, 'scan');
    const releaseSlot = acquireRequestSlot('scan');

    if (request.headers.get('accept')?.includes('application/x-ndjson')) {
      return new Response(createScanProgressStream(address, chainIds, releaseSlot, telemetry), {
        status: 200,
        headers: {
          'Content-Type': 'application/x-ndjson; charset=utf-8',
          'Cache-Control': 'no-store, no-transform',
          'X-Content-Type-Options': 'nosniff',
          'X-Request-ID': telemetry.requestId,
        },
      });
    }

    const scanWork = processWalletScan(address, chainIds);
    void scanWork.then(releaseSlot, releaseSlot);

    const responseData = await runWithTimeout(
      scanWork,
      SCAN_REQUEST_TIMEOUT_MS,
    );

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

    if (error instanceof Error && (error.message.includes('provide an EVM wallet') || error.message.includes('Unable to resolve ENS'))) {
      logScanRequest(telemetry, {
        outcome: 'rejected',
        statusCode: 400,
        failureCodes: ['invalid_target'],
      });
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: { 'X-Request-ID': telemetry.requestId } },
      );
    }

    logScanRequest(telemetry, {
      outcome: 'failed',
      statusCode: 500,
      failureCodes: ['unexpected_error'],
    });

    return NextResponse.json(
      { error: 'An unexpected error occurred while analyzing the wallet.' },
      { status: 500, headers: { 'X-Request-ID': telemetry.requestId } }
    );
  }
}
