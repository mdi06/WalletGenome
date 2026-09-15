import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  BACKGROUND_FRAME_INTERVAL_MS,
  CURSOR_LERP_FACTOR,
  CURSOR_SETTLE_DISTANCE,
  getBoundedElapsedMs,
  hasFinePointerCapability,
  isCursorSettled,
  isFinePointerType,
  shouldDrawFrame,
  shouldRunDecorativeLoop,
  subscribeToMediaQueryChange,
  type MediaQueryChangeListener,
} from './uiEffectRuntime';

describe('decorative UI effect runtime contracts', () => {
  it('only permits loops when motion is allowed and the page is visible', () => {
    assert.strictEqual(shouldRunDecorativeLoop({ reducedMotion: false, documentHidden: false }), true);
    assert.strictEqual(shouldRunDecorativeLoop({ reducedMotion: true, documentHidden: false }), false);
    assert.strictEqual(shouldRunDecorativeLoop({ reducedMotion: false, documentHidden: true }), false);
  });

  it('enables the cursor for fine or hybrid pointers but not touch-only pointers', () => {
    assert.strictEqual(hasFinePointerCapability(false, false), false);
    assert.strictEqual(hasFinePointerCapability(true, false), true);
    assert.strictEqual(hasFinePointerCapability(false, true), true);
    assert.strictEqual(isFinePointerType('touch'), false);
    assert.strictEqual(isFinePointerType('mouse'), true);
    assert.strictEqual(isFinePointerType('pen'), true);
  });

  it('settles cursor motion using a small distance threshold', () => {
    assert.strictEqual(isCursorSettled({ x: 10, y: 10 }, { x: 10.2, y: 10.2 }), true);
    assert.strictEqual(isCursorSettled({ x: 10, y: 10 }, { x: 11, y: 10 }), false);
    assert.strictEqual(CURSOR_LERP_FACTOR, 0.1);
    assert.strictEqual(CURSOR_SETTLE_DISTANCE, 0.5);
  });

  it('bounds long pauses and caps background draws at 30 FPS', () => {
    assert.strictEqual(getBoundedElapsedMs(-10), 0);
    assert.strictEqual(getBoundedElapsedMs(250), 100);
    assert.strictEqual(shouldDrawFrame(0, null), true);
    assert.strictEqual(shouldDrawFrame(16, 0), false);
    assert.strictEqual(shouldDrawFrame(BACKGROUND_FRAME_INTERVAL_MS, 0), true);
  });

  it('uses the standard media-query event listener API when available', () => {
    let added: MediaQueryChangeListener | undefined;
    let removed: MediaQueryChangeListener | undefined;
    const listener: MediaQueryChangeListener = () => {};

    const unsubscribe = subscribeToMediaQueryChange({
      addEventListener: (_type, nextListener) => {
        added = nextListener;
      },
      removeEventListener: (_type, nextListener) => {
        removed = nextListener;
      },
      addListener: () => assert.fail('legacy listener API should not be used'),
      removeListener: () => assert.fail('legacy listener API should not be used'),
    }, listener);

    assert.strictEqual(added, listener);
    unsubscribe();
    assert.strictEqual(removed, listener);
  });

  it('falls back to the legacy iOS media-query listener API', () => {
    let added: MediaQueryChangeListener | undefined;
    let removed: MediaQueryChangeListener | undefined;
    const listener: MediaQueryChangeListener = () => {};

    const unsubscribe = subscribeToMediaQueryChange({
      addListener: (nextListener) => {
        added = nextListener;
      },
      removeListener: (nextListener) => {
        removed = nextListener;
      },
    }, listener);

    assert.strictEqual(added, listener);
    unsubscribe();
    assert.strictEqual(removed, listener);
  });
});
