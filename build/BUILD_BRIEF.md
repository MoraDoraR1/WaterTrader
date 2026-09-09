# BUILD_BRIEF — Smooth Rendering Revision

## Finished goal

Remove the enlarged-dot presentation from the existing WaterTrader web game without changing its camera, navigation, collision, docking, economy, or save behaviour. The game keeps a 480×270 logical coordinate system for composition and input, but must render to a display-resolution backing canvas with antialiased vector drawing and high-quality image interpolation.

## Design sources

- `web/docs/VISUAL_GUIDE.md`
- `web/docs/WORLD_CITY_VISUAL_GUIDE.md`
- User directive dated 2026-09-08: remove the game-dot format because images appear broken.
- `GAME_DESIGN.md`, `ART_DIRECTION.md`, and `PRODUCT_BRIEF.md`: `NOT_AVAILABLE` in this legacy repository. No product or gameplay decision is introduced by this rendering-only revision.

## Scope

- Replace the low-resolution nearest-neighbour presentation surface with a high-resolution smooth Canvas2D surface.
- Preserve logical coordinates and input mapping.
- Remove the 10×12 procedural character fallback and 26×34 cached bitmap harbor marker.
- Draw the harbor beacon directly as antialiased vector geometry.
- Keep the 12 existing transparent character illustrations and render their alpha edges smoothly.
- Preserve the standalone HTML and GitHub Pages delivery path.

Excluded: gameplay balancing, new content, economy changes, camera redesign, character regeneration, and UI information architecture.

## Toolchain and authoritative verification

```yaml
toolchain:
  targetPlatform: desktop web browser
  targetRuntime: modern Chromium browser, static GitHub Pages
  testedRuntime: installed Google Chrome via Playwright
  engine: Canvas2D + DOM HUD + esbuild
  engineVersion: custom renderer; esbuild 0.24.x
  runtime: browser JavaScript ES2020
  runtimeVersion: recorded in qa/QA_REPORT.md
  packageManager: npm
commands:
  install: npm install (already satisfied)
  buildOrExport: npm run build; node build-artifact.mjs
  start: open dist/bada-sangin-standalone.html or serve web/
  verify: npm run verify
verification:
  suites: [render-smoothing, legacy-pixel-removal, character-assets]
  supplementalSuites: [browser-visual-regression]
  completeRun: qa/verification.json#completeRun
  evidenceIndex: qa/verification.json#checkpoints
```

## Completion evidence

- `qa/evidence/verify.log` records the authoritative verification command.
- Browser evidence must demonstrate a non-empty sea scene, real input movement, docking transition, a city scene with generated characters, and a clean restart.
- A city screenshot at 1440×900 must show smooth character and building edges without nearest-neighbour blocks.

## Final scope comparison

Implementation must match the scope above exactly. Any gameplay or save-format change is a failure for this revision.
