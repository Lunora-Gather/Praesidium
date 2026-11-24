# Weekly Mode QA

This checklist verifies that weekly mode is visible, understandable, and active only where intended.

## Entry points

- Main menu shows the active weekly mode in the ops brief on larger screens.
- Random Endless starts without weekly mode active.
- Daily run starts with weekly mode active.
- The official Weekly Challenge starts with a fixed seed and standard loadout. The current period can grant the weekly reward once after clearing wave 8.
- Pasted codes launch personal practice. P2 keeps the original loadout, wave and scoring versions; P1 is compatible practice and has no recorded game-rules version. A raw seed has no weekly modifier.
- An official run started before the boundary can finish under its old period; restarting an expired period starts practice. Practice cannot write official boards or claim daily/weekly rewards.
- The daily reset is UTC midnight. All daily runs start on Normal with the standard talent loadout.
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
- Portrait phone: the battlefield remains playable, with room reserved for touch controls.

## Pass criteria

- Weekly mode is visible before a seeded run starts.
- Weekly rule is visible during a seeded run.
- Normal campaign does not show weekly mode.
- Random Endless does not show weekly mode.
- Seeded runs keep weekly state after mid-run save restore.
- Check that pasted full challenge codes keep the original difficulty, weekly period, opening wave configuration, and talent ranks after retry and reload.
- Check that different seeds can vary the first twelve waves and previews match the spawned groups.
