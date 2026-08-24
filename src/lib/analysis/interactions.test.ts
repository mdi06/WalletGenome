import assert from 'node:assert';
import { describe, it } from 'node:test';
import { analyzeInteractions } from './interactions';
import { ProcessedTokenTransfer, ProcessedTransaction } from '../types';

const wallet = '0x1234567890123456789012345678901234567890';
const router = '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45';

function transaction(chainId: number): ProcessedTransaction {
  return {
    hash: '0xswap',
    timestamp: 1_700_000_000,
    date: '2023-11-14',
    from: wallet,
    to: router,
    value: '0',
    valueFormatted: 0,
    valueUSD: 0,
    valueUSDProvenance: 'historical',
    gasUsed: 100_000,
    gasPrice: 1,
    gasCostETH: 0.001,
    gasCostUSD: 0.3,
    gasCostUSDProvenance: 'historical',
    isError: false,
    methodId: '0x12345678',
    functionName: 'exactInput',
    category: 'swap',
    chainId,
  };
}

function transfer(
  from: string,
  to: string,
  valueUSD: number | null,
): ProcessedTokenTransfer {
  return {
    hash: '0xswap',
    timestamp: 1_700_000_000,
    date: '2023-11-14',
    from,
    to,
    contractAddress: '0x9999999999999999999999999999999999999999',
    tokenName: 'Test Token',
    tokenSymbol: 'TEST',
    tokenDecimal: 18,
    value: '1',
    valueFormatted: 1,
    valueUSD,
    valueUSDProvenance: valueUSD === null ? 'unpriced' : 'historical',
    direction: from.toLowerCase() === wallet.toLowerCase() ? 'out' : 'in',
    chainId: 1,
  };
}

describe('Protocol interaction attribution', () => {
  it('attributes priced ERC-20-only swap legs by transaction hash and called contract', () => {
    const result = analyzeInteractions([
      transaction(1),
    ], [
      transfer(wallet, router, 100),
      transfer(router, wallet, 95),
      transfer(router, wallet, null),
    ], wallet, 1);

    assert.strictEqual(result.protocolVolumeUSD, 195);
    assert.strictEqual(result.topProtocols[0].totalVolumeUSD, 195);
    assert.strictEqual(result.topProtocols[0].chainName, 'Ethereum');
    assert.strictEqual(result.topProtocols[0].nativeTokenSymbol, 'ETH');
  });

  it('preserves Base network and native-token metadata', () => {
    const result = analyzeInteractions([transaction(8453)], [], wallet, 8453);

    assert.strictEqual(result.topProtocols[0].chainId, 8453);
    assert.strictEqual(result.topProtocols[0].chainName, 'Base');
    assert.strictEqual(result.topProtocols[0].nativeTokenSymbol, 'ETH');
    assert.strictEqual(result.topProtocols[0].contracts[0].nativeTokenSymbol, 'ETH');
  });
});
