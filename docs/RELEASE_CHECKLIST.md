# Praesidium Release Checklist

This checklist tracks the gap between a strong playable build and a public/market-ready release.

## Release levels

| Level | Target | Status |
| --- | --- | --- |
| Portfolio release | Good enough to showcase publicly as a polished project | Very close |
| Public free game | Good enough for GitHub Pages / itch.io style public play | Release candidate, pending final verification |
| Market-grade release | Good enough for broader promotion and sustained updates | Needs captured media, final QA, and external playtest results |

## 1. Build and deployment

- [ ] `npm run verify` passes locally.
- [ ] GitHub Actions deploys without errors.
- [ ] GitHub Pages opens the latest build.
- [ ] Hard refresh test confirms no stale cached build.
- [ ] Mobile browser opens without layout-breaking errors.

## 2. Gameplay balance

- [ ] `npm run balance:sim` reports no Normal-mode blockers.
- [ ] Normal mode is beatable by a non-perfect player.
- [ ] Hard mode is challenging but not a sudden wall.
- [ ] Brutal mode is intentionally punishing but not impossible.
- [ ] No tower is obviously mandatory for every win.
- [ ] No tower is completely unused across balance simulations.
- [x] Boss waves have a warning cue.
- [ ] Endless mode reaches a clear pressure curve before collapse.

## 3. First-time player experience

- [x] First level teaches tower placement clearly.
- [x] Upgrade / sell flow is obvious.
- [x] Spell usage is taught before it becomes necessary.
- [x] Wave preview / Intel Codex are discoverable.
- [x] Victory screen gives a clear next action.
- [x] Defeat screen gives a useful recovery path.

## 4. UI and mobile polish

- [x] Main menu looks like a release screen, not a debug menu.
- [x] Level select clearly shows progress, stars, scores, and next level.
- [ ] HUD is readable at common desktop sizes.
- [ ] HUD is readable on mobile landscape.
- [x] Tower placement has low accidental-click risk.
- [x] Spell buttons are large enough on touchscreens.
- [x] End screens fit on small screens.

## 5. Visual and audio polish

- [x] Each level has a recognizable mood or visual identity.
- [x] Boss waves have a warning cue.
- [x] Spells have stronger impact feedback.
- [x] Kills and explosions are readable but not noisy.
- [x] Low-life state is visually obvious.
- [x] Audio can be muted and stays muted after reload.
- [x] Sound effects have no obvious clipping or harsh repetition.

## 6. Progression and retention

- [ ] Stars and best scores persist correctly.
- [ ] Unlock progression persists correctly.
- [ ] Talent points feel meaningful.
- [ ] Achievements are understandable and rewarding.
- [ ] Daily challenge has a clear reason to return.
- [ ] Challenge seed sharing is easy to understand.

## 7. Localization

- [ ] English UI has no raw i18n keys.
- [ ] Chinese UI has no obvious English leftovers in core flows.
- [ ] Tower names/descriptions are localized.
- [ ] Enemy names/descriptions/traits are localized.
- [ ] Achievement toast text is localized.
- [ ] Small-screen labels remain readable in both languages.

## 8. Publishing package

- [ ] README includes screenshots or GIFs.
- [x] README explains the core loop in under 30 seconds.
- [x] README documents verification commands.
- [x] Landing/portal card uses current feature text.
- [x] License file exists and matches README.
- [x] Privacy note explains localStorage-only persistence.
- [x] Changelog or release notes exist.
- [x] Mobile QA checklist exists.
- [x] Final release QA checklist exists.
- [x] Release audit script exists and is included in verify.
- [x] Media kit guide exists.
- [x] Commercial playtest plan exists.
- [x] Bug and playtest issue templates exist.

## Current estimated gap

- Public free-game release: about 1.0% remaining.
- Market-grade release: about 2.8% remaining.

The biggest remaining blockers are final local verification, actual screenshots/GIFs, GitHub Pages deploy confirmation, final balance confirmation, and external playtest results.
