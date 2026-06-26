# Market Ready Plan

Praesidium is close to public release. This plan defines the remaining work needed before calling it market-ready.

## Current gap

- Public free-game release: about 1.2% remaining.
- Market-grade release: about 6.5% remaining.

## Phase 1: release candidate verification

- [ ] Run `npm run verify`.
- [ ] Confirm `npm run balance:sim` has no Normal-mode blocker.
- [ ] Confirm GitHub Pages serves the latest build.
- [ ] Complete browser smoke test from `docs/FINAL_RELEASE_QA.md`.
- [ ] Complete mobile smoke test from `docs/MOBILE_QA.md`.
- [ ] Add at least three gameplay screenshots or one short GIF to README.

## Phase 2: outside playtest

- [ ] Run `docs/PLAYTEST_PLAN.md` with at least 5 testers.
- [ ] Include at least 2 mobile landscape testers.
- [ ] Record time to first tower and first wave.
- [ ] Record Level 1 completion or near-completion rate.
- [ ] Fix all S0 issues.
- [ ] Fix or consciously accept all S1 issues.

## Phase 3: media package

- [ ] Capture the screenshot list in `docs/MEDIA_KIT.md`.
- [ ] Capture one core-loop GIF or short video.
- [ ] Add screenshot section to README.
- [ ] Re-check portal card copy.
- [ ] Re-check social preview metadata.

## Phase 4: post-release maintenance

- [ ] Keep `CHANGELOG.md` updated.
- [ ] Track player issues by severity.
- [ ] Run `npm run verify` before every release.
- [ ] Use playtest notes to tune tower balance and wave difficulty.

## Market-ready gate

Treat the game as market-ready only after:

- public release verification passes;
- at least one outside playtest batch is reviewed;
- no S0 issue remains;
- no unresolved S1 issue blocks first-time player flow;
- screenshots or short gameplay media are attached to the README or release page.
