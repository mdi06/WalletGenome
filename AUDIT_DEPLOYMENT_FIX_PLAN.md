# WalletGenome Audit Remediation and Deployment-Readiness Plan

Status: **NO-GO — implementation and Preview evidence required**  
Created: 2026-08-31  
Source audit: [`output/full-audit-2026-08-28/AUDIT.md`](output/full-audit-2026-08-28/AUDIT.md)  
Deployment checklist: [`crutial_fixes.md`](crutial_fixes.md)  
Release procedure: [`docs/deployment_runbook.md`](docs/deployment_runbook.md)

This document converts findings F01–F13 from the local audit into an ordered execution plan for implementation agents. It does **not** replace `crutial_fixes.md`. An item in this plan is not deployment proof until its local, Preview, and operational acceptance criteria are recorded.

No application change or deployment was made when this plan was created.

## 1. Release definition

“Ready to deploy” means all of the following are true:

1. Every **Release blocker** in this plan is complete with regression evidence.
2. `npm run verify` and `git diff --check` pass on the exact candidate revision.
3. The open Vercel gates in `crutial_fixes.md` are complete.
4. A Vercel Preview passes the browser, provider-failure, security, SEO, monitoring, resource, and abuse-control checks in `docs/deployment_runbook.md`.
5. The immutable candidate Preview URL and last-known-good production URL are recorded.
6. The user explicitly authorizes production promotion.

Local tests, a local production server, or a Lighthouse result alone do not satisfy this definition.

## 2. Agent operating protocol

Every implementation agent must follow this sequence:

1. Read `AGENTS.md`, `DESIGN.md`, the source audit, this plan, `crutial_fixes.md`, and `docs/deployment_runbook.md`.
2. Inspect `git status --short`. The working tree may contain user-owned changes. Do not reset, discard, overwrite, or reformat unrelated work.
3. Claim only one task ID or one explicitly approved batch. Respect the dependencies shown below.
4. Reproduce the finding against the current candidate before editing. Audit screenshots are evidence from 2026-08-28, not permission to assume the current render is identical.
5. Make the smallest change that satisfies the acceptance criteria. Preserve the light gray, white, near-black and orange visual system, sharp geometry, existing cards, Inter/JetBrains Mono font pair, static saved-demo behavior, and truthful partial-data states.
6. Add or update focused regression tests with the change.
7. Run the focused tests first. Then run `git diff --check` and `npm run verify` before marking the task complete.
8. For UI work, capture fresh desktop and mobile evidence at the specified widths. A source assertion is not a rendered-browser check.
9. Record commands, counts, screenshots, limitations, and affected files in the Evidence Log at the end of this document.
10. Do not run paid/provider-backed scans, configure cloud services, push Git changes, create a Preview, or promote production unless the user has explicitly authorized that action.

Allowed status values:

- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete with evidence
- `[!]` Blocked; reason recorded
- `[-]` Removed from scope by explicit product decision

## 3. Priority and dependency map

| Order | Task | Audit mapping | Release role | Depends on |
| ---: | --- | --- | --- | --- |
| 0 | R00 Candidate baseline and reproduction | All | Release blocker | None |
| 1 | R01 Correct approval entities and evidence wording | F01, F02 | Release blocker | R00 |
| 2 | R02 Correct product promise and coverage copy | F02 | Release blocker | R00 |
| 3 | R03 Repair critical accessibility and contrast | F04, F05 | Release blocker | R00 |
| 4 | R04 Make capital-flow inspection readable and accessible | F03, F05 | Release blocker | R00, R03 semantics decision |
| 5 | R05 Cancel timed-out and disconnected provider work | F06 | Release blocker | R00 |
| 6 | R06 Reproduce and resolve the server `NoFallbackError` | Audit runtime note | Release blocker until explained | R00 |
| 7 | R07 Establish performance measurement and budgets | F07, F08 | Preview blocker | R00 |
| 8 | R08 Improve docs answer path | F09 | Public-release requirement | R00 |
| 9 | R09 Make cluster sample and graph input behavior truthful | F10 | Public-release requirement | R00 |
| 10 | R10 Verify SEO, recovery, security and privacy | F11, F12 | Preview blocker | R01–R09 as applicable |
| 11 | R11 Reduce visual competition without redesigning | F13 | Optional pre-release polish | R01–R10 |
| 12 | R12 Complete Preview and production gates | Operational findings | Final release blocker | All required tasks |

R11 must never delay or substitute for R01–R10. Font-family replacement is not part of this plan.

## 4. Implementation tasks

### R00 — Candidate baseline and fresh reproduction

Status: [x]  
Owner: Codex (local baseline)  
Release role: **blocker**

#### Instructions

1. Record the branch/ref, commit SHA, Node version, package-lock checksum, and working-tree status.
2. Run the current canonical local gate:

   ```bash
   npm run verify
   git diff --check
   npm audit --omit=dev
   ```

3. Start the built application with `npm start` on a non-conflicting local port.
4. Reproduce steps 01–20 from the audit where they do not require a live provider call. Use saved snapshots for single-wallet result states.
5. Recalculate the initial JS/CSS/font and saved-demo baselines using `output/full-audit-2026-08-28/measure.mjs`, or replace it with an equally reproducible measurement if the build layout has changed.
6. Mark each later finding `confirmed`, `already resolved`, or `not reproducible`. Do not edit a finding that is no longer present.

#### Required evidence

- Exact candidate identity and clean/dirty-state description.
- Test count, lint/typecheck/build results, dependency-audit result.
- Fresh screenshots at 320, 360, 390, 767, 768, 1280 and 1440px for affected scanner/result layouts.
- No page-wide horizontal overflow at those widths.
- Current asset measurements and saved-demo size.

#### R00 completion evidence — 2026-08-31

Candidate and working-tree state:

- Branch/ref: `architecture-validation`.
- HEAD: `5e7089c4fdc9b8969d07ef7822c43c28d56e4221` (`mobile responsiveness edjusted`, 2026-08-27).
- Runtime: Node `v22.22.3`, npm `10.9.8`.
- `package-lock.json` SHA-256: `84a60d8d4cc4a878f7fa44bf55bbd8f4f955421af7022595f901d0944ec0c987`.
- The candidate was already dirty before R00. The exact pre-existing tracked modifications were:

  ```text
  M .env.example
  M DESIGN.md
  M README.md
  M crutial_fixes.md
  M package.json
  M src/app/api/batch-scan/route.ts
  M src/app/api/scan/route.ts
  M src/app/docs/page.tsx
  M src/app/globals.css
  M src/app/layout.tsx
  M src/app/opengraph-image.tsx
  M src/app/page.tsx
  M src/components/BulkScanInput.tsx
  M src/components/CapitalFlowGraph.tsx
  M src/components/ClusterFlowGraph.tsx
  M src/components/Dashboard.tsx
  M src/components/GasSummaryPanel.tsx
  M src/components/InteractionsPanel.tsx
  M src/components/LoadedScanSummary.test.ts
  M src/components/LoadedScanSummary.tsx
  M src/components/TransferTable.tsx
  M src/components/WalletInput.tsx
  M src/components/WelcomeGuide.test.ts
  M src/components/WelcomeGuide.tsx
  M src/hooks/scanStreamClient.test.ts
  M src/hooks/scanStreamClient.ts
  M src/hooks/useWalletScanner.ts
  M src/lib/api/requestPolicy.test.ts
  M src/lib/api/requestPolicy.ts
  M src/lib/cache.test.ts
  M src/lib/cache.ts
  M src/lib/persistencePolicy.test.ts
  M src/lib/persistencePolicy.ts
  M src/lib/releaseConfiguration.test.ts
  M src/lib/services/batchScanService.ts
  M src/lib/services/scanService.test.ts
  M src/lib/services/scanService.ts
  M src/lib/services/walletHistoryService.test.ts
  M src/lib/services/walletHistoryService.ts
  M src/lib/types.ts
  M tailwind.config.ts
  ```

  Pre-existing untracked paths were `AUDIT_DEPLOYMENT_FIX_PLAN.md`, `UI_PERFORMANCE_OPTIMISATIONS.md`, `output/full-audit-2026-08-28/`, `src/app/fonts.ts`, `src/components/BackgroundNodes.tsx`, `src/components/CursorGlow.tsx`, `src/components/uiEffectRuntime.test.ts`, `src/components/uiEffectRuntime.ts`, `src/components/uiPerformance.test.ts`, `src/hooks/useAnimationVisibility.ts`, `src/lib/socialImageFonts.test.ts`, and `src/lib/socialImageFonts.ts`. No existing change was reset, discarded, or deployed. No application code was modified for R00.

Verification:

- `npm run verify`: **PASS** — lint, typecheck, `npm test` with **284/284 tests passed** (0 failed, skipped, cancelled, or todo), and production webpack build all passed.
- `git diff --check`: **PASS**.
- `npm audit --omit=dev`: **PASS** — 0 vulnerabilities. The first sandbox attempt could not resolve `registry.npmjs.org`; the same audit was rerun with approved network access and passed.
- Built app: `PORT=3011 npm start` served the local production build successfully. No provider-backed scan or cluster result was submitted.
- Baselines were regenerated with `output/full-audit-2026-08-28/measure.mjs` at `2026-08-31T08:15:56.095Z`. Results are local serial warm-request and asset measurements, not browser paint or production CWV measurements.

Fresh local reproduction:

- Scanner screenshots were captured at **320, 360, 390, 767, 768, 1280 and 1440px**. At every width, `document.scrollWidth === document.clientWidth` and the page-wide overflow check was false.
- **Confirmed:** F01 approval rows still render `HIGH-RISK SPENDERS` for 18 high-risk approval rows; F02 still uses the unbounded hero promise and `TOTAL ACTIVE PERMISSIONS`; F03 has four overlapping flow-graph node pairs in the saved Vitalik graph; F04 has the approximately 2.33:1 input placeholder contrast and a 9px amber `Observed history` gas label; F05 has missing selected-state semantics, a saved-summary scan-tab target count of zero, and focusable descendants inside an `aria-hidden` flow SVG.
- **Confirmed by source/runtime evidence:** F06 timeout handling races the work but does not cancel the underlying provider work after timeout; F07 `WebVitals` still writes metrics to `console.log` only; F08 the largest saved demo is 2,247,790 raw bytes / 358,017 gzip bytes and the measured initial scanner assets are 651,772 raw / 199,142 gzip JS, 59,222 raw / 11,500 gzip CSS, and 88,912 raw / 88,953 gzip fonts. No CPU, battery, FPS, or production latency claim is made.
- **Confirmed:** F09 filtering `risk` preserves the field and returns two topics, but the generic reporting-contract table remains ahead of the matching risk content; F10 cluster validation and mobile navigation pass, while no provider-free saved cluster result exists and the provider-backed result/graph states were not exercised; F11 the seven public content routes render locally and the local canonical fallback remains `http://localhost:3000` (not evidence of a production-domain defect); F12 an unknown route returns HTTP 404 with only the generic recovery message and footer links; F13 the repeated, heavy card hierarchy remains visible in fresh desktop/mobile screenshots.
- **Already resolved/pass:** invalid single-wallet input exposes an alert and `aria-invalid`; saved snapshots clearly state non-live/partial status and avoid provider calls; transfer search, clear, pagination, and empty Base state work; cluster duplicate/invalid validation disables submission with explanations; Escape closes mobile navigation and returns focus; Protocols clearly separates unclassified activity.
- No finding was marked `not reproducible`. Provider-backed scan, forced-provider-failure, production-domain, real-device, Safari, screen-reader, log-retention, and multi-process Redis behavior remain outside this provider-free local reproduction.

Artifacts: fresh route/asset measurements are in `output/full-audit-2026-08-28/metrics.json`; fresh screenshots and interaction evidence are in `output/playwright/r00-2026-08-31/`.

---

### R01 — Correct approval entities and evidence wording

Status: [x]  
Owner: Codex (implementation)  
Audit findings: F01, F02  
Release role: **blocker**

#### Current confirmed problem

`src/components/ApprovalAudit.tsx` calculates `highRisk` as the number of high-risk approval rows but labels the result **HIGH-RISK SPENDERS**. It also labels reconstructed approval history **TOTAL ACTIVE PERMISSIONS**. The analysis in `src/lib/analysis/approvals.ts` uses the latest observed `approve` transaction; it does not independently query current on-chain allowance.

#### R01 audit/reproduction evidence — 2026-09-01

- Current candidate: branch/ref `architecture-validation`, HEAD `5e7089c4fdc9b8969d07ef7822c43c28d56e4221`; Node `v22.22.3`; npm `10.9.8`; `package-lock.json` SHA-256 `84a60d8d4cc4a878f7fa44bf55bbd8f4f955421af7022595f901d0944ec0c987`. The worktree was already dirty before this task; existing changes were preserved. This task did not modify application code.
- Deterministic fixture check: `public/demo-wallets/vitalik-2026-08-26.json` SHA-256 `bd201a8634b095bd0219b013957244c565f6498113f3ab3417007bf296839081`; 2,233 approval rows total; 18 high-risk approval rows; 5 unique high-risk `(chainId, normalized spender)` pairs. The snapshot status is `partial`, with partial or unavailable transfer/price evidence on selected chains.
- Source/runtime reproduction: `ApprovalAudit` derives `highRisk` from `allApprovals.filter(...).length` and renders **HIGH-RISK SPENDERS**; it renders **TOTAL ACTIVE PERMISSIONS** for the observed row total. The analyzer sorts returned approval transactions newest-first and keeps one observed state per token/spender pair. The canonical reporting contract itself says “Latest observed approval state in returned history,” but the UI/docs still include active/current wording.
- Browser reproduction against `PORT=3011 npm start`: loaded the saved Vitalik snapshot without provider calls, selected `APPROVALS`, and observed `APPROVALS 2233`, **TOTAL ACTIVE PERMISSIONS 2233**, and **HIGH-RISK SPENDERS 18**. Fresh screenshots are `output/playwright/r01-2026-09-01/approval-1440.png` (1440×900) and `output/playwright/r01-2026-09-01/approval-390.png` (390×844).
- Verification: focused approval, analyzer, and reporting-contract tests passed **17/17**. The canonical `npm run verify` gate passed lint, generated-route typecheck, **284/284 tests**, and the production build. `git diff --check` passes on the final worktree after this documentation-only update.
- Result: F01 and F02 remain **confirmed**. R01 implementation and the required regression-fixture updates were not performed, per the explicit instruction not to modify application code; the R01 acceptance criteria therefore remain open.

#### R01 implementation evidence — 2026-09-01

- Approval metrics now use explicit observed-history entities: `OBSERVED APPROVALS`, `HIGH-RISK APPROVALS`, and `UNLIMITED APPROVALS`. The high-risk and unlimited values remain approval-row counts; no spender count was introduced or inferred.
- `src/lib/analysis/approvals.ts` now names the derived collection `observedApprovals` and documents the preserved `activeApprovals` API field as the latest non-revoked state reconstructed from returned history, not a live allowance verification. No RPC or provider call was added.
- README, methodology, risk-factor, and landing-copy wording now distinguish returned approval history from current token prices and verified current allowance. The canonical reporting contract keeps exposure provenance and complete/partial/unavailable behavior unchanged.
- Regression coverage passed **8/8** in `node --import tsx --test src/components/ApprovalAudit.test.ts`. The tests assert the saved Vitalik fixture contains 18 high-risk rows but only 5 unique chain/spender pairs, and cover repeated spenders on one chain plus the same spender across two chains.
- Clean `npm run verify` rerun passed: lint, generated-route typecheck, **286/286 tests**, and production webpack build. `git diff --check` passed.
- Browser smoke check used `PORT=3011 npm start` and the saved Vitalik snapshot only; no provider-backed scan was submitted. At 1440×900 and 390×844, the Approvals tab rendered `OBSERVED APPROVALS 2233`, `HIGH-RISK APPROVALS 18`, `UNLIMITED APPROVALS 2167`, and `OBSERVED ALLOWANCE`; the former labels were absent. Fresh post-fix screenshots are `output/playwright/r01-2026-09-01/approval-1440-after.png` and `output/playwright/r01-2026-09-01/approval-390-after.png`.
- Existing dirty worktree changes and prior audit artifacts were preserved. No deployment, push, reset, discard, or remote/cloud action was performed.
- Remaining limit: current allowance verification is still not implemented; the report remains an observed-history result and must not be treated as live on-chain allowance truth. Preview/production and provider-backed behavior remain unverified here.
- Result: F01/F02 are corrected for the implemented local candidate and R01 acceptance criteria are satisfied within the stated no-new-provider-call scope. R01 status is now `[x]`.

#### Required implementation

1. Use **Observed approvals** for the total unless current allowances are actually verified.
2. Prefer the minimal truthful correction **High-risk approvals** for the existing `highRisk` calculation.
3. If the product owner instead requires a spender count, create a separate typed metric that deduplicates by `chainId + normalized spender address`. Do not silently change the meaning of the existing row count.
4. Replace “active,” “current,” or “permission” claims wherever they are derived only from observed approval transactions.
5. Keep approval exposure provenance, partial-history state, unlimited-allowance state, and the documentation page consistent with the canonical reporting contract.
6. Do not add new RPC/provider calls as part of this copy-and-contract correction. Current-allowance verification would be a separately approved feature with cost and failure handling.

#### Likely files

- `src/components/ApprovalAudit.tsx`
- `src/components/ApprovalAudit.test.ts`
- `src/lib/analysis/approvals.ts`
- `src/lib/reportingContract.ts`
- `src/app/docs/page.tsx`
- `README.md`
- API/types only if the metric contract changes

#### Acceptance criteria

- A fixture with 18 high-risk approval rows and five unique chain/spender pairs cannot display “18 high-risk spenders.”
- The UI and docs clearly distinguish observed approval history from verified current allowance.
- Complete, partial, unavailable, zero/revoked, unlimited, and unknown states remain distinct.
- Focused tests cover repeated approvals to one spender across one chain and across multiple chains.
- Saved Vitalik approval screenshot is recaptured at 1440px and 390px.

---

### R02 — Correct the product promise and coverage copy

Status: [x]  
Owner: Codex  
Audit finding: F02  
Release role: **blocker**

#### Current confirmed problem

The hero promises “the complete story behind any crypto wallet,” while the implementation supports four EVM networks and can return partial or unavailable provider history.

#### Required implementation

1. Replace “complete story” and “any crypto wallet” with a promise bounded to observable activity on supported EVM networks.
2. Keep the hero useful and concise. Recommended direction:

   > Investigate observable activity across supported EVM networks.

   The exact final copy remains a product decision; it must mention or immediately connect to the four-network scope.
3. Ensure saved snapshots, fresh scans, documentation, SEO descriptions, and result-state caveats do not contradict one another.
4. Do not weaken existing partial/unavailable warnings.

#### Likely files

- `src/app/page.tsx`
- `src/lib/seo.ts`
- `src/app/docs/page.tsx`
- `README.md`
- relevant content/SEO regression tests

#### Acceptance criteria

- A first-time user can identify the supported network scope without opening documentation.
- No public heading promises universal wallet coverage or guaranteed completeness.
- Search metadata remains specific and readable rather than keyword-stuffed.
- Desktop and mobile hero wrapping is checked at all R00 widths.

---

### R03 — Repair critical accessibility and contrast

Status: [x]  
Owner: Codex  
Audit findings: F04, F05  
Release role: **blocker**

#### Required implementation

1. **Wallet field:** add a persistent visible label or equally clear visible field name. Do not rely on the placeholder as the only instruction. Increase placeholder contrast from the measured ~2.3:1 to at least 4.5:1 when it communicates meaningful instructions.
2. **Gas provenance:** replace the 9px amber “Observed history” treatment with readable normal text using an existing high-contrast token. Verify at least 4.5:1 against the rendered background.
3. **Transfer filters:** expose selection using `aria-pressed` for toggle buttons, or use an equivalent native radio/tab pattern. Visual selection and programmatic selection must agree.
4. **Scan mode panels:** ensure each `aria-controls` points to exactly one stable element in editor and loaded-summary states. Do not introduce duplicate IDs. Prefer wrapping `LoadedScanSummary` in the selected `tabpanel` rather than rendering a disconnected placeholder.
5. **Full-address disclosure:** keep the controlled target stable while collapsed if `aria-controls` is used, and expose expanded state.
6. **Keyboard behavior:** verify logical order, visible focus, Enter/Space behavior, Escape return for mobile navigation, search-clear focus restoration, and horizontal regions.
7. Preserve the existing 44px mobile target contract. Desktop secondary controls may remain 36px where already approved.

#### Likely files

- `src/components/WalletInput.tsx`
- `src/components/GasSummaryPanel.tsx`
- `src/components/TransferTable.tsx`
- `src/components/LoadedScanSummary.tsx`
- `src/app/page.tsx`
- relevant component tests and shared accessibility tests

#### Acceptance criteria

- Meaningful normal text meets 4.5:1 contrast in default, hover, focus, disabled, error and loading states.
- Direction and network filters announce their selected state.
- Every `aria-controls` reference resolves to exactly one element in every scan-mode state.
- There is no focusable descendant inside an `aria-hidden="true"` ancestor.
- Keyboard-only checks pass at desktop and mobile layouts.
- Run at least one real screen-reader smoke check before public production; record browser, screen reader and tested path. This does not constitute full WCAG certification.

#### R03 implementation evidence — 2026-09-01

- Files changed for R03: `src/components/WalletInput.tsx`, `src/components/GasSummaryPanel.tsx`, `src/components/Dashboard.tsx`, `src/components/TransferTable.tsx`, `src/components/LoadedScanSummary.tsx`, `src/app/page.tsx`, `src/components/CapitalFlowGraph.tsx`, `src/components/r03Accessibility.test.ts`, and the related graph-label assertion in `src/components/p3Accessibility.test.ts`. Existing dirty worktree changes were preserved; graph collision/layout work remains R04 scope.
- Contrast implementation: the wallet field now has the visible **Wallet address or ENS domain** label and `#4b5563` placeholder; observed-history provenance is readable 12px `#4b5563`; invalid-input copy uses `#991b1b`; loading-state filter opacity no longer weakens disabled text.
- Semantics implementation: transfer direction and desktop network toggles expose `aria-pressed`; scan-mode panels are single stable hidden/shown `tabpanel` targets; the full-address disclosure target remains in the DOM with `aria-expanded`; the graph SVG is decorative and non-focusable, with 23-row accessible HTML graph data and explorer links adjacent to it.
- Regression coverage: the R03/component focused suite passed **65/65**; the final post-contrast-token targeted retest passed **14/14**. The canonical `npm run verify` gate passed lint, generated-route typecheck, **295/295 tests**, and the production webpack build. `git diff --check` passes.
- Browser evidence used the local production server (`PORT=3011 npm start`) at 390×844 and 1440×900. The scanner had no horizontal overflow at either width. The saved Vitalik path verified the unique scan-mode targets, full-address expansion, gas provenance, transfer filter state (`Inbound` announced `[pressed]`), graph accessibility disclosure, and no focusable descendants inside `svg[aria-hidden="true"]`.
- Rendered browser measurements: placeholder `#4b5563` on `#f4f5f8` measured **6.93:1**; visible label `#4b5563` on the page surface `#ebebeb` measured **6.34:1**; gas provenance rendered at **12px** in `#4b5563`; invalid input rendered `#991b1b` with `aria-invalid="true"` and `aria-describedby="wallet-address-error"`.
- Keyboard/browser checks: `ArrowRight` moved from Single wallet to Cluster scan; mobile navigation closed on `Escape`; clearing transfer search restored focus to `#transfer-search`. In the saved-result DOM, each checked `aria-controls` reference resolved to exactly one target, and the decorative graph SVG contained **0** focusable descendants while its accessible disclosure contained **23 rows and 23 explorer links**.
- Screenshots/artifacts: `output/playwright/r03-2026-09-01/scanner-final-390.png`, `output/playwright/r03-2026-09-01/scanner-final-1440.png`, `output/playwright/r03-2026-09-01/flow-final-390.png`, plus the Playwright snapshots and console logs under `.playwright-cli/`.
- No provider-backed scan, Preview, deployment, push, reset, discard, or remote/cloud action was performed. The browser checks used saved/static demo content and local validation only.
- Remaining release limit: a real screen-reader smoke check was not available in this environment, so the R03 pre-production screen-reader step remains mandatory. The local accessibility-tree and keyboard evidence is not a screen-reader certification; Preview/production behavior remains unverified.
- Result: F04/F05 are corrected in the local candidate and R03 implementation status is now `[x]`; the overall release remains **NO-GO** until the documented screen-reader and later Preview/production gates are completed.

---

### R04 — Make capital-flow inspection readable and accessible

Status: [x]  
Owner: unassigned  
Audit findings: F03, F05  
Release role: **blocker if the collision and hidden controls reproduce**

#### Required implementation

1. Reproduce the 23-node saved fixture from screenshot 04 at 1440px, 768px and inside the 390px graph scroller.
2. Separate protocol, counterparty, inflow, outflow and center-wallet placement into reserved lanes or apply deterministic collision clearance.
3. Keep all nodes within the graph viewBox and preserve readable connector direction.
4. Do not leave focusable `<g>` elements inside an `aria-hidden="true"` SVG.
5. Preferred accessibility model: keep the decorative SVG hidden and provide the same inspect/select actions as named HTML buttons or a list adjacent to the graph. If the SVG itself is exposed instead, every interactive node needs a meaningful accessible name, correct keyboard semantics and equivalent Enter/Space behavior.
6. Preserve the existing textual data summary and partial/unpriced provenance.
7. Avoid introducing continuous layout work during pan/zoom. Throttle pointer-driven rendering to animation frames if state updates are required.

#### Likely files

- `src/components/CapitalFlowGraph.tsx`
- `src/components/CapitalFlowGraph.test.ts`
- `src/components/CapitalFlowGraph.test.tsx`
- graph layout helpers if extracted

#### Acceptance criteria

- No node-box intersections in the accepted saved fixture at the three required widths.
- Long addresses and protocol names remain inspectable.
- Every graph action is usable and named without relying on mouse hover.
- Tab order contains no hidden SVG descendants.
- Before/after screenshots and keyboard evidence are recorded.

---

### R05 — Cancel timed-out and disconnected provider work

Status: [x]  
Owner: Codex  
Audit finding: F06  
Release role: **blocker**

#### Current confirmed problem

`runWithTimeout` races a promise against a timer. The losing provider promise is not canceled by the helper. The scan route must also propagate request disconnection/deadline cancellation through the service and provider stack.

#### Required implementation

1. Create one request-scoped `AbortController` per scan or batch request.
2. Combine the request/disconnect signal with the work-budget deadline using the current runtime-supported abort APIs.
3. Pass the signal through scan services, concurrency helpers, explorer/RPC/price provider clients and every cancellable `fetch`.
4. Stop scheduling new batch items after abort. Let already-started operations settle safely without releasing concurrency accounting early.
5. Map deadline, caller disconnect and upstream abort to truthful internal/log states. Do not attempt to write a response after a disconnected client.
6. Preserve deterministic 4xx/429/504 behavior where a response can still be sent.
7. Do not cache aborted, timed-out or partial work as complete.

#### Likely files

- `src/lib/api/requestPolicy.ts`
- `src/app/api/scan/route.ts`
- `src/app/api/batch-scan/route.ts`
- `src/lib/services/scanService.ts`
- `src/lib/services/batchScanService.ts`
- provider clients and focused tests

#### Acceptance criteria

- A mocked deadline produces no further provider request after cancellation.
- A mocked client disconnect stops new batch scheduling.
- Slots are released exactly once and only when work actually settles.
- Aborted results never overwrite a previous complete cache entry.
- Telemetry distinguishes deadline, disconnect and provider failure without logging wallet addresses or secrets.
- Worst-case function duration and memory are measured again after this change.

#### R05 implementation evidence — 2026-09-01

- Candidate: branch/ref `architecture-validation`, HEAD `5e7089c4fdc9b8969d07ef7822c43c28d56e4221`; Node `v22.22.3`; npm `10.9.8`. The worktree was already dirty before R05; existing user changes and artifacts were preserved.
- Files changed for R05: `src/lib/cancellation.ts`, the scan and batch API routes, request policy/telemetry, scan and batch services, wallet-history orchestration, explorer/RPC/Moralis/price/identity/ENS/Sybil clients, and focused tests for request policy, cache, explorer, and Moralis cancellation. No UI or deployment code was changed.
- Cancellation behavior: each scan/batch request now combines the incoming request signal with an internal deadline signal; provider fetches, retry delays, rate-limit waits, shared-cache calls, and batch mappers receive that signal. Timed-out work is aborted, late underlying work keeps slot accounting until it settles, and new batch items are not claimed after abort.
- Truthfulness and cache boundary: deadline returns the existing HTTP 504 policy error where the response can be sent; caller disconnect returns an empty HTTP 499 response and suppresses NDJSON writes; upstream provider timeouts remain provider availability errors. Complete report/history cache writes are guarded after provider work and never occur for aborted or partial results. Telemetry uses aggregate counts and cancellation/failure codes only; it does not log wallet addresses or secrets.
- Focused tests: `node --import tsx --test src/lib/api/requestPolicy.test.ts src/lib/cache.test.ts src/lib/etherscan.test.ts src/lib/moralis.test.ts src/lib/prices.test.ts src/lib/services/walletHistoryService.test.ts src/lib/services/batchScanService.test.ts` — **60/60 passed**. Coverage includes deadline abort, disconnect propagation, stop-scheduling, explorer no-more-request behavior, Moralis cancellation, slot-safe completion, and protection of a previous complete cache entry. Route cancellation coverage also passed in `src/app/api/__tests__/routes.test.ts`.
- Local cancellation stress measurement: a mocked 10-wallet × 4-chain batch with provider requests held for 1 second was cancelled by the request signal; the route returned HTTP 499 in **29.03ms** with a post-GC heap delta of **725,744 bytes**. This is a bounded local mock measurement, not a claim about real provider latency or Vercel resource limits.
- Verification: final `npm run verify` passed — lint, generated-route typecheck, **303/303 tests**, and the production webpack build. The post-fix focused R05 suite passed **60/60**, and the focused API-route run passed **52/52**. Final `git diff --check` also passes after this evidence update.
- Provider/cloud actions: none. No live provider scan, Preview, deployment, push, reset, discard, or production action was performed.
- Remaining limit: the mocked duration/heap result does not establish deployed worst-case function capacity, real provider cancellation behavior, or runtime termination after disconnect. Those remain Preview/production and R12/R07 operational gates; overall release verdict remains **NO-GO**.
- Result: R05 implementation and local acceptance regressions are complete; status changed to `[x]` by Codex, 2026-09-01.

---

### R06 — Reproduce and resolve the server `NoFallbackError`

Status: [x]  
Owner: Codex  
Audit runtime note  
Release role: **blocker until explained**

#### Instructions

1. Run a fresh production build and start it with output captured to a dedicated log.
2. Request each static route, each generated image/metadata route, an intentional unknown route, and saved-demo assets one at a time.
3. Correlate every request with timestamp/status and identify which request, if any, produces `Internal: NoFallbackError`.
4. Determine whether the message is expected framework behavior, an application routing defect, or stale build/process state. Read the bundled Next.js 16 documentation and inspect the generated stack before changing code.
5. Add a regression at the smallest reliable seam. Do not silence the log without understanding the cause.

#### Acceptance criteria

- A documented reproduction identifies the triggering request, or a controlled rerun demonstrates the warning was stale/non-reproducible.
- Normal 404 handling returns the intended status/page without an internal server error.
- Production smoke logs contain no unexplained internal errors.

#### R06 implementation evidence — 2026-09-01

- Candidate: branch/ref `architecture-validation` / HEAD `5e7089c4fdc9b8969d07ef7822c43c28d56e4221`; Node `v22.22.3`; Next.js `16.3.1`. The worktree was already dirty before R06; unrelated changes and artifacts were preserved.
- Reproduction: after a fresh `npm run build`, `PORT=3013 npm start` was started with output captured in `output/playwright/r06-2026-09-01/server.log`. A sequential request matrix covered `/`, `/docs`, all five generated SEO slugs, `/opengraph-image`, `/twitter-image`, `/favicon.ico`, `/robots.txt`, `/sitemap.xml`, `/does-not-exist`, and all four saved-demo JSON assets. Every expected route returned HTTP 200; `/does-not-exist` returned HTTP 404, and that request was followed by `Internal: NoFallbackError` in the server log.
- Cause: the fresh `.next/prerender-manifest.json` declared `/[slug]` with `fallback: false`, matching `src/app/[slug]/page.tsx`'s `dynamicParams = false`. Next.js 16.3.1 throws its internal `NoFallbackError` sentinel before the page's `notFound()` branch can handle an unknown slug. The installed Next.js source confirms this is framework control flow for a static route without a fallback, but the direct `next start` path logged it as an unexplained server error.
- Fix: `src/app/[slug]/page.tsx` now sets `dynamicParams = true`. `generateStaticParams()` still prerenders the five known SEO pages, while an unknown one-segment slug reaches the existing explicit `notFound()` branch. `src/app/seoLandingRoute.test.ts` locks this routing contract.
- Post-fix verification: a fresh rebuild and the same sequential matrix returned HTTP 200 for every expected route/asset and HTTP 404 for `/does-not-exist`. The 404 body contained neither `NoFallbackError` nor internal-server text. `output/playwright/r06-2026-09-01/server-after.log` contains only startup/readiness output; an error scan found no error lines.
- Focused regression: `node --import tsx --test src/app/seoLandingRoute.test.ts` — **1/1 passed**. No provider-backed scan, Preview, deployment, push, reset, discard, or remote/cloud action was performed.
- Result: the warning is explained as the static-only dynamic-route fallback path, and the local production smoke no longer emits it. Status changed to `[x]` by Codex, 2026-09-01. Preview/production logs remain a separate R12 gate.

---

### R07 — Establish performance measurement and budgets

Status: [~]  
Owner: Codex (local implementation); release operator (Preview/field gates)  
Audit findings: F07, F08  
Release role: **Preview blocker**

#### Required implementation

1. Replace console-only Web Vitals handling with an explicitly approved monitoring destination, or remove the claim that field performance is monitored. Do not send wallet addresses, query strings, ENS names, full URLs containing targets, provider credentials, or raw scan results.
2. Record only the route template, device category, metric name/value/rating, app version and an anonymous event ID required for deduplication.
3. Document retention, access, sampling and deletion for performance telemetry.
4. Run three cold mobile and three cold desktop Lighthouse profiles against the immutable Preview. Report individual runs and the median; do not report only the best run.
5. Use these acceptance budgets:

   - Preview lab LCP: ≤2.5s
   - Preview lab CLS: ≤0.1
   - No severe main-thread blocking or long task left unexplained
   - Scanner initial JS gzip: no more than 5% above the verified candidate baseline without an approved reason
   - CSS and font assets: no more than 5% above the verified candidate baseline without an approved reason
   - Saved Vitalik payload: no larger than its verified candidate baseline without an approved reason

6. INP is a field metric, not something to certify from a single Lighthouse load. After enough real traffic exists, require p75 LCP ≤2.5s, INP ≤200ms and CLS ≤0.1, separated by mobile and desktop.
7. Profile saved-demo parse/render, first dashboard render, heavy tab opening, graph interaction and reduced-motion behavior on a lower-powered mobile device or representative throttled profile.
8. Optimize only a measured bottleneck. Preserve current lazy dashboard/tab loading and UI-effect pausing.

#### Likely files

- `src/components/WebVitals.tsx`
- monitoring/API integration selected by the product owner
- telemetry privacy tests
- `docs/deployment_runbook.md`
- performance evidence under `output/`

#### Acceptance criteria

- Performance numbers are reproducible and tied to one immutable candidate.
- Lab and field data are labeled separately.
- No sensitive wallet target is present in telemetry payloads or logs.
- Performance failure has a named owner and blocks promotion until waived by the product owner with a recorded reason.

#### R07 implementation evidence — 2026-09-01

- Privacy-safe telemetry is implemented in `src/components/WebVitals.tsx`,
  `src/lib/performanceTelemetry.ts`, and `src/app/api/web-vitals/route.ts`.
  The client sends a 10% sample to the same-origin endpoint using
  `sendBeacon` with a `fetch(..., { keepalive: true })` fallback. The callback
  reference is stable and the route template is derived from `usePathname()`;
  query strings are never read or sent.
- The endpoint accepts exactly `eventId`, `routeTemplate`, `deviceCategory`,
  `metricName`, `value`, `rating`, and `appVersion`. It rejects unknown fields,
  target-bearing values, invalid metric ranges, malformed JSON, and bodies over
  2 KiB without logging payload contents. It emits one `wallet_web_vital`
  structured event for the approved Vercel Observability destination.
- Retention, access, 10% sampling, deletion/expiry, lab procedure, field-vs-lab
  separation, and the LCP/INP/CLS plus asset budgets are documented in
  `docs/performance-budget.md` and `docs/deployment_runbook.md`.
- Focused tests passed **6/6** across `src/components/WebVitals.test.ts`,
  `src/lib/performanceTelemetry.test.ts`, and
  `src/app/api/__tests__/webVitals.test.ts`.
- Local production build browser evidence is recorded in
  `output/playwright/r07-2026-09-01/verification.md`. Three 390×844 and three
  1440×900 unthrottled HeadlessChrome runs observed median LCP of 240ms and
  80ms respectively, CLS 0 in all runs, and no observed long tasks. These are
  local browser observations, not Lighthouse, physical-device, Preview, or
  field certification.
- The R07 asset measurement rerun recorded scanner initial JavaScript at
  **199,897 gzip bytes** (+0.38% vs the R00 199,142-byte baseline), CSS at
  **11,509 gzip bytes** (+0.08% vs 11,500), fonts unchanged at **88,953 gzip
  bytes**, and the Vitalik snapshot unchanged at **358,017 gzip bytes**.
- No provider-backed scan, Vercel Preview, deployment, production action,
  remote configuration, push, reset, discard, or cloud retention change was
  performed.
- Result: the local R07 implementation and regression evidence are complete,
  but status remains `[~]` until the release operator runs the six required
  Lighthouse profiles against one immutable Preview, verifies Observability
  retention/access/deletion and alerts, and records the field-data gate. The
  overall release remains **NO-GO**.

---

### R08 — Improve the documentation answer path

Status: [x]  
Owner: Codex  
Audit finding: F09  
Release role: **required for a public release**

#### Required implementation

1. Keep the full canonical reporting contract available.
2. Add a short plain-language overview before the contract table.
3. Move the detailed contract behind a clear disclosure or dedicated section if this improves direct access without hiding definitions.
4. When a user filters topics, place matching topic content before the generic table or provide a direct jump to the first match.
5. Preserve the current mobile disclosure/navigation and stable focus behavior.
6. Mark performance figures such as “~0.01 ms” or “800K+” as illustrative unless a reproducible benchmark/data version supports them.

#### Acceptance criteria

- On a 390px viewport, searching “risk” reaches the first relevant explanation without scrolling past an unrelated long table.
- Filter clearing restores the complete structure and preserves focus.
- Direct topic anchors, keyboard navigation and desktop sidebar behavior still work.
- Canonical metric definitions remain searchable and linkable.

#### R08 implementation evidence — 2026-09-01

- `src/app/docs/page.tsx` now presents the methodology topics before the full canonical reporting contract. The contract remains in the documentation index and is rendered in full in a dedicated section with a plain-language overview, a labelled keyboard-reachable table region, and stable `metric-*` row anchors for exact field links.
- Topic filtering now schedules a first-match jump with `requestAnimationFrame`, respects reduced motion, cancels a superseded jump, and leaves the filter textbox focused. Clearing the filter still restores all **11** topic links and returns focus to the textbox. The existing mobile native disclosure, mobile topic jump, hash anchors, and desktop sidebar remain in place.
- Unbenchmarked cache scale and lookup timing are marked illustrative in the docs page and complexity section. The public README timing claim is qualified as illustrative and not a reproducible benchmark or production latency guarantee.
- Browser evidence against the freshly built local production server (`PORT=3015 npm start`), with no wallet/provider scan: at **390×844**, entering `risk` left `docs-topic-filter` focused and placed `#risk-score-engine` at the viewport top (`riskTop: 0`), with the reporting contract below it. Clearing produced an empty query, focus on `docs-topic-filter`, **11** desktop topic links, the full contract section, and **13** metric row anchors. A direct `#risk-score-engine` anchor resolved without page-wide overflow; at the desktop viewport the sidebar was visible with **11** topic links and all **13** contract rows were present.
- Verification: focused docs/navigation/accessibility checks passed **28/28**; the canonical `npm run verify` gate passed lint, generated-route typecheck, **311/311 tests**, and the production webpack build. `git diff --check` passed. The candidate worktree was already dirty before R08; no unrelated changes were reset, discarded, deployed, or pushed.
- Result: R08 local implementation and acceptance criteria are satisfied. Preview/production, real-device, Safari, screen-reader, and provider-backed behavior remain separate release gates; the overall release remains **NO-GO** while R10–R12 are incomplete.

---

### R09 — Make cluster sample and graph input behavior truthful

Status: [x]  
Owner: Codex  
Audit finding: F10  
Release role: **required for a public cluster claim**

#### Required implementation

1. Rename “Load Sample Cluster” to make clear that it only fills sample addresses, unless a real saved, dated, non-live cluster result is added.
2. Preferred product improvement: add one static provider-free cluster snapshot that uses the same truthfulness rules as single-wallet demos. Keep fresh scan as a separate action.
3. Preserve duplicate/invalid-address explanations and the 10-wallet maximum.
4. Stop capturing ordinary wheel scrolling for graph zoom. Use explicit zoom controls or a documented modifier gesture.
5. Use Pointer Events for pan where needed, with touch/pen support and keyboard-accessible alternatives.
6. Verify empty, partial, failed-wallet and no-link cluster states. A no-link result must not imply a rendering error.

#### Likely files

- `src/components/BulkScanInput.tsx`
- `src/components/ClusterFlowGraph.tsx`
- saved-demo assets/loader only if the static snapshot is approved
- relevant tests and documentation

#### Acceptance criteria

- Users can distinguish sample input, saved result and live scan.
- Ordinary page scrolling is not intercepted by the cluster graph.
- Touch, pen, mouse and keyboard users can inspect the graph.
- A provider-free result path covers cluster result states before Preview provider spending.

#### Completion evidence (2026-09-01)

- Implemented separate `Fill Sample Addresses (4)` and `Load Saved Cluster Example` actions, with a dated provider-free cluster fixture and an explicit fresh-scan action. Editing cluster input clears the prior result and removes the saved-example URL marker.
- The saved example labels unmodeled activity, risk, Sybil, gas and inflow values as `N/A` or `Not modeled`; no-link output states that wallet nodes remain mapped and does not claim wallet independence.
- The graph uses Pointer Events with vertical touch support, explicit keyboard-reachable zoom controls, and native page scrolling. Ordinary wheel scrolling over the graph was verified to advance page scroll.
- Verification: `npm run verify` passed with **318/318 tests**, typecheck and production build; final R09-focused checks passed **22/22**; `git diff --check` passed.
- Browser evidence: local `next start` checks at desktop and **390×844** mobile covered the saved cluster path, duplicate/invalid input feedback, no-link graph state, keyboard zoom, and native scrolling. Artifacts: `output/playwright/r09-2026-09-01/`.
- Scope limit: local evidence only. No Preview, production, live-provider, deployment or push verification was performed.

---

### R10 — Verify SEO, recovery, security and privacy

Status: [x] local implementation and verification complete; Preview/production gates remain open  
Owner: Codex  
Audit findings: F11, F12 and technical observations  
Release role: **Preview blocker**

#### Required implementation and verification

1. Add a small branded not-found page with immediate **Return to scanner** and **Read methodology** actions. Preserve correct HTTP 404 behavior.
2. Configure `SITE_URL` to the intended HTTPS production origin in Preview/Production scopes as appropriate.
3. Verify canonical URLs, sitemap, robots host/rules, Open Graph image, Twitter image, favicon, five topic pages, docs metadata and JSON-LD on Preview.
4. Verify the production Content Security Policy and all headers in `next.config.ts`; do not mark the header gate complete from source alone.
5. Evaluate nonce/hash CSP hardening separately. Do not break Next.js rendering merely to remove `'unsafe-inline'` without a tested migration.
6. Confirm no `X-Powered-By` header, no public secret, no client-supplied provider key, and no address/ENS/raw-query logging.
7. Confirm the privacy/retention description matches actual Vercel logs, monitoring and Redis configuration.
8. Run a bounded forced-provider-failure flow and confirm explicit partial/unavailable UI rather than a normal clean dashboard.

#### Acceptance criteria

- Every public route has the intended HTTPS canonical URL and unique metadata.
- Invalid URLs show useful recovery and return HTTP 404.
- Required security headers are present on HTML, static assets and API responses where intended.
- Preview logs contain request IDs and aggregate statuses, but no wallet address, ENS target, secret or raw scan response.
- Provider failure is visible and testable in the browser.

#### Completion evidence (2026-09-02)

- Agent/owner: Codex
- Candidate branch/ref and SHA: `architecture-validation` / `5e7089c4fdc9b8969d07ef7822c43c28d56e4221` (existing dirty worktree preserved)
- Files changed: `AUDIT_DEPLOYMENT_FIX_PLAN.md`, `src/app/not-found.tsx`, `src/app/notFound.test.ts`, `src/app/r10Routes.test.ts`, `src/components/DashboardStatusPanel.test.ts`, and `output/playwright/r10-2026-09-02/` evidence artifacts.
- Focused tests: `node --import tsx --test src/app/notFound.test.ts src/app/r10Routes.test.ts src/components/DashboardStatusPanel.test.ts src/lib/seo.test.ts src/app/api/__tests__/webVitals.test.ts src/lib/api/requestTelemetry.test.ts src/lib/persistencePolicy.test.ts` — **14/14 passed**.
- `npm run verify` result and test count: **PASS** — lint completed with 0 errors (the command reports pre-existing warnings from untracked `.playwright-cli` trace resources), typecheck passed, **323/323 tests**, and production webpack build passed.
- HTTPS-origin build: `SITE_URL=https://wallet.example npm run build` — **PASS**. `wallet.example` is a local placeholder used to prove origin propagation; it is not the production domain.
- Browser/HTTP evidence: local `next start` at `SITE_URL=https://wallet.example PORT=3020` verified all seven public pages with HTTP 200, unique titles, HTTPS canonicals, descriptions, OG/Twitter image metadata, and JSON-LD; `/does-not-exist` returned HTTP 404 with Return to scanner and Read methodology and no `NoFallbackError`; robots and sitemap exposed the HTTPS host and seven HTTPS URLs; OG/Twitter/favicon assets returned valid content types and non-zero bytes; required security headers were present on HTML, static image, and API responses with no `X-Powered-By`.
- Privacy/failure evidence: synthetic local Web Vital telemetry produced only an allowlisted aggregate event in the server log and omitted the query wallet address; focused telemetry/persistence tests passed; the new dashboard regression keeps an unavailable provider result visibly unavailable with provider warning details and no fabricated clean conclusion. No live/provider-backed scan was submitted.
- Screenshots/artifacts: `output/playwright/r10-2026-09-02/not-found-1440.png`, `output/playwright/r10-2026-09-02/not-found-390.png`, and `output/playwright/r10-2026-09-02/verification.md`.
- Provider/cloud actions performed, if explicitly authorized: none. No Vercel Preview, deployment, production log/monitoring review, Redis/WAF verification, push, reset, discard, or external message was performed.
- Remaining limits or follow-up: set the actual HTTPS `SITE_URL` in Vercel Preview/Production, rerun the Preview header/metadata/asset/log matrix, verify retention/monitoring/Redis/WAF behavior, and run the bounded forced-provider-failure browser flow. Current CSP retains `'unsafe-inline'`/development `'unsafe-eval'`; nonce/hash hardening remains a separate tested-migration decision. Overall release remains **NO-GO** until Preview/production gates pass.
- Status changed to `[x]` for local implementation/evidence by: Codex, 2026-09-02. Preview/production gates remain intentionally open.

---

### R11 — Reduce visual competition without redesigning

Status: [x] local implementation and evidence complete; screenshot approval remains required before merge
Owner: Codex
Audit finding: F13  
Release role: **optional pre-release polish**

#### Required direction

1. Keep the four saved-demo cards and the current font pair.
2. Put shared saved/non-live/provider wording once above the cards where possible.
3. Shorten repeated card descriptions while preserving identity, date and non-live status.
4. Reserve the strongest shadow/elevation for primary actions and selected controls.
5. Keep the whole card as one semantic action; do not create nested controls.
6. Do not introduce a new palette, rounded-card system, global dark mode, font family or hero composition under this task.

#### Acceptance criteria

- Card action, dates, saved/non-live status and fresh-scan distinction remain clear.
- Visual hierarchy is easier to scan at 1440px and 390px.
- No new overflow, wrapping regression or lost caveat.
- Product owner approves before/after screenshots before merge.

---

### R12 — Complete Preview and production gates

Status: [ ]  
Owner: release operator  
Release role: **final blocker**

This task must follow `docs/deployment_runbook.md`; it does not authorize deployment by itself.

#### Vercel configuration gates

- [ ] Provider secrets configured only as encrypted server-side variables with correct scopes.
- [ ] `SITE_URL` configured for the intended canonical origin.
- [ ] Upstash Redis cache and quota behavior verified using two separate processes with real credentials.
- [ ] Deployment-wide WAF/rate-limit rules configured and verified for `/api/scan` and `/api/batch-scan`.
- [ ] Worst-case bounded single and 10-wallet cluster function duration and memory measured within the selected Vercel limits.
- [ ] Monitoring and alerts configured for 5xx, timeout, provider failure, partial/unavailable rate, p95 duration and resource exhaustion.
- [ ] Security headers verified on the deployed Preview.
- [ ] License, README clone URL, production assets and metadata verified.

#### Preview smoke gates

- [ ] Immutable Preview URL and candidate SHA recorded.
- [ ] `/`, `/docs`, five topic routes and an unknown route checked.
- [ ] Saved single-wallet snapshot checked without provider calls.
- [ ] Authorized fresh single-wallet scan checked for complete/partial/unavailable truthfulness.
- [ ] Authorized 2–4 wallet cluster checked, including failed-wallet reporting.
- [ ] 10-wallet validation accepted and 11-wallet request rejected before provider work.
- [ ] Known-wallet write attempt returns 405 with no mutation.
- [ ] Bounded WAF test returns 429 without disrupting unrelated page loads.
- [ ] Forced provider failure renders the expected browser state.
- [ ] Mobile/desktop Lighthouse evidence and performance trace recorded.
- [ ] Safari/iOS and one screen-reader critical-path smoke completed.
- [ ] Logs reviewed for errors, secrets, wallet addresses and unexplained `NoFallbackError`.

#### Promotion gates

- [ ] Last-known-good immutable production deployment URL and SHA recorded.
- [ ] Rollback operator and procedure confirmed.
- [ ] All required tasks in this plan marked complete with evidence.
- [ ] All required open boxes in `crutial_fixes.md` closed with current evidence.
- [ ] User explicitly authorizes promotion.
- [ ] Production smoke is repeated immediately after promotion.

## 5. Required test matrix

| Area | Required states |
| --- | --- |
| Single scanner | empty, invalid, valid, loading, complete, partial, unavailable, saved/non-live, refresh-limited |
| Approvals | none, observed, revoked, repeated spender, high risk, unlimited, exposure unavailable |
| Transfers | search hit/miss, clear, direction filters, every network, pagination, keyboard state |
| Capital flow | dense saved fixture, long labels, unpriced legs, partial data, keyboard inspector |
| Cluster | duplicate, invalid, 10 wallets, 11 wallets, no link, partial wallet, provider failure |
| Responsive | 320, 360, 390, 767, 768, 1280, 1440px; 200% zoom where practical |
| Motion/input | reduced motion, keyboard, mouse, touch, pen where available |
| Docs/SEO | filter, clear, anchors, canonical, robots, sitemap, JSON-LD, share images |
| Operations | deadline, disconnect, 429, 504, upstream failure, Redis unavailable, cache expiry |
| Privacy | no target/secret in browser telemetry, server logs, error messages or client bundle |

## 6. Proposed performance acceptance policy

These thresholds are release guidance, not measurements from the audit:

| Metric | Preview acceptance | Production acceptance |
| --- | --- | --- |
| LCP | Median of three controlled cold runs ≤2.5s, with all runs recorded | p75 ≤2.5s by mobile and desktop |
| INP | Not certified by a load-only Lighthouse run; manually profile key interactions | p75 ≤200ms by mobile and desktop |
| CLS | Median of three controlled cold runs ≤0.1, with all runs recorded | p75 ≤0.1 by mobile and desktop |
| Initial route assets | No unexplained >5% regression from the R00 candidate | Monitor releases and cache behavior |
| Saved-demo load | No unexplained parse/render long task; provenance retained | Monitor error and time-to-result distributions |
| Scan functions | Worst-case bounded request fits configured duration/memory | Alert on p95 duration, timeout and resource exhaustion |

Do not combine mobile and desktop field results. Do not use the best Lighthouse run as the reported result. Real-user Web Vitals need traffic over time and are therefore a controlled-beta/post-launch gate, not something that can truthfully be proven before the first visit.

## 7. Go/no-go decision record

Use this table to summarize the current candidate. Preview and production rows remain pending until R12 evidence is recorded. Any unresolved blocker means **NO-GO**.

| Gate | Status | Evidence link or reason |
| --- | --- | --- |
| Reporting truthfulness | Complete locally | R01–R02 implementation and local evidence |
| Accessibility and graph usability | In progress — screen-reader smoke pending | R03–R04 local evidence; no real screen-reader run yet |
| Timeout/disconnect cancellation | Complete locally | R05 implementation and local evidence |
| Server error explanation | Complete locally | R06 implementation and local evidence |
| Performance baseline and privacy-safe monitoring | In progress — Preview/field gates pending | R07 local implementation and evidence |
| Docs, cluster and recovery | Complete locally | R08–R10 implementation and local evidence |
| Saved-demo visual hierarchy | Complete locally — screenshot approval pending | R11 optional polish; local evidence |
| Canonical local verification | Complete locally | `npm run verify`; `git diff --check` |
| Vercel environment and abuse controls | Pending | R12 configuration evidence |
| Preview browser/provider/security checks | Pending | R12 Preview evidence |
| Rollback target and operator | Pending | Deployment runbook record |
| Product-owner production authorization | Pending | Explicit approval required |

Final verdict: **NO-GO until all blocker rows are complete.**

## 8. Evidence Log

Append one entry per completed task. Do not replace earlier evidence silently.

```markdown
### YYYY-MM-DD — RXX — Short title

- Agent/owner:
- Candidate branch/ref and SHA:
- Files changed:
- Focused tests:
- `npm run verify` result and test count:
- `git diff --check` result:
- Browser widths/states checked:
- Screenshots/artifacts:
- Provider/cloud actions performed, if explicitly authorized:
- Remaining limits or follow-up:
- Status changed to `[x]` by:
```

### 2026-08-31 — R00 — Candidate baseline and fresh reproduction

- Agent/owner: Codex
- Candidate branch/ref and SHA: `architecture-validation` / `5e7089c4fdc9b8969d07ef7822c43c28d56e4221`
- Files changed: `AUDIT_DEPLOYMENT_FIX_PLAN.md`; regenerated `output/full-audit-2026-08-28/metrics.json`; fresh artifacts under `output/playwright/r00-2026-08-31/`; Playwright CLI logs/snapshots under `.playwright-cli/`. No application code changed.
- Focused tests: no tests added or edited; existing suite exercised by the canonical gate.
- `npm run verify` result and test count: **PASS** — lint, typecheck, build, and **284/284 tests passed**.
- `git diff --check` result: **PASS**.
- Browser widths/states checked: scanner at 320/360/390/767/768/1280/1440px; saved Vitalik dashboard at 390/1440px; flow/protocols/gas/transfers/approvals tabs; invalid single input; cluster sample plus duplicate/invalid validation; mobile navigation and Escape; docs `risk` filter at 390px; unknown route HTTP 404. No page-wide horizontal overflow at the seven scanner widths.
- Screenshots/artifacts: `output/playwright/r00-2026-08-31/` contains the seven scanner widths, saved dashboard, flow graph including scrolled overlap, approvals, gas, transfers empty state, cluster validation, docs filter, and 404 captures. `output/full-audit-2026-08-28/metrics.json` contains fresh asset, route, and saved-demo measurements.
- Provider/cloud actions performed, if explicitly authorized: none. No live scan, cluster scan, deployment, push, reset, or discard action was performed.
- Remaining limits or follow-up: R01–R12 remain untouched. The confirmed findings and the provider/production evidence limits are recorded in the R00 completion evidence above; implementation begins only in the subsequent task.
- Status changed to `[x]` by: Codex, 2026-08-31.

### 2026-09-01 — R01 — Approval entities and evidence wording reproduction

- Agent/owner: Codex (audit/reproduction only)
- Candidate branch/ref and SHA: `architecture-validation` / `5e7089c4fdc9b8969d07ef7822c43c28d56e4221`
- Files changed: `AUDIT_DEPLOYMENT_FIX_PLAN.md`; fresh browser evidence under `output/playwright/r01-2026-09-01/`. No application code, deployment configuration, or remote state was changed.
- Focused tests: `node --import tsx --test src/components/ApprovalAudit.test.ts src/lib/analysis/approvals.test.ts src/lib/reportingContract.test.ts` — **17/17 passed**.
- `npm run verify` result and test count: **PASS** — lint, generated-route typecheck, **284/284 tests**, and production webpack build.
- `git diff --check` result: **PASS** on the final worktree after this documentation-only update.
- Browser widths/states checked: saved Vitalik snapshot at 1440×900 and 390×844; selected the Approvals tab; observed 2,233 rendered approval rows, 18 high-risk rows, and the five-pair deduplicated fixture count. No provider-backed scan was submitted.
- Screenshots/artifacts: `output/playwright/r01-2026-09-01/approval-1440.png`, `output/playwright/r01-2026-09-01/approval-390.png`; snapshot checksum `bd201a8634b095bd0219b013957244c565f6498113f3ab3417007bf296839081`.
- Provider/cloud actions performed, if explicitly authorized: none. The local `npm start` server was used only for the saved, static snapshot path; no live scan, Preview, deployment, push, reset, or discard action was performed.
- Remaining limits or follow-up: F01/F02 remain confirmed. “High-risk spenders” and “total active permissions” have not been corrected; current allowance verification was not added; docs and focused regression fixtures remain for the implementation phase. R01 remains `[~]`, not `[x]`.
- Status changed to `[~]` by: Codex, 2026-09-01.

### 2026-09-01 — R01 — Approval entities and evidence wording implementation

- Agent/owner: Codex
- Candidate branch/ref and SHA: `architecture-validation` / `5e7089c4fdc9b8969d07ef7822c43c28d56e4221`
- Files changed: R01-scoped changes in `src/components/ApprovalAudit.tsx`, `src/components/ApprovalAudit.test.ts`, `src/lib/analysis/approvals.ts`, `src/lib/types.ts`, `src/lib/reportingContract.ts`, `src/app/docs/page.tsx`, `src/lib/analysis/riskScore.ts`, `src/components/WelcomeGuide.tsx`, `README.md`, `crutial_fixes.md`, and this plan. Fresh post-fix screenshots are under `output/playwright/r01-2026-09-01/`. All other pre-existing dirty changes were preserved.
- Focused tests: `node --import tsx --test src/components/ApprovalAudit.test.ts` — **8/8 passed**; fixture assertions cover the 18-row/5-pair mismatch and repeated spenders across one and multiple chains.
- `npm run verify` result and test count: **PASS** on clean rerun — lint, generated-route typecheck, **286/286 tests**, and production webpack build.
- `git diff --check` result: **PASS**.
- Browser widths/states checked: local production build at 1440×900 and 390×844; saved Vitalik snapshot loaded without a provider-backed scan; Approvals tab selected; corrected observed-history labels and counts verified.
- Screenshots/artifacts: `output/playwright/r01-2026-09-01/approval-1440-after.png`, `output/playwright/r01-2026-09-01/approval-390-after.png`; prior pre-fix screenshots remain unchanged alongside them.
- Provider/cloud actions performed, if explicitly authorized: none. No deployment, Preview, push, reset, discard, or current-allowance RPC query was performed.
- Remaining limits or follow-up: the API field name `activeApprovals` is preserved for compatibility but is documented as observed non-revoked history; live current-allowance verification and Preview/production proof remain separate follow-ups.
- Status changed to `[x]` by: Codex, 2026-09-01.

### 2026-09-01 — R02 — Product promise and coverage copy

- Agent/owner: Codex
- Candidate branch/ref and SHA: `architecture-validation` / `5e7089c4fdc9b8969d07ef7822c43c28d56e4221`
- Files changed: R02-scoped copy and regression changes in `src/app/page.tsx`, `src/components/WelcomeGuide.tsx`, `src/components/IdentityCard.tsx`, `src/app/docs/page.tsx`, `src/lib/seo.ts`, `README.md`, `src/components/productPromise.test.ts`, `src/components/p3Accessibility.test.ts`, `src/components/p3ResponsiveLayout.test.ts`, and this plan. Pre-existing dirty changes were preserved.
- Focused tests: `node --import tsx --test src/components/productPromise.test.ts src/components/p3Accessibility.test.ts src/components/p3ResponsiveLayout.test.ts src/lib/seo.test.ts` — **34/34 passed**.
- `npm run verify` result and test count: **PASS** — lint, generated-route typecheck, **289/289 tests**, and production webpack build.
- `git diff --check` result: **PASS**.
- Browser widths/states checked: local production home page at 320×800, 360×800, 390×844, 767×900, 768×900, 1280×900, and 1440×900; the bounded hero heading and four-network scope were present at every width, with no horizontal overflow in the page or body layout.
- Screenshots/artifacts: `output/playwright/r02-2026-09-01/hero-1440.png`, `output/playwright/r02-2026-09-01/hero-390.png`, and `output/playwright/r02-2026-09-01/verification.md`.
- Provider/cloud actions performed, if explicitly authorized: none. Local production server and saved/static home content only; no live scan, Preview, deployment, push, reset, or discard action was performed.
- Remaining limits or follow-up: R03–R12 remain pending; local copy and viewport evidence do not prove deployed metadata or production/provider behavior. The overall release verdict remains **NO-GO** until the remaining blocker gates pass.
- Status changed to `[x]` by: Codex, 2026-09-01.

### 2026-09-01 — R04 — Make capital-flow inspection readable and accessible

- Agent/owner: Codex
- Candidate branch/ref and SHA: `architecture-validation` / `5e7089c4fdc9b8969d07ef7822c43c28d56e4221`
- Files changed: R04-scoped layout, inspection, and regression changes in `src/components/CapitalFlowGraph.tsx`, `src/components/CapitalFlowGraph.test.ts`, `src/components/CapitalFlowGraph.test.tsx`; fresh browser evidence under `output/playwright/r04-2026-09-01/`; this plan. Existing dirty worktree changes were preserved.
- Focused tests: `node --import tsx --test src/components/CapitalFlowGraph.test.ts src/components/CapitalFlowGraph.test.tsx src/components/r03Accessibility.test.ts src/components/p3Accessibility.test.ts src/components/uiPerformance.test.ts` — **38/38 passed**.
- `npm run verify` result and test count: **PASS** — lint, generated-route typecheck, **296/296 tests**, and production webpack build.
- `git diff --check` result: **PASS**.
- Browser widths/states checked: local production server (`PORT=3012 npm start`) with the saved `?demo=vitalik` snapshot at 1440×900, 768×900, and 390×844; the 768px and 390px graph regions used the labeled internal horizontal scroller. The 23-node/22-connection fixture measured with no transformed node-box intersections, no viewBox overflow, and zero focusable descendants inside `svg[aria-hidden="true"]`.
- Keyboard evidence: expanded **Accessible capital flow data**, focused `Inspect center Your Wallet`, pressed Space twice, and observed `aria-pressed` transition `false → true` while focus remained on the named button and the visual inspector appeared. The accessible list exposes full addresses, named inspect buttons, and explorer links for the selected nodes.
- Screenshots/artifacts: `output/playwright/r04-2026-09-01/flow-1440-after.png`, `flow-768-after.png`, `flow-390.png`, `flow-390-scrolled.png`, and `verification.md`.
- Provider/cloud actions performed, if explicitly authorized: none. No live scan, Preview, deployment, push, reset, discard, or remote/cloud action was performed.
- Remaining limits or follow-up: evidence is local saved/static content only; screen-reader, Safari, real-device, Preview, production, and provider-backed behavior remain unverified. The overall release remains **NO-GO** until the later documented gates complete.
- Status changed to `[x]` by: Codex, 2026-09-01.

### 2026-09-01 — R05 — Cancel timed-out and disconnected provider work

- Agent/owner: Codex
- Candidate branch/ref and SHA: `architecture-validation` / `5e7089c4fdc9b8969d07ef7822c43c28d56e4221`
- Files changed: R05 cancellation propagation in the scan and batch routes, request policy, cancellation helper, cache, scan/batch/history services, explorer/RPC/Moralis/price/identity/ENS/Sybil clients, request telemetry, and focused cancellation regressions. Existing dirty worktree changes were preserved.
- Focused tests: **60/60 passed**; route cancellation regression included in the focused API-route run (**52/52 passed**).
- Local stress evidence: mocked 10-wallet × 4-chain batch cancellation returned HTTP 499 in **29.03ms** with **725,744 bytes** post-GC heap delta. This is local mock evidence only.
- Canonical verification: `npm run verify` **PASS** — lint, generated-route typecheck, **303/303 tests**, and production webpack build. Final `git diff --check` **PASS**. No provider/cloud action was authorized or performed.
- Remaining limits: Preview/production, real provider failure/disconnect behavior, and deployed worst-case resource capacity remain unverified; overall release remains **NO-GO**.

### 2026-09-01 — R06 — Server `NoFallbackError` reproduction and resolution

- Agent/owner: Codex
- Candidate branch/ref and SHA: `architecture-validation` / `5e7089c4fdc9b8969d07ef7822c43c28d56e4221`
- Files changed: `src/app/[slug]/page.tsx`, `src/app/seoLandingRoute.test.ts`, and this plan. Existing dirty worktree changes were preserved.
- Focused tests: `node --import tsx --test src/app/seoLandingRoute.test.ts` — **1/1 passed**.
- `npm run verify` result and test count: **PASS** — lint, generated-route typecheck, **304/304 tests**, and production webpack build.
- `git diff --check` result: **PASS**.
- Browser/request states checked: sequential local production requests for `/`, `/docs`, all five generated SEO pages, Open Graph/Twitter images, favicon, robots, sitemap, four saved-demo JSON assets, and `/does-not-exist`. Before the fix, expected routes returned 200 and the unknown route returned 404 but emitted `Internal: NoFallbackError`. After the fix, expected routes returned 200, the unknown route returned 404 with no internal-error text, and the server log contained no error lines.
- Screenshots/artifacts: `output/playwright/r06-2026-09-01/server.log` (pre-fix reproduction) and `output/playwright/r06-2026-09-01/server-after.log` (post-fix clean log).
- Provider/cloud actions performed, if explicitly authorized: none. Local production servers only; no provider-backed scan, Preview, deployment, push, reset, discard, or remote/cloud action was performed.
- Remaining limits or follow-up: production/Vercel log behavior remains an R12 operational gate; the overall release remains **NO-GO** until the remaining blockers and Preview evidence are complete.
- Status changed to `[x]` by: Codex, 2026-09-01.

### 2026-09-02 — R09 — Cluster sample and graph input truthfulness

- Agent/owner: Codex
- Candidate branch/ref and SHA: `architecture-validation` / `5e7089c4fdc9b8969d07ef7822c43c28d56e4221`
- Files changed: R09-scoped changes in `src/app/page.tsx`, `src/components/BulkScanInput.tsx`, `src/components/BulkDashboard.tsx`, `src/components/ClusterFlowGraph.tsx`, `src/hooks/useWalletScanner.ts`, `src/lib/clusterDemoSnapshot.ts`, `src/lib/indexingStatus.ts`, `src/lib/services/batchScanService.ts`, `src/lib/types.ts`, `src/lib/viewModels/dashboardViewModels.ts`, and focused tests. Existing unrelated dirty changes were preserved.
- Focused tests: `node --import tsx --test src/components/BulkScanInput.test.ts src/components/ClusterFlowGraph.test.ts src/components/BulkDashboard.test.ts src/lib/clusterDemoSnapshot.test.ts src/lib/indexingStatus.test.ts src/lib/viewModels/dashboardViewModels.test.ts` — **22/22 passed**.
- `npm run verify` result and test count: **PASS** — lint with 0 errors, generated-route typecheck, **318/318 tests**, and production webpack build.
- `git diff --check` result: **PASS**.
- Browser widths/states checked: local production server (`PORT=3016 npm start`) at **1440×900** and **390×844**; saved cluster example, sample-address fill, duplicate/invalid input feedback, no-link graph, explicit keyboard zoom, and native page scrolling. Editing cluster input cleared the saved result and URL marker.
- Screenshots/artifacts: `output/playwright/r09-2026-09-01/cluster-input-1440x900.png`, `cluster-saved-no-links-1440x900.png`, `cluster-saved-no-links-390.png`.
- Provider/cloud actions performed, if explicitly authorized: none. No live scan, Preview, deployment, push, reset, discard, or remote/cloud action was performed.
- Remaining limits or follow-up: local evidence does not prove Preview/production, real-device, Safari, screen-reader, or live-provider behavior. Overall release remains **NO-GO** until remaining required gates complete.
- Status changed to `[x]` by: Codex, 2026-09-02.

### 2026-09-02 — R11 — Reduce visual competition without redesigning

- Agent/owner: Codex
- Candidate branch/ref and SHA: `architecture-validation` / `45ed24b450cee932d134f854c0afa96d15a5df2b`; worktree was clean before this scoped change.
- Files changed: `src/components/WelcomeGuide.tsx`, `src/components/WelcomeGuide.test.ts`, `src/components/p3Accessibility.test.ts`, and this plan. Fresh before/after screenshots are under `output/playwright/`.
- Focused tests: `node --import tsx --test src/components/WelcomeGuide.test.ts src/components/p3Accessibility.test.ts src/components/productPromise.test.ts src/lib/demoWallets.test.ts` — **29/29 passed**.
- `npm run verify` result and test count: **PASS** — lint, generated-route typecheck, **324/324 tests**, and production webpack build.
- `git diff --check` result: **PASS** before and after the evidence update.
- Browser widths/states checked: local production build (`PORT=3021 npm start`) at **1440×900** and **390×844** on the default guide; all four saved-demo buttons, identity labels, updated dates, saved/non-live states, shared provider/pricing caveat, and fresh-scan distinction remained visible. At both widths, page/body width matched the viewport; each demo button measured **256px** with computed `box-shadow: none`; no nested button/link controls were present.
- Screenshots/artifacts: `output/playwright/r11-before-1440.png`, `r11-before-390.png`, `r11-after-1440.png`, and `r11-after-390.png`.
- Provider/cloud actions performed, if explicitly authorized: none. No live/provider-backed scan, Preview, deployment, push, reset, discard, or remote/cloud action was performed.
- Remaining limits or follow-up: the before/after screenshots are ready for product-owner approval before merge; local evidence does not prove Preview/production, real-device, Safari, screen-reader, or provider-backed behavior. Overall release remains **NO-GO** until the documented gates complete.
- Status changed to `[x]` by: Codex, 2026-09-02.

## 9. Suggested agent batches

Keep batches sequential unless file ownership is explicitly separated:

1. **Truth batch:** R01–R02.
2. **Accessible interface batch:** R03, then R04.
3. **Runtime safety batch:** R05–R06.
4. **Measurement batch:** R07.
5. **Public-content batch:** R08–R10.
6. **Optional polish:** R11 only after the preceding batches pass.
7. **Release operations:** R12, Preview first, production only after explicit approval.

At the end of every batch, stop and produce a fresh evidence-backed verdict. Do not move to the next batch merely because code was written.
