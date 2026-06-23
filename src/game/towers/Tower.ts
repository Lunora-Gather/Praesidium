// Tower instance with upgrade levels, damage type, target strategy, synergy aura.
// Stats scale per-level; sell refund based on total invested.
// Synergy: towers within 2 tiles of each other gain +10% damage and +8% fire rate
// per nearby tower (max +40%). This creates the strategic choice of clustering
// towers for synergy bonuses vs. spreading them for map coverage.

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

/** Synergy: bonus per nearby tower within SYNERGY_RANGE tiles. */
const SYNERGY_RANGE = 2; // tile distance
const SYNERGY_DMG_BONUS = 0.10; // +10% damage per neighbor
const SYNERGY_RATE_BONUS = 0.08; // +8% fire rate per neighbor
const SYNERGY_MAX_NEIGHBORS = 4; // cap at 4 neighbors

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
  /** Number of towers within synergy range (set each frame by GameState). */
  synergyNeighbors = 0;

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

  get damage(): number {
    const syn = 1 + Math.min(this.synergyNeighbors, SYNERGY_MAX_NEIGHBORS) * SYNERGY_DMG_BONUS;
    return this.def.damage * this.dmgMul * syn;
  }
  get range(): number { return this.def.range * this.rangeMul; }
  get fireRate(): number {
    const syn = 1 + Math.min(this.synergyNeighbors, SYNERGY_MAX_NEIGHBORS) * SYNERGY_RATE_BONUS;
    return this.def.fireRate * this.fireRateMul * syn;
  }
  get sellValue(): number { return Math.floor(this.invested * BALANCE.tower.sellRefund); }
  get nextUpgrade(): UpgradeStep | null {
    return this.level < MAX_LEVEL ? UPGRADE_STEPS[this.level - 1] : null;
  }
  get synergyRange(): number { return SYNERGY_RANGE; }

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
