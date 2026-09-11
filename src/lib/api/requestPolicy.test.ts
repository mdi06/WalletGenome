import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  BATCH_WALLET_CONCURRENCY,
  MAX_BATCH_WALLETS,
  RequestPolicyError,
  acquireRequestSlot,
  enforceRequestRateLimit,
  enforceRefreshRateLimit,
  mapWithConcurrency,
  parseJsonBody,
  resetRequestPolicyForTests,
  runWithTimeout,
  validateBatchRequest,
  validateScanRequest,
} from './requestPolicy';
import { RequestCancellationError } from '@/lib/cancellation';

describe('API request policy', () => {
  it('validates supported single-scan input and rejects arbitrary fields', () => {
    assert.deepStrictEqual(validateScanRequest({
      address: '0x1111111111111111111111111111111111111111',
      chainIds: [1, 8453],
    }), {
      address: '0x1111111111111111111111111111111111111111',
      chainIds: [1, 8453],
    });

    assert.deepStrictEqual(validateScanRequest({
      address: '0x1111111111111111111111111111111111111111',
      chainIds: [1],
      refresh: true,
    }), {
      address: '0x1111111111111111111111111111111111111111',
      chainIds: [1],
      refresh: true,
    });

    assert.throws(
      () => validateScanRequest({
        address: '0x1111111111111111111111111111111111111111',
        chainIds: [1],
        refresh: 'yes',
      }),
      (error: unknown) => error instanceof RequestPolicyError && error.code === 'invalid_refresh',
    );

    assert.throws(
      () => validateScanRequest({
        address: '0x1111111111111111111111111111111111111111',
        chainIds: [1],
        isDemo: true,
      }),
      (error: unknown) => error instanceof RequestPolicyError && error.code === 'unsupported_field',
    );

    assert.throws(
      () => validateScanRequest({
        address: '0x1111111111111111111111111111111111111111',
        chainIds: [1],
        customApiKey: 'must-not-be-accepted',
      }),
      (error: unknown) => error instanceof RequestPolicyError && error.code === 'unsupported_field',
    );

    assert.throws(
      () => validateScanRequest({
        address: '0x1111111111111111111111111111111111111111',
        chainIds: [56],
      }),
      (error: unknown) => error instanceof RequestPolicyError && error.code === 'unsupported_chain',
    );
  });

  it('rejects malformed batch entries, duplicates, unsupported chains, and oversized batches', () => {
    assert.throws(
      () => validateBatchRequest({ addresses: [123], chainIds: [1] }),
      (error: unknown) => error instanceof RequestPolicyError && error.code === 'invalid_target',
    );
    assert.throws(
      () => validateBatchRequest({
        addresses: [
          '0x1111111111111111111111111111111111111111',
          '0x1111111111111111111111111111111111111111',
        ],
        chainIds: [1],
      }),
      (error: unknown) => error instanceof RequestPolicyError && error.code === 'duplicate_wallet',
    );
    assert.throws(
      () => validateBatchRequest({ addresses: ['vitalik.eth'], chainIds: [999999] }),
      (error: unknown) => error instanceof RequestPolicyError && error.code === 'unsupported_chain',
    );
    assert.throws(
      () => validateBatchRequest({ addresses: ['vitalik.eth'], chainIds: [56] }),
      (error: unknown) => error instanceof RequestPolicyError && error.code === 'unsupported_chain',
    );
    assert.throws(
      () => validateBatchRequest({ addresses: ['vitalik.eth'], chainIds: [1] }),
      (error: unknown) => error instanceof RequestPolicyError && error.code === 'invalid_target',
    );
    const boundedBatch = validateBatchRequest({
      addresses: Array.from({ length: MAX_BATCH_WALLETS }, (_, index) =>
        `0x${(index + 1).toString(16).padStart(40, '0')}`),
      chainIds: [1],
    });
    assert.strictEqual(boundedBatch.addresses.length, MAX_BATCH_WALLETS);
    assert.throws(
      () => validateBatchRequest({
        addresses: Array.from({ length: MAX_BATCH_WALLETS + 1 }, (_, index) =>
          `0x${(index + 1).toString(16).padStart(40, '0')}`),
        chainIds: [1],
      }),
      (error: unknown) => error instanceof RequestPolicyError && error.code === 'too_many_wallets',
    );
  });

  it('rate-limits repeated callers deterministically', () => {
    resetRequestPolicyForTests();
    const request = new Request('http://localhost/api/batch-scan', {
      headers: { 'x-forwarded-for': '203.0.113.10' },
    });
    for (let attempt = 0; attempt < 4; attempt++) enforceRequestRateLimit(request, 'batch');
    assert.throws(
      () => enforceRequestRateLimit(request, 'batch'),
      (error: unknown) => error instanceof RequestPolicyError && error.status === 429,
    );
    resetRequestPolicyForTests();
  });

  it('cancels a streamed body as soon as it exceeds the route limit', async () => {
    let cancelCalled = false;
    const chunk = new Uint8Array(4_096);
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(chunk);
      },
      cancel() {
        cancelCalled = true;
      },
    });

    await assert.rejects(
      parseJsonBody(new Request('http://localhost/api/scan', {
        method: 'POST',
        body,
        duplex: 'half',
      } as RequestInit & { duplex: 'half' }), 'scan'),
      (error: unknown) => error instanceof RequestPolicyError
        && error.status === 413
        && error.code === 'body_too_large',
    );
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.equal(cancelCalled, true);
  });

  it('rejects invalid caller identity headers instead of creating unbounded keys', () => {
    resetRequestPolicyForTests();
    const request = new Request('http://localhost/api/scan', {
      headers: { 'x-forwarded-for': 'not a trusted identity' },
    });

    assert.throws(
      () => enforceRequestRateLimit(request, 'scan'),
      (error: unknown) => error instanceof RequestPolicyError
        && error.code === 'invalid_caller_identity',
    );
    resetRequestPolicyForTests();
  });

  it('applies a separate bounded request limit to telemetry callers', () => {
    resetRequestPolicyForTests();
    const request = new Request('http://localhost/api/web-vitals', {
      headers: { 'x-forwarded-for': '203.0.113.12' },
    });
    for (let attempt = 0; attempt < 60; attempt++) enforceRequestRateLimit(request, 'telemetry');

    assert.throws(
      () => enforceRequestRateLimit(request, 'telemetry'),
      (error: unknown) => error instanceof RequestPolicyError
        && error.status === 429
        && error.code === 'rate_limited',
    );
    resetRequestPolicyForTests();
  });

  it('rate-limits forced refreshes separately from ordinary scans', async () => {
    resetRequestPolicyForTests();
    const request = new Request('http://localhost/api/scan', {
      headers: { 'x-forwarded-for': '203.0.113.11' },
    });
    await enforceRefreshRateLimit(request);
    await assert.rejects(
      enforceRefreshRateLimit(request),
      (error: unknown) => error instanceof RequestPolicyError
        && error.status === 429
        && error.code === 'refresh_rate_limited',
    );
    resetRequestPolicyForTests();
  });

  it('bounds active route work until each task actually settles', () => {
    resetRequestPolicyForTests();
    const releaseBatch = acquireRequestSlot('batch');
    assert.throws(
      () => acquireRequestSlot('batch'),
      (error: unknown) => error instanceof RequestPolicyError && error.code === 'concurrency_limited',
    );
    releaseBatch();
    const releaseNextBatch = acquireRequestSlot('batch');
    releaseNextBatch();
    resetRequestPolicyForTests();
  });

  it('aborts timed-out work while waiting for the underlying operation to settle', async () => {
    let workAborted = false;
    let workSettled = false;
    const timedWork = runWithTimeout(signal => new Promise<void>(resolve => {
      signal.addEventListener('abort', () => {
        workAborted = true;
        setTimeout(() => {
          workSettled = true;
          resolve();
        }, 10);
      }, { once: true });
    }), 5);

    await assert.rejects(
      timedWork,
      (error: unknown) => error instanceof RequestPolicyError && error.code === 'request_timeout',
    );
    assert.strictEqual(workAborted, true);
    assert.strictEqual(workSettled, false);
    await new Promise(resolve => setTimeout(resolve, 15));
    assert.strictEqual(workSettled, true);
  });

  it('propagates a disconnected request to cancellable work', async () => {
    const requestController = new AbortController();
    const pending = runWithTimeout(signal => new Promise<void>(resolve => {
      signal.addEventListener('abort', () => resolve(), { once: true });
    }), 100, { signal: requestController.signal });

    requestController.abort();
    await assert.rejects(
      pending,
      (error: unknown) => error instanceof RequestCancellationError && error.reason === 'disconnect',
    );
  });

  it('stops claiming new mapper items after cancellation', async () => {
    const requestController = new AbortController();
    const started: number[] = [];
    await assert.rejects(
      mapWithConcurrency([1, 2, 3, 4], 3, async value => {
        started.push(value);
        requestController.abort();
        return value;
      }, { signal: requestController.signal }),
      (error: unknown) => error instanceof RequestCancellationError && error.reason === 'disconnect',
    );
    assert.deepStrictEqual(started, [1]);
  });

  it('enforces bounded mapper concurrency', async () => {

    let active = 0;
    let peak = 0;
    const results = await mapWithConcurrency([1, 2, 3, 4, 5, 6], BATCH_WALLET_CONCURRENCY, async value => {
      active++;
      peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 2));
      active--;
      return value * 2;
    });
    assert.deepStrictEqual(results, [2, 4, 6, 8, 10, 12]);
    assert.ok(peak <= BATCH_WALLET_CONCURRENCY);
  });
});
