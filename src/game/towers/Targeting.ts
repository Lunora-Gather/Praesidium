// Targeting strategies for towers. Pluggable; player can cycle per-tower.

import type { Enemy } from '../enemies/Enemy';
import type { Grid } from '../grid/Grid';

export type TargetStrategy = 'first' | 'last' | 'strongest' | 'weakest' | 'closest';

export class Targeting {
  static acquire(
    strategy: TargetStrategy,
    towerPos: { x: number; y: number },
    range: number,
    enemies: readonly Enemy[],
    grid: Grid,
  ): Enemy | null {
    const r2 = range * range;
    let best: Enemy | null = null;
    let bestKey = Infinity;
    const key = (e: Enemy): number => {
      switch (strategy) {
        case 'first': return e.progressRemaining(grid); // closest to goal
        case 'last': return -e.progressRemaining(grid); // furthest from goal
        case 'strongest': return -e.hp;
        case 'weakest': return e.hp;
        case 'closest': return towerPos.x - e.pos.x + (towerPos.y - e.pos.y); // rough; distSq used below
      }
    };
    for (const e of enemies) {
      if (e.dead || e.reachedGoal) continue;
      if ((towerPos.x - e.pos.x) ** 2 + (towerPos.y - e.pos.y) ** 2 > r2) continue;
      const k = strategy === 'closest'
        ? (towerPos.x - e.pos.x) ** 2 + (towerPos.y - e.pos.y) ** 2
        : key(e);
      if (k < bestKey) {
        bestKey = k;
        best = e;
      }
    }
    return best;
  }
}
