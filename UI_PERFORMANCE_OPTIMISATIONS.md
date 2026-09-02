# Proposed UI performance optimisations

Date: 2026-08-28  
Status: Implemented locally with behavioral verification. Runtime CPU, frame, energy, and temperature measurements remain open; no deployment or numeric performance claim is authorized by this record.

## Objective and evidence limits

Keep the current appearance while reducing unnecessary processing, drawing, and battery use on the user's device. Follow `DESIGN.md`; this document is not a replacement design specification.

The user reported laptop heating when opening a website. Whether WalletGenome specifically causes that heating, and how much the decorative effects contribute, remains unverified. Smooth-looking animation does not establish low energy use.

Current source confirms:

- `src/app/layout.tsx` mounts `BackgroundNodes` and `CursorGlow` globally.
- `src/components/BackgroundNodes.tsx` updates 60 particles, checks 1,770 particle pairs, and redraws a viewport-sized canvas each animation frame. At an assumed 60 FPS, that is 106,200 pair checks per second—not a measured frame rate or evidence of excessive cost by itself.
- `src/components/CursorGlow.tsx` runs an animation loop before the first pointer movement and after the glow settles. Once activated, it repeatedly writes coordinates used by a full-screen radial gradient. Changed coordinates can require repainting; identical writes should not be assumed to cause a full repaint every frame.
- Neither JavaScript effect checks reduced-motion preferences or pointer capability. The reduced-motion CSS in `src/app/globals.css` does not stop their JavaScript loops.
- Both effects clean up listeners and animation frames on unmount and avoid per-frame React state updates. Preserve these properties.
- The effects make no scan/API requests. Their ongoing animation work runs in the browser, not on the hosting server; serving their assets still has a small delivery cost.

CPU usage, dropped frames, energy use, temperature, and effects-on/off differences have not been measured. No percentage improvement is promised.

## Proposed changes, in priority order

### 1. Make the cursor effect run only when needed

Target: `src/components/CursorGlow.tsx`.

- [x] Start the loop on relevant pointer movement, rather than on mount.
- [x] Stop once the glow reaches a small settling threshold; restart on the next movement. Do not leave duplicate loops running.
- [x] Replace the changing full-screen gradient with a bounded element containing a fixed gradient, moved using `transform`.
- [x] Preserve the glow's current size, brightness, trailing feel, layering, and non-interactive behavior. Check edges and clipping after the change.
- [x] Disable the trail on touch-only devices. Use pointer capabilities rather than screen width alone, accounting for hybrid devices.

Acceptance: no cursor animation callbacks while settled or disabled; the effect resumes correctly; no per-frame React rendering, blocked clicks, or new horizontal overflow. Compare painting and CPU cost before claiming a gain.

### 2. Respect reduced motion and page visibility

Targets: `BackgroundNodes.tsx`, `CursorGlow.tsx`, and existing motion rules.

- [x] With reduced motion enabled, draw a static node background and disable cursor trailing.
- [x] Respond when the preference changes while the page is open.
- [x] Stop effect loops when the document is hidden and resume only when appropriate. Most browsers already pause animation-frame callbacks in background tabs; do not count this as a guaranteed additional saving.
- [x] Handle resize and resume without jumps, stale dimensions, duplicate listeners, or duplicate loops.

Acceptance: reduced-motion and hidden-page states do not keep app-owned decorative loops scheduled. Returning to the page restores the intended state without losing content or interactions.

### 3. Tune the background only where measurements justify it

Target: `src/components/BackgroundNodes.tsx`.

- [x] Make motion time-based so its speed stays consistent across display refresh rates. Bound elapsed time after pauses.
- [x] Apply a 30 FPS update/draw cap. Animation-frame scheduling may still occur at the display's refresh rate.
- [ ] Compare fewer particles on narrow screens, for example 30 instead of 60. This changes pair checks from 1,770 to 435 per frame—about 75% fewer pair checks, not 75% less total CPU or energy use. This remains unselected because the visual tradeoff has not been measured.
- [x] Reject out-of-range pairs using squared distance; calculate a square root only for connections that need the existing distance-based line width.
- [x] Retain the current appearance; no particle-count reduction was selected without measurement.

Acceptance: motion speed remains consistent at different refresh rates, resize works, and any selected settings produce a repeatable improvement without distracting stutter. Do not assume all phones are weak or all desktops are powerful.

### 4. Pause offscreen graph decoration

Targets: `src/components/CapitalFlowGraph.tsx` and `src/components/ClusterFlowGraph.tsx`.

- [x] Pause animated connection lines while the graph is outside the viewport or the page is hidden.
- [x] Preserve graph data, labels, navigation, pointer/keyboard controls, and screen-reader summaries.
- [x] Retain reduced-motion handling and existing lazy-loaded dashboard/tab boundaries.

Acceptance: visible graphs resume correctly; offscreen decoration is paused; tab switching and graph interactions do not regress. Graph animation existed before the new background/cursor effects and must be measured separately.

## Measurement and verification before marking complete

- [ ] Capture a baseline using a production build, not the development server.
- [ ] With approval, add a reversible local-only comparison mechanism that independently disables each effect. Disabled must mean unmounted or stopped—not merely hidden with CSS. Do not ship the test mechanism by default.
- [ ] Compare four conditions: both effects off, background only, cursor only, and both on.
- [ ] Use the same page, saved demo data, viewport, browser, power settings, and loading/warm-up conditions. Avoid provider-backed scans and unrelated background activity.
- [ ] For each condition, record 60 seconds idle, 30 seconds of comparable pointer movement, and 30 seconds of comparable scrolling/tab interaction. Repeat at least three times and alternate test order to reduce warm-up and thermal bias.
- [ ] Record CPU usage, scripting/painting time, dropped frames, and interaction delays. Record energy/GPU information where supported; CPU alone is not a complete measure of graphics power use.
- [ ] Treat temperature as a separate, slower whole-device measurement requiring suitable sensor access and controlled conditions. Do not infer a temperature reduction from CPU readings alone.
- [ ] Cover the landing page, Docs, saved dashboard, and populated flow graph. Verify touch-only and hybrid pointer behavior, reduced motion, resizing, hidden/visible transitions, and a real lower-powered device when available. A phone-sized desktop viewport is not mobile hardware evidence.
- [ ] Add regression coverage for loop start/stop, cleanup, preference changes, visibility, and time-based motion. Run focused tests and the canonical `npm run verify` after implementation.
- [ ] Record before/after results, device/browser details, visual tradeoffs, and remaining limitations before marking any optimisation complete. Passing unit tests does not prove lower energy use.

Current tooling limitation: the available browser connection does not expose a CPU/frame profiler. Proper runtime measurements require a supported profiling setup or an exported browser performance recording. This proposal contains no such measurements.

## Out of scope

- No hosting upgrade for these client-side effects.
- No automatic removal of all animation or redesign.
- No WebGL/Three.js migration, worker architecture, or new animation library without evidence that the simpler approach is insufficient.
- No changes to analytics, scan providers, caching, or API behavior.
- No deployment or remote changes.

## Local implementation record

- Added event-driven cursor scheduling, fine/any-pointer capability checks, reduced-motion preference listeners, and bounded transform-based glow rendering.
- Added static/restartable background-node behavior for reduced motion and hidden pages, time-based movement, a 30 FPS draw cap, bounded pause deltas, and squared-distance rejection.
- Added shared viewport/page visibility pausing for Capital Flow and Cluster Flow dashed-line decoration.
- Added focused runtime/source regression coverage in `src/components/uiEffectRuntime.test.ts` and `src/components/uiPerformance.test.ts`.
- `npm run verify` passed locally after implementation: lint, typecheck, 284 tests, and production build.
- Rendered production smoke checks passed at 1440×900 and 390×844 with no horizontal overflow; the saved flow graph paused offscreen and resumed in view.
- Not measured here: CPU usage, scripting/painting time, dropped frames, interaction latency, GPU/energy use, device temperature, real touch-only hardware, or reduced-motion emulation in a profiled browser.

## Reference material

- [High-performance animation guidance](https://web.dev/articles/animations-guide)
- [Animation timing and background-tab behavior](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [Chrome Performance Monitor](https://developer.chrome.com/docs/devtools/performance-monitor)
- [Chrome performance recordings](https://developer.chrome.com/docs/devtools/performance/overview)
