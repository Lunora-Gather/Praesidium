# Praesidium Commercial Playtest Plan

This plan turns Praesidium from a polished solo-built game into a release candidate that can survive outside-player feedback.

## Goal

Validate whether new players can understand, enjoy, and complete the core loop without developer guidance.

The playtest should answer:

- Can players understand what to do in the first 60 seconds?
- Is Normal mode fair for a non-perfect player?
- Are tower roles and enemy counters understandable?
- Do spells feel powerful enough to be worth their cost?
- Does the game feel polished enough for a public store/portal page?
- Does mobile landscape feel playable, not merely functional?

## Recommended sample

| Group | Count | Purpose |
| --- | ---: | --- |
| New tower-defense players | 3-5 | First-time clarity |
| Tower-defense familiar players | 3-5 | Strategy/balance feedback |
| Mobile-first players | 2-3 | Touch control and layout feedback |
| Technical reviewers | 1-2 | Browser/performance/deploy smoke test |

Minimum useful batch: 5 players.  
Commercial-grade batch: 10-15 players.

## Test script

Ask each tester to play without help.

1. Open the named candidate build in a fresh browser profile. Record the build and input device.
2. Ask the player to start Campaign and play Level 1 until victory or defeat, without naming the tower shop, Send Wave, Intel, or spells. Note any prompts they need. Continue to Level 2 if the player clears the first map.
3. End the unprompted segment before asking the player to find Intel or cast a spell. Label every later discovery as prompted; do not count it toward the discovery rates.
4. For guided QA, try Endless, Daily and Weekly individually, switch language, and on physical phones repeat building, rotation, reload and offline start.
5. Export the local report from Stats → Health only with the tester's consent. Compare active (not simulated) seconds and annotate interruptions or coaching. Use a separate summary for observed facts and proposed balance changes.

## What to record

Use manual notes, screen recording, or the GitHub issue templates.

| Metric | Target |
| --- | --- |
| Time to first tower placed | Under 45 seconds |
| Time to first wave sent | Under 75 seconds |
| Level 1 Normal completion | Most players should clear or nearly clear |
| First spell usage | Most players discover within first 2 levels |
| Intel Codex discovery | At least half discover without prompting |
| Confusion points | Fewer than 3 major blockers per player |
| Mobile tap frustration | Low / acceptable |

## Feedback questions

### First impression

1. What did you think the game was about within the first 10 seconds?
2. Was the main menu clear?
3. Did the visual style feel consistent?

### Gameplay clarity

1. Did you know where to place towers?
2. Did you understand how to start a wave?
3. Did upgrade/sell feel discoverable?
4. Did enemy weaknesses/resistances make sense?
5. Did the wave preview help you make decisions?

### Balance

1. Did Level 1 feel too easy, fair, or too hard?
2. Which tower felt strongest?
3. Which tower felt weakest or confusing?
4. Did spells feel worth the gold cost?
5. Did any wave feel unfair?

### Polish

1. Did impacts, spells, and boss warnings feel satisfying?
2. Were any UI elements too small or crowded?
3. Did sound help or annoy you?
4. Did you notice any bugs, freezes, or layout issues?

### Retention

1. Would you play one more level?
2. Would you try Endless or Daily Challenge again tomorrow?
3. What single change would make you more likely to continue?

## Severity labels

| Severity | Meaning |
| --- | --- |
| S0 Blocker | Game cannot load, input breaks, or a core flow is impossible |
| S1 Major | Player cannot understand or complete a main flow without help |
| S2 Medium | Annoying bug, unclear UI, balance frustration, or mobile issue |
| S3 Minor | Wording, small visual inconsistency, polish request |

## Commercial release gate

Do not call the game market-grade until:

- No S0 issues remain.
- S1 issues are either fixed or explicitly accepted.
- At least 70% of testers can place a tower and start the first wave without help.
- At least 60% of testers either clear Level 1 or understand why they lost.
- At least 70% rate the presentation as polished enough for a public browser game.
- Mobile landscape has no repeated S1 tap/layout issue.

## GitHub issue templates

Use the repository issue templates to preserve external feedback in a consistent format:

- `.github/ISSUE_TEMPLATE/bug_report.md` for bugs, crashes, layout issues, audio issues, and balance blockers.
- `.github/ISSUE_TEMPLATE/playtest_feedback.md` for structured tester sessions and commercial-readiness notes.

## Issue template for notes

```md
### Tester
- Device/browser:
- Input: mouse / touch / trackpad
- Prior tower-defense experience: none / casual / familiar

### Session result
- Time to first tower:
- Time to first wave:
- Level reached:
- Result: win / loss / quit

### Bugs or blockers
- Severity:
- What happened:
- Repro steps:

### Balance notes
- Strongest tower:
- Weakest tower:
- Hardest wave:
- Spell feedback:

### Overall
- Fun rating 1-5:
- Polish rating 1-5:
- Would play again: yes / maybe / no
- Biggest requested change:
```
