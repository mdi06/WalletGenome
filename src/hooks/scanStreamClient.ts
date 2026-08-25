import type { DisplayScanProgress } from '@/lib/scanProgress';
import type { MultiChainScanResult } from '@/lib/types';

export interface ScanStreamProgressUpdate {
  progress: DisplayScanProgress;
  startedAt: number;
  updatedAt: number;
}

interface ProgressEvent extends ScanStreamProgressUpdate {
  type: 'progress';
}

interface ResultEvent {
  type: 'result';
  result: MultiChainScanResult;
}

interface ErrorEvent {
  type: 'error';
  error: string;
}

type ScanStreamEvent = ProgressEvent | ResultEvent | ErrorEvent;

interface RunSingleWalletScanStreamOptions {
  address: string;
  chainIds: number[];
  signal?: AbortSignal;
  onUpdate?: (update: ScanStreamProgressUpdate) => void;
  fetchImpl?: typeof fetch;
}

function cancellationError(): DOMException {
  return new DOMException('The scan was cancelled.', 'AbortError');
}

function parseEvent(line: string): ScanStreamEvent {
  const parsed = JSON.parse(line) as ScanStreamEvent;
  if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
    throw new Error('The scan service returned an invalid progress event.');
  }
  return parsed;
}

export async function runSingleWalletScanStream({
  address,
  chainIds,
  signal,
  onUpdate,
  fetchImpl = fetch,
}: RunSingleWalletScanStreamOptions): Promise<MultiChainScanResult> {
  const response = await fetchImpl('/api/scan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/x-ndjson',
    },
    body: JSON.stringify({ address, chainIds }),
    signal,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || `HTTP ${response.status}`);
  }
  if (!response.body) {
    throw new Error('The scan service did not provide a progress stream.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: MultiChainScanResult | undefined;

  const handleLine = (line: string) => {
    if (!line.trim()) return;
    const event = parseEvent(line);
    if (event.type === 'progress') onUpdate?.(event);
    if (event.type === 'result') result = event.result;
    if (event.type === 'error') throw new Error(event.error || 'Forensic scan failed.');
  };

  while (true) {
    if (signal?.aborted) throw cancellationError();
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) handleLine(line);
    if (done) break;
  }
  handleLine(buffer);

  if (!result) {
    throw new Error('The scan stream ended without a forensic report.');
  }
  return result;
}
