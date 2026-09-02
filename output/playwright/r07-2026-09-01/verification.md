# R07 performance measurement evidence

Date: 2026-09-01  
Candidate: working tree based on `architecture-validation` at
`5e7089c4fdc9b8969d07ef7822c43c28d56e4221`  
Environment: local `next start` production build on Node `v22.22.3`; no
provider-backed scan; HeadlessChrome `152.0.0.0` on macOS.

## Privacy-safe telemetry

- `POST /api/web-vitals` returned `204` with `Cache-Control: no-store` from a
  real browser request.
- The captured server event was `wallet_web_vital` with only the allowlisted
  fields: `eventId`, `routeTemplate`, `deviceCategory`, `metricName`, `value`,
  `rating`, `appVersion`, plus the server timestamp and event name.
- The event contained no wallet address, query string, URL, provider credential,
  performance-entry list, or scan result.
- Local browser console errors: `0` during the checked run.

## Local browser observations

These are unthrottled local browser observations, not Lighthouse reports or
Preview/field certification. Each run opened a fresh Playwright browser session,
set the viewport before navigation, loaded the local production build, and read
the browser Performance APIs after load. LCP and FCP are milliseconds; CLS is a
unitless score.

| Profile | Run | Viewport | LCP | FCP | CLS | Long tasks observed | Navigation timing |
| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| Mobile viewport | 1 | 390×844 | 240ms | 240ms | 0 | none | 45.4ms |
| Mobile viewport | 2 | 390×844 | 304ms | 304ms | 0 | none | 77.5ms |
| Mobile viewport | 3 | 390×844 | 88ms | 88ms | 0 | none | 47.2ms |
| Desktop viewport | 1 | 1440×900 | 76ms | 76ms | 0 | none | 45.6ms |
| Desktop viewport | 2 | 1440×900 | 80ms | 80ms | 0 | none | 39.4ms |
| Desktop viewport | 3 | 1440×900 | 264ms | 264ms | 0 | none | 62.8ms |

Observed medians are 240ms LCP / 0 CLS for the mobile viewport and 80ms LCP
/ 0 CLS for the desktop viewport. These values are not throttled, not from
physical mobile hardware, and not sufficient to close the Preview Lighthouse
gate. INP was not certified from these load-only observations.

The local Playwright trace was saved at
`.playwright-cli/traces/trace-1788270145504.trace` for the initial production
smoke. The trace is supplementary evidence; it does not replace a Preview
Lighthouse report.

## Asset comparison against R00

The existing reproducible measurement script was rerun against the same local
production server. Its output is in
`output/full-audit-2026-08-28/metrics.json`.

| Asset group | R00 baseline | R07 local candidate | Change |
| --- | ---: | ---: | ---: |
| Scanner initial JavaScript gzip | 199,142 bytes | 199,897 bytes | +0.38% |
| Scanner initial CSS gzip | 11,500 bytes | 11,509 bytes | +0.08% |
| Scanner initial fonts gzip | 88,953 bytes | 88,953 bytes | 0.00% |
| Vitalik snapshot gzip | 358,017 bytes | 358,017 bytes | 0.00% |

The local candidate stays within the 5% asset budgets. The asset measurement is
not a field performance result.

## Remaining R07 gates

- No immutable Vercel Preview was deployed in this task.
- No Lighthouse CLI was present in the repository; the browser observations
  above are a reproducible local substitute and are labelled accordingly.
- Vercel Observability retention/access settings, deletion/expiry evidence,
  alerts, and production p75 LCP/INP/CLS remain to be configured and verified
  by the release operator in Preview/Production.
