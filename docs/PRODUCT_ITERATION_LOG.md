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
- Added daily mission progress feedback on wide end screens after win or loss.

### Product diagnostics

- Added product health diagnostics from local analytics.
- Product health can flag risks such as weak return signal, short sessions, low win rate, high win rate, early churn, low tower usage, and dominant tower usage.
- Added selftests for product health risk generation.

## Next integration targets

1. Display product health diagnostics inside Stats or a QA-only panel.
2. Connect RunAdvice to the defeat screen with specific retry advice.
3. Add a weekly challenge rule set after daily missions are visible.
4. Expand boss mechanics and campaign content depth.
5. Add screenshots or GIFs after the next stable deploy.

## Progress estimate

- Free public release: about 99.9%.
- Strong product target: about 79%.

The remaining gap is mostly gameplay depth, visible diagnostic feedback, more content, stronger boss mechanics, public-facing media, and outside playtest iteration.
