# Crucial Fixes Before Vercel Deployment

Status: **deployment blocked**
Target: production deployment on Vercel
Scope: security, data integrity, metric correctness, feature completion, architecture, UX/accessibility, and release validation

This file is the implementation handoff for the next model. Work from the top down. Do not treat later UI polish as a substitute for completing the security and data-integrity gates first.

## Operating Rules

- Keep changes small, reviewable, and covered by regression tests.
- Do not silently convert unavailable provider data into valid zero-value analytics.
- Use one canonical definition for every reported metric and reuse it across types, API responses, UI labels, documentation, and tests.
- Do not add new dependencies unless the existing stack cannot safely solve the problem.
- Preserve the existing visual direction while reducing density and fixing responsiveness.
- Do not deploy until every P0 and P1 item is complete and the final release gate passes.

## P0 — Deployment Blockers

### 1. [x] Remove or secure the public known-wallet write endpoint

Completion evidence (2026-08-23):

- `POST /api/known-wallets` now returns deterministic `405 Method Not Allowed` and never parses or persists the submitted label.
- Known-wallet labels now come only from the version-controlled, read-only `src/config/knownWallets.ts`; production code no longer reads or writes `known_wallets.txt`.
- Regression coverage rejects both a valid write and a newline/parser-injection attempt: `npx tsx --test src/app/api/__tests__/routes.test.ts` passed 6/6 tests.
- Targeted ESLint passed with zero warnings; `npx tsc --noEmit` passed.

Affected files:

- `src/app/api/known-wallets/route.ts`
- `src/lib/knownWalletsServer.ts`
- `src/lib/ens.ts`

Problem:

- `POST /api/known-wallets` writes directly to `known_wallets.txt` without authentication or authorization.
- Labels are not strictly sanitized or length-limited.
- A public caller can poison instance-local wallet labels that later influence scan results.
- Runtime filesystem writes are not a reliable persistence model on Vercel.

Required change:

- Preferred short-term fix: remove the public route from the production surface and keep known-wallet labels as version-controlled, read-only configuration.
- If runtime writes are a required product feature, replace the flat file with an authenticated persistent store and enforce authorization, CSRF protection where relevant, strict schema validation, length limits, and audit metadata.
- Reject control characters, newlines, delimiters used by the parser, and oversized labels.
- Do not rely on the Vercel function filesystem for durable writes.

Acceptance criteria:

- An unauthenticated request cannot modify wallet labels.
- Production code performs no durable write to `process.cwd()`.
- Valid and invalid write attempts are covered by route tests.
- Labels cannot inject additional wallet records or parser directives.

### 2. [x] Stop presenting partial provider failures as successful complete scans

Completion evidence (2026-08-23):

- Explorer results now distinguish complete, verified-empty, truncated/partial, timed-out, rate-limited, invalid, unsupported, and unavailable outcomes through typed source envelopes.
- Single-scan responses expose history `status` plus per-chain transaction, token-transfer, internal-transaction, and price availability. Incomplete history withholds history-dependent conclusions; incomplete historical pricing independently withholds price-backed USD, risk, and behavioral Sybil metrics while preserving complete non-price activity, approval-count, and blacklist metrics.
- Batch responses expose `requestedWallets`, `status`, and `failedWallets` with structured reasons; incomplete wallets are excluded from cluster aggregates instead of being dropped silently, and incomplete clusters withhold coordination conclusions in the UI.
- Focused provider/service/route/UI regression suite passed 31/31 tests; full `npm test` passed 53/53 tests.
- `npx tsc --noEmit`, targeted ESLint for all touched P0.2 files, `git diff --check`, and `npm run build` passed.
- Repository-wide `npm run lint` remains blocked by pre-existing unrelated debt (22 errors and 22 warnings) tracked under P2 item 12; no P0.2-touched file reported a lint issue.

Follow-up correction (2026-08-24):

- Overall scan completeness now depends on indexed wallet-history datasets rather than historical pricing. Per-chain price completeness is derived from the quotes actually used by that chain, so one token or chain cannot mark unrelated chains partial.
- Explorer collection now completes before Moralis fallback. The scan-level CU allowance is partitioned across only the chains that need fallback, and account-quota exhaustion is reported separately from the local CU limit.
- Address-list Sybil and sanctions checks run independently of explorer and price completeness. MEDIA scoring requires complete wallet history, but incomplete historical prices no longer suppress it: the monetary dimension is omitted and the remaining behavioral dimensions are reweighted.
- Capital Flow publishes historically priced inflow, outflow, and net flow inside the Flow Graph when wallet history is complete even if some prices are missing. Current-price estimates and unpriced transfer legs are excluded, with explicit count coverage and exclusion counts. Partial totals are labeled as verified lower bounds and are no longer promoted as a Behavioral DNA headline; flow is unavailable when history is incomplete or no eligible leg has a trusted historical value.
- Behavioral DNA pairs Lifetime Gas with a Chain Activity distribution based on the existing per-chain normal-transaction counts. Complete histories show count shares; partial histories show lower-bound counts without percentages; unavailable history is labeled rather than converted to zero.
- Spot-estimate diagnostics now explain that the count represents transaction or transfer valuations that used scan-time token prices because date-specific prices were unavailable.
- Focused scan/dashboard regressions passed 26/26; full `npm test` passed 126/126. `npm run lint`, `npm run build`, `npm run typecheck`, and `git diff --check` passed.

Affected files:

- `src/lib/services/scanService.ts`
- `src/lib/etherscan.ts`
- `src/lib/prices.ts`
- `src/app/api/scan/route.ts`
- `src/app/api/batch-scan/route.ts`
- `src/components/Dashboard.tsx`
- `src/components/BulkDashboard.tsx`

Problem:

- Explorer failures are converted to empty arrays.
- Empty data is then analyzed and rendered as if the wallet genuinely had no activity, approvals, transfers, or risks.
- Existing `chainWarnings` do not reliably capture per-dataset failures because inner fetch errors are swallowed first.

Required change:

- Return a typed availability envelope for every chain and data source, for example:

```ts
type DataAvailabilityStatus = 'complete' | 'partial' | 'unavailable';

interface ChainDataAvailability {
  chainId: number;
  transactions: DataAvailabilityStatus;
  tokenTransfers: DataAvailabilityStatus;
  internalTransactions: DataAvailabilityStatus;
  prices: DataAvailabilityStatus;
  errors: Array<{ source: string; code: string; message: string }>;
}
```

- Distinguish a verified empty result from a timeout, rate limit, invalid provider response, and unsupported chain.
- Do not calculate or display definitive risk, exposure, volume, or “clean” conclusions when required source data is incomplete.
- Show a prominent partial-result state in both single and cluster dashboards.
- Make batch responses report failed wallets and failure reasons rather than dropping them as `null`.

Acceptance criteria:

- A provider timeout cannot produce a normal “clean” dashboard.
- Users can see which chains and datasets are incomplete.
- Partial scans have an explicit API status and UI state.
- Regression tests cover complete, verified-empty, partial, and unavailable provider responses.

### 3. [x] Correct historical-price integrity

Completion evidence (2026-08-23):

- Price lookup now returns `{ priceUSD, provenance }` with the canonical states `historical`, `spot_estimate`, `stablecoin_assumption`, and `unpriced`; current prices are no longer inserted into the historical daily cache.
- Processed native values, gas values, token transfers, approval exposure, per-chain scan results, and portfolio aggregates expose price provenance or a typed completeness summary.
- A missing daily price may use a current price only as an explicit `spot_estimate`; spot-estimated or unpriced historical inputs make historical pricing partial and null out only the metrics that require complete historical USD inputs.
- Missing current token prices no longer become `$0`. Transfer, gas, and protocol views render unavailable values or state their pricing basis.
- README and methodology documentation now describe the implemented fallback and provenance policy.
- Focused price/service/UI regressions passed 32/32 tests, including missing daily price with current spot available, historical price precedence, stablecoin assumption, and unpriced assets; full `npm test` passed 58/58 tests.
- `npx tsc --noEmit`, targeted ESLint for all touched P0.3 files, `git diff --check`, and `npm run build` passed.

Follow-up correction (2026-08-24):

- Current approval exposure now reads only the current spot cache; it no longer adopts a transfer-time historical quote as the current token price.
- A current spot quote is complete for current exposure but remains explicitly `spot_estimate` when substituted into a historical calculation.
- Historical price failures no longer suppress non-price activity, approval-count, blacklist, or risk metrics. Price-backed volume and behavioral Sybil metrics remain unavailable until their historical inputs are complete.
- Regression coverage includes current-vs-historical approval pricing, history-vs-price status separation, metric-level withholding, and cross-chain price isolation.

Affected files:

- `src/lib/prices.ts`
- `src/lib/scanner.ts`
- gas, transfer, protocol-volume, and capital-flow reporting components

Problem:

- When a timestamp-matched daily price is unavailable, the code falls back to current spot price.
- Historical gas, transfer, capital-flow, and loss metrics can therefore be materially wrong while appearing exact.

Required change:

- Never substitute current spot price for a historical timestamp without explicitly marking the value as an estimate using spot price.
- Prefer returning `null`/unknown for historical value when the historical price is unavailable.
- Add price provenance to calculated values: `historical`, `spot_estimate`, `stablecoin_assumption`, or `unpriced`.
- Update UI copy and formatting so unknown values are shown as unavailable, not `$0`.
- Update documentation to describe the actual fallback policy.

Acceptance criteria:

- A missing historical price cannot silently produce a precise historical USD value.
- Every USD metric can identify its price provenance or completeness.
- Tests cover missing daily price, current-price availability, stablecoins, and unpriced assets.

### 4. [x] Add route-level abuse controls

Completion evidence (2026-08-23):

- Both scan routes now parse size-bounded JSON and enforce exact typed schemas for allowed fields, EVM/ENS targets, unique supported chain IDs, string lengths, and batch entries before provider work begins; client-supplied provider keys are rejected.
- The client, API, README, and regressions share a 10-wallet batch maximum. Batch work runs at most 3 wallet scans concurrently, while per-instance route slots cap active single and batch requests and remain occupied until timed-out work actually settles.
- Per-caller sliding-window limits return deterministic `429` responses with `Retry-After`; oversized bodies/batches return `413`; route work budgets return `504` after 45 seconds for single scans and 50 seconds for batches.
- Product policy is now explicit: scans remain public and unauthenticated, provider credentials remain server-side, and deployment-wide enforcement should mirror the documented limits in the Vercel firewall because in-process limits are instance-local.
- Focused request-policy and route regressions passed 14/14 tests; the full `npm test` suite passed 65/65 tests.
- `npx tsc --noEmit`, targeted ESLint for every P0.4-touched source/test file, `git diff --check`, and `npm run build` passed. Repository-wide `npm run lint` still reports only pre-existing P2 debt (13 errors and 17 warnings), with no P0.4-touched file implicated.

Affected files:

- `src/app/api/scan/route.ts`
- `src/app/api/batch-scan/route.ts`
- `src/lib/api/requestPolicy.ts`
- `src/lib/api/constants.ts`
- `src/components/BulkScanInput.tsx`
- `README.md`

Problem:

- Public routes can fan a single request into many external provider requests.
- Batch scan accepts up to 50 wallets and processes wallets concurrently.
- Existing domain rate limiters protect upstream domains but do not protect the application from abusive callers or control per-request workload.

Required change:

- Add strict typed validation for request bodies, wallet addresses, ENS names, chain IDs, array sizes, string lengths, and allowed fields.
- Reject unsupported chain IDs and non-string batch entries before any provider work starts.
- Enforce one shared batch limit across client, API, docs, and tests.
- Add route-level rate limiting and a bounded global/per-request concurrency policy suitable for Vercel functions.
- Add request timeouts and a maximum work budget.
- Decide whether production scanning requires authentication or a protected service token.
- Do not accept provider API keys from arbitrary request bodies unless this is an intentional, secured product feature.

Acceptance criteria:

- Invalid input is rejected before any upstream call.
- Oversized or repeated requests receive a deterministic 4xx/429 response.
- Batch fan-out is bounded.
- Tests cover malformed bodies, unsupported chains, duplicate wallets, maximum size, rate limiting, and timeout behavior.

## P1 — Metric and Feature Correctness

### 5. [x] Create one canonical reporting contract

Completion evidence (2026-08-23):

- Single-wallet responses now expose one typed `metrics` object covering the required flow, protocol, approval, historical value, loss availability, worst-chain risk, behavioral Sybil, blacklist, UTC activity, and unlimited-approval fields; incomplete scans return `null`/`unavailable` instead of definitive values.
- `src/lib/reportingContract.ts` is the source of truth for units, time windows, data sources, inclusion/exclusion rules, aggregation, completeness, and price provenance. The methodology page renders that catalog directly, and README/API/dashboard/batch mappings use the canonical field names.
- Multi-chain activity dates are retained as UTC `YYYY-MM-DD` values so `activeDays` and `longestStreakDays` use a cross-chain union rather than worst-chain or sum semantics.
- Focused P1 contract regressions passed 24/24 tests; `npx tsc --noEmit`, targeted ESLint for all P1.5-touched TypeScript files, and `npm run build` passed.

Affected areas:

- `src/lib/types.ts`
- `src/lib/services/scanService.ts`
- `src/lib/analysis/*`
- API routes
- dashboard components
- `README.md`
- `src/app/docs/page.tsx`

Required canonical definitions:

- `inflowUSD`
- `outflowUSD`
- `netFlowUSD`
- `grossVolumeUSD`
- `protocolVolumeUSD`
- `approvalExposureUSD`
- `riskScore`
- `riskGrade`
- `sybilProbability`
- `blacklistStatus`
- `activeDays`
- `longestStreakDays`

Required change:

- Define units, time window, data sources, inclusion/exclusion rules, aggregation method, completeness requirements, and price provenance for each metric.
- Rename ambiguous fields so portfolio aggregates cannot be confused with worst-chain values.
- Include `totalUnlimitedApprovals` and other runtime fields in the declared API types.
- Remove undocumented runtime-only fields and hardcoded metric copy.
- Generate or directly reuse canonical definitions in the methodology UI where practical.

Acceptance criteria:

- Types, API payloads, UI labels, README, methodology, and tests describe the same definitions.
- Every displayed number maps to a typed field with documented units and aggregation rules.
- No metric is labeled “exact” unless the data path can substantiate that claim.

### 6. [x] Fix protocol volume, network, gas-unit, and explorer reporting

Completion evidence (2026-08-23):

- Protocol analysis now correlates wallet-facing priced ERC-20 legs to the directly called protocol contract by transaction hash, so ERC-20-only swaps and bridges contribute protocol volume while unpriced legs remain excluded.
- Protocol and contract rows carry `chainId`, `chainName`, `nativeTokenSymbol`, `totalGasNative`, and USD gas/volume. The UI keeps same-named protocols separate per chain, uses the correct explorer, and gives capital-flow protocol nodes chain-specific identities.
- `InteractionsSummary.protocolVolumeUSD` retains the full chain aggregate independently of the display truncation and feeds the canonical reporting contract.
- Focused protocol/reporting/UI regressions passed 17/17 tests, including a priced ERC-20-only swap and cross-chain explorer/native-unit fixture. `npx tsc --noEmit`, targeted ESLint, and `npm run build` passed.

Affected files:

- `src/lib/analysis/interactions.ts`
- `src/components/InteractionsPanel.tsx`
- `src/components/CapitalFlowGraph.tsx`
- `src/lib/types.ts`

Problem:

- Protocol volume currently relies primarily on native transaction `valueUSD`, omitting the ERC-20 legs of many swaps and bridges.
- The UI hardcodes `ETH`, an Ethereum network badge, and Ethereum explorer links for multi-chain protocol rows.

Required change:

- Attribute priced token-transfer legs to protocol interactions using a documented transaction/contract correlation rule.
- Preserve `chainId`, native-token symbol, and USD gas value through protocol aggregation.
- Render the correct network, native unit, and explorer URL for each contract.
- Do not merge same-named protocols across chains in a way that loses chain provenance.

Acceptance criteria:

- An ERC-20-only swap fixture produces non-zero protocol volume when its transfers are priced.
- A supported-chain fixture displays the correct native unit and explorer.
- Multi-chain protocol aggregation retains network provenance.

### 7. [x] Show actual approval exposure

Completion evidence (2026-08-23):

- Approval analysis now preserves decoded finite allowance amounts and caps exposure by both the reconstructed positive token balance and the finite allowance; unlimited approvals use the reconstructed balance.
- Per-approval and aggregate contracts distinguish `estimated`, `zero_balance`, and `unavailable` exposure. Any unknown balance/price makes the aggregate unavailable instead of silently adding `$0`, while revoked approvals remain excluded from active state.
- The approval UI displays estimated USD exposure and provenance, labels high-risk spenders and unlimited allowances as counts, and uses separate copy for zero balance versus unavailable pricing/balance. README and methodology formulas match the implementation.
- Focused analyzer/reporting/UI regressions passed 17/17 tests, covering revoked, finite, unlimited, unpriced, and zero-balance approvals. Targeted ESLint, `npx tsc --noEmit`, and `npm run build` passed.

Affected files:

- `src/lib/analysis/approvals.ts`
- `src/components/ApprovalAudit.tsx`
- related types and methodology copy

Required change:

- Display `totalExposureUSD` or rename the card to indicate that it is a count.
- Show price/completeness status for each exposure estimate.
- Separate unlimited approvals, high-risk spender classification, and estimated capital exposure.
- Avoid claiming that an allowance can drain a dollar amount when token balance or price is unknown.

Acceptance criteria:

- “Exposure” metrics display monetary values with provenance.
- Count metrics are clearly labeled as counts.
- Unit tests cover revoked, finite, unlimited, unpriced, and zero-balance approvals.

### 8. [x] Implement real cluster linkage or remove the claim

Completion evidence (2026-08-23):

- Batch scans now request an internal full-fidelity evidence set containing native, internal, and ERC-20 wallet-facing transfers plus the complete counterparty set; this evidence is not added to normal single-scan payloads or caches.
- Direct submitted-wallet linkages are deduplicated by chain, transaction hash, direction, asset type, and asset identifier, then aggregated by source, target, and chain with unique evidence hashes, transaction count, last date, and explicit USD completeness. Unknown USD legs never become `$0` volume.
- Shared hubs use full counterparty sets, including each hub's wallet membership, so a counterparty beyond the top 40 display rows still affects analysis and renders graph links correctly. UI coordination narratives now describe only implemented evidence and avoid inferring common control.
- Focused cluster/service/UI regressions passed 14/14 tests, covering known linkage, no linkage, multiple evidence hashes, incomplete USD value, and a shared hub beyond 40 counterparties. `npx tsc --noEmit`, targeted ESLint, and `npm run build` passed.

Affected files:

- `src/app/api/batch-scan/route.ts`
- `src/components/BulkDashboard.tsx`
- `src/components/ClusterFlowGraph.tsx`
- cluster types and tests

Problem:

- The API always returns `linkages: []`.
- Shared counterparties are derived only from truncated top-counterparty lists.
- The UI still reports direct transfers, coordination levels, and linkage narratives.

Required change:

- Preferred product path: implement direct wallet-to-wallet linkage detection from the full relevant transfer set, with chain, direction, count, value, and evidence transaction hashes.
- Compute shared hubs from a non-truncated analysis dataset; truncate only for display.
- If this cannot be implemented before deployment, remove or clearly mark direct-linkage and coordination claims as unavailable/experimental.

Acceptance criteria:

- A fixture containing a known inter-wallet transfer produces a linkage with evidence.
- A fixture with no linkage does not create one.
- More than 40 counterparties does not silently change the cluster conclusion.
- UI narratives are derived only from implemented fields.

### 9. [x] Align risk and Sybil messaging

Completion evidence (2026-08-23):

- Runtime scoring, grade bands, and methodology now share the typed constants in `src/lib/analysis/riskModel.ts`; README documents the same factor caps, thresholds, and grade boundaries, and the aggregate is explicitly named `worstChainRiskScore`/`worstChainRiskGrade`.
- Live components no longer invert risk into an undocumented trust score or display the fixed aggression label/bar. Drain/loss claims were removed because no such factor exists in the implemented model.
- A positive non-behavioral blacklist match overrides a green organic headline, while MEDIA Sybil probability is labeled as a separate behavioral heuristic in runtime UI, README, and methodology.
- Focused risk/reporting/UI regressions passed 28/28 tests, including blacklist precedence and documented model boundaries. `npx tsc --noEmit`, targeted ESLint with zero errors, and `npm run build` passed.

Affected files:

- `src/lib/analysis/riskScore.ts`
- `src/components/RiskScore.tsx`
- `src/components/SybilRadar.tsx`
- `src/components/Dashboard.tsx`
- `README.md`
- `src/app/docs/page.tsx`

Required change:

- Choose one risk model; align factor names, weights, thresholds, grade mapping, and documentation.
- Remove claims about detected loss/drain incidents unless such a factor is implemented and tested.
- Rename aggregated risk to reflect whether it is worst-chain, weighted portfolio, or another defined calculation.
- Remove the hardcoded “Aggression Level: Medium” and fixed 65% bar, or compute it from a documented metric.
- Make blacklist status override a green “Organic Human” headline. Present behavioral Sybil probability as a secondary heuristic, not as a contradiction to a positive blacklist match.

Acceptance criteria:

- README, docs, tests, and runtime code use identical risk weights.
- A flagged blacklist fixture cannot render an overall clean/organic verdict.
- No hardcoded risk/trust KPI remains in a live component.

### 10. [x] Correct activity aggregation across chains

Completion evidence (2026-08-23):

- Activity profiles retain unique UTC `YYYY-MM-DD` dates, and `aggregateActivityProfiles` unions them across chains before calculating active days, current/longest streaks, and average transactions per active day.
- The displayed 7×24 heatmap, peak weekday, and peak hour now come from the merged cell counts instead of whichever chain had the longest streak. Empty activity produces an explicit zero profile.
- README labels the grid and temporal reporting as UTC, and the canonical reporting contract documents UTC date aggregation.
- Focused activity/reporting regressions passed 5/5 tests, including same-date deduplication, different-date union, merged peak day/hour, streaks, and empty input. `npx tsc --noEmit`, targeted ESLint, and `npm run build` passed.

Affected files:

- `src/components/ActivityHeatmap.tsx`
- activity types and analysis tests

Problem:

- Multi-chain heatmap counts are merged, but active days use the maximum per-chain value rather than the union of calendar dates.
- Peak day/hour is selected from the chain with the longest streak rather than the merged activity distribution.

Required change:

- Aggregate raw dates or a mergeable activity summary across chains.
- Compute active-day union, peak day, peak hour, current streak, and longest streak from the combined dataset.
- Document the reporting time zone as UTC.

Acceptance criteria:

- Cross-chain transactions on the same day count as one active day.
- Cross-chain transactions on different days count toward the correct union.
- Peak day/hour is based on merged counts.

## P2 — Architecture and Maintainability

### 11. [x] Decide and implement the persistence model

Completion evidence (2026-08-23):

- The product now has one typed stateless runtime contract in `src/lib/persistencePolicy.ts`: scans and reports are not durably saved, runtime filesystem writes are forbidden, and process-local caches are explicitly optional optimizations that cannot be required for correctness.
- Scan and identity cache TTLs now reuse that contract. README documents point-in-time/provider-dependent results, five-minute complete-scan reuse, request-only report retention, cold-instance behavior, and the database/access-control/retention prerequisites for any future saved-report feature.
- A regression scans all production TypeScript sources and fails if application code imports filesystem APIs; policy assertions lock the no-durable-storage and no-cache-correctness decisions.
- Targeted stateless/cache/service regressions passed 14/14 tests; the full `npm test` suite passed 91/91 tests.
- Targeted ESLint passed with zero warnings, `npx tsc --noEmit` passed after deterministic Next type generation, `git diff --check` passed, and `npm run build` passed.

Current state:

- Scan and identity caches are process-local, best-effort memory optimizations.
- Known-wallet labels are version-controlled, read-only configuration.
- There is intentionally no durable report history, saved-wallet store, or canonical historical database.

Required decision:

- If the product is intentionally stateless, document that scans are point-in-time, non-durable, and provider-dependent. Remove all runtime write behavior.
- If users need saved wallets, saved reports, or comparable historical metrics, implement a durable database with migrations, access control, ownership boundaries, and retention rules before enabling those features.

Vercel consideration:

- Do not assume function instances share memory or filesystem state.
- Cache correctness must not depend on a single warm instance.

### 12. [x] Refactor oversized components and duplicated utilities

Completion evidence (2026-08-23):

- Single-wallet and cluster presentation calculations now live in tested pure view models under `src/lib/viewModels/dashboardViewModels.ts`; provider/metric blocking states were split into focused status panels, reducing `Dashboard.tsx` from 580 to 509 lines and `BulkDashboard.tsx` from 616 to 503 lines.
- `formatCompactUSD(unknown)` is now the only live compact-currency formatter and is imported directly by dashboard, cluster-flow, bulk, and capital-flow views. Component-to-component formatter re-exports and the Capital Flow duplicate were removed.
- `MemoryCache` and its scan/identity singletons are explicitly typed. The remaining `any`, `@ts-ignore`, unused imports/locals, and unsafe cache casts were removed from the touched UI, API-support, and analytics paths.
- URL bootstrap now validates address/ENS query targets through a pure helper, schedules one guarded auto-scan, and has malformed-target regressions. `WalletInput` no longer mirrors props into state from an effect; keyed remounts synchronize deliberate address selections.
- Confirmed-unreferenced `SummaryCards.tsx` and `BatchScanResults.tsx` were removed. `mockData.ts` remains only as a test fixture; no production mock-data import exists.
- Focused formatter/dashboard/view-model/URL/stateless regressions passed 26/26 tests; the full `npm test` suite passed 95/95 tests.
- Repository-wide `npm run lint` passed with zero errors and zero warnings; the new documented `npm run typecheck` command, `git diff --check`, and `npm run build` passed.

High-value targets:

- `src/app/docs/page.tsx`
- `src/components/CapitalFlowGraph.tsx`
- `src/components/BulkDashboard.tsx`
- `src/components/Dashboard.tsx`
- `src/lib/types.ts`

Required change:

- Extract dashboard view models from rendering components.
- Split large feature panels into focused components.
- Replace the duplicate dashboard currency formatter with the shared formatter.
- Replace `any`, `@ts-ignore`, and unsafe casts in API and analytics hot paths.
- Remove unused components and dead paths after confirming no external imports:
  - `src/components/SummaryCards.tsx`
  - `src/components/BatchScanResults.tsx`
  - unused mock/demo import paths
- Fix the URL auto-scan and input state synchronization patterns flagged by React lint rules.

Acceptance criteria:

- ESLint passes with zero errors.
- TypeScript passes independently through a documented command.
- No duplicate metric/formatting logic remains in live components.
- Removed code is protected by existing or newly added regression tests.

## P3 — UX, Visual Design, and Accessibility

### 13. [x] Fix mobile overflow and control density

Completion evidence (2026-08-25):

- The page shell and header now wrap without widening narrow viewports. The complete product promise remains directly above the primary scan console, scan actions remain full-width on small screens, and dense primary labels use shorter sentence-case copy while retaining the tactile visual system.
- Dashboard and cluster tab strips now keep horizontal scrolling inside labeled regions with keyboard-reachable tab controls. Heatmaps and transfer, approval, interaction, and capital-flow tables use labeled, keyboard-focusable scroll regions with a visible edge affordance. Wallet identity addresses truncate within the card while preserving the full value in a title and a named copy action.
- The resolved-identity card now uses one profile hierarchy followed by a separate connected-account section. At medium widths the address and copy action occupy the previously empty right side of the profile row, reducing its height without changing the approved section order. The service count is attached to the account section, duplicate linked-domain chips were removed from the profile heading, unique unlinked names remain visible, and account links use an equal-width responsive grid.
- Added `src/components/p3ResponsiveLayout.test.ts`; focused regressions passed 6/6, including contracts for hero/search order and the structured identity/account layout. ESLint completed with zero errors and `npm run typecheck` passed.
- Playwright verified `documentElement.scrollWidth === innerWidth` and `body.scrollWidth === innerWidth` at 320px, 375px, 390px, 768px, and 1440px. Header control bounds stayed inside the viewport at 320px and 390px. A rendered accessibility snapshot confirms the hero region precedes `Wallet Forensics Console`, and the corrected viewport is recorded at `output/playwright/p3-order-restored.png`.

Affected files:

- `src/app/page.tsx`
- `src/components/WalletInput.tsx`
- `src/components/Dashboard.tsx`
- identity, navigation, heatmap, and table components

Required change:

- Make the header wrap or collapse without increasing the document width.
- Ensure a 390px viewport has no page-level horizontal overflow.
- Keep deliberate horizontal scrolling only inside data tables, heatmaps, and tab containers, with visible affordances.
- Make wallet addresses intentionally truncate/copyable.
- Reduce first-screen competition between the scan task and marketing/demo content.
- Preserve the existing tactile visual identity while reducing excessive all-caps density and repeated bevel treatments.

Acceptance criteria:

- No page-level horizontal overflow at 320px, 375px, 390px, 768px, and desktop widths.
- Primary scan input and action remain fully visible.
- Mobile screenshots show no clipped header controls.

### 14. [x] Repair keyboard and assistive-technology semantics

Completion evidence (2026-08-25):

- Landing scan modes, single-wallet dashboard sections, and cluster dashboard sections now implement `tablist`/`tab`/`tabpanel`, selected state, roving `tabIndex`, `aria-controls`/`aria-labelledby`, hidden inactive panels, and wrapping Arrow/Home/End keyboard navigation.
- Demo cards no longer attach click behavior to non-semantic containers. Cluster sortable headers now contain real buttons and publish `aria-sort`. Form errors are connected to their fields, icon-only explorer/graph controls have names and larger targets, and visible focus styling remains global.
- Radar, activity heatmap, capital-flow, and cluster-flow visuals now include text or tabular alternatives. The flow graphs also expose keyboard-operable accessible data sections with wallet inspection and evidence/explorer actions.
- Added `src/lib/accessibility/tabs.ts`, `src/lib/accessibility/tabs.test.ts`, and `src/components/p3Accessibility.test.ts`. P3-focused regressions passed 14/14; the full repository suite passed 157/157. `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check` passed.
- Playwright against the local production build confirmed ArrowRight moved focus and selection from Single wallet to Cluster scan and updated the active `tabpanel`. Accessibility-tree inspection exposed selected tabs, named inputs/actions, and the active panel. An automated rendered-DOM audit found zero duplicate IDs, unnamed actions, unnamed fields, missing image alternatives, broken tabs, or broken panels. Reproducible results are recorded in `output/playwright/p3-item14/verification.md`.

Affected areas:

- landing scan-mode tabs
- dashboard navigation tabs
- demo profile cards
- sortable cluster headers
- charts and heatmap
- external-link and icon-only controls

Required change:

- Use complete tab semantics, including `tablist`, `tab`, `tabpanel`, selection state, focus behavior, and arrow-key navigation.
- Replace clickable `div` cards with links/buttons or remove the redundant card-level click handler.
- Put buttons inside sortable headers and expose `aria-sort`.
- Provide accessible names for icon-only actions.
- Provide a meaningful non-visual summary/table for chart and heatmap data.
- Preserve visible focus styles and adequate target sizes.

Acceptance criteria:

- Main single-scan and cluster flows are operable using only the keyboard.
- Automated accessibility checks report no critical violations.
- Manual screen-reader review can identify selected tabs, sort state, loading state, partial data, chart summaries, and errors.

## P4 — Test and Release Hardening

### 15. [x] Expand regression coverage around the product’s trust boundaries

Completion evidence (2026-08-25):

- The 174-test Node suite now covers every listed trust boundary: route schemas and abuse limits; provider timeout/rate-limit/partial states; price provenance; ERC-20 protocol attribution; supported-chain native-token/explorer mappings; approval exposure; risk/Sybil/activity aggregation; cluster linkage; URL/demo loading; single/cluster client success and failure transitions; responsive layout; and accessibility-critical behavior.
- Added direct regression seams for cluster request success, structured provider failures, and non-JSON failures. Single-wallet stream coverage now also rejects HTTP failures, truncated streams, and cancellations without presenting a completed report.
- The local production build passed browser smoke checks for a saved single-wallet dashboard, cluster-mode keyboard navigation, four-wallet sample parsing, explicit mocked cluster failure rendering, and cleared loading state after failure.
- Rendered overflow checks passed at 320px, 375px, 390px, 768px, and 1440px with document/body widths equal to the viewport. Browser evidence is recorded in `output/playwright/p4-item15/verification.md`.
- Focused P4 regressions passed 10/10; full `npm test` passed 174/174. `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check` passed.

Required test groups:

- route schema validation and abuse controls
- provider timeout/rate-limit/partial-response behavior
- historical-price provenance
- protocol ERC-20 volume attribution
- supported-chain native-token labels and explorer links
- approval exposure USD
- risk-model weights and grades
- Sybil blacklist/headline precedence
- multi-chain activity aggregation
- cluster direct linkage and shared hubs
- URL-driven scan state and loading/error transitions
- single and cluster browser smoke tests
- mobile overflow and accessibility-critical interactions

Current baseline:

- The equivalent Node test runner passes 35 tests.
- Coverage is concentrated in a small subset of the product surface.
- The normal `npm test` path should be verified in CI because the managed audit sandbox blocked the `tsx` IPC transport.

### 16. [x] Make validation commands deterministic

Completion evidence (2026-08-25):

- `package.json` now pins Node.js 22.x and exposes the canonical `lint`, `typecheck`, `test`, `build`, and `verify` commands. `typecheck` runs `next typegen` before `tsc --noEmit`, following the installed Next.js 16 guidance so route types do not depend on stale `.next` output.
- `.nvmrc`, README, GitHub Actions, and Vercel now use the same Node.js 22 and `npm run verify` contract. `vercel.json` invokes the full verification path; `next.config.ts` has no lint or TypeScript bypass.
- Added `src/lib/releaseConfiguration.test.ts` to lock the command, runtime, CI, Vercel, and no-bypass contracts; its focused regressions passed 3/3.
- Clean-artifact proof: after moving the existing `.next` output aside, `npm run typecheck` regenerated route types and passed. A separate temporary copy without `.git`, `.next`, `node_modules`, environment files, or local output completed `npm ci` with 0 vulnerabilities and `npm run verify` with 177/177 tests plus a successful production build.
- No deployment or remote repository action occurred.

Required scripts:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test": "<runner that works reliably in CI>",
    "build": "next build --webpack",
    "verify": "npm run lint && npm run typecheck && npm test && npm run build"
  }
}
```

Required change:

- Ensure typecheck does not depend on stale `.next` artifacts, or document/generate required Next types deterministically.
- Make `npm run verify` the required pre-push and deployment command.
- Configure Vercel to run the verification/build path without skipping lint or TypeScript errors.

Acceptance criteria:

- A clean clone can run the documented verification path successfully.
- CI and local verification use the same commands.
- No `ignoreDuringBuilds` or equivalent production bypass hides lint/type failures.

## Vercel Production Configuration Gate

Complete before the first production deployment:

- [x] Select and document supported Node.js runtime version. Evidence: Node.js 22.x is pinned in `package.json` and `.nvmrc`, documented in README, and used by the CI workflow; Vercel currently supports the pinned major runtime.
- [ ] Confirm every API route uses the intended Node runtime; filesystem-dependent code is removed.
- [ ] Configure provider secrets only in Vercel encrypted environment variables.
- [ ] Confirm no provider secret is shipped to the client bundle or accepted from arbitrary public request bodies.
- [ ] Configure rate limiting, request budgets, and monitoring for scan endpoints.
- [ ] Validate function duration and memory requirements using worst-case bounded scans.
- [ ] Add security headers appropriate to the deployed application, including a tested Content Security Policy.
- [ ] Define cache behavior explicitly; do not cache user-specific or incomplete results as complete public responses.
- [ ] Add structured logs for request ID, duration, provider availability, partial-result status, and failure category without logging secrets.
- [ ] Add health/operational monitoring for provider failures, latency, and error rates.
- [ ] Confirm privacy/retention policy for scanned wallet addresses and any saved reports.
- [ ] Verify production URLs, metadata, favicon/assets, README clone URL, and license claims.

## Final Go/No-Go Checklist

Deployment is **NO-GO** until all of the following are true:

- [x] Every P0 item is complete.
- [x] Every P1 metric/feature item is complete or the corresponding product claim/UI is removed. Evidence: items 5–10 above; 89/89 repository tests, TypeScript, P1-targeted ESLint, production build, and `git diff --check` passed on 2026-08-23.
- [x] `npm run verify` passes from a clean checkout. Evidence: item 16 isolated-copy verification completed lint, generated-type typecheck, 177/177 tests, and the production build.
- [x] Dependency audit reports no unresolved high/critical production vulnerabilities. Evidence: the item 16 clean `npm ci` audit reported 0 vulnerabilities across the locked dependency graph.
- [ ] Single-wallet and bounded cluster browser flows pass in a production-like environment.
- [ ] Forced provider failures render explicit partial/unavailable states.
- [ ] Historical-price gaps never appear as exact historical USD values.
- [ ] Unauthenticated callers cannot mutate application state.
- [x] Scan endpoints have tested abuse controls.
- [x] Mobile layouts pass at 320px, 375px, 390px, 768px, and desktop widths. Evidence: item 13; final local production checks reported document and body widths equal to each viewport width.
- [x] Keyboard and screen-reader critical paths are verified. Evidence: item 14; focused semantics regressions, production-build keyboard navigation, accessibility-tree inspection, and the zero-critical rendered-DOM audit.
- [ ] Vercel preview deployment is smoke-tested before promoting to production.
- [ ] Production rollback procedure and last-known-good deployment are documented.

## Recommended Implementation Sequence

1. Secure/remove mutable routes and add request schemas.
2. Implement provider availability and price-provenance contracts.
3. Canonicalize metrics and align types, API, UI, docs, and tests.
4. Correct protocol, approval, activity, risk, and Sybil reporting.
5. Implement or remove incomplete cluster-linkage claims.
6. Decide persistence architecture for Vercel.
7. Clear lint/type debt and remove dead code.
8. Fix mobile and accessibility issues.
9. Expand integration/e2e coverage and add deterministic `verify`.
10. Validate a Vercel preview, then perform the final go/no-go review.
