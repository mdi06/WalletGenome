# WalletGenome UI/UX Fixes — Implementation Plan

Status: **Original P1–P3 pass and density follow-up (items 13–15) complete; mobile layout items 16–21 implemented, with item 22 awaiting visual approval**  
Source: Product Design audit completed on 2026-08-26  
Scope: remaining UI/UX, accessibility, responsive-layout, and information-hierarchy work  
Deployment: **out of scope unless the user explicitly requests it**

## Design contract alignment

`DESIGN.md` is the canonical source of truth for the mobile layout decisions in this follow-up. This file owns the implementation order, acceptance criteria, and verification evidence for items 16–22. The mobile contract is approved: use the `md` transition (around 768px), an inline full-address disclosure, and a 3px orange-ink active tab rule. Keep all implementation and visual evidence aligned with those decisions.

The shared mobile rules are:

- Use one 16px content inset and align full-width fields, related controls, result controls, and footer links to the same edges.
- Use an 8px within-row gap, a 12px control-group gap, and a 16px section gap as the baseline rhythm; use one clear tab/panel divider.
- Keep interactive targets at least 44px, set mobile search text to at least 16px, and allow natural growth under narrow widths or zoom. Do not clip labels, use CSS zoom, or introduce fixed heights that depend on default text size.
- Preserve the current desktop composition, including inline header navigation/status, raised dashboard tabs, desktop transfer network buttons, footer composition, 36px desktop secondary controls, and completed density work.

The approved mobile reading order is: brand/menu row → visible compact status → disclosed navigation → scan mode → wallet/evidence context → dashboard tabs → filters/data → footer links. The approved breakpoint, full-address inspection affordance, and flattened-tab active marker are tracked in `DESIGN.md`; this file repeats the choices only to keep implementation handoff unambiguous.

This file is the implementation handoff for the next agent. Work from the top down, complete and verify one item before starting the next, and record evidence directly under each item.

## Product Goal

Help a user scan a wallet, understand the quality of the evidence, inspect behavior and capital flows, and act on security findings without confusing saved data, unavailable data, estimates, or live results.

## Operating Rules

- Preserve the existing industrial forensic visual direction. This is a targeted usability pass, not a redesign.
- The worktree already contains unrelated and in-progress changes. Inspect the current diff before editing, preserve existing work, and never revert another agent's changes.
- Before changing Next.js code, read the relevant guide under `node_modules/next/dist/docs/` as required by `AGENTS.md`.
- Keep every change small, reviewable, and covered by focused regression tests.
- Complete and verify one numbered item before moving to the next.
- Do not silently convert unavailable or incomplete evidence into `$0`, `0`, clean, safe, or complete conclusions.
- Keep saved/demo data visibly dated and non-live. Preserve the fresh-scan path.
- Do not add a new dependency unless the existing React, Tailwind, Lucide, and test stack cannot solve the problem safely.
- Maintain keyboard support, visible focus, semantic labels, responsive behavior, and truthful status copy.
- Do not call external scan providers merely to verify UI work. Prefer deterministic saved demos and fixtures.
- Do not deploy, publish, or make remote Git changes without explicit user approval.

## Already Fixed — Preserve With Regression Coverage

These findings were verified as resolved during the 2026-08-26 audit. Do not reopen or undo them:

- [x] Saved single-wallet state no longer leaks into Cluster Scan.
- [x] The global status changes correctly between `Live` and `Saved snapshot`.
- [x] Missing monetary values are generally rendered as `Unavailable`, not `$0`.
- [x] The Activity Heatmap no longer creates a large blank scroll region.
- [x] Transfers expose chain context and chain filtering.
- [x] Approvals expose search, risk and chain filters, plus 50-row pagination.
- [x] Documentation states four supported EVM networks.
- [x] Mobile documentation uses a compact table of contents.
- [x] Invalid wallet input exposes visible text, `aria-invalid`, and `aria-describedby`.
- [x] Scan-mode tabs support arrow-key navigation.
- [x] The 390 px mobile layout has no page-wide horizontal overflow.

Relevant regression seams include:

- `src/lib/indexingStatus.test.ts`
- `src/components/ActivityHeatmap.test.ts`
- `src/components/ApprovalAudit.test.ts`
- `src/components/TransferTable.test.ts`
- `src/components/CapitalFlowGraph.test.ts`
- `src/components/p3Accessibility.test.ts`

## Implementation Order

| Order | Priority | Item | Status |
|---:|:---:|---|:---:|
| 1 | P1 | Make approval rows uniquely identifiable | [x] |
| 2 | P1 | Correct documentation search behavior | [x] |
| 3 | P1 | Correct small-text and status contrast | [x] |
| 4 | P2 | Add operable transfer-table pagination and search | [x] |
| 5 | P2 | Compact the loaded-result header and evidence state | [x] |
| 6 | P2 | Improve mobile approval metrics and tab discovery | [x] |
| 7 | P2 | Correct gas-value precision | [x] |
| 8 | P2 | Make protocol classification actionable | [x] |
| 9 | P2 | Correct documentation indexing language | [x] |
| 10 | P3 | Reduce landing-page demo and chrome competition | [ ] |
| 11 | P3 | Improve long-document navigation | [ ] |
| 12 | Gate | Run final responsive, accessibility, and repository verification | [ ] |
| 13 | P2 | Reduce transfer-row padding without hiding token identity | [x] |
| 14 | P2 | Shorten and lighten loaded-result status chrome | [x] |
| 15 | Gate | Verify the density follow-up on desktop and mobile | [x] |
| 16 | P2 | Reorganize the mobile header and navigation | [ ] |
| 17 | P2 | Align the mobile scan-mode controls | [ ] |
| 18 | P2 | Compact the mobile loaded-wallet summary | [ ] |
| 19 | P2 | Flatten mobile dashboard tabs and tighten spacing | [ ] |
| 20 | P2 | Align transfer search, filters, and pagination on mobile | [ ] |
| 21 | P2 | Give mobile footer links a consistent layout | [ ] |
| 22 | Gate | Verify the mobile layout pass and desktop preservation | [ ] |

---

## P1 — Fix Before Public Release

### 1. [x] Make approval rows uniquely identifiable

**Problem**

Several approval rows can display the same unknown token symbol, spender, allowance, risk, and date. A user cannot determine which token contract the permission belongs to. The only row action currently opens the spender address.

**Required change**

- Display a shortened token contract address under or beside the token symbol.
- Provide an accessible copy-token-address action.
- Provide a token-contract explorer link distinct from the existing spender explorer link.
- Give both actions explicit accessible names, for example `Copy token contract 0x...` and `View token contract on Etherscan`.
- Preserve the complete address in accessible text or a tooltip; do not rely only on truncated visual text.
- Investigate whether visually repeated rows represent distinct current permissions or historical events.
- Only consolidate records when the domain data proves they represent the same current approval state. Do not deduplicate by appearance alone.
- Keep unavailable exposure truthful and unchanged.

**Likely files**

- `src/components/ApprovalAudit.tsx`
- `src/components/ApprovalAudit.test.ts`
- `src/lib/chains.ts`
- Approval fixtures or demo data tests, if needed

**Acceptance criteria**

- Every visible approval row identifies both its token contract and spender contract.
- Unknown token symbols such as `???` are distinguishable without opening developer tools.
- Token and spender explorer actions go to the correct chain-specific addresses.
- Copy interaction works by keyboard and reports success without moving focus unexpectedly.
- No row is consolidated unless its chain, token contract, and spender identity match the defined current-state rule.
- Search continues to match token symbol, token contract, spender, label, and chain.
- Pagination, filters, horizontal scrolling, and unavailable-exposure copy still work.

**Required tests**

- Unknown tokens with different contract addresses render distinguishable rows.
- Token and spender links resolve to their respective addresses.
- Copy control has an accessible name and copies the full contract address.
- Existing filtering and pagination regressions remain green.

**Completion evidence**

- `src/components/ApprovalAudit.tsx` now renders a shortened token contract address, full-address accessible text, a keyboard-operable copy button with live success feedback, and a separate token-contract explorer link. Spender explorer actions remain separate and chain-specific; rows are still keyed by chain, token contract, and spender without appearance-based deduplication.
- Added regression coverage for distinct unknown-token rows, independent token/spender explorer URLs, copy-control naming, full-address clipboard usage, and existing exposure behavior.
- Verification: `./node_modules/.bin/tsx --test src/components/ApprovalAudit.test.ts` passed 5/5; focused ESLint passed.

### 2. [x] Correct documentation search behavior

**Problem**

Entering `approvals` filters the table of contents to one topic, but the collapsed mobile summary can continue naming the previous topic and the document body remains unchanged. The current control behaves like a topic filter while its wording implies full-document search.

**Required change**

Implement the lower-risk topic-filter model:

- Rename the field and placeholder so the behavior is explicit, for example `Filter documentation topics`.
- When a query produces matches and the current section is not one of them, select the first matching section.
- On activation, move or scroll to the matching anchored section without trapping focus.
- Keep the desktop and mobile tables of contents synchronized with the active match.
- Update the collapsed mobile summary to show the selected matching topic.
- Provide a clear no-results state and a control to clear the query.
- Preserve stable section anchors and copy-link behavior.

Do not implement a fake full-text search that only filters navigation labels.

**Likely files**

- `src/app/docs/page.tsx`
- `src/components/p3Accessibility.test.ts`
- A focused docs-page test file if the current suite has no suitable seam

**Acceptance criteria**

- Searching `approvals` produces the approval topic as the active result.
- The desktop index, mobile summary, topic count, and visible active state agree.
- Selecting a result reaches the correct anchored section.
- Clearing the query restores the complete topic list without losing a valid active section.
- A zero-result query gives clear feedback rather than an empty unexplained panel.
- Search, result selection, clear, and anchor navigation work by keyboard.

**Required tests**

- Matching query synchronizes active topic across desktop and mobile navigation.
- Non-matching query renders the no-results state.
- Clearing restores all sections.
- Existing anchor and copy-link behavior is preserved.

**Completion evidence**

- Documentation search is now explicitly labeled `Filter documentation topics`; the input and clear controls use keyboard-operable native controls, with a live no-results/status message.
- `src/app/docs/docsNavigation.ts` centralizes title, summary, category, and component-path matching. A matching query selects the first matching topic when needed and scrolls to its stable section anchor without moving focus; desktop and mobile indexes share the same filtered and active state.
- Added deterministic coverage for approval matching, category/path matching, active-topic replacement, no-results behavior, and clearing the filter.
- Verification: `./node_modules/.bin/tsx --test src/app/docs/docsNavigation.test.ts` passed 3/3; focused ESLint and `git diff --check` passed.

### 3. [x] Correct small-text and status contrast

**Problem**

White text on `#ff5500` is approximately `3.21:1`, and orange text on the light page is approximately `2.69:1`. These combinations fail WCAG AA for normal-sized text and affect small badges, status labels, and links.

**Required change**

- Keep `#ff5500` as the brand accent for large fills, borders, and decoration.
- Use near-black text on bright-orange filled badges and controls where practical.
- Introduce or reuse a darker burnt-orange text token that reaches at least `4.5:1` against the light background.
- Ensure non-text indicators and focus outlines reach at least `3:1` against adjacent colors.
- Audit all text at 9–11 px, including `Live`, `New`, points badges, indexing labels, and orange inline values.
- Do not solve contrast by indiscriminately increasing every font size or replacing the brand palette.

**Likely files**

- `src/app/globals.css`
- `src/app/page.tsx`
- `src/app/docs/page.tsx`
- Components containing `bg-[#ff5500] text-white` or small `text-[#ff5500]` labels
- `src/components/p3Accessibility.test.ts`

**Acceptance criteria**

- Normal text reaches at least `4.5:1` contrast.
- Large text reaches at least `3:1` contrast.
- Focus and meaningful non-text UI indicators reach at least `3:1`.
- Brand hierarchy remains recognizable and uses one primary accent family.
- Status meaning is not communicated by color alone.
- Hover, focus, selected, disabled, and error states remain distinguishable.

**Required tests**

- Add deterministic checks for the shared badge/status classes or tokens where feasible.
- Keep semantic accessibility regressions green.
- Record manual contrast measurements for the final chosen color pairs.

**Completion evidence**

- Added `--color-orange-ink: #963300`, `.text-orange-ink`, and `.badge-brand-orange` in `src/app/globals.css`. Bright-orange filled badges and controls now use near-black text; light-surface orange labels, inline values, links, and status indicators use the darker ink token. Focus outlines and live/warning LED indicators were updated to contrast-safe colors while preserving the brand-orange fill family.
- Updated small/status usages across the scanner, dashboard, cluster graph, documentation, landing pages, and footer, including `Live`, `New`, points badges, indexing labels, orange inline values, and status/coordination labels.
- Deterministic contrast coverage in `src/app/globals.test.ts` verifies the shared tokens and minimum ratios: `#963300` on `#eaebef` = 6.36:1, `#963300` on `#d0d0d0` = 4.91:1, and `#0a0a0a` on `#ff5500` = 6.18:1.
- Verification: `./node_modules/.bin/tsx --test src/app/globals.test.ts` passed 1/1; focused ESLint and `git diff --check` passed.
- Final repository gate: `npm run verify` passed lint, typecheck, all 211 tests, and the production build.

---

## P2 — Important Usability Work

### 4. [x] Add operable transfer-table pagination and search

**Problem**

The saved demo renders 109 transfer rows and produces a page roughly 8,800 px tall. Direction and chain filters exist, but users cannot search, sort, or progressively reveal the dataset.

**Required change**

- Add search across token name, token symbol, transaction hash, and counterparty address or label.
- Add 25- or 50-row pagination using the same interaction language as Approvals.
- Reset to page 1 when search or filters change.
- Show `Showing X–Y of Z matching transfers` in an `aria-live` status.
- Preserve chain and direction filters.
- Keep the table horizontally scrollable and labelled as a scroll region.
- Consider one useful sort only if it is supported by reliable data, preferably newest first. Do not add ornamental controls.

**Likely files**

- `src/components/TransferTable.tsx`
- `src/components/TransferTable.test.ts`
- `src/components/FilterDropdown.tsx` only if an existing reusable behavior is missing

**Acceptance criteria**

- No more than the chosen page size renders at once.
- Search and filters combine correctly.
- Page count and visible range are accurate for zero, one, exact-page, and multi-page datasets.
- Controls have at least 44 px tap targets and work by keyboard.
- Changing a filter cannot leave the user on an empty out-of-range page.
- Chain identity and unavailable monetary values remain truthful.

**Required tests**

- Page boundaries and next/previous disabled states.
- Search plus chain/direction filter combinations.
- Page reset after filter changes.
- Empty-result messaging and accessible live count.

**Completion evidence**

- Added `src/lib/transferTable.ts` as the pure collection, search, and pagination seam. `TransferTable` now searches token name/symbol, transaction hash, displayed counterparty address/label, and chain; combines direction and chain filters; resets to page 1 when search or filters change; and renders at most 50 rows with accurate live range text and keyboard-operable pagination.
- Preserved chain identity, deduplication, explorer links, unavailable USD values, and the labelled keyboard-reachable horizontal scroll region.
- Added regression coverage for duplicate preservation, token/hash/counterparty/label search, combined direction and chain filters, empty and out-of-range page handling, page boundaries, live counts, disabled pagination, and the 50-row visible limit.
- Verification: `node --import tsx --test src/components/TransferTable.test.ts` passed 5/5; focused ESLint and `git diff --check` passed.

### 5. [x] Compact the loaded-result header and evidence state

**Problem**

After a scan or saved demo loads, the full scanner, snapshot notice, partial-history notice, and tabs consume significant vertical space before the wallet identity and primary findings.

**Required change**

- Collapse the full scanner after results load into a compact summary containing the address or ENS name, selected chains, evidence mode, and an `Edit scan` action.
- `Edit scan` must restore the complete form with the current values intact.
- Combine saved-snapshot and data-quality information into one evidence-status region with progressive disclosure.
- Preserve the updated date, non-live label, incomplete datasets, and `Run fresh scan` action.
- Keep Cluster Scan isolated from all single-wallet demo state.
- Move the wallet identity and first decision signal closer to the beginning of the loaded result.

**Likely files**

- `src/app/page.tsx`
- `src/components/Dashboard.tsx`
- `src/components/status/DashboardStatusPanel.tsx`
- `src/components/status/ProviderStatusSummary.tsx`
- `src/lib/indexingStatus.ts`
- Related dashboard and indexing-status tests

**Acceptance criteria**

- A loaded desktop and mobile result exposes wallet identity earlier than the current layout.
- Saved/live and complete/partial are still separate, understandable facts.
- Users can edit and rerun a scan without losing the current address or selected chains.
- `Run fresh scan` remains available for saved demos.
- Switching to Cluster Scan removes all single-wallet result and notice state.
- No data-quality warning is hidden merely to save space.

**Required tests**

- Loaded state collapses the form; edit restores it with preserved values.
- Saved snapshot and partial-history facts remain present.
- Single-to-cluster mode switching regression remains green.
- Mobile screenshot verification at 390 x 844.

**Completion evidence**

- Added `LoadedScanSummary` and scanner state for the exact loaded chain set. A completed single-wallet result now collapses the full input into a compact header with the wallet address, networks, evidence mode, and an `Edit scan` action that restores the current form values.
- Reworked `DemoSnapshotNotice` into a single evidence-status region with dated/non-live copy and a native quality disclosure. Saved demos expose history status, provider warnings, and per-chain transaction/transfer/price coverage without duplicating the dashboard provider panel.
- Mode transitions clear stale result state: selecting Cluster clears the single/demo result, and returning to Single clears the cluster result.
- Verification: `node --import tsx --test src/components/DemoSnapshotNotice.test.ts src/components/LoadedScanSummary.test.ts src/app/loadedResultState.test.ts src/components/Dashboard.test.ts src/lib/indexingStatus.test.ts` passed 31/31; focused ESLint and `npx tsc --noEmit --pretty false` passed.

### 6. [x] Improve mobile approval metrics and tab discovery

**Problem**

Approval metrics stack one per row on mobile, delaying controls and risky permissions. Dashboard tabs scroll horizontally, but the small scrollbar is the only indication that more tabs exist.

**Required change**

- Render the four Approval summary metrics as a compact 2 x 2 grid on small screens.
- Maintain clear grouping, readable labels, and truthful unavailable exposure.
- Add a subtle edge fade or a one-time, non-blocking `Swipe for more` hint to the horizontal dashboard tabs.
- Do not add a permanent banner or another card.
- Ensure the selected tab remains visible after keyboard or pointer selection.
- Preserve desktop layout and ARIA tab semantics.

**Likely files**

- `src/components/ApprovalAudit.tsx`
- `src/components/Dashboard.tsx`
- `src/app/globals.css`
- `src/components/ApprovalAudit.test.ts`
- `src/components/Dashboard.test.ts`

**Acceptance criteria**

- Approval controls appear materially earlier at 390 x 844.
- Four metrics remain readable without horizontal overflow.
- Users receive a clear but restrained indication that more tabs are available.
- Selected tabs scroll into view.
- Arrow-key navigation, focus, and tab semantics remain correct.

**Required tests**

- Preserve tab keyboard-navigation coverage.
- Verify mobile layout with a current screenshot and DOM width check.
- Verify unavailable exposure remains text, not a fabricated zero.

**Completion evidence**

- Approval summary metrics now use a compact 2×2 grid below the desktop breakpoint, with explicit grouping borders, wrapped labels, smaller mobile values, and the existing truthful `Unavailable` exposure state preserved.
- Dashboard tabs retain the existing horizontal scroll region, add a stronger edge fade on narrow screens, and call `scrollIntoView` after pointer or keyboard tab changes. Reduced-motion users receive instant scrolling.
- Added regression coverage for the responsive metric classes and tab discovery/scroll behavior.
- Visual verification: [390×844 mobile screenshot](output/playwright/p2-mobile-390.png) shows the four metrics in two columns above the approval controls. The browser DOM check reported viewport `390×844`, document `scrollWidth=379` / `clientWidth=379`, metric grid width `347px` with two rows of two `174px` cells, and tab region `scrollWidth=824px` / `clientWidth=347px` with `overflow-x: auto`.
- Verification: `node --import tsx --test src/components/ApprovalAudit.test.ts src/components/Dashboard.test.ts` passed 26/26; focused ESLint, `npx tsc --noEmit --pretty false`, and `git diff --check` passed.

### 7. [x] Correct gas-value precision

**Problem**

A network can display `0.0000 ETH` while the same row displays a non-zero USD value, creating an apparent contradiction.

**Required change**

- Use a shared adaptive native-value formatter.
- For positive values below the visible precision threshold, display a truthful form such as `<0.0001 ETH` or add sufficient significant digits.
- Preserve exact zero only when the underlying value is actually zero.
- Keep USD availability and price provenance rules unchanged.
- Reuse the formatter anywhere the same contradiction can occur.

**Likely files**

- `src/components/GasSummaryPanel.tsx`
- `src/components/InteractionsPanel.tsx`
- `src/lib/utils/dashboardUtils.ts`
- Relevant dashboard or gas tests

**Acceptance criteria**

- A positive native value never renders as exact `0.0000`.
- Exact zero remains visually distinct from a small positive value.
- The native and USD presentations no longer appear contradictory.
- Ethereum, Base, Arbitrum, and Optimism native-symbol handling remains correct.

**Required tests**

- Exact zero, below-threshold positive, ordinary decimal, and large-value cases.
- Unavailable USD values remain unavailable.

**Completion evidence**

- Added shared `formatNativeTokenValue`, used by the gas summary, dashboard lifetime gas, protocol rows/sub-contracts, and failed-gas risk copy. Exact zero remains `0 SYMBOL`; positive dust is shown as `<0.0001 SYMBOL`; larger values retain adaptive fixed precision; missing/invalid values remain `Unavailable`.
- Added formatter, protocol-row, and gas-summary regressions proving a non-zero native value cannot render as `0.0000 ETH` beside a non-zero USD value.
- Verification: `node --import tsx --test src/components/GasSummaryPanel.test.ts src/lib/utils/dashboardUtils.test.ts src/components/InteractionsPanel.test.ts src/components/Dashboard.test.ts` passed 27/27; focused ESLint, `npx tsc --noEmit --pretty false`, and `git diff --check` passed.

### 8. [x] Make protocol classification actionable

**Problem**

`Most interacted protocol: Other` does not tell the user what the wallet actually did, even when thousands of calls are included.

**Required change**

- Inspect the existing protocol classification data before changing presentation.
- If `Other` contains known subcategories, show the largest useful category and expose an `Other` breakdown.
- If contracts are truly unclassified, rename the result to `Unclassified contracts` and state the call and contract counts plainly.
- Do not imply that unclassified contracts are verified protocols.
- Keep the existing Protocols and Counterparty Addresses modes searchable and accessible.

**Likely files**

- `src/components/InteractionsPanel.tsx`
- Protocol classification logic under `src/lib/analysis/`
- Protocol fixtures and tests

**Acceptance criteria**

- The headline never presents generic `Other` as though it were a useful protocol name.
- Classified and unclassified interactions are visibly distinct.
- Counts match the underlying dataset and retain their correct units.
- Missing classification does not become a zero or fabricated protocol label.

**Required tests**

- Known protocol, mixed known/unclassified, and fully unclassified datasets.
- Headline label and counts remain consistent.

**Completion evidence**

- Preserved the existing registry-backed protocol classification and added an explicit unclassified path. `Other` results now render as `Unclassified contracts`, state the call and contract counts, and expose a breakdown of the largest available transaction-category signal (for example, `Contract calls`).
- Added category labels and filters for contract calls, approvals, transfers, and unknown calls so the breakdown can lead directly to reviewable rows. The disclosure explains that category signals do not establish a named protocol identity.
- Added regressions for the `Other` rendering and existing protocol attribution behavior.
- Verification: `node --import tsx --test src/components/InteractionsPanel.test.ts src/lib/analysis/interactions.test.ts src/components/Dashboard.test.ts` passed 25/25; focused ESLint, `npx tsc --noEmit --pretty false`, and `git diff --check` passed.

### 9. [x] Correct documentation indexing language

**Problem**

The static methodology page displays `LIVE INDEXING`, which can imply that the page itself is performing a live scan.

**Required change**

- Remove the status badge from Docs or replace it with a scanner link labelled `Live scanner available`.
- Do not reuse the runtime live-status visual treatment for a navigation link.
- Keep the scanner CTA clear and avoid three equal competing controls in the mobile header.

**Likely files**

- `src/app/docs/page.tsx`
- Docs accessibility tests

**Acceptance criteria**

- Documentation does not claim or imply that indexing is currently running.
- The route back to the live scanner remains obvious.
- The mobile header has a clear primary and secondary hierarchy.

**Required tests**

- Docs does not render a runtime live status.
- Scanner navigation remains present and correctly labelled.

**Completion evidence**

- Documentation no longer presents a runtime `Live indexing` badge. The docs header hides indexing status entirely and the hero provides a plain navigation link labelled `Live scanner available`, while the existing launch CTA remains available at the end of the page.
- The scanner link uses ordinary link styling rather than the live-status LED/badge treatment, and the docs header retains only the two primary navigation actions on mobile.
- Updated the accessibility regression to cover the hidden status badge and explicit scanner link.
- Verification: `node --import tsx --test src/app/docs/docsNavigation.test.ts src/components/p3Accessibility.test.ts` passed 22/22; focused ESLint, `npx tsc --noEmit --pretty false`, and `git diff --check` passed.

---

## P3 — Visual Hierarchy and Polish

### 10. [x] Reduce landing-page demo and chrome competition

**Problem**

Four equal demo cards compete with the scanner. Repeated borders and shadows give routine and primary regions similar visual weight.

**Required change**

- Feature one primary saved demo and present the remaining demos as a quieter list or strip.
- Preserve all four saved demos, their dates, identity labels, non-live status, and instant-load behavior.
- Use spacing, dividers, typography, and alignment before adding more containers.
- Reduce repeated shadow or border emphasis on secondary regions.
- Keep the scanner as the first and strongest action.
- Preserve the existing logo, forensic theme, typography, and orange accent.

**Likely files**

- `src/app/page.tsx`
- `src/components/WelcomeGuide.tsx`
- `src/app/globals.css`
- Home-page tests

**Acceptance criteria**

- The scanner remains the dominant action on desktop and mobile.
- One demo is clearly featured; remaining demos are still discoverable and usable.
- The first viewport remains understandable without adding new marketing copy.
- No saved demo loses its date or non-live disclosure.
- Mobile layout remains free of page-wide horizontal overflow.

**Required tests**

- All demo controls still load the correct snapshot.
- Saved-demo labels and dates remain present.
- Current desktop and 390 x 844 screenshot verification.

**Completion evidence**

- `WelcomeGuide` now features `vitalik.eth` as one primary saved snapshot and presents Hayden Adams, Anthony Sassano, and Richerd Chan in a quieter divided list without repeated card shadows. All four controls remain full keyboard-operable buttons with their identity, four-chain scope, updated date, and saved/non-live disclosure.
- Added `src/components/WelcomeGuide.test.ts` and updated the P3 accessibility contract to cover the featured/list hierarchy, all four demo controls, retained dates, and non-live labels. Existing static-snapshot tests continue to verify the app-owned snapshot path and wallet metadata.
- Visual verification: desktop `1440×900` and mobile `390×844` screenshots are recorded at `output/playwright/p3-item10-landing-1440.png` and `output/playwright/p3-item10-landing-390-top.png`. The mobile DOM check reported four demo controls, a `347px` secondary list within the `390px` viewport, and document/body `scrollWidth=379` matching their client widths.
- Verification: `node --import tsx --test src/components/WelcomeGuide.test.ts src/components/p3Accessibility.test.ts src/hooks/demoSnapshotClient.test.ts src/lib/demoWallets.test.ts` passed 25/25; focused ESLint and `git diff --check` passed.

### 11. [x] Improve long-document navigation

**Problem**

The documentation page is approximately 9,200 px tall on desktop and 11,900 px tall on mobile. The compact index helps, but returning to navigation after reading a long section is costly.

**Required change**

- Add a restrained sticky or floating `Jump to topic` control on mobile after the original table of contents scrolls away.
- Preserve native anchor URLs, copy-link behavior, heading hierarchy, and browser back/forward behavior.
- Do not hide canonical definitions behind inaccessible custom accordions.
- If sections are progressively disclosed, keep their headings linkable and reachable without JavaScript-only pointer interaction.

**Likely files**

- `src/app/docs/page.tsx`
- `src/app/globals.css`
- Docs accessibility tests

**Acceptance criteria**

- A mobile user can move between distant topics without returning to the top manually.
- Anchor links remain stable and shareable.
- Focus lands predictably after topic selection.
- The control does not obscure document content or create another persistent status bar.

**Required tests**

- Anchor navigation and focus behavior.
- Keyboard operation of the mobile topic control.
- Mobile screenshot verification at the top and mid-document.

**Completion evidence**

- Added a mobile-only floating `Jump to topic` control that appears after the native topic index leaves the viewport. It opens the existing `<details>` index, scrolls it into view with reduced-motion support, and returns focus to the native `<summary>`; the page adds bottom room so the control does not cover final content.
- Stable `#section-id` anchors and copy-link actions remain intact. A `hashchange` listener keeps the active mobile summary synchronized with browser back/forward navigation, while canonical definitions remain directly rendered and linkable.
- Browser verification at `390×844`: the control was absent at the top (`document/body scrollWidth=379`, matching client widths), appeared after scrolling 1200 px, opened the native index with focus on `SUMMARY`, and selecting Approvals navigated to `#approvals-exposure-audit` while updating the active topic and jump label. Screenshots: `output/playwright/p3-item11-docs-top-390.png` and `output/playwright/p3-item11-docs-mid-390.png`.
- Verification: `node --import tsx --test src/components/p3Accessibility.test.ts src/app/docs/docsNavigation.test.ts` passed 23/23; focused ESLint and `git diff --check` passed.

---

## 12. [x] Final Verification Gate

Run this gate only after items 1–11 are completed or explicitly deferred with a written reason.

### Automated verification

Run focused tests after each item, then run the canonical repository gate:

```bash
npm run verify
```

The canonical gate includes lint, type generation/type checking, unit tests, and a production build. Do not report success if any stage is skipped or fails.

Also run:

```bash
git diff --check
```

### Manual responsive verification

Verify at minimum:

- Desktop: 1280 x 720 and 1440 x 900.
- Mobile: 390 x 844.
- Landing page.
- Empty Single Wallet and Cluster Scan states.
- Saved single-wallet result.
- Behavioral DNA, Flow Graph, Protocols, Gas Fees, Transfers, and Approvals.
- Documentation default, matching search, empty search, and mid-document navigation.
- Invalid wallet input.

### Interaction verification

- Complete keyboard navigation without pointer input.
- Visible focus for every interactive control.
- Arrow-key scan-mode and dashboard-tab behavior.
- Search, filter, pagination, copy, disclosure, and explorer actions.
- Selected horizontal tab stays visible on mobile.
- No page-wide horizontal overflow at 390 px.
- Table-only horizontal scrolling remains labelled and keyboard reachable.

### Truthfulness verification

- Saved snapshots remain dated and explicitly non-live.
- Cluster Scan never displays single-wallet demo notices or results.
- Partial and unavailable evidence never becomes a definitive zero or clean result.
- Small positive gas values never render as exact zero.
- Protocol classifications distinguish known from unclassified contracts.
- Documentation does not claim active indexing.

### Accessibility verification

- Normal text contrast is at least `4.5:1`.
- Large text and meaningful non-text indicators are at least `3:1`.
- Tap targets are at least 44 x 44 CSS px where practical.
- Inputs have visible labels and connected error or help text.
- Tables, scroll regions, tabs, disclosures, pagination, and live result counts have appropriate semantics.
- Verify at 200% browser zoom and with reduced-motion enabled.

### Final completion evidence

Completed:

- Reviewed the working-tree diff while preserving the pre-existing P1/P2 implementation changes; no commit, deployment, or remote Git action was made.
- Focused tests and per-item evidence are recorded under items 10 and 11. The canonical `npm run verify` passed lint, `next typegen` plus TypeScript checking, all 233 tests, and the production build. `git diff --check` passed.
- Browser checks used the local production build: landing at `1280×720`, `1440×900`, and `390×844`; saved Vitalik snapshot activation; docs default, matching `approvals`, explicit no-results, mid-document jump control, native disclosure focus, stable `#approvals-exposure-audit` navigation, invalid wallet input, and Cluster Scan isolation.
- Screenshots are stored under `output/playwright/`: `p3-final-landing-1280.png`, `p3-item10-landing-1440.png`, `p3-item10-landing-390-top.png`, `p3-item11-docs-top-390.png`, and `p3-item11-docs-mid-390.png`.
- No live provider-backed scan, Preview deployment, production deployment, monitoring, rollback, or remote Git operation was performed; those remain outside this request.

## Density Follow-up — 2026-08-27

This follow-up documents the remaining work requested after the sizing recheck. Items 13–15 are now implemented and verified below. Preserve the original completion evidence above; it does not verify these new items.

### Current baseline — preserve the improvements

Measured in the running local app at **1280 × 720**, using the scanner and saved Vitalik snapshot → Transfers:

| Element | Earlier measurement | Current measurement | Decision |
|---|---:|---:|---|
| Scan-mode tabs and network selectors | 44px | 36px | Keep the compact desktop size |
| Dashboard tabs, transfer filters, pagination | 44px | 36px | Keep the compact desktop size |
| Scan / Run fresh scan | 44px | 44px | Keep primary actions prominent |
| First three transfer data rows | 81px | 93px | Reduce excess vertical padding |
| Landing headline | 48px | 48px | No headline change required in this pass |

- Secondary neutral-button shadows are already lighter. Do not redo the completed button-size pass.
- Many control labels are already 12px. Do not reduce text sizes or use global CSS scaling/zoom to make the interface smaller.
- Mobile controls currently retain 44px minimum sizing in the source; verify the rendered mobile result during item 15.
- Preserve `DESIGN.md`'s approved composition, visual language, and responsive sizing rules. Do not introduce new navigation, containers, dependencies, or a density toggle.

### 13. [x] Reduce transfer-row padding without hiding token identity

**Problem**

Transfer rows grew from 81px to 93px. Token name, symbol, and contract are useful, but every data cell in `TransferTable.tsx` currently uses `py-5` (20px above and below). Smaller filters alone do not improve the table's information density.

**Required change**

- Start with desktop-only vertical cell padding of 4–6px, applied consistently across the row; retain the mobile layout unless separate verification justifies a change.
- Target approximately **60–68px** for the current three-line token rows at 1280px and 1440px desktop widths. Treat this as a measured target, not a fixed row height: allow longer content and zoom to expand naturally.
- Preserve token name, symbol, shortened contract, access to the full contract, chain, price provenance, unavailable-value labels, and explorer actions.
- Keep desktop row-action targets at least 36px and mobile targets at least 44px. Keep readable text sizes and clear focus indicators.
- Do not hide contract identity, remove provenance, truncate monetary values, or alter pricing/analytics to meet the height target.

**Files and tests**

- `src/components/TransferTable.tsx`
- `src/components/TransferTable.test.ts`
- `src/components/densityLayout.test.ts` — replace the existing assertion that specifically requires `py-5`; it currently locks in the oversized padding. Retain coverage for token identity and responsive control sizing.

**Acceptance and evidence**

- Record actual first-three-row heights before and after, using the same snapshot, filters, viewport, and zoom.
- Token details remain readable without overlap; wrapped/long-name fixtures may exceed the typical-row target.
- Search, chain/direction filters, pagination, and explorer actions behave unchanged.
- Save a desktop screenshot with several complete data rows visible, plus a mobile screenshot.
- Completion evidence:
  - Changed all eight transfer data cells from `py-5` to `py-5 md:py-1.5`, preserving the mobile padding and the existing 36px desktop / 44px mobile action targets.
  - Focused regression command: `node --import tsx --test src/components/TransferTable.test.ts src/components/densityLayout.test.ts` — **10/10 tests passed**.
  - Using the saved Vitalik snapshot (`?demo=vitalik`), default zoom, `All Transfers`, and the same first page: the recorded pre-change height was **93px per first-three row at 1280 × 720**; after the change the first three rows measured **65px, 65px, 65px** at 1280 × 720. Token name, symbol, shortened contract, provenance, unavailable values, and explorer links remained visible.
  - Mobile check at 390 × 844 measured **109px, 109px, 109px** for the first three rows. The page stayed at `scrollWidth=379px` / `clientWidth=379px`; the labelled table region retained its table-only overflow (`scrollWidth=827px`, `clientWidth=345px`).
  - Rendered evidence: [desktop transfer rows](output/playwright/density-item13-transfers-1280.png) and [mobile transfer rows](output/playwright/density-item13-transfers-390.png).

### 14. [x] Shorten and lighten loaded-result status chrome

**Problem**

The loaded summary repeats the evidence mode in its badge and metadata. The following notice repeats “Demo snapshot”, “Evidence status”, and “Saved snapshot” in one heading and uses a heavy black border and offset shadow. This gives context banners more visual emphasis and height than needed.

**Required change**

- Keep the existing component layout; remove duplicate evidence-mode wording within the loaded summary and snapshot notice.
- Use a concise notice heading such as `Saved snapshot · Non-live`, followed by the wallet identity and update date. Keep the history completeness status visible without opening the disclosure.
- Preserve wallet address, selected networks, `Edit scan`, `Run fresh scan`, non-live disclosure, snapshot date, and the explanation that opening a saved snapshot uses no provider quota.
- Keep provider warnings and per-chain completeness available in the existing keyboard-operable `Review data quality` disclosure. Do not collapse or hide the top-level partial/unavailable warning.
- Replace the notice's heavy 2px black frame and 3px offset shadow with a restrained border and flat surface. Retain an identifiable warning treatment and readable contrast.
- Tighten redundant internal gaps and inter-panel spacing only after removing repeated copy. Aim for roughly **15–20% less combined summary/notice height** on desktop, measured with the disclosure closed; do not force a fixed height or shrink text.
- Preserve live, saved, partial, unavailable, loading, and mode-switch behavior. Do not merge independent statuses or leak single-wallet notices into Cluster Scan.

**Files and tests**

- `src/components/LoadedScanSummary.tsx` and `.test.ts`
- `src/components/DemoSnapshotNotice.tsx` and `.test.ts`
- `src/app/page.tsx` only if spacing between these sections requires adjustment
- `src/app/loadedResultState.test.ts`, `src/components/densityLayout.test.ts`, and relevant accessibility tests
- Prefer component-local styling changes; do not flatten unrelated primary actions or all alerts globally.

**Acceptance and evidence**

- Wallet, selected networks, snapshot date, non-live state, and incomplete evidence remain understandable at a glance.
- Record combined summary/notice height before and after at the same viewport, scroll position, and disclosure state.
- Keyboard disclosure behavior, focus, edit/fresh-scan actions, and Cluster Scan isolation remain intact.
- Save before/after desktop evidence and a mobile wrapping check.
- Completion evidence:
  - Removed the duplicate `Evidence` metadata line from `LoadedScanSummary`; the single evidence badge remains visible. The saved notice now uses `Saved snapshot · Non-live`, keeps the wallet/date/quota explanation and top-level history status, and retains the existing `Review data quality` disclosure.
  - Replaced the notice’s black 2px frame and offset shadow with a restrained orange-tinted border, warning-colored left rule, and flat surface. Provider warnings, per-chain completeness, and partial/unavailable warnings remain available and visible as before.
  - Focused regression command: `node --import tsx --test src/components/LoadedScanSummary.test.ts src/components/DemoSnapshotNotice.test.ts src/components/TransferTable.test.ts src/components/densityLayout.test.ts src/app/loadedResultState.test.ts` — **17/17 tests passed**.
  - At 1280 × 720, saved Vitalik snapshot, default zoom, and closed disclosure: before was **100px summary + 125px notice + 20px gap = 245px**; after was **80px summary + 103px notice + 20px gap = 203px**, a **17.1% reduction**.
  - Mobile check at 390 × 844: summary **160px**, notice **207px**, both `Edit scan` and `Run fresh scan` measured **44px** high, disclosure remained closed, and page `scrollWidth=379px` matched `clientWidth=379px`.
  - Rendered evidence: [before desktop status chrome](output/playwright/density-item14-before-1280.png), [after desktop status chrome](output/playwright/density-item14-after-1280.png), and [after mobile status chrome](output/playwright/density-item14-after-390.png).

### 15. [x] Verify the density follow-up

- Complete item 13 and record its focused tests and screenshots before starting item 14.
- Use local saved snapshots and deterministic fixtures; do not trigger provider-backed scans.
- Verify scanner and saved results at **1280 × 720**, **1440 × 900**, and **390 × 844**. Check the other dashboard tabs for accidental shared-style regressions.
- At desktop widths, secondary controls remain 36px and primary scan actions remain 44px. On mobile, preserve 44px control targets, visible focus, readable text, and no page-wide overflow.
- Check 200% zoom, long token names/contracts, unavailable USD values, open/closed data-quality details, keyboard navigation, and table-only horizontal scrolling.
- Run the focused tests for changed components, then `npm run verify` and `git diff --check`. Class-string tests alone do not prove rendered density or accessibility.
- Record exact commands, outcomes, screenshots, and measured dimensions under items 13–15. Do not reuse the original gate's results as proof for this pass.
- Do not change the 48px landing headline or 256px featured-demo panel in this pass; broader landing-page resizing requires a separate decision.
- Completion evidence:
  - Browser checks used the local saved Vitalik snapshot (`?demo=vitalik`) and deterministic local fixtures; no provider-backed scan was triggered.
  - At 1280 × 720, the scanner’s primary action measured **44px** and secondary scan-mode/network controls measured **36px**; page `scrollWidth` matched `clientWidth`. Saved Transfers measured **65px** for each of the first three rows, with mobile evidence recorded under item 13.
  - At 1440 × 900, the saved-result summary/notice remained **80px / 103px**, `Edit scan` measured **36px**, `Run fresh scan` measured **44px**, and the first three Transfers rows measured **65px** each. Page `scrollWidth=1429px` matched `clientWidth=1429px`; the table itself did not need horizontal overflow at this width. Evidence: [saved result at 1440 × 900](output/playwright/density-item15-saved-1440.png).
  - At 390 × 844, scanner controls measured **44px** for the primary scan and network buttons; the mode tabs measured **50px** because their two-line labels need the extra height. Saved Transfers measured **109px** for the first three rows, the explorer action measured **44px**, page `scrollWidth=379px` matched `clientWidth=379px`, and the labelled table region retained its bounded horizontal scroll (`827px` content in a `345px` region).
  - A 200% zoom-equivalent check at the 195 × 422 CSS viewport (half of 390 × 844) kept the saved summary and notice readable at **262px / 361px** with `scrollWidth=184px` matching `clientWidth=184px`; the data-quality disclosure remained closed.
  - The six dashboard tabs were opened in sequence without page-wide overflow. Keyboard checks moved from Transfers to Approvals with focus on `#dashboard-approvals-tab` and a visible **2px solid** orange-ink outline. The native data-quality disclosure toggled with Space while retaining `SUMMARY` focus and a visible outline in its open/closed states.
  - Deterministic transfer filtering exposed the long-contract BAYC row with `Unavailable` USD and full contract text available through the token-contract label/title; the existing search, chain/direction filters, pagination, and explorer-action tests remained green.
  - Focused item 13/14 command: `node --import tsx --test src/components/TransferTable.test.ts src/components/densityLayout.test.ts src/components/LoadedScanSummary.test.ts src/components/DemoSnapshotNotice.test.ts src/app/loadedResultState.test.ts` — **17/17 tests passed**.
  - Final repository gate: `npm run verify` — **lint passed, typecheck passed, all 248 tests passed, production build passed**. Final `git diff --check` — **passed**.
  - No deployment, Preview validation, production scan, monitoring, rollback, or remote Git operation was performed.

## Mobile Layout Follow-up — 2026-08-27

Source: the user's three mobile screenshots taken at 12:29:33, 12:29:43, and 12:29:50, reviewed using `custom-frontend-skill`, plus inspection of the corresponding components. These findings concern alignment and hierarchy, not merely control size. The original screenshots were not CSS-pixel measurements; a fresh rendered baseline and after-state were captured for the final visual gate under item 22.

Items 13–15 improved density and bounded overflow, but that did not establish a well-composed mobile layout. The current header, filters, and footer relied on content-width wrapping, producing uneven rows. Items 16–21 now address those layout rules; item 22 remains the approval gate for rendered before/after evidence and desktop preservation.

### Design direction and scope

- **Visual thesis:** a compact, aligned mobile forensic workspace using the existing light industrial surfaces, black controls, and orange accent, with less competing chrome.
- **Content plan:** brand/navigation → scan mode → wallet and evidence context → dashboard tabs → working filters and data → secondary footer links. Do not introduce a marketing hero or imagery into the dashboard.
- **Interaction thesis:** a short mobile-navigation disclosure transition, restrained active-tab feedback, and keeping the selected dashboard tab in view. Use existing CSS/React capabilities; honor reduced motion and avoid ornamental animation.
- Scope the layout changes to mobile, using the existing breakpoint system after the breakpoint decision in `DESIGN.md` is approved. Preserve desktop composition, 36px desktop secondary controls, and the completed density improvements. Check the breakpoint transition rather than assuming tablet widths behave correctly.
- Preserve at least 44px mobile interactive targets. Reduce decorative padding, shadows, and redundant spacing rather than globally shrinking fonts or using CSS zoom/scaling. Non-interactive status text does not need button-sized treatment.
- This section explicitly permits the mobile navigation reorganization below; it does not authorize a desktop navigation redesign or changes to analytics, pricing, provider behavior, or saved data.

### 16. [x] Reorganize the mobile header and navigation

**Problem:** the brand, How it works, Scanner, Docs / methodology, and button-sized saved status form several irregular rows before the workspace begins.

**Required change**

- Put the brand and a clearly labelled menu toggle on one aligned mobile row.
- Move Scanner, Docs / methodology, and the existing contextual How it works action into an expandable mobile navigation region. Keep their existing destinations and behavior; do not introduce duplicate focusable navigation.
- Present indexing status as compact, readable text with its status indicator, below the brand row if needed. Keep it visible when navigation is closed and preserve saved/live/partial/unavailable distinctions.
- Use normal navigation links and a disclosure button with `aria-expanded` and `aria-controls`, not application-menu semantics. Hidden navigation must not be keyboard-focusable. Escape closes the disclosure and returns focus to its toggle; navigation/action activation closes it appropriately.
- Keep the existing desktop header and brand action unchanged. Verify scanner, docs, and topic-page uses of the shared header.

**Files and tests:** `src/components/SiteHeader.tsx`, `src/components/SiteHeader.test.ts`, and `src/app/page.tsx` for the contextual action; shared header consumers only where necessary.

**Acceptance:** at 360px and 390px widths, the brand and toggle align without clipping, status is readable, every original action remains reachable, and keyboard opening/closing/focus behavior works. Record header height and before/after screenshots without forcing a fixed height.

**Completion evidence:**

- Implemented the mobile brand/menu row, visible compact status, disclosure navigation, Escape/focus-return behavior, and mobile full-width contextual action in `src/components/SiteHeader.tsx` and `src/app/page.tsx`. Desktop header composition remains under the `md` transition.
- Added static accessibility coverage for the disclosure contract in `src/components/SiteHeader.test.ts`.
- Motion follow-up: added a mobile-only 180ms fade/4px opening movement; closing removes hidden links immediately. Native anchor, Docs topic, and back-to-top scrolling now follow reduced-motion preferences. Touch/wheel scrolling remains native; desktop navigation is unchanged. Visual approval of motion remains pending.
- Motion verification: in-app Browser checks at 360px and 390px confirmed the 180ms menu animation, opening/closing, Escape focus return, and no page overflow. Docs topic scrolling progressed through 4.5 → 73 → 242 → 656.5px; Back to top progressed toward and reached 0px. Lint, typecheck, and 28 focused tests passed. The full suite passed 250/251: the existing WalletInput layout no longer has the 288px cap still expected by `p3ResponsiveLayout.test.ts`; that unrelated card code/test was left unchanged. Reduced-motion rules are covered by the focused test; an OS-level reduced-motion browser check remains unverified.
- Focused responsive/accessibility suite included this item and passed **62/62**; canonical `npm run verify` passed lint, typecheck, all **250 tests**, and the production build.
- Rendered Browser evidence is recorded under item 22; product visual approval remains open.

### 17. [x] Align the mobile scan-mode controls

**Problem:** Single wallet and Cluster scan have uneven widths and label wrapping; the New badge competes for limited space.

**Required change**

- Use two equal-width mobile columns with consistent padding, icon placement, and label alignment.
- Hide the decorative New badge on mobile. Keep the full mode names; prefer one line where space permits, but allow natural growth at narrow widths or zoom.
- Keep both controls the same height within the row, with at least 44px touch targets. Do not use a fixed height that clips enlarged text.
- Preserve tab semantics, selection state, arrow/Home/End keyboard navigation, and existing form/state isolation.

**Files and tests:** `src/app/page.tsx`, `src/app/loadedResultState.test.ts`, and relevant responsive/accessibility tests.

**Acceptance:** equal-width, aligned controls at mobile widths; no forced horizontal scroll for these two modes; switching to Cluster Scan never shows single-wallet summary or demo notices.

**Completion evidence:**

- Implemented equal-width two-column mobile scan-mode controls with 44px minimum targets and a mobile-hidden decorative `New` badge in `src/app/page.tsx`; desktop controls retain their inline composition.
- Set the outer mobile WalletInput console card to a 232px minimum height while keeping the address well intrinsic-height; center the complete address/network/scan stack vertically with 12px gaps in a shared 288px maximum column (shrinking safely below that width), keep all four network choices on one centered row at 360px and above, and retain the desktop layout with no minimum height.
- Existing tab semantics, arrow/Home/End navigation, and single-wallet/cluster state isolation remain covered by the responsive and loaded-result tests.
- Focused responsive/accessibility suite passed **62/62**; canonical `npm run verify` passed lint, typecheck, all **250 tests**, and the production build.
- Rendered Browser evidence is recorded under item 22; product visual approval remains open.

### 18. [x] Compact the mobile loaded-wallet summary

**Problem:** the full address wraps into a dominant text block and Edit scan becomes a full-width primary-looking action.

**Required change**

- Show a shortened wallet address on mobile, with an accessible copy action and a touch/keyboard-operable way to inspect the full address. A hover-only title is insufficient. Copy must use the complete address and report success or failure truthfully.
- Position Edit scan as an inline secondary action aligned with the summary, not a stretched full-width button. Allow a deliberate fallback row at narrow widths or zoom.
- Keep networks and evidence state readable with consistent spacing. Preserve full-address presentation on desktop.
- Preserve the completed snapshot-notice improvements: non-live state, date, quota explanation, top-level evidence warning, data-quality disclosure, and Run fresh scan. Do not shrink or conceal warnings to save height.

**Files and tests:** `src/components/LoadedScanSummary.tsx`, its tests, and `src/components/DemoSnapshotNotice.tsx` only if adjacent mobile spacing requires adjustment. Follow existing copy-feedback patterns.

**Acceptance:** full address can be inspected and copied on touch and keyboard; address/action alignment is stable; Edit scan retains its current behavior; long network text wraps without overlap; saved/live/partial/unavailable states remain distinct.

**Completion evidence:**

- Implemented shortened mobile address display, keyboard/touch full-address disclosure, labelled copy action with truthful live feedback, and responsive `Edit scan` placement in `src/components/LoadedScanSummary.tsx`.
- Added regression coverage for the full-address disclosure, copy affordance, accessible names, and live feedback in `src/components/LoadedScanSummary.test.ts`.
- Focused responsive/accessibility suite passed **62/62**; canonical `npm run verify` passed lint, typecheck, all **250 tests**, and the production build.
- The saved-demo route remained on the landing scanner during this Browser pass, so dashboard-specific loaded-summary rendering is not claimed as visually verified. Product visual approval remains open.

### 19. [x] Flatten mobile dashboard tabs and tighten spacing

**Problem:** large raised tab boxes and stacked padding/dividers make navigation compete with the data and leave excess space before the filters.

**Required change**

- Keep dashboard tabs in a single horizontally scrollable mobile row, but replace raised mobile button treatments with flatter labels and a clear active indicator. Preserve desktop styling.
- Keep each tab's target at least 44px high; use consistent label/badge alignment and comfortable horizontal spacing.
- Tighten redundant padding and duplicated divider spacing between the tabs and the selected panel. Use one clear section boundary rather than stacked separators.
- Retain a discoverable scrolling affordance, accessible region label, tab/panel relationships, keyboard navigation, and selected-tab visibility. Do not simply hide scrolling or clip labels/counts.

**Files and tests:** `src/components/Dashboard.tsx`, `src/components/Dashboard.test.ts`, responsive/accessibility tests; component-scoped styling preferred over global button changes.

**Acceptance:** every tab is reachable by touch and keyboard; selecting or arrowing to an offscreen tab brings it into view; no page-wide horizontal overflow; active state is clear without relying only on color.

**Completion evidence:**

- Implemented component-scoped flat mobile dashboard tabs with a 3px orange-ink active marker, 44px targets, bounded horizontal scrolling, selected-tab visibility, and desktop raised-tab restoration in `src/components/Dashboard.tsx` and `src/app/globals.css`.
- Added active-state/class coverage in `src/components/Dashboard.test.ts`; existing keyboard and scroll behavior remains covered.
- Focused responsive/accessibility suite passed **62/62**; canonical `npm run verify` passed lint, typecheck, all **250 tests**, and the production build.
- Dashboard-specific rendered evidence remains part of item 22 and awaits product visual approval.

### 20. [x] Align transfer search, filters, and pagination on mobile

**Problem:** direction filters have unequal widths, chain buttons wrap into ragged rows, and the search focus outline surrounds only the inner input rather than the whole field.

**Required change**

- Use a full-width labelled search field. Set mobile input text to at least 16px to avoid small-input focus zoom on iOS; preserve compact desktop sizing. This is a preventive requirement, not a claim that the supplied screenshots prove an iOS zoom bug.
- Apply visible focus treatment to the complete search-field wrapper. Align the search icon, text, and clear affordance; long contracts must stay inside the input without pushing its controls out of view.
- Keep search empty by default unless an explicit selection/navigation supplies a query. Preserve all existing searchable fields and clear behavior. If adding a custom clear button, label it and avoid a duplicate native clear affordance; preserve focus after clearing.
- Use three equal-width direction controls: All transfers, Inbound, Outbound. Preserve selected state and at least 44px targets; allow readable wrapping under zoom rather than clipping labels.
- Replace the five wrapping chain buttons on mobile with one full-width, labelled Network select containing All chains and the supported networks. Prefer a native select; retain existing desktop controls and share the same filter state. Do not leave hidden duplicate controls in the tab order.
- Align the result count and pagination in deliberate rows below the filters; use consistent spacing and button sizes. Preserve disabled states, filter-driven page reset, and pagination behavior.
- Reduce unnecessary mobile inner framing/padding locally without changing table identity, values, provenance, or bounded table scrolling.

**Files and tests:** `src/components/TransferTable.tsx`, `src/components/TransferTable.test.ts`, `src/components/densityLayout.test.ts`, and `src/lib/transferTable.ts` tests if behavior changes. No analytics changes are required.

**Acceptance:** full-width search and network fields share edges; direction controls have equal widths; a long contract query does not overlap icons; combined search/direction/network filters and clearing work; pagination remains correct for zero, one, and multiple pages. Verify responsive switching preserves selected filters.

**Completion evidence:**

- Implemented the full-width labelled search wrapper, 16px mobile input text, custom clear/focus behavior, equal-width direction controls, and native mobile Network select while preserving desktop chain buttons in `src/components/TransferTable.tsx`.
- Added responsive markup coverage for the mobile Network select and direction-control grid in `src/components/TransferTable.test.ts`; existing filter, clear, and pagination behavior remains covered.
- Focused responsive/accessibility suite passed **62/62**; canonical `npm run verify` passed lint, typecheck, all **250 tests**, and the production build.
- Transfer-control rendered evidence remains part of item 22 and awaits product visual approval.

### 21. [x] Give mobile footer links a consistent layout

**Problem:** content-width wrapping produces visually uneven footer columns and large apparent gaps between link rows.

**Required change**

- Use one left-aligned mobile column for Methodology and topic links, sharing the footer copy's left edge.
- Keep consistent row spacing and at least 44px link targets, without extra padding that makes rows look detached.
- Let long titles wrap naturally. Preserve every destination, the read-only disclosure, and desktop footer layout.

**Files and tests:** `src/components/SiteFooter.tsx` and relevant responsive tests; add focused footer coverage if needed.

**Acceptance:** all mobile links start at the same horizontal position, long labels do not clip, keyboard focus remains visible, and desktop composition is unchanged.

**Completion evidence:**

- Implemented a 16px-aligned mobile footer shell with one left-aligned link column, consistent 44px link targets, natural wrapping, and desktop row/wrap restoration in `src/components/SiteFooter.tsx`.
- Updated responsive/accessibility assertions for the footer layout; canonical `npm run verify` passed lint, typecheck, all **250 tests**, and the production build.
- Footer rendered evidence remains part of item 22 and awaits product visual approval.

### 22. [ ] Verify the mobile layout pass and desktop preservation

- Start this gate only after the approval-required questions in `DESIGN.md` are resolved and the selected decisions are recorded there. Items 16–21 are implemented; this gate remains open for rendered visual approval and desktop-preservation evidence.
- Complete and verify items 16–21 sequentially, recording focused test results and visual evidence under each item before moving on.
- Capture before/after at **360 × 800** and **390 × 844**, using the same local saved Vitalik snapshot, filter query, scroll location, and disclosure state. Reproduce all three supplied screenshot areas: header/summary/tabs, transfer controls, and footer.
- Check **320px** width for narrow-screen reflow and widths immediately below/above the chosen mobile breakpoint. Also verify desktop at **1280 × 720** and **1440 × 900** against the existing approved layout.
- Exercise empty scanner, saved results, Cluster Scan, shared docs/topic headers and footers, and deterministic partial/unavailable/loading states. Do not trigger provider-backed scans just for UI checks.
- Test mobile navigation opening/closing, focus return, brand/help actions, mode switching, full-address access/copy feedback, dashboard tab scrolling, search/clear, combined filters, pagination, and footer destinations.
- Check touch-target dimensions, keyboard-only operation, visible focus, reduced motion, long labels/contracts, and real 200% browser zoom where supported. Label reduced-viewport simulations accurately; they do not alone prove browser-zoom behavior. Check mobile search focus on an iOS browser if available and explicitly record if not tested.
- Confirm no page-wide overflow. Horizontal scrolling may remain confined to labelled dashboard-tab and data-table regions. Do not mask layout defects with global `overflow-x: hidden`.
- Run focused tests, then `npm run verify` (including lint and tests) and `git diff --check`. Update source-class assertions when markup legitimately changes, but require rendered evidence and interaction checks as well.
- Record changed files, exact commands/results, measured control dimensions, screenshot paths, and any unverified checks. Earlier gates and screenshots are not completion evidence for this pass.
- No deployment, provider-backed scan, pricing change, or remote Git operation is authorized by this plan.

**Current gate evidence:**

- In-app Browser after screenshots captured at **360 × 800** and **390 × 844** using the local scanner landing state: `output/playwright/mobile-followup-after-360.png` and `output/playwright/mobile-followup-after-390.png`. Before baselines are `output/playwright/mobile-followup-before-360.png` and `output/playwright/mobile-followup-before-390.png`.
- The after-state confirms the mobile header/menu row, visible status, equal scan-mode controls, aligned scanner shell, and saved-demo hierarchy at both requested widths. A saved-demo click did not transition to the loaded dashboard in this Browser pass, so the loaded summary, dashboard tabs, transfer controls, and footer are not claimed as fully rendered visual evidence yet.
- `npm run verify` passed lint, typecheck, all **250 tests**, and the production build; `git diff --check` passed. These checks do not close this visual gate.

## Definition of Done

This plan is complete only when:

- All P1 items are complete.
- Every completed item has regression coverage and written evidence.
- P2/P3 items are complete or explicitly deferred with a product reason.
- Density follow-up items 13–15 are complete or explicitly deferred with a written reason and current evidence.
- Mobile layout follow-up items 16–22 are complete or explicitly deferred with a written reason and current evidence.
- The approval-required mobile design questions in `DESIGN.md` have been resolved or explicitly deferred with a product reason.
- The canonical local verification gate passes.
- Current desktop and mobile screenshots confirm the intended hierarchy and responsive behavior.
- No live provider, Preview deployment, production deployment, monitoring, or rollback claim is made without separate evidence.
