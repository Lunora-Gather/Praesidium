// Unified input: mouse + touch + keyboard, with click/tap dedup.

export class Input {
  private readonly keys = new Set<string>();
  private readonly justPressedKeys = new Set<string>();
  private mouseDown = false;
  pointerX = 0;
  pointerY = 0;
  private readonly queuedClicks: Array<{ x: number; y: number }> = [];

  constructor(private readonly canvas: HTMLCanvasElement) {
    canvas.addEventListener('mousemove', this.onMove);
    canvas.addEventListener('mousedown', this.onDown);
    window.addEventListener('mouseup', this.onUp);
    canvas.addEventListener('touchstart', this.onTouch, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  /** Poll and clear per-frame transient state. Call once per frame before update. */
  endFrame(): void {
    this.justPressedKeys.clear();
    this.queuedClicks.length = 0;
  }

  isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }

  wasKeyPressed(code: string): boolean {
    return this.justPressedKeys.has(code);
  }

  isMouseDown(): boolean {
    return this.mouseDown;
  }

  /** Clicks queued during the frame (mouse + touch unified). */
  clicks(): readonly { x: number; y: number }[] {
    return this.queuedClicks;
  }

  private addClick(x: number, y: number): void {
    this.queuedClicks.push({ x, y });
  }

  private readonly onMove = (e: MouseEvent): void => {
    const r = this.canvas.getBoundingClientRect();
    this.pointerX = e.clientX - r.left;
    this.pointerY = e.clientY - r.top;
  };

  private readonly onDown = (e: MouseEvent): void => {
    if (e.button !== 0) return; // left-click only
    this.mouseDown = true;
    const r = this.canvas.getBoundingClientRect();
    this.addClick(e.clientX - r.left, e.clientY - r.top);
  };

  private readonly onUp = (): void => {
    this.mouseDown = false;
  };

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (!this.keys.has(e.code)) this.justPressedKeys.add(e.code);
    this.keys.add(e.code);
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private touchToCanvas(t: Touch): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }

  private readonly onTouch = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const p = this.touchToCanvas(e.touches[0]);
      this.pointerX = p.x;
      this.pointerY = p.y;
      this.mouseDown = true;
      // do NOT addClick here — tap fires on touchend (matches desktop click semantics:
      // down+up). this lets touchmove drive the hover/placement preview.
    }
  };

  private readonly onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const p = this.touchToCanvas(e.touches[0]);
      this.pointerX = p.x;
      this.pointerY = p.y;
    }
  };

  private readonly onTouchEnd = (): void => {
    // fire the click now that the tap is complete (pointer already at last move position)
    this.addClick(this.pointerX, this.pointerY);
    this.mouseDown = false;
  };

  dispose(): void {
    this.canvas.removeEventListener('mousemove', this.onMove);
    this.canvas.removeEventListener('mousedown', this.onDown);
    window.removeEventListener('mouseup', this.onUp);
    this.canvas.removeEventListener('touchstart', this.onTouch);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
