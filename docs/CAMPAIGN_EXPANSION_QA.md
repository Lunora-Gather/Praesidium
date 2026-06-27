# Campaign Expansion QA

This checklist covers the campaign expansion from 6 levels to 10 levels and prepares the path toward optional 11 to 12 level challenge maps.

## Added levels

| Level | Name | Design goal |
| --- | --- | --- |
| 7 | Relay Array | Wide switchbacks that reward slow/control and area coverage. |
| 8 | Blackout Ridge | Late split-pressure pathing with limited central build windows. |
| 9 | Overdrive Gate | Speed pressure and boss-preparation coverage check. |
| 10 | Apex Bastion | Final campaign gate with long-range and boss pressure. |

## Static checks

- `LEVELS.length` is at least 10.
- Each level has spawn, goal, path, and buildable tiles.
- Each level has at least two waypoints.
- Campaign star maximum follows the expanded level count and reaches at least 30 stars.
- Balance simulation automatically includes all campaign levels.
- Balance simulation includes a late-campaign review for levels 9 and 10.

## Browser smoke test

1. Open Level Select.
2. Confirm levels 7 through 10 appear after unlocking or test unlock state.
3. Confirm each new level has a distinct visual theme.
4. Start level 7 and confirm the path is readable.
5. Start level 8 and confirm the path is readable.
6. Start level 9 and confirm speed-pressure pathing is readable.
7. Start level 10 and confirm the final gate path is readable.
8. Confirm next-wave preview, tower placement, spells, weekly badge, and boss warnings still render correctly.

## Balance smoke test

Run:

```bash
npm run balance:sim
```

Pass criteria:

- No normal-mode level collapses before completing wave 1.
- Levels 7, 8, 9, and 10 appear in the simulation report.
- `Late Campaign Review` appears in the simulation output.
- Tower placement distribution still includes multiple tower types.
- Late-campaign tower distribution still includes multiple tower types.
- At least one normal-mode bot plan reaches meaningful late-wave progress on levels 9 and 10.

## Next content targets

- Optional level 11: advanced challenge map after playtest balance is stable.
- Optional level 12: capstone challenge map after balance simulation and outside testing.
- Final boss pattern: introduce only after the 10-level campaign is stable.
