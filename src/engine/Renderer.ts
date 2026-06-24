// Canvas 2D drawing primitives + camera + screen shake. Keeps render code terse.

import { Vec2 } from './math/Vec2';

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  width = 0;
  height = 0;
  // camera offset (world->screen). Identity by default.
  camX = 0;
  camY = 0;
  zoom = 1;
  // screen shake: decays over time, applied as random offset each frame
  private shakeIntensity = 0;
  private shakeDecay = 0.9;

  constructor(public readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.resize();
  }

  /** Trigger screen shake (intensity 1-20). Boss death = 12, spell = 8, wave start = 4. */
  shake(intensity: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  /** Call once per frame to decay shake. */
  updateShake(): void {
    this.shakeIntensity *= this.shakeDecay;
    if (this.shakeIntensity < 0.3) this.shakeIntensity = 0;
  }

  get shakeOffset(): { x: number; y: number } {
    if (this.shakeIntensity <= 0) return { x: 0, y: 0 };
    const a = Math.random() * Math.PI * 2;
    return { x: Math.cos(a) * this.shakeIntensity, y: Math.sin(a) * this.shakeIntensity };
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
    const { x: sx, y: sy } = this.shakeOffset;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(sx, sy, this.width, this.height);
  }

  toScreen(p: Vec2): Vec2 {
    const { x: sx, y: sy } = this.shakeOffset;
    return new Vec2(p.x * this.zoom + this.camX + sx, p.y * this.zoom + this.camY + sy);
  }

  circle(p: Vec2, r: number, color: string, fill = true): void {
    const s = this.toScreen(p);
    this.ctx.beginPath();
    this.ctx.arc(s.x, s.y, r * this.zoom, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    if (fill) this.ctx.fill();
    else this.ctx.stroke();
  }

  rect(x: number, y: number, w: number, h: number, color: string | CanvasGradient, fill = true): void {
    const sx = x * this.zoom + this.camX;
    const sy = y * this.zoom + this.camY;
    if (fill) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(sx, sy, w * this.zoom, h * this.zoom);
    } else {
      this.ctx.strokeStyle = color;
      this.ctx.strokeRect(sx, sy, w * this.zoom, h * this.zoom);
    }
  }

  roundRect(x: number, y: number, w: number, h: number, r: number, color: string | CanvasGradient, fill = true, strokeColor?: string | CanvasGradient, strokeWidth = 1): void {
    const sx = x * this.zoom + this.camX;
    const sy = y * this.zoom + this.camY;
    const sw = w * this.zoom;
    const sh = h * this.zoom;
    const sr = r * this.zoom;

    this.ctx.beginPath();
    if (typeof this.ctx.roundRect === 'function') {
      this.ctx.roundRect(sx, sy, sw, sh, sr);
    } else {
      this.ctx.moveTo(sx + sr, sy);
      this.ctx.arcTo(sx + sw, sy, sx + sw, sy + sh, sr);
      this.ctx.arcTo(sx + sw, sy + sh, sx, sy + sh, sr);
      this.ctx.arcTo(sx, sy + sh, sx, sy, sr);
      this.ctx.arcTo(sx, sy, sx + sw, sy, sr);
    }

    if (fill) {
      this.ctx.fillStyle = color;
      this.ctx.fill();
    }
    if (strokeColor) {
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = strokeWidth * this.zoom;
      this.ctx.stroke();
    }
  }

  linearGradient(x1: number, y1: number, x2: number, y2: number, stops: Array<{ offset: number; color: string }>): CanvasGradient {
    const sx1 = x1 * this.zoom + this.camX;
    const sy1 = y1 * this.zoom + this.camY;
    const sx2 = x2 * this.zoom + this.camX;
    const sy2 = y2 * this.zoom + this.camY;
    const grad = this.ctx.createLinearGradient(sx1, sy1, sx2, sy2);
    for (const stop of stops) {
      grad.addColorStop(stop.offset, stop.color);
    }
    return grad;
  }

  setShadow(color: string, blur: number, offsetX = 0, offsetY = 0): void {
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = blur * this.zoom;
    this.ctx.shadowOffsetX = offsetX * this.zoom;
    this.ctx.shadowOffsetY = offsetY * this.zoom;
  }

  clearShadow(): void {
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
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

  text(str: string, x: number, y: number, color: string | CanvasGradient = '#fff', size = 14, align: CanvasTextAlign = 'left', weight = 'normal'): void {
    this.ctx.fillStyle = color;
    this.ctx.font = `${weight} ${size}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(str, x * this.zoom + this.camX, y * this.zoom + this.camY);
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
