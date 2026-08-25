import { NextRequest, NextResponse } from 'next/server';
import { createScanJob } from '@/lib/services/scanJobService';
import { formatScanProgress } from '@/lib/scanProgress';
import {
  RequestPolicyError,
  acquireRequestSlot,
  enforceRequestRateLimit,
  parseJsonBody,
  validateScanRequest,
} from '@/lib/api/requestPolicy';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request, 'scan');
    const { address, chainIds } = validateScanRequest(body);
    enforceRequestRateLimit(request, 'scan');
    const releaseSlot = acquireRequestSlot('scan');
    const { job, deduped } = createScanJob(address, chainIds, releaseSlot);

    return NextResponse.json(
      {
        jobId: job.jobId,
        state: deduped ? 'running' : job.status,
        progress: formatScanProgress(job.progress, deduped ? 'running' : job.status),
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
      { status: 202 },
    );
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

    console.error('Scan job start error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while starting the wallet scan.' },
      { status: 500 },
    );
  }
}
