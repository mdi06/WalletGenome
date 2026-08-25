import { describe, it } from 'node:test';
import assert from 'node:assert';
import { fetchExplorerData, fetchNormalTransactions } from './etherscan';

const explorerUrl = 'https://example.test/api';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Explorer data availability', () => {
  it('classifies a successful provider response as complete', async () => {
    const result = await fetchExplorerData<{ hash: string }>([explorerUrl], 1000, {
      maxAttempts: 1,
      fetcher: async () => jsonResponse({ status: '1', result: [{ hash: '0x1' }] }),
    });

    assert.strictEqual(result.status, 'complete');
    assert.deepStrictEqual(result.data, [{ hash: '0x1' }]);
    assert.deepStrictEqual(result.errors, []);
  });

  it('distinguishes a verified empty response from provider failure', async () => {
    const result = await fetchExplorerData([explorerUrl], 1000, {
      maxAttempts: 1,
      fetcher: async () => jsonResponse({ status: '0', message: 'No transactions found', result: [] }),
    });

    assert.strictEqual(result.status, 'complete');
    assert.deepStrictEqual(result.data, []);
    assert.deepStrictEqual(result.errors, []);
  });

  it('marks a provider that cannot prove exhaustion within the allowed page budget as partial', async () => {
    let callCount = 0;
    const result = await fetchExplorerData<{ hash: string }>([explorerUrl], 1, {
      maxAttempts: 1,
      maxPages: 1,
      fetcher: async () => {
        callCount += 1;
        return jsonResponse({ status: '1', result: [{ hash: '0x1' }] });
      },
    });

    assert.strictEqual(callCount, 1);
    assert.strictEqual(result.status, 'partial');
    assert.strictEqual(result.errors[0]?.code, 'result_truncated');
  });

  it('surfaces timeouts as unavailable instead of verified empty', async () => {
    const result = await fetchExplorerData([explorerUrl], 1000, {
      maxAttempts: 1,
      fetcher: async () => {
        const error = new Error('timed out');
        error.name = 'AbortError';
        throw error;
      },
    });

    assert.strictEqual(result.status, 'unavailable');
    assert.deepStrictEqual(result.data, []);
    assert.strictEqual(result.errors[0]?.code, 'timeout');
  });

  it('paginates until exhaustion and deduplicates overlapping records', async () => {
    const pages = new Map([
      ['1', [{ hash: '0x1' }, { hash: '0x2' }]],
      ['2', [{ hash: '0x2' }, { hash: '0x3' }]],
      ['3', []],
    ]);

    const result = await fetchExplorerData<{ hash: string }>([explorerUrl], 2, {
      maxAttempts: 1,
      fetcher: async (url) => {
        const page = new URL(url).searchParams.get('page') ?? '1';
        return jsonResponse({ status: '1', result: pages.get(page) ?? [] });
      },
    });

    assert.strictEqual(result.status, 'complete');
    assert.deepStrictEqual(result.data, [{ hash: '0x1' }, { hash: '0x2' }, { hash: '0x3' }]);
    assert.deepStrictEqual(result.errors, []);
  });

  it('fails over to the next provider when the first one cannot prove exhaustion', async () => {
    const result = await fetchExplorerData<{ hash: string }>(
      ['https://first-provider.test/api', 'https://second-provider.test/api'],
      2,
      {
        maxAttempts: 1,
        fetcher: async (url) => {
          const host = new URL(url).hostname;
          const page = new URL(url).searchParams.get('page') ?? '1';

          if (host === 'first-provider.test') {
            return page === '1'
              ? jsonResponse({ status: '1', result: [{ hash: '0xa' }, { hash: '0xb' }] })
              : new Response('gateway error', { status: 502 });
          }

          return jsonResponse({
            status: '1',
            result: page === '1' ? [{ hash: '0xc' }] : [],
          });
        },
      },
    );

    assert.strictEqual(result.status, 'complete');
    assert.deepStrictEqual(result.data, [{ hash: '0xc' }]);
    assert.deepStrictEqual(result.errors, []);
  });

  it('retries rate-limited pages before succeeding', async () => {
    let attempts = 0;
    const result = await fetchExplorerData<{ hash: string }>([explorerUrl], 2, {
      maxAttempts: 2,
      backoffBaseMs: 0,
      backoffJitterMs: 0,
      fetcher: async () => {
        attempts += 1;
        if (attempts === 1) {
          return new Response(JSON.stringify({ status: '0', message: 'Max rate limit reached', result: 'Rate limit' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Retry-After': '0' },
          });
        }

        return jsonResponse({ status: '1', result: [{ hash: '0x1' }] });
      },
    });

    assert.strictEqual(attempts, 2);
    assert.strictEqual(result.status, 'complete');
    assert.deepStrictEqual(result.data, [{ hash: '0x1' }]);
  });

  it('accepts Blockscout status 2 array payloads as valid pages', async () => {
    const result = await fetchExplorerData<{ hash: string }>(['https://base.blockscout.com/api'], 2, {
      maxAttempts: 1,
      fetcher: async () => jsonResponse({ status: '2', result: [{ hash: '0xblockscout' }] }),
    });

    assert.strictEqual(result.status, 'complete');
    assert.deepStrictEqual(result.data, [{ hash: '0xblockscout' }]);
    assert.deepStrictEqual(result.errors, []);
  });

  it('retries transient non-JSON public Blockscout responses before failing over', async () => {
    let attempts = 0;
    const result = await fetchExplorerData<{ hash: string }>(['https://base.blockscout.com/api'], 2, {
      maxAttempts: 2,
      backoffBaseMs: 0,
      backoffJitterMs: 0,
      fetcher: async () => {
        attempts += 1;
        if (attempts === 1) {
          return new Response('<html>busy</html>', {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
          });
        }
        return jsonResponse({ status: '1', result: [{ hash: '0xrecovered' }] });
      },
    });

    assert.strictEqual(attempts, 2);
    assert.strictEqual(result.status, 'complete');
    assert.deepStrictEqual(result.data, [{ hash: '0xrecovered' }]);
  });

  it('marks chains without an explorer configuration as unavailable', async () => {
    const result = await fetchNormalTransactions(
      '0x1234567890123456789012345678901234567890',
      999999,
    );

    assert.strictEqual(result.status, 'unavailable');
    assert.strictEqual(result.errors[0]?.code, 'unsupported_chain');
  });

  it('paginates across multiple pages until the provider proves exhaustion', async () => {
    const seenPages: number[] = [];
    const result = await fetchNormalTransactions(
      '0x1234567890123456789012345678901234567890',
      1,
      'test-key',
      2,
      {
        maxAttempts: 1,
        fetcher: async (url) => {
          const page = Number(new URL(url).searchParams.get('page') || '1');
          seenPages.push(page);
          if (page === 1) {
            return jsonResponse({ status: '1', result: [{ hash: '0x1' }, { hash: '0x2' }] });
          }
          if (page === 2) {
            return jsonResponse({ status: '1', result: [{ hash: '0x3' }] });
          }
          return jsonResponse({ status: '1', result: [] });
        },
      },
    );

    assert.strictEqual(result.status, 'complete');
    assert.deepStrictEqual(result.data.map(item => item.hash), ['0x1', '0x2', '0x3']);
    assert.deepStrictEqual(seenPages, [1, 2]);
  });

  it('accepts blockscout-style status 2 arrays as usable data', async () => {
    const result = await fetchExplorerData<{ hash: string }>([explorerUrl], 1000, {
      maxAttempts: 1,
      fetcher: async () => jsonResponse({ status: '2', message: 'OK', result: [{ hash: '0x2' }] }),
    });

    assert.strictEqual(result.status, 'complete');
    assert.deepStrictEqual(result.data, [{ hash: '0x2' }]);
  });

  it('returns the best partial provider data when no candidate proves full exhaustion', async () => {
    const result = await fetchNormalTransactions(
      '0x1234567890123456789012345678901234567890',
      1,
      'test-key',
      2,
      {
        maxAttempts: 1,
        maxPages: 1,
        fetcher: async (url) => {
          const host = new URL(url).hostname;
          if (host === 'api.etherscan.io') {
            return jsonResponse({ status: '1', result: [{ hash: '0x1' }, { hash: '0x2' }] });
          }
          return jsonResponse({ status: '0', message: 'No transactions found', result: [] });
        },
      },
    );

    assert.strictEqual(result.status, 'partial');
    assert.deepStrictEqual(result.data.map(item => item.hash), ['0x1', '0x2']);
    assert.ok(result.errors.length > 0);
  });

  it('bisects block ranges so provider page ceilings do not truncate full history', async () => {
    const records = [
      { hash: '0x1', blockNumber: '1' },
      { hash: '0x2', blockNumber: '2' },
      { hash: '0x3', blockNumber: '3' },
      { hash: '0x4', blockNumber: '7' },
      { hash: '0x5', blockNumber: '8' },
      { hash: '0x6', blockNumber: '9' },
    ];
    const requestedRanges: string[] = [];

    const result = await fetchExplorerData<typeof records[number]>([explorerUrl], 2, {
      maxAttempts: 1,
      useBlockRangeSplitting: true,
      endBlock: 9,
      fetcher: async (url) => {
        const parsed = new URL(url);
        const start = Number(parsed.searchParams.get('startblock'));
        const end = Number(parsed.searchParams.get('endblock'));
        requestedRanges.push(`${start}-${end}`);
        const inRange = records.filter(record => {
          const block = Number(record.blockNumber);
          return block >= start && block <= end;
        });
        return jsonResponse({ status: '1', result: inRange.slice(0, 2) });
      },
    });

    assert.strictEqual(result.status, 'complete');
    assert.deepStrictEqual(result.data.map(record => record.hash), records.map(record => record.hash));
    assert.ok(requestedRanges.includes('0-9'));
    assert.ok(requestedRanges.some(range => range !== '0-9'));
  });

  it('uses conservative single-worker range fanout for public Blockscout hosts', async () => {
    const requestedRanges: string[] = [];
    let inFlight = 0;
    let maxInFlight = 0;

    const result = await fetchExplorerData<{ hash: string; blockNumber: string }>(['https://base.blockscout.com/api'], 2, {
      maxAttempts: 1,
      useBlockRangeSplitting: true,
      endBlock: 3999,
      rangeConcurrency: 4,
      fetcher: async (url) => {
        const parsed = new URL(url);
        const start = Number(parsed.searchParams.get('startblock') ?? '0');
        const end = Number(parsed.searchParams.get('endblock') ?? '0');
        requestedRanges.push(`${start}-${end}`);
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise(resolve => setTimeout(resolve, 5));
        inFlight -= 1;

        if (start === 0 && end === 3999) {
          return jsonResponse({
            status: '1',
            result: Array.from({ length: 10_000 }, (_, index) => ({
              hash: `0xroot-${index}`,
              blockNumber: index % 2 === 0 ? '1' : '3999',
            })),
          });
        }

        return jsonResponse({
          status: '1',
          result: [{ hash: `0x${start}`, blockNumber: String(start) }],
        });
      },
    });

    assert.strictEqual(result.status, 'complete');
    assert.strictEqual(maxInFlight, 1);
    assert.deepStrictEqual(requestedRanges, ['0-3999', '0-999', '1000-1999', '2000-2999', '3000-3999']);
  });
});
