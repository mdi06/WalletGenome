import { randomUUID } from 'node:crypto';
import { processWalletScan, type ProcessWalletScanProgress } from '@/lib/services/scanService';
import type { WalletScanResponse } from '@/lib/types';

const ACTIVE_JOB_TTL_MS = 15 * 60 * 1000;
const FINISHED_JOB_TTL_MS = 10 * 60 * 1000;

export type ScanJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface ScanJobSnapshot {
  jobId: string;
  target: {
    address: string;
    chainIds: number[];
  };
  status: ScanJobStatus;
  progress: ProcessWalletScanProgress;
  createdAt: number;
  updatedAt: number;
  result?: WalletScanResponse;
  error?: string;
}

interface ScanJobRecord extends ScanJobSnapshot {
  expiresAt: number;
  releaseSlot?: () => void;
  cleanupTimer?: ReturnType<typeof setTimeout>;
}

const scanJobs = new Map<string, ScanJobRecord>();
const activeTargetJobs = new Map<string, string>();

function now(): number {
  return Date.now();
}

function buildTargetKey(address: string, chainIds: number[]): string {
  const sortedChains = [...chainIds].sort((a, b) => a - b);
  return `${address.toLowerCase()}::${sortedChains.join(',')}`;
}

function cloneSnapshot(job: ScanJobRecord): ScanJobSnapshot {
  return {
    jobId: job.jobId,
    target: {
      address: job.target.address,
      chainIds: [...job.target.chainIds],
    },
    status: job.status,
    progress: { ...job.progress },
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    result: job.result,
    error: job.error,
  };
}

function cleanupExpiredJobs(): void {
  const currentTime = now();
  for (const [jobId, job] of scanJobs.entries()) {
    if (job.expiresAt > currentTime) continue;
    if (job.cleanupTimer) {
      clearTimeout(job.cleanupTimer);
      job.cleanupTimer = undefined;
    }
    scanJobs.delete(jobId);
    const targetKey = buildTargetKey(job.target.address, job.target.chainIds);
    if (activeTargetJobs.get(targetKey) === jobId) {
      activeTargetJobs.delete(targetKey);
    }
  }
}

function scheduleCleanup(job: ScanJobRecord): void {
  if (job.cleanupTimer) {
    clearTimeout(job.cleanupTimer);
  }

  const delayMs = Math.max(0, job.expiresAt - now());
  job.cleanupTimer = setTimeout(() => {
    cleanupExpiredJobs();
  }, delayMs);
  job.cleanupTimer.unref?.();
}

function finalizeJob(job: ScanJobRecord, status: 'completed' | 'failed', payload: WalletScanResponse | string): void {
  job.status = status;
  job.updatedAt = now();
  job.expiresAt = job.updatedAt + FINISHED_JOB_TTL_MS;
  if (status === 'completed') {
    job.result = payload as WalletScanResponse;
    job.error = undefined;
  } else {
    job.result = undefined;
    job.error = payload as string;
  }

  const targetKey = buildTargetKey(job.target.address, job.target.chainIds);
  if (activeTargetJobs.get(targetKey) === job.jobId) {
    activeTargetJobs.delete(targetKey);
  }

  scheduleCleanup(job);

  const releaseSlot = job.releaseSlot;
  job.releaseSlot = undefined;
  releaseSlot?.();
}

function startJob(job: ScanJobRecord): void {
  queueMicrotask(() => {
    job.status = 'running';
    job.updatedAt = now();
    job.progress = {
      phase: 'resolving',
      completedChains: 0,
      totalChains: job.target.chainIds.length,
    };

    void processWalletScan(
      job.target.address,
      job.target.chainIds,
      '',
      false,
      {
        onProgress: (progress) => {
          job.progress = { ...progress };
          job.updatedAt = now();
          job.expiresAt = job.updatedAt + ACTIVE_JOB_TTL_MS;
        },
      },
    ).then(
      (result) => finalizeJob(job, 'completed', result),
      (error: unknown) => {
        const message = error instanceof Error
          ? error.message
          : 'An unexpected error occurred while analyzing the wallet.';
        finalizeJob(job, 'failed', message);
      },
    );
  });
}

export function createScanJob(
  address: string,
  chainIds: number[],
  releaseSlot?: () => void,
): { job: ScanJobSnapshot; deduped: boolean } {
  cleanupExpiredJobs();

  const targetKey = buildTargetKey(address, chainIds);
  const activeJobId = activeTargetJobs.get(targetKey);
  if (activeJobId) {
    const activeJob = scanJobs.get(activeJobId);
    if (activeJob && (activeJob.status === 'queued' || activeJob.status === 'running')) {
      releaseSlot?.();
      return { job: cloneSnapshot(activeJob), deduped: true };
    }
    activeTargetJobs.delete(targetKey);
  }

  const createdAt = now();
  const jobId = randomUUID();
  const job: ScanJobRecord = {
    jobId,
    target: { address, chainIds: [...chainIds] },
    status: 'queued',
    progress: {
      phase: 'resolving',
      completedChains: 0,
      totalChains: chainIds.length,
    },
    createdAt,
    updatedAt: createdAt,
    expiresAt: createdAt + ACTIVE_JOB_TTL_MS,
    releaseSlot,
  };

  scanJobs.set(jobId, job);
  activeTargetJobs.set(targetKey, jobId);
  startJob(job);

  return { job: cloneSnapshot(job), deduped: false };
}

export function getScanJob(jobId: string): ScanJobSnapshot | null {
  cleanupExpiredJobs();
  const job = scanJobs.get(jobId);
  return job ? cloneSnapshot(job) : null;
}

export function resetScanJobsForTests(): void {
  scanJobs.clear();
  activeTargetJobs.clear();
}
