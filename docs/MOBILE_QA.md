# Mobile QA Checklist

Praesidium is playable on desktop first, but public release should still pass a basic mobile landscape check.

## Recommended test sizes

| Device class | Example viewport |
| --- | --- |
| Small phone landscape | 640 × 360 |
| Large phone landscape | 780 × 390 |
| Small tablet | 1024 × 768 |
| Desktop narrow window | 900 × 600 |

## Critical flows

### Main menu

- [ ] Title and subtitle remain visible.
- [ ] Campaign / Endless / Daily / Challenge buttons fit.
- [ ] Settings and Stats buttons are tappable.
- [ ] Shortcut hint does not overlap primary actions.

### Level select

- [ ] Progress bar and difficulty buttons fit.
- [ ] Level cards remain readable in two-column mobile layout.
- [ ] Locked and recommended-level states are clear.
- [ ] Back/Menu button remains tappable.

### Battle HUD

- [ ] Gold, lives, wave, and score remain readable.
- [ ] Send Wave, Pause, Speed, Auto, and Menu buttons remain tappable.
- [ ] Tower shop cards do not overlap spell buttons.
- [ ] Spell buttons are large enough and show cooldown/ready state.

### Tower drawer interaction

- [ ] Selecting a placed tower opens the bottom drawer on phone-sized screens.
- [ ] Upgrade and Sell buttons are large enough to tap.
- [ ] Bottom drawer does not cover the entire battlefield.
- [ ] Tapping outside still allows returning to placement/inspection flow.

### Placement flow

- [ ] Selected tower hint remains visible above the shop.
- [ ] Cancel Placement button is easy to tap.
- [ ] Invalid placement feedback is visible.
- [ ] Map can still be read while placing towers.

### End screens

- [ ] Victory screen fits, including stars, report, and next action.
- [ ] Defeat screen fits, including report and retry/menu actions.
- [ ] Seed copy button remains visible in challenge/endless defeats.
- [ ] Record badges do not overflow.

## Current mobile polish status

- Mobile Tower drawer: implemented.
- Compact main menu: implemented.
- Compact victory/defeat screens: implemented.
- Remaining risk: HUD density on very small landscape screens.
