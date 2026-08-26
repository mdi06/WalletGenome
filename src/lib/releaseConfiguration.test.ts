import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

interface PackageManifest {
  engines?: { node?: string };
  scripts?: Record<string, string>;
}

interface VercelConfiguration {
  buildCommand?: string;
  framework?: string;
}

function readJson<T>(fileName: string): T {
  return JSON.parse(readFileSync(join(process.cwd(), fileName), 'utf8')) as T;
}

describe('release verification configuration', () => {
  it('uses one deterministic local verification command on Node.js 22', () => {
    const manifest = readJson<PackageManifest>('package.json');

    assert.equal(manifest.engines?.node, '22.x');
    assert.equal(manifest.scripts?.lint, 'eslint .');
    assert.equal(manifest.scripts?.typecheck, 'next typegen && tsc --noEmit');
    assert.equal(manifest.scripts?.test, "tsx --test 'src/**/*.test.ts'");
    assert.equal(
      manifest.scripts?.verify,
      'npm run lint && npm run typecheck && npm test && npm run build',
    );
  });

  it('runs the same verification command in CI and Vercel', () => {
    const workflow = readFileSync(join(process.cwd(), '.github/workflows/verify.yml'), 'utf8');
    const vercel = readJson<VercelConfiguration>('vercel.json');

    assert.match(workflow, /node-version: 22/);
    assert.match(workflow, /run: npm ci/);
    assert.match(workflow, /run: npm run verify/);
    assert.equal(vercel.buildCommand, 'npm run verify');
    assert.equal(vercel.framework, 'nextjs');
  });

  it('does not configure lint or TypeScript build bypasses', () => {
    const nextConfig = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf8');

    assert.doesNotMatch(nextConfig, /ignoreDuringBuilds/);
    assert.doesNotMatch(nextConfig, /ignoreBuildErrors/);
  });

  it('applies baseline security headers without disabling static rendering', () => {
    const nextConfig = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf8');

    assert.match(nextConfig, /Content-Security-Policy/);
    assert.match(nextConfig, /frame-ancestors 'none'/);
    assert.match(nextConfig, /X-Content-Type-Options/);
    assert.match(nextConfig, /X-Frame-Options/);
    assert.match(nextConfig, /Referrer-Policy/);
    assert.match(nextConfig, /Permissions-Policy/);
    assert.doesNotMatch(nextConfig, /nonce/);
  });

  it('declares every API route on the intended Node.js runtime', () => {
    const routeFiles = [
      'src/app/api/scan/route.ts',
      'src/app/api/batch-scan/route.ts',
      'src/app/api/known-wallets/route.ts',
    ];

    for (const routeFile of routeFiles) {
      const source = readFileSync(join(process.cwd(), routeFile), 'utf8');
      assert.match(source, /export const runtime = ['"]nodejs['"]/);
    }
  });
});
