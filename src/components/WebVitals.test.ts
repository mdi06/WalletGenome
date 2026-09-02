import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const source = readFileSync(new URL('./WebVitals.tsx', import.meta.url), 'utf8');

describe('Web Vitals integration', () => {
  it('sends sampled metrics to the first-party privacy-safe endpoint', () => {
    assert.match(source, /PERFORMANCE_TELEMETRY_PATH/);
    assert.match(source, /PERFORMANCE_SAMPLE_RATE/);
    assert.match(source, /sendBeacon/);
    assert.match(source, /keepalive: true/);
    assert.doesNotMatch(source, /console\.log\(metric\)/);
    assert.doesNotMatch(source, /metric\.entries/);
  });
});
