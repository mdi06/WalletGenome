export type RequestCancellationReason = 'deadline' | 'disconnect';

export class RequestCancellationError extends Error {
  constructor(readonly reason: RequestCancellationReason) {
    super(reason === 'deadline' ? 'The scan work deadline expired.' : 'The scan client disconnected.');
    this.name = 'AbortError';
  }
}

export function cancellationErrorForSignal(signal?: AbortSignal): RequestCancellationError | null {
  if (!signal?.aborted) return null;
  if (signal.reason instanceof RequestCancellationError) return signal.reason;
  return new RequestCancellationError('disconnect');
}

export function throwIfAborted(signal?: AbortSignal): void {
  const error = cancellationErrorForSignal(signal);
  if (error) throw error;
}

export function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) {
    throwIfAborted(signal);
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      signal?.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      cleanup();
      reject(cancellationErrorForSignal(signal) ?? new RequestCancellationError('disconnect'));
    };

    if (signal?.aborted) {
      onAbort();
      return;
    }

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export function linkAbortSignal(parentSignal?: AbortSignal): {
  controller: AbortController;
  signal: AbortSignal;
  dispose: () => void;
} {
  const controller = new AbortController();
  const onAbort = () => {
    controller.abort(parentSignal?.reason ?? new RequestCancellationError('disconnect'));
  };

  if (parentSignal?.aborted) onAbort();
  else parentSignal?.addEventListener('abort', onAbort, { once: true });

  return {
    controller,
    signal: controller.signal,
    dispose: () => parentSignal?.removeEventListener('abort', onAbort),
  };
}
