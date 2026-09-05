import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classifyWalletAccount } from './accountClassifier';

const WALLET = '0x1234567890123456789012345678901234567890';
const IMPLEMENTATION = 'abcdefabcdefabcdefabcdefabcdefabcdefabcd';

function rpcResponse(result: string): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function rpcFetcher(code: string, callResult = '0x') {
  return async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const body = JSON.parse(String(init?.body)) as { method?: string; params?: unknown[] };
    if (body.method === 'eth_chainId') return rpcResponse('0x1');
    if (body.method === 'eth_getCode') return rpcResponse(code);
    if (body.method === 'eth_call') return rpcResponse(callResult);
    throw new Error(`Unexpected RPC method ${body.method}`);
  };
}

describe('shared wallet account classifier', () => {
  it('classifies empty deployed code as a verified EOA', async () => {
    const result = await classifyWalletAccount(1, WALLET, {
      endpoints: ['https://account-classifier-eoa.test'],
      fetcher: rpcFetcher('0x'),
    });

    assert.deepEqual(
      { type: result.type, confidence: result.confidence },
      { type: 'eoa', confidence: 'verified' },
    );
  });

  it('recognizes EIP-7702 delegated EOAs from delegation bytecode', async () => {
    const result = await classifyWalletAccount(1, WALLET, {
      endpoints: ['https://account-classifier-7702.test'],
      fetcher: rpcFetcher(`0xef0100${IMPLEMENTATION}`),
    });

    assert.equal(result.type, 'eip_7702');
    assert.equal(result.confidence, 'verified');
    assert.match(result.evidence, new RegExp(IMPLEMENTATION));
  });

  it('recognizes a minimal proxy as multisig or proxy', async () => {
    const result = await classifyWalletAccount(1, WALLET, {
      endpoints: ['https://account-classifier-proxy.test'],
      fetcher: rpcFetcher('0x363d3d373d3d3d363d73abcdefabcdefabcdefabcdefabcdefabcdefabcd5af43d82803e903d91602b57fd5bf3'),
    });

    assert.equal(result.type, 'multisig_or_proxy');
    assert.equal(result.confidence, 'verified');
  });

  it('recognizes Safe-compatible multisig threshold responses', async () => {
    const result = await classifyWalletAccount(1, WALLET, {
      endpoints: ['https://account-classifier-safe.test'],
      fetcher: async (input, init) => {
        const body = JSON.parse(String(init?.body)) as { method?: string; params?: unknown[] };
        if (body.method === 'eth_call') {
          const call = body.params?.[0] as { data?: string } | undefined;
          return rpcResponse(call?.data === '0xe75235b8' ? `0x${'0'.repeat(63)}1` : '0x');
        }
        return rpcFetcher('0x6001600055')(input, init);
      },
    });

    assert.equal(result.type, 'multisig_or_proxy');
    assert.equal(result.confidence, 'verified');
  });

  it('recognizes smart-account interface markers and ordinary contracts separately', async () => {
    const smartAccount = await classifyWalletAccount(1, WALLET, {
      endpoints: ['https://account-classifier-smart.test'],
      fetcher: rpcFetcher('0x600035567e1a60003a871cdd'),
    });
    const regularContract = await classifyWalletAccount(1, WALLET, {
      endpoints: ['https://account-classifier-regular.test'],
      fetcher: rpcFetcher('0x6001600055'),
    });

    assert.equal(smartAccount.type, 'smart_account');
    assert.equal(smartAccount.confidence, 'heuristic');
    assert.equal(regularContract.type, 'regular_contract');
    assert.equal(regularContract.confidence, 'heuristic');
  });

  it('returns unknown when no RPC can verify the account code', async () => {
    const result = await classifyWalletAccount(1, WALLET, {
      endpoints: ['https://account-classifier-unknown.test'],
      fetcher: async () => { throw new Error('RPC unavailable'); },
    });

    assert.equal(result.type, 'unknown');
    assert.equal(result.confidence, 'unknown');
  });
});
