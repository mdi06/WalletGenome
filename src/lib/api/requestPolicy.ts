import { SUPPORTED_CHAIN_IDS } from '@/lib/chains';
import {
  BATCH_REQUEST_TIMEOUT_MS,
  BATCH_WALLET_CONCURRENCY,
  MAX_BATCH_WALLETS,
  SCAN_REQUEST_TIMEOUT_MS,
} from './constants';

export {
  BATCH_REQUEST_TIMEOUT_MS,
  BATCH_WALLET_CONCURRENCY,
  MAX_BATCH_WALLETS,
  SCAN_REQUEST_TIMEOUT_MS,
};

const SINGLE_BODY_LIMIT_BYTES = 8_192;
const BATCH_BODY_LIMIT_BYTES = 32_768;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMITS = { scan: 12, batch: 4 } as const;
const CONCURRENCY_LIMITS = { scan: 4, batch: 1 } as const;
const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const ENS_NAME = /^(?=.{1,255}$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,62}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,62}[a-zA-Z0-9])?)+$/;
const supportedChains = new Set<number>(SUPPORTED_CHAIN_IDS);

type RouteKind = keyof typeof RATE_LIMITS;

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
}

export interface ValidatedBatchRequest {
  addresses: string[];
  chainIds: number[];
}

const requestLog = new Map<string, number[]>();
const activeRequests: Record<RouteKind, number> = { scan: 0, batch: 0 };

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

export async function parseJsonBody(request: Request, kind: RouteKind): Promise<unknown> {
  const maxBytes = kind === 'scan' ? SINGLE_BODY_LIMIT_BYTES : BATCH_BODY_LIMIT_BYTES;
  const contentLength = Number(request.headers.get('content-length') || '0');
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new RequestPolicyError('Request body is too large.', 413, 'body_too_large');
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new RequestPolicyError('Request body is too large.', 413, 'body_too_large');
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new RequestPolicyError('Request body must be valid JSON.', 400, 'malformed_json');
  }
}

export function validateScanRequest(body: unknown): ValidatedScanRequest {
  if (!isRecord(body)) throw new RequestPolicyError('Request body must be an object.', 400, 'invalid_body');
  assertAllowedFields(body, ['address', 'chainIds']);
  return {
    address: validateTarget(body.address, 'address'),
    chainIds: validateChainIds(body.chainIds),
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
  const addresses = body.addresses.map((target, index) => validateTarget(target, `addresses[${index}]`));
  if (new Set(addresses).size !== addresses.length) {
    throw new RequestPolicyError('addresses must not contain duplicates.', 400, 'duplicate_wallet');
  }
  return { addresses, chainIds: validateChainIds(body.chainIds) };
}

function requestIdentity(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'local';
}

export function enforceRequestRateLimit(request: Request, kind: RouteKind): { retryAfterSeconds: number } {
  const now = Date.now();
  const key = `${kind}:${requestIdentity(request)}`;
  const recent = (requestLog.get(key) || []).filter(timestamp => now - timestamp < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMITS[kind]) {
    const retryAfterSeconds = Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - recent[0])) / 1000));
    requestLog.set(key, recent);
    throw new RequestPolicyError(`Rate limit exceeded. Retry in ${retryAfterSeconds} seconds.`, 429, 'rate_limited');
  }
  recent.push(now);
  requestLog.set(key, recent);
  return { retryAfterSeconds: 0 };
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

export async function runWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new RequestPolicyError('Scan work budget exceeded.', 504, 'request_timeout')),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

export function resetRequestPolicyForTests(): void {
  requestLog.clear();
  activeRequests.scan = 0;
  activeRequests.batch = 0;
}
