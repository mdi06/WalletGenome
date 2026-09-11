# Audit fix status

**Date:** 6 September 2026  
**Based on:** `FULL_AUDIT_2026-09-05.md`

## Current result

All confirmed P1 and P2 code bugs from the audit are fixed in the local checkout. The P3 time-dependent scoring bug is also fixed.

The app is still not cleared for production. A06 contains checks that need a real Vercel Preview, live provider accounts, Redis, real devices, and a named person who can roll back a release. Local tests cannot prove those points.

The large-file cleanup in A16 has started, but it is not finished. This is maintenance work rather than a known data or security bug.

## P1

| ID | Status | What changed |
| --- | --- | --- |
| A01 | Fixed locally | Self-transfers no longer reduce the rebuilt token balance. Duplicate transfer logs are counted once. Tests cover a real zero balance and an unpriced positive balance. |
| A02 | Fixed locally | Cluster inflow, outflow, and gas values can be unavailable. Price coverage is kept with each wallet and the cluster total. Missing gas prices no longer appear as `$0`. Partial totals are labelled. Sorting and CSV export handle unavailable values. |
| A03 | Fixed locally | CSV output now quotes every cell, escapes quotes and line breaks, blocks formula-like text, preserves unavailable values, adds report time and price coverage, and downloads through a Blob. |
| A04 | Fixed locally | Request bodies are read in chunks. Reading stops and the stream is cancelled when the byte limit or five-second read deadline is reached. |
| A05 | Fixed locally | The flow graph requires at least one transfer before drawing a directional link. A real transfer can still appear when its USD value is zero or unavailable. |
| A06 | Needs Preview evidence | The code has local safeguards, but Vercel settings, trusted proxy headers, provider failures, Redis across instances, disconnect behavior, real screen-reader use, cold-device performance, production metadata, and rollback ownership still need to be checked on a deployed Preview. |

## P2

| ID | Status | What changed |
| --- | --- | --- |
| A07 | Fixed locally | Identical scans now share one provider operation even when callers have cancellation signals. One caller can leave without cancelling work needed by another caller. Shared work stops when no callers remain. |
| A08 | Fixed locally | The report cache is checked before wallet-type RPC calls. A valid cached report returns without repeating account classification. |
| A09 | Fixed locally, Preview check remains | The local rate-limit map now removes expired entries, has a maximum size, and rejects invalid or overlong identity headers. Which forwarding header Vercel treats as trusted still belongs to A06. |
| A10 | Fixed locally | In-memory caches now have total byte limits and per-item byte limits. Expired entries are removed and cache statistics include bytes, hits, misses, and evictions. Redis request counts, failures, and average response time are recorded. |
| A11 | Fixed locally | The normal test command includes `.test.ts` and `.test.tsx`. A discovery check fails when a tracked test file is outside the configured patterns. |
| A12 | Fixed locally | Zero-decimal tokens keep zero decimals. Token unit conversion is shared instead of using the old false-value fallback. |
| A13 | Fixed locally | Batch Scan now rejects ENS names during validation with a clear address-only message. It no longer accepts a name and fails later during account classification. |
| A14 | Fixed locally | Web Vitals now has a server-side request limit, same-origin check, app-version check, bounded duplicate filter, and server-calculated rating. |

## P3

| ID | Status | What changed |
| --- | --- | --- |
| A15 | Fixed locally | One `analysisTime` is passed through the scan and saved as `scannedAt`. Risk, behaviour, and Sybil age calculations use that same time. |
| A16 | Partly complete | CSV building and token unit conversion were moved into focused modules. The largest provider, graph, and docs files are still large. Split them only in small reviewed changes; moving code by itself will not improve runtime speed. |

## Performance changes included

- Repeated scans share provider work.
- Cached reports avoid unnecessary RPC calls.
- Memory caches have byte limits and reject oversized entries.
- Redis timing and failure counters are available for monitoring.
- Price lookups use chain and contract identity and have a scan-level time budget.
- Existing lazy-loaded dashboard sections, reduced-motion handling, and frame-limited graph movement remain in place.

The main remaining performance work is measurement on a deployed Preview: cold mobile and desktop runs, real provider latency, Redis across instances, memory use under load, and step-by-step scan timing.

## Local verification

The final verification command checks lint, generated route types, TypeScript, all test files, test discovery, and the production build.

Latest result on 7 September 2026: **404 tests passed in 64 suites, with 0 failures.** Lint, TypeScript, test discovery, and the production build also passed. The whitespace check passed separately.

```sh
npm run verify
git diff --check
```

The original bug reproduction scripts now stop on their old assertions because the returned values changed to the fixed values:

- self-transfer exposure is `100`, not `0`;
- two cancellable identical scans make `3` provider calls, not `6`;
- an unpriced cluster inflow is `null`, not `0`.

## Release decision

**NO-GO for production until A06 is completed on Vercel Preview and the results are recorded.**

This does not block local review of the code fixes. A16 can continue after the release-critical checks unless a smaller refactor is needed to fix a measured problem.

## 7 September screenshot follow-up

A live result showed hundreds of repeated `DefiLlama historical prices returned HTTP 414` lines.

- Historical DefiLlama batches now stop before the encoded request URL reaches 6,000 characters. This prevents the oversized request shown in the screenshot.
- A temporary provider failure no longer marks every affected contract as unsupported. Only a successful response that omits the exact contract, or an explicit 404, can create the short unsupported-token cache entry.
- The resolution cache key moved to version 3. This stops old entries created by the broken rule from causing later scans to skip valid contracts.
- The configured CoinGecko key was tested without printing it. CoinGecko rejected it on both Demo and Pro endpoints with HTTP 401, while the keyless endpoint returned HTTP 200.
- When CoinGecko rejects a Demo key, the app now retries the same request through its keyless endpoint. Explicit paid plans still use the Pro endpoint and report invalid paid credentials.
- A refreshed scan of the wallet from the screenshot returned no HTTP 414, authentication, timeout, rate-limit, provider, or pricing-budget errors on Ethereum, Base, Arbitrum, or Optimism. CoinGecko recovered 11 Arbitrum historical price groups that were missing in the screenshot.
- Prices remain partial for contracts that the providers do not list. Those values stay explicitly unpriced and are excluded from verified USD totals; the app does not guess from a token symbol or turn a missing quote into `$0`.
- The provider details panel also groups repeated messages, but that is only a readability change. The fixes above address the failed requests and incorrect cache behavior that produced the errors.
- The full local verification passed after the root fixes: 404 tests, lint, TypeScript, test discovery, and the production build.
