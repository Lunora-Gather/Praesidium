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
- [x] Deploy workflow runs `npm run verify` before publishing.
- [x] `npm run release:gate` command exists for final process review.
- [ ] GitHub Actions deploys without errors.
- [ ] GitHub Pages opens the latest build.
- [ ] Hard refresh test confirms no stale cached build.
- [ ] Mobile browser opens without layout-breaking errors.
- [x] QA results template exists.

## 2. Gameplay balance

- [ ] `npm run balance:sim` reports no Normal-mode blockers.
- [ ] Normal mode is beatable by a non-perfect player.
- [ ] Hard mode is challenging but not a sudden wall.
- [ ] Brutal mode is intentionally punishing but not impossible.
- [ ] No tower is obviously mandatory for every win.
- [ ] No tower is completely unused across balance simulations.
- [x] Boss waves have a warning cue.
- [ ] Endless mode reaches a clear pressure curve before collapse.
- [x] Product health diagnostics can flag balance risks after playtests.
- [x] Balance review notes template exists for the 10-level campaign.
- [x] Balance simulation outputs a late-campaign review for levels 9 and 10.
- [x] Balance simulation outputs actionable tuning notes.

## 3. First-time player experience

- [x] First level teaches tower placement clearly.
- [x] Tutorial now walks through select, place, wave, inspect, upgrade, support ability, Intel, and talents.
- [x] Upgrade / sell flow is obvious.
- [x] Spell usage is taught before it becomes necessary.
- [x] Wave preview / Intel Codex are discoverable.
- [x] Victory screen gives a clear next action.
- [x] Defeat screen gives a useful recovery path.
- [x] RunAdvice helper exists for future specific retry advice.
- [x] Onboarding QA checklist exists.

## 4. UI and mobile polish

- [x] Main menu looks like a release screen, not a debug menu.
- [x] Level select clearly shows progress, stars, scores, and next level.
- [x] Shared layout system exists for breakpoints, spacing, panels, and cards.
- [x] HUD uses shared layout tokens and centered tower shop layout.
- [x] Level select uses responsive shared layout rules.
- [x] Main menu and end screens use shared layout rules.
- [x] Settings screen uses shared layout rules.
- [x] Stats screen uses shared layout rules.
- [x] Talent panel uses shared layout rules.
- [x] Intel Codex uses shared layout rules.
- [x] Tower details panel uses shared layout rules.
- [x] Layout QA checklist exists.
- [ ] HUD is readable at common desktop sizes.
- [ ] HUD is readable on mobile landscape.
- [x] Tower placement has low accidental-click risk.
- [x] Spell buttons are large enough on touchscreens.
- [x] End screens fit on small screens.
- [x] Portrait mobile users get a landscape orientation hint.

## 5. Visual and audio polish

- [x] Each level has a recognizable mood or visual identity.
- [x] Ten campaign levels have distinct theme coverage.
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
- [x] Daily mission generation exists.
- [x] Daily mission progress evaluation exists.
- [x] Daily missions are visible in the UI.
- [x] Weekly mode is visible in the main-menu retention panel.
- [x] Weekly mode has seeded-run rule modifiers and an in-run badge.
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
- [x] Layout QA checklist exists.
- [x] Weekly Mode QA checklist exists.
- [x] Campaign Expansion QA checklist exists.
- [x] Capture runbook exists for screenshots and GIFs.
- [x] Final release process exists.
- [x] Release gate report template exists.
- [x] Onboarding QA checklist exists.
- [x] Final release QA checklist exists.
- [x] Deployment status guide exists.
- [x] Release audit script exists and is included in verify.
- [x] Media kit guide exists and reflects the 10-level campaign.
- [x] Product iteration log exists.
- [x] Balance review notes template exists.
- [x] Commercial playtest plan exists.
- [x] Playtest results summary template exists.
- [x] Bug and playtest issue templates exist.
- [x] Issue template contact links exist.
- [x] PWA manifest is release-ready.
- [x] v0.1.0 release notes exist.

## Current estimated gap

- Public free-game release: about 0.1% remaining.
- Market-grade release: about 0.1% remaining.
- Strong product target: about 95.5% complete.

The biggest remaining blockers are execution/confirmation tasks: latest Actions result, recorded verify output, recorded balance output, captured screenshots/GIFs, outside playtest results, and final release decision.
