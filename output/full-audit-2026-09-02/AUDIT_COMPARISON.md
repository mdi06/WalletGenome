# WalletGenome — full local product, UX, performance and release audit

Date: 2 September 2026. Comparison baseline: [28 August 2026 audit](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-08-28/AUDIT.md). Scope: the current working tree, a fresh production build, and a local production preview on port 3011. No application code was changed, no provider-backed scan was submitted, and nothing was deployed.

## Verdict

The app is **substantially better than the previous audit candidate**. Nine of the thirteen original findings are locally resolved, and the remaining four have meaningful progress but still depend on Preview, real-device, field-performance, or production evidence. Reporting language, flow-graph readability, accessibility semantics, documentation navigation, cluster demo coverage, recovery UX, and visual hierarchy all improved.

The deployment verdict remains **NO-GO**, not because the local UI is broadly broken, but because the required Vercel Preview and operational gates have not been performed. One new user-facing trust defect was found in the saved cluster example. Two release-process defects were also found: generated trace files pollute lint with 1,549 warnings, and the release records contain stale or contradictory status claims.

This is a comprehensive local audit, not a WCAG certification, penetration test, model-accuracy validation, production load test, or field-performance certification. No invented overall score is assigned.

## What changed since 28 August

| Previous finding | Current status | Fresh evidence |
| --- | --- | --- |
| F01 incorrect “high-risk spenders” count | **Resolved locally** | Approval summary now says **High-risk approvals** and explains that rows are not unique spenders. |
| F02 overconfident hero and “active permissions” copy | **Resolved locally** | Hero is bounded to observable activity and four named networks; approvals use observed-history language. |
| F03 capital-flow node overlap | **Resolved in saved fixture** | The 23-node graph uses separated inflow, core/protocol and outflow lanes with no visible node intersections. |
| F04 low-contrast essential text | **Resolved locally** | Visible field label added; `#4b5563` gives about **6.93:1** on the field and **7.56:1** on white; gas provenance is 12px. |
| F05 inaccessible filter/tab/graph interactions | **Resolved locally** | Pressed states, stable tab panels, full-address target and equivalent accessible graph controls are present. A real screen-reader smoke is still a release gate. |
| F06 timeout did not cancel work | **Resolved in source/tests** | Request-scoped abort signals now propagate through scan routes and timeout work. Real provider/runtime termination remains unproved. |
| F07 no usable field-performance collection | **Partially resolved** | Privacy-bounded 10% Web Vitals telemetry exists and emitted local metrics. Preview Lighthouse and production p75 evidence do not exist yet. |
| F08 demo/effect performance budget | **Within local budget; field work open** | Largest demo unchanged; initial JS/CSS increases remain under the 5% budget. No low-end-device CPU/battery/long-task proof. |
| F09 docs filter delayed the answer | **Resolved locally** | Topics now precede the full contract; filtering “risk” moves directly to matching risk content. |
| F10 cluster lacked provider-free result parity | **Mostly resolved; new wording defect** | A dated saved cluster result exists and labels unmodelled metrics. One empty-hub message still claims a detection result without evidence (N01). |
| F11 production-domain SEO readiness | **Local implementation resolved; Preview open** | Seven routes have distinct titles/descriptions/canonicals/JSON-LD. Local canonicals correctly fall back to `localhost`; actual HTTPS Preview metadata is unverified. |
| F12 generic 404 | **Resolved locally** | Branded recovery page provides immediate scanner and methodology actions. |
| F13 overly heavy hierarchy/cards | **Improved locally** | Shared demo caveat, shorter card copy and restrained shadows improve scanning. Current R11 edits remain uncommitted and still require product-owner approval. |

Summary: **9 resolved locally, 4 partially resolved/open, 0 unchanged.** “Resolved locally” is deliberately not the same as deployed and verified.

## Fresh measured scorecard

| Area | 28 Aug | 2 Sep | Interpretation |
| --- | ---: | ---: | --- |
| Tests | 284/284 | **324/324** | 40 additional passing tests; 0 failed/skipped/cancelled in the current run |
| Test suites | Not reported | **58 suites / 109 top-level tests** | Node reports 324 individual tests |
| TypeScript and production build | Pass | **Pass** | Fresh `npm run verify` |
| Lint source errors/warnings | Pass | **0 / 0 in source** | But generated traces create 1,549 irrelevant warnings; see N02 |
| Dependency audit | 0 vulnerabilities | **0 vulnerabilities** | 513 total locked dependencies reported by the registry audit |
| Scanner JS gzip | 199,142 B | **201,507 B** | +2,365 B / **+1.19%**, within the 5% budget |
| Docs JS gzip | 197,579 B | **199,899 B** | +2,320 B / **+1.17%** |
| Topic JS gzip | 181,837 B | **183,423 B** | +1,586 B / **+0.87%** |
| Shared CSS gzip | 11,500 B | **11,624 B** | +124 B / **+1.08%** |
| Initial WOFF2 assets | 88,912 B | **88,912 B** | Unchanged raw compressed-font size |
| Scanner HTML gzip | 10,168 B | **10,300 B** | +132 B / **+1.30%** |
| Docs HTML gzip | 18,725 B | **19,476 B** | +751 B / **+4.01%**, still below the 5% route-asset review threshold |
| Largest saved demo | 358,017 B gzip | **358,017 B gzip** | Unchanged Vitalik snapshot; 2,247,790 B decoded JSON |
| Responsive public-route checks | No overflow in tested widths | **28/28 pass** | Seven routes at 320, 390, 768 and 1440px; no page overflow, duplicate IDs or unnamed controls |
| Browser warnings/errors in final route sweep | Not reported | **0** | Current local tab log after route sweep |
| Local security headers | Present | **Present** | CSP, frame denial, nosniff, COOP, referrer and permissions policy; no `X-Powered-By` observed |

The asset figures are gzip estimates from generated HTML references, not browser download waterfalls or execution costs. Shared files are cached between routes. The small local response-time samples remained in the low single-digit milliseconds but were noisier than the previous run; same-machine warm responses are not a meaningful internet-speed comparison.

Raw evidence: [metrics.json](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/metrics.json), [responsive.json](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/responsive.json), [route metadata](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/route-metadata.json), [browser warnings](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/browser-warnings.json), and [measurement script](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/measure.mjs).

## Performance assessment

### What is now measurable

The previous audit found console-only Web Vitals. The current app sends a privacy-bounded 10% sample to the same-origin `/api/web-vitals` route. The payload allowlist contains route template, device category, metric name/value/rating, app version and an opaque event ID—not a wallet address, ENS name, query string, provider response or raw scan result.

During this local audit the collector emitted real browser observations, including warm local LCP samples between **76–188ms**, FCP samples between **80–204ms**, CLS samples between **0–0.0262**, and TTFB samples between **6.4–59.9ms**. These values show that the pipeline works; they do **not** certify performance because the run was unthrottled, warm, local, randomly sampled and too small for a percentile. No INP sample was obtained.

### What is still missing

| Metric | Current evidence gap |
| --- | --- |
| Lighthouse performance/accessibility/SEO | No immutable Preview run; no score assigned |
| Preview lab LCP/CLS | Three cold mobile and three cold desktop runs are still required |
| Production p75 LCP/INP/CLS | Requires enough real traffic, split by mobile and desktop |
| INP and key interaction latency | No representative field sample or controlled interaction profile |
| TBT/long tasks, CPU, heap, FPS, battery | No representative performance trace or low-end device |
| Saved-demo parse/render cost | Payload measured, but parse/main-thread cost not profiled here |
| Live scan p50/p95/p99 and provider error rate | No provider-backed or load tests were authorized |
| Function duration/memory | Not measured in the selected Vercel runtime |
| Cache hit rate and deployment-wide quota | No deployed Redis/WAF/observability evidence |
| Availability/SLO/alerts | Not configured or verified in production |

Keep the existing acceptance policy: Preview lab LCP ≤2.5s and CLS ≤0.1, then production p75 LCP ≤2.5s, INP ≤200ms and CLS ≤0.1 by device class. A Lighthouse page load cannot certify INP.

## Prioritized current findings

Priority: P1 blocks public reliance on the affected feature or release record; P2 is the next quality batch; P3 is polish. No P0 outage or critical vulnerability was confirmed.

### P1 — N01: the saved cluster example reports a detection it never performed

The saved fixture clearly says it contains no modelled activity or connection evidence. Its direct-transfer card correctly says no connection evidence is included. However, the adjacent shared-hub card says **“No significant shared funding sources or overlapping counterparties detected.”** That converts missing fixture evidence into a clean detection claim.

- Evidence: step 14 and [BulkDashboard.tsx:398](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/components/BulkDashboard.tsx:398).
- Proposed change: branch on `data.source === 'saved'` and say “No shared counterparty or hub evidence is included in this saved example.”
- Acceptance: every empty state in a saved/unmodelled result distinguishes “not included/not modelled” from “searched and none detected.”

### P1 — N02: release records contain stale and contradictory status claims

The task bodies say R01–R06 and R08–R11 are locally complete, R07 is partial, and R12 is open. The go/no-go table still says reporting, accessibility, cancellation, server-error explanation and canonical local verification are pending, and says R10 is pending. Separately, `crutial_fixes.md` marks “screen-reader critical paths” complete while its evidence describes keyboard and accessibility-tree inspection; the remediation plan correctly says a real screen-reader smoke was unavailable and remains required.

- Evidence: [AUDIT_DEPLOYMENT_FIX_PLAN.md:751](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/AUDIT_DEPLOYMENT_FIX_PLAN.md:751), [crutial_fixes.md:673](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/crutial_fixes.md:673), and R12 at [AUDIT_DEPLOYMENT_FIX_PLAN.md:674](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/AUDIT_DEPLOYMENT_FIX_PLAN.md:674).
- Proposed change: reconcile the summary table with task-body statuses and relabel the screen-reader checkbox as local semantic/accessibility-tree evidence until a real screen-reader smoke is recorded.
- Acceptance: a release operator sees one consistent current status and cannot mistake local DOM inspection for assistive-technology proof.

### P2 — N03: generated browser traces pollute the canonical lint gate

`eslint .` inspected generated `.playwright-cli` traces. It produced **1,549 warnings across 8 generated files**, while application source produced zero errors and zero warnings. The run took 12.65 seconds and passed, but the volume makes real future warnings easier to miss.

- Evidence: current lint JSON measurement and [eslint.config.mjs:9](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/eslint.config.mjs:9); 279 files exist under `.playwright-cli/traces/resources`.
- Proposed change: ignore `.playwright-cli/**` and other explicitly generated audit artifacts in ESLint without weakening source coverage.
- Acceptance: `npm run lint` reports zero generated-trace files and still lints every application/config/test source file.

### P2 — N04: one methodology claim still overstates provider resilience

The docs say the dual-gateway system and caching “bypass block explorer rate limits, ensuring fast and reliable data retrieval.” The app intentionally supports partial/unavailable provider outcomes, so “reduce rate-limit impact” and “improve resilience” would be more accurate than “bypass” and “ensuring.”

- Evidence: step 17 and [docs/page.tsx:520](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/app/docs/page.tsx:520).
- Proposed change: use bounded resilience language consistent with the reporting contract.
- Acceptance: documentation never implies that fallbacks eliminate rate limits or guarantee availability.

## UX, visual design and accessibility health

Strengths now confirmed:

- The hero states the supported scope, names all four networks, and gives the scanner the strongest emphasis.
- Desktop hierarchy is clearer without changing the approved light/orange rectangular design language.
- Saved-demo status and provider limitations are visible before opening a card; repeated paragraphs were removed.
- Validation, empty states, partial/unavailable states, approvals and saved cluster summaries are mostly evidence-aware.
- Capital-flow lanes are materially easier to read and have equivalent keyboard-operable HTML actions outside the decorative SVG.
- Docs filtering produces a direct answer path; the full reporting contract remains available.
- Mobile scanner, dashboard, transfers, cluster and docs remained usable without page-wide overflow.
- The branded 404 gives immediate recovery actions.

Limits that remain outside this audit:

- No VoiceOver/NVDA/JAWS/TalkBack session, Safari/iOS hardware test, Android hardware test, 200–400% zoom sweep, touch/pen graph test, or offline/slow-network profile.
- Local DOM checks are not a WCAG 2.2 AA conformance claim.
- Only the saved Vitalik report and the provider-free cluster example were exercised deeply; fresh provider states were intentionally not invoked.

## SEO, security, privacy and operations

- Seven public content routes returned HTTP 200, each with one distinct H1, title, description, canonical and JSON-LD. The local `localhost:3000` canonical is the expected fallback; `SITE_URL` must be verified on Preview.
- The unknown route returned HTTP 404 with branded recovery.
- Security headers were present locally and `X-Powered-By` was absent. The current CSP still permits inline styles/scripts for framework compatibility; any nonce/hash migration needs its own tested task.
- The dependency audit reported zero known vulnerabilities. This does not replace application security testing.
- Web Vitals telemetry is materially more privacy-conscious than address-bearing analytics, but deployed retention, access, expiry and alerting are unverified.
- Instance-local limits do not prove deployment-wide abuse control. WAF and two-process Upstash evidence remain required.
- Forced provider failure, real disconnect termination, live scan resource limits, provider quota behavior and production log privacy remain unverified.

## Deployment decision

**NO-GO for production today.** The local candidate is much closer, but R07 remains partial and R12 has not started. Before deployment, complete these in order:

1. Correct N01 and reconcile N02 so the product and release record are truthful.
2. Remove generated trace noise from lint (N03) and rerun the canonical local gate on the exact candidate.
3. Obtain product-owner approval for the current R11 before/after hierarchy changes.
4. Create one immutable Vercel Preview and configure the intended `SITE_URL`, provider secrets, WAF, Redis and observability boundaries.
5. Run the required Preview route/header/SEO/provider-failure/single/cluster/browser matrix, three cold Lighthouse profiles per device class, Safari/iOS and a real screen-reader smoke.
6. Record the candidate SHA, last-known-good deployment, rollback operator, monitoring/resource evidence and explicit production authorization.

Do not treat the current local build, local Web Vitals samples, or checked implementation tasks as substitutes for those deployment gates.

## Captured flow steps

| Step | Surface/action | Current health |
| --- | --- | --- |
| 01 | Desktop scanner and saved cards | **Healthy** — bounded hero, visible field label, clearer card hierarchy |
| 02 | Invalid address | **Healthy** — visible alert and associated invalid field |
| 03 | Saved Vitalik dashboard | **Healthy** — partial/non-live status and stable selected panel |
| 04 | Capital flow | **Improved/healthy** — separated lanes, no visible overlap, accessible equivalent actions |
| 05 | Protocols | **Healthy** — clear unclassified state and filtering |
| 06 | Gas | **Healthy** — readable provenance and totals |
| 07 | Transfers | **Healthy** — pressed state, search, subset disclosure and pagination |
| 08 | Approvals | **Healthy** — row/spender distinction and observed-history wording corrected |
| 09 | Mobile saved dashboard | **Healthy but dense** — no page overflow; address disclosure preserved |
| 10 | Mobile transfer empty state | **Healthy** — network filter and zero-result recovery clear |
| 11 | Mobile cluster entry | **Healthy** — fill-only and saved-result actions are distinct |
| 12 | Saved cluster result | **Mostly healthy** — dated, provider-free, unmodelled status visible |
| 13 | Saved cluster summary | **Healthy** — unavailable values shown as N/A/Not modelled |
| 14 | Saved cluster leaderboard/hubs | **Needs correction** — N01 unsupported “detected none” claim |
| 15 | Mobile docs | **Healthy** — topic-first structure and usable filter |
| 16 | Filtered docs | **Healthy** — risk query reaches matching content |
| 17 | Desktop docs | **Healthy layout; copy caveat** — N04 overstates gateway guarantees |
| 18 | EVM Wallet Analytics topic | **Healthy** — capability and limits balanced |
| 19 | Crypto Wallet Risk Checker topic | **Healthy** — avoids categorical safety verdict |
| 20 | Token Approval Checker topic | **Healthy** — observed approvals and exposure caveats align |
| 21 | Sybil Wallet Analysis topic | **Healthy** — heuristic/list evidence separated |
| 22 | Multi-Chain Wallet Forensics topic | **Healthy** — explicit network and coverage bounds |
| 23 | Not found | **Healthy** — branded recovery actions above the fold |
| 24 | Mobile scanner | **Healthy** — no page overflow; main task remains prominent |

## Screenshot evidence

All screenshots below are exact browser captures opened and inspected during this audit. Desktop viewport is 1440×1000 unless noted; mobile is 390×844.

### 01 · Desktop scanner

![01 desktop scanner](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/01-scanner-desktop.png)

### 02 · Invalid address

![02 invalid address](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/02-invalid-address.png)

### 03 · Saved dashboard

![03 saved dashboard](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/03-saved-dashboard.png)

### 04 · Capital-flow lanes

![04 capital flow](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/04-capital-flow.png)

### 05 · Protocols

![05 protocols](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/05-protocols.png)

### 06 · Gas

![06 gas](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/06-gas.png)

### 07 · Transfers

![07 transfers](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/07-transfers.png)

### 08 · Approvals

![08 approvals](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/08-approvals.png)

### 09 · Mobile saved dashboard

![09 mobile saved dashboard](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/09-dashboard-mobile.png)

### 10 · Mobile transfer empty state

![10 mobile transfers](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/10-transfers-mobile-empty.png)

### 11 · Mobile cluster entry

![11 mobile cluster](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/11-cluster-mobile.png)

### 12 · Saved cluster result

![12 saved cluster](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/12-saved-cluster-mobile.png)

### 13 · Saved cluster summary

![13 saved cluster summary](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/13-saved-cluster-summary-mobile.png)

### 14 · Saved cluster hubs — unsupported clean detection claim

![14 saved cluster hubs](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/14-saved-cluster-leaderboard-mobile.png)

### 15 · Mobile docs

![15 mobile docs](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/15-docs-mobile.png)

### 16 · Filtered mobile docs

![16 filtered docs](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/16-docs-mobile-filtered.png)

### 17 · Desktop docs

![17 desktop docs](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/17-docs-desktop.png)

### 18 · EVM Wallet Analytics

![18 EVM wallet analytics](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/18-evm-wallet-analytics.png)

### 19 · Crypto Wallet Risk Checker

![19 crypto wallet risk checker](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/19-crypto-wallet-risk-checker.png)

### 20 · Token Approval Checker

![20 token approval checker](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/20-token-approval-checker.png)

### 21 · Sybil Wallet Analysis

![21 Sybil wallet analysis](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/21-sybil-wallet-analysis.png)

### 22 · Multi-Chain Wallet Forensics

![22 multi-chain wallet forensics](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/22-multi-chain-wallet-forensics.png)

### 23 · Branded not-found recovery

![23 not found](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/23-not-found.png)

### 24 · Mobile scanner

![24 mobile scanner](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-09-02/24-scanner-mobile.png)

