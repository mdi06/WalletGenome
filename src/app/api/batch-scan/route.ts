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

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request, 'batch');
    const { addresses: uniqueTargets, chainIds } = validateBatchRequest(body);
    enforceRequestRateLimit(request, 'batch');
    const releaseSlot = acquireRequestSlot('batch');
    const batchWork = processBatchScan(uniqueTargets, chainIds);
    void batchWork.then(releaseSlot, releaseSlot);
    const clusterData = await runWithTimeout(batchWork, BATCH_REQUEST_TIMEOUT_MS);

    return NextResponse.json(clusterData);

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
    console.error('Batch Scan error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while analyzing the cluster.' },
      { status: 500 }
    );
  }
}
