# Praesidium Media Kit Guide

This guide defines the capture list and store-page copy needed before a broader public or market-grade release.

For exact filenames, viewports, and capture order, use `docs/CAPTURE_RUNBOOK.md`.

## Short pitch

Praesidium is a polished sci-fi tower defense browser game. Build and upgrade towers, cast tactical spells, read enemy intelligence, unlock talents, and defend a 10-level themed campaign or survive endless seeded challenges.

## Feature bullets

- Ten themed campaign levels with distinct visual moods.
- Endless mode, daily challenge, weekly-mode modifiers, and shareable seed challenges.
- Six tower types with upgrades, targeting strategies, and synergy bonuses.
- Enemy resistances, boss warnings, boss encounter labels, and wave threat previews.
- Intel Codex with tower roles, enemy traits, and recommended counters.
- Talents, achievements, local statistics, Product Health diagnostics, and offline leaderboards.
- Mobile landscape support with compact HUD and tower drawer.
- No account, no backend, no remote telemetry; progress stays in browser localStorage.

## Screenshot capture list

| Shot | Purpose | Suggested state |
| --- | --- | --- |
| Main menu | First impression / landing image | Daily Objectives and Weekly Mode visible |
| Campaign select | Progression feature | 10-level campaign visible with several stars unlocked |
| Level theme collage | Visual identity | Capture early, mid, and late campaign maps |
| Battle HUD | Core gameplay | Towers firing, wave active, enemy path visible |
| Boss warning | High-impact moment | Boss bar and encounter label visible |
| Weekly mode | Retention feature | Seeded run with in-run weekly badge visible |
| Intel Codex | Strategy depth | Enemy tab showing traits/resistances/counters |
| Product Health | Product depth | Stats screen Health tab with risks/scores visible |
| Victory report | Run feedback | Stars, metrics, record badges visible |
| Mobile landscape | Mobile readiness | 780x390 or similar with tower drawer open |

## GIF / video capture list

| Clip | Length | Content |
| --- | --- | --- |
| Core loop | 8-12s | Select tower → place → send wave → enemies enter |
| Upgrade and strategy | 6-10s | Select tower → upgrade/sell drawer or panel |
| Spell impact | 6-10s | Meteor or Freeze during a dense wave |
| Boss encounter | 8-12s | Boss warning, encounter label, boss health bar, tower focus fire |
| Weekly challenge | 6-10s | Weekly badge visible during a seeded run |
| End screen | 5-8s | Victory report, daily progress, and next-level button |

## Store / portal copy

### One-line

A sci-fi tower defense web game with a 10-level campaign, enemy intelligence, weekly modifiers, talents, achievements, and endless seeded challenges.

### Short description

Build a defensive grid, upgrade specialized towers, cast spells, and react to enemy resistances across a 10-level themed campaign. Praesidium adds Intel Codex strategy guidance, wave threat previews, boss encounter labels, talents, achievements, statistics, daily objectives, weekly seeded modifiers, and shareable endless seeds — all in a lightweight browser game built with TypeScript and Canvas.

### Tags

Tower Defense, Strategy, Browser Game, TypeScript, Canvas, Sci-Fi, Tactical, Endless Mode, Weekly Challenge, Mobile Landscape

## README media section recommendation

Add a `Screenshots` section near the top of README once images are available:

```md
## Screenshots

| Campaign | Battle | Weekly Mode |
| --- | --- | --- |
| ![Campaign select](docs/media/praesidium-campaign-select.png) | ![Battle HUD](docs/media/praesidium-combat.png) | ![Weekly Mode](docs/media/praesidium-weekly-mode.png) |

| Boss Warning | Health Tab | Mobile Landscape |
| --- | --- | --- |
| ![Boss warning](docs/media/praesidium-boss-warning.png) | ![Health tab](docs/media/praesidium-health-tab.png) | ![Mobile landscape](docs/media/praesidium-mobile-landscape.png) |
```

## Asset naming convention

Use the filenames from `docs/CAPTURE_RUNBOOK.md`, including:

```text
docs/media/praesidium-hero-menu.png
docs/media/praesidium-campaign-select.png
docs/media/praesidium-combat.png
docs/media/praesidium-boss-warning.png
docs/media/praesidium-weekly-mode.png
docs/media/praesidium-health-tab.png
docs/media/praesidium-mobile-landscape.png
docs/media/praesidium-gameplay-loop.gif
docs/media/praesidium-boss-loop.gif
```

Keep images under 1 MB each where possible. Use GIFs sparingly; prefer short WebM/MP4 for larger captures if the hosting platform supports it.
