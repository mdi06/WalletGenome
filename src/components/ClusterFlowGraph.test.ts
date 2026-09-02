import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./ClusterFlowGraph.tsx', import.meta.url), 'utf8');

test('keeps ordinary wheel and vertical touch scrolling native', () => {
  assert.doesNotMatch(source, /addEventListener\(['"]wheel/);
  assert.doesNotMatch(source, /preventDefault\(\)/);
  assert.match(source, /touch-pan-y/);
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
