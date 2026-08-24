import { NextResponse } from 'next/server';
import { getScanJob } from '@/lib/services/scanJobService';
import type { ProcessWalletScanProgress } from '@/lib/services/scanService';
import type { ScanJobStatus } from '@/lib/services/scanJobService';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function formatProgress(progress: ProcessWalletScanProgress, status: ScanJobStatus, error?: string) {
  if (status === 'completed') {
    return {
      message: 'Forensic scan complete.',
      progressPercent: 100,
    };
  }

  if (status === 'failed') {
    return {
      message: error || 'Forensic scan failed.',
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

export async function GET(_: Request, context: RouteContext<'/api/scan-jobs/[jobId]'>) {
  const { jobId } = await context.params;
  const job = getScanJob(jobId);

  if (!job) {
    return NextResponse.json(
      { error: 'Scan job not found.', code: 'job_not_found' },
      { status: 404 },
    );
  }

  return NextResponse.json({
    jobId: job.jobId,
    state: job.status,
    progress: formatProgress(job.progress, job.status, job.error),
    result: job.result,
    error: job.error,
  });
}
