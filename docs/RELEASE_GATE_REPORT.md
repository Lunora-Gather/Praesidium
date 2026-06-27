# Release Gate Report

Use this file for the final release-candidate decision.

## Build gate

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run verify` | TBD | Paste command result or Actions link. |
| `npm run release:gate` | TBD | Paste command result. |
| Production build opens | TBD | Browser / Pages confirmation. |

## Deploy gate

| Check | Result | Evidence |
| --- | --- | --- |
| Latest GitHub Actions run | TBD | Link or run title. |
| GitHub Pages latest build | TBD | Confirm URL and date. |
| Hard refresh smoke test | TBD | Pass/fail note. |

## Balance gate

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run balance:sim` | TBD | Paste summary. |
| Normal-mode blockers | TBD | None / list. |
| Late Campaign Review | TBD | Level 9 and 10 summary. |
| Actionable Tuning Notes | TBD | Copy notes or mark none. |

## Media gate

| Asset | Status | Path |
| --- | --- | --- |
| Hero screenshot | TBD | `docs/media/praesidium-hero-menu.png` |
| Campaign screenshot | TBD | `docs/media/praesidium-campaign-select.png` |
| Combat screenshot | TBD | `docs/media/praesidium-combat.png` |
| Boss or weekly screenshot | TBD | `docs/media/praesidium-boss-warning.png` / `docs/media/praesidium-weekly-mode.png` |
| Mobile screenshot | TBD | `docs/media/praesidium-mobile-landscape.png` |
| Gameplay GIF | TBD | `docs/media/praesidium-gameplay-loop.gif` |

## Playtest gate

| Check | Result | Notes |
| --- | --- | --- |
| Outside players tested | TBD | Count and profile. |
| First tower placed under 45 seconds | TBD | Pass/fail. |
| First wave sent under 75 seconds | TBD | Pass/fail. |
| Level 1 completion path understood | TBD | Pass/fail. |
| No S0/S1 issue remains | TBD | Pass/fail. |

## Final decision

Choose one:

- [ ] Hold release
- [ ] Public free-game release
- [ ] Market-grade promotion

Decision notes:

```text
TBD
```
