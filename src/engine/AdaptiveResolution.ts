// Keep resolution stable through temporary stalls and resize only when a sustained sample warrants it.
export class AdaptiveResolution {
  private frames = 0;
  private windowStart = 0;
  private slowWindows = 0;
  private fastWindows = 0;
  private holdUntil = 0;
  private retryDelay = 30_000;
  pixelRatio = 2;

  reset(): void {
    this.frames = 0;
    this.slowWindows = 0;
    this.fastWindows = 0;
  }

  sample(now: number): boolean {
    if (now < this.holdUntil) return false;
    if (this.frames++ === 0) this.windowStart = now;
    const elapsed = now - this.windowStart;
    if (elapsed < 2000) return false;
    const fps = (this.frames - 1) * 1000 / elapsed;
    this.frames = 0;
    this.slowWindows = fps < 46 ? this.slowWindows + 1 : 0;
    this.fastWindows = fps >= 57 ? this.fastWindows + 1 : 0;
    if (this.pixelRatio > 1 && this.slowWindows >= 2) this.pixelRatio = 1;
    else if (this.pixelRatio < 2 && this.fastWindows >= 8) this.pixelRatio = 2;
    else return false;
    if (this.pixelRatio === 1) {
      this.holdUntil = now + this.retryDelay;
      this.retryDelay = Math.min(this.retryDelay * 3, 300_000);
    }
    this.reset();
    return true;
  }
}
