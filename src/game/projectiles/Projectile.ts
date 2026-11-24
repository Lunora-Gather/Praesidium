// Projectile with damage type (for resistance calc) + upgraded damage + trail.

import { Vec2, type Vec2Like } from '../../engine/math/Vec2';
import type { Enemy } from '../enemies/Enemy';
import type { TowerDef } from '../towers/TowerRegistry';
import { DamageType } from '../DamageType';

export interface ProjectileSnapshot {
  towerId: string;
  targetIndex: number | null;
  pos: Vec2Like;
  vel: Vec2Like;
  damage: number;
  life: number;
  trail: Vec2Like[];
  trailTimer: number;
}

export class Projectile {
  dead = false;
  pos: Vec2;
  readonly target: Enemy | null;
  private readonly towerId: string;
  readonly damage: number;
  readonly damageType: DamageType;
  readonly speed: number;
  private life: number;
  readonly splash: number | undefined;
  readonly slow: { factor: number; duration: number } | undefined;
  readonly chain: TowerDef['chain'];
  readonly color: string;
  private vel = new Vec2(0, 0);
  /** Trail positions for rendering a fading tail behind the projectile. */
  readonly trail: Vec2[] = [];
  private trailTimer = 0;

  constructor(origin: Vec2Like, target: Enemy | null, def: TowerDef, damageOverride?: number) {
    this.pos = Vec2.from(origin);
    this.target = target;
    this.towerId = def.id;
    this.damage = damageOverride ?? def.damage;
    this.damageType = def.damageType;
    this.speed = def.projectileSpeed;
    this.life = def.projectileLife;
    this.splash = def.splash;
    this.slow = def.slow;
    this.chain = def.chain;
    this.color = def.color;
  }

  snapshot(enemyIndexes: ReadonlyMap<Enemy, number>): ProjectileSnapshot {
    return {
      towerId: this.towerId, targetIndex: this.target ? enemyIndexes.get(this.target) ?? null : null,
      pos: this.pos, vel: this.vel, damage: this.damage, life: this.life,
      trail: [...this.trail], trailTimer: this.trailTimer,
    };
  }

  static restore(def: TowerDef, target: Enemy | null, snapshot: ProjectileSnapshot): Projectile {
    const projectile = new Projectile(snapshot.pos, target, def, snapshot.damage);
    projectile.vel = Vec2.from(snapshot.vel);
    projectile.life = snapshot.life;
    projectile.trail.push(...snapshot.trail.map(Vec2.from));
    projectile.trailTimer = snapshot.trailTimer;
    return projectile;
  }

  update(dt: number): void {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    if (!this.target || this.target.dead) {
      this.pos = new Vec2(this.pos.x + this.vel.x * dt, this.pos.y + this.vel.y * dt);
    } else {
      const dx = this.target.pos.x - this.pos.x;
      const dy = this.target.pos.y - this.pos.y;
      const distance = Math.hypot(dx, dy);
      this.vel = distance > 0 ? new Vec2(dx * this.speed / distance, dy * this.speed / distance) : Vec2.zero;
      this.pos = distance <= this.speed * dt
        ? this.target.pos
        : new Vec2(this.pos.x + this.vel.x * dt, this.pos.y + this.vel.y * dt);
    }
    // record trail every few ms
    this.trailTimer += dt;
    if (this.trailTimer >= 0.02) {
      this.trailTimer = 0;
      this.trail.push(Vec2.from(this.pos));
      if (this.trail.length > 8) this.trail.shift();
    }
  }
}
