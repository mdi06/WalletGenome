import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  BATCH_WALLET_CONCURRENCY,
  RequestPolicyError,
  acquireRequestSlot,
  enforceRequestRateLimit,
  mapWithConcurrency,
  resetRequestPolicyForTests,
  runWithTimeout,
  validateBatchRequest,
  validateScanRequest,
} from './requestPolicy';

describe('API request policy', () => {
  it('validates supported single-scan input and rejects arbitrary fields', () => {
    assert.deepStrictEqual(validateScanRequest({
      address: '0x1111111111111111111111111111111111111111',
      chainIds: [1, 8453],
    }), {
      address: '0x1111111111111111111111111111111111111111',
      chainIds: [1, 8453],
    });

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

  it('rejects malformed batch entries, duplicates, and unsupported chains without a wallet-count cap', () => {
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
    const expandedBatch = validateBatchRequest({
      addresses: Array.from({ length: 25 }, (_, index) =>
        `0x${(index + 1).toString(16).padStart(40, '0')}`),
      chainIds: [1],
    });
    assert.strictEqual(expandedBatch.addresses.length, 25);
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

  it('enforces timeout and bounded mapper concurrency', async () => {
    await assert.rejects(
      runWithTimeout(new Promise(() => {}), 5),
      (error: unknown) => error instanceof RequestPolicyError && error.code === 'request_timeout',
    );

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
