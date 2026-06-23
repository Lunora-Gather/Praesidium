// Fixed-timestep game loop with render interpolation.
// Update runs at a constant tick rate; render uses accumulated alpha.

export class GameLoop {
  private readonly tickDt: number; // seconds per tick
  private accumulator = 0;
  private lastTime = 0;
  private running = false;
  private rafId = 0;

  constructor(
    private readonly update: (dt: number) => void,
    private readonly render: (alpha: number) => void,
    tickRate = 60,
  ) {
    this.tickDt = 1 / tickRate;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    const frame = (now: number) => {
      if (!this.running) return;
      let frameTime = (now - this.lastTime) / 1000;
      this.lastTime = now;
      // clamp to avoid spiral-of-death after tab switches
      if (frameTime > 0.25) frameTime = 0.25;
      this.accumulator += frameTime;
      let steps = 0;
      while (this.accumulator >= this.tickDt && steps < 5) {
        this.update(this.tickDt);
        this.accumulator -= this.tickDt;
        steps++;
      }
      const alpha = this.accumulator / this.tickDt;
      this.render(alpha);
      this.rafId = requestAnimationFrame(frame);
    };
    this.rafId = requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }
}
