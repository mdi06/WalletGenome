import assert from 'node:assert/strict';
import test from 'node:test';
import { getUrlScanTarget } from './walletScannerUrl';

test('reads valid address and legacy wallet URL targets', () => {
  assert.equal(
    getUrlScanTarget('?address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'),
    '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  );
  assert.equal(getUrlScanTarget('?wallet=vitalik.eth'), 'vitalik.eth');
});
test('rejects malformed URL targets before auto-scan starts', () => {
  assert.equal(getUrlScanTarget('?address=0x1234'), null);
  assert.equal(getUrlScanTarget('?wallet=javascript%3Aalert%281%29'), null);
  assert.equal(getUrlScanTarget('?address='), null);
});
