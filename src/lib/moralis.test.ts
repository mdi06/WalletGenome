import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  fetchMoralisInternalTransactions,
  fetchMoralisTokenTransfers,
  fetchMoralisTransactions,
  getMoralisApiKey,
  MoralisQuotaBudget,
} from './moralis';
import { RequestCancellationError } from './cancellation';

const WALLET = '0x1234567890abcdef1234567890abcdef12345678';
const OTHER = '0x0000000000000000000000000000000000000001';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function transactionRecord(hash: string, blockNumber: string) {
  return {
    hash,
    nonce: '7',
    transaction_index: '3',
    from_address: WALLET,
    to_address: OTHER,
    value: '1000000000000000000',
    gas: '21000',
    gas_price: '1000000000',
    receipt_cumulative_gas_used: '21000',
    receipt_gas_used: '21000',
    receipt_status: '1',
    block_timestamp: '2024-01-02T03:04:05.000Z',
    block_number: blockNumber,
    block_hash: `0xblock${blockNumber}`,
    input: '0xa9059cbb0000',
  };
}

function tokenTransferRecord(hash: string) {
  return {
    token_name: 'USD Coin',
    token_symbol: 'USDC',
    token_decimals: '6',
    transaction_hash: hash,
    address: '0x0000000000000000000000000000000000000002',
    block_timestamp: '2024-01-02T03:04:05.000Z',
    block_number: '3',
    block_hash: '0xblock3',
    from_address: OTHER,
    to_address: WALLET,
    value: '2500000',
    transaction_index: '3',
    log_index: '9',
  };
}

describe('Moralis dataset fallbacks', () => {
  it('uses the low-cost normal-transaction endpoint and paginates to exhaustion', async () => {
    const seenUrls: string[] = [];
    const quotaBudget = new MoralisQuotaBudget(60);
    const result = await fetchMoralisTransactions(WALLET, 1, {
      apiKey: 'moralis-test-key',
      quotaBudget,
      maxAttempts: 1,
      fetcher: async (url) => {
        seenUrls.push(url);
        const cursor = new URL(url).searchParams.get('cursor');
        return cursor
          ? jsonResponse({ result: [transactionRecord('0xsecond', '2')], cursor: null })
          : jsonResponse({ result: [transactionRecord('0xfirst', '1')], cursor: 'next-page' });
      },
    });

    assert.ok(result);
    assert.equal(result.status, 'complete');
    assert.deepEqual(result.data.map(item => item.hash), ['0xfirst', '0xsecond']);
    assert.equal(new URL(seenUrls[0]).pathname, `/api/v2.2/${WALLET}`);
    assert.equal(new URL(seenUrls[0]).searchParams.get('chain'), 'eth');
    assert.equal(quotaBudget.used, 60);
  });

  it('uses the ERC-20 endpoint only for token-transfer fallback data', async () => {
    let requestedUrl = '';
    const quotaBudget = new MoralisQuotaBudget(50);
    const result = await fetchMoralisTokenTransfers(WALLET, 8453, {
      apiKey: 'moralis-test-key',
      quotaBudget,
      maxAttempts: 1,
      fetcher: async (url) => {
        requestedUrl = url;
        return jsonResponse({ result: [tokenTransferRecord('0xtoken')], cursor: null });
      },
    });

    assert.ok(result);
    assert.equal(result.status, 'complete');
    assert.equal(result.data[0]?.tokenSymbol, 'USDC');
    assert.equal(new URL(requestedUrl).pathname, `/api/v2.2/${WALLET}/erc20/transfers`);
    assert.equal(quotaBudget.used, 50);
  });

  it('uses verbose transactions only when internal traces are requested', async () => {
    let requestedUrl = '';
    const result = await fetchMoralisInternalTransactions(WALLET, 10, {
      apiKey: 'moralis-test-key',
      quotaBudget: new MoralisQuotaBudget(50),
      maxAttempts: 1,
      fetcher: async (url) => {
        requestedUrl = url;
        return jsonResponse({
          result: [{
            ...transactionRecord('0xinternal-parent', '4'),
            internal_transactions: [{
              transaction_hash: '0xinternal-parent',
              from: OTHER,
              to: WALLET,
              value: '42',
              trace_id: '0_1',
            }],
          }],
          cursor: null,
        });
      },
    });

    assert.ok(result);
    assert.equal(result.status, 'complete');
    assert.equal(result.data[0]?.traceId, '0_1');
    assert.equal(new URL(requestedUrl).pathname, `/api/v2.2/${WALLET}/verbose`);
    assert.equal(new URL(requestedUrl).searchParams.get('include'), 'internal_transactions');
  });

  it('stops pagination before exceeding the per-scan CU budget', async () => {
    let calls = 0;
    const result = await fetchMoralisTransactions(WALLET, 1, {
      apiKey: 'moralis-test-key',
      quotaBudget: new MoralisQuotaBudget(30),
      maxAttempts: 1,
      fetcher: async () => {
        calls += 1;
        return jsonResponse({ result: [transactionRecord('0xfirst', '1')], cursor: 'next-page' });
      },
    });

    assert.ok(result);
    assert.equal(calls, 1);
    assert.equal(result.status, 'partial');
    assert.equal(result.errors[0]?.code, 'quota_exhausted');
  });

  it('does not classify unrelated token-only activity as a normal transaction', async () => {
    const unrelated = { ...transactionRecord('0xtoken-only', '5'), from_address: OTHER, to_address: OTHER };
    const result = await fetchMoralisTransactions(WALLET, 1, {
      apiKey: 'moralis-test-key',
      quotaBudget: new MoralisQuotaBudget(30),
      maxAttempts: 1,
      fetcher: async () => jsonResponse({ result: [unrelated], cursor: null }),
    });

    assert.ok(result);
    assert.equal(result.status, 'complete');
    assert.deepEqual(result.data, []);
  });

  it('blocks subsequent fallback requests after Moralis reports exhausted account quota', async () => {
    const quotaBudget = new MoralisQuotaBudget(500);
    let calls = 0;
    const fetcher = async (): Promise<Response> => {
      calls += 1;
      return jsonResponse({ message: 'Your daily quota included usage has been consumed.' }, 401);
    };

    const first = await fetchMoralisTransactions(WALLET, 1, {
      apiKey: 'moralis-test-key', quotaBudget, maxAttempts: 1, fetcher,
    });
    const second = await fetchMoralisTokenTransfers(WALLET, 1, {
      apiKey: 'moralis-test-key', quotaBudget, maxAttempts: 1, fetcher,
    });

    assert.equal(calls, 1);
    assert.equal(first?.errors[0]?.code, 'quota_exhausted');
    assert.equal(second?.errors[0]?.code, 'quota_exhausted');
    assert.match(first?.errors[0]?.message ?? '', /account quota is exhausted/i);
    assert.match(second?.errors[0]?.message ?? '', /account quota is exhausted/i);
    assert.doesNotMatch(second?.errors[0]?.message ?? '', /scan budget/i);
    assert.equal(quotaBudget.blocked, true);
  });

  it('ignores placeholder API keys', () => {
    const previous = process.env.MORALIS_API_KEY;
    delete process.env.MORALIS_API_KEY;
    try {
      assert.equal(getMoralisApiKey('YourMoralisApiKeyHere'), undefined);
    } finally {
      if (previous === undefined) delete process.env.MORALIS_API_KEY;
      else process.env.MORALIS_API_KEY = previous;
    }
  });

  it('stops pagination when the request signal is cancelled', async () => {
    const requestController = new AbortController();
    let calls = 0;

    await assert.rejects(
      fetchMoralisTransactions(WALLET, 1, {
        apiKey: 'moralis-test-key',
        quotaBudget: new MoralisQuotaBudget(60),
        maxAttempts: 2,
        signal: requestController.signal,
        fetcher: async (_url, _apiKey, _timeoutMs, signal) => {
          calls += 1;
          requestController.abort();
          assert.strictEqual(signal?.aborted, true);
          return jsonResponse({ result: [transactionRecord('0xlate', '1')], cursor: 'next-page' });
        },
      }),
      (error: unknown) => error instanceof RequestCancellationError && error.reason === 'disconnect',
    );
    assert.strictEqual(calls, 1);
  });
});
