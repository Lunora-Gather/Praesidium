# Product Iteration Log

This file tracks upgrades that improve Praesidium beyond basic release readiness.

## Current focus

The current phase is about player retention, replay motivation, and measurable feedback.

## Completed systems

### Onboarding

- Expanded first-run tutorial flow.
- Added onboarding QA criteria.
- Added checkpoints for tower choice, placement, wave start, tower inspection, upgrade, support abilities, Intel, and talents.

### Retention

- Added deterministic daily mission generation.
- Added daily mission progress evaluation.
- Added selftests so the daily mission system is covered by `npm run verify`.

### Product diagnostics

- Added product health diagnostics from local analytics.
- Product health can flag risks such as weak return signal, short sessions, low win rate, high win rate, early churn, low tower usage, and dominant tower usage.
- Added selftests for product health risk generation.

## Next integration targets

1. Surface daily missions on the main menu.
2. Show daily mission progress after win or loss.
3. Display product health diagnostics inside Stats or a QA-only panel.
4. Connect RunAdvice to the defeat screen with specific retry advice.
5. Add a weekly challenge rule set after daily missions are visible.

## Progress estimate

- Free public release: about 99.9%.
- Strong product target: about 76%.

The remaining gap is mostly gameplay depth, visible retention loops, more content, stronger boss mechanics, public-facing media, and outside playtest iteration.
