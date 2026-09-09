# QA Report — City Navigation & Coastal Settlement Revision

## Verdict

**PASS for the requested revision scope.** City walking is 2.17× faster, user movement has a movement-gated walk cycle, all 69 sea-map cities are land-backed settlements with separate water docking points, and all 10 applicable overlays have mouse-operable close buttons.

- Tested source: `97f4d6b60ceb27108eb5386fd8ad8b623450a263`
- Runtime: Headless Chrome 152, generated `docs/index.html`
- Viewport: 1440×900

## Suite discovery

| Suite | Source | Runner | Result |
| --- | --- | --- | --- |
| render-smoothing | `web/scripts/verify-smooth-rendering.mjs` | `npm run verify` | PASS |
| legacy-pixel-removal | same | `npm run verify` | PASS |
| character-assets | same | `npm run verify` | PASS |
| city-character-motion | same | `npm run verify` | PASS |
| city-placement | same | `npm run verify` | PASS |
| mouse-close-controls | same | `npm run verify` | PASS |
| scoped-browser-runtime | `web/scripts/browser-city-polish-qa.mjs` | Chrome DevTools Protocol | PASS |

No CI workflow or additional automated test directory was discovered. `web/dist/` is generated output and excluded from suite discovery.

## Independent verification

- `npm run verify` exited 0 and rebuilt both the standalone artifact and the GitHub Pages entry. Full output: `qa/evidence/verify.log`.
- City walk speed is 10.0 world units/second, up from 4.6 (2.17×). Real W input moved the player 6.834 world units during the sample.
- During movement, `walking=true`, `motionBlend=1`, and the walk phase advanced. After key release, `walking=false`.
- All 69 cities have natural or synthesized land backing and a water-side dock; Lisbon uses natural land and the Iberian settlement style.
- Eight regional settlement styles are represented. The four tiny-island cases receive explicit land footprints instead of floating markers.
- All 10 close controls are statically present and wired. Inventory and world map close buttons were also clicked with real pointer input.
- Browser run recorded zero console errors, failed requests, or HTTP errors.

## Visual findings

| Frame | Evidence | Result |
| --- | --- | --- |
| Lisbon sea map | `qa/evidence/06-lisbon-land-city.jpg` | Iberian building cluster sits on land; docking basin remains water; no lighthouse |
| Player walking | `qa/evidence/07-player-walk-motion.jpg` | Smooth illustrated user character is captured during an active walk phase |
| Inventory open | `qa/evidence/08-inventory-close-open.jpg` | Visible top-right × button with sufficient pointer target |
| Inventory dismissed | `qa/evidence/09-inventory-close-result.jpg` | Real pointer click closes the overlay and restores the city view |

## Scope notes

- The sea, city, and panel signature moments defined in `design/ART_DIRECTION.md` are present in the captured run.
- The scoped browser run used a Lisbon checkpoint setup before testing city movement; it does not claim a new end-to-end economy or progression certification.
- No blocker or major issue was found in this revision.

## Not tested

- Every regional city silhouette was not screenshot-reviewed individually; all 69 placement invariants and all eight style assignments were checked programmatically.
- Long-session economy, every quest or combat branch, audio listening, alternate browsers/devices, and non-Korean localization remain outside scope.
- Human judgments about speed feel, fun, readability, and onboarding remain reserved for the playtest protocol.

Raw runtime data: `qa/evidence/city-polish-runtime.json`. Independent expectations: `qa/evidence/design-invariants.md`.
