// Full-screen overlays: main menu, pause, victory, defeat.
// Simple centered text + a primary action button. Click handling delegated to caller.

import { Renderer } from '../engine/Renderer';
import { t } from '../utils/i18n';

export type MenuClickAction = 'start' | 'endless' | 'challenge' | 'resume' | 'restart' | 'menu' | null;

export class Screens {
  private regions: Array<{ x: number; y: number; w: number; h: number; action: MenuClickAction }> = [];

  draw(r: Renderer, kind: 'menu' | 'paused' | 'won' | 'lost', score = 0, seed = 0): void {
    this.regions = [];
    r.rect(0, 0, r.width, r.height, '#0a0e14cc');
    const cx = r.width / 2;

    const titleKey = kind === 'menu' ? 'app.title' : kind === 'paused' ? 'hud.pause' : kind === 'won' ? 'win.title' : 'lose.title';
    const titleColor = kind === 'won' ? '#81c784' : kind === 'lost' ? '#e57373' : '#8ab4f8';
    r.text(t(titleKey), cx, r.height / 2 - 80, titleColor, 48, 'center');

    if (kind === 'won' || kind === 'lost') {
      r.text(`${t('hud.score')}: ${score}`, cx, r.height / 2 - 20, '#fff', 22, 'center');
      // shareable endless seed on defeat — challenge a friend to survive longer
      if (kind === 'lost' && seed !== 0) {
        const seedHex = seed.toString(16).toUpperCase().padStart(8, '0');
        r.text(`${t('menu.endless')} SEED: ${seedHex}`, cx, r.height / 2 + 6, '#ce93d8', 16, 'center');
      }
    }
    if (kind === 'menu') {
      r.text(t('app.tagline'), cx, r.height / 2 - 20, '#9aa0a6', 16, 'center');
    }

    const btnW = 200;
    const btnH = 48;
    const btnX = cx - btnW / 2;
    const btnY = r.height / 2 + 20;
    const labelKey = kind === 'menu' ? 'menu.start' : kind === 'paused' ? 'menu.resume' : kind === 'won' ? 'menu.retry' : 'menu.retry';
    const action: MenuClickAction =
      kind === 'menu' ? 'start' : kind === 'paused' ? 'resume' : 'restart';
    r.rect(btnX, btnY, btnW, btnH, '#1f6feb', true);
    r.text(t(labelKey), cx, btnY + 15, '#fff', 18, 'center');
    this.regions.push({ x: btnX, y: btnY, w: btnW, h: btnH, action });

    // endless-mode secondary button (menu only)
    if (kind === 'menu') {
      const eY = btnY + btnH + 12;
      r.rect(btnX, eY, btnW, 40, '#6a1b9a', true);
      r.text(t('menu.endless'), cx, eY + 12, '#fff', 15, 'center');
      this.regions.push({ x: btnX, y: eY, w: btnW, h: 40, action: 'endless' });
      // challenge seed — replay a friend's endless run from its seed number
      const cY = eY + 40 + 12;
      r.rect(btnX, cY, btnW, 36, '#374151', true);
      r.text(t('menu.challenge'), cx, cY + 10, '#fff', 14, 'center');
      this.regions.push({ x: btnX, y: cY, w: btnW, h: 36, action: 'challenge' });
    }

    if (kind !== 'menu') {
      const mY = btnY + btnH + 12;
      r.rect(btnX, mY, btnW, 36, '#374151', true);
      r.text(t('hud.menu'), cx, mY + 10, '#fff', 14, 'center');
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
