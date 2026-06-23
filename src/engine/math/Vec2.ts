// 2D vector math — immutable-ish, methods return new vectors.

export interface Vec2Like {
  x: number;
  y: number;
}

export class Vec2 {
  constructor(public readonly x: number, public readonly y: number) {}

  static readonly zero = new Vec2(0, 0);

  static from(v: Vec2Like): Vec2 {
    return new Vec2(v.x, v.y);
  }

  add(o: Vec2Like): Vec2 {
    return new Vec2(this.x + o.x, this.y + o.y);
  }

  sub(o: Vec2Like): Vec2 {
    return new Vec2(this.x - o.x, this.y - o.y);
  }

  mul(s: number): Vec2 {
    return new Vec2(this.x * s, this.y * s);
  }

  len(): number {
    return Math.hypot(this.x, this.y);
  }

  dist(o: Vec2Like): number {
    return Math.hypot(this.x - o.x, this.y - o.y);
  }

  distSq(o: Vec2Like): number {
    const dx = this.x - o.x;
    const dy = this.y - o.y;
    return dx * dx + dy * dy;
  }

  normalize(): Vec2 {
    const l = this.len();
    return l > 0 ? new Vec2(this.x / l, this.y / l) : Vec2.zero;
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  static fromAngle(a: number, len = 1): Vec2 {
    return new Vec2(Math.cos(a) * len, Math.sin(a) * len);
  }

  equals(o: Vec2Like): boolean {
    return this.x === o.x && this.y === o.y;
  }
}
