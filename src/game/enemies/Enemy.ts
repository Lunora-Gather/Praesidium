// Enemy instance: walks waypoints, takes damage, supports slow effects.

import { Vec2 } from '../../engine/math/Vec2';
import type { Grid } from '../grid/Grid';
import type { EnemyDef } from './EnemyRegistry';

export class Enemy {
  dead = false;
  reachedGoal = false;
  pos: Vec2;
  private wpIndex = 0;
  hp: number;
  private readonly maxHp: number;
  private readonly baseSpeed: number;
  private slowTimer = 0;
  private slowFactor = 1; // multiplicative speed factor (0.5 = half speed)
  readonly reward: number;
  readonly radius: number;
  readonly color: string;
  readonly id: string;

  constructor(def: EnemyDef, startPos: Vec2, waveHpMul: number) {
    this.id = def.id;
    this.color = def.color;
    this.radius = def.radius;
    this.hp = def.hp * waveHpMul;
    this.maxHp = this.hp;
    this.baseSpeed = def.speed;
    this.reward = Math.round(def.reward * waveHpMul);
    this.pos = Vec2.from(startPos);
  }

  applySlow(factor: number, duration: number): void {
    // Only the strongest slow owns the duration; weaker slows may extend it.
    if (factor <= this.slowFactor) {
      this.slowFactor = factor;
      this.slowTimer = duration;
    } else {
      this.slowTimer = Math.max(this.slowTimer, duration);
    }
  }

  update(dt: number, grid: Grid): void {
    if (this.dead || this.reachedGoal) return;

    // tick slow
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

  takeDamage(d: number): void {
    this.hp -= d;
    if (this.hp <= 0) this.dead = true;
  }

  get hpRatio(): number {
    return Math.max(0, this.hp / this.maxHp);
  }

  get isSlowed(): boolean {
    return this.slowTimer > 0;
  }

  /** Distance remaining along waypoints (px), for tower targeting heuristics. */
  progressRemaining(grid: Grid): number {
    let total = this.pos.dist(grid.waypoints[this.wpIndex] ?? this.pos);
    for (let i = this.wpIndex; i + 1 < grid.waypoints.length; i++) {
      total += grid.waypoints[i].dist(grid.waypoints[i + 1]);
    }
    return total;
  }
}
