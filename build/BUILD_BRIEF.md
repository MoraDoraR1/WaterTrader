# BUILD_BRIEF — City Navigation & Coastal Settlement Revision

## Finished goal

Polish the existing WaterTrader desktop web build so the player crosses cities quickly with a visible walk cycle, every major panel has a mouse close control, and every sea-map city reads as a culture-specific land settlement with a separate water docking point. Preserve the high-resolution smooth Canvas2D presentation, economy, save format, combat, and 95-unit docking range.

Target: modern desktop Chromium and static GitHub Pages at 1280×720 or larger, landscape, 60 Hz presentation. No product-level first-load or package-size budget is available; measured values are reported without inventing pass thresholds.

## Required design

- `design/ART_DIRECTION.md`
- `web/docs/WORLD_CITY_VISUAL_GUIDE.md`
- User directives dated 2026-09-08/09
- `GAME_DESIGN.md` and `PRODUCT_BRIEF.md`: `NOT_AVAILABLE` in this legacy repository.

## Must preserve

- Existing sailing, docking, city interaction, economy, combat, route, save, and restart behaviours.
- Smooth display-resolution Canvas2D surface and the 12 existing illustrated character assets.
- Signature moments:
  - `Sea: Lisbon is a city, not a beacon` — approach the Lisbon docking basin.
  - `City: player crosses the Lisbon plaza` — hold W or use right-click movement.
  - `Panel: mouse-visible exit` — open inventory/map and click the visible close button.
- Falsifiable visual assertions:
  - no city lighthouse/beacon icon;
  - city roofs/walls stand on land, while the ship and docking basin remain in water;
  - eight culture groups have non-colour silhouette differences;
  - player legs alternate only during actual displacement;
  - a 32×32 top-right `×` exists on all ten major windows.
- Voice strategy: none. Dynamic-media ledger: none.
- Interface language: Korean. Existing concise maritime/trade wording remains unchanged.
- Same-gameplay verbs for this scoped revision: sail, dock, walk, interact, trade. Only walk presentation/speed and panel dismissal are changed; the other verbs are regression-checked.
- Three-act arc: `NOT_AVAILABLE` because the legacy repository has no canonical `GAME_DESIGN.md`; full-game arc certification is outside this scoped revision.
- Social presentation: single-player.

## Scope

Included:

- Set city player speed from 4.6 to 10.0 world units/second (2.17×) for keyboard and right-click movement.
- Drive player walk phase from actual displacement; render alternating lower-body stride, lift, bob, and lean; restore the standing pose at rest; respect reduced-motion preference.
- Add and wire close buttons for dialogue, inventory, world map, ship information, shipyard, skills, titles, compendium, market-family, and quest panels.
- Replace the circular port water clearing with a narrow collision/render channel and water-side basin.
- Correct all 69 city visual placements to natural or explicit local land footing and render eight culture-specific settlement silhouettes.
- Use corrected city locations on minimap and world map; restore omitted small-island land backing.
- Rebuild the standalone deployment artifact and QA evidence.

Excluded: economy/balance redesign, new quests or cities, generated character replacement, audio redesign, save-schema changes, and public deployment/push.

## Implementation freedom

Use repository-contained Canvas2D geometry, existing WebP cutouts, DOM controls, and esbuild. No runtime external service or unlocked CDN dependency is allowed. Character asset failure falls back to the existing procedural full-body figure with the same movement-gated stride.

## Toolchain and authoritative verification

```yaml
toolchain:
  targetPlatform: desktop web browser
  targetRuntime: modern Chromium browser, static GitHub Pages
  testedRuntime: Google Chrome 152 headless via Chrome DevTools Protocol
  engine: Canvas2D + DOM HUD + esbuild
  engineVersion: custom renderer; esbuild 0.24.x
  runtime: browser JavaScript ES2020
  runtimeVersion: Chrome 152.0.0.0 / Node 24.16.0
  packageManager: npm
commands:
  install: npm install (already satisfied)
  buildOrExport: npm run build; node build-artifact.mjs
  start: python -m http.server 4173 from repository root
  verify: npm run verify
verification:
  suites: [render-smoothing, legacy-pixel-removal, character-assets, city-character-motion, city-placement, mouse-close-controls]
  supplementalSuites: [browser-city-polish]
  completeRun: qa/verification.json#completeRun
  evidenceIndex: qa/verification.json#checkpoints
```

## Completion evidence

- `qa/evidence/verify.log`: authoritative static/build verification.
- `qa/evidence/city-polish-runtime.json`: real browser input and state results.
- `qa/evidence/06-lisbon-land-city.jpg`: Lisbon settlement on land with a separate water basin.
- `qa/evidence/07-player-walk-motion.jpg`: player during movement-gated walk phase.
- `qa/evidence/08-inventory-close-open.jpg` and `09-inventory-close-result.jpg`: visible close control and mouse-dismissed result.

## Final scope comparison

Implemented exactly the included revision scope on 2026-09-09. No economy, quest, save-schema, combat, audio, or public deployment change was added. Full-game onboarding, three-act arc, long-session balance, and human fun testing remain outside this scoped pass.
