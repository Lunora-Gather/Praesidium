// Canvas input in CSS pixels. One primary pointer owns a press until release or cancellation.

export class Input {
  private readonly keys = new Set<string>();
  private readonly justPressedKeys = new Set<string>();
  private pointerId: number | null = null;
  private pressX = -1;
  private pressY = -1;
  private dragged = false;
  pointerX = -1;
  pointerY = -1;
  private readonly queuedClicks: Array<{ x: number; y: number; board: boolean; press?: { x: number; y: number } }> = [];

  constructor(private readonly canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onCancel);
    canvas.addEventListener('lostpointercapture', this.onCancel);
    canvas.addEventListener('pointerleave', this.onLeave);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.reset);
  }

  endFrame(): void {
    this.justPressedKeys.clear();
    this.queuedClicks.length = 0;
  }

  wasKeyPressed(code: string): boolean {
    return this.justPressedKeys.has(code);
  }

  clicks(): ReadonlyArray<(typeof this.queuedClicks)[number]> {
    return this.queuedClicks;
  }

  activateAt(x: number, y: number, board = false, press?: { x: number; y: number }): void {
    this.queuedClicks.push({ x, y, board, press });
  }

  private updatePosition(event: PointerEvent): DOMRect {
    const bounds = this.canvas.getBoundingClientRect();
    this.pointerX = event.clientX - bounds.left;
    this.pointerY = event.clientY - bounds.top;
    return bounds;
  }

  private readonly onDown = (event: PointerEvent): void => {
    if (event.pointerType === 'touch' && !event.isPrimary && this.pointerId !== null) {
      this.dragged = true;
    }
    if (!event.isPrimary || event.button !== 0 || this.pointerId !== null) return;
    this.pointerId = event.pointerId;
    this.updatePosition(event);
    this.pressX = this.pointerX;
    this.pressY = this.pointerY;
    this.dragged = false;
    if (event.isTrusted) this.canvas.setPointerCapture(event.pointerId);
  };

  private readonly onMove = (event: PointerEvent): void => {
    if (!event.isPrimary || (this.pointerId !== null && this.pointerId !== event.pointerId)) return;
    this.updatePosition(event);
    if (this.pointerId !== null && Math.hypot(this.pointerX - this.pressX, this.pointerY - this.pressY) > 12) this.dragged = true;
  };

  private readonly onUp = (event: PointerEvent): void => {
    if (this.pointerId !== event.pointerId) return;
    this.pointerId = null;
    const bounds = this.updatePosition(event);
    if (!this.dragged && Math.hypot(this.pointerX - this.pressX, this.pointerY - this.pressY) <= 12
        && this.pointerX >= 0 && this.pointerX < bounds.width && this.pointerY >= 0 && this.pointerY < bounds.height) {
      const press = event.pointerType === 'touch' ? { x: this.pressX, y: this.pressY } : undefined;
      this.activateAt(this.pointerX, this.pointerY, false, press);
    }
    if (event.pointerType === 'touch') this.clearPosition();
  };

  private readonly onCancel = (event: PointerEvent): void => {
    if (this.pointerId !== event.pointerId) return;
    this.pointerId = null;
    this.clearPosition();
  };

  private readonly onLeave = (): void => {
    if (this.pointerId === null) this.clearPosition();
  };

  private clearPosition(): void {
    this.pointerX = -1;
    this.pointerY = -1;
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    if (event.target instanceof HTMLElement) {
      if (event.target.closest('dialog, input, select, textarea, [contenteditable]')) return;
      if (event.target.closest('button') && (event.code === 'Enter' || event.code === 'Space')) return;
    }
    if (!this.keys.has(event.code) && !event.repeat) this.justPressedKeys.add(event.code);
    this.keys.add(event.code);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  cancelPointer(): void {
    this.pointerId = null;
    this.clearPosition();
    this.queuedClicks.length = 0;
  }

  private readonly reset = (): void => {
    this.cancelPointer();
    this.keys.clear();
    this.endFrame();
  };

  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onCancel);
    this.canvas.removeEventListener('lostpointercapture', this.onCancel);
    this.canvas.removeEventListener('pointerleave', this.onLeave);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.reset);
  }
}
