// CSS-pixel offsets keep recoil consistent across board scales and refresh rates.
const DURATION = 280;
const STILL = { x: 0, y: 0 };
export const HEAVY_IMPACT = 8;
export const TOUCH_SHAKE_SCALE = 0.55;

export class CameraShake {
  private started = -Infinity;
  private intensity = 0;
  private readonly position = { x: 0, y: 0 };

  get endsAt(): number { return this.started + DURATION; }

  trigger(intensity: number, now: number): void {
    if (intensity <= 0 || (now - this.started < 135 && intensity <= this.intensity)) return;
    this.intensity = intensity;
    this.started = now;
  }

  reset(): void { this.started = -Infinity; }

  sample(now: number): Readonly<typeof STILL> {
    const age = Math.max(0, now - this.started);
    if (age >= DURATION) return STILL;
    const remaining = 1 - age / DURATION;
    const phase = age * 0.081;
    const amount = this.intensity * remaining * remaining;
    this.position.x = Math.sin(phase) * amount;
    this.position.y = Math.sin(phase * .79 + .4) * amount * .54;
    return this.position;
  }
}
