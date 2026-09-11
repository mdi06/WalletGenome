import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parsePendingLiveScan,
  serializePendingLiveScan,
  type PendingLiveScan,
} from './pendingLiveScan';

test('preserves an exact single-wallet scan request for the OAuth round trip', () => {
  const pending: PendingLiveScan = {
    mode: 'single',
    address: 'vitalik.eth',
    chainIds: [1, 8453, 42161, 10],
    forceRefresh: true,
  };

  assert.deepEqual(parsePendingLiveScan(serializePendingLiveScan(pending)), pending);
});

test('preserves an exact cluster scan request for the OAuth round trip', () => {
  const pending: PendingLiveScan = {
    mode: 'cluster',
    addresses: [
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
    ],
    chainIds: [1, 8453],
  };

  assert.deepEqual(parsePendingLiveScan(serializePendingLiveScan(pending)), pending);
});

test('rejects malformed or incomplete pending scan data', () => {
  assert.equal(parsePendingLiveScan(null), null);
  assert.equal(parsePendingLiveScan('{"mode":"single","address":"0x1"}'), null);
  assert.equal(parsePendingLiveScan('{"mode":"unknown","chainIds":[1]}'), null);
  assert.equal(parsePendingLiveScan('not-json'), null);
});
