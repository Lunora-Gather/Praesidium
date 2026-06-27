# Release Gate Report

Final release decision record for Praesidium v1.0.0.

## Build Gate

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run verify` | Pass | Local run on 2026-06-27: selftest 161 passed, save/restore 36 passed, release audit 138 passed, production build passed. |
| `npm run release:gate` | Pass | Ready checks: 8/8. Repository blockers: none detected by release gate. |
| `npm audit` | Pass | `found 0 vulnerabilities`. |
| Production build opens | Pass | GitHub Pages serves HTML and `assets/index-CSndVqly.js` with HTTP 200. |

## Deploy Gate

| Check | Result | Evidence |
| --- | --- | --- |
| Latest GitHub Actions run | Pass | `Deploy to GitHub Pages` run 28284572407 passed for commit `d0a4d2f`. |
| GitHub Pages latest build | Pass | `https://lunora-gather.github.io/Praesidium/?v=d0a4d2f` returned 200 after deploy. |
| Hard refresh smoke test | Pass | Page HTML no longer depends on Google Fonts; main script returned 200. |

## Balance Gate

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run balance:sim` | Pass | Normal, Hard, and Brutal win-rate: 100%; average stars: 3.00. |
| Normal-mode blockers | Pass | No normal-mode blockers detected by the simple bot. |
| Late Campaign Review | Pass | Levels 9 and 10 passed normal-mode automation with 3 stars. |
| Actionable Tuning Notes | Pass | No automated tuning action required; compare against outside playtests after release. |

## Media Gate

| Asset | Status | Path |
| --- | --- | --- |
| Hero screenshot | Deferred | `docs/media/praesidium-hero-menu.png` |
| Campaign screenshot | Deferred | `docs/media/praesidium-campaign-select.png` |
| Combat screenshot | Deferred | `docs/media/praesidium-combat.png` |
| Boss or weekly screenshot | Deferred | `docs/media/praesidium-boss-warning.png` / `docs/media/praesidium-weekly-mode.png` |
| Mobile screenshot | Deferred | `docs/media/praesidium-mobile-landscape.png` |
| Gameplay GIF | Deferred | `docs/media/praesidium-gameplay-loop.gif` |

Media assets are not required to keep the web build playable, but should be captured before broader promotion.

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

Repository gates are green: local verify, release gate, npm audit, GitHub Actions deploy, and GitHub Pages smoke check all passed. Media capture and outside playtests are deferred to the post-1.0 promotion track and remain required before calling the build market-grade.
```
