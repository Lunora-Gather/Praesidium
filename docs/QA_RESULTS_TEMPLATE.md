# QA Results Template

Use this file as a copyable template for the final release-candidate QA run.

## Build under test

- Date:
- Commit SHA:
- GitHub Actions run:
- GitHub Pages URL: https://lunora-gather.github.io/Praesidium/
- Tester:

## Automated verification

| Check | Result | Notes |
| --- | --- | --- |
| `npm run verify` | Pass / Fail / Not run | |
| TypeScript typecheck | Pass / Fail / Not run | |
| Runtime selftest | Pass / Fail / Not run | |
| Save/restore regression | Pass / Fail / Not run | |
| Balance simulation | Pass / Fail / Not run | |
| Release audit | Pass / Fail / Not run | |
| Production build | Pass / Fail / Not run | |

## Browser smoke test

| Flow | Result | Notes |
| --- | --- | --- |
| Main menu loads | Pass / Fail | |
| Campaign level select opens | Pass / Fail | |
| Level 1 starts | Pass / Fail | |
| Tower can be placed | Pass / Fail | |
| Wave can be sent | Pass / Fail | |
| Tower can be selected | Pass / Fail | |
| Tower can be upgraded | Pass / Fail | |
| Tower can be sold | Pass / Fail | |
| Spell can be selected and used | Pass / Fail | |
| Pause/menu flow works | Pass / Fail | |
| Victory/defeat screen actions work | Pass / Fail | |
| Settings open and language switches | Pass / Fail | |
| Stats screen opens | Pass / Fail | |
| Intel Codex opens | Pass / Fail | |

## Mobile smoke test

| Viewport / device | Result | Notes |
| --- | --- | --- |
| 640 × 360 landscape | Pass / Fail / Not run | |
| 780 × 390 landscape | Pass / Fail / Not run | |
| Portrait orientation hint | Pass / Fail / Not run | |
| Tower drawer on phone-sized screen | Pass / Fail / Not run | |
| End screen fits on small screen | Pass / Fail / Not run | |
| Spell buttons tappable | Pass / Fail / Not run | |

## Balance result notes

- Normal-mode blocker found: yes / no
- Hard-mode sudden wall found: yes / no
- Brutal-mode impossible pattern found: yes / no
- Tower that feels mandatory:
- Tower that feels underused:
- Notes:

## Release decision

Choose one:

- [ ] Pass: acceptable for public free-game release.
- [ ] Conditional pass: release after listed fixes.
- [ ] Fail: do not release yet.

## Required fixes before release

| Severity | Issue | Owner | Status |
| --- | --- | --- | --- |
| S0/S1/S2/S3 | | | |

## Final notes

Add screenshots, recordings, or links to GitHub issues here.
