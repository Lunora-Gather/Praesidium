// Enemy instance: walks waypoints, takes typed damage (with resistance),
// supports slow effects, tracks being a boss.

import { Vec2 } from '../../engine/math/Vec2';
import type { Grid } from '../grid/Grid';
import type { EnemyDef } from './EnemyRegistry';
import { applyResistance, DamageType } from '../DamageType';

export class Enemy {
  dead = false;
  reachedGoal = false;
  pos: Vec2;
  private wpIndex = 0;
  hp: number;
  private readonly maxHp: number;
  private shieldHp = 0;
  private readonly baseSpeed: number;
  private slowTimer = 0;
  private slowFactor = 1;
  readonly reward: number;
  readonly radius: number;
  readonly color: string;
  readonly id: string;
  readonly resist: Partial<Record<DamageType, number>> | undefined;
  readonly isBoss: boolean;

  constructor(def: EnemyDef, startPos: Vec2, waveHpMul: number) {
    this.id = def.id;
    this.color = def.color;
    this.radius = def.radius;
    this.hp = def.hp * waveHpMul;
    this.maxHp = this.hp;
    this.baseSpeed = def.speed;
    this.reward = Math.round(def.reward * waveHpMul);
    this.pos = Vec2.from(startPos);
    this.resist = def.resist;
    this.isBoss = !!def.isBoss;
  }

  applySlow(factor: number, duration: number): void {
    if (factor <= this.slowFactor) {
      this.slowFactor = factor;
      this.slowTimer = duration;
    } else {
      this.slowTimer = Math.max(this.slowTimer, duration);
    }
  }

  update(dt: number, grid: Grid): void {
    if (this.dead || this.reachedGoal) return;
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) this.slowFactor = 1;
    }
    const speed = this.baseSpeed * this.slowFactor;
    if (this.wpIndex >= grid.waypoints.length) {
      this.reachedGoal = true;
      this.dead = true;
      return;
    }
    const target = grid.waypoints[this.wpIndex];
    const dir = target.sub(this.pos);
    const dist = dir.len();
    const step = speed * dt;
    if (dist <= step) {
      this.pos = Vec2.from(target);
      this.wpIndex++;
      if (this.wpIndex >= grid.waypoints.length) {
        this.reachedGoal = true;
        this.dead = true;
      }
    } else {
      this.pos = this.pos.add(dir.normalize().mul(step));
    }
  }

  takeDamage(d: number, type: DamageType = DamageType.Physical): number {
    const actual = this.resist ? applyResistance(d, type, this.resist) : d;
    let dmg = actual;
    if (this.shieldHp > 0) {
      const absorbed = Math.min(this.shieldHp, dmg);
      this.shieldHp -= absorbed;
      dmg -= absorbed;
    }
    this.hp -= dmg;
    if (this.hp <= 0) this.dead = true;
    return actual;
  }

  heal(amount: number): void {
    if (this.dead) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  shield(amount: number): void {
    this.shieldHp += amount;
  }

  get hpRatio(): number {
    return Math.max(0, this.hp / this.maxHp);
  }

  get isSlowed(): boolean {
    return this.slowTimer > 0;
  }

  progressRemaining(grid: Grid): number {
    let total = this.pos.dist(grid.waypoints[this.wpIndex] ?? this.pos);
    for (let i = this.wpIndex; i + 1 < grid.waypoints.length; i++) {
      total += grid.waypoints[i].dist(grid.waypoints[i + 1]);
    }
    return total;
  }
}
