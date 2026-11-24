# Balance Review Notes

Use this document after running `npm run balance:sim` or after outside playtests. It is intentionally short so each content batch can be reviewed quickly.

## Current campaign scope

- Campaign levels: 10
- Newest maps: Overdrive Gate and Apex Bastion
- Required command: `npm run balance:sim`

## Automated report sections

`npm run balance:sim` now prints:

- overall Normal / Hard / Brutal win-rate
- best result by level and difficulty
- total tower placement distribution
- `New-player Pressure Probe` for early campaign readability
- `Limited Defense Probe` and `Lean Defense Probe` for runs without spells and fewer builds and upgrades
- `Seeded Endless Endurance` for three 30-minute simulations
- `Late Campaign Review` for levels 9 and 10
- late-campaign tower distribution
- late-campaign red flags if level 9 or 10 collapses too early
- `Actionable Tuning Notes` for next balance changes

## Current simulation summary

| Area | Result | Notes |
| --- | --- | --- |
| Expert strategies | 30/30 Normal, 30/30 Hard, 28/30 Brutal | At least one of three strategies wins each level at every difficulty. |
| Limited campaign | 10/10 Normal, 10/10 Hard, 9/10 Brutal | Up to eight towers and twelve upgrades, with no spells. |
| Lean campaign | 10/10 Normal, 10/10 Hard, 4/10 Brutal | Up to four towers and six upgrades, with no spells. Average lives remaining were 20.0, 18.7, and 8.0. |
| Combo gold | 58% maximum in expert runs | Measured against total base kill gold over a run. The per-kill cap is 60%. |
| Seeded Endless | Three seeds reached wave 26 at 30 minutes | All three were still active with 15–18 lives. |
| New-player probe | Pass | Levels 1-3 Normal reached meaningful play and completed with a slower limited profile. |
| Level 9 result | Pass | Normal automation clears with 3 stars. |
| Level 10 result | Pass | Normal automation clears with 3 stars. |
| Tower distribution | Pass | Multiple tower types appear in automated clears. |
| Late-campaign tower distribution | Pass | Late campaign does not require a single mandatory tower opening in automation. |
| Actionable tuning notes | None | Do not tune further from automation alone; wait for outside playtest friction data. |

## Red flags

- Any normal-mode level collapses before completing wave 1.
- Level 9 collapses before meaningful speed-pressure learning.
- Level 10 collapses before final-gate strategy emerges.
- Level 9 requires only one specific tower opening.
- Level 10 becomes only a high-HP grind without strategy changes.
- Frost or Sniper becomes mandatory in every late map.
- Repair becomes mandatory instead of optional recovery.

## Follow-up actions

1. Review Product Health risks after outside playtests.
2. Tune level 9 path pressure only if human playtests show late-campaign leaks are unclear or unfair.
3. Tune level 10 boss pressure only if human playtests show the final map is a grind rather than a strategy check.
4. Avoid adding optional level 11 until the first outside playtest batch is reviewed.
