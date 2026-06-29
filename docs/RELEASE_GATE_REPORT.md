# Release Gate Report

Final release decision record for Praesidium v1.0.0.

## Build Gate

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run verify` | Pass | Local run on 2026-06-29: selftest 161 passed, save/restore 36 passed, performance check 8 passed, release audit 158 passed, production build passed. |
| `npm run release:gate` | Pass | Ready checks: 8/8. Repository blockers: none detected by release gate. |
| `npm audit` | Pass | `found 0 vulnerabilities`. |
| Production build opens | Pass | Local preview served HTML, `assets/index-BGMzoBI5.js`, manifest, and `sw.js` with HTTP 200 after the final command-deck/menu-route build. |
| Browser smoke test | Pass | Desktop and mobile landscape screenshots verified the redesigned command-deck main menu; desktop route-board smoke verified level select. Gameplay smoke covered tower placement and wave start with no browser console errors. |

## Deploy Gate

| Check | Result | Evidence |
| --- | --- | --- |
| Latest GitHub Actions run | Pass | `Deploy to GitHub Pages` passed before final hardening; re-confirm the new pushed commit in Actions before promotion. |
| GitHub Pages latest build | Pass | The prior Pages deploy returned 200; re-smoke the post-hardening deploy after GitHub Actions publishes it. |
| Hard refresh smoke test | Pass | Final local build no longer depends on Google Fonts, registers a versioned service worker, and serves the main script with HTTP 200. |

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
