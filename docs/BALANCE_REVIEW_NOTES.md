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
- `Late Campaign Review` for levels 9 and 10
- late-campaign tower distribution
- late-campaign red flags if level 9 or 10 collapses too early
- `Actionable Tuning Notes` for next balance changes

## Simulation summary template

| Area | Result | Notes |
| --- | --- | --- |
| Normal win-rate | TBD | Should not reveal early blockers. |
| Hard win-rate | TBD | Should be challenging but not impossible. |
| Brutal win-rate | TBD | Can be punishing. |
| Level 9 result | TBD | Watch speed-pressure leaks. |
| Level 10 result | TBD | Watch final-gate boss pressure. |
| Tower distribution | TBD | Confirm multiple tower types appear. |
| Late-campaign tower distribution | TBD | Confirm multiple tower types appear on levels 9 and 10. |
| Actionable tuning notes | TBD | Convert sim flags into concrete map or wave changes. |

## Red flags

- Any normal-mode level collapses before completing wave 1.
- Level 9 collapses before meaningful speed-pressure learning.
- Level 10 collapses before final-gate strategy emerges.
- Level 9 requires only one specific tower opening.
- Level 10 becomes only a high-HP grind without strategy changes.
- Frost or Sniper becomes mandatory in every late map.
- Repair becomes mandatory instead of optional recovery.

## Follow-up actions

1. Record simulation results after the next successful verify run.
2. Copy the `Actionable Tuning Notes` section into this file.
3. Review Product Health risks after outside playtests.
4. Tune level 9 path pressure before adding optional level 11.
5. Tune level 10 boss pressure before adding a final boss pattern.
