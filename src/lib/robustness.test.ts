import { test, describe } from 'node:test';
import assert from 'node:assert';
import { getApiKeyForChain } from './etherscan';
import { formatSafeUnits, processTransactions, processInternalTransactions } from './scanner';
import { getCachedPriceQuote } from './prices';
import { checkSybilStatus } from './sybil/sybilService';
import { computeMediaScore } from './sybil/mediaScoring';
import { EtherscanInternalTransaction, EtherscanTransaction } from './types';

describe('System Robustness & Precision Tests', () => {
  test('should resolve chain-specific explorer API keys correctly', () => {
    // Custom key should take absolute priority
    const custom = getApiKeyForChain(1, 'MY_CUSTOM_KEY');
    assert.strictEqual(custom, 'MY_CUSTOM_KEY');

    // Default key fallback
    const keyEth = getApiKeyForChain(1);
    const keyArb = getApiKeyForChain(42161);
    assert.ok(keyEth === undefined || typeof keyEth === 'string');
    assert.ok(keyArb === undefined || typeof keyArb === 'string');
  });

  test('should reject the legacy placeholder API key', () => {
    const previousEtherscanKey = process.env.ETHERSCAN_API_KEY;
    delete process.env.ETHERSCAN_API_KEY;

    try {
      assert.strictEqual(getApiKeyForChain(1, 'YourEtherscanApiKeyHere'), undefined);
      assert.strictEqual(getApiKeyForChain(1, 'your_etherscan_api_key'), undefined);
    } finally {
      if (previousEtherscanKey === undefined) delete process.env.ETHERSCAN_API_KEY;
      else process.env.ETHERSCAN_API_KEY = previousEtherscanKey;
    }
  });

  test('should format EVM wei and token units safely without float precision loss', () => {
    // 1 ETH (18 decimals)
    assert.strictEqual(formatSafeUnits('1000000000000000000', 18), 1);
    // 0.5 ETH
    assert.strictEqual(formatSafeUnits('500000000000000000', 18), 0.5);
    // 100 USDC (6 decimals)
    assert.strictEqual(formatSafeUnits('100000000', 6), 100);
    // Zero
    assert.strictEqual(formatSafeUnits('0', 18), 0);
    assert.strictEqual(formatSafeUnits('', 18), 0);
    // Huge token number (1 billion tokens with 18 decimals)
    assert.strictEqual(formatSafeUnits('1000000000000000000000000000', 18), 1000000000);
  });

  test('should accurately price stablecoins at $1.00', () => {
    const usdtPrice = getCachedPriceQuote('tether', Math.floor(Date.now() / 1000));
    const usdcPrice = getCachedPriceQuote('usd-coin', Math.floor(Date.now() / 1000));
    const daiPrice = getCachedPriceQuote('dai', Math.floor(Date.now() / 1000));
    assert.deepStrictEqual(usdtPrice, { priceUSD: 1, provenance: 'stablecoin_assumption' });
    assert.deepStrictEqual(usdcPrice, { priceUSD: 1, provenance: 'stablecoin_assumption' });
    assert.deepStrictEqual(daiPrice, { priceUSD: 1, provenance: 'stablecoin_assumption' });
  });

  test('should process normal and internal transactions with safe unit math', () => {
    const mockTx: EtherscanTransaction = {
      blockNumber: '1',
      hash: '0x123',
      timeStamp: '1700000000',
      nonce: '0',
      blockHash: '0xblock',
      transactionIndex: '0',
      from: '0xaaa',
      to: '0xbbb',
      value: '2500000000000000000', // 2.5 ETH
      gas: '21000',
      gasUsed: '21000',
      gasPrice: '20000000000',
      isError: '0',
      txreceipt_status: '1',
      methodId: '0x',
      functionName: '',
      input: '0x',
      contractAddress: '',
      cumulativeGasUsed: '21000',
      confirmations: '1',
    };
    const processed = processTransactions([mockTx], 1);
    assert.strictEqual(processed.length, 1);
    assert.strictEqual(processed[0].valueFormatted, 2.5);
    assert.strictEqual(processed[0].category, 'transfer');

    const mockInternal: EtherscanInternalTransaction = {
      blockNumber: '1',
      hash: '0x456',
      timeStamp: '1700000000',
      from: '0xcontract',
      to: '0xaaa',
      value: '5000000000000000000', // 5.0 ETH
      gasUsed: '0',
      gas: '0',
      isError: '0',
      errCode: '',
      contractAddress: '',
      traceId: '0',
      type: 'call',
      input: '0x',
    };
    const processedInternals = processInternalTransactions([mockInternal], '0xaaa', 1);
    assert.strictEqual(processedInternals.length, 1);
    assert.strictEqual(processedInternals[0].valueFormatted, 5.0);
    assert.strictEqual(processedInternals[0].functionName, 'call');
  });

  test('should flag OFAC sanctioned addresses even on offline cold-start baseline cache', async () => {
    // Tornado Cash classic core pool contract
    const tornadoAddr = '0x8589427373d6d84e98730d7795d8f6f8731fda16';
    const report = await checkSybilStatus(tornadoAddr);
    assert.strictEqual(report.isFlagged, true);
    assert.strictEqual(report.overallStatus, 'flagged');
    const ofacMatch = report.matches.find(m => m.databaseId === 'ofac');
    assert.strictEqual(ofacMatch?.flagged, true);
    assert.strictEqual(ofacMatch?.severity, 'critical');
  });

  test('should not give maximum identity score to low-effort dust bot across multiple chains', () => {
    // 2 transactions across 4 chains (dust bot pattern)
    const score = computeMediaScore({
      address: '0xbot',
      transactions: [
        { hash: '0x1', timestamp: 1700000000, date: '2023-11-14', from: '0xbot', to: '0x1', value: '0', valueFormatted: 0, valueUSD: 0, valueUSDProvenance: 'historical', gasUsed: 21000, gasPrice: 1, gasCostETH: 0.0001, gasCostUSD: 0.2, gasCostUSDProvenance: 'historical', isError: false, methodId: '0x', functionName: '', category: 'transfer', chainId: 1 },
        { hash: '0x2', timestamp: 1700000000, date: '2023-11-14', from: '0xbot', to: '0x2', value: '0', valueFormatted: 0, valueUSD: 0, valueUSDProvenance: 'historical', gasUsed: 21000, gasPrice: 1, gasCostETH: 0.0001, gasCostUSD: 0.2, gasCostUSDProvenance: 'historical', isError: false, methodId: '0x', functionName: '', category: 'transfer', chainId: 8453 },
      ],
      tokenTransfers: [],
      uniqueContractCount: 2,
      activeChainsCount: 4,
      totalVolumeUSD: 10,
      totalGasUSD: 0.5,
    });
    // Identity score should NOT be 95
    assert.ok(score.identity <= 45);
    assert.strictEqual(score.classification, 'High Sybil Risk');
  });

  test('should return null for unresolvable non-stablecoin assets without fallback corruption', () => {
    // Unknown or uncached assets must return null, NOT hardcoded 2800 or 580
    const unknownPrice = getCachedPriceQuote('some-uncached-token-id-12345', 1700000000);
    assert.deepStrictEqual(unknownPrice, { priceUSD: null, provenance: 'unpriced' });
  });
});
