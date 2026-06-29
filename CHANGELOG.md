# Changelog

All notable changes to Praesidium are tracked here.

## Unreleased

- No unreleased changes.

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
