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
    for (const e of enemies) {
      if (e.dead || e.reachedGoal) continue;
      const dSq = (towerPos.x - e.pos.x) ** 2 + (towerPos.y - e.pos.y) ** 2;
      if (dSq > r2) continue;
      let k: number;
      switch (strategy) {
        case 'first': k = e.progressRemaining(grid); break;       // closest to goal
        case 'last': k = -e.progressRemaining(grid); break;        // furthest from goal
        case 'strongest': k = -e.hp; break;
        case 'weakest': k = e.hp; break;
        case 'closest': k = dSq; break;                            // nearest in range
        default: k = dSq;
      }
      if (k < bestKey) {
        bestKey = k;
        best = e;
      }
    }
    return best;
  }
}
