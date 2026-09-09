# ART DIRECTION — City Navigation & Coastal Settlement Revision

## Scope and visual veto

This is a scoped revision for the legacy WaterTrader build; a canonical `GAME_DESIGN.md` and `PRODUCT_BRIEF.md` are not present. The source of truth is the user's 2026-09-08/09 direction plus `web/docs/WORLD_CITY_VISUAL_GUIDE.md`.

**Core rule:** a city is a land settlement with a separate water-side docking point. Reject any treatment that presents a city itself as a lighthouse, buoy, or unsupported icon floating on open water.

## Camera, composition, and world grammar

- Keep the current high-resolution isometric Canvas2D camera and 480×270 logical composition grid.
- In sea mode the reading order is landmass → settlement silhouette → narrow harbor channel → docking basin → ship.
- The settlement receives a 30-world-unit local ground footprint. Natural Earth shoreline simplification may move a coastal coordinate to the nearest natural land point within 96 units; omitted small islands receive a local island footprint at their real city coordinate.
- A 12-unit half-width channel connects the city edge to a 22-unit docking basin. The 95-unit docking interaction radius remains centred on the basin, not on the city.
- City labels sit above the roofline. Interaction text and docking range remain below/around the subject and do not cross the label.

## Settlement silhouettes

Colour is never the only cue. Each group has a distinct roofline and civic landmark.

| Visual group | Countries | Required silhouette | Material cue |
| --- | --- | --- | --- |
| Iberian | PT, ES | white townhouses + central civic/bell tower | limestone, terracotta, blue tile band |
| North Sea | EN, NL, HAN, DK, SE, SC | clustered steep gables | brick/timber, dark slate |
| Mediterranean | FR, IT, MT, RG | low stucco blocks + square civic tower | pale stone, terracotta |
| Ottoman/Arabian | OT, OM | dome + slender minaret | sandstone, turquoise roof metal |
| Tropical | AC, BN, BU, SM, VN | raised timber hall + steep roof + palm | dark timber, woven/weatherproof roof |
| Chinese | CN | red gate rhythm + two curved roof tiers | pale wall, red columns, dark tile |
| Japanese | JP | stacked white keep with layered eaves | white infill, dark timber/tile |
| Korean | KR | long low hall + broad curved hanok roof | white plaster, exposed timber, black tile |

Lisbon is the reference correction frame: an Iberian town cluster sits on the Tagus-side land, while the ship occupies the water basin northwest of it.

## Character motion

- Player characters remain full-body illustrated cutouts at four-head-tall-or-more proportions.
- Movement speed is 10 world units/second, replacing 4.6 (2.17×).
- Walking begins only after actual position change. The cycle combines alternating lower-body stride, foot lift, body bob, and a restrained lean; stopping returns to the unsplit standing pose.
- Keyboard and right-click movement share the same controller and therefore the same speed/motion rules.
- NPCs remain stationary and use only a subtle idle breath. `prefers-reduced-motion: reduce` removes bob, lean, stride, and idle breathing without hiding state or controls.

## Interface

- Dialogue, inventory, map, ship information, shipyard, skills, titles, compendium, market-family, and quest panels each expose a persistent top-right 32×32 close button.
- The button uses `×`, a circular border, an accessible Korean label, hover/pressed feedback, and mouse click handling. Existing keyboard shortcuts and Escape remain valid.
- First visual focus stays on the active game subject; panels use the existing dark nautical surface and brass outline.

## Motion and transition specification

| Verb/state | Input feedback | Result feedback | Transition |
| --- | --- | --- | --- |
| Walk | first displacement starts stride and lean | continuous alternating feet at distance-driven phase | pose blends back to standing after movement stops |
| Open panel | keyboard shortcut or existing action opens centred panel | close button becomes immediately visible at fixed top-right | existing direct show/hide; no camera movement |
| Close panel | pointer hover and press scale the close control | panel disappears and gameplay canvas resumes | immediate hide to preserve control rhythm |
| Approach port | docking basin halo appears near range | dotted relation line connects basin to settlement | no full-screen transition until city entry |

No transient combat text is added by this revision. Existing combat text retains its established dark-core/light-outline treatment and evidence frames.

## Signature moments

### Sea: Lisbon is a city, not a beacon

Player action: steer into the Tagus docking basin. Immediate goal: dock at Lisbon. Pressure: read coastline and interaction range. First focus: the ship in the water basin; second focus: the Iberian settlement on land.

Focus protection: `x 28%–78%, y 23%–88%`. Intentional text overlap: no.

| Beat | Who/what moves | Duration | Camera/transition |
| --- | --- | --- | --- |
| 1 | ship enters the visible basin halo | continuous | camera follows ship |
| 2 | dotted city-to-dock relation becomes readable | immediate | no cut |
| 3 | settlement and “리스본” label resolve on land | immediate | no cut |

### City: player crosses the Lisbon plaza

Player action: hold W or use right-click movement. Immediate goal: reach an NPC. First focus: the illustrated player; second focus: role-labelled NPCs and Iberian façades.

Focus protection: `x 32%–68%, y 24%–78%`. Intentional text overlap: no.

| Beat | Who/what moves | Duration | Camera/transition |
| --- | --- | --- | --- |
| 1 | input produces first displacement | ≤1 frame | camera begins smooth follow |
| 2 | legs alternate and body bobs | distance-driven loop | no cut |
| 3 | input release restores standing pose | ≤120 ms visual settle | camera follow completes |

### Panel: mouse-visible exit

Player action: open inventory or map, then point at `×`. Immediate goal: return to play without knowing a shortcut. First focus: panel content; secondary fixed exit: top-right close button.

Focus protection: `x 30%–70%, y 18%–84%`. Intentional text overlap: no.

| Beat | Who/what moves | Duration | Camera/transition |
| --- | --- | --- | --- |
| 1 | panel appears | immediate | gameplay pauses under overlay |
| 2 | close button grows on hover | 140 ms | no camera motion |
| 3 | click hides panel | immediate | gameplay resumes |

## Sound and voice

Existing ocean, harbor, combat, and UI audio remain unchanged. This visual/navigation revision introduces no new voice line, TTS, dynamic media, or external runtime service. Voice strategy: `none`.

## Asset and fallback ledger

- Release-gated: none newly generated; city settlements are high-resolution vector geometry rendered through the existing visual-key-by-country mapping.
- Degradable: the 12 existing character WebP files. If an image has not decoded, the procedural full-body fallback uses the same movement-gated alternating stride.
- Dynamic media: none.

