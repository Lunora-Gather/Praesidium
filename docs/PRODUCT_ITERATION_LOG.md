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
- Added a main-menu daily objectives panel so the retention loop is visible before starting a run.

### Product diagnostics

- Added product health diagnostics from local analytics.
- Product health can flag risks such as weak return signal, short sessions, low win rate, high win rate, early churn, low tower usage, and dominant tower usage.
- Added selftests for product health risk generation.

## Next integration targets

1. Show daily mission progress after win or loss.
2. Display product health diagnostics inside Stats or a QA-only panel.
3. Connect RunAdvice to the defeat screen with specific retry advice.
4. Add a weekly challenge rule set after daily missions are visible.
5. Expand boss mechanics and campaign content depth.

## Progress estimate

- Free public release: about 99.9%.
- Strong product target: about 78%.

The remaining gap is mostly post-run mission progress, gameplay depth, visible diagnostic feedback, more content, stronger boss mechanics, public-facing media, and outside playtest iteration.
