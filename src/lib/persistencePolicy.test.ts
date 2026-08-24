import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { PERSISTENCE_POLICY } from './persistencePolicy';

function productionTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return productionTypeScriptFiles(path);
    if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) return [];
    return entry.name.includes('.test.') ? [] : [path];
  });
}

test('declares the runtime as stateless and treats caches as optional optimizations', () => {
  assert.equal(PERSISTENCE_POLICY.mode, 'stateless');
  assert.equal(PERSISTENCE_POLICY.durableStorage, false);
  assert.equal(PERSISTENCE_POLICY.runtimeFilesystemWrites, false);
  assert.equal(PERSISTENCE_POLICY.reports.saved, false);
  assert.equal(PERSISTENCE_POLICY.reports.comparableHistory, false);
  assert.equal(PERSISTENCE_POLICY.caches.scope, 'process-local');
  assert.equal(PERSISTENCE_POLICY.caches.requiredForCorrectness, false);
});
test('production application code has no filesystem module dependency', () => {
  const sourceRoot = join(process.cwd(), 'src');
  const offenders = productionTypeScriptFiles(sourceRoot).filter(path => {
    const source = readFileSync(path, 'utf8');
    return /(?:from\s+|require\()['\"](?:node:)?fs(?:\/promises)?['\"]/.test(source);
  });

  assert.deepEqual(offenders, []);
});
