// Particle system: ephemeral visual effects (explosions, sparks, death bursts).
// Pool-friendly: particles mutate in place, swept by dead flag.

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

export class ParticleSystem {
  private readonly particles: Particle[] = [];

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
    // compact
    let w = 0;
    for (let r = 0; r < this.particles.length; r++) {
      if (!this.particles[r].dead) {
        if (w !== r) this.particles[w] = this.particles[r];
        w++;
      }
    }
    this.particles.length = w;
  }

  draw(r: Renderer): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      r.ctx.globalAlpha = alpha;
      r.circle(p.pos, p.size, p.color);
    }
    r.ctx.globalAlpha = 1;
  }

  clear(): void {
    this.particles.length = 0;
  }
}
