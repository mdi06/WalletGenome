import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEMO_WALLETS } from '@/lib/demoWallets';
import { loadDemoSnapshot } from './demoSnapshotClient';

const demo = DEMO_WALLETS[0];
const validPayload = {
  schemaVersion: 1,
  generatedAt: demo.generatedAt,
  chainIds: [1, 10, 8453, 42161],
  result: {
    address: demo.address.toLowerCase(),
    status: 'complete',
    availability: [],
    chains: [],
    metrics: {},
    aggregated: {},
  },
};

test('loads a demo through its static snapshot path without calling the scan API', async () => {
  const requests: string[] = [];
  const payload = await loadDemoSnapshot(demo, async input => {
    requests.push(String(input));
    return Response.json(validPayload);
  });

  assert.equal(payload.result.address, demo.address.toLowerCase());
  assert.deepEqual(requests, [demo.snapshotPath]);
  assert.ok(requests.every(path => !path.startsWith('/api/scan')));
});

test('rejects a snapshot for a different wallet', async () => {
  await assert.rejects(
    () => loadDemoSnapshot(demo, async () => Response.json({
      ...validPayload,
      result: { ...validPayload.result, address: '0x0000000000000000000000000000000000000000' },
    })),
    /does not match the selected wallet/,
  );
});
