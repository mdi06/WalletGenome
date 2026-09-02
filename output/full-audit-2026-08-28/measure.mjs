import fs from 'node:fs';
import zlib from 'node:zlib';
import { performance } from 'node:perf_hooks';

// Audit-only: reads build artifacts and makes serial GET/HEAD requests to the
// temporary local production preview. Never calls scan APIs or providers.
const routes = ['/', '/docs', '/evm-wallet-analytics', '/crypto-wallet-risk-checker', '/token-approval-checker', '/sybil-wallet-analysis', '/multi-chain-wallet-forensics'];
const result = { generatedAt: new Date().toISOString(), environment: 'local production build, unthrottled, serial warm requests; not browser paint timings', routes: [], demos: [] };
for (const route of routes) {
  const html = fs.readFileSync(`.next/server/app/${route === '/' ? 'index' : route.slice(1)}.html`, 'utf8');
  const assets = [...new Set([...html.matchAll(/(?:src|href)="([^"?]+\.(?:js|css|woff2))(?:\?[^" ]*)?"/g)].map(m => m[1]))].filter(n => n.startsWith('/_next/'));
  const totals = {};
  for (const asset of assets) {
    const buffer = fs.readFileSync('.next/' + decodeURIComponent(asset.slice(7)));
    const kind = asset.split('.').pop();
    totals[kind] ??= { files: 0, rawBytes: 0, gzipBytes: 0 };
    totals[kind].files++;
    totals[kind].rawBytes += buffer.length;
    totals[kind].gzipBytes += zlib.gzipSync(buffer).length;
  }
  const timings = [];
  let headers;
  for (let i = 0; i < 6; i++) {
    const start = performance.now();
    const response = await fetch('http://127.0.0.1:3011' + route);
    const responseMs = performance.now() - start;
    await response.arrayBuffer();
    if (i > 0) timings.push({ status: response.status, responseMs: +responseMs.toFixed(2), totalMs: +(performance.now() - start).toFixed(2) });
    headers = Object.fromEntries(response.headers);
  }
  result.routes.push({ route, htmlBytes: Buffer.byteLength(html), htmlGzipBytes: zlib.gzipSync(html).length, initialAssets: totals, timings, headers });
}
for (const file of fs.readdirSync('public/demo-wallets').filter(p => p.endsWith('.json'))) {
  const buffer = fs.readFileSync('public/demo-wallets/' + file);
  result.demos.push({ file, rawBytes: buffer.length, gzipBytes: zlib.gzipSync(buffer).length });
}
fs.writeFileSync('output/full-audit-2026-08-28/metrics.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
