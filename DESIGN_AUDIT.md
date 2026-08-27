# WalletGenome design and UX audit

Date: 2026-08-27. Scope: current local working tree at `/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics`, viewed through the in-app browser at port 3000. Audit only; no application code, analytics, provider configuration, deployment, or Git history changed.

## Verdict

The app has a consistent visual identity, a clear scan entry point, useful saved demos, and good foundations for disclosing incomplete evidence. It does not need a wholesale redesign. It does need focused repairs to graph layout, keyboard access, documentation filtering, and the way it describes the scope of displayed data.

The biggest mobile problem is prioritization: repeated result context and a long identity block precede the risk information. The biggest desktop positioning defect is overlapping protocol nodes in the flow graph. Several controls look finished but lack the corresponding focus, selected-state, or empty-state behavior.

This is a broad route/component audit, not exhaustive proof of every data combination. Seven public content routes and all six single-wallet tabs were opened. Cluster results and provider-driven loading/failure states were reviewed in source/tests, not exercised against live providers.

## User goal and design contract

Help an analyst or wallet owner enter a public address, understand the quality of the evidence, find important behavior/security signals, and inspect supporting records without mistaking missing or sampled data for a complete history.

Recommendations are grounded in [DESIGN.md](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/DESIGN.md), particularly **Evidence before certainty**, **Scope before interpretation**, **Density follows priority**, **Accessibility**, **Responsive behavior**, and **Content voice**. New layout proposals are not user-approved implementation instructions.

Accessibility target: the existing contract's AA intent. This audit identifies implementation risks; it is not a WCAG conformance certification or an assistive-technology test.

## Evidence and coverage

- Fresh screenshots were captured, saved, reopened, and visually inspected during this run. The initial full-page capture had stitching artifacts and was replaced with a valid viewport capture; no finding relies on that rejected image.
- The running server's process working directory matched this repository. The existing development server was reused; no new app server was started.
- Fresh screenshots are in `output/design-audit-2026-08-27/`. Viewport images are intentionally not full-page proofs.
- Desktop visual coverage: 1440×1000. Mobile visual coverage: 390×844; all five topic pages also captured at 320×800. Scanner layout measurements additionally covered 320, 360, 390, 767, 768, 1280, and 1440px.
- The browser reserves an approximately 11px vertical scrollbar in several captures. CSS viewport width and saved-image width therefore differ; measurements below come from DOM geometry, not image scaling.
- Existing `DESIGN.md`, `ui_fixes.md`, README, AGENTS, theme configuration, current source, tests, and asset inventory were inspected. Older screenshots/checklist results were used only to understand existing decisions, not as current audit proof.
- Existing assets include local saved-wallet JSON, a favicon, generated Open Graph/Twitter image source, default framework SVG files, and prior Playwright captures. No dedicated Storybook, Figma export, or separate brand-kit file was found in the targeted repository search. No new imagery was generated.

### Route and flow inventory

| Step | Route or state | Health | Current evidence |
| --- | --- | --- | --- |
| 1 | `/`: hero, mode tabs, address entry, networks, demos, explanatory content, footer | Usable; focus and idle-state copy need repair | 01–03; empty-submit validation and menu Escape tested |
| 2 | `/`: saved result, summary, full-address disclosure, evidence notice, identity, Sybil, persona, risk, heatmap, radar | Useful but too much mobile context before decision signals | 04–05, 20; full-address disclosure tested |
| 3 | Flow Graph tab | Needs repair: overlapping nodes | 06; source coordinate/width verification |
| 4 | Protocols tab | Needs repair: empty-state and scope clarity | 07; no-match search tested |
| 5 | Gas Fees tab | Clear grid; coverage/window wording needs work | 08; charts and source reviewed |
| 6 | Transfers tab | Controls work; dataset scope is misleading | 09; no-match, clear/focus, next-page, and Base selection tested |
| 7 | Approvals tab | Useful identities and filters; focus/semantics gaps remain | 10; no-match and keyboard risk selection tested |
| 8 | Cluster input on `/` | Usable; invalid entries silently omitted, network row wraps | 11; sample load and invalid-token entry tested; no scan submitted |
| 9 | `/docs`: all 11 content sections, index, search, copy controls, tables, jump/back controls | Readable structure; typing triggers disruptive scroll | 12–13; search jump and clear-focus behavior tested |
| 10 | `/evm-wallet-analytics` | Readable; separate navigation and card-heavy template | 14–15; FAQ expansion tested |
| 11 | `/crypto-wallet-risk-checker` | Readable; same template issues | 16; heading/copy/controls inspected |
| 12 | `/token-approval-checker` | Readable; narrow heading is excessively tall | 17; heading/copy/controls inspected |
| 13 | `/sybil-wallet-analysis` | Readable; same narrow-template issues | 18; heading/copy/controls inspected |
| 14 | `/multi-chain-wallet-forensics` | Readable; same narrow-template issues | 19; heading/copy/controls inspected |

### Component inventory

| Group | Elements inspected | Assessment |
| --- | --- | --- |
| Global shell | `layout.tsx`, `SiteHeader`, `SiteFooter`, `globals.css`, Tailwind config | Shared scanner/docs shell and consistent footer; topic header diverges; theme/token guidance conflicts |
| Entry | `WalletInput`, `BulkScanInput`, `WelcomeGuide`, home mode tabs | Good main action and whole-card demos; invisible input focus, overly long placeholder, inconsistent cluster controls |
| Result context | `LoadedScanSummary`, `DemoSnapshotNotice`, status disclosures | Saved/non-live and partial states are explicit; address/actions wrap and context repeats on mobile |
| Identity and security | `IdentityCard`, `SybilRadar`, `RiskScore`, persona/security/risk sections in `Dashboard` | Public identity is clear and list matches remain visible; duplicate social links and repeated risk panels delay the primary judgment |
| Behavior | `ActivityHeatmap`, `BehavioralFingerprint`, `BehavioralRadarChart`, chain activity | Useful labeled summaries and nonvisual radar text; time-window label is incorrect, heatmap exact values rely on hover |
| Flow | `CapitalFlowGraph` | Useful lower-bound explanation and bounded canvas; overlapping protocol labels and pointer-only node actions |
| Protocols | `InteractionsPanel` | Unclassified activity now explained; counts and family names need scope consistency; no-match body is blank |
| Gas | `GasSummaryPanel` | Readable summary/network/chart structure; visible date range and incomplete-history qualification should be local to the metrics |
| Transfers | `TransferTable`, `transferTable.ts` | Functional search/filter/page controls; only top token summaries searched; critical columns offscreen on mobile |
| Approvals | `ApprovalAudit`, `FilterDropdown` | Contract identity, copy/explorer actions, unavailable exposure, paging, keyboard dropdown selection; search focus missing |
| Cluster results | `BulkDashboard`, `ClusterFlowGraph`, `ClusterStatusPanel` | Source/test review only: sortable leaderboard, CSV action, graph/summary, withheld partial aggregates; live visual and touch proof still needed |
| Loading/errors | `ProgressBar`, home alert, `ProviderStatusSummary`, `DashboardStatusPanel` | Source/test review plus actual input error/saved partial state; no live timeout/429/offline capture |
| Documentation | 10 indexed topics plus reporting contract, copy links, tables, mobile index, desktop sidebar | Important reporting contract absent from index; forced search scroll; inconsistent table-scroll accessibility |
| Discovery assets | `JsonLd`, metadata, sitemap/robots route inventory, Open Graph/Twitter source, favicon/default SVG inventory | Source/inventory only; social preview rendering and crawler behavior not certified |

## Confirmed strengths

1. The home page puts the product explanation immediately above the scan task. The featured saved demo and quieter secondary demos have a clear hierarchy (01–02).
2. Saved results consistently say saved/non-live, include a date, and preserve partial-history warnings; the fresh-scan action is separate (04–05).
3. Mobile navigation uses an ordinary disclosure. Opening it exposes the links; Escape closes it and returns focus to the toggle. The scanner network and scan buttons measured 44px high below `md`.
4. Full wallet-address disclosure works without relying on hover. Approval rows include token contracts and separate token/spender explorer actions.
5. Transfer search reports no matches, disables paging at zero results, returns focus to search when cleared, and advances from 1–50 to 51–100 of 109 rows. Changing the network resets to page 1.
6. Approval no-match text and disabled pagination work. ArrowDown/Enter selected the High risk option and returned focus to the filter trigger.
7. Tables and heatmap generally use contained horizontal scrolling. No page-wide horizontal overflow was measured in the scanner-width checks or the inspected 320px topic template.
8. The graph's observed lower-bound warning explicitly distinguishes transfer volume from wallet balance/profit. Gas/radar components provide textual data alternatives in source.

## Prioritized findings

Priority guide: **P1** = repair before treating the affected flow as ready; **P2** = important usability/trust improvement; **P3** = polish or maintenance. Confidence is high for reproduced behavior and exact source relationships; design prioritization is an informed recommendation, not a measured user-study result.

### F01 · P1 · Protocol nodes overlap in the capital-flow graph

- Evidence: screenshot 06 shows protocol boxes covering adjacent names and values. `CapitalFlowGraph.tsx:321` spaces four top-row centers 80 SVG units apart (`400 / (4 + 1)`), while each box at line 666 is 130 units wide. The overlap is structural, not a small viewport artifact.
- Impact: users cannot reliably read or select neighboring protocol nodes, including on desktop.
- Recommendation: calculate layout from node width plus a minimum gap; use additional rows or a larger bounded canvas where necessary. Keep existing chain labels and the separate evidence summary.
- Acceptance: zero node-box intersections for 0–8 protocol nodes at all supported widths; readable names/values; a deterministic fixture with eight nodes and a screenshot test. Contract: **Visual language**, **Responsive behavior**.

### F02 · P1 · Several search/input fields have no visible focus treatment

- Evidence: `WalletInput.tsx:70` removes the input outline; focused DOM style was transparent and its parent had only the unchanged recessed shadow. `BulkScanInput`, the docs filter, the protocol search, and the approval search similarly suppress the outline without a focus-within replacement. Transfers already implement a usable wrapper treatment.
- Impact: keyboard users lose their place in primary task controls. The mobile wallet input well also measures 38px high, below this repository's intended 44px control target; its long placeholder clips.
- Recommendation: reuse the transfer search's full-field focus pattern; add persistent concise visible labels/examples and consistent mobile field sizing.
- Acceptance: Tab/Shift+Tab visibly identifies every field; focus is not conveyed only by the caret; labels remain understandable after entry. Do not infer Safari focus-zoom behavior from this Chromium run. Contract: **Accessibility**, **Components**.

### F03 · P1 · Documentation search scrolls its own input offscreen

- Evidence: typing `approvals` at 390px produced one matching topic, then scrolled to `scrollY=8171.5`; the focused input was at approximately `y=-7685`. `docs/page.tsx:196–203` invokes `scrollIntoView` directly from the change handler. Clicking the clear icon left focus on `BODY`.
- Impact: continuing to type happens in an invisible field; correcting the query requires finding the search again.
- Recommendation: filter the index in place; navigate only after an explicit result selection or submit. Clear should restore focus to the input. Preserve the native topic links and mobile jump control.
- Acceptance: typing never moves the field outside the viewport; clear retains focus; choosing a result scrolls to that topic; back/hash navigation still works. Contract: **Accessibility**, **Information architecture**.

### F04 · P1 · “Transfers” search looks complete but only searches top token-transfer summaries

- Evidence: screenshot 09 reports 109 matching transfers. `transferTable.ts:31–39` reads only `transferSummary.topInbound/topOutbound`; `analysis/transfers.ts` constructs these as top-N lists, default 20 per direction per chain. Native/internal transfer rows are not included in this table. The controls say “All Transfers” and “Search transfers” without a subset qualifier.
- Impact: a valid transaction/hash can be absent from search even when it exists elsewhere in the returned history; no match can be mistaken for no activity. The default USD-descending ordering is also unstated.
- Recommendation: explicitly label the current view as top token transfers from returned data, including subset/search/sort limitations. Decide separately whether to build full-history browsing; this audit does not authorize that data expansion.
- Acceptance: the title, count, search help, and no-match message make the scope clear; native/internal coverage is not implied; a test includes a known record excluded from the top-N subset. Contract: **Scope before interpretation**, **Content voice**.

### F05 · P1 · Cluster input silently drops invalid entries

- Evidence: after loading four sample wallets and adding `invalid-wallet`, the UI still reported `4/10 valid addresses` and enabled `SCAN CLUSTER (4)` without warning (11). `BulkScanInput.tsx:26–33` filters invalid tokens away.
- Impact: users may believe all pasted targets were analyzed. This is especially risky for an investigation comparing a precise group of wallets.
- Recommendation: display valid, duplicate, and invalid counts; identify rejected entries and require correction or explicit acknowledgement before proceeding with a subset.
- Acceptance: mixed valid/invalid and duplicate inputs are explained before any provider request; over-limit and empty states remain deterministic. Contract: **Interaction states**, **Evidence before certainty**.

### F06 · P2 · Mobile results spend too much height on repeated context

- Evidence: screenshot 04 shows a status banner, summary badge, separate saved-data notice, full-width Edit and fresh-scan actions before the tabs. The already-shortened address breaks across two lines at 390px. Seven connected accounts follow; the same socials appear again in the persona card. Fresh DOM positions: Sybil starts near 1304px, security ratings at 2144px, risk-grade explanation at 4071px, radar at 4385px.
- Impact: the primary decision signals require substantial scrolling; repeated identity and risk presentations compete for attention.
- Recommendation: propose one compact identity/evidence header, keep date/partial state visible, disclose secondary accounts, and move decision-critical risk/list status before secondary identity details on mobile. Preserve the approved desktop composition unless separately approved.
- Acceptance: an agreed mobile fixture reaches an evidence-qualified risk/list summary earlier; no warning or full-address access is removed; the short address remains readable on one line or gets a deliberate row. Contract: **Density follows priority**, **Responsive behavior**.

### F07 · P2 · Idle “Live indexing” overstates current activity

- Evidence: 01, 02, and 11 show “Live indexing” with no active scan. `getIndexingStatus` defaults to `live` and receives no loading state; the badge also remains live after a complete scan. The hero promises the “complete story” while the featured result explicitly has partial history.
- Impact: the app implies active observation or completeness that the current state does not establish. On mobile, the full-width orange status bar also competes visually with Scan.
- Recommendation: distinguish Ready, Scanning, Completed, Saved, Partial, and Unavailable; use restrained idle styling. Qualify the hero promise without weakening the core value proposition.
- Acceptance: badges describe actual activity/evidence state; no “live” wording is inferred from mere absence of errors. Contract: **Brand**, **Interaction states**, **Content voice**.

### F08 · P2 · Heatmap window and partial-data labels are inconsistent

- Evidence: 20 says “TRANSACTION HEATMAP (LTM)” and “1501 days.” `analyzeActivityProfile` aggregates supplied transactions without a trailing-year filter, and `ActivityHeatmap` combines those profiles. “LIFETIME GAS” and “TOTAL GAS CONSUMPTION” are also displayed on the partial saved result; their local cards do not explain the observed-history limit (05, 08).
- Impact: users can read all-returned-history data as a last-twelve-month view, or incomplete gas totals as exhaustive lifetime values.
- Recommendation: show the actual returned date range/window and local coverage wording. Change the label or implement an explicitly approved window, not both implicitly. Keep global partial warnings and add concise metric-specific qualifiers.
- Acceptance: no LTM label without a tested 12-month filter; partial data says observed/lower-bound where appropriate; unknown and zero remain distinct. Contract: **Scope before interpretation**, **Evidence before certainty**.

### F09 · P2 · Rendered tab/filter semantics do not match the visual state

- Evidence: in the loaded result, the Single wallet tab points at `scan-mode-single-panel`, which does not exist because `LoadedScanSummary` replaces the panel wrapper (`page.tsx`). The loaded view has no h1; most dashboard module titles are spans, not headings. Transfer direction/network, flow filters, and protocol view/category buttons style selection but have no selected/pressed state. Protocol contract expansion lacks `aria-expanded`.
- Impact: nonvisual navigation cannot reliably discover the current panel, selected filters, or module hierarchy.
- Recommendation: preserve the tabpanel wrapper in collapsed-summary state; provide a result h1 and real section headings; expose selected/expanded state with semantics appropriate to each control.
- Acceptance: every tab target resolves in every mode; heading navigation covers the same sections visible to sighted users; changing a filter exposes its state. Contract: **Accessibility**.

### F10 · P2 · Protocol no-match and naming behavior is unfinished

- Evidence: searching `zzzz-no-match` left the protocol table with headers and an empty body, without a no-match explanation or reset action. The summary calls the largest group “Unclassified contracts,” while its table row and graph node say “Other.” The “TOTAL PROTOCOL FAMILIES” value is a count of chain/name groups, including multiple Other and Uniswap rows.
- Impact: users cannot easily distinguish zero results from a broken table and may interpret a chain-scoped row count as unique protocol families.
- Recommendation: explicit no-match/reset feedback; one user-facing unclassified label; label the count as chain-scoped groups or actually deduplicate families. Explain that protocol search currently matches names/protocol values, not arbitrary contract addresses.
- Acceptance: search/filter empty states are obvious; summary/table/graph terminology agrees; count semantics are tested. Contract: **Content voice**, **Interaction states**.

### F11 · P2 · Graph and heatmap alternatives describe data but do not cover all interaction

- Evidence: capital-flow SVG is `aria-hidden` while clickable `<g>` nodes expose explorer actions through mouse events; the textual graph list is not an equivalent set of actions. Heatmap cells expose exact counts through `title` on nonfocusable divs; the scroll-region summary gives only aggregate/peak values. Cluster source uses mouse drag/hover and hidden SVG nodes; cluster runtime was not tested.
- Impact: keyboard and touch users have less reliable access to exact values and node inspection. Existing text alternatives are a strength, not full interaction parity.
- Recommendation: provide an accessible node/edge list with the same inspection/explorer actions and a selected-cell or tabular heatmap detail view. Avoid adding 168 heatmap cells indiscriminately to the Tab order.
- Acceptance: keyboard users can perform the same inspection tasks; touch does not require hover; diagrams remain bounded and readable. Contract: **Accessibility**, **Responsive behavior**.

### F12 · P2 · Documentation index omits its first major section

- Evidence: there are 11 main content sections but only 10 indexed topics. `reporting-contract` is outside `SECTIONS`; it is neither listed nor matched by the topic filter. Several overflowing tables/code regions have no region name or explicit tab stop; desktop inspected widths included 900px content in an 880px wrapper.
- Impact: the canonical metric definitions are difficult to rediscover; narrower-table users do not get the same scroll cues as dashboard users. The 900px table is also the first substantial mobile reading task (12).
- Recommendation: index the reporting contract; add labeled bounded scroll regions and concise scroll hints; consider a readable mobile definition-list presentation for this first table. Keep technical content available.
- Acceptance: searching metric/reporting terms can find the section; keyboard and touch can reach all columns; focus is visible; the index count matches its actual content. Contract: **Information architecture**, **Accessibility**.

### F13 · P2 · Topic pages use a separate navigation/layout system

- Evidence: 14–19 use an independently coded header with “METHODOLOGY / OPEN SCANNER,” whereas scanner/docs use the shared mobile disclosure. The topic main shell is 1120px while the shared footer is 1400px, producing different desktop edges. At 320px, uppercase titles consume six or seven lines inside another padded card. FAQ summaries hide their native marker without a replacement icon.
- Impact: moving between discovery and product pages changes navigation and alignment; long hero blocks push useful content down; FAQ clickability is understated.
- Recommendation: reuse the shared header with appropriate topic state, align footer/content widths intentionally, shorten or resize narrow headings, flatten noninteractive explanatory cards, and add an explicit FAQ expansion affordance.
- Acceptance: all five routes retain distinct content and valid headings/links; consistent mobile navigation; aligned desktop shell; readable 320px headings; FAQ open/closed state evident without hovering. Contract: **Components**, **Visual language**, **Responsive behavior**.

### F14 · P3 · Secondary visual patterns and copy need consolidation

- Evidence: inactive badges and noninteractive metrics use button styling; protocol badges display internal names such as `OTHER_USER` (20). Dashboard tabs have a bottom border while each non-DNA panel adds another top border/padding (09). The data-quality disclosure hides its marker without adding a chevron. Cluster input wraps OP onto a separate row at 390px (11).
- Impact: decorative UI competes with real actions; dividers/padding repeat; related controls do not always share an obvious layout rule.
- Recommendation: reserve raised button treatments for actions, humanize internal badges, keep one tab/panel boundary, make disclosures visibly expandable, and give cluster networks the same deliberate mobile grouping as single-wallet mode.
- Acceptance: obvious action versus label distinction, no redundant separator, consistent four-network presentation, no lost status or control. Contract: **Visual language**, **Components**.

### F15 · P2 · Design documentation and tests disagree with the current implementation

- Evidence: AGENTS requests a dark theme, but the current pre-existing DESIGN contract and UI use light gray/white/orange. The input no longer contains the approved 288px maximum inner width; fresh measured well widths are 291px at 360 and 321px at 390. The corresponding responsive test fails. The implementation-order table in `ui_fixes.md` still has unchecked rows whose detailed sections are marked complete.
- Impact: future work can unintentionally reverse accepted decisions or weaken tests to match accidental drift. A green past checklist is not proof for this tree.
- Recommendation: obtain the two product choices recorded in DESIGN.md; reconcile the contract, implementation, and test in a later authorized change. Then refresh checklist summary status from current evidence. Do not silently switch themes or amend the test during this audit.
- Acceptance: one agreed theme/width rule; tests assert that rule plus rendered behavior; item 22 closes only with its required evidence. Contract: **Source of truth**, **Implementation constraints**, **Open questions**.

## Source-only follow-ups, not reproduced failures

- `docs/page.tsx:206` reports link-copy success immediately without awaiting/catching the clipboard promise. Add truthful success/failure feedback and a topic-specific accessible name in a future fix. Clipboard-denied state was not tested here.
- Cluster graph inspectors include fixed 280px minimum-width overlays and mouse-based panning. Test 320px containment, touch interaction, and keyboard inspection with a deterministic cluster fixture before claiming parity.
- Complete-state risk factor decomposition and partial/unavailable cluster summaries were inspected in source/tests but not rendered during this run. Do not treat the saved partial single-wallet result as coverage of those branches.
- Loading source has an elapsed timer, real phase/counter labels, a polite status message, and determinate/indeterminate progress behavior. Provider stalls, cancellation expectations, offline recovery, and error layouts need fixture-based runtime testing.
- Gas chart values are rounded to whole USD before plotting, while other screens preserve sub-cent values. Test dust-only monthly data and make its display rule explicit; this audit did not reproduce a dust chart.

## Recommended implementation order

1. Resolve the theme/mobile-width governance questions without changing the approved composition.
2. Repair F01–F05 individually, each with a regression test and a fresh rendered check.
3. Correct evidence-window/status/count language (F07, F08, F10) and rendered semantics (F09, F11, F12).
4. Approve and implement the mobile result prioritization and shared topic shell (F06, F13).
5. Consolidate secondary visual details (F14); reconcile checklist evidence (F15).
6. Finish the existing item-22 gate using deterministic complete/partial/unavailable/cluster/loading fixtures, keyboard checks, real zoom and reduced-motion testing, then canonical repository verification. No deployment is included.

## Verification results and limitations

| Check | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm test` | First attempt blocked by sandbox IPC permissions; approved retry executed 251 tests: 250 passed, 1 failed |
| Failed test | `src/components/p3ResponsiveLayout.test.ts:31`: expected wallet input classes `max-w-[288px] md:max-w-none`, absent in current source |
| Failure repeat | A second run reproduced the same one failing test |
| `git diff --check` | Passed before report creation; rerun at handoff |
| Browser | Seven routes, six saved single-wallet tabs, cluster input; fresh captures and targeted interactions above |
| Scanner dimensions | Mobile network/Scan buttons 44px; desktop networks 36px and Scan 44px; mobile input well 38px; no measured page overflow in the seven tested widths |
| UI changes | None; only design/audit documentation and fresh screenshots |

Not tested: provider-backed fresh scans, complete-state dashboard/risk decomposition, unavailable-state dashboard, completed/partial cluster browser flows, export download, actual clipboard writes/denial, every graph/filter combination, all four saved demos, real mobile devices, Safari/iOS, screen readers, real 200% zoom, forced colors, reduced-motion runtime, offline/429/timeout states, production build/deployment, or unknown-route/error-page recovery. No formal color-contrast certification, performance benchmark, or analytics-math audit was performed. Some styling and semantics findings come from current source in addition to screenshots and are labeled accordingly.

`npm run verify` was not run: this is a documentation-only audit and the mandatory test/lint checks already exposed an existing failure. No production or release-readiness claim is made. The existing development server was left running; temporary browser viewport override was reset.

## Screenshot walkthrough

### 1. Entry — clear task hierarchy; idle copy/focus issues

![Desktop scanner](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/design-audit-2026-08-27/01-landing-desktop.png)

![Mobile scanner](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/design-audit-2026-08-27/02-landing-mobile.png)

![Mobile empty-submit validation](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/design-audit-2026-08-27/03-validation-mobile.png)

### 2. Result — explicit evidence, excessive mobile context

![Mobile saved result](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/design-audit-2026-08-27/04-result-mobile.png)

![Desktop saved result](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/design-audit-2026-08-27/05-result-desktop.png)

### 3. Flow — protocol nodes overlap

![Overlapping flow protocol nodes](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/design-audit-2026-08-27/06-flow-desktop.png)

### 4. Protocols — useful summary; unfinished search feedback

![Protocols dashboard](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/design-audit-2026-08-27/07-protocols-desktop.png)

### 5. Gas — strong card grid; coverage language needs qualification

![Gas dashboard](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/design-audit-2026-08-27/08-gas-desktop.png)

### 6. Transfers — operable paging and aligned mobile controls

![Mobile transfer controls and second page](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/design-audit-2026-08-27/09-transfers-mobile.png)

### 7. Approvals — clear filtered empty state

![Mobile approval no-match state with High risk filter](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/design-audit-2026-08-27/10-approvals-mobile.png)

### 8. Cluster — invalid entry ignored; network control wraps

![Cluster input with invalid token](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/design-audit-2026-08-27/11-cluster-mobile.png)

### 9. Docs — useful structure; index/filter interaction needs repair

![Mobile documentation](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/design-audit-2026-08-27/12-docs-mobile.png)

![Desktop documentation](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/design-audit-2026-08-27/13-docs-desktop.png)

### 10. EVM topic — readable desktop; tall mobile hero

![Desktop topic template](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/design-audit-2026-08-27/14-topic-desktop.png)

![EVM topic at 320px](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/design-audit-2026-08-27/15-topic-320.png)

### 11. Risk topic — readable; shared template concerns

![Risk topic at 320px](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/design-audit-2026-08-27/16-risk-topic-320.png)

### 12. Approval topic — narrow title dominates

![Approval topic at 320px](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/design-audit-2026-08-27/17-approval-topic-320.png)

### 13. Sybil topic — readable; shared template concerns

![Sybil topic at 320px](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/design-audit-2026-08-27/18-sybil-topic-320.png)

### 14. Multi-chain topic — readable; shared template concerns

![Multi-chain topic at 320px](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/design-audit-2026-08-27/19-multichain-topic-320.png)

### Supporting detail — heatmap time-window contradiction

![LTM heatmap showing 1501 active days](/Users/maxdi/Downloads/webDev/AI/Wallet_Analytics/output/design-audit-2026-08-27/20-heatmap-mobile.png)
