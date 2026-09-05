import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getLatestBlockNumber, hasDeployedContractCode, resetRpcHeadCacheForTests } from './rpc';

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

  it('distinguishes deployed contract code from an externally owned account', async () => {
    const requestedMethods: string[] = [];
    const fetcher = async (_input: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const request = JSON.parse(String(init?.body)) as { method: string; params: unknown[] };
      requestedMethods.push(request.method);
      if (request.method === 'eth_chainId') return rpcResponse('0xa4b1');
      assert.deepStrictEqual(request.params, [
        '0x1234567890123456789012345678901234567890',
        'latest',
      ]);
      return rpcResponse('0x6001600055');
    };

    const isContract = await hasDeployedContractCode(
      42161,
      '0x1234567890123456789012345678901234567890',
      { endpoints: ['https://arbitrum.test'], fetcher },
    );

    assert.strictEqual(isContract, true);
    assert.deepStrictEqual(requestedMethods, ['eth_chainId', 'eth_getCode']);
  });

  it('returns false when the canonical RPC reports empty account code', async () => {
    const isContract = await hasDeployedContractCode(
      1,
      '0x1234567890123456789012345678901234567890',
      {
        endpoints: ['https://ethereum.test'],
        fetcher: async (_input, init) => {
          const method = (JSON.parse(String(init?.body)) as { method: string }).method;
          return rpcResponse(method === 'eth_chainId' ? '0x1' : '0x');
        },
      },
    );

    assert.strictEqual(isContract, false);
  });
});
