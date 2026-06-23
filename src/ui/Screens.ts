// Full-screen overlays: main menu, pause, victory, defeat.
// Simple centered text + a primary action button. Click handling delegated to caller.

import { Renderer } from '../engine/Renderer';

export type MenuClickAction = 'start' | 'resume' | 'restart' | 'menu' | null;

export class Screens {
  private regions: Array<{ x: number; y: number; w: number; h: number; action: MenuClickAction }> = [];

  draw(r: Renderer, kind: 'menu' | 'paused' | 'won' | 'lost', score = 0): void {
    this.regions = [];
    r.rect(0, 0, r.width, r.height, '#0a0e14cc'); // dim overlay
    const cx = r.width / 2;

    const title = kind === 'menu' ? 'PRAESIDIUM' : kind === 'paused' ? 'PAUSED' : kind === 'won' ? 'VICTORY' : 'DEFEAT';
    const titleColor = kind === 'won' ? '#81c784' : kind === 'lost' ? '#e57373' : '#8ab4f8';
    r.text(title, cx, r.height / 2 - 80, titleColor, 48, 'center');

    if (kind === 'won' || kind === 'lost') {
      r.text(`Score: ${score}`, cx, r.height / 2 - 20, '#fff', 22, 'center');
    }
    if (kind === 'menu') {
      r.text('A super large-scale tower defense', cx, r.height / 2 - 20, '#9aa0a6', 16, 'center');
    }

    const btnW = 200;
    const btnH = 48;
    const btnX = cx - btnW / 2;
    const btnY = r.height / 2 + 20;
    const label =
      kind === 'menu' ? 'Start' : kind === 'paused' ? 'Resume' : kind === 'won' ? 'Play Again' : 'Retry';
    const action: MenuClickAction =
      kind === 'menu' ? 'start' : kind === 'paused' ? 'resume' : 'restart';
    r.rect(btnX, btnY, btnW, btnH, '#1f6feb', true);
    r.text(label, cx, btnY + 15, '#fff', 18, 'center');
    this.regions.push({ x: btnX, y: btnY, w: btnW, h: btnH, action });

    if (kind !== 'menu') {
      const mY = btnY + btnH + 12;
      r.rect(btnX, mY, btnW, 36, '#374151', true);
      r.text('Main Menu', cx, mY + 10, '#fff', 14, 'center');
      this.regions.push({ x: btnX, y: mY, w: btnW, h: 36, action: 'menu' });
    }
  }

  hit(x: number, y: number): MenuClickAction {
    for (const b of this.regions) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.action;
    }
    return null;
  }
}
