# City navigation and settlement invariants

Independent expectation source: the user's 2026-09-08/09 directives, the supplied failure screenshot, and `design/ART_DIRECTION.md`, read separately from implementation results.

| Invariant | Expected | Observed | Evidence |
| --- | --- | --- | --- |
| Player speed | City speed is at least 2× the former 4.6 | Runtime speed is 10.0 (2.17×); 7.0 world units moved during the held-W sample | `city-polish-runtime.json`, `verify.log` |
| Player walk cycle | Motion plays only while actual displacement occurs and returns to standing at rest | `walking=true`, non-zero phase, blend=1 during movement; `walking=false` after key-up | `07-player-walk-motion.jpg`, `city-polish-runtime.json` |
| Lisbon placement | Lisbon must be a city on land, not a lighthouse on water | Lisbon resolves to natural land with an Iberian townhouse/civic-tower silhouette; dock remains a separate water basin | `06-lisbon-land-city.jpg`, `city-polish-runtime.json` |
| All-city placement | Every city has land footing and every dock is in open water | 69/69 have natural or explicit small-island land; 0 docks are on coastline land | `verify.log` |
| Cultural differentiation | Other cities use locally appropriate non-colour silhouettes | Eight groups verified: Iberian, North Sea, Mediterranean, Ottoman, tropical, Chinese, Japanese, Korean | `verify.log`, `design/ART_DIRECTION.md` |
| Mouse dismissal | Major windows expose a visible, clickable close control | 10 controls are present/wired; real pointer clicks closed inventory and world map | `08-inventory-close-open.jpg`, `09-inventory-close-result.jpg`, `city-polish-runtime.json` |
| Rendering preservation | No enlarged nearest-neighbour dots return | Display-resolution Canvas2D smoothing and 12 illustrated WebP assets remain enabled | `verify.log` |

No economy, quest, combat, audio, save-schema, or docking-radius constant changed in this revision.
