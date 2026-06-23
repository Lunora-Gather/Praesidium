// Projectile with damage type (for resistance calc) + upgraded damage.

import { Vec2 } from '../../engine/math/Vec2';
import type { Enemy } from '../enemies/Enemy';
import type { TowerDef } from '../towers/TowerRegistry';
import { DamageType } from '../DamageType';

export class Projectile {
  dead = false;
  pos: Vec2;
  readonly target: Enemy;
  readonly damage: number;
  readonly damageType: DamageType;
  readonly speed: number;
  private life: number;
  readonly splash: number | undefined;
  readonly slow: { factor: number; duration: number } | undefined;
  readonly color: string;
  private vel = new Vec2(0, 0);

  constructor(origin: Vec2, target: Enemy, def: TowerDef, damageOverride?: number) {
    this.pos = Vec2.from(origin);
    this.target = target;
    this.damage = damageOverride ?? def.damage;
    this.damageType = def.damageType;
    this.speed = def.projectileSpeed;
    this.life = def.projectileLife;
    this.splash = def.splash;
    this.slow = def.slow;
    this.color = def.color;
  }

  update(dt: number): void {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    if (this.target.dead) {
      this.pos = this.pos.add(this.vel.mul(dt));
      return;
    }
    const dir = this.target.pos.sub(this.pos).normalize();
    this.vel = dir.mul(this.speed);
    this.pos = this.pos.add(this.vel.mul(dt));
  }
}
