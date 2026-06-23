// Particle system: ephemeral visual effects (explosions, sparks, death bursts,
// floating damage/gold text). Pool-friendly: particles mutate in place.

import { Vec2 } from '../../engine/math/Vec2';
import type { Renderer } from '../../engine/Renderer';

export interface Particle {
  pos: Vec2;
  vel: Vec2;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  dead: boolean;
}

export interface FloatText {
  pos: Vec2;
  text: string;
  life: number;
  maxLife: number;
  color: string;
  dead: boolean;
}

export class ParticleSystem {
  private readonly particles: Particle[] = [];
  private readonly floats: FloatText[] = [];

  /** Burst `count` particles from `origin` with given color/speed. */
  burst(origin: Vec2, count: number, color: string, speed = 120, life = 0.5, size = 3): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.5 + Math.random() * 0.5);
      this.particles.push({
        pos: Vec2.from(origin),
        vel: Vec2.fromAngle(a, s),
        life,
        maxLife: life,
        color,
        size,
        dead: false,
      });
    }
  }

  /** Hit spark — small directional flash. */
  hit(pos: Vec2, color: string): void {
    this.burst(pos, 5, color, 80, 0.25, 2);
  }

  /** Death explosion — bigger, longer. */
  death(pos: Vec2, color: string): void {
    this.burst(pos, 12, color, 160, 0.7, 4);
  }

  /** Floating text — damage numbers, gold rewards, etc. */
  floatText(pos: Vec2, text: string, color = '#fff', life = 0.8): void {
    this.floats.push({
      pos: Vec2.from(pos),
      text,
      life,
      maxLife: life,
      color,
      dead: false,
    });
  }

  update(dt: number): void {
    for (const p of this.particles) {
      if (p.dead) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.dead = true;
        continue;
      }
      p.pos = p.pos.add(p.vel.mul(dt));
      p.vel = p.vel.mul(0.92); // drag
    }
    // compact particles
    let w = 0;
    for (let r = 0; r < this.particles.length; r++) {
      if (!this.particles[r].dead) {
        if (w !== r) this.particles[w] = this.particles[r];
        w++;
      }
    }
    this.particles.length = w;

    // update floating text (drift upward, fade)
    for (const f of this.floats) {
      if (f.dead) continue;
      f.life -= dt;
      if (f.life <= 0) {
        f.dead = true;
        continue;
      }
      f.pos = new Vec2(f.pos.x, f.pos.y - 40 * dt); // drift up
    }
    // compact floats
    let fw = 0;
    for (let r = 0; r < this.floats.length; r++) {
      if (!this.floats[r].dead) {
        if (fw !== r) this.floats[fw] = this.floats[r];
        fw++;
      }
    }
    this.floats.length = fw;
  }

  draw(r: Renderer): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      r.ctx.globalAlpha = alpha;
      r.circle(p.pos, p.size, p.color);
    }
    // draw floating text
    for (const f of this.floats) {
      const alpha = Math.max(0, f.life / f.maxLife);
      r.ctx.globalAlpha = alpha;
      r.text(f.text, f.pos.x, f.pos.y, f.color, 13, 'center');
    }
    r.ctx.globalAlpha = 1;
  }

  clear(): void {
    this.particles.length = 0;
    this.floats.length = 0;
  }
}
