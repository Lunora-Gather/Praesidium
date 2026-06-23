// Canvas 2D drawing primitives + camera. Keeps render code terse.

import { Vec2 } from './math/Vec2';

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  width = 0;
  height = 0;
  // camera offset (world->screen). Identity by default.
  camX = 0;
  camY = 0;
  zoom = 1;

  constructor(public readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.resize();
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  clear(color = '#0a0e14'): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  toScreen(p: Vec2): Vec2 {
    return new Vec2((p.x - this.camX) * this.zoom, (p.y - this.camY) * this.zoom);
  }

  circle(p: Vec2, r: number, color: string, fill = true): void {
    const s = this.toScreen(p);
    this.ctx.beginPath();
    this.ctx.arc(s.x, s.y, r * this.zoom, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    if (fill) this.ctx.fill();
    else this.ctx.stroke();
  }

  rect(x: number, y: number, w: number, h: number, color: string, fill = true): void {
    const sx = (x - this.camX) * this.zoom;
    const sy = (y - this.camY) * this.zoom;
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = color;
    if (fill) this.ctx.fillRect(sx, sy, w * this.zoom, h * this.zoom);
    else this.ctx.strokeRect(sx, sy, w * this.zoom, h * this.zoom);
  }

  line(a: Vec2, b: Vec2, color: string, width = 1): void {
    const sa = this.toScreen(a);
    const sb = this.toScreen(b);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width * this.zoom;
    this.ctx.beginPath();
    this.ctx.moveTo(sa.x, sa.y);
    this.ctx.lineTo(sb.x, sb.y);
    this.ctx.stroke();
  }

  text(str: string, x: number, y: number, color = '#fff', size = 14, align: CanvasTextAlign = 'left'): void {
    this.ctx.fillStyle = color;
    this.ctx.font = `${size}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(str, (x - this.camX) * this.zoom, (y - this.camY) * this.zoom);
  }

  path(points: readonly Vec2[], color: string, width = 2): void {
    if (points.length === 0) return;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width * this.zoom;
    this.ctx.beginPath();
    const first = this.toScreen(points[0]);
    this.ctx.moveTo(first.x, first.y);
    for (let i = 1; i < points.length; i++) {
      const p = this.toScreen(points[i]);
      this.ctx.lineTo(p.x, p.y);
    }
    this.ctx.stroke();
  }
}
