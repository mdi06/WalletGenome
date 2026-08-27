import assert from 'node:assert';
import { describe, it } from 'node:test';
import { formatCategoryLabel, formatFiatUSD, formatNativeTokenValue } from './dashboardUtils';

describe('category label formatter', () => {
  it('humanizes internal transaction category names', () => {
    assert.strictEqual(formatCategoryLabel('contract_interaction'), 'Contract calls');
    assert.strictEqual(formatCategoryLabel('CONTRACT_INTERACTION'), 'Contract calls');
    assert.strictEqual(formatCategoryLabel('CONTRACT_DEPLOY'), 'Contract deployments');
  });
});

describe('fiat formatter', () => {
  it('does not round a non-zero sub-cent amount down to zero', () => {
    assert.strictEqual(formatFiatUSD(0.0099), '<$0.01');
    assert.strictEqual(formatFiatUSD(0.01), '$0.01');
  });

  it('keeps detailed cent formatting for ordinary amounts', () => {
    assert.strictEqual(formatFiatUSD(1234.5), '$1,234.50');
    assert.strictEqual(formatFiatUSD(0), '$0.00');
  });

  it('marks invalid fiat values as unavailable', () => {
    assert.strictEqual(formatFiatUSD(null), 'Unavailable');
    assert.strictEqual(formatFiatUSD('not-a-number'), 'Unavailable');
  });
});

describe('adaptive native token formatter', () => {
  it('preserves exact zero and uses the requested token symbol', () => {
    assert.strictEqual(formatNativeTokenValue(0, 'ETH'), '0 ETH');
    assert.strictEqual(formatNativeTokenValue(0, 'MATIC'), '0 MATIC');
  });

  it('does not round a positive dust value down to zero', () => {
    assert.strictEqual(formatNativeTokenValue(0.00000042, 'ETH'), '<0.0001 ETH');
    assert.strictEqual(formatNativeTokenValue(0.00009999, 'ETH'), '<0.0001 ETH');
    assert.strictEqual(formatNativeTokenValue(0.0001, 'ETH'), '0.0001 ETH');
  });

  it('keeps useful precision for ordinary and large values', () => {
    assert.strictEqual(formatNativeTokenValue(0.01234, 'ETH'), '0.0123 ETH');
    assert.strictEqual(formatNativeTokenValue(12.345, 'ETH'), '12.35 ETH');
  });

  it('does not invent a zero for missing or invalid values', () => {
    assert.strictEqual(formatNativeTokenValue(null, 'ETH'), 'Unavailable');
    assert.strictEqual(formatNativeTokenValue('not-a-number', 'ETH'), 'Unavailable');
  });
});
