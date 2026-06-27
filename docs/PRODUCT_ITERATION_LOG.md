# Product Iteration Log

This file tracks upgrades that improve Praesidium beyond basic release readiness.

## Current focus

The current phase is about player retention, replay motivation, measurable feedback, and content depth.

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
- Added weekly mode metadata for longer-term replay goals.
- Main-menu daily objectives now also surface the active weekly mode on larger screens.
- Weekly mode now has seeded-run rule modifiers and an in-run badge.
- Added Weekly Mode QA coverage for entry points, rule visibility, and viewport checks.

### Product diagnostics

- Added product health diagnostics from local analytics.
- Product health can flag risks such as weak return signal, short sessions, low win rate, high win rate, early churn, low tower usage, and dominant tower usage.
- Added selftests for product health risk generation.
- Added a visible Health tab inside the Stats screen with retention score, balance score, and risk list.

### Failure recovery

- Added context-aware defeat advice from run summaries.
- Defeat screens can now show a concrete next-run suggestion instead of only generic recovery text.

### Content depth

- Added `docs/CONTENT_EXPANSION_PLAN.md` with boss patterns, campaign expansion sequence, weekly mode integration targets, and acceptance criteria.
- Diversified boss encounters so boss waves rotate between fast escort, armored escort, and phantom/siege escort compositions.
- Added selftest and release-audit coverage for boss encounter variety.
- Added a boss encounter classifier so the game can label boss pressure types consistently.
- HUD next-wave preview now labels boss pressure as FAST ESCORT, ARMORED ESCORT, or PHANTOM SIEGE with encounter-specific advice.
- Active boss warning banners now use the same boss encounter labels and advice while the fight is happening.
- Added selftest coverage for the boss encounter classifier.
- Expanded the campaign from 6 levels to 8 levels with Relay Array and Blackout Ridge.
- Expanded the campaign again to 10 levels with Overdrive Gate and Apex Bastion.
- Added dedicated visual themes for the expanded campaign levels.
- Added selftest, release-audit, Campaign Expansion QA, and balance-review-note coverage for the 10-level campaign.
- Upgraded balance simulation with a Late Campaign Review for levels 9 and 10, including late-campaign tower distribution and red-flag output.

## Next integration targets

1. Run and record balance simulation results for the 10-level campaign.
2. Use the Late Campaign Review to tune Overdrive Gate and Apex Bastion.
3. Add screenshots or GIFs after the next stable deploy.
4. Run outside playtests and tune from the Health tab risks.
5. Add final boss pattern work after level 10 is validated.

## Progress estimate

- Free public release: about 99.9%.
- Strong product target: about 94.5%.

The remaining gap is mostly actual balance verification, public-facing media, outside playtest iteration, and optional late-game challenge content.
