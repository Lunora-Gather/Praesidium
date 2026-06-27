# Onboarding QA

This checklist validates the first-time player flow.

## Goal

A new player should understand the core loop without outside explanation:

1. Choose the first tower.
2. Place it on a buildable tile.
3. Start the first wave.
4. Inspect a placed tower.
5. Upgrade before pressure grows.
6. Try a support ability.
7. Open Intel for enemy counters.
8. Understand that talents improve later runs.

## Test setup

Use a fresh browser profile or clear localStorage so tutorial progress resets.

Recommended viewports:

| Viewport | Purpose |
| --- | --- |
| 1280 x 720 | Standard desktop first run |
| 900 x 600 | Small desktop window |
| 780 x 390 | Mobile landscape |
| 640 x 360 | Small mobile landscape |

## Pass criteria

| Moment | Target |
| --- | --- |
| First tower placed | Under 45 seconds |
| First wave sent | Under 75 seconds |
| First tower inspected | Under 120 seconds |
| First upgrade understood | Before or during wave 2 |
| First support ability found | Within first 2 levels |
| Intel Codex discovered | Before the first heavy threat |
| Recovery after loss | Player can name one thing to change next run |

## Manual checks

- [ ] First tutorial hint appears when entering gameplay.
- [ ] Tutorial advances after placing a tower.
- [ ] Tutorial advances after sending a wave.
- [ ] Tutorial prompts tower inspection and upgrade.
- [ ] Tutorial introduces support abilities.
- [ ] Tutorial introduces Intel Codex.
- [ ] Hints do not cover the Send Wave button.
- [ ] Hints do not cover the bottom tower shop.
- [ ] Hints remain readable on mobile landscape.
- [ ] Replaying after tutorial completion does not repeat completed hints.

## Commercial standard

Do not call the first-run flow commercial-grade until most outside testers can place a tower, send the first wave, and describe one improvement after a failed run without verbal help.
