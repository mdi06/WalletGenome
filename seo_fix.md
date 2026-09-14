# SEO Fix Plan

Status: implemented locally; production verification remains open.

Reviewed: 2026-09-14. Evidence comes from the earlier local audit and source review in this conversation. Local verification does not establish production performance or indexing.

The four code changes below are implemented in the current working tree. The production checks remain follow-up work and are not implied by local tests or the local build.

## 1. Improve loading accessibility

Problem: dashboard and chart/table loading fallbacks lack explicit status semantics.

Change:
- Provide concise loading feedback for the active dashboard or panel.
- Coordinate nested loaders so screen readers do not receive several simultaneous announcements.
- Preserve focus and the existing deferred imports.

Acceptance: slow-loading dashboard and tab states announce useful feedback without duplication or unexpected focus movement. Verify semantics and behavior with focused tests and a screen-reader check.

Safe locally: yes. Production follow-up: check the deployed loading experience with assistive technology.

Evidence: `src/app/page.tsx:31`, `src/components/Dashboard.tsx:16`.

## 2. Restore the failed-avatar fallback

Problem: `IdentityCard` hides a failed image but only renders its fallback when the avatar URL is absent. A failed request leaves an empty slot.

Change:
- Render the existing fallback or accessible initials after an image error.
- Reset the failure state when the avatar source changes.
- Preserve the reserved dimensions and meaningful image alt text.

Acceptance: missing, failed, and successful images retain the same slot size. A new valid source loads after an earlier failure. Test image failure and source-change recovery.

Safe locally: yes. Production follow-up: confirm normal saved-result rendering and readable failure handling.

Evidence: `src/components/IdentityCard.tsx:80`.

## 3. Remove the mobile docs control overlap

Problem: the earlier 390×844 local capture showed the fixed “Jump to topic” control covering part of a paragraph during scrolling.

Change:
- Replace the floating control with an in-flow return-to-topics action at useful section boundaries.
- Reuse the existing mobile topic index, focus handling, and reduced-motion behavior.
- Preserve desktop navigation.

Acceptance: reading content and focused controls remain unobscured at 320/360/390px widths and under text zoom. Topic navigation remains reachable by keyboard and touch.

Safe locally: yes. Production follow-up: check long documentation sections on iOS Safari and Android Chrome.

Evidence: `src/app/docs/page.tsx:289`, `src/app/docs/page.tsx:428`.

## 4. Correct Web Vitals route attribution

Problem: telemetry labels metrics with the pathname at reporting time. After client navigation, a delayed document-level metric can be labelled with a different route from the one it describes.

Change:
- Define and implement attribution to the corresponding document navigation, including supported restore behavior.
- Test navigation before a delayed callback and verify that the event retains the correct route label.
- Preserve the existing privacy-limited payload and document the current callback-level 10% sampling.

Acceptance: delayed document-level metrics are not silently reassigned to the latest client route. Verify behavior against the installed Next.js hook.

Safe locally: yes, with focused navigation/callback tests. Production follow-up: confirm accepted events, expected route labels, and rejection rates in deployed logs. These events measure performance; they do not establish traffic, search, or conversion results.

Evidence: `src/components/WebVitals.tsx:54`, `src/lib/performanceTelemetry.ts:1`, `src/app/api/web-vitals/route.ts:31`.

## Required production verification

Before making any metadata configuration change, inspect deployed canonicals, social metadata, JSON-LD, `robots.txt`, and `sitemap.xml`. The existing origin fallback may already be correct; localhost canonicals in a local build do not prove a production defect. Configure `SITE_URL` at build time only if deployed output needs correction.

Check query-URL indexing in Search Console. Robots exclusions prevent crawling but do not guarantee non-indexing. If an actual exclusion issue is found, scope the indexing fix separately while preserving the clean root and public guides.

Evidence: `src/lib/seo.ts:30`, `src/app/robots.ts:4`, `src/app/sitemap.ts:8`.

## Implementation verification

For the code changes above, run focused behavioral checks, repository-required lint/tests, typecheck, the production build, and `git diff --check`. Check affected mobile and desktop states, including slow loading, image failures, focus, and zoom.

Preserve unrelated working-tree edits. Record local results separately from deployed metadata, real-device checks, and production telemetry evidence.
