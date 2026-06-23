// Enemy instance: walks waypoints, takes damage, dies -> reward.

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
  private readonly speed: number;
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
    this.speed = def.speed;
    this.reward = Math.round(def.reward * waveHpMul);
    this.pos = Vec2.from(startPos);
  }

  update(dt: number, grid: Grid): void {
    if (this.dead || this.reachedGoal) return;
    if (this.wpIndex >= grid.waypoints.length) {
      this.reachedGoal = true;
      this.dead = true;
      return;
    }
    const target = grid.waypoints[this.wpIndex];
    const dir = target.sub(this.pos);
    const dist = dir.len();
    const step = this.speed * dt;
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

  /** Distance remaining along waypoints (px), for tower targeting heuristics. */
  progressRemaining(grid: Grid): number {
    let total = this.pos.dist(grid.waypoints[this.wpIndex] ?? this.pos);
    for (let i = this.wpIndex; i + 1 < grid.waypoints.length; i++) {
      total += grid.waypoints[i].dist(grid.waypoints[i + 1]);
    }
    return total;
  }
}
