# Changelog

All notable changes to Praesidium are tracked here.

## Unreleased

## 1.2.0 - 2026-11-27

- Reworked the command deck, campaign preview, settings, briefing, stats and Intel screens with scrollable native controls and responsive layouts.
- Added shared tower and enemy silhouettes, clearer routes and endpoints, and build and skill previews on the battlefield.
- Refined touch placement, sale confirmation and spell targeting. The first wave waits for the player. Aiming a damaging spell at an empty area leaves the gold and cooldown available.
- Added adjustable screen shake, reduced-motion support and adaptive graphics. Paused scenes avoid continuous redraws and audio scheduling.
- Save battle speed with the checkpoint and resume paused after a refresh. Keep backup recovery, older save migration and offline update verification covered by browser tests.

## 1.1.0 - 2026-11-25

- Updated build dependencies and tightened the legacy save cutover, including when an existing worker is bypassed by a forced reload.
- Moved core progress and checkpoints to IndexedDB transactions. Explicit tab takeover and monotonic revisions prevent stale writes; validated backup and restore are available in Settings.
- Separated campaign, Endless, Daily, Weekly, and practice scoring and reward eligibility. New P2 codes pin rules and score versions; score and wave stay paired by battle, with legacy records separate.
- Added a split-row compact HUD, small-tile touch confirmation, accessible operations briefing and results, and a reduced-motion preference.
- Made onboarding action-based and replayable, separated foreground time from simulated time, and withhold health scores when samples are too small.
- Verify every offline resource before activating a release; wait out older running clients before migrating. PR and Pages jobs exercise Chromium and WebKit.

- Capped each kill's combo bonus at 60% of its base gold, and prevented Repair spending at full lives.
- Corrected fast projectile impacts, layered slows, wave clears, and Tesla chain hits. Reduced targeting work and batched achievement storage writes during long runs.
- Added pagination to the Intel codex and kept health report controls clear of the risk list on short screens.
- Added campaign runs with limited budgets, three half-hour Endless runs, and larger combat loads to the balance and performance checks.
- Added shareable challenge codes with the original difficulty, weekly rules, opening waves, and talent loadout. Daily challenges now reset at UTC midnight with a standard loadout.
- Combined campaign records, unlocks, and talent awards into one retryable local settlement. Conqueror counts distinct campaign levels completed.
- Added Resume to the command deck when returning to the menu mid-run, and kept victory and defeat actions clear of the report on short screens.
- Added keyboard focus and activation to game controls, including arrow-key navigation for building tiles. All ten levels now appear in statistics and rankings, and the chosen language persists.
- Preserved active waves, towers, enemies, and shots across a reload. Existing run saves resume at the start of their recorded wave.
- Fitted the full battlefield beside the combat controls in portrait and landscape, and kept the first wave on hold for preparation.
- Precached each release's full offline shell and corrected the install manifest URL for GitHub Pages subpaths.
- Moved tower synergy calculations out of the frame loop and cached remaining route distances for target selection.
- Added local playtest report export from the Stats health screen.
- Added persistent Daily/Weekly mission credits and end-screen reward badges.
- Added a new-player pressure probe to the balance simulation.
- Added README media captures for menu, campaign route, combat, weekly mode, and mobile landscape.
- Improved first-run tutorial hints with target highlighting for core controls and placement.

## 1.0.0 - 2026-06-27

### Added

- Ten-level campaign with late-game maps, themes, unlock progression, stars, best scores, and recommended next level.
- Endless mode, daily challenge, weekly seeded modifiers, and shareable seed challenge.
- Six tower types with upgrades, targeting strategies, synergy bonuses, and tower drawer interaction.
- Enemy trait, resistance, boss warning, boss encounter, and Intel Codex systems.
- Daily missions, weekly run badge, product-health stats, achievements, talents, offline leaderboard, and run summaries.
- Shared responsive layout tokens across HUD, level select, screens, settings, stats, talents, codex, and tower panel.
- Release gate command, release process docs, QA templates, media runbook, and final release report template.

### Changed

- Main menu upgraded into a release-style play surface with campaign, endless, daily, challenge, stats, talents, and codex entry points.
- Main menu layout redesigned into a full-screen command surface with adaptive hero copy, a primary campaign action, compact mode tiles, and a lightweight Daily/Weekly ops brief.
- Main menu and level select now share a sharper holographic command-deck style with slanted controls, a centered campaign route, and mission-slab level nodes instead of generic boxed menus.
- Battlefield rendering now uses richer ambient backdrops, path-flow markers, tower glows, enemy shadows, projectile halos, and cleaner health bars.
- GitHub Pages deployment now runs Node 24, full verification, and production build before publishing.
- Public launch path no longer depends on blocking external Google Fonts.
- Production build no longer emits source maps for the public Pages artifact.
- `npm run verify` now covers typecheck, runtime selftest, save/restore regression, balance simulation, performance stress, release audit, and production build.
- `npm run release:gate` summarizes repository readiness and final external release confirmations.

### Fixed

- Boss encounter classifier now distinguishes armored escort, phantom siege, and fast escort boss waves.
- Compact landscape level select now shows all ten campaign levels without vertical overflow while preserving the campaign-route layout.
- Small landscape main menu no longer lets Daily Objectives or shortcut hints cover primary actions.
- Versioned service worker registration replaces the temporary legacy service worker unregister path.
- PWA manifest metadata now consistently describes the ten-level campaign and uses a relative start URL.
- Canvas resize and device-pixel-ratio handling now reduce high-DPI startup cost and resize churn.
- Particle effects now have explicit pool caps to protect frame pacing during dense battles.
- Mid-run restore keeps run statistics and weekly mode state.
- Recorded damage clamps to actual HP/shield loss instead of counting overkill damage.
- End screens avoid showing missing metrics as zero.
- Localized display helpers fall back safely when a key is missing.
