import assert from 'node:assert';
import { describe, it } from 'node:test';
import { runSingleWalletScanStream, type ScanStreamProgressUpdate } from './scanStreamClient';
import type { MultiChainScanResult } from '@/lib/types';

const completedResult = {
  address: '0x1111111111111111111111111111111111111111',
} as MultiChainScanResult;

function ndjsonResponse(events: unknown[]): Response {
  return new Response(events.map(event => JSON.stringify(event)).join('\n'), {
    status: 200,
    headers: { 'Content-Type': 'application/x-ndjson' },
  });
}

describe('single-wallet scan stream client', () => {
  it('reports streamed progress and returns the completed result', async () => {
    const updates: ScanStreamProgressUpdate[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      assert.strictEqual(String(input), '/api/scan');
      assert.strictEqual(new Headers(init?.headers).get('accept'), 'application/x-ndjson');
      return ndjsonResponse([
        {
          type: 'progress',
          progress: {
            message: 'Resolving wallet identity...', progressPercent: 8, phase: 'resolving',
            totalChains: 2, completedChains: 0, completedChainIds: [], recordsFound: 0,
          },
          startedAt: 100,
          updatedAt: 100,
        },
        {
          type: 'progress',
          progress: {
            message: '1 of 2 chain histories complete; 12 records found so far.', progressPercent: 53,
            phase: 'fetching', totalChains: 2, completedChains: 1, completedChainIds: [1], recordsFound: 12,
          },
          startedAt: 100,
          updatedAt: 200,
        },
        { type: 'result', result: completedResult },
      ]);
    };

    const result = await runSingleWalletScanStream({
      address: completedResult.address,
      chainIds: [1, 8453],
      fetchImpl,
      onUpdate: update => updates.push(update),
    });

    assert.deepStrictEqual(result, completedResult);
    assert.deepStrictEqual(updates.map(update => update.progress.recordsFound), [0, 12]);
  });

  it('surfaces a streamed scan failure', async () => {
    const fetchImpl: typeof fetch = async () => ndjsonResponse([
      {
        type: 'progress',
        progress: { message: 'Starting...', progressPercent: 8, phase: 'resolving' },
        startedAt: 100,
        updatedAt: 100,
      },
      { type: 'error', error: 'Provider quota exhausted.' },
    ]);

    await assert.rejects(
      runSingleWalletScanStream({
        address: completedResult.address,
        chainIds: [1],
        fetchImpl,
      }),
      /Provider quota exhausted/,
    );
  });

  it('surfaces a structured HTTP failure before reading the stream', async () => {
    const fetchImpl: typeof fetch = async () => Response.json(
      { error: 'Single-scan rate limit reached.' },
      { status: 429 },
    );

    await assert.rejects(
      runSingleWalletScanStream({
        address: completedResult.address,
        chainIds: [1],
        fetchImpl,
      }),
      /Single-scan rate limit reached/,
    );
  });

  it('rejects a truncated stream without a final report', async () => {
    const fetchImpl: typeof fetch = async () => ndjsonResponse([{
      type: 'progress',
      progress: { message: 'Fetching...', progressPercent: 50, phase: 'fetching' },
      startedAt: 100,
      updatedAt: 200,
    }]);

    await assert.rejects(
      runSingleWalletScanStream({
        address: completedResult.address,
        chainIds: [1],
        fetchImpl,
      }),
      /ended without a forensic report/,
    );
  });

  it('preserves cancellation as an AbortError', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImpl: typeof fetch = async () => ndjsonResponse([{ type: 'result', result: completedResult }]);

    await assert.rejects(
      runSingleWalletScanStream({
        address: completedResult.address,
        chainIds: [1],
        signal: controller.signal,
        fetchImpl,
      }),
      error => error instanceof Error && error.name === 'AbortError',
    );
  });
});
