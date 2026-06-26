# Praesidium Release Checklist

This checklist tracks the gap between a strong playable build and a public/market-ready release.

## Release levels

| Level | Target | Status |
| --- | --- | --- |
| Portfolio release | Good enough to showcase publicly as a polished project | Close |
| Public free game | Good enough for GitHub Pages / itch.io style public play | In progress |
| Market-grade release | Good enough for broader promotion and sustained updates | Needs more polish |

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

- [ ] First level teaches tower placement clearly.
- [ ] Upgrade / sell flow is obvious.
- [ ] Spell usage is taught before it becomes necessary.
- [ ] Wave preview / Intel Codex are discoverable.
- [ ] Victory screen gives a clear next action.
- [ ] Defeat screen gives a useful recovery path.

## 4. UI and mobile polish

- [ ] Main menu looks like a release screen, not a debug menu.
- [x] Level select clearly shows progress, stars, scores, and next level.
- [ ] HUD is readable at common desktop sizes.
- [ ] HUD is readable on mobile landscape.
- [ ] Tower placement has low accidental-click risk.
- [ ] Spell buttons are large enough on touchscreens.
- [ ] End screens fit on small screens.

## 5. Visual and audio polish

- [x] Each level has a recognizable mood or visual identity.
- [x] Boss waves have a warning cue.
- [ ] Spells have stronger impact feedback.
- [ ] Kills and explosions are readable but not noisy.
- [x] Low-life state is visually obvious.
- [ ] Audio can be muted and stays muted after reload.
- [ ] Sound effects have no obvious clipping or harsh repetition.

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
- [ ] README explains the core loop in under 30 seconds.
- [ ] README documents verification commands.
- [ ] Landing/portal card uses current feature text.
- [ ] License file exists and matches README.
- [ ] Privacy note explains localStorage-only persistence.
- [ ] Changelog or release notes exist.

## Current estimated gap

- Public free-game release: about 17% remaining.
- Market-grade release: about 28% remaining.

The biggest remaining blockers are mobile polish, publishing package, first-time player guidance, and final balance confirmation.
