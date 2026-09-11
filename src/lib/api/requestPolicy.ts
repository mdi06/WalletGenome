import { SUPPORTED_CHAIN_IDS } from '@/lib/chains';
import {
  acquireSharedLease,
  incrementSharedCounter,
  isSharedCacheConfigured,
  resetSharedProtectionForTests,
} from '@/lib/cache';
import {
  BATCH_REQUEST_TIMEOUT_MS,
  BATCH_WALLET_CONCURRENCY,
  MAX_BATCH_WALLETS,
  SCAN_REQUEST_TIMEOUT_MS,
} from './constants';
import {
  RequestCancellationError,
  cancellationErrorForSignal,
  throwIfAborted,
} from '@/lib/cancellation';

export {
  BATCH_REQUEST_TIMEOUT_MS,
  BATCH_WALLET_CONCURRENCY,
  MAX_BATCH_WALLETS,
  SCAN_REQUEST_TIMEOUT_MS,
};

const SINGLE_BODY_LIMIT_BYTES = 8_192;
const BATCH_BODY_LIMIT_BYTES = 32_768;
const TELEMETRY_BODY_LIMIT_BYTES = 2_048;
const BODY_READ_TIMEOUT_MS = 5_000;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMITS = { scan: 12, batch: 4, telemetry: 60 } as const;
const CONCURRENCY_LIMITS = { scan: 4, batch: 1, telemetry: 8 } as const;
const MAX_REQUEST_LOG_ENTRIES = 2_048;
const MAX_REQUEST_IDENTITY_LENGTH = 128;
const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const ENS_NAME = /^(?=.{1,255}$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,62}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,62}[a-zA-Z0-9])?)+$/;
const supportedChains = new Set<number>(SUPPORTED_CHAIN_IDS);
const REFRESH_COOLDOWN_SECONDS = 300;
const SHARED_QUOTA_WINDOW_SECONDS = 86_400;

export type RouteKind = keyof typeof RATE_LIMITS;

export class RequestPolicyError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = 'RequestPolicyError';
  }
}

export interface ValidatedScanRequest {
  address: string;
  chainIds: number[];
  refresh?: boolean;
}

export interface ValidatedBatchRequest {
  addresses: string[];
  chainIds: number[];
}

export type SharedQuotaKind = 'scan' | 'batch';

const requestLog = new Map<string, number[]>();
const activeRequests: Record<RouteKind, number> = { scan: 0, batch: 0, telemetry: 0 };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assertAllowedFields(body: Record<string, unknown>, allowed: readonly string[]): void {
  const unexpected = Object.keys(body).filter(key => !allowed.includes(key));
  if (unexpected.length > 0) {
    throw new RequestPolicyError(`Unsupported request field: ${unexpected[0]}.`, 400, 'unsupported_field');
  }
}

function validateTarget(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new RequestPolicyError(`${field} must be a string.`, 400, 'invalid_target');
  }
  const target = value.trim();
  if (!target || target.length > 255 || /[\u0000-\u001f\u007f]/.test(target)) {
    throw new RequestPolicyError(`${field} has an invalid length or contains control characters.`, 400, 'invalid_target');
  }
  if (!EVM_ADDRESS.test(target) && !ENS_NAME.test(target)) {
    throw new RequestPolicyError(`${field} must be a complete EVM address or ENS-style name.`, 400, 'invalid_target');
  }
  return target.toLowerCase();
}

function validateChainIds(value: unknown): number[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > SUPPORTED_CHAIN_IDS.length) {
    throw new RequestPolicyError('chainIds must be a non-empty array of supported chain IDs.', 400, 'invalid_chain_ids');
  }
  if (!value.every(chainId => Number.isInteger(chainId) && supportedChains.has(chainId as number))) {
    throw new RequestPolicyError('chainIds contains an unsupported chain ID.', 400, 'unsupported_chain');
  }
  const chainIds = value as number[];
  if (new Set(chainIds).size !== chainIds.length) {
    throw new RequestPolicyError('chainIds must not contain duplicates.', 400, 'duplicate_chain');
  }
  return chainIds;
}

async function readRequestBody(request: Request, maxBytes: number): Promise<string> {
  const body = request.body;
  if (!body) return '';

  const reader = body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let bytesRead = 0;
  const deadline = Date.now() + BODY_READ_TIMEOUT_MS;

  try {
    while (true) {
      throwIfAborted(request.signal);
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        throw new RequestPolicyError('Request body read timed out.', 408, 'body_read_timeout');
      }

      const result = await new Promise<ReadableStreamReadResult<Uint8Array>>((resolve, reject) => {
        let settled = false;
        const timeoutId = setTimeout(() => {
          if (settled) return;
          settled = true;
          request.signal.removeEventListener('abort', onAbort);
          reject(new RequestPolicyError('Request body read timed out.', 408, 'body_read_timeout'));
        }, remainingMs);
        const onAbort = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          reject(cancellationErrorForSignal(request.signal) ?? new RequestCancellationError('disconnect'));
        };
        request.signal.addEventListener('abort', onAbort, { once: true });

        void reader.read().then(
          value => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            request.signal.removeEventListener('abort', onAbort);
            resolve(value);
          },
          error => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            request.signal.removeEventListener('abort', onAbort);
            reject(error);
          },
        );
      });

      if (result.done) {
        chunks.push(decoder.decode());
        return chunks.join('');
      }

      bytesRead += result.value.byteLength;
      if (bytesRead > maxBytes) {
        throw new RequestPolicyError('Request body is too large.', 413, 'body_too_large');
      }
      chunks.push(decoder.decode(result.value, { stream: true }));
    }
  } catch (error) {
    void reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
}

export async function parseJsonBody(request: Request, kind: RouteKind): Promise<unknown> {
  const maxBytes = kind === 'scan'
    ? SINGLE_BODY_LIMIT_BYTES
    : kind === 'batch'
      ? BATCH_BODY_LIMIT_BYTES
      : TELEMETRY_BODY_LIMIT_BYTES;
  const declaredLength = request.headers.get('content-length');
  const contentLength = declaredLength === null || declaredLength.trim() === ''
    ? null
    : Number(declaredLength);
  if (contentLength !== null && (!Number.isSafeInteger(contentLength) || contentLength < 0)) {
    throw new RequestPolicyError('Content-Length must be a valid non-negative integer.', 400, 'invalid_content_length');
  }
  if (contentLength !== null && contentLength > maxBytes) {
    throw new RequestPolicyError('Request body is too large.', 413, 'body_too_large');
  }
  const text = await readRequestBody(request, maxBytes);
  try {
    return JSON.parse(text);
  } catch {
    throw new RequestPolicyError('Request body must be valid JSON.', 400, 'malformed_json');
  }
}

export function validateScanRequest(body: unknown): ValidatedScanRequest {
  if (!isRecord(body)) throw new RequestPolicyError('Request body must be an object.', 400, 'invalid_body');
  assertAllowedFields(body, ['address', 'chainIds', 'refresh']);
  if ('refresh' in body && typeof body.refresh !== 'boolean') {
    throw new RequestPolicyError('refresh must be a boolean.', 400, 'invalid_refresh');
  }
  return {
    address: validateTarget(body.address, 'address'),
    chainIds: validateChainIds(body.chainIds),
    ...(body.refresh === true ? { refresh: true } : {}),
  };
}

export function validateBatchRequest(body: unknown): ValidatedBatchRequest {
  if (!isRecord(body)) throw new RequestPolicyError('Request body must be an object.', 400, 'invalid_body');
  assertAllowedFields(body, ['addresses', 'chainIds']);
  if (!Array.isArray(body.addresses) || body.addresses.length === 0) {
    throw new RequestPolicyError('addresses must be a non-empty array.', 400, 'invalid_addresses');
  }
  if (body.addresses.length > MAX_BATCH_WALLETS) {
    throw new RequestPolicyError(
      `addresses must contain at most ${MAX_BATCH_WALLETS} wallets.`,
      400,
      'too_many_wallets',
    );
  }
  const chainIds = validateChainIds(body.chainIds);
  const addresses = body.addresses.map((target, index) => {
    if (typeof target !== 'string' || !EVM_ADDRESS.test(target.trim())) {
      throw new RequestPolicyError(
        `addresses[${index}] must be a complete EVM address. ENS names are not supported in batch scans.`,
        400,
        'invalid_target',
      );
    }
    return target.trim().toLowerCase();
  });
  if (new Set(addresses).size !== addresses.length) {
    throw new RequestPolicyError('addresses must not contain duplicates.', 400, 'duplicate_wallet');
  }
  return { addresses, chainIds };
}

function requestIdentity(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  const identity = forwarded || realIp || 'local';
  if (
    identity.length > MAX_REQUEST_IDENTITY_LENGTH
    || !/^[A-Za-z0-9:._-]+$/.test(identity)
  ) {
    throw new RequestPolicyError('Caller identity header is invalid.', 400, 'invalid_caller_identity');
  }
  return identity;
}

function storeRequestLog(key: string, timestamps: number[]): void {
  requestLog.delete(key);
  requestLog.set(key, timestamps);
  while (requestLog.size > MAX_REQUEST_LOG_ENTRIES) {
    const oldestKey = requestLog.keys().next().value;
    if (typeof oldestKey !== 'string') break;
    requestLog.delete(oldestKey);
  }
}

function pruneRequestLog(now: number): void {
  for (const [key, timestamps] of requestLog) {
    const recent = timestamps.filter(timestamp => now - timestamp < RATE_WINDOW_MS);
    if (recent.length === 0) requestLog.delete(key);
    else requestLog.set(key, recent);
  }
}

export function enforceRequestRateLimit(request: Request, kind: RouteKind): { retryAfterSeconds: number } {
  const now = Date.now();
  pruneRequestLog(now);
  const key = `${kind}:${requestIdentity(request)}`;
  const recent = (requestLog.get(key) || []).filter(timestamp => now - timestamp < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMITS[kind]) {
    const retryAfterSeconds = Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - recent[0])) / 1000));
    storeRequestLog(key, recent);
    throw new RequestPolicyError(`Rate limit exceeded. Retry in ${retryAfterSeconds} seconds.`, 429, 'rate_limited');
  }
  recent.push(now);
  storeRequestLog(key, recent);
  return { retryAfterSeconds: 0 };
}

function positiveEnvironmentInteger(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

function utcQuotaKey(kind: SharedQuotaKind): string {
  return `wallet-analytics:quota:v1:${kind}:${new Date().toISOString().slice(0, 10)}`;
}

export async function enforceSharedQuota(
  kind: SharedQuotaKind,
  weight = 1,
  signal?: AbortSignal,
): Promise<void> {
  throwIfAborted(signal);
  // Without the external store, the existing per-instance controls remain in
  // force. A deployment-wide quota is only meaningful when Redis is shared.
  if (!isSharedCacheConfigured()) return;

  const limit = positiveEnvironmentInteger(
    kind === 'scan' ? 'SHARED_SCAN_DAILY_LIMIT' : 'SHARED_BATCH_DAILY_LIMIT',
    kind === 'scan' ? 500 : 100,
  );
  const result = await incrementSharedCounter(
    utcQuotaKey(kind),
    SHARED_QUOTA_WINDOW_SECONDS,
    limit,
    weight,
    signal,
  );
  if (result.unavailable) {
    throw new RequestPolicyError(
      'Shared scan quota is temporarily unavailable. Please try again later.',
      503,
      'shared_quota_unavailable',
    );
  }
  if (!result.allowed) {
    throw new RequestPolicyError(
      `The shared ${kind} scan quota is exhausted for today. Please try again tomorrow.`,
      429,
      'shared_quota_exhausted',
    );
  }
}

export async function enforceRefreshRateLimit(
  request: Request,
  kind: 'scan' | 'batch' = 'scan',
  signal?: AbortSignal,
): Promise<void> {
  const key = `wallet-analytics:refresh:v1:${kind}:${requestIdentity(request)}`;
  throwIfAborted(signal);
  const result = await acquireSharedLease(key, REFRESH_COOLDOWN_SECONDS, signal);
  if (result.unavailable) {
    throw new RequestPolicyError(
      'Refresh protection is temporarily unavailable. Please try again later.',
      503,
      'refresh_protection_unavailable',
    );
  }
  if (!result.acquired) {
    throw new RequestPolicyError(
      'Refresh is limited to once every five minutes for this caller. Please try again later.',
      429,
      'refresh_rate_limited',
    );
  }
}

export function acquireRequestSlot(kind: RouteKind): () => void {
  if (activeRequests[kind] >= CONCURRENCY_LIMITS[kind]) {
    throw new RequestPolicyError('Server scan concurrency is currently exhausted.', 429, 'concurrency_limited');
  }
  activeRequests[kind]++;
  let released = false;
  return () => {
    if (!released) {
      activeRequests[kind]--;
      released = true;
    }
  };
}

export interface RunWithTimeoutOptions {
  signal?: AbortSignal;
}

export function runWithTimeout<T>(
  work: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  options?: RunWithTimeoutOptions,
): Promise<T>;

export function runWithTimeout<T>(
  work: Promise<T>,
  timeoutMs: number,
  options?: RunWithTimeoutOptions,
): Promise<T>;

export function runWithTimeout<T>(
  work: Promise<T> | ((signal: AbortSignal) => Promise<T>),
  timeoutMs: number,
  options: RunWithTimeoutOptions = {},
): Promise<T> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let finished = false;
  const promiseWork = typeof work === 'function' ? undefined : work;

  return new Promise<T>((resolve, reject) => {
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      options.signal?.removeEventListener('abort', externalAbortHandler);
    };

    const finish = (callback: typeof resolve, value: T): void => {
      if (finished) return;
      finished = true;
      cleanup();
      callback(value);
    };

    const fail = (error: unknown): void => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(error);
    };

    const externalAbortHandler = () => {
      const error = cancellationErrorForSignal(options.signal)
        ?? new RequestCancellationError('disconnect');
      controller.abort(error);
      fail(error);
    };

    if (options.signal?.aborted) {
      externalAbortHandler();
    } else {
      options.signal?.addEventListener('abort', externalAbortHandler, { once: true });
      timeoutId = setTimeout(() => {
        const error = new RequestPolicyError('Scan work budget exceeded.', 504, 'request_timeout');
        controller.abort(new RequestCancellationError('deadline'));
        fail(error);
      }, timeoutMs);
    }

    if (finished) {
      // A promise supplied by a legacy caller may already be running. Observe
      // it even when the request was already cancelled so it cannot become an
      // unhandled rejection.
      void promiseWork?.then(() => undefined, () => undefined);
      return;
    }

    let workPromise: Promise<T>;
    try {
      workPromise = typeof work === 'function'
        ? Promise.resolve(work(controller.signal))
        : work;
    } catch (error) {
      fail(error);
      return;
    }

    void workPromise.then(
      value => finish(resolve, value),
      error => fail(error),
    );
  });
}

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number, signal?: AbortSignal) => Promise<R>,
  options: { signal?: AbortSignal } = {},
): Promise<R[]> {
  throwIfAborted(options.signal);
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  async function worker(): Promise<void> {
    while (true) {
      throwIfAborted(options.signal);
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index, options.signal);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

export function resetRequestPolicyForTests(): void {
  requestLog.clear();
  activeRequests.scan = 0;
  activeRequests.batch = 0;
  resetSharedProtectionForTests();
}
