# Praesidium Media Kit Guide

This guide defines the capture list and store-page copy needed before a broader public or market-grade release.

## Short pitch

Praesidium is a polished sci-fi tower defense browser game. Build and upgrade towers, cast tactical spells, read enemy intelligence, unlock talents, and defend six themed campaign zones or survive endless seeded challenges.

## Feature bullets

- Six themed campaign levels with distinct visual moods.
- Endless mode, daily challenge, and shareable seed challenges.
- Six tower types with upgrades, targeting strategies, and synergy bonuses.
- Enemy resistances, boss warnings, and wave threat previews.
- Intel Codex with tower roles, enemy traits, and recommended counters.
- Talents, achievements, local statistics, and offline leaderboards.
- Mobile landscape support with compact HUD and tower drawer.
- No account, no backend, no remote telemetry; progress stays in browser localStorage.

## Screenshot capture list

| Shot | Purpose | Suggested state |
| --- | --- | --- |
| Main menu | First impression / landing image | Release-style menu with mode buttons visible |
| Campaign select | Progression feature | Several stars unlocked, recommended next level visible |
| Level theme collage | Visual identity | Capture 2-3 different themed maps |
| Battle HUD | Core gameplay | Towers firing, wave active, enemy path visible |
| Boss warning | High-impact moment | Boss bar and warning banner visible |
| Intel Codex | Strategy depth | Enemy tab showing traits/resistances/counters |
| Victory report | Run feedback | Stars, metrics, record badges visible |
| Mobile landscape | Mobile readiness | 640x360 or similar with tower drawer open |

## GIF / video capture list

| Clip | Length | Content |
| --- | --- | --- |
| Core loop | 8-12s | Select tower → place → send wave → enemies enter |
| Upgrade and strategy | 6-10s | Select tower → upgrade/sell drawer or panel |
| Spell impact | 6-10s | Meteor or Freeze during a dense wave |
| Boss encounter | 8-12s | Boss warning, boss health bar, tower focus fire |
| End screen | 5-8s | Victory report and next-level button |

## Store / portal copy

### One-line

A sci-fi tower defense web game with themed campaign levels, enemy intelligence, talents, achievements, and endless seeded challenges.

### Short description

Build a defensive grid, upgrade specialized towers, cast spells, and react to enemy resistances across six themed campaign zones. Praesidium adds Intel Codex strategy guidance, wave threat previews, talents, achievements, statistics, daily challenges, and shareable endless seeds — all in a lightweight browser game built with TypeScript and Canvas.

### Tags

Tower Defense, Strategy, Browser Game, TypeScript, Canvas, Sci-Fi, Tactical, Endless Mode, Mobile Landscape

## README media section recommendation

Add a `Screenshots` section near the top of README once images are available:

```md
## Screenshots

| Campaign | Battle | Intel Codex |
| --- | --- | --- |
| ![Campaign select](docs/media/campaign-select.png) | ![Battle HUD](docs/media/battle-hud.png) | ![Intel Codex](docs/media/intel-codex.png) |

| Boss Warning | Victory Report | Mobile Landscape |
| --- | --- | --- |
| ![Boss warning](docs/media/boss-warning.png) | ![Victory report](docs/media/victory-report.png) | ![Mobile landscape](docs/media/mobile-landscape.png) |
```

## Asset naming convention

Use:

```text
docs/media/campaign-select.png
docs/media/battle-hud.png
docs/media/boss-warning.png
docs/media/intel-codex.png
docs/media/victory-report.png
docs/media/mobile-landscape.png
docs/media/core-loop.gif
```

Keep images under 1 MB each where possible. Use GIFs sparingly; prefer short WebM/MP4 for larger captures if the hosting platform supports it.
