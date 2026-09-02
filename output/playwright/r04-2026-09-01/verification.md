# R04 browser verification — 2026-09-01

Local production server: `PORT=3012 npm start`

Fixture: saved `?demo=vitalik` snapshot; no provider-backed scan submitted.

## Layout

- 1440×900: all inflow, protocol/core-wallet, and outflow lanes visible; no node-box collisions.
- 768×900: graph remains inside the labeled horizontal scroll region; no node-box collisions.
- 390×844: graph remains usable in the labeled horizontal scroll region; no node-box collisions.
- DOM geometry check: 23 rendered node shapes; transformed bounds had `intersects=false` and `outside=false`.
- Accessibility check: `svg[aria-hidden="true"]` contained zero focusable descendants.

## Keyboard inspection

- Expanded `Accessible capital flow data`.
- Focused the named `Inspect center Your Wallet` button.
- Pressed Space twice: `aria-pressed` changed `false` to `true`; focus stayed on the same button and the visual inspector appeared.
- Accessible rows expose full addresses, named `Inspect node` actions, and explorer links without relying on hover.

## Local gates

- Focused R03/R04 UI suite: 38/38 passed.
- `npm run verify`: passed lint, generated-route typecheck, 296/296 tests, and production webpack build.
- `git diff --check`: passed.

These checks do not prove screen-reader, Safari, real-device, Preview, production, or live-provider behavior.
