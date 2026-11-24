export interface FocusRegion {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  board?: boolean;
  pressed?: boolean;
  disabled?: boolean;
}

const ARROWS = new Map<string, [number, number]>([
  ['ArrowUp', [0, -1]], ['ArrowDown', [0, 1]], ['ArrowLeft', [-1, 0]], ['ArrowRight', [1, 0]],
]);

export class ControlFocus {
  private readonly root = document.querySelector<HTMLDivElement>('#game-controls')!;
  private buttons: HTMLButtonElement[] = [];
  private regions: readonly FocusRegion[] = [];
  private scene = '';
  private readonly lastFocused = new Map<string, string>();

  constructor(private readonly activate: (region: FocusRegion) => void, private readonly moveBoard: (dx: number, dy: number) => void) {}

  sync(scene: string, label: string, regions: readonly FocusRegion[]): void {
    const activeButton = this.buttons.indexOf(document.activeElement as HTMLButtonElement);
    const newScene = scene !== this.scene;
    const focused = this.regions[activeButton];
    if (newScene && focused) this.lastFocused.set(this.scene, focused.board ? 'battlefield' : focused.label);
    this.regions = regions;
    if (newScene) {
      this.scene = scene;
      this.root.replaceChildren();
      this.buttons = [];
    }
    if (this.root.getAttribute('aria-label') !== label) this.root.setAttribute('aria-label', label);

    while (this.buttons.length > regions.length) this.buttons.pop()!.remove();
    for (const [index, region] of regions.entries()) {
      const button = this.buttons[index] ?? this.addButton(index);
      const geometry = `${region.x}px ${region.y}px ${region.w}px ${region.h}px`;
      if (button.dataset.geometry !== geometry) {
        button.dataset.geometry = geometry;
        button.style.left = `${region.x}px`;
        button.style.top = `${region.y}px`;
        button.style.width = `${region.w}px`;
        button.style.height = `${region.h}px`;
      }
      if (button.getAttribute('aria-label') !== region.label) button.setAttribute('aria-label', region.label);
      if (region.pressed === undefined) {
        if (button.hasAttribute('aria-pressed')) button.removeAttribute('aria-pressed');
      } else if (button.getAttribute('aria-pressed') !== String(region.pressed)) {
        button.setAttribute('aria-pressed', String(region.pressed));
      }
      if (region.disabled) {
        if (!button.hasAttribute('aria-disabled')) button.setAttribute('aria-disabled', 'true');
      } else if (button.hasAttribute('aria-disabled')) button.removeAttribute('aria-disabled');
    }
    if (activeButton >= 0 && (newScene || activeButton >= regions.length)) {
      const restore = newScene ? regions.findIndex(region => (region.board ? 'battlefield' : region.label) === this.lastFocused.get(scene)) : regions.length - 1;
      this.buttons[Math.max(0, restore)]?.focus({ preventScroll: true });
    }
  }

  private addButton(index: number): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.tabIndex = 0;
    button.addEventListener('click', () => {
      const region = this.regions[index];
      if (region && !region.disabled) this.activate(region);
    });
    button.addEventListener('keydown', event => {
      const direction = ARROWS.get(event.key);
      if (!direction || !this.regions[index]?.board) return;
      event.preventDefault();
      this.moveBoard(...direction);
    });
    this.buttons.push(button);
    this.root.append(button);
    return button;
  }
}
