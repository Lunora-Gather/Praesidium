# Final Release Process

This document defines the final process before promoting Praesidium beyond a release-candidate build.

## Release commands

Run these in order:

```bash
npm run verify
npm run release:gate
npm run balance:sim
```

`npm run verify` checks type safety, selftests, save restore, balance simulation, release audit, and production build.

`npm run release:gate` summarizes what is ready inside the repository and what still needs external confirmation.

`npm run balance:sim` should be copied into `docs/BALANCE_REVIEW_NOTES.md` after a meaningful run.

## Final order

1. Confirm the latest GitHub Actions deploy is green.
2. Open the deployed GitHub Pages build.
3. Hard refresh and check the main menu.
4. Run or confirm `npm run verify`.
5. Run or confirm `npm run release:gate`.
6. Run or confirm `npm run balance:sim`.
7. Record balance results in `docs/BALANCE_REVIEW_NOTES.md`.
8. Capture screenshots and GIFs from `docs/CAPTURE_RUNBOOK.md`.
9. Add media under `docs/media/` and update README media section.
10. Run outside playtests using `docs/PLAYTEST_PLAN.md`.
11. Fill `docs/PLAYTEST_RESULTS_SUMMARY.md`.
12. Fill the final decision section in `docs/QA_RESULTS_TEMPLATE.md`.
13. Publish release notes and promote the Pages URL.

## Gate definitions

| Gate | Pass condition |
| --- | --- |
| Build gate | `npm run verify` passes. |
| Deploy gate | GitHub Actions is green and Pages shows the latest build. |
| Balance gate | `npm run balance:sim` has no Normal-mode early blockers and has a recorded late-campaign review. |
| Media gate | Hero, gameplay, boss/weekly, and mobile captures exist. |
| QA gate | Final release QA is filled with pass/fail notes. |
| Playtest gate | Outside playtest summary exists and no S0/S1 issue remains. |
| Promotion gate | README and portal material use current 10-level campaign copy. |

## Release decision

Use this decision rule:

- If build or deploy gate fails: do not publish.
- If balance gate fails: tune levels 9 and 10 before promotion.
- If media gate fails: public portfolio release is still possible, but market-grade promotion should wait.
- If playtest gate fails: do not call it market-ready.
- If all gates pass: promote as public/market-grade free web release.

## Current final blockers

The repository contains most process assets. The remaining work is mostly execution:

- confirm the latest Actions run
- run/record verification output
- run/record balance output
- capture public-facing media
- run outside playtests
- make final release decision
