// Tower context panel: shown when a placed tower is selected.
// Offers Upgrade (with cost) and Sell (with refund). Draws in screen space.

import { Renderer } from '../engine/Renderer';
import type { Tower } from '../game/towers/Tower';

export type TowerPanelAction = 'upgrade' | 'sell';

export class TowerPanel {
  private regions: Array<{ x: number; y: number; w: number; h: number; kind: TowerPanelAction }> = [];

  /** Draw panel anchored at screen-space center (sx, sy). */
  draw(r: Renderer, t: Tower, gold: number, sx: number, sy: number): void {
    this.regions = [];
    const w = 180;
    const h = 96;
    let x = sx - w / 2;
    let y = sy - t.def.radius - 12 - h;
    x = Math.max(8, Math.min(r.width - w - 8, x));
    y = Math.max(56, Math.min(r.height - h - 8, y));

    r.rect(x, y, w, h, '#111827dd', true);
    r.rect(x, y, w, h, '#3a506b', false);
    r.text(`${t.def.name} L${t.level}`, x + 10, y + 8, '#fff', 13);
    r.text(`DMG ${Math.round(t.damage)}`, x + 10, y + 28, '#9aa0a6', 11);
    r.text(`RNG ${Math.round(t.range)}`, x + 10, y + 44, '#9aa0a6', 11);
    r.text(`ROF ${t.fireRate.toFixed(1)}/s`, x + 10, y + 60, '#9aa0a6', 11);

    const up = t.nextUpgrade;
    const btnW = 70;
    const btnH = 28;
    const upX = x + w - btnW - 8;
    const upY = y + 24;
    const sellY = y + 60;
    const canUp = up !== null && gold >= up.cost;
    r.rect(upX, upY, btnW, btnH, canUp ? '#1f6feb' : '#374151', true);
    r.text(up ? `Up ${up.cost}g` : 'MAX', upX + btnW / 2, upY + 8, canUp ? '#fff' : '#666', 11, 'center');
    this.regions.push({ x: upX, y: upY, w: btnW, h: btnH, kind: 'upgrade' });

    r.rect(upX, sellY, btnW, btnH, '#b71c1c', true);
    r.text(`Sell ${t.sellValue}g`, upX + btnW / 2, sellY + 8, '#fff', 11, 'center');
    this.regions.push({ x: upX, y: sellY, w: btnW, h: btnH, kind: 'sell' });
  }

  hit(px: number, py: number): TowerPanelAction | null {
    for (const b of this.regions) {
      if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return b.kind;
    }
    return null;
  }

  clear(): void {
    this.regions.length = 0;
  }
}
