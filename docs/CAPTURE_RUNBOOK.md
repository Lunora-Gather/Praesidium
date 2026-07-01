# Capture Runbook

This runbook turns the remaining screenshot/GIF gap into a repeatable capture task.

## Goal

Produce a small public-facing media set for README, portal cards, release notes, and social sharing.

## Required captures

| Asset | Viewport | Scene | Suggested filename |
| --- | --- | --- | --- |
| Hero screenshot | 1280 x 720 | Main menu with campaign CTA, mode dock, and Daily/Weekly ops brief visible | `praesidium-hero-menu.png` |
| Campaign route screenshot | 1280 x 720 | Level select mission-route board with the next level highlighted | `praesidium-campaign-route.png` |
| Campaign screenshot | 1280 x 720 | Level Select showing the 10-level campaign | `praesidium-campaign-select.png` |
| Combat screenshot | 1280 x 720 | Mid-run with towers, next-wave preview, and enemies visible | `praesidium-combat.png` |
| Boss screenshot | 1280 x 720 | Boss warning or active boss encounter label visible | `praesidium-boss-warning.png` |
| Weekly screenshot | 1280 x 720 | Seeded run with in-run Weekly Mode badge visible | `praesidium-weekly-mode.png` |
| Stats screenshot | 1280 x 720 | Stats screen Health tab showing product diagnostics | `praesidium-health-tab.png` |
| Mobile screenshot | 780 x 390 | Landscape mobile HUD with tower drawer/spells readable | `praesidium-mobile-landscape.png` |
| Gameplay GIF | 960 x 540 | 8 to 12 seconds showing placement, wave start, and spell impact | `praesidium-gameplay-loop.gif` |
| Boss GIF | 960 x 540 | 6 to 10 seconds showing boss warning and boss death feedback | `praesidium-boss-loop.gif` |

## Capture order

1. Open the deployed Pages build.
2. Hard refresh the page.
3. Capture the main menu first so deployment freshness is visible.
4. Capture Level Select after unlocking enough content or using a test profile.
5. Capture normal combat on a mid-campaign map.
6. Capture level 9 or 10 for late-campaign visuals.
7. Capture a seeded challenge for the weekly badge.
8. Capture Stats > Health after at least a few runs.

## Quality bar

- No browser chrome in screenshots.
- No error overlay.
- No raw i18n keys in visible core text.
- Text remains readable at 1280 x 720.
- Mobile capture shows landscape UI, not portrait hint.
- GIFs should be short enough to load quickly in README.

## README placement

Recommended order:

1. Hero screenshot near the top.
2. Gameplay GIF after the feature list.
3. Boss GIF near the strategy section.
4. Mobile screenshot near the mobile section.
5. Health tab screenshot near QA / product iteration notes.

## Release decision

A market-grade promotion pass should not start until at least:

- hero screenshot exists
- one gameplay GIF exists
- one boss or weekly-mode capture exists
- one mobile landscape screenshot exists

## Current captured set

The repository currently includes:

- `docs/media/praesidium-hero-menu.png`
- `docs/media/praesidium-campaign-route.png`
- `docs/media/praesidium-combat.png`
- `docs/media/praesidium-weekly-mode.png`
- `docs/media/praesidium-mobile-landscape.png`

GIF/video capture is still deferred until a suitable capture/encoding tool is available.
