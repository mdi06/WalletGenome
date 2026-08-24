import { NextRequest, NextResponse } from 'next/server';
import { processWalletScan } from '@/lib/services/scanService';
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

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request, 'scan');
    const { address, chainIds } = validateScanRequest(body);
    enforceRequestRateLimit(request, 'scan');
    const releaseSlot = acquireRequestSlot('scan');
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
