# Smooth-rendering invariants

Independent expectation source: the user directive and `web/docs/VISUAL_GUIDE.md`, read separately from the implementation.

| Invariant | Expected | Observed | Evidence |
| --- | --- | --- | --- |
| Main presentation | No enlarged nearest-neighbour dots | CSS reports `image-rendering: auto`; runtime canvas uses high-quality smoothing | `runtime-results.json`, `verify.log` |
| Backing resolution | Match actual display pixels while logical input stays 480×270 | 1440×900 → 1440×900 backing; 1280×720 → 1280×720 backing; logical remains 480×270 | `runtime-results.json` |
| Character presentation | Existing 12 illustrated WebP cutouts retain smooth alpha edges; no 10×12 fallback | 12 assets embedded; city screenshot shows illustrated characters; legacy module removed | `02-city-smooth.jpg`, `verify.log` |
| Harbor presentation | No cached low-resolution bitmap marker | Lighthouse is drawn directly in the high-resolution scene | `03-smooth-harbor-marker.jpg`, `verify.log` |
| Gameplay preservation | Movement, docking, city transition, and restart still work | W input moved ship and raised notch; click docked at Lisboa; reload returned to title | `runtime-results.json` |

No economy, collision, docking-radius, save-schema, camera, or content constant changed in this revision.
