// Tower instance with upgrade levels. Upgrades scale stats per-level;
// max level capped. Sell refund based on total invested (cost + upgrades).

import { Vec2 } from '../../engine/math/Vec2';
import type { Grid } from '../grid/Grid';
import type { Enemy } from '../enemies/Enemy';
import type { TowerDef } from './TowerRegistry';
import { BALANCE } from '../../config/balance';

export interface UpgradeStep {
  cost: number;
  // multiplicative or additive deltas applied on upgrade (Phase 2 ready)
  damageMul: number;
  rangeMul: number;
  fireRateMul: number;
}

export const UPGRADE_STEPS: UpgradeStep[] = [
  { cost: 40, damageMul: 1.4, rangeMul: 1.15, fireRateMul: 1.2 },
  { cost: 80, damageMul: 1.5, rangeMul: 1.1, fireRateMul: 1.25 },
  { cost: 160, damageMul: 1.6, rangeMul: 1.1, fireRateMul: 1.3 },
];

export const MAX_LEVEL = UPGRADE_STEPS.length + 1; // base + 3 upgrades

export class Tower {
  readonly def: TowerDef;
  readonly pos: Vec2;
  readonly tx: number;
  readonly ty: number;
  cooldown = 0;
  angle = 0;
  level = 1;
  private invested: number; // gold sunk into this tower (for sell refund)
  private dmgMul = 1;
  private rangeMul = 1;
  private fireRateMul = 1;

  constructor(def: TowerDef, tx: number, ty: number, grid: Grid) {
    this.def = def;
    this.tx = tx;
    this.ty = ty;
    this.pos = grid.tileCenter(tx, ty);
    this.invested = def.cost;
  }

  get damage(): number {
    return this.def.damage * this.dmgMul;
  }

  get range(): number {
    return this.def.range * this.rangeMul;
  }

  get fireRate(): number {
    return this.def.fireRate * this.fireRateMul;
  }

  get sellValue(): number {
    return Math.floor(this.invested * BALANCE.tower.sellRefund);
  }

  get nextUpgrade(): UpgradeStep | null {
    return this.level < MAX_LEVEL ? UPGRADE_STEPS[this.level - 1] : null;
  }

  upgrade(): boolean {
    const step = this.nextUpgrade;
    if (!step) return false;
    this.dmgMul *= step.damageMul;
    this.rangeMul *= step.rangeMul;
    this.fireRateMul *= step.fireRateMul;
    this.invested += step.cost;
    this.level++;
    return true;
  }

  /** Find the enemy closest to the goal within range; return it or null. */
  acquireTarget(enemies: readonly Enemy[], grid: Grid): Enemy | null {
    let best: Enemy | null = null;
    let bestProgress = Infinity;
    const r2 = this.range * this.range;
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
    this.cooldown = 1 / this.fireRate;
  }
}
