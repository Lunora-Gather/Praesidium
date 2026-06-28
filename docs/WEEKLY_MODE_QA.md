# Weekly Mode QA

This checklist verifies that weekly mode is visible, understandable, and active only where intended.

## Entry points

- Main menu shows the active weekly mode in the ops brief on larger screens.
- Random Endless starts without weekly mode active.
- Daily run starts with weekly mode active.
- Seeded challenge starts with weekly mode active.
- Normal campaign remains unaffected.

## In-run badge

During an active weekly seeded run, confirm that the badge appears near the top-left play area.

The badge should show:

- `WEEKLY MODE`
- current weekly mode title
- a short rule summary such as enemy speed, start gold, max towers, boss HP, repair disabled, or enemy count

## Rule checks

| Weekly mode | Expected check |
| --- | --- |
| Fast Lane | Enemies move faster than normal Endless. |
| Tight Budget | Starting gold is lower than normal. |
| Compact Defense | Tower placement stops at the weekly tower limit. |
| Boss Week | Boss waves feel more durable. |
| No Repair | Repair cannot be cast. |
| Dense Waves | Preview and spawned counts are higher. |

## Viewport checks

- 1280 x 720: badge visible and not overlapping the boss banner.
- 1024 x 768: badge visible and readable.
- 780 x 390: badge may hide if space is too tight.
- Portrait phone: orientation hint takes priority.

## Pass criteria

- Weekly mode is visible before a seeded run starts.
- Weekly rule is visible during a seeded run.
- Normal campaign does not show weekly mode.
- Random Endless does not show weekly mode.
- Seeded runs keep weekly state after mid-run save restore.
