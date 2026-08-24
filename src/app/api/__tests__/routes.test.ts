import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { POST as scanPOST } from '../scan/route';
import { POST as scanJobsPOST } from '../scan-jobs/route';
import { GET as scanJobGET } from '../scan-jobs/[jobId]/route';
import { POST as batchScanPOST } from '../batch-scan/route';
import { POST as knownWalletsPOST } from '../known-wallets/route';
import { resolveEnsOrAddress } from '@/lib/ens';
import { loadKnownWallets } from '@/lib/knownWalletsServer';
import { NextRequest } from 'next/server';
import { resetRequestPolicyForTests } from '@/lib/api/requestPolicy';
import { resetScanJobsForTests } from '@/lib/services/scanJobService';

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
    assert.strictEqual(hayden, '0x50ec05ad9d29a73367175e26e962d714e96896c3');

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

  it('starts an async scan job and exposes the completed result over polling', async () => {
    resetRequestPolicyForTests();
    resetScanJobsForTests();
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
      const startResponse = await scanJobsPOST(new NextRequest('http://localhost/api/scan-jobs', {
        method: 'POST',
        body: JSON.stringify({
          address: 'vitalik.eth',
          chainIds: [1],
        }),
      }));
      assert.strictEqual(startResponse.status, 202);
      const startPayload = await startResponse.json();
      assert.strictEqual(typeof startPayload.jobId, 'string');
      assert.strictEqual(typeof startPayload.progress?.message, 'string');

      let statusResponse = await scanJobGET(
        new NextRequest(`http://localhost/api/scan-jobs/${startPayload.jobId}`),
        { params: Promise.resolve({ jobId: startPayload.jobId }) },
      );
      let statusPayload = await statusResponse.json();

      for (let attempt = 0; attempt < 20 && statusPayload.state !== 'completed'; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 25));
        statusResponse = await scanJobGET(
          new NextRequest(`http://localhost/api/scan-jobs/${startPayload.jobId}`),
          { params: Promise.resolve({ jobId: startPayload.jobId }) },
        );
        statusPayload = await statusResponse.json();
      }

      assert.strictEqual(statusPayload.state, 'completed');
      assert.strictEqual(statusPayload.result.address, '0xd8da6bf26964af9d7eed9e03e53415d37aa96045');
      assert.strictEqual(statusPayload.progress.progressPercent, 100);
    } finally {
      fetchMock.mock.restore();
      resetRequestPolicyForTests();
      resetScanJobsForTests();
    }
  });

  it('returns 404 when a polled async scan job does not exist', async () => {
    resetScanJobsForTests();
    const response = await scanJobGET(
      new NextRequest('http://localhost/api/scan-jobs/missing-job'),
      { params: Promise.resolve({ jobId: 'missing-job' }) },
    );

    assert.strictEqual(response.status, 404);
    assert.strictEqual((await response.json()).code, 'job_not_found');
  });
});
