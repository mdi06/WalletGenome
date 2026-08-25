import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getNextTabIndex } from './tabs';

describe('keyboard tab navigation', () => {
  it('wraps arrow navigation and supports Home and End', () => {
    assert.strictEqual(getNextTabIndex(0, 3, 'ArrowLeft'), 2);
    assert.strictEqual(getNextTabIndex(2, 3, 'ArrowRight'), 0);
    assert.strictEqual(getNextTabIndex(1, 3, 'Home'), 0);
    assert.strictEqual(getNextTabIndex(1, 3, 'End'), 2);
  });

  it('ignores unrelated keys and empty tab lists', () => {
    assert.strictEqual(getNextTabIndex(1, 3, 'Enter'), null);
    assert.strictEqual(getNextTabIndex(0, 0, 'ArrowRight'), null);
  });
});
