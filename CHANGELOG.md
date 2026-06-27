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
- GitHub Pages deployment now runs Node 24, full verification, and production build before publishing.
- Public launch path no longer depends on blocking external Google Fonts.
- `npm run verify` now covers typecheck, runtime selftest, save/restore regression, balance simulation, release audit, and production build.
- `npm run release:gate` summarizes repository readiness and final external release confirmations.

### Fixed

- Boss encounter classifier now distinguishes armored escort, phantom siege, and fast escort boss waves.
- Mid-run restore keeps run statistics and weekly mode state.
- Recorded damage clamps to actual HP/shield loss instead of counting overkill damage.
- End screens avoid showing missing metrics as zero.
- Localized display helpers fall back safely when a key is missing.
