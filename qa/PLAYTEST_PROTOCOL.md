# Human Playtest Protocol — Smooth Rendering

## Sample

Use at least five desktop players familiar with browser games; assign anonymous IDs only. No personal data is needed. Include at least two players using 1280×720-class displays.

## Fixed environment

- Fresh Chrome profile or private window, normal game speed, Korean UI.
- Test both 1440×900 and 1280×720 where available.
- Start from the real title screen. Do not explain controls beyond: “Play until you have sailed and entered a city; say what you notice.”

## Observation record

For each player, save `qa/evidence/playtest/<anonymous-id>.md` containing:

- Time to first meaningful movement and first city entry.
- Whether the ship, harbor beacon, player, and NPCs look smooth or broken/pixelated at 100% browser zoom.
- The same judgment after one in-game zoom-in and zoom-out.
- Any HUD overlap, clipped Korean label, or hard-to-click control.
- The player's verbatim answer after two minutes: who they are, what they are trying to do, and where they would act next.
- The most polished-looking and most artificial-looking element, in their own words.

## Scales and thresholds

- “Characters and ships look like intact illustrations rather than enlarged dots,” 1–5; median must be at least 4.
- “I can distinguish the player and NPC roles,” 1–5; median must be at least 4.
- At least 80% must report no broken/pixelated alpha edge at either tested viewport.
- At least 80% must enter a city without observer instruction.
- Any repeated rendering complaint from two or more players routes back to build; failure to understand the sailing/trading goal routes to game design.
