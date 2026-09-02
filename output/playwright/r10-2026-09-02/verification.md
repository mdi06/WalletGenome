# R10 local verification — 2026-09-02

This record covers only R10. It is local evidence; it does not close the Preview or production release gates.

## Implementation

- Added a branded root not-found page with Return to scanner and Read methodology actions while preserving HTTP 404 behavior.
- Added focused route, SEO, security-header and recovery tests.
- Added an unavailable-provider dashboard regression that keeps provider failure visible and does not present a fabricated clean conclusion.

## Results

- Focused R10 tests: **14/14 passed**.
- `npm run verify`: **PASS** — lint had 0 errors, typecheck passed, **323/323 tests** passed, and the production webpack build passed. Lint reported warnings from pre-existing untracked `.playwright-cli` trace resources.
- `SITE_URL=https://wallet.example npm run build`: **PASS**. This is a placeholder HTTPS origin used for local propagation checks, not the production domain.
- Local `next start` at `SITE_URL=https://wallet.example PORT=3020` verified seven public pages: HTTP 200, unique titles, HTTPS canonicals, descriptions, OG/Twitter metadata and JSON-LD.
- `/does-not-exist` returned HTTP 404 and rendered the branded recovery actions without `NoFallbackError`.
- `robots.txt` exposed the HTTPS host and sitemap; `sitemap.xml` exposed seven HTTPS URLs. Open Graph, Twitter and favicon assets returned valid content types and non-zero bytes.
- Required security headers were present on HTML, a static image and an API response; `X-Powered-By` was absent.
- A synthetic valid Web Vital sent with a wallet-like query parameter produced only an allowlisted aggregate `wallet_web_vital` log event; the query address was absent from the logged data.
- Existing telemetry, persistence and provider-unavailable tests passed alongside the new regression. No live/provider-backed scan was submitted.

## Artifacts

- `not-found-1440.png`
- `not-found-390.png`

## Limits and remaining gates

The actual HTTPS `SITE_URL` still needs to be configured and checked in Vercel Preview/Production. Preview/production headers, logs, retention, monitoring, Redis, WAF and the bounded forced-provider-failure browser flow remain unverified. CSP still uses `'unsafe-inline'` (and development `'unsafe-eval'`); nonce/hash hardening remains a separate tested migration decision. No deployment, push or external provider action was performed. Overall release remains **NO-GO** until the relevant Preview/production gates pass.
