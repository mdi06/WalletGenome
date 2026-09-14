# Design

## Source of truth
- Status: Active — the user requested alignment with the current web app on 2026-08-27. The existing light gray, white, black, and orange visual language is authoritative. Known implementation issues remain tracked separately; this status does not certify that all audit findings are fixed.
- Last refreshed: 2026-09-01
- Decision ownership: This file is the design reference; `AGENTS.md` directs contributors here. `src/app/globals.css` owns shared visual tokens/classes, while components own local layout and responsive sizing. Audit proposals and historical checklist entries do not override the current contract or authorize a redesign.
- Alignment evidence: inspected the current local scanner at `http://127.0.0.1:3010/` at 1440 × 900 and 390 × 844, plus the current layout, CSS, Tailwind config, and component source. Confirmed the light theme and a 288px mobile address well. This is local development evidence, not a deployed-site check; no live scan was submitted.
- Primary product surfaces: Wallet scanner, saved-snapshot result dashboard, cluster scan, and methodology docs.
- Evidence reviewed: `ui_fixes.md` items 13–22, especially the mobile layout follow-up items 16–22; `src/app/globals.css`; `SiteHeader`, scanner mode controls, `LoadedScanSummary`, `Dashboard`, `TransferTable`, and `SiteFooter`; the supplied mobile screenshots cited by `ui_fixes.md`; and the rendered evidence in `output/playwright/density-item14-after-390.png`, `output/playwright/density-item13-transfers-390.png`, `output/playwright/p3-item11-docs-top-390.png`, `output/playwright/p3-item11-docs-mid-390.png`, and `output/playwright/density-item15-saved-1440.png`.
- Evidence rule: screenshots establish hierarchy, alignment, and composition targets, not CSS-pixel measurements. The implementation pass must establish fresh measurements at the widths and states listed in `ui_fixes.md` item 22.
- Audit reference: `DESIGN_AUDIT.md`, with screenshots in `output/design-audit-2026-08-27/`. That audit reviewed the then-current dirty working tree, not a release build. Its screenshots and checklist claims are historical context, not evidence that the current version passes. Follow-up notes distinguish resolved guidance from remaining implementation work.
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

### Current palette and ownership

| Role | Existing value / source | Usage |
| --- | --- | --- |
| Rendered page background | `#ebebeb` in `src/app/layout.tsx` | Current page canvas; preserve it. |
| Shared page token | `--bg-page: #eaebef` in `src/app/globals.css` | Existing CSS base and related light surfaces. The layout overrides the body background; do not normalize these grays as part of a documentation change. |
| Cards / local dark panels | `--bg-card: #ffffff` / `--bg-card-dark: #121318` | White primary surfaces; dark panels remain local accents. |
| Main / muted text | `--text-main: #0a0a0a` / `--text-muted: #4b5563` | High-contrast content hierarchy. |
| Brand orange | `--color-orange: #ff5500` | Primary action fills and highlights, not small text on white. |
| Orange text / focus | `--color-orange-ink: #963300` | Readable orange labels, focus outlines, and indicators. |
| Borders / shadows | Existing `--border-*` and `--shadow-*` tokens | Sharp geometry and the existing raised/recessed controls. |

- Semantic colors: Preserve existing risk, network, chart, and evidence-state colors. They communicate data; they are not competing brand themes.
- Tailwind: The unused dark `telemetry` palette was removed during alignment. Use the shared CSS tokens/classes and existing utilities rather than restoring it.
- Typography scope: On 2026-08-28, the user approved one font-selection point for the entire app while retaining Inter and JetBrains Mono. Edit only the family names before `as MainFont` and `as MonoFont` in `src/app/fonts.ts`; leave the aliases and loader options intact. `layout.tsx` consumes those exports. The loaders expose `--font-main` and `--font-code`; `globals.css` maps them to `--font-sans` and `--font-mono`; Tailwind's `font-sans` / `font-display` and `font-mono` use those tokens. SVG graph labels also use the shared monospace class, with no independent font-family override. Do not redefine a font variable in terms of itself. Layout, colors, cards, font sizes, and weights remain unchanged; a new font can change letterforms and wrapping.
- Sharing-image fonts: Open Graph and Twitter images consume the same `mainFont` export. Their renderer needs font bytes rather than browser CSS, so `socialImageFonts.ts` derives the selected family from the Next.js font object and loads cached Google Fonts data for normal and bold text, subset to the image's copy. There is no separate font-name setting or silent fallback. New font choices require font-download access during the build; changing a sharing image also requires rebuilding and may need social-platform cache refreshes.
- Font-connection verification (2026-08-28): lint, typecheck, all 272 tests, and the production build passed. The build required network permission to fetch the existing Google Fonts. A local production preview confirmed Inter for body/headings and JetBrains Mono for technical fields on the scanner, docs, and a saved dashboard. Scanner widths 320, 360, 390, 1280, and 1440px, plus docs and the saved dashboard at 390px, had no page-wide horizontal overflow. No live scan was submitted. The existing development server retained its old Tailwind font utility until restart; restart it once after this configuration change. These checks do not close the broader responsive audit.
- Saved-card typography (approved 2026-08-28): The four hero demo cards use `MainFont` throughout, including ENS titles, role labels, saved badges, descriptions, dates, and Open actions. This restores their regular sans-serif appearance after the font-connection fix exposed previously ineffective monospace classes. Card dimensions, spacing, colors, weights, and full-card actions are unchanged. `MonoFont` remains available for technical content outside these cards; both font selections live in `fonts.ts`.
- Saved-card verification: `npm run verify` passed (lint, typecheck, 273 tests, production build). A rendered-markup regression checks all four cards for main-font inheritance without monospace overrides. Local browser checks at 1440px and 390px confirmed Inter on card text, JetBrains Mono retained on the wallet input, and no page-wide overflow on mobile. No live scan or deployment was performed.
- Centralized-font verification (2026-08-28): lint, typecheck, and all 277 tests passed. The production build passed after permitting Google Fonts downloads; both sharing-image routes remain static and their generated PNGs are identical. The Open Graph image was visually checked. A local production browser check confirmed Inter throughout the four demo cards and hero heading, JetBrains Mono in the wallet input and capital-flow address/metric labels, and Inter in the remaining graph labels. A source audit found no independent component font-family overrides. Cluster graph labels use the same shared class; they were source-checked, not exercised with a live cluster scan. No deployment or live scan was performed.

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
- Layout adaptations: Below the approved mobile breakpoint, keep a single aligned content column. The header becomes brand + menu row, with status below the brand row as readable compact text. The mobile authentication action lives inside the expandable navigation and aligns with its stacked controls; a closed disclosure contains no visible or focusable auth action. Scan modes become two equal-width columns and hide the decorative `New` badge. The outer wallet scan console remains a framed `card-3d` surface at every width, retaining its white background, border, tactile shadow, and horizontal and vertical padding; responsive behavior changes only its internal reflow. Its height follows the controls rather than reserving empty vertical space; center its address well, network choices, and Scan action as one vertical stack with 12px gaps. At widths below 400px those controls share a centered 288px maximum column and may shrink below it; from 400px through 639px they use a centered 520px maximum column; from 640px up to the `md` transition they use a centered 600px maximum column so intermediate and tablet-sized fields fill the card without crowding its frame. The four network choices remain one centered row at 360px and above, while Scan stays full-width beneath them until the desktop `md` layout returns. The address well remains intrinsic-height with start-aligned entry text. Loaded summaries shorten the visible address while retaining full-address inspection/copy, keep `Edit scan` inline when possible, and allow a deliberate fallback row. Dashboard tabs remain one horizontally scrollable row with a flatter mobile treatment and visible active marker. The Behavioral DNA risk card reflows into a top-aligned summary with deliberate score/verdict wrapping and a full-width single-column database-status list; labels wrap without fixed mobile widths or heights. Protocol interactions use two equal-width view buttons, then a full-width search and labelled native category select on mobile, while the existing category buttons remain at `md` and above. Transfer filters use a full-width search field whose focus treatment encloses the complete field, three equal-width direction controls, and one full-width labelled Network select (prefer the native select on mobile), followed by deliberate result/pagination rows. Footer links become one left-aligned column sharing the footer copy edge. Tables and tab lists may scroll only inside labelled regions.
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
- Design-token constraints: Extend existing CSS tokens/classes before introducing new patterns. Preserve the current light theme, component dimensions, typography, and behavior unless the user explicitly requests changes; a token cleanup must not silently alter the rendered app.
- Performance constraints: Keep existing dynamic dashboard boundaries and avoid provider calls for UI verification. Production inspection confirmed that the home page defers `Dashboard` and `BulkDashboard`, and `Dashboard` in turn defers every non-default analytics tab; retain that structure. Recharts is a deferred shared chunk for the radar and gas views, not part of the entry dashboard payload. Before changing the graph inspector, throttle pan/zoom state updates to animation frames and use pointer events so touch support and rendering cost are addressed together. Establish real-user or lab budgets (LCP, INP, CLS, route JS, and tab-open latency) before pursuing bundle reductions; build artifacts alone are not field performance evidence.
- Compatibility constraints: Preserve current client/server boundaries and existing static snapshot behavior.
- Test/screenshot expectations: Items 16–21 are recorded as implemented in `ui_fixes.md`; item 22 remains open. The current audit does not close it. Verify at 320/360/390px and 1280/1440px, including keyboard, touch-target, reduced-motion, zoom, overflow, saved/partial/unavailable/loading, docs, Cluster Scan, and footer states. Run focused regression tests, `git diff --check`, and the canonical `npm run verify`; use deterministic fixtures for UI checks. This design refresh itself makes no UI implementation changes.
- Historical audit verification: the original audit recorded a passing production build/lint and 252/253 passing tests, with a mobile-width failure. The current source now restores the 288px constraint, also measured in the alignment browser check; do not treat that old failure as a current result. Audit measurements and bundle inspection are local evidence, not production, Safari, assistive-technology, zoom, or real-user performance certification.
- Alignment verification (2026-08-27): `npm run verify` passed (lint, typecheck, 259/259 tests, production build); `git diff --check` passed. Tailwind compiled CSS before/after removal of the unused palette was byte-for-byte identical (SHA-256 `c906607fd823fb6946b75a594579d07ac5f790cca2453a0c244e01818f8daafd`). The local post-change scanner retained the light appearance and 288px input well at 390px, with no page-wide horizontal overflow. No rendered CSS, component behavior, or font settings changed in this alignment. Existing unrelated working-tree fixes were preserved; no deployment was performed.

## Open questions
- [x] Approved — Use the `md` transition (around 768px) for the mobile composition so tablet widths retain the readable single-column rules.
- [x] Approved — Use an inline disclosure button for full-address inspection in `LoadedScanSummary`; keep copy as a separate explicit action.
- [x] Approved — Use a 3px orange-ink bottom rule as the active marker for flattened mobile dashboard tabs.
- [x] Theme conflict resolved — On 2026-08-27, the user requested alignment with the current app. Preserve light gray, white, black, and orange; `AGENTS.md` now agrees, and the unused dark Tailwind palette is removed. No theme switch is authorized.
- [x] Mobile console width — Retain the existing approved 288px centered inner column. The current source and the 390px browser check now agree with that rule; no wider-layout approval is needed for this alignment. The broader item 22 verification remains separate.
- [ ] Mobile result priority / product owner: approve a compact identity summary and collapsed secondary accounts so blacklist/risk information is reached sooner, without changing desktop composition?
- [ ] Transfer scope / product owner: is the intended feature a top-token-transfer browser or a full transfer-history search? Label the existing subset immediately in a future approved fix; any expansion needs separate data/performance acceptance criteria.
- [ ] Accessibility scope / product owner: confirm the intended AA version and browser/assistive-technology matrix. This audit is not a compliance certification.

## Working with design changes

1. Identify the affected screen, requested change, mobile/desktop scope, and appearance or behavior to preserve.
2. Read the relevant sections here and reuse existing components/styles. Change local layout in the component; change shared visual rules in `globals.css` only when the intended scope is app-wide.
3. If the request approves a new shared rule, update this document and any conflicting guidance in the same change. Do not treat unrelated audit proposals as approved work.
4. Verify with the applicable tests and fresh browser checks. Record what passed and any remaining limitations; keep historical audit evidence separate from current results.

## Audit handoff

- Use `DESIGN_AUDIT.md` for ranked findings, route/component inventory, reproduction steps, acceptance criteria, and evidence limits.
- Address task-blocking interaction and evidence-label defects before cosmetic changes. Preserve the existing tokens, shared components, saved-demo path, and analytics/provider boundaries.
- Recommendations cite the relevant sections of this contract. They do not authorize implementation, provider-backed scans, deployment, or remote writes.
- No Visual Ralph handoff is required for this audit. A future reference-matching task needs a separately approved visual target.
