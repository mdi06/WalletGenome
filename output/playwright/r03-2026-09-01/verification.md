# R03 accessibility and contrast verification

Date: 2026-09-01

## Local implementation

- Wallet scan input has a persistent visible `Wallet address or ENS domain` label and a `#4b5563` placeholder.
- Gas provenance uses readable 12px `#4b5563` text for `Observed history`.
- Invalid wallet input renders `#991b1b`, sets `aria-invalid="true"`, and points `aria-describedby` to `wallet-address-error`.
- Transfer direction and desktop network filters expose `aria-pressed`.
- Single and cluster scan modes each use one stable `tabpanel` target; the full-address disclosure keeps one DOM target and exposes `aria-expanded`.
- The flow graph SVG is decorative (`aria-hidden="true"`) and has no focusable descendants. The adjacent accessible data disclosure exposes 23 rows and 23 explorer links.

## Verification

- `npm run verify`: PASS — lint, generated-route typecheck, 295/295 tests, and production webpack build.
- R03/component focused suite: PASS — 65/65 tests.
- Final post-contrast-token targeted retest: PASS — 14/14 tests.
- `git diff --check`: PASS.
- Local production browser: `PORT=3011 npm start`, scanner checked at 390x844 and 1440x900 with no horizontal overflow.
- Rendered contrast: placeholder 6.93:1 on `#f4f5f8`; visible label 6.34:1 on `#ebebeb`.
- Keyboard/browser checks: ArrowRight moved to Cluster scan; Escape closed mobile navigation; clearing transfer search restored focus to `#transfer-search`; Inbound announced `[pressed]`.
- Checked `aria-controls` references each resolved to exactly one target in the saved-result DOM.

## Limits

The browser accessibility tree and keyboard checks are local evidence, not a real screen-reader smoke test or WCAG certification. No provider-backed scan, Preview, deployment, push, reset, discard, or remote/cloud action was performed. A real screen-reader smoke check and Preview/production verification remain required before public release.
