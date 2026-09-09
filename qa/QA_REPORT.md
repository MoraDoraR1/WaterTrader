# QA Report — Smooth Rendering Revision

## Verdict

**PASS for the requested rendering scope.** The enlarged-dot presentation is removed, the actual standalone build renders smoothly, and movement, docking, city entry, 1280×720 layout, and restart still work. This is not a new full-game balance or content certification.

- Tested source: `03ca4a5530658004c806adabee587ce697dd9f90`
- Runtime: Google Chrome 152.0.7977.77, standalone `docs/index.html`
- Viewports: 1440×900 and 1280×720

## Suite discovery

| Suite | Discovered from | Files | Runner | Observed in verify | Result |
| --- | --- | --- | --- | --- | --- |
| render-smoothing | `web/package.json` | `web/scripts/verify-smooth-rendering.mjs` | `npm run verify` | yes | PASS |
| legacy-pixel-removal | `web/package.json` | same | `npm run verify` | yes | PASS |
| character-assets | `web/package.json` | same | `npm run verify` | yes | PASS |
| browser-visual-regression | BUILD_BRIEF supplemental suite | standalone artifact + Playwright scenario | Chrome 152 | supplemental, outside verify | PASS |

No CI workflow or additional test directory was found. `web/dist/` is generated output and excluded from suite discovery.

## Independent verification

- Authoritative command: `npm run verify`; exit 0. Full output: `qa/evidence/verify.log`.
- Browser launch returned status 200 with zero console errors and zero failed resource responses.
- Runtime canvas matched the display: 1440×900 and 1280×720, while the preserved logical coordinate system remained 480×270.
- Real W input changed throttle notch 0→1 and moved the ship.
- A real canvas click inside Lisboa's docking state transitioned `sea → city`.
- Reload returned to the visible title state.
- Heavy sampled state: Lisboa city. rAF interval p50 16.7 ms, p95 16.8 ms, worst 16.8 ms across 95 samples. No product performance budget exists, so this is reported without an invented pass threshold.

## Visual findings

| Frame | Trigger | Evidence | Result |
| --- | --- | --- | --- |
| Sea start | New voyage | `qa/evidence/01-sea-start.jpg` | Smooth vector/Canvas edges; non-empty render |
| Lisboa city | Enter city | `qa/evidence/02-city-smooth.jpg` | Illustrated character faces and clothing remain clear; no nearest-neighbour blocks |
| Harbor beacon | Approach Lisboa | `qa/evidence/03-smooth-harbor-marker.jpg` | Direct vector lighthouse replaces cached bitmap marker |
| 1280×720 city | Resize active city | `qa/evidence/04-city-1280x720.jpg` | No body overflow; HUD and game scene remain usable |
| Restart | Reload | `qa/evidence/05-restart-title.jpg` | Valid title state restored |

## First-time onboarding, core fantasy, signature frame

- First-time onboarding: title, start action, ship state, and first movement were observed. The separate clean-context premise adjudication is `NOT_RUN` because sub-agent spawning is not authorized in this session; therefore no full-game onboarding certification is claimed.
- Core fantasy performance: the observable loop of sailing, approaching an era-styled harbor, and entering a populated trade city was performed once. Long-form trade/combat progression was outside scope.
- Signature frame: `02-city-smooth.jpg` meets the current city guide's smooth illustrated character requirement and preserves country-specific Lisbon materials. `03-smooth-harbor-marker.jpg` verifies the sea-mode marker treatment.

## Findings and routing

No blocker or major issue was found within the smooth-rendering revision scope. No design or product change is requested from this pass.

## Model playtest note

Subjectively, the city scene now reads as illustrated figures placed in a clean isometric environment instead of tiny bitmaps enlarged several times. The ship geometry remains deliberately simple, but its edges are smooth; further realism would require new ship scene assets rather than another interpolation change. This observation does not affect the PASS verdict.

## Not tested

- Long-session economy and balance, all quest/skill routes, every combat outcome, audio listening, alternate browsers/devices, and translations other than Korean.
- Fun, retention, and commercial readiness are reserved for human playtesting.

Raw state and timing data: `qa/evidence/runtime-results.json`. Independent expectations: `qa/evidence/design-invariants.md`.
