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

export const maxDuration = 300;

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
        .then(result => send({ type: 'result', result }))
        .catch((error: unknown) => {
          console.error('Streaming scan error:', error);
          send({ type: 'error', error: scanErrorMessage(error) });
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
  try {
    const body = await parseJsonBody(request, 'scan');
    const { address, chainIds } = validateScanRequest(body);
    enforceRequestRateLimit(request, 'scan');
    const releaseSlot = acquireRequestSlot('scan');

    if (request.headers.get('accept')?.includes('application/x-ndjson')) {
      return new Response(createScanProgressStream(address, chainIds, releaseSlot), {
        status: 200,
        headers: {
          'Content-Type': 'application/x-ndjson; charset=utf-8',
          'Cache-Control': 'no-store, no-transform',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    const scanWork = processWalletScan(address, chainIds);
    void scanWork.then(releaseSlot, releaseSlot);

    const responseData = await runWithTimeout(
      scanWork,
      SCAN_REQUEST_TIMEOUT_MS,
    );

    return NextResponse.json(responseData);
  } catch (error: unknown) {
    if (error instanceof RequestPolicyError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        {
          status: error.status,
          headers: error.status === 429 ? { 'Retry-After': '60' } : undefined,
        },
      );
    }

    if (error instanceof Error && (error.message.includes('provide an EVM wallet') || error.message.includes('Unable to resolve ENS'))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Scan error:', error);

    return NextResponse.json(
      { error: 'An unexpected error occurred while analyzing the wallet.' },
      { status: 500 }
    );
  }
}
