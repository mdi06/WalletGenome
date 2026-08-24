import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getLatestBlockNumber, resetRpcHeadCacheForTests } from './rpc';

function rpcResponse(result: string): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('RPC chain-head failover', () => {
  it('uses the first endpoint that identifies the requested chain', async () => {
    resetRpcHeadCacheForTests();
    const calls: string[] = [];
    const block = await getLatestBlockNumber(8453, {
      endpoints: ['https://wrong.test', 'https://official.test'],
      fetcher: async (input, init) => {
        const endpoint = String(input);
        const method = JSON.parse(String(init?.body)).method as string;
        calls.push(`${endpoint}:${method}`);
        if (endpoint.includes('wrong')) return rpcResponse('0x1');
        return rpcResponse(method === 'eth_chainId' ? '0x2105' : '0x1234');
      },
    });

    assert.strictEqual(block, 0x1234);
    assert.deepStrictEqual(calls, [
      'https://wrong.test:eth_chainId',
      'https://official.test:eth_chainId',
      'https://official.test:eth_blockNumber',
    ]);
  });

  it('returns null when every RPC is unavailable', async () => {
    const block = await getLatestBlockNumber(8453, {
      endpoints: ['https://offline.test'],
      fetcher: async () => { throw new Error('offline'); },
    });
    assert.strictEqual(block, null);
  });
});
