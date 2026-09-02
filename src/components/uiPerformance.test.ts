import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const readSource = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

describe('UI effect performance contracts', () => {
  it('starts cursor work from fine-pointer movement and stops settled loops', () => {
    const source = readSource('./CursorGlow.tsx');
    assert.match(source, /addEventListener\('pointermove'/);
    assert.match(source, /pointer: fine/);
    assert.match(source, /any-pointer: fine/);
    assert.match(source, /requestAnimationFrame\(animate\)/);
    assert.match(source, /cancelAnimationFrame/);
    assert.match(source, /isCursorSettled/);
    assert.doesNotMatch(source, /window\.addEventListener\('mousemove'/);
    assert.doesNotMatch(source, /\n\s*animate\(\);/);
    assert.match(source, /translate3d\(/);
    assert.match(source, /h-\[560px\] w-\[560px\]/);
  });

  it('handles background reduced motion, visibility, resize, and time-based drawing', () => {
    const source = readSource('./BackgroundNodes.tsx');
    assert.match(source, /prefers-reduced-motion/);
    assert.match(source, /visibilitychange/);
    assert.match(source, /cancelAnimation/);
    assert.match(source, /deltaSeconds/);
    assert.match(source, /distanceSquared/);
    assert.match(source, /BACKGROUND_FRAME_INTERVAL_MS/);
    assert.match(source, /window\.addEventListener\('resize'/);
    assert.match(source, /drawFrame\(0\)/);
  });

  it('pauses graph line animation when hidden or outside the viewport', () => {
    const hookSource = readSource('../hooks/useAnimationVisibility.ts');
    const capitalSource = readSource('./CapitalFlowGraph.tsx');
    const clusterSource = readSource('./ClusterFlowGraph.tsx');

    assert.match(hookSource, /IntersectionObserver/);
    assert.match(hookSource, /visibilitychange/);
    assert.match(hookSource, /observer\.disconnect\(\)/);
    assert.match(capitalSource, /useAnimationVisibility/);
    assert.match(capitalSource, /graph-animations-paused/);
    assert.match(capitalSource, /animation-play-state: paused/);
    assert.match(clusterSource, /useAnimationVisibility/);
    assert.match(clusterSource, /graph-animations-paused/);
    assert.match(clusterSource, /animation-play-state: paused/);
  });
});
