# Changelog

All notable changes to Praesidium are tracked here.

## Unreleased

### Added

- Campaign level select with stars, best scores, progression, difficulty picker, and recommended next level.
- Visual level themes for all six campaign levels.
- Boss warning visuals, boss health bar, boss pulse ring, and low-life alert overlay.
- Intel Codex for tower roles, enemy traits, resistances, and recommended counters.
- Wave preview with threat and recommended counter information.
- Talent panel UI for persistent meta-upgrades.
- Battle report end screens with stars, run metrics, and record badges.
- Automatic balance simulation script: `npm run balance:sim`.
- Release checklist and privacy note.

### Changed

- Main menu upgraded into a release-style landing screen with mode and system highlights.
- UI localization expanded across tower names, enemy descriptions, spell names, achievements, settings, stats, level select, and battle reports.
- `npm run verify` now includes typecheck, selftest, save restore test, balance simulation, and production build.
- Save system now exposes campaign progress helpers for unlocked levels, total stars, completion ratio, and best level scores.

### Fixed

- Recorded damage now clamps to actual HP/shield loss instead of counting overkill damage.
- Mid-run restore now restores run statistics.
- End screens now avoid showing missing metrics as zero.
- Localized display helpers fall back safely when a key is missing.
