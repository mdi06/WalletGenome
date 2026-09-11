# WalletGenome full audit

**Date:** 5 September 2026  
**Code checked:** `d2d7d48375ecff48167323c805e141088c85946d`

## Result

WalletGenome is in much better shape than it was during the earlier audits. The app builds successfully, the tests found by the normal test command pass, the main pages work at the screen sizes checked, and npm found no known vulnerable packages.

The app is still **not ready for production**. A few bugs can make financial data look safer or more complete than it really is. The app can also repeat provider work, which wastes time and API quota.

The five most important problems are:

1. A wallet transfer to itself can make approval exposure appear to be `$0`.
2. Cluster Scan can show `$0` when price data is missing.
3. CSV exports do not safely handle formulas, commas, quotes, or line breaks.
4. The API reads a large request in full before rejecting it.
5. The flow graph can draw a connection even when there were zero transfers in that direction.

No critical P0 security bug was confirmed. This report contains **6 P1 findings, 8 P2 findings, and 2 P3 findings**.

| Area | Current condition |
| --- | --- |
| Security | Basic protections are present. Request limits, CSV export, rate-limit identity, and telemetry still need work. |
| Data accuracy | Single-wallet reports handle missing data well in most places. Cluster Scan and approval calculations still have important mistakes. |
| Performance | Page sizes are stable. Repeated provider and RPC work is the bigger problem. |
| User experience | The scanner, saved examples, docs, mobile layouts, and 404 page are clear and usable. |
| Accessibility | Useful keyboard and screen-reader support exists in the code. A real screen-reader test is still missing. |
| Maintenance | The app has broad tests, but some files are too large and the normal test command misses one test file. |

## Checks completed

| Check | Result |
| --- | --- |
| Full local verification | Passed: lint, TypeScript, production build, and 364 tests in 62 suites |
| Tests missed by the normal command | 8 more tests passed when run directly |
| Package vulnerability check | 0 known vulnerabilities across 513 packages |
| API error and rejection checks | 11 of 11 passed |
| Responsive page checks | 28 of 28 passed |
| Browser warnings and errors | None found in the final browser check |

Evidence:

- [Full verification log](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-05/verify.log)
- [Extra TSX test result](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-05/tsx-test.log)
- [Package audit](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-05/dependency-audit.json)
- [API checks](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-05/api-smoke.json)
- [Responsive checks](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-05/responsive.json)
- [Bug reproductions](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-05/probes.json)
- [Repeated-scan test](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-05/coalescing-probe.json)
- [Missing-price Cluster Scan test](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-05/cluster-price-probe.json)

Some checks use fixed test data and mocked network calls. They prove the code bugs, but they do not prove how real providers or Vercel will behave. No real wallet scan or deployment was performed.

## Priority guide

- **P1:** Fix before production or before users rely on the affected result.
- **P2:** Fix next because it affects reliability, speed, cost, or maintenance.
- **P3:** Lower-risk cleanup.

## P1 findings

### A01. A transfer to the same wallet can hide approval exposure

**Confirmed bug.**

The app rebuilds token balances from transfer history. When a wallet sends tokens to itself, the code subtracts the tokens but does not add them back. The calculated balance can become zero even though the real balance did not change.

File: [approvals.ts](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/lib/analysis/approvals.ts:33)

Example:

1. The wallet receives 100 tokens.
2. The wallet sends those tokens to itself.
3. The wallet still has an unlimited approval.
4. WalletGenome reports a balance of `0` and exposure of `$0`.

That result is wrong. A self-transfer should not change the balance.

**Fix:** Count incoming and outgoing parts separately, or treat self-transfers as no balance change. Also make sure duplicate transfer records are counted only once.

**Test after fixing:** Cover incoming transfers, outgoing transfers, self-transfers, minting, burning, duplicate events, and a real zero balance.

**Earlier audit:** The approval wording was fixed, but the exposure calculation is still only partly fixed.

### A02. Cluster Scan changes missing prices into `$0`

**Confirmed bug.**

The single-wallet report correctly uses an empty value when it cannot price a transfer. Cluster Scan changes the same missing value to `0`.

Files:

- [batchScanService.ts](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/lib/services/batchScanService.ts:177)
- [BulkDashboard.tsx](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/components/BulkDashboard.tsx:141)

Test result:

- Single-wallet scan: price unavailable, inflow unavailable.
- Cluster Scan: status complete, inflow `$0`.

This makes it impossible to tell the difference between a wallet that received nothing and a wallet that received funds which could not be priced. A partly priced total can also look like a full total.

**Fix:** Allow Cluster Scan money fields to be empty. Keep price coverage and price source details with every wallet and with the cluster total. Sorting and CSV export must understand unavailable values.

**Test after fixing:** Check real zero, fully priced, partly priced, and completely unpriced cases. Missing prices must not remove valid wallet-link evidence.

### A03. CSV export does not safely format names and data

**Confirmed in the code.**

The CSV code joins values with commas. It does not properly handle commas, quotes, line breaks, or spreadsheet formulas inside a value.

File: [BulkDashboard.tsx](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/components/BulkDashboard.tsx:62)

A profile name can come from an outside identity service. A name such as `Smith, John` would break the columns. A name starting with `=` could be treated as a formula by some spreadsheet programs.

The exported file has another problem: saved examples show `N/A` in the app, but the CSV can contain zero values. It also leaves out the data source, date, and coverage warning.

See [OWASP's CSV Injection explanation](https://owasp.org/www-community/attacks/CSV_Injection).

**Fix:** Create one tested CSV builder that quotes values correctly, handles line breaks, makes formula-like text safe, and uses a Blob download. Include the data source, date, and coverage. Keep unavailable values unavailable.

### A04. The API reads a large request before rejecting it

**Confirmed bug.**

The API checks the `Content-Length` header first. If that header is missing or wrong, it reads the whole body and checks the size afterward.

Files:

- [requestPolicy.ts](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/lib/api/requestPolicy.ts:105)
- [Web Vitals route](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/app/api/web-vitals/route.ts)

The test sent a 64 KiB stream to an endpoint with an 8 KiB limit. The app read all 64 KiB before returning `body_too_large`.

This means the limit does not fully protect memory or time spent reading a slow request. Vercel may block some large requests first, but that has not been checked.

**Fix:** Read the stream in small chunks. Stop and cancel it as soon as it passes the limit. Add a short deadline for reading the body.

### A05. The flow graph draws links with zero transfers

**Confirmed in the browser and code.**

The graph shows some outgoing links labelled `$0 · 0 txs`. Those links should not exist because there is no outgoing transfer behind them.

File: [CapitalFlowGraph.tsx](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/components/CapitalFlowGraph.tsx:375)

The default minimum value is zero. The current check accepts `0 >= 0`, even when the transfer count is also zero.

This can suggest a relationship that was not found. It can also use one of the limited graph positions and hide a real connection.

**Fix:** Require at least one transfer in that direction. A real unpriced transfer should still appear, but a direction with no transfers should not.

### A06. Production checks are still incomplete

**Open release requirement. This is not proof of a production bug.**

The local app works, but several checks can only be completed on a real Vercel Preview.

See [AUDIT_DEPLOYMENT_FIX_PLAN.md](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/AUDIT_DEPLOYMENT_FIX_PLAN.md:674).

Still needed:

- Confirm the real Vercel settings and environment variables.
- Test provider failures and timeouts.
- Confirm that disconnecting the browser stops work.
- Test Redis caching and quotas across more than one server process.
- Confirm which forwarding headers Vercel trusts.
- Test the main flow with a real screen reader.
- Run cold mobile and desktop performance tests.
- Confirm production URLs and metadata.
- Record the rollback deployment and responsible operator.
- Get final approval before production promotion.

**Release decision: NO-GO until these checks and A01–A05 are handled.**

## P2 findings

### A07. Identical API scans do the same provider work twice

**Confirmed bug.**

The app has code that should combine identical scans that start at the same time. The public API supplies a cancellation signal, and the combining code is disabled whenever that signal exists.

File: [scanService.ts](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/lib/services/scanService.ts:624)

Test result:

- Two identical scans without cancellation signals: 3 explorer calls.
- Two identical scans shaped like public API requests: 6 explorer calls.

This wastes provider quota and can make scans slower.

**Fix:** Let several requests share one scan while keeping their cancellation separate. If one user leaves, the other user should still get the result. Stop the shared work when nobody is waiting.

### A08. A cached report still waits for new RPC checks

**Confirmed in the code.**

The app checks the wallet type on every selected network before it looks for a cached report.

Files:

- [scanService.ts](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/lib/services/scanService.ts:588)
- [rpc.ts](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/lib/rpc.ts)

A cached four-network report can still make at least two RPC calls for every network. RPC retries can delay a result that is already in the cache.

**Fix:** Check the report cache earlier. Store the wallet classification with a clear short lifetime, or cache the RPC checks separately.

### A09. The local rate-limit map can keep growing

**Confirmed in the code. Whether users can fake the header on Vercel is not known.**

The local request log uses a Map with no overall size limit. Old users are removed only if the same identity sends another request.

File: [requestPolicy.ts](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/lib/api/requestPolicy.ts:64)

It also trusts `x-forwarded-for`, followed by `x-real-ip`. The test created 24 separate rate-limit groups by changing that header. This does not prove the same trick works through Vercel.

**Fix:** Use a size-limited cache with expiry. Confirm which headers are trustworthy on Vercel. Reject invalid or very long identity values.

### A10. Cache size is limited by item count, not memory use

**Confirmed design risk. A memory crash was not reproduced.**

The app can hold 500 reports and 2,000 shared-cache items in memory. A report or history dataset can be large. Expired data is normally removed only when that key is read again.

File: [cache.ts](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/lib/cache.ts)

The largest saved report is about 2.25 MB as JSON. Live JavaScript objects can use more memory than the JSON file.

**Fix:** Limit the cache by total estimated bytes and maximum item size. Record cache size, evictions, hit rate, memory use, and Redis response time.

### A11. The normal test command misses eight tests

**Confirmed.**

The command in `package.json` finds `.test.ts` files but misses [CapitalFlowGraph.test.tsx](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/components/CapitalFlowGraph.test.tsx), which contains eight tests.

The missed tests pass when run directly. The problem is test discovery, not failing tests.

**Fix:** Include both `.test.ts` and `.test.tsx`. Add a check that compares tracked test files with the files found by the test command.

The current total should become at least **372 passing tests** before adding new tests from this audit.

### A12. Tokens with zero decimals are treated as 18-decimal tokens

**Confirmed bug.**

File: [approvals.ts](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/lib/analysis/approvals.ts:22)

The code uses `value || 18`. Since JavaScript treats zero as false, a valid decimal value of `0` becomes `18`.

Test result: a raw balance of `100` with zero decimals became `0.0000000000000001` instead of `100`.

**Fix:** Check that decimals are a valid whole number and keep zero as zero. Use one shared token-unit conversion function.

### A13. Batch Scan accepts ENS names and then rejects them

**Confirmed bug.**

The API validator accepts a name such as `vitalik.eth`. Batch Scan then tries to classify that text as a wallet address before resolving it. The result is an `unsupported_target` error.

Files:

- [requestPolicy.ts](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/lib/api/requestPolicy.ts)
- [batchScanService.ts](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/lib/services/batchScanService.ts)

The Cluster Scan screen asks for addresses only, so this does not break its normal browser flow. It does make the API rules inconsistent.

**Fix:** Either reject ENS names in the batch API, or resolve them before classification. If names are supported, remove duplicates after resolution.

### A14. Anyone can send fake Web Vitals events

**Confirmed in the code. The endpoint was not flooded during this audit.**

The Web Vitals endpoint checks the shape of an event, but it does not limit requests or block repeated events. The 10% sampling happens in the browser, so another client can ignore it.

File: [Web Vitals route](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/app/api/web-vitals/route.ts)

Fake or repeated events could make the performance data unreliable and create extra logs.

**Fix:** Add a server-side request limit, check the expected origin where useful, reject unexpected app versions, and handle duplicate metric updates. Calculate the rating on the server instead of trusting the submitted rating.

## P3 findings

### A15. Scores depend on the current time without recording that time

**Confirmed in the code.**

Some risk and behaviour calculations call `Date.now()` directly.

Files:

- [riskScore.ts](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/lib/analysis/riskScore.ts:69)
- [mediaScoring.ts](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/lib/sybil/mediaScoring.ts:111)
- [behavioralFingerprint.ts](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/lib/analysis/behavioralFingerprint.ts)

The same saved data can produce a different score on another day without the report clearly showing why.

**Fix:** Pass one `analysisTime` into all calculations and save it in the result.

### A16. Some code and release documents are too large or repeated

| File | Lines |
| --- | ---: |
| `etherscan.ts` | 1,239 |
| `CapitalFlowGraph.tsx` | 1,072 |
| `ClusterFlowGraph.tsx` | 945 |
| `scanService.ts` | 658 |
| Docs page | 1,349 |

Large files are not automatically slow. The problem is that networking, data cleanup, layout, and user interaction are mixed together. This makes changes harder to understand and test.

The docs also say identical scans are combined, but that is not true for public API requests because of A07. One earlier audit note says Cluster Scan does not cache history, while the current code does.

**Refactor:**

- Split provider requests, pagination, cleanup, and fallback logic.
- Split graph data selection, layout, and controls.
- Keep static docs content separate from the small interactive search controls.
- Keep one current release-status page and preserve older reports as dated history.

## Were the old audit problems fixed?

“Fixed locally” means the code and local checks pass. It does not mean the fix has been tested on Vercel or in production.

### Original crucial-fixes audit

| Previous item | Current status |
| --- | --- |
| Public known-wallet writes | **Fixed locally.** POST now returns 405. |
| Do not hide provider failures | **Partly fixed.** Single-wallet reporting is clear, but Cluster Scan still loses missing-price status. |
| Historical price accuracy | **Partly fixed.** Single-wallet price sources are clear; Cluster Scan changes missing values to zero. |
| API abuse protection | **Partly fixed.** Validation, limits, quotas, and cancellation exist. A04 and A09 remain. |
| One reporting contract | **Partly fixed.** Cluster Scan and CSV export do not fully follow it. |
| Protocol, network, gas, and explorer reporting | **Improved locally.** No real provider comparison was done in this audit. |
| Approval exposure | **Partly fixed.** A01 and A12 still affect the estimate. |
| Real cluster links | **Implemented locally.** No fresh live Cluster Scan was run. |
| Risk and Sybil wording | **Fixed locally.** Blacklist matches and the local behaviour score are separate. |
| Cross-network activity totals | **Fixed for the tested cases.** No independent live-data comparison was done. |
| Data storage decision | **Implemented locally.** The app is stateless. Real Redis behaviour is still untested. |
| Split large code | **Partly fixed.** A16 remains. |
| Mobile layout | **Improved locally.** All 28 page and width checks passed. |
| Accessibility | **Partly fixed.** Code checks pass; a real screen-reader test is missing. |
| Important regression tests | **Partly fixed.** This audit found new gaps and one missed test file. |
| Reliable verification command | **Partly fixed.** Build checks pass, but A11 remains. |
| Shared cache and repeated scans | **Partly fixed.** Public API requests still repeat work. |

### 28 August product audit

| Finding | Current status |
| --- | --- |
| Approval rows called distinct spenders | **Fixed locally.** The UI now says “High-risk approvals” and explains that rows are not unique spenders. |
| Claims were too confident | **Fixed for the old wording.** New calculation bugs are listed above. |
| Graph nodes overlapped | **Improved.** The lanes are separated; A05 is a separate data problem. |
| Low contrast and missing labels | **Old fixes remain.** A full new contrast check was not done. |
| Filters, tabs, and graph accessibility | **Improved locally.** Real screen-reader testing remains open. |
| Timed-out work continued | **Cancellation now reaches the provider code.** Real Vercel cancellation still needs testing. |
| No useful performance collection | **Partly fixed.** The collector works locally, but there is not enough real traffic for useful results. |
| Demo and visual-effect performance | **Partly checked.** Bundle growth is small; low-end-device cost is unknown. |
| Docs search delayed the answer | **Fixed in the browser check.** Searching for “risk” reaches the right section. |
| Cluster example had dishonest empty states | **Fixed locally.** CSV export still loses that meaning. |
| Production SEO | **Implemented locally.** The real production domain still needs checking. |
| Generic 404 page | **Fixed locally.** It returns 404 and gives clear recovery links. |
| Too much visual competition | **Improved locally.** |

### 2 September follow-up audit

| Finding | Current status |
| --- | --- |
| Saved cluster claimed no hubs were found | **Fixed locally.** It now says hub evidence is not included. |
| Release status and screen-reader claims conflicted | **Fixed for the listed statements.** Some old cache wording remains. |
| Browser trace files caused lint warnings | **Fixed.** Lint passes without those warnings. |
| Docs promised provider reliability | **Fixed.** The wording now says fallbacks reduce provider problems. |

R01–R06 and R08–R11 have real local fixes. R07 is still partly complete. R12, the Preview and production check, is still open.

## Performance review

The page bundle has barely changed since 2 September. Reducing a few bytes of JavaScript should not be the first performance task.

| Item | 2 Sep | 5 Sep | Change |
| --- | ---: | ---: | ---: |
| Scanner JavaScript, gzip | 201,507 B | 201,552 B | +0.02% |
| Docs JavaScript, gzip | 199,899 B | 200,036 B | +0.07% |
| Topic-page JavaScript, gzip | 183,423 B | 183,423 B | No change |
| Shared CSS, gzip | 11,624 B | 11,647 B | +0.20% |
| Scanner HTML, gzip | 10,300 B | 10,622 B | +3.13% |
| Docs HTML, gzip | 19,476 B | 19,879 B | +2.07% |
| Fonts | 88,912 B | 88,912 B | No change |
| Largest saved report JSON | 2,247,790 B | 2,247,790 B | No change |

Sources: [current measurements](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-05/metrics.json) and [2 September measurements](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/metrics.json).

These file sizes do not show how long the page takes to become usable on a real phone. The local Web Vitals events only prove that collection works. They are not enough for a reliable performance score.

### Best order for performance work

1. Fix A01–A05 so the app stays accurate while it is optimized.
2. Stop reading oversized requests in full.
3. Make identical API scans share provider work.
4. Return cached reports before unnecessary RPC checks.
5. Limit caches and rate-limit state by memory and age.
6. Measure each scan step and give it a clear time limit.
7. Separate wallet-link data from optional identity, pricing, and scoring work.
8. Measure the 2.25 MB saved report on a slower phone. Split it only if the measurement shows a real problem.
9. Split the largest files so each part has one clear job.

Keep the current lazy-loaded dashboard tabs, lazy-loaded charts, reduced-motion support, and frame-limited graph updates.

Downloading only part of a wallet's history may be faster, but the result cannot be called complete unless the app proves all required history was checked.

## Browser review

### 1. Scanner page — good

The supported networks, wallet field, scan modes, and saved examples are clear. No page-wide overflow was found at the tested sizes. No live scan was submitted.

![Scanner page](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-05/01-scanner.png)

### 2. Saved wallet result — good with limits

The page says this is a saved, non-live result and that its history is partial. It keeps the unavailable behaviour score separate from the blacklist match.

![Saved wallet result](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-05/02-saved-dashboard.png)

### 3. Flow graph — needs a fix

The separated columns are easier to read. Some links still show zero transfers, which is the A05 bug.

![Flow graph](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-05/03-flow.png)

### 4. Approval page — wording is clear

The page clearly separates observed approvals, high-risk approval rows, unlimited approvals, and unavailable exposure. A01 and A12 were found with special test cases and are not visible in this screenshot.

![Approval page](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-05/04-approvals.png)

### 5. Saved Cluster Scan on mobile — good

The page says connection and hub evidence is not included. It does not claim the wallets were checked and found to be independent.

![Saved Cluster Scan on mobile](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-05/05-mobile-cluster.png)

### 6. Documentation search on mobile — good

Searching for “risk” reaches the risk section. Wide technical tables scroll inside their own area.

![Documentation search](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-05/06-mobile-docs.png)

### 7. Missing page — good

The route returns a real 404 and gives clear links back to the scanner and docs.

![404 page](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-05/07-not-found.png)

## Other security notes

- The app sends a Content Security Policy, frame blocking, content-type protection, referrer rules, and a permissions policy. It also hides the `X-Powered-By` header.
- The production policy still allows inline scripts. This weakens the policy, but this audit did not find a working cross-site scripting attack.
- JSON-LD escapes `<` before placing data in the page.
- Identity links are limited to HTTP and HTTPS.
- The API rejects provider keys sent by the browser.
- Normal error logs use short codes and counts instead of full wallet reports.
- No runtime file-writing path was found in the areas checked.
- A full scan of Git history for old secrets was not part of this audit.
- `npm audit` checks known package reports. It cannot prove that every package or application path is safe.

## What this audit did not prove

This was a broad local review. It was not a penetration test, a full token-model study, a WCAG certification, or a production load test.

Still unchecked:

- real provider-backed wallet scans;
- comparison with independent blockchain data;
- Vercel request and timeout behaviour;
- Vercel firewall and header settings;
- Redis across several server processes;
- production SEO and security headers;
- Safari and Firefox;
- slower physical phones;
- screen readers and the full keyboard flow;
- real-user LCP, INP, and CLS results;
- memory and CPU use under real traffic; and
- opening a corrected CSV in the spreadsheet programs users will use.

Passing local tests does not replace those checks.

## Commands used

The audit scripts use fixed test data or mocked network calls where stated. `measure.mjs` and `api-smoke.mjs` need the local production server on port 3015. They do not submit a valid wallet scan.

```sh
npm run verify
npm audit --json
node --import tsx --test src/components/CapitalFlowGraph.test.tsx
node --import tsx output/full-audit-2026-09-05/probes.ts
node --import tsx output/full-audit-2026-09-05/coalescing-probe.ts
node --import tsx output/full-audit-2026-09-05/cluster-price-probe.ts
node output/full-audit-2026-09-05/measure.mjs
node output/full-audit-2026-09-05/api-smoke.mjs
```

The file links and line numbers match the code checked on 5 September 2026. Check them again after code changes. This report proposes fixes; it does not change how the app works.
