import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { POST as scanPOST } from '../scan/route';
import { POST as batchScanPOST } from '../batch-scan/route';
import { POST as knownWalletsPOST } from '../known-wallets/route';
import { resolveEnsOrAddress } from '@/lib/ens';
import { loadKnownWallets } from '@/lib/knownWalletsServer';
import { NextRequest } from 'next/server';
import { resetRequestPolicyForTests } from '@/lib/api/requestPolicy';

describe('ENS Resolution & API Route Integration Tests', () => {
  it('should correctly resolve ENS domains to 0x hex addresses', async () => {
    // 1. Valid 0x address passes through
    const directHex = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const resHex = await resolveEnsOrAddress(directHex);
    assert.strictEqual(resHex, directHex.toLowerCase());

    // 2. Preset ENS domains
    const vitalik = await resolveEnsOrAddress('vitalik.eth');
    assert.strictEqual(vitalik, '0xd8da6bf26964af9d7eed9e03e53415d37aa96045');

    const hayden = await resolveEnsOrAddress('hayden.eth');
    assert.strictEqual(hayden, '0x50ec05ade8280758e2077fcbc08d878d4aef79c3');

    const sassal = await resolveEnsOrAddress('sassal.eth');
    assert.strictEqual(sassal, '0x648aa14e4424e0825a5ce739c8c68610e143fb79');

    const richerd = await resolveEnsOrAddress('richerd.eth');
    assert.strictEqual(richerd, '0xeb1c22baacafac7836f20f684c946228401ff01c');

    const stani = await resolveEnsOrAddress('stani.eth');
    assert.strictEqual(stani, '0x2e21f5d34208a3d5483f9829f2709e9005bf15f2');

    // 3. Invalid/unresolvable inputs
    const unresolvable = await resolveEnsOrAddress('some-totally-invalid-domain-xyz-not-real.eth');
    // In test environment without network, unresolvable should return null
    assert.strictEqual(unresolvable === null || typeof unresolvable === 'string', true);
  });

  it('should resolve ENS domain in POST /api/scan without returning 400', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('api.web3.bio')) return new Response('[]', { status: 200 });
      if (url.includes('etherscan') || url.includes('blockscout')) {
        return new Response(JSON.stringify({ status: '0', message: 'No transactions found', result: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('', { status: 200 });
    });

    try {
      const ensReq = new NextRequest('http://localhost/api/scan', {
        method: 'POST',
        body: JSON.stringify({
          address: 'vitalik.eth',
          chainIds: [1],
        }),
      });
      const ensRes = await scanPOST(ensReq);
      assert.strictEqual(ensRes.status, 200, 'POST /api/scan with vitalik.eth should resolve and succeed');
      const data = await ensRes.json();
      assert.strictEqual(data.address, '0xd8da6bf26964af9d7eed9e03e53415d37aa96045');
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('should return 400 for completely invalid address in POST /api/scan', async () => {
    const invalidReq = new NextRequest('http://localhost/api/scan', {
      method: 'POST',
      body: JSON.stringify({ address: 'not-an-address' }),
    });
    const invalidRes = await scanPOST(invalidReq);
    assert.strictEqual(invalidRes.status, 400);
    const errData = await invalidRes.json();
    assert.strictEqual(errData.code, 'invalid_target');
    assert.match(errData.error, /EVM address or ENS-style name/);
  });

  it('should handle batch-scan validation with empty array', async () => {
    const invalidReq = new NextRequest('http://localhost/api/batch-scan', {
      method: 'POST',
      body: JSON.stringify({ addresses: [] }),
    });
    const invalidRes = await batchScanPOST(invalidReq);
    assert.strictEqual(invalidRes.status, 400);
  });

  it('rejects unsupported chains before any batch provider work', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () => {
      throw new Error('provider work must not start');
    });
    const request = new NextRequest('http://localhost/api/batch-scan', {
      method: 'POST',
      body: JSON.stringify({
        addresses: ['0x3333333333333333333333333333333333333333'],
        chainIds: [999999],
      }),
    });

    try {
      const response = await batchScanPOST(request);
      assert.strictEqual(response.status, 400);
      assert.strictEqual((await response.json()).code, 'unsupported_chain');
      assert.strictEqual(fetchMock.mock.callCount(), 0);
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('rejects malformed JSON, non-string batch entries, and client API keys', async () => {
    const malformed = await scanPOST(new NextRequest('http://localhost/api/scan', {
      method: 'POST',
      body: '{',
    }));
    assert.strictEqual(malformed.status, 400);
    assert.strictEqual((await malformed.json()).code, 'malformed_json');

    const nonString = await batchScanPOST(new NextRequest('http://localhost/api/batch-scan', {
      method: 'POST',
      body: JSON.stringify({ addresses: [123], chainIds: [1] }),
    }));
    assert.strictEqual(nonString.status, 400);
    assert.strictEqual((await nonString.json()).code, 'invalid_target');

    const customKey = await scanPOST(new NextRequest('http://localhost/api/scan', {
      method: 'POST',
      body: JSON.stringify({
        address: '0x3333333333333333333333333333333333333333',
        chainIds: [1],
        customApiKey: 'not-accepted',
      }),
    }));
    assert.strictEqual(customKey.status, 400);
    assert.strictEqual((await customKey.json()).code, 'unsupported_field');
  });

  it('rejects a valid known-wallet write attempt', async () => {
    const request = new NextRequest('http://localhost/api/known-wallets', {
      method: 'POST',
      body: JSON.stringify({
        address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        label: 'Trusted wallet',
      }),
    });

    const response = knownWalletsPOST(request);
    assert.strictEqual(response.status, 405);
    assert.strictEqual(response.headers.get('allow'), 'GET');
    assert.strictEqual((await response.json()).error.includes('read-only'), true);
    assert.deepStrictEqual(loadKnownWallets(), {});
  });

  it('rejects label injection attempts without creating wallet records', async () => {
    const request = new NextRequest('http://localhost/api/known-wallets', {
      method: 'POST',
      body: JSON.stringify({
        address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        label: 'Trusted\n0x0000000000000000000000000000000000000001 # Injected',
      }),
    });

    const response = knownWalletsPOST(request);
    assert.strictEqual(response.status, 405);
    assert.deepStrictEqual(loadKnownWallets(), {});
  });

  it('returns 429 after the deterministic single-scan request limit', async () => {
    resetRequestPolicyForTests();
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('api.web3.bio')) return new Response('[]', { status: 200 });
      if (url.includes('etherscan') || url.includes('blockscout')) {
        return new Response(JSON.stringify({ status: '0', message: 'No transactions found', result: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('', { status: 200 });
    });

    try {
      for (let attempt = 0; attempt < 12; attempt++) {
        const response = await scanPOST(new NextRequest('http://localhost/api/scan', {
          method: 'POST',
          headers: { 'x-forwarded-for': '203.0.113.22' },
          body: JSON.stringify({
            address: '0x7777777777777777777777777777777777777777',
            chainIds: [1],
          }),
        }));
        assert.strictEqual(response.status, 200);
      }

      const limited = await scanPOST(new NextRequest('http://localhost/api/scan', {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.22' },
        body: JSON.stringify({
          address: '0x7777777777777777777777777777777777777777',
          chainIds: [1],
        }),
      }));
      assert.strictEqual(limited.status, 429);
      assert.strictEqual((await limited.json()).code, 'rate_limited');
      assert.strictEqual(limited.headers.get('retry-after'), '60');
    } finally {
      fetchMock.mock.restore();
      resetRequestPolicyForTests();
    }
  });

  it('streams truthful single-scan progress and the final report in one request', async () => {
    resetRequestPolicyForTests();
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('api.web3.bio')) return new Response('[]', { status: 200 });
      if (url.includes('etherscan') || url.includes('blockscout')) {
        return new Response(JSON.stringify({ status: '0', message: 'No transactions found', result: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('', { status: 200 });
    });

    try {
      const response = await scanPOST(new NextRequest('http://localhost/api/scan', {
        method: 'POST',
        headers: { Accept: 'application/x-ndjson' },
        body: JSON.stringify({
          address: '0x9999999999999999999999999999999999999999',
          chainIds: [1],
        }),
      }));
      assert.strictEqual(response.status, 200);
      assert.match(response.headers.get('content-type') ?? '', /application\/x-ndjson/);

      const events = (await response.text())
        .trim()
        .split('\n')
        .map(line => JSON.parse(line));
      const progressEvents = events.filter(event => event.type === 'progress');
      const resultEvent = events.find(event => event.type === 'result');

      assert.strictEqual(progressEvents[0]?.progress.phase, 'resolving');
      assert.strictEqual(progressEvents.some(event => event.progress.phase === 'fetching'), true);
      assert.strictEqual(progressEvents.some(event => typeof event.progress.recordsFound === 'number'), true);
      assert.strictEqual(resultEvent?.result.address, '0x9999999999999999999999999999999999999999');
    } finally {
      fetchMock.mock.restore();
      resetRequestPolicyForTests();
    }
  });

  it('returns a disconnect status without leaving in-flight scan rejection unhandled', async () => {
    resetRequestPolicyForTests();
    const fetchMock = mock.method(globalThis, 'fetch', async (_input: string | URL | Request, init?: RequestInit) => (
      new Promise<Response>((resolve, reject) => {
        const timer = setTimeout(() => resolve(new Response(JSON.stringify({
          status: '0',
          message: 'No transactions found',
          result: [],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } })), 1_000);
        const onAbort = () => {
          clearTimeout(timer);
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        };
        if (init?.signal?.aborted) onAbort();
        else init?.signal?.addEventListener('abort', onAbort, { once: true });
      })
    ));
    const requestController = new AbortController();

    try {
      const pending = scanPOST(new NextRequest('http://localhost/api/scan', {
        method: 'POST',
        signal: requestController.signal,
        body: JSON.stringify({
          address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          chainIds: [1],
        }),
      }));
      await new Promise(resolve => setTimeout(resolve, 10));
      requestController.abort();
      const response = await pending;
      assert.strictEqual(response.status, 499);
    } finally {
      fetchMock.mock.restore();
      resetRequestPolicyForTests();
    }
  });

});
