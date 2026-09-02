# WalletGenome — full local app audit
Date: 28 August 2026. Scope: current working tree, fresh production build, local preview on port 3011. No application code changed, no live wallet/cluster scan submitted, no deployment.

## Verdict

The app is functional and has a consistent visual identity, good input validation, and unusually explicit partial-data warnings. The next work should prioritize **accurate reporting, accessible interactions, graph readability, and trustworthy performance measurement**, ahead of changing fonts or redesigning the hero.

This is a comprehensive local product/implementation audit, **not** a production performance certification, WCAG conformance report, financial-model validation, or penetration test. “All metrics” cannot truthfully be reduced to an invented overall score.

## Coverage and method

Product Design's screenshot-first audit workflow was used. Twenty current screenshots were saved and opened for inspection. Existing design guidance was used as context; prior audit findings/screenshots were not used as evidence.

The user job: enter a public EVM address, understand evidence quality, investigate behavior/risk/flows, and consult the methodology. Accessibility review target: WCAG 2.2 AA, with manual DOM/source checks rather than a claim of complete compliance.

Captured flow steps and health:

| Step | Surface or action | Health / outcome |
| --- | --- | --- |
| 01 | Desktop scanner and demo cards | Functional; completeness claim and faint placeholder need attention |
| 02 | Invalid single-wallet address | Pass: visible alert, aria-invalid, error association |
| 03 | Saved Vitalik dashboard | Functional; partial/non-live state clear; broken scan-tab reference |
| 04 | Capital-flow graph | Needs work: overlapping boxes and hidden interactive SVG controls |
| 05 | Protocols | Functional; clear unclassified activity; dense secondary information |
| 06 | Gas fees | Functional; important provenance label too small and low-contrast |
| 07 | Top token transfers | Search, clearing and pagination pass; selected filter semantics missing |
| 08 | Approvals | Needs work: 18 approval rows mislabeled as distinct spenders; “active” overstates evidence |
| 09 | Mobile saved dashboard | No page overflow; full-address disclosure works; stacked information remains long |
| 10 | Mobile transfer filtering / empty state | Native network selection works; empty state clear |
| 11 | Mobile cluster validation | Pass: duplicates/invalid entries explained, scan disabled |
| 12 | Mobile docs and filter | Filter works without losing field; contract table delays relevant topics |
| 13 | Desktop docs | Functional; dense hierarchy; local canonical domain requires release configuration |
| 14 | EVM Wallet Analytics topic | Healthy template, clear capabilities and limits |
| 15 | Crypto Wallet Risk Checker topic | Healthy template, avoids categorical safety claims |
| 16 | Token Approval Checker topic | Healthy template; its caveat contradicts stronger dashboard “active” wording |
| 17 | Sybil Wallet Analysis topic | Healthy template; clear heuristic/list distinction |
| 18 | Multi-Chain Wallet Forensics topic | Healthy template; clear coverage limits |
| 19 | Mobile scanner | Main controls 44px high; no page-wide overflow |
| 20 | Missing-page recovery | Weak: generic 404, no immediately visible return-to-scanner action |

Additional interaction checks: transfer search returned a clear zero-match state; Clear restored results/focus; Next advanced 1–50 to 51–100 of 109; selecting Base on mobile produced a clear empty subset; mobile navigation opened, Escape closed it and returned focus; full wallet address expanded on mobile. All six single-wallet result tabs rendered. Only the saved Vitalik dataset was exercised in depth.

## Measured scorecard

| Metric/check | Current result | Interpretation |
| --- | --- | --- |
| Tests | **284/284 passed**, 0 failed/skipped | Current local test suite, not a coverage percentage |
| Lint / TypeScript / production build | Passed | Fresh `npm run verify` in this audit |
| Public content routes | 7/7 HTTP 200 | Five warm serial GET samples per route after one warm-up |
| Production dependency audit | 0 reported vulnerabilities | npm registry audit at audit time |
| Full dependency audit, including development | 0 reported vulnerabilities | Not proof of absence of exploitable issues |
| Scanner initial JavaScript | **651,772 bytes raw; 199,142 bytes gzip (~194.5 KiB)** | 9 script assets referenced by generated HTML; not execution time |
| Docs initial JavaScript | 663,229 raw; 197,579 gzip (~193 KiB) | 9 script assets |
| Topic-page initial JavaScript | 588,227 raw; 181,837 gzip (~177.6 KiB) | 8 script assets, each route |
| Shared CSS | 59,222 raw; 11,500 gzip (~11.2 KiB) | One stylesheet |
| Initial font assets | **88,912 bytes (~86.8 KiB)** | Two already-compressed WOFF2 preload assets |
| Scanner HTML | 46,705 raw; 10,168 gzip | Static page |
| Docs HTML | 100,468 raw; 18,725 gzip | Larger document, still static |
| Warm local response-header latency | Scanner median **2.77 ms**, docs **3.19 ms**, topic pages **1.85–1.94 ms** | Node fetch on same machine; **not browser TTFB, internet latency, or CWV** |
| Largest saved demo | **2,247,790 raw; 358,017 gzip (~350 KiB)** | Vitalik JSON; includes data beyond the initial panel |
| Scanner horizontal overflow | None at 320, 360, 390, 767, 768, 1280, 1440px | DOM layout-width measurement; scrollbar width excluded |
| Docs and five topic routes | No page-wide overflow at 320px | Also inspected desktop layouts |
| Saved dashboard / approvals | No page-wide overflow at 390px | Data tables intentionally have local horizontal scrolling |
| Mobile main targets | 44px minimum height for menu, mode tabs, network toggles and Scan | Meets the app's 44px target; broader controls not exhaustively measured |

Asset gzip sizes are locally calculated estimates, not a browser waterfall. Fonts are counted at WOFF2 size. Shared assets can be cached on repeat navigation; these figures must not be added across routes as if every visit downloads them anew.

Raw measurements: [metrics.json](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-08-28/metrics.json), [responsive.json](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-08-28/responsive.json), [narrow route checks](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-08-28/narrow-route-checks.json), [route metadata](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-08-28/route-metadata.json). Reproducible local asset/response measurement: [measure.mjs](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-08-28/measure.mjs).

### Not measured — do not report these as passing

| Metric | Missing evidence / next measurement |
| --- | --- |
| LCP, INP, CLS | No numeric browser measurement or production field dataset obtained. Browser inspection did not expose the performance API; console metrics appeared only as “Object.” |
| Lighthouse performance/accessibility/SEO scores | No Lighthouse run; no scores assigned |
| FPS, CPU, heap/memory, battery cost, long tasks/TBT | Needs a browser performance trace and representative hardware |
| Live scan p50/p95/p99, timeout/error rate, provider latency | No provider-backed scans or load test submitted |
| Cache hit rate and deployment-wide quota effectiveness | Shared Redis behavior has source/tests, but no deployed configuration/runtime proof |
| Uptime, availability SLOs, alerts, incident recovery | No monitoring/operations evidence inspected |
| Task completion rate, abandonment, time-to-insight, satisfaction | Needs usability sessions or consented product analytics |
| Behavioral/risk/Sybil accuracy, false-positive rate | Needs labeled validation data and calibration; passing implementation tests is not model validation |
| Test coverage percentage | No coverage-instrumented run |
| Safari/iOS, Android hardware, screen readers, 200–400% zoom, offline/slow networks | Not exercised; narrow viewport simulation is not equivalent |

For future performance acceptance, use LCP ≤2.5s, INP ≤200ms and CLS ≤0.1 at the 75th percentile of real visits, separated by mobile/desktop. [Google Web Vitals](https://web.dev/articles/vitals?hl=en). A fast local response is not a substitute.

## Prioritized findings

Priority meaning: P1 = resolve before relying on the affected feature publicly; P2 = next improvement batch; P3 = polish. No P0 outage or critical vulnerability was confirmed within the tested scope.

### P1 — reporting and trust

**F01. “High-risk spenders” counts the wrong entity.**
Step 08 shows 18. The calculation counts high-risk approval rows, not distinct spender contracts. The same saved fixture contains **18 high-risk approvals but only 5 unique chain/spender pairs**.
- Evidence: [ApprovalAudit.tsx:109](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/components/ApprovalAudit.tsx:109) and label at line 133; current saved Vitalik fixture.
- Proposed change: rename it “High-risk approvals,” or deduplicate by chain + spender if spender count is the intended metric.
- Acceptance: repeated approvals to one spender cannot inflate a metric named “spenders”; regression fixture verifies both counts.

**F02. Certainty in the headline and approval summary exceeds the evidence.**
Step 01 promises the “complete story” behind “any crypto wallet” despite four supported EVM networks and partial provider history. Step 08 says “TOTAL ACTIVE PERMISSIONS.” The approval analysis reconstructs the latest observed approve transaction per token/spender; it does not itself establish current on-chain allowance. Step 16 correctly warns that historical approvals may no longer be active.
- Evidence: [page.tsx:129](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/app/page.tsx:129), [ApprovalAudit.tsx:128](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/components/ApprovalAudit.tsx:128), [analysis/approvals.ts:58](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/lib/analysis/approvals.ts:58).
- Proposed change: use “observed approval permissions” / “latest observed approvals,” show scan/snapshot time and partial-history caveat nearby; qualify supported wallets and completeness in the hero.
- Acceptance: readers can distinguish observed history from current permissions without opening documentation. Do not introduce extra RPC work as part of a copy-only fix.

### P1 — readability and accessibility

**F03. Flow-graph nodes overlap.**
Step 04 shows the top-right KyberSwap box colliding with an outflow box; similar collisions appear at the lower edges. Dense connecting lines and the center address make reading harder.
- Evidence: screenshot 04; [CapitalFlowGraph.tsx](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/components/CapitalFlowGraph.tsx).
- Proposed change: reserve separate layout lanes for protocol nodes, counterparties and the center; increase collision clearance and expose full labels in an accessible detail panel.
- Acceptance: no node-box intersections in the 23-node saved fixture at desktop width; labels remain readable inside the mobile graph scroller. Preserve the truthful data summary.

**F04. Small, low-contrast text weakens important instructions and caveats.**
The scanner's placeholder is RGB(156,163,175) on RGB(244,245,248), approximately 2.3:1. The gas “Observed history” label uses 9px amber #f59e0b against a near-white card (about 2.15:1 on white). Both fall below the 4.5:1 normal-text target.
- Evidence: steps 01/06/19; [WalletInput.tsx:69](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/components/WalletInput.tsx:69), [GasSummaryPanel.tsx:75](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/components/GasSummaryPanel.tsx:75).
- Proposed change: use the existing darker ink/muted colors; raise decision-relevant metadata to a readable size. Add a persistent visible address-field label rather than relying on a clipped placeholder.
- Acceptance: verify actual rendered backgrounds/gradients and all states at 4.5:1 for small text. A 12–14px metadata size is a readability recommendation, not a WCAG minimum-font-size rule.

**F05. Some interactions are visually available but not correctly exposed to assistive technology.**
Step 07's direction/network filter buttons do not expose selected state. The saved-result mode tab references a missing `scan-mode-single-panel`. Capital-flow SVG nodes are focusable and interactive inside an `aria-hidden="true"` SVG; the static text summary does not provide the same actions.
- Evidence: current DOM checks; [TransferTable.tsx:103](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/components/TransferTable.tsx:103), [page.tsx:187](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/app/page.tsx:187), [CapitalFlowGraph.tsx:595](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/components/CapitalFlowGraph.tsx:595).
- Proposed change: expose pressed/selected state; keep tab/panel associations valid in every state; provide named keyboard-operable graph actions outside hidden graphics or correctly expose the interactive SVG.
- Acceptance: keyboard and screen-reader checks identify selected filters, activate equivalent graph actions, and encounter no focusable content hidden from the accessibility tree. Enter and Space behavior should match the chosen control semantics.
- Secondary issue: the closed full-address disclosure references an element only created when expanded. Keep a stable hidden target where appropriate.

Reference: [WCAG 2.2](https://www.w3.org/TR/WCAG22/). Screenshot/DOM review does not certify full compliance.

### P1 — operational risk; source-confirmed, not a reproduced production incident

**F06. A request timeout does not cancel underlying scan work.**
The timeout helper races an existing promise against a timer. When the timer wins, the provider work is not canceled by that helper; the streaming route also lacks downstream abort propagation from a disconnected request. This can allow work to continue after the caller stops waiting.
- Evidence: [requestPolicy.ts:244](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/lib/api/requestPolicy.ts:244), [scan/route.ts:42](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/app/api/scan/route.ts:42).
- Proposed change: propagate AbortSignal through the service/provider stack, cancel on disconnect/deadline, and release resources consistently.
- Acceptance: mocked timeout/disconnect tests show no further provider requests after cancellation and no leaked slots. Measure real provider spending separately.
- Scope limit: the degree of continued work and hosting-runtime termination behavior were not measured.

### P2 — performance, documentation and release checks

**F07. There is no usable field-performance baseline in the inspected app.**
[WebVitals.tsx:5](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/components/WebVitals.tsx:5) only logs metrics to the console. No aggregate collector/dashboard was found in this component. Current browser logging did not expose numeric values.
- Proposed change: collect privacy-conscious vitals and route/state timings, without wallet addresses or full address-bearing URLs; add a repeatable lab profile for scanner, demo load and heavy tabs.
- Acceptance: report p75 LCP/INP/CLS by device and route; track demo-open and tab-switch duration, long tasks, and errors. Do not optimize against made-up 100-point scores.
- Docs also hardcodes “~0.01 ms (Set)” and “800K+ In-Memory” at [docs/page.tsx:440](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/app/docs/page.tsx:440). Label illustrative figures or attach benchmark/data-version evidence; they were not validated here.

**F08. Demo payload and global decorative effects deserve measured budgets.**
The largest saved demo is 2.25MB decoded JSON (~350KiB gzip). The app preloads ~87KiB of fonts. Global particle drawing remains active on visible pages; the current implementation already caps drawing to 30fps, pauses when hidden/reduced-motion is active, and lets the cursor effect settle. Dashboard/tabs are already lazy-loaded.
- Proposed change: preserve these improvements; measure low-end mobile parse/render cost before splitting data or removing effects. Consider a summary-first saved demo and optional/static decorative background on lower-power devices.
- Acceptance: compare before/after trace and visual behavior, not bundle size alone. Any payload split must retain provenance and saved/non-live status.
- No CPU/FPS/battery regression is claimed from source inspection alone.

**F09. Docs filter the topics, but leave a long contract table ahead of the answer.**
In step 12 at 390px, the first actual methodology topic starts around document Y=2822px; the unfiltered page is about 12,613px tall. Filtering “risk” returns two topics and preserves the input, but the generic reporting table remains first.
- Proposed change: give a short plain-language overview; put contract details behind a clear disclosure or separate section; prioritize matching topic content after filtering.
- Acceptance: a risk search leads to risk content without passing an unrelated long table. Keep direct topic navigation and API definitions accessible.

**F10. Cluster exploration needs parity with the single-wallet demo and input methods.**
Step 11's validation is strong, but “Load Sample Cluster” only fills addresses; it is not a provider-free saved cluster report. Cluster results were not exercised because a live scan would consume providers. Source still intercepts ordinary wheel scrolling for zoom and uses mouse drag handlers.
- Evidence: [BulkScanInput.tsx:70](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/components/BulkScanInput.tsx:70), [ClusterFlowGraph.tsx:99](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/src/components/ClusterFlowGraph.tsx:99).
- Proposed change: label sample input clearly; offer a genuinely saved, dated cluster example; prefer explicit zoom/modifier gestures and Pointer Events with keyboard alternatives.
- Acceptance: ordinary page scrolling remains usable, touch/pen can pan, and a provider-free cluster demo can exercise result/empty/partial states.

**F11. SEO structure is present, but the tested build is not production-domain-ready.**
The seven pages have distinct content; the five topic routes and docs expose appropriate titles, descriptions and canonical tags. Sitemap, robots and sharing-image routes are generated. In this local build, canonical URLs, sitemap and robots host point to **http://localhost:3000**.
- Proposed change: ensure the intended production SITE_URL is configured and verify generated metadata on Preview/production. This is expected local fallback, **not evidence the deployed site is currently wrong**.
- Acceptance: intended HTTPS canonical domain, seven correct sitemap URLs, working share images, and deliberate preview indexing policy.

**F12. Missing-page recovery is too bare.**
Step 20 shows a generic 404 with no immediate scanner or back action; secondary footer links are below the fold.
- Proposed change: a small branded not-found page with “Return to scanner” and “Read methodology.” Review unexpected-error/loading recovery in the same pass; do not redesign the normal app.
- Acceptance: an invalid URL offers a useful next action immediately.

### P3 — visual polish

**F13. Simplify hierarchy before changing the font family.**
Steps 01/03/05/13 show many equally heavy uppercase labels, raised controls, borders and secondary cards. The four hero demos repeat nearly identical provider-warning paragraphs and leave substantial unused vertical space; on mobile they become a long stack.
- Proposed change: retain the cards and current Inter/JetBrains Mono pair. Shorten repetitive demo copy, move shared explanation above the cards, lighten non-action containers, and reserve the strongest emphasis for primary actions and important findings.
- Acceptance: demo cards remain fully clickable and clearly dated/non-live; no loss of technical caveats; no unapproved palette or layout redesign.
- Font choice is not the most consequential problem in this audit. Contrast, size, copy and hierarchy matter more.

## Technical health, security and privacy observations

Confirmed strengths: fresh build/lint/type/test success; server-rendered static public pages; deferred dashboard/tab chunks; saved demos avoid scan API calls; validation rejects malformed/unsupported input; max cluster size 10; no-store scan responses; security headers include CSP, frame denial, nosniff, referrer policy, COOP and restricted permissions; JSON-LD escapes less-than characters.

Hardening/verification still needed:
- CSP allows inline scripts. Consider nonce/hash-based hardening with Next.js rendering compatibility tests, not a blind policy change.
- Per-caller rate limits and concurrency counters are process-local (12 single / 4 batch requests per minute; concurrent 4 single / 1 batch). Shared daily quotas/cache exist when Redis is configured, but deployed enforcement was not tested.
- Confirm trusted proxy handling for forwarded client IPs; raw header identity depends on deployment boundary.
- In-memory caches are bounded by item count, not measured byte size. Establish memory budgets under large-wallet workloads.
- Document actual retention and infrastructure logging, including any shared cache, without equating “read-only blockchain access” with “no data ever processed/stored.”
- No credentials, live provider balances, cloud settings, auth session, production logs, or customer records were inspected. No external messages, uploads or deployment were performed.
- No known dependency vulnerabilities were reported at audit time; this does not replace application security testing.
- At shutdown, the local server output included `Internal: NoFallbackError` from a generated server chunk. The session included an intentional missing-page request, but this log was not isolated to a specific request. Do not interpret the successful page checks as proof of an error-free server; reproduce and correlate this warning before release.

## Suggested implementation order

1. Correct approval metric names and certainty wording (F01–F02).
2. Fix graph collision/accessibility and low-contrast essential text (F03–F05).
3. Add cancellation tests and provider abort propagation (F06).
4. Establish real performance/operational baselines; verify release domain and quota configuration (F07–F08, F11).
5. Improve docs task flow, cluster demo/input parity, and recovery pages (F09–F10, F12).
6. Polish card copy/elevation/type hierarchy without changing the approved composition (F13).

Each batch should be separately approved, implemented and verified. This audit authorizes none of those edits.

## Screenshot evidence

Each image below is the exact saved browser capture inspected during this run. Desktop viewport: 1440×1000 unless noted; mobile: 390×844. Some captures are intentionally scrolled to the relevant content; viewport screenshots do not show an entire long page.

### 01 · Desktop scanner — functional; trust/contrast review

![01 · Desktop scanner — functional; trust/contrast review](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-08-28/01-scanner-desktop.png)

### 02 · Invalid address — working alert and recovery

![02 · Invalid address — working alert and recovery](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-08-28/02-invalid-address.png)

### 03 · Saved dashboard — clear partial/non-live evidence

![03 · Saved dashboard — clear partial/non-live evidence](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-08-28/03-saved-dashboard.png)

### 04 · Capital flow — overlapping node boxes

![04 · Capital flow — overlapping node boxes](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-08-28/04-capital-flow.png)

### 05 · Protocols — clear unclassified activity, dense hierarchy

![05 · Protocols — clear unclassified activity, dense hierarchy](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-08-28/05-protocols.png)

### 06 · Gas — readable totals, faint provenance label

![06 · Gas — readable totals, faint provenance label](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-08-28/06-gas.png)

### 07 · Transfers — explicit subset and working pagination

![07 · Transfers — explicit subset and working pagination](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-08-28/07-transfers.png)

### 08 · Approvals — incorrect spender-count label

![08 · Approvals — incorrect spender-count label](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-08-28/08-approvals.png)

### 09 · Mobile dashboard — selected result and risk list

![09 · Mobile dashboard — selected result and risk list](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-08-28/09-dashboard-mobile.png)

### 10 · Mobile transfer filter — empty Base subset

![10 · Mobile transfer filter — empty Base subset](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-08-28/10-transfers-mobile-empty.png)

### 11 · Cluster — duplicate and invalid entries blocked

![11 · Cluster — duplicate and invalid entries blocked](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-08-28/11-cluster-mobile-validation.png)

### 12 · Mobile docs — long route to topic content

![12 · Mobile docs — long route to topic content](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-08-28/12-docs-mobile.png)

### 13 · Desktop docs — navigation and contract hierarchy

![13 · Desktop docs — navigation and contract hierarchy](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-08-28/13-docs-desktop.png)

### 14 · EVM Wallet Analytics

![14 · EVM Wallet Analytics](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-08-28/14-topic-evm-wallet-analytics.png)

### 15 · Crypto Wallet Risk Checker

![15 · Crypto Wallet Risk Checker](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-08-28/15-topic-crypto-wallet-risk-checker.png)

### 16 · Token Approval Checker

![16 · Token Approval Checker](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-08-28/16-topic-token-approval-checker.png)

### 17 · Sybil Wallet Analysis

![17 · Sybil Wallet Analysis](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-08-28/17-topic-sybil-wallet-analysis.png)

### 18 · Multi-Chain Wallet Forensics

![18 · Multi-Chain Wallet Forensics](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-08-28/18-topic-multi-chain-wallet-forensics.png)

### 19 · Mobile scanner — clear primary action

![19 · Mobile scanner — clear primary action](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-08-28/19-scanner-mobile.png)

### 20 · Missing page — weak immediate recovery

![20 · Missing page — weak immediate recovery](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/full-audit-2026-08-28/20-missing-page.png)
