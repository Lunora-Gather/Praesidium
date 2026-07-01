# Release Gate Report

Final release decision record for Praesidium v1.0.0.

## Build Gate

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run verify` | Pass | Local run on 2026-07-01 passed: typecheck, selftest, save/restore, balance simulation, performance stress, release audit, and production build. |
| `npm run release:gate` | Pass | Ready checks: 8/8. Repository blockers: none detected by release gate. External confirmations remain listed separately. |
| `npm audit` | Pass | `found 0 vulnerabilities`. |
| Production build opens | Pass | Local preview served HTML, `assets/index-COisGhIr.js`, manifest, and `sw.js` with HTTP 200 after the final playtest-export/media build. |
| Browser smoke test | Pass | Desktop, tutorial, and mobile landscape Playwright smoke passed with no browser console errors. Stats > Health exported a schema-1 `Praesidium` playtest report JSON. |

## Deploy Gate

| Check | Result | Evidence |
| --- | --- | --- |
| Latest GitHub Actions run | Pass | `Deploy to GitHub Pages` run `28502999503` passed on commit `8f19c90`. |
| GitHub Pages latest build | Pass | `pages-build-deployment` run `28503033941` passed; live HTML returned HTTP 200 and references `assets/index-COisGhIr.js`. |
| Hard refresh smoke test | Pass | Final local and hosted builds no longer depend on Google Fonts, register a versioned service worker, and serve the main script with HTTP 200. |

## Balance Gate

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run balance:sim` | Pass | Normal, Hard, and Brutal win-rate: 100%; average stars: 3.00. |
| Normal-mode blockers | Pass | No normal-mode blockers detected by the simple bot. |
| New-player pressure probe | Pass | Levels 1-3 Normal reached meaningful play and completed with the newcomer bot profile. |
| Late Campaign Review | Pass | Levels 9 and 10 passed normal-mode automation with 3 stars. |
| Actionable Tuning Notes | Pass | No automated tuning action required; compare against outside playtests after release. |

## Media Gate

| Asset | Status | Path |
| --- | --- | --- |
| Hero screenshot | Captured | `docs/media/praesidium-hero-menu.png` |
| Campaign route screenshot | Captured | `docs/media/praesidium-campaign-route.png` |
| Combat screenshot | Captured | `docs/media/praesidium-combat.png` |
| Weekly screenshot | Captured | `docs/media/praesidium-weekly-mode.png` |
| Mobile screenshot | Captured | `docs/media/praesidium-mobile-landscape.png` |
| Gameplay GIF | Deferred | `docs/media/praesidium-gameplay-loop.gif` |

Static media assets are now captured and embedded in README. GIF/video capture is still deferred before broader market-grade promotion.

## Playtest Gate

| Check | Result | Notes |
| --- | --- | --- |
| Outside players tested | Deferred | Use `docs/PLAYTEST_PLAN.md` and issue templates for the first post-1.0 batch. |
| First tower placed under 45 seconds | Deferred | Record in the first outside playtest summary. |
| First wave sent under 75 seconds | Deferred | Record in the first outside playtest summary. |
| Level 1 completion path understood | Deferred | Record in the first outside playtest summary. |
| No S0/S1 issue remains | Conditional pass | Repository automation found no blocker; outside playtest still required for market-grade promotion. |

## Final Decision

- [ ] Hold release
- [x] Public free-game release
- [ ] Market-grade promotion

Decision notes:

```text
Praesidium v1.0.0 is acceptable as the public free-game web release.

Repository gates are green: local verify, release gate, npm audit, GitHub Actions deploy, and GitHub Pages smoke check all passed for commit `8f19c90`. Static media capture is complete; outside playtests and GIF/video capture remain required before calling the build market-grade.
```
