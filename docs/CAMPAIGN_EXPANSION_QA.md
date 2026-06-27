# Campaign Expansion QA

This checklist covers the campaign expansion from 6 levels to 8 levels and prepares the path toward 10 to 12 levels.

## Added levels

| Level | Name | Design goal |
| --- | --- | --- |
| 7 | Relay Array | Wide switchbacks that reward slow/control and area coverage. |
| 8 | Blackout Ridge | Late split-pressure pathing with limited central build windows. |

## Static checks

- `LEVELS.length` is at least 8.
- Each level has spawn, goal, path, and buildable tiles.
- Each level has at least two waypoints.
- Campaign star maximum follows the expanded level count.
- Balance simulation automatically includes all campaign levels.

## Browser smoke test

1. Open Level Select.
2. Confirm levels 7 and 8 appear after unlocking or test unlock state.
3. Confirm each new level has a distinct visual theme.
4. Start level 7 and confirm the path is readable.
5. Start level 8 and confirm the path is readable.
6. Confirm next-wave preview, tower placement, spells, and boss warnings still render correctly.

## Balance smoke test

Run:

```bash
npm run balance:sim
```

Pass criteria:

- No normal-mode level collapses before completing wave 1.
- Levels 7 and 8 appear in the simulation report.
- Tower placement distribution still includes multiple tower types.

## Next content targets

- Level 9: split pressure with stronger boss preparation.
- Level 10: final campaign gate with a clear boss identity.
- Optional levels 11 and 12: advanced challenge maps after playtest balance is stable.
