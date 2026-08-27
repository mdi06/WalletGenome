# Design

## Source of truth
- Status: Needs refresh — preserve the previously approved desktop composition and mobile decisions below. The 2026-08-27 audit found implementation drift and unresolved guidance conflicts; its recommendations are proposals, not approval to implement or redesign.
- Last refreshed: 2026-08-27
- Primary product surfaces: Wallet scanner, saved-snapshot result dashboard, cluster scan, and methodology docs.
- Evidence reviewed: `ui_fixes.md` items 13–22, especially the mobile layout follow-up items 16–22; `src/app/globals.css`; `SiteHeader`, scanner mode controls, `LoadedScanSummary`, `Dashboard`, `TransferTable`, and `SiteFooter`; the supplied mobile screenshots cited by `ui_fixes.md`; and the rendered evidence in `output/playwright/density-item14-after-390.png`, `output/playwright/density-item13-transfers-390.png`, `output/playwright/p3-item11-docs-top-390.png`, `output/playwright/p3-item11-docs-mid-390.png`, and `output/playwright/density-item15-saved-1440.png`.
- Evidence rule: screenshots establish hierarchy, alignment, and composition targets, not CSS-pixel measurements. The implementation pass must establish fresh measurements at the widths and states listed in `ui_fixes.md` item 22.
- Current audit: `DESIGN_AUDIT.md`, with fresh browser screenshots in `output/design-audit-2026-08-27/`. Reviewed the current dirty working tree, not a release build. Previous screenshots and checklist claims are historical context, not evidence that the current version passes.
- Audit coverage: all seven public content routes, all six single-wallet result tabs, cluster input, shared navigation/footer, and source-level review of cluster results, progress, provider states, and share metadata. See the audit for untested states and explicit limits.

## Brand
- Personality: Industrial, forensic, direct, and evidence-aware.
- Trust signals: Explicit live/saved/partial/unavailable states, provenance copy, readable wallet and contract identifiers, and restrained action hierarchy.
- Avoid: Marketing-heavy repetition, ambiguous provider claims, excessive 3D elevation, and shrinking mobile controls below comfortable touch sizes.

## Product goals
- Goals: Put the scan task and first decision signals early; make evidence quality legible; support deep inspection without overwhelming the user.
- Non-goals: Redesign the visual language, hide incomplete data, or optimize desktop density at the cost of mobile usability.
- Success signals: Clear primary scan action, compact secondary chrome on desktop, readable transfer rows, and no loss of status or accessibility behavior.

## Personas and jobs
- Primary personas: Analysts, security reviewers, and technically curious wallet owners.
- User jobs: Scan a wallet, judge result confidence, inspect behavior, and investigate risky permissions or flows.
- Key contexts of use: Desktop analysis sessions and narrow mobile review or sharing.

## Information architecture
- Primary navigation: Scanner and Docs / methodology. On mobile, the existing contextual `How it works` / `View dashboard` action joins the same disclosure region; it is not duplicated elsewhere.
- Core routes/screens: Scanner input, saved demo/result dashboard, cluster dashboard, and documentation topics.
- Public route inventory: `/`, `/docs`, `/evm-wallet-analytics`, `/crypto-wallet-risk-checker`, `/token-approval-checker`, `/sybil-wallet-analysis`, and `/multi-chain-wallet-forensics`. The five topic routes share `src/app/[slug]/page.tsx`; their current independent header is a consistency gap, not a second approved navigation system.
- Content hierarchy: On the scanner, brand/navigation → compact indexing status → scan mode → wallet or cluster input/result context → evidence/status → dashboard tabs → detailed behavior and security data. On docs, shared header → methodology heading/filter → topic index → selected topic content. Footer links are secondary navigation.
- Mobile navigation rule: the brand and menu toggle share one row; the indexing status remains visible when the disclosure is closed; Scanner, Docs / methodology, and the contextual action appear once inside the expandable region. Use ordinary links plus a disclosure button, not application-menu semantics.

## Design principles
- Evidence before certainty: Keep partial, unavailable, estimated, and saved data visibly distinct.
- Scope before interpretation: State the actual time window, dataset subset, default sort, and pricing coverage next to the affected display. A search over top token-transfer summaries is not a search of all wallet activity; an all-returned-history heatmap is not an LTM heatmap.
- Density follows priority: Compact routine controls and repeated chrome on desktop; retain readable data and generous mobile targets.
- Preserve the approved composition: Prefer targeted spacing, sizing, and elevation changes over new containers or new navigation.
- Align by shared edges: Mobile fields, mode controls, filter groups, result controls, and footer links should align to the same content column instead of wrapping to their intrinsic content widths.
- Mobile is reflow, not scaling: Allow text and controls to grow under narrow widths or zoom; do not use CSS zoom, clipped labels, or fixed heights that depend on the default font size.
- Tradeoffs: Desktop controls may be 36px when secondary, while mobile controls remain at least 44px; transfer rows favor scanability over maximum row count; mobile uses flatter secondary navigation to reserve visual weight for evidence and data.

## Visual language
- Color: Light gray page, white cards, black structural controls, and orange brand accent with darker orange text for contrast.
- Typography: Bold sans-serif headings, compact uppercase labels, and monospace addresses/metrics.
- Spacing/layout rhythm: 4px-based Tailwind rhythm. On mobile, use a 16px shell/content inset; 8px gaps within a control row; 12px gaps between controls in one group; 16px between adjacent sections; and 12–16px card/control padding as content requires. Full-width fields and related controls share their left and right edges. Use one clear divider between dashboard tabs and the selected panel rather than stacked separators.
- Shape/radius/elevation: Sharp rectangular geometry; primary actions keep tactile elevation, secondary controls use lighter borders and flatter shadows.
- Motion: Below 768px, opening the mobile navigation fades it in with a 4px downward movement over 180ms (ease-out); closing hides it immediately so links leave the tab order. Desktop navigation does not animate. Anchor, Docs topic, and back-to-top navigation use native smooth scrolling only when reduced motion is not requested; touch/wheel scrolling stays native, with no scroll interception or added momentum library.
- Imagery/iconography: Lucide icons and restrained forensic/data visualizations.

## Components
- Existing components to reuse: `SiteHeader`, `WalletInput`, `BulkScanInput`, `LoadedScanSummary`, `Dashboard`, `TransferTable`, `ApprovalAudit`, `FilterDropdown`, and status disclosures.
- New/changed components: Responsive sizing and spacing variants only; a mobile header disclosure and mobile presentation variants for scan modes, loaded summary, dashboard tabs, transfer filters, and footer links. No new design-system layer.
- Variants and states: Primary scan, secondary control/filter, saved/partial/unavailable status, loading, disabled, and table action states.
- Token/component ownership: Shared tactile button and card styles live in `src/app/globals.css`; responsive component sizing stays with the component markup; dashboard-tab flattening stays scoped to `Dashboard` rather than changing global button treatments.

## Accessibility
- Target standard: WCAG AA intent for text and meaningful controls.
- Keyboard/focus behavior: Native buttons, links, inputs, tabs, disclosures, and labelled scroll regions retain visible focus. The mobile navigation button exposes `aria-expanded` and `aria-controls`; Escape closes it and returns focus to the toggle; closing or activating a navigation item must not leave hidden links in the tab order. Clearing search preserves focus. The full wallet address must be inspectable and copyable by touch and keyboard without relying on hover.
- Audit acceptance additions: a focused field needs a visible field or wrapper treatment; typing must not scroll the focused field offscreen; tab `aria-controls` must resolve in every state, including the collapsed loaded summary. Filter selection and disclosure expansion must be exposed programmatically. Chart interaction needs equivalent keyboard-accessible actions, not only a textual description of the graphic.
- Contrast/readability: Use the darker orange ink token on light surfaces; keep data labels and token details readable.
- Screen-reader semantics: Preserve existing labels, roles, live regions, and complete contract text.
- Reduced motion and sensory considerations: Respect reduced-motion behavior already present in scrolling and transitions; horizontal tab scrolling may be smooth only when motion is allowed.

## Responsive behavior
- Supported breakpoints/devices: Mobile composition below the `md` transition (around 768px), with coverage at 320px, 360px, and 390px and transition checks immediately below and above that breakpoint; desktop coverage at 1280px and 1440px.
- Layout adaptations: Below the approved mobile breakpoint, keep a single aligned content column. The header becomes brand + menu row, with status below the brand row as readable compact text. Scan modes become two equal-width columns and hide the decorative `New` badge. The outer wallet scan console card has a 232px mobile minimum height and may grow for content; center its address well, network choices, and Scan action as one vertical stack with 12px gaps. Those controls share a centered 288px maximum column and may shrink below it; the network choices remain one centered row at 360px and above, and the address well remains intrinsic-height with start-aligned entry text. Loaded summaries shorten the visible address while retaining full-address inspection/copy, keep `Edit scan` inline when possible, and allow a deliberate fallback row. Dashboard tabs remain one horizontally scrollable row with a flatter mobile treatment and visible active marker. Transfer filters use a full-width search field whose focus treatment encloses the complete field, three equal-width direction controls, and one full-width labelled Network select (prefer the native select on mobile), followed by deliberate result/pagination rows. Footer links become one left-aligned column sharing the footer copy edge. Tables and tab lists may scroll only inside labelled regions.
- Desktop preservation: At and above the approved desktop composition breakpoint, retain the current inline header/navigation/status arrangement, raised dashboard tabs, desktop transfer network buttons, current footer composition, completed density work, 36px secondary controls, and full wallet address presentation. The mobile contract must not alter analytics, provider behavior, saved data, or desktop hierarchy.
- Touch/hover differences: Hover elevation is subtle on secondary controls; mobile does not depend on hover.

## Interaction states
- Loading: Primary scan action and progress status remain prominent; responsive reflow must not conceal loading or provider-state copy.
- Empty: Existing empty states and validation messages remain explicit.
- Error: Existing alert and provider-warning disclosures remain visible.
- Success: Completed results show compact loaded context and evidence mode.
- Disabled: Disabled controls retain their target size and clear opacity.
- Offline/slow network, if applicable: Existing partial/unavailable provider language remains authoritative.
- Mobile-specific interaction: Selecting or arrowing to an offscreen dashboard tab brings it into view. Search, filters, and pagination preserve state and reset the page where already specified. Navigation disclosure, copy feedback, clear actions, and explorer links keep their existing destinations and truthful status messages.

## Content voice
- Tone: Plain, technical, and evidence-backed.
- Terminology: Use `saved snapshot`, `non-live`, `partial`, `unavailable`, `unclassified contracts`, and `scan` consistently.
- Microcopy rules: Explain what is known and withheld; do not imply a provider call or definitive metric when it did not occur.

## Implementation constraints
- Framework/styling system: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 3, and Lucide React.
- Design-token constraints: Extend existing CSS tokens/classes before introducing new patterns.
- Performance constraints: Keep existing dynamic dashboard boundaries and avoid provider calls for UI verification.
- Compatibility constraints: Preserve current client/server boundaries and existing static snapshot behavior.
- Test/screenshot expectations: Items 16–21 are recorded as implemented in `ui_fixes.md`; item 22 remains open. The current audit does not close it. Verify at 320/360/390px and 1280/1440px, including keyboard, touch-target, reduced-motion, zoom, overflow, saved/partial/unavailable/loading, docs, Cluster Scan, and footer states. Run focused regression tests, `git diff --check`, and the canonical `npm run verify`; use deterministic fixtures for UI checks. This design refresh itself makes no UI implementation changes.
- Current verification: lint passed; `npm test` ran 251 tests, 250 passed and one failed because the wallet input no longer has the contract's `max-w-[288px] md:max-w-none` classes. Do not silently weaken that assertion or restore a layout without resolving the intended mobile design. Audit measurements are local browser evidence, not production, Safari, assistive-technology, or zoom certification.

## Open questions
- [x] Approved — Use the `md` transition (around 768px) for the mobile composition so tablet widths retain the readable single-column rules.
- [x] Approved — Use an inline disclosure button for full-address inspection in `LoadedScanSummary`; keep copy as a separate explicit action.
- [x] Approved — Use a 3px orange-ink bottom rule as the active marker for flattened mobile dashboard tabs.
- [ ] Theme conflict / product owner: `AGENTS.md` asks for a dark forensic theme, while this pre-existing contract and the rendered app use light gray, white, black, and orange. Preserve current UI during the audit; resolve the conflicting instructions before any theme change.
- [ ] Mobile console width / product owner: retain the approved 288px centered inner column or approve the current wider controls? The implementation and regression test presently disagree.
- [ ] Mobile result priority / product owner: approve a compact identity summary and collapsed secondary accounts so blacklist/risk information is reached sooner, without changing desktop composition?
- [ ] Transfer scope / product owner: is the intended feature a top-token-transfer browser or a full transfer-history search? Label the existing subset immediately in a future approved fix; any expansion needs separate data/performance acceptance criteria.
- [ ] Accessibility scope / product owner: confirm the intended AA version and browser/assistive-technology matrix. This audit is not a compliance certification.

## Audit handoff

- Use `DESIGN_AUDIT.md` for ranked findings, route/component inventory, reproduction steps, acceptance criteria, and evidence limits.
- Address task-blocking interaction and evidence-label defects before cosmetic changes. Preserve the existing tokens, shared components, saved-demo path, and analytics/provider boundaries.
- Recommendations cite the relevant sections of this contract. They do not authorize implementation, provider-backed scans, deployment, or remote writes.
- No Visual Ralph handoff is required for this audit. A future reference-matching task needs a separately approved visual target.
