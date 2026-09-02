# R06 — `NoFallbackError` reproduction and resolution

Date: 2026-09-01
Candidate: `architecture-validation` at `5e7089c4fdc9b8969d07ef7822c43c28d56e4221`
Server: Next.js 16.3.1 production server, `PORT=3013`

## Reproduction

After a fresh `npm run build`, the sequential request matrix ran at approximately
`2026-09-01T13:13:47Z` against the production server. The expected pages and
assets returned HTTP 200. `/does-not-exist` returned HTTP 404, then the server
log emitted `Error: Internal: NoFallbackError` from
`.next/server/chunks/430.js`.

The fresh `.next/prerender-manifest.json` declared `/[slug]` with
`fallback: false`. That matched `dynamicParams = false` in the route, so Next
threw its internal no-fallback sentinel before the page's `notFound()` branch.

## Post-fix smoke

After setting `dynamicParams = true`, rebuilding, and restarting the server, the
same sequential matrix ran at approximately `2026-09-01T13:16:10Z`:

| Request group | Result |
| --- | --- |
| `/`, `/docs` | 200 |
| Five generated SEO landing pages | 200 |
| `/opengraph-image`, `/twitter-image`, `/favicon.ico` | 200 |
| `/robots.txt`, `/sitemap.xml` | 200 |
| Four `/demo-wallets/*.json` assets | 200 |
| `/does-not-exist` | 404, no internal-error text |

The response body for `/does-not-exist` contained neither `NoFallbackError` nor
`Internal Server Error`. `server-after.log` contains only startup/readiness
lines, and its error scan found no error lines.

## Verification

- Focused route/SEO tests: 4/4 passed.
- `npm run verify`: passed; lint, generated-route typecheck, 304/304 tests, and production build.
- `git diff --check`: passed.
- No provider-backed scan, Preview, deployment, push, reset, discard, or remote/cloud action was performed.

Logs: `server.log` is the pre-fix reproduction; `server-after.log` is the
post-fix clean production smoke log.
