# Human Playtest Protocol — City Navigation & Coastal Settlements

## Sample

Use at least five desktop players familiar with browser games; assign anonymous IDs only. No personal data is needed. Include at least two players using 1280×720-class displays.

## Fixed environment

- Fresh Chrome profile or private window, normal game speed, Korean UI.
- Test both 1440×900 and 1280×720 where available.
- Start from the real title screen. Do not explain controls beyond: “Play until you have sailed, entered a city, moved around, and closed two windows with the mouse; say what you notice.”

## Observation record

For each player, save `qa/evidence/playtest/<anonymous-id>.md` containing:

- Time to first meaningful ship movement and first city entry.
- Whether Lisbon and two other ports read as settlements on land, with the dock remaining in water.
- Whether the player notices a walking motion while moving in a city and whether the new speed feels controllable.
- Whether the player can distinguish the user character from NPCs without prompting.
- Whether the player finds and uses the visible close button on two different UI panels.
- Any HUD overlap, clipped Korean label, hard-to-click control, or city marker that resembles a buoy/lighthouse.
- The player's verbatim answer after two minutes: who they are, what they are trying to do, and where they would act next.

## Scales and thresholds

- “Port markers look like cities on land, not objects floating at sea,” 1–5; median must be at least 4.
- “The city movement feels responsive without being hard to control,” 1–5; median must be at least 4.
- At least 80% must notice that the player walks while moving.
- At least 80% must close both sampled panels with the mouse without observer instruction.
- Any repeated placement or readability complaint from two or more players routes back to art/build; failure to understand the sailing/trading goal routes to game design.
