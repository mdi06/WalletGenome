import { NextResponse } from 'next/server';
import { getScanJob } from '@/lib/services/scanJobService';
import { formatScanProgress } from '@/lib/scanProgress';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
    progress: formatScanProgress(job.progress, job.status, job.error),
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    result: job.result,
    error: job.error,
  });
}
