// Animated starfield background for menu/victory/defeat overlays.
// Self-contained: maintains its own particle state, advances with dt, draws
// through the Renderer. Designed for instant brand impact on first screen.

import { Renderer } from '../engine/Renderer';

interface Star {
  x: number;
  y: number;
  z: number; // depth 0..1, affects size & speed
  tw: number; // twinkle phase
}

export class Starfield {
  private stars: Star[] = [];
  private lastW = 0;
  private lastH = 0;
  private time = 0;

  constructor(count = 140) {
    this.seed(count);
  }

  private seed(n: number): void {
    this.stars.length = 0;
    for (let i = 0; i < n; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        z: Math.random(),
        tw: Math.random() * Math.PI * 2,
      });
    }
  }

  update(dt: number, w: number, h: number): void {
    this.time += dt;
    if (w !== this.lastW || h !== this.lastH) {
      this.lastW = w;
      this.lastH = h;
    }
    // slow vertical drift + twinkle; no per-star branching for perf
    for (const s of this.stars) {
      s.y += dt * 0.02 * (0.3 + s.z);
      if (s.y > 1) s.y -= 1;
      s.tw += dt * 2;
    }
  }

  draw(r: Renderer): void {
    const ctx = r.ctx;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const pWidth = r.width * dpr;
    const pHeight = r.height * dpr;
    for (const s of this.stars) {
      const px = s.x * pWidth;
      const py = s.y * pHeight;
      const size = (0.5 + s.z * 1.8) * dpr;
      const twinkle = 0.5 + 0.5 * Math.sin(s.tw);
      const alpha = (0.3 + s.z * 0.6) * twinkle;
      ctx.fillStyle = `rgba(180,210,255,${alpha.toFixed(3)})`;
      ctx.fillRect(px, py, size, size);
    }
    // faint horizon glow for depth
    const grad = ctx.createLinearGradient(0, pHeight * 0.6, 0, pHeight);
    grad.addColorStop(0, 'rgba(31,111,235,0)');
    grad.addColorStop(1, 'rgba(31,111,235,0.08)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, pHeight * 0.6, pWidth, pHeight * 0.4);
    ctx.restore();
  }
}
