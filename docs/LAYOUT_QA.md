# Layout QA Checklist

Use this checklist after UI layout changes. The goal is to keep Praesidium visually consistent across desktop, narrow desktop, tablet, and mobile landscape.

## Viewports to test

| Viewport | Purpose |
| --- | --- |
| 1280 × 720 | Standard desktop / wide browser |
| 1024 × 768 | Small desktop / tablet |
| 900 × 600 | Narrow desktop window |
| 780 × 390 | Large phone landscape |
| 640 × 360 | Small phone landscape |
| Portrait phone | Orientation hint check |

## Global layout rules

- [ ] Important buttons stay inside the visible safe area.
- [ ] HUD top buttons do not overlap gold/lives/wave/score.
- [ ] Bottom tower shop is visually centered.
- [ ] Touch targets remain large enough on phone landscape.
- [ ] Main panels have consistent rounded corners and spacing.
- [ ] Text does not collide with icons, badges, or action buttons.
- [ ] Visual hierarchy is clear: primary action, secondary action, metadata.

## HUD

- [ ] Gold, lives, wave, and score remain readable.
- [ ] Send Wave is always visible.
- [ ] Pause, speed, menu, and auto do not crowd each other.
- [ ] Tower cards are centered across the bottom bar.
- [ ] Selected tower card is visually obvious.
- [ ] Unaffordable tower cards are dim but still understandable.

## Level select

- [ ] Progress panel fits above the grid.
- [ ] Difficulty picker fits and selected state is obvious.
- [ ] Level cards stay inside the visible area.
- [ ] Recommended next level badge does not overlap the title.
- [ ] Stars, score, and action text are readable.
- [ ] Back/Menu button remains visible.

## Main menu and end screens

- [ ] Main menu buttons fit in compact mode.
- [ ] Victory report does not push buttons off-screen.
- [ ] Defeat report fits with seed copy button.
- [ ] Badges do not overflow on small screens.

## Commercial polish standard

A layout change is acceptable only if it improves consistency without hiding any core flow. Do not accept a layout that looks cleaner on desktop but makes mobile placement, spell use, or end-screen actions harder to use.
