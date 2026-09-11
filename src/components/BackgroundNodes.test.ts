import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  BACKGROUND_FRAME_INTERVAL_MS,
  shouldDrawFrame,
  shouldRunDecorativeLoop,
} from './uiEffectRuntime';
import { remapParticlePosition } from './BackgroundNodes';

describe('background particle resize behavior', () => {
  it('preserves normalized particle positions when the viewport expands', () => {
    const position = remapParticlePosition(
      { x: 360, y: 270 },
      { width: 720, height: 540 },
      { width: 1440, height: 1080 },
    );

    assert.deepStrictEqual(position, { x: 720, y: 540 });
  });

  it('keeps unrelated particles distributed when the viewport shrinks', () => {
    const previousSize = { width: 1200, height: 800 };
    const nextSize = { width: 390, height: 844 };
    const positions = [
      remapParticlePosition({ x: 120, y: 200 }, previousSize, nextSize),
      remapParticlePosition({ x: 960, y: 600 }, previousSize, nextSize),
    ];

    assert.ok(positions[0].x > 0 && positions[0].x < nextSize.width);
    assert.ok(positions[1].x > 0 && positions[1].x < nextSize.width);
    assert.notStrictEqual(positions[0].x, positions[1].x);
    assert.notStrictEqual(positions[0].y, positions[1].y);
  });

  it('handles zero previous dimensions without producing invalid coordinates', () => {
    const position = remapParticlePosition(
      { x: 24, y: 18 },
      { width: 0, height: 0 },
      { width: 390, height: 844 },
    );

    assert.deepStrictEqual(position, { x: 0, y: 0 });
  });

  it('clamps remapped coordinates to the new canvas bounds', () => {
    const position = remapParticlePosition(
      { x: 900, y: -20 },
      { width: 100, height: 100 },
      { width: 390, height: 844 },
    );

    assert.ok(position.x >= 0 && position.x <= 390);
    assert.ok(position.y >= 0 && position.y <= 844);
    assert.deepStrictEqual(position, { x: 390, y: 0 });
  });
});

describe('background animation contracts', () => {
  it('keeps the 30 FPS frame gate', () => {
    assert.strictEqual(shouldDrawFrame(0, null), true);
    assert.strictEqual(shouldDrawFrame(BACKGROUND_FRAME_INTERVAL_MS - 0.01, 0), false);
    assert.strictEqual(shouldDrawFrame(BACKGROUND_FRAME_INTERVAL_MS, 0), true);
  });

  it('pauses while hidden or reduced motion is requested', () => {
    assert.strictEqual(shouldRunDecorativeLoop({ reducedMotion: false, documentHidden: false }), true);
    assert.strictEqual(shouldRunDecorativeLoop({ reducedMotion: true, documentHidden: false }), false);
    assert.strictEqual(shouldRunDecorativeLoop({ reducedMotion: false, documentHidden: true }), false);
  });
});
