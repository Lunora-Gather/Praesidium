# Final Release QA

Use this checklist immediately before treating Praesidium as a public release build.

## 1. Local verification

Run:

```bash
npm run verify
```

Expected sequence:

1. TypeScript typecheck passes.
2. Runtime selftest passes.
3. Save/restore regression test passes.
4. Balance simulation runs and reports no severe Normal-mode blocker.
5. Release audit checks packaging, metadata, localization hooks, and critical feature wiring.
6. Production build completes.

Also run when touching balance or release packaging:

```bash
npm run balance:sim
npm run release:audit
```

## 2. Browser smoke test

Test the latest GitHub Pages build after a hard refresh.

- [ ] Main menu loads.
- [ ] Campaign level select opens.
- [ ] Level 1 starts.
- [ ] A tower can be placed.
- [ ] First wave can be sent.
- [ ] A tower can be selected, upgraded, and sold.
- [ ] A spell can be selected and used.
- [ ] Pause/menu flow works.
- [ ] Victory/defeat screen shows action buttons.
- [ ] Settings open and language can switch.
- [ ] Stats screen opens without crashing.
- [ ] Intel Codex opens without crashing.

## 3. Mobile smoke test

Use `docs/MOBILE_QA.md` for detailed mobile coverage.

Minimum public release check:

- [ ] 640 × 360 landscape does not break the battle HUD.
- [ ] Tower drawer appears on phone-sized screens.
- [ ] End screens fit without losing primary actions.
- [ ] Spell buttons remain tappable.

## 4. Content and packaging

- [ ] README links open correctly.
- [ ] Privacy note exists.
- [ ] Changelog exists.
- [ ] License exists.
- [ ] Portal card describes the current feature set.
- [ ] Page title and meta description are current.
- [ ] Social preview metadata is current.
- [ ] `npm run release:audit` passes.

## 5. Release decision

Praesidium can be treated as a public free-game release candidate when:

- `npm run verify` passes;
- GitHub Pages deploys the latest build;
- the browser smoke test passes;
- the mobile smoke test passes on at least one phone landscape size;
- no Normal-mode blocker is reported by `npm run balance:sim`;
- `npm run release:audit` reports no missing release packaging or metadata.

For a broader market-grade release, add screenshots/GIFs, a stronger media package, final sound-effect review, and at least a small set of external playtest feedback.
