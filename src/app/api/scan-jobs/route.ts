import { NextRequest, NextResponse } from 'next/server';
import { createScanJob, type ScanJobStatus } from '@/lib/services/scanJobService';
import type { ProcessWalletScanProgress } from '@/lib/services/scanService';
import {
  RequestPolicyError,
  acquireRequestSlot,
  enforceRequestRateLimit,
  parseJsonBody,
  validateScanRequest,
} from '@/lib/api/requestPolicy';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function formatProgress(progress: ProcessWalletScanProgress, status: ScanJobStatus) {
  if (status === 'completed') {
    return {
      message: 'Scan complete.',
      progressPercent: 100,
    };
  }

  if (status === 'failed') {
    return {
      message: 'Scan failed.',
      progressPercent: 100,
    };
  }

  const totalChains = progress.totalChains ?? 0;
  const completedChains = progress.completedChains ?? 0;

  let message = 'Indexing EVM block state and resolving multi-chain forensics...';
  let progressPercent = 8;

  switch (progress.phase) {
    case 'resolving':
      message = 'Resolving wallet identity and scan target...';
      progressPercent = 8;
      break;
    case 'fetching':
      message = progress.currentChainName
        ? `Fetching full history on ${progress.currentChainName} (${completedChains}/${totalChains || 1})...`
        : `Fetching full history across ${totalChains || 1} chains...`;
      progressPercent = totalChains > 0
        ? 18 + Math.round((Math.min(completedChains, totalChains) / totalChains) * 52)
        : 18;
      break;
    case 'pricing':
      message = 'Resolving historical token prices and valuation inputs...';
      progressPercent = 76;
      break;
    case 'analyzing':
      message = 'Computing wallet risk, approvals, flows, and behavioral fingerprints...';
      progressPercent = 90;
      break;
    case 'finalizing':
      message = 'Finalizing forensic report...';
      progressPercent = 97;
      break;
  }

  return { message, progressPercent };
}

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
        progress: formatProgress(job.progress, deduped ? 'running' : job.status),
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
