# Performance measurement and budgets

Status: implementation complete locally; Preview and field evidence pending.  
Performance gate owner: release operator.  
Waiver authority: product owner.

This policy separates reproducible lab measurements from real-user field data.
Local builds, asset sizes, and browser traces do not prove Preview or production
performance.

## Release budgets

| Metric | Preview lab gate | Production field gate |
| --- | --- | --- |
| Largest Contentful Paint (LCP) | Median of three cold mobile runs and three cold desktop runs ≤ 2.5s; record every run | p75 ≤ 2.5s, reported separately for mobile and desktop |
| Interaction to Next Paint (INP) | Not certified by a load-only Lighthouse run; profile the key interactions in a trace | p75 ≤ 200ms, reported separately for mobile and desktop |
| Cumulative Layout Shift (CLS) | Median of three cold mobile runs and three cold desktop runs ≤ 0.1; record every run | p75 ≤ 0.1, reported separately for mobile and desktop |
| Main thread | No severe blocking or long task may remain unexplained; assign an owner for every accepted exception | Alert on regressions and unexplained long tasks |
| Scanner initial JS | No more than 5% above the verified candidate baseline without a recorded reason and product-owner approval | Track each release against the last verified candidate |
| CSS and font assets | No more than 5% above the verified candidate baseline without a recorded reason and product-owner approval | Track each release against the last verified candidate |
| Saved Vitalik snapshot | No larger than the verified candidate baseline without a recorded reason and product-owner approval | Track each release against the last verified candidate |

Mobile and desktop results must not be combined. The best run is not the
reported result. A budget failure blocks promotion until the performance gate
owner records a fix or the product owner records a waiver and reason.

## Lab procedure

Run the following against one immutable Preview deployment and record the
candidate SHA, Preview URL, browser version, Lighthouse version, device profile,
viewport, throttling, and date:

1. Run `npm run verify` and `git diff --check` for the exact candidate.
2. Open the landing page in a fresh browser context with no provider-backed scan.
3. Capture three cold mobile Lighthouse runs at the agreed mobile profile and
   three cold desktop runs at the agreed desktop profile. Keep all six reports;
   calculate the median independently for mobile and desktop.
4. Inspect the performance trace for the landing page, saved Vitalik snapshot,
   first dashboard render, heavy-tab opening, graph interaction, and reduced
   motion. Record any long task and its explanation or owner.
5. Compare the built initial assets and `public/demo-wallets/vitalik-*.json`
   against the verified candidate baseline. Use raw and gzip byte counts and
   retain the measurement output with the candidate.

The local equivalent may use `next start` and the saved snapshot, but must be
labelled local evidence. The machine-readable local run record is
`output/playwright/r07-2026-09-01/metrics.json`. It cannot close the Preview gate, certify field INP,
or establish real-device energy, thermal, Safari, or assistive-technology
behavior.

## Verified candidate baseline

The R00 baseline was generated on 2026-08-31 from a local production build at
`5e7089c4fdc9b8969d07ef7822c43c28d56e4221`. It is an asset and serial warm-route
baseline, not a browser paint measurement:

| Asset group | Baseline |
| --- | ---: |
| Scanner initial JavaScript | 651,772 raw bytes / 199,142 gzip bytes |
| Scanner initial CSS | 59,222 raw bytes / 11,500 gzip bytes |
| Scanner initial fonts | 88,912 raw bytes / 88,953 gzip bytes |
| `public/demo-wallets/vitalik-2026-08-26.json` | 2,247,790 raw bytes / 358,017 gzip bytes |

The source measurement artifact is
`output/full-audit-2026-08-28/measure.mjs`, with its recorded output in
`output/full-audit-2026-08-28/metrics.json`. A new candidate must regenerate
the asset measurements rather than assuming these values still hold.

## Privacy-safe field telemetry

The client reports a sampled subset of Web Vitals to the same-origin
`POST /api/web-vitals` endpoint. The endpoint emits one allowlisted structured
`wallet_web_vital` event to the approved Vercel Observability destination. The
application does not store these events in a database or write them to a
wallet/report cache.

Each event contains only:

- `routeTemplate`: `/`, `/docs`, `/[slug]`, or `/other`; query strings are never sent.
- `deviceCategory`: coarse `mobile` or `desktop`, based on the viewport media query.
- `metricName`: `TTFB`, `FCP`, `LCP`, `FID`, `INP`, or `CLS`.
- `value` and `rating`: the numeric metric value and `good`, `needs-improvement`, or `poor` rating.
- `appVersion`: the public application version.
- `eventId`: the opaque metric identifier used for downstream deduplication.

The client sample rate is 10%. No wallet address, ENS name, query string, full
URL, provider credential, raw scan result, user-entered text, or performance
entry list is accepted by the endpoint. Invalid or oversized payloads are
rejected without logging their contents. Telemetry failures are ignored by the
client and cannot block scans or navigation.

Retention and access policy:

- Retain performance events for no longer than 30 days in the configured
  Vercel Observability environment; verify the actual project setting before
  Preview approval because provider-plan retention can differ.
- Limit access to the release operator and explicitly assigned observability
  operators. Do not export events into the application data store.
- Delete or expire events through the configured Vercel Observability retention
  control at or before 30 days. Record the setting and deletion/expiry check in
  the release evidence; the application intentionally has no telemetry-delete
  API.
- Review telemetry separately from scan logs. Scan logs remain aggregate and
  must not be joined to wallet targets.

Field LCP, INP, and CLS are not certified until enough Preview/production
traffic exists to calculate mobile and desktop percentiles from this
privacy-safe event stream.
