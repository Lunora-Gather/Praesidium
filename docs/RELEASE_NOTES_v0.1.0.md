# Praesidium v0.1.0 Release Notes

Praesidium v0.1.0 is the first public release candidate for the sci-fi tower defense browser game.

## Highlights

- Six themed campaign levels with progression, stars, best scores, and recommended next level.
- Endless mode, daily challenge, and shareable seed challenge.
- Six tower types with upgrades, targeting strategies, and synergy bonuses.
- Multiple enemy types with traits, resistances, recommended counters, and boss warnings.
- Intel Codex for tower roles, enemy traits, and strategic guidance.
- Wave preview with threats and recommended counter towers.
- Talent tree, achievements, statistics, offline leaderboard, and run summaries.
- Mobile landscape support with compact HUD, tower drawer, and portrait orientation hint.
- Procedural Web Audio with compressor and SFX throttling.
- Enhanced spell and boss visual feedback with pure code particles.
- LocalStorage-only persistence; no account or remote telemetry code.

## Verification before release

Run:

```bash
npm run verify
```

Expected chain:

1. TypeScript typecheck.
2. Runtime selftest.
3. Save/restore regression test.
4. Balance simulation.
5. Release audit.
6. Production build.

Also complete:

- Browser smoke test from `docs/FINAL_RELEASE_QA.md`.
- Mobile smoke test from `docs/MOBILE_QA.md`.
- Media checklist from `docs/MEDIA_KIT.md` if using screenshots/GIFs.
- Outside playtest from `docs/PLAYTEST_PLAN.md` before calling the build market-ready.

## Known remaining work

- Capture and add README screenshots/GIFs.
- Confirm latest GitHub Pages deployment.
- Run final `npm run balance:sim` and review Normal-mode results.
- Complete at least one outside playtest batch.
- Apply balance fixes if external testers report S0/S1 issues.

## Privacy and storage

Praesidium stores progress, settings, achievements, statistics, tutorial state, and optional mid-run saves in browser localStorage. The game does not add accounts, payment flow, advertising SDKs, or remote gameplay telemetry.
