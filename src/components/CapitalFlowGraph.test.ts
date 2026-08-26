import assert from 'node:assert';
import { it } from 'node:test';
import { formatGraphSummaryValue, formatGraphVolume } from './CapitalFlowGraph';

it('labels missing transfer prices as unavailable instead of presenting zero', () => {
  assert.strictEqual(formatGraphVolume(0, 3), 'Unavailable');
  assert.strictEqual(formatGraphVolume(0, 0), '$0');
  assert.strictEqual(formatGraphVolume(1250, 3), '$1.25K');
  assert.strictEqual(formatGraphSummaryValue(null), 'Unavailable');
  assert.strictEqual(formatGraphSummaryValue(0), '$0');
});
