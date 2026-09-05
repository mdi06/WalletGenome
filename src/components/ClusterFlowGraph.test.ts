import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  createClusterFlowGraphInteraction,
  type ClusterFlowGraphInteraction,
  type ClusterFlowGraphInteractionState,
  type ClusterFlowGraphPointerEvent,
  type ClusterFlowGraphPointerTarget,
} from './ClusterFlowGraph';

const source = readFileSync(new URL('./ClusterFlowGraph.tsx', import.meta.url), 'utf8');

interface FrameHarness {
  requestAnimationFrame: (callback: () => void) => number;
  cancelAnimationFrame: (frameId: number) => void;
  pendingCount: () => number;
  flush: () => void;
  cancelled: number[];
}

interface InteractionHarness {
  interaction: ClusterFlowGraphInteraction;
  frames: FrameHarness;
  panChanges: Array<{ x: number; y: number }>;
}

const createFrameHarness = (): FrameHarness => {
  let nextFrameId = 0;
  const pendingFrames = new Map<number, () => void>();
  const cancelled: number[] = [];

  return {
    requestAnimationFrame: callback => {
      const frameId = ++nextFrameId;
      pendingFrames.set(frameId, callback);
      return frameId;
    },
    cancelAnimationFrame: frameId => {
      cancelled.push(frameId);
      pendingFrames.delete(frameId);
    },
    pendingCount: () => pendingFrames.size,
    flush: () => {
      const callbacks = [...pendingFrames.values()];
      pendingFrames.clear();
      callbacks.forEach(callback => callback());
    },
    cancelled,
  };
};

const createPointerTarget = (): ClusterFlowGraphPointerTarget => {
  const capturedPointerIds = new Set<number>();

  return {
    setPointerCapture: pointerId => capturedPointerIds.add(pointerId),
    hasPointerCapture: pointerId => capturedPointerIds.has(pointerId),
    releasePointerCapture: pointerId => capturedPointerIds.delete(pointerId),
  };
};

const pointer = (
  target: ClusterFlowGraphPointerTarget,
  overrides: Partial<Omit<ClusterFlowGraphPointerEvent, 'currentTarget'>> = {},
): ClusterFlowGraphPointerEvent => ({
  pointerId: 1,
  pointerType: 'mouse',
  button: 0,
  clientX: 100,
  clientY: 100,
  currentTarget: target,
  ...overrides,
});

const createInteractionHarness = (initialScale = 0.88): InteractionHarness => {
  const frames = createFrameHarness();
  const panChanges: Array<{ x: number; y: number }> = [];
  let previousPan = { x: 0, y: 0 };
  const interaction = createClusterFlowGraphInteraction({
    initialScale,
    requestAnimationFrame: frames.requestAnimationFrame,
    cancelAnimationFrame: frames.cancelAnimationFrame,
    onChange: (state: ClusterFlowGraphInteractionState) => {
      if (state.pan.x !== previousPan.x || state.pan.y !== previousPan.y) {
        panChanges.push({ ...state.pan });
        previousPan = { ...state.pan };
      }
    },
  });

  return { interaction, frames, panChanges };
};

test('applies fifty moves at the latest position once per frame', () => {
  const harness = createInteractionHarness();
  const target = createPointerTarget();

  harness.interaction.pointerDown(pointer(target));
  for (let step = 1; step <= 50; step += 1) {
    harness.interaction.pointerMove(pointer(target, {
      clientX: 100 + step,
      clientY: 100 + step,
    }));
  }

  assert.equal(harness.frames.pendingCount(), 1);
  harness.frames.flush();
  assert.deepEqual(harness.interaction.getState().pan, { x: 50, y: 50 });
  assert.deepEqual(harness.panChanges, [{ x: 50, y: 50 }]);
  harness.interaction.dispose();
});

test('does not pan for vertical touch movement', () => {
  const harness = createInteractionHarness();
  const target = createPointerTarget();

  harness.interaction.pointerDown(pointer(target, {
    pointerType: 'touch',
    clientX: 100,
    clientY: 100,
  }));
  harness.interaction.pointerMove(pointer(target, {
    pointerType: 'touch',
    clientX: 103,
    clientY: 125,
  }));
  harness.frames.flush();
  harness.interaction.pointerUp(pointer(target, {
    pointerType: 'touch',
    clientX: 103,
    clientY: 125,
  }));
  harness.frames.flush();

  assert.equal(harness.frames.pendingCount(), 0);
  assert.deepEqual(harness.interaction.getState().pan, { x: 0, y: 0 });
  assert.deepEqual(harness.panChanges, []);
  harness.interaction.dispose();
});

test('pans for horizontal touch movement and preserves its final position', () => {
  const harness = createInteractionHarness();
  const target = createPointerTarget();

  harness.interaction.pointerDown(pointer(target, {
    pointerType: 'touch',
    clientX: 100,
    clientY: 100,
  }));
  harness.interaction.pointerMove(pointer(target, {
    pointerType: 'touch',
    clientX: 125,
    clientY: 103,
  }));
  harness.interaction.pointerUp(pointer(target, {
    pointerType: 'touch',
    clientX: 140,
    clientY: 105,
  }));
  harness.frames.flush();

  assert.deepEqual(harness.interaction.getState().pan, { x: 40, y: 5 });
  assert.deepEqual(harness.panChanges, [{ x: 40, y: 5 }]);
  harness.interaction.dispose();
});

test('keeps mouse drag and its final pointerup position working', () => {
  const harness = createInteractionHarness();
  const target = createPointerTarget();

  harness.interaction.pointerDown(pointer(target, { clientX: 50, clientY: 60 }));
  harness.interaction.pointerMove(pointer(target, { clientX: 70, clientY: 80 }));
  harness.interaction.pointerUp(pointer(target, { clientX: 90, clientY: 100 }));
  harness.frames.flush();

  assert.deepEqual(harness.interaction.getState(), {
    pan: { x: 40, y: 40 },
    scale: 0.88,
    isDragging: false,
  });
  assert.deepEqual(harness.panChanges, [{ x: 40, y: 40 }]);
  assert.equal(target.hasPointerCapture(1), false);
  harness.interaction.dispose();
});

test('cancels pending pan on pointer cancellation and lost capture', () => {
  for (const endGesture of ['pointerCancel', 'lostPointerCapture'] as const) {
    const harness = createInteractionHarness();
    const target = createPointerTarget();

    harness.interaction.pointerDown(pointer(target));
    harness.interaction.pointerMove(pointer(target, { clientX: 130, clientY: 130 }));
    assert.equal(harness.frames.pendingCount(), 1);
    harness.interaction[endGesture](pointer(target, { clientX: 130, clientY: 130 }));
    harness.frames.flush();

    assert.equal(harness.frames.pendingCount(), 0);
    assert.deepEqual(harness.interaction.getState().pan, { x: 0, y: 0 });
    assert.equal(harness.interaction.getState().isDragging, false);
    assert.deepEqual(harness.frames.cancelled, [1]);
    harness.interaction.dispose();
  }
});

test('cancels pending pan when the interaction is disposed', () => {
  const harness = createInteractionHarness();
  const target = createPointerTarget();

  harness.interaction.pointerDown(pointer(target));
  harness.interaction.pointerMove(pointer(target, { clientX: 130, clientY: 130 }));
  harness.interaction.dispose();
  harness.frames.flush();

  assert.deepEqual(harness.interaction.getState().pan, { x: 0, y: 0 });
  assert.deepEqual(harness.frames.cancelled, [1]);
});

test('keeps ordinary wheel and vertical touch scrolling native', () => {
  assert.doesNotMatch(source, /addEventListener\(['"]wheel/);
  assert.doesNotMatch(source, /preventDefault\(\)/);
  assert.match(source, /touch-pan-y/);
});

test('keeps zoom and reset behavior working', () => {
  const harness = createInteractionHarness(0.88);
  const target = createPointerTarget();

  harness.interaction.zoomIn();
  assert.equal(harness.interaction.getState().scale, 1.08);
  harness.interaction.zoomOut();
  assert.ok(Math.abs(harness.interaction.getState().scale - 0.88) < Number.EPSILON);

  harness.interaction.pointerDown(pointer(target));
  harness.interaction.pointerMove(pointer(target, { clientX: 130, clientY: 140 }));
  harness.frames.flush();
  assert.deepEqual(harness.interaction.getState().pan, { x: 30, y: 40 });

  harness.interaction.resetZoom();
  assert.deepEqual(harness.interaction.getState(), {
    pan: { x: 0, y: 0 },
    scale: 0.88,
    isDragging: true,
  });
  harness.interaction.dispose();
});

test('keeps graph inspection available through explicit keyboard-reachable controls', () => {
  assert.match(source, /aria-label="Zoom in on cluster graph"/);
  assert.match(source, /aria-label="Zoom out on cluster graph"/);
  assert.match(source, /aria-label="Reset cluster graph view"/);
  assert.match(source, /No wallet nodes found in returned data\./);
  assert.match(source, /No connections found in returned data\./);
  assert.match(source, /No connection evidence is included in this saved example\./);
  assert.match(source, /Wallet nodes remain mapped\. This is not a rendering error\./);
  assert.match(source, /onPointerDown=\{handlePointerDown\}/);
});
