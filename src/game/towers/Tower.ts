// Tower instance with upgrade levels, damage type, target strategy.
// Stats scale per-level; sell refund based on total invested.

import { Vec2 } from '../../engine/math/Vec2';
import type { Grid } from '../grid/Grid';
import type { Enemy } from '../enemies/Enemy';
import type { TowerDef } from './TowerRegistry';
import type { TargetStrategy } from './Targeting';
import { Targeting } from './Targeting';
import { BALANCE } from '../../config/balance';

export interface UpgradeStep {
  cost: number;
  damageMul: number;
  rangeMul: number;
  fireRateMul: number;
}

export const UPGRADE_STEPS: UpgradeStep[] = [
  { cost: 40, damageMul: 1.4, rangeMul: 1.15, fireRateMul: 1.2 },
  { cost: 80, damageMul: 1.5, rangeMul: 1.1, fireRateMul: 1.25 },
  { cost: 160, damageMul: 1.6, rangeMul: 1.1, fireRateMul: 1.3 },
];

export const MAX_LEVEL = UPGRADE_STEPS.length + 1;

export class Tower {
  readonly def: TowerDef;
  readonly pos: Vec2;
  readonly tx: number;
  readonly ty: number;
  cooldown = 0;
  angle = 0;
  level = 1;
  strategy: TargetStrategy;
  private invested: number;
  private dmgMul = 1;
  private rangeMul = 1;
  private fireRateMul = 1;

  constructor(def: TowerDef, tx: number, ty: number, grid: Grid, talents?: { damage: number; range: number; firerate: number }) {
    this.def = def;
    this.tx = tx;
    this.ty = ty;
    this.pos = grid.tileCenter(tx, ty);
    this.invested = def.cost;
    this.strategy = def.defaultStrategy;
    if (talents) {
      this.dmgMul *= talents.damage;
      this.rangeMul *= talents.range;
      this.fireRateMul *= talents.firerate;
    }
  }

  get damage(): number { return this.def.damage * this.dmgMul; }
  get range(): number { return this.def.range * this.rangeMul; }
  get fireRate(): number { return this.def.fireRate * this.fireRateMul; }
  get sellValue(): number { return Math.floor(this.invested * BALANCE.tower.sellRefund); }
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

  cycleStrategy(): void {
    const order: TargetStrategy[] = ['first', 'last', 'strongest', 'weakest', 'closest'];
    const i = order.indexOf(this.strategy);
    this.strategy = order[(i + 1) % order.length];
  }

  acquireTarget(enemies: readonly Enemy[], grid: Grid): Enemy | null {
    return Targeting.acquire(this.strategy, this.pos, this.range, enemies, grid);
  }

  update(dt: number, enemies: readonly Enemy[], grid: Grid): { target: Enemy | null } {
    this.cooldown -= dt;
    const target = this.acquireTarget(enemies, grid);
    if (target) this.angle = target.pos.sub(this.pos).angle();
    return { target };
  }

  canFire(): boolean { return this.cooldown <= 0; }
  resetCooldown(): void { this.cooldown = 1 / this.fireRate; }
}
