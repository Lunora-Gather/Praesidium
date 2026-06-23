// Tower instance: occupies a tile, fires at nearest progressing enemy.

import { Vec2 } from '../../engine/math/Vec2';
import type { Grid } from '../grid/Grid';
import type { Enemy } from '../enemies/Enemy';
import type { TowerDef } from './TowerRegistry';

export class Tower {
  readonly def: TowerDef;
  readonly pos: Vec2; // pixel center of its tile
  readonly tx: number; // tile coords
  readonly ty: number;
  cooldown = 0; // seconds until next shot
  angle = 0; // current barrel heading (for drawing)

  constructor(def: TowerDef, tx: number, ty: number, grid: Grid) {
    this.def = def;
    this.tx = tx;
    this.ty = ty;
    this.pos = grid.tileCenter(tx, ty);
  }

  /** Find the enemy closest to the goal within range; return it or null. */
  acquireTarget(enemies: readonly Enemy[], grid: Grid): Enemy | null {
    let best: Enemy | null = null;
    let bestProgress = Infinity;
    const r2 = this.def.range * this.def.range;
    for (const e of enemies) {
      if (e.dead || e.reachedGoal) continue;
      if (this.pos.distSq(e.pos) > r2) continue;
      const progress = e.progressRemaining(grid);
      if (progress < bestProgress) {
        bestProgress = progress;
        best = e;
      }
    }
    return best;
  }

  update(dt: number, enemies: readonly Enemy[], grid: Grid): { target: Enemy | null } {
    this.cooldown -= dt;
    const target = this.acquireTarget(enemies, grid);
    if (target) this.angle = target.pos.sub(this.pos).angle();
    return { target };
  }

  canFire(): boolean {
    return this.cooldown <= 0;
  }

  resetCooldown(): void {
    this.cooldown = 1 / this.def.fireRate;
  }
}
