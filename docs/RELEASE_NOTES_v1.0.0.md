# Praesidium v1.0.0 Release Notes

Praesidium v1.0.0 is the first full public release of the sci-fi tower defense browser game.

## Highlights

- Ten themed campaign levels with progression, stars, best scores, recommended next level, and late-campaign challenge maps.
- Endless mode, daily challenge, weekly seeded modifiers, and shareable seed challenge.
- Six tower types with upgrades, targeting strategies, and synergy bonuses.
- Multiple enemy types with traits, resistances, recommended counters, boss warnings, and boss encounter labels.
- Intel Codex for tower roles, enemy traits, resistances, and strategic guidance.
- Daily missions, weekly run badge, product-health stats, achievements, talents, offline leaderboard, and run summaries.
- Redesigned full-screen main menu with a stronger campaign CTA, compact mode dock, and lightweight Daily/Weekly ops brief across desktop and mobile landscape.
- Campaign level select uses a mission-route board with slanted level nodes, cleaner progress controls, and less boxed dashboard clutter.
- Mobile landscape support with compact HUD, compact 10-level select, tower drawer, shared layout tokens, and portrait orientation hint.
- Polished battlefield presentation with ambient map lighting, path-flow direction markers, tower glows, enemy shadows, projectile halos, and capped particle effects.
- Versioned service worker cache for faster repeat visits and offline-friendly static assets.
- Procedural Web Audio with compressor and SFX throttling.
- Enhanced spell and boss visual feedback with pure code particles.
- LocalStorage-only persistence; no account, payment flow, advertising SDK, or remote gameplay telemetry.

## Verification Before Release

Run:

```bash
npm run verify
npm run release:gate
```

`npm run verify` checks:

1. TypeScript typecheck.
2. Runtime selftest.
3. Save/restore regression test.
4. Balance simulation.
5. Performance stress check.
6. Release audit.
7. Production build.

Also complete:

- Browser smoke test from `docs/FINAL_RELEASE_QA.md`.
- Mobile smoke test from `docs/MOBILE_QA.md`.
- Layout QA from `docs/LAYOUT_QA.md`.
- Campaign expansion QA from `docs/CAMPAIGN_EXPANSION_QA.md`.
- Weekly mode QA from `docs/WEEKLY_MODE_QA.md`.
- Media capture checklist from `docs/MEDIA_KIT.md` if using screenshots/GIFs.

## Release Decision

This build can be treated as the 1.0.0 public web release when:

- The latest GitHub Actions deploy workflow passes.
- The GitHub Pages URL opens the latest build.
- `npm run verify` passes locally and in CI.
- `npm run release:gate` reports no repository blockers.
- Any remaining external QA notes are recorded in the release gate report.

## Privacy and Storage

Praesidium stores progress, settings, achievements, statistics, tutorial state, and optional mid-run saves in browser localStorage. The game does not add accounts, payment flow, advertising SDKs, or remote gameplay telemetry.
