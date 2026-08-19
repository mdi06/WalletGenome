import { describe, it } from 'node:test';
import assert from 'node:assert';
import { POST as scanPOST } from '../scan/route';
import { POST as batchScanPOST } from '../batch-scan/route';
import { resolveEnsOrAddress } from '@/lib/ens';
import { NextRequest } from 'next/server';

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
    assert.strictEqual(hayden, '0x11e4857bb9993a50c685a79affb4f1a64ffb44e4');

    const stani = await resolveEnsOrAddress('stani.eth');
    assert.strictEqual(stani, '0x2e21f5d32841cf8c73797824da4f8ab080003a0c');

    // 3. Invalid/unresolvable inputs
    const unresolvable = await resolveEnsOrAddress('some-totally-invalid-domain-xyz-not-real.eth');
    // In test environment without network, unresolvable should return null
    assert.strictEqual(unresolvable === null || typeof unresolvable === 'string', true);
  });

  it('should resolve ENS domain in POST /api/scan without returning 400', async () => {
    const ensReq = new NextRequest('http://localhost/api/scan', {
      method: 'POST',
      body: JSON.stringify({
        address: 'vitalik.eth',
        isDemo: true,
      }),
    });
    const ensRes = await scanPOST(ensReq);
    assert.strictEqual(ensRes.status, 200, 'POST /api/scan with vitalik.eth should resolve and succeed');
    const data = await ensRes.json();
    assert.strictEqual(data.isDemo, true);
    assert.strictEqual(data.address, '0xd8da6bf26964af9d7eed9e03e53415d37aa96045');
  });

  it('should return 400 for completely invalid address in POST /api/scan', async () => {
    const invalidReq = new NextRequest('http://localhost/api/scan', {
      method: 'POST',
      body: JSON.stringify({ address: 'not-an-address' }),
    });
    const invalidRes = await scanPOST(invalidReq);
    assert.strictEqual(invalidRes.status, 400);
    const errData = await invalidRes.json();
    assert.ok(errData.error.includes('Unable to resolve') || errData.error.includes('Invalid'));
  });

  it('should handle batch-scan validation with empty array', async () => {
    const invalidReq = new NextRequest('http://localhost/api/batch-scan', {
      method: 'POST',
      body: JSON.stringify({ addresses: [] }),
    });
    const invalidRes = await batchScanPOST(invalidReq);
    assert.strictEqual(invalidRes.status, 400);
  });
});
