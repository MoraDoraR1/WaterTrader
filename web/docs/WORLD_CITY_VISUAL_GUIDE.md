# WaterTrader World & City Visual Guide

## Art direction

- **Period:** late 16th to early 17th century maritime trade. Materials should feel handmade, weathered, and local rather than modern or industrial.
- **Readability:** retain the current 480×270 logical canvas and isometric camera. Silhouettes, value contrast, and role colours must remain readable at game scale.
- **Detail hierarchy:** large regional colour blocks first, architecture and shoreline second, props and material marks last. Decorative detail must not obscure navigation or interaction prompts.

## Sea and land

- Use three water depths: dark offshore water, saturated mid-water, and pale turquoise shoals around ports. Break up the old checkerboard with moving wave bands, foam dashes, and small sun glints.
- Coastlines receive a dark wet edge and a light surf edge. Land uses climate-aware overlays: temperate green, Mediterranean ochre/olive, arid sand, tropical deep green, and northern cool moss.
- The terrain around every visible port inherits its country profile. Small contour marks, scrub, rock, pine, or palm clusters communicate geography without changing collision geometry.
- Harbor entrances remain visibly open. The usable docking radius increases from 55 to 95 world units and is shown with a soft pulsing harbor halo when the player is close.

## City culture groups

| Group | Countries | Ground / vegetation | Architecture cues |
| --- | --- | --- | --- |
| Iberian | PT, ES | sun-warmed limestone, dry grass, olive | white limestone, terracotta roof, blue tile band |
| North Sea | EN, NL, HAN, DK, SE | damp cobble, cool grass | brick/timber, steep slate gable, small leaded windows |
| Mediterranean | FR, IT, MT, RG | pale stone, cypress, ochre earth | stucco, terracotta, arcade and balcony accents |
| Ottoman & Arabian | OT, OM | sandstone, sparse palms | flat/parapet forms, turquoise/copper dome accents, cloth awnings |
| South & Southeast Asian | AC, BN, BU, SM, VN | laterite earth, lush palms | timber veranda, steep weatherproof roof, woven market colour |
| Chinese | CN | gray flagstone, bamboo/red accents | red columns, dark curved tile roof, hanging lanterns |
| Japanese | JP | compact earth/cobble, pine | dark timber frame, white infill, layered tiled eaves |
| Korean | KR | pale packed earth, pine | white plaster, exposed timber, broad curved hanok roof |
| Atlantic colonial | SC and colonial-layout ports | timber walkways, coastal scrub | whitewash/timber, veranda, simple defensive stonework |

City layouts keep their gameplay positions but gain deterministic roads, paving, façade windows and doors, barrels, crates, stalls, wells/fountains, vegetation, seawalls, layered piers, and harbor water animation. Capitals use denser architecture and richer civic decoration.

## Characters

- Replace the 10×12 procedural figures with transparent illustrated sprites drawn at **at least four-head-tall proportions** (comfortably above the requested three heads).
- Full body, neutral standing pose, three-quarter isometric view, crisp hand-painted/pixel-inspired finish, transparent background, no cast shadow, no lettering.
- Two genders for each visual family: player captain, European, Mediterranean/Arabian, East Asian, Korean, and tropical/Southeast Asian.
- NPC profession remains readable through the existing role-colour ground ring and label. Player orientation uses horizontal mirroring instead of rotating the upright body.

### Generation prompt set

All 12 cutouts share this base: one full-body character, neutral standing pose, three-quarter isometric view facing slightly right, complete body visible, four heads tall or taller, non-chibi, crisp hand-painted pixel-inspired finish, soft top-left light, transparent background, no floor/shadow/scenery/UI/text/watermark.

The subject variants are `player_male`, `player_female`, `european_male`, `european_female`, `mediterranean_male`, `mediterranean_female`, `east_asian_male`, `east_asian_female`, `korean_male`, `korean_female`, `tropical_male`, and `tropical_female`. Their clothing descriptions specify historically grounded late-16th/early-17th-century Iberian captain, North Sea guild, Ottoman port, Ming/Japanese port, Joseon, and Southeast Asian maritime dress respectively.

Production sprites are normalized to a transparent 144×216 canvas and stored under `web/assets/characters/`; the contact sheet alongside this guide is the visual QA record.

## Acceptance checks

- Port architecture and surrounding colour language visibly change between culture groups.
- Sea and land no longer read as flat two-colour tiles, while coast collision remains unchanged.
- Docking prompt works inside the new 95-unit base radius.
- NPC and player bodies visibly read as 4-head-tall people at normal zoom and remain upright while moving.
- Generated character files are embedded in the standalone build; the game still falls back to procedural sprites if an image has not loaded.
