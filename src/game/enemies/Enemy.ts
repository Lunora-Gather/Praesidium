// Enemy instance: walks waypoints, takes typed damage (with resistance),
// supports slow effects, tracks being a boss.

import { Vec2 } from '../../engine/math/Vec2';
import type { Grid } from '../grid/Grid';
import type { EnemyDef } from './EnemyRegistry';
import { applyResistance, DamageType } from '../DamageType';

export interface EnemySnapshot {
  id: string;
  waveNumber?: number;
  pos: { x: number; y: number };
  wpIndex: number;
  hp: number;
  maxHp: number;
  shieldHp: number;
  baseSpeed: number;
  slowTimer: number;
  slowFactor: number;
  slows?: SlowEffect[];
}

interface SlowEffect {
  factor: number;
  remaining: number;
}

export class Enemy {
  dead = false;
  reachedGoal = false;
  pos: Vec2;
  private wpIndex = 0;
  hp: number;
  private maxHp: number;
  private shieldHp = 0;
  private baseSpeed: number;
  private slows: SlowEffect[] = [];
  readonly reward: number;
  readonly radius: number;
  readonly color: string;
  readonly id: string;
  readonly resist: Partial<Record<DamageType, number>> | undefined;
  readonly isBoss: boolean;

  constructor(def: EnemyDef, startPos: Vec2, waveHpMul: number, speedMul = 1, readonly waveNumber = 0) {
    this.id = def.id;
    this.color = def.color;
    this.radius = def.radius;
    this.hp = def.hp * waveHpMul;
    this.maxHp = this.hp;
    this.baseSpeed = def.speed * speedMul;
    this.reward = def.reward; // base reward; difficulty/talent multipliers applied at kill site
    this.pos = Vec2.from(startPos);
    this.resist = def.resist;
    this.isBoss = !!def.isBoss;
  }

  snapshot(): EnemySnapshot {
    const strongest = this.slows[0];
    return {
      id: this.id, waveNumber: this.waveNumber, pos: this.pos, wpIndex: this.wpIndex, hp: this.hp, maxHp: this.maxHp,
      shieldHp: this.shieldHp, baseSpeed: this.baseSpeed,
      slowTimer: strongest?.remaining ?? 0, slowFactor: strongest?.factor ?? 1,
      ...(this.slows.length > 1 ? { slows: this.slows.map(slow => ({ ...slow })) } : {}),
    };
  }

  static restore(def: EnemyDef, snapshot: EnemySnapshot, fallbackWave = 0): Enemy {
    const enemy = new Enemy(def, Vec2.from(snapshot.pos), 1, 1, snapshot.waveNumber ?? fallbackWave);
    enemy.wpIndex = snapshot.wpIndex;
    enemy.hp = snapshot.hp;
    enemy.maxHp = snapshot.maxHp;
    enemy.shieldHp = snapshot.shieldHp;
    enemy.baseSpeed = snapshot.baseSpeed;
    for (const slow of snapshot.slows ?? [{ factor: snapshot.slowFactor, remaining: snapshot.slowTimer }]) {
      enemy.applySlow(slow.factor, slow.remaining);
    }
    return enemy;
  }

  applySlow(factor: number, duration: number): void {
    if (duration <= 0 || factor >= 1) return;
    const existing = this.slows.find(slow => slow.factor === factor);
    if (existing) existing.remaining = Math.max(existing.remaining, duration);
    else {
      this.slows.push({ factor, remaining: duration });
      this.slows.sort((a, b) => a.factor - b.factor);
    }
  }

  private movementSeconds(dt: number): number {
    let effective = dt;
    let covered = 0;
    let active = 0;
    for (const slow of this.slows) {
      const seconds = Math.min(dt, slow.remaining);
      if (seconds > covered) {
        effective -= (1 - slow.factor) * (seconds - covered);
        covered = seconds;
      }
      slow.remaining -= dt;
      if (slow.remaining > 1e-9) this.slows[active++] = slow;
    }
    this.slows.length = active;
    return Math.max(0, effective);
  }

  update(dt: number, grid: Grid): void {
    if (this.dead || this.reachedGoal) return;
    let remaining = this.baseSpeed * (this.slows.length ? this.movementSeconds(dt) : dt);
    while (this.wpIndex < grid.waypoints.length) {
      const target = grid.waypoints[this.wpIndex];
      const dx = target.x - this.pos.x;
      const dy = target.y - this.pos.y;
      const distance = dx === 0 ? Math.abs(dy) : dy === 0 ? Math.abs(dx) : Math.hypot(dx, dy);
      if (distance > remaining) {
        if (remaining > 0) {
          const ratio = remaining / distance;
          this.pos = new Vec2(this.pos.x + dx * ratio, this.pos.y + dy * ratio);
        }
        return;
      }
      remaining -= distance;
      this.pos = target;
      this.wpIndex++;
    }
    this.reachedGoal = true;
    this.dead = true;
  }

  takeDamage(d: number, type: DamageType = DamageType.Physical): number {
    const rawDamage = this.resist ? applyResistance(d, type, this.resist) : d;
    let remaining = rawDamage;
    let dealt = 0;

    if (this.shieldHp > 0) {
      const absorbed = Math.min(this.shieldHp, remaining);
      this.shieldHp -= absorbed;
      remaining -= absorbed;
      dealt += absorbed;
    }

    const hpDamage = Math.min(this.hp, remaining);
    this.hp -= hpDamage;
    dealt += hpDamage;

    if (this.hp <= 0) this.dead = true;
    return dealt;
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
    return this.slows.length > 0;
  }

  get nextWaypointIndex(): number { return this.wpIndex; }

  progressRemaining(grid: Grid): number {
    const waypoint = grid.waypoints[this.wpIndex];
    return waypoint ? this.pos.dist(waypoint) + grid.distanceToGoal[this.wpIndex] : 0;
  }
}
