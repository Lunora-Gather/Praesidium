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
    const h = 90;
    let x = sx - w / 2;
    let y = sy - t.def.radius - 12 - h;
    x = Math.max(8, Math.min(r.width - w - 8, x));
    y = Math.max(56, Math.min(r.height - h - 8, y));

    // Shadow glow for the context card
    r.setShadow('rgba(0, 0, 0, 0.4)', 12, 0, 4);
    // Draw Glass card
    r.roundRect(x, y, w, h, 10, 'rgba(15, 23, 42, 0.95)', true, 'rgba(255, 255, 255, 0.08)', 1.5);
    r.clearShadow();

    r.text(`${t.def.name} L${t.level}`, x + 12, y + 8, '#ffffff', 13, 'left', 'bold');
    r.text(`DMG ${Math.round(t.damage)}`, x + 12, y + 26, '#94a3b8', 11, 'left', 'bold');
    r.text(`RNG ${Math.round(t.range)}`, x + 12, y + 42, '#94a3b8', 11, 'left', 'bold');
    r.text(`ROF ${t.fireRate.toFixed(1)}/s`, x + 12, y + 58, '#94a3b8', 11, 'left', 'bold');

    const up = t.nextUpgrade;
    const btnW = 68;
    const btnH = 24;
    const upX = x + w - btnW - 12;
    const upY = y + 22;
    const sellY = y + 50;
    const canUp = up !== null && gold >= up.cost;

    let upGrad: CanvasGradient;
    let upBorder: string;
    if (canUp) {
      upGrad = r.linearGradient(upX, upY, upX, upY + btnH, [
        { offset: 0, color: '#3b82f6' },
        { offset: 1, color: '#1d4ed8' }
      ]);
      upBorder = '#3b82f6';
    } else {
      upGrad = r.linearGradient(upX, upY, upX, upY + btnH, [
        { offset: 0, color: '#334155' },
        { offset: 1, color: '#1e293b' }
      ]);
      upBorder = 'rgba(255, 255, 255, 0.08)';
    }

    r.roundRect(upX, upY, btnW, btnH, 6, upGrad, true, upBorder, 1);
    r.text(up ? `Up ${up.cost}g` : 'MAX', upX + btnW / 2, upY + 6, canUp ? '#ffffff' : '#64748b', 10, 'center', 'bold');
    this.regions.push({ x: upX, y: upY, w: btnW, h: btnH, kind: 'upgrade' });

    const sellGrad = r.linearGradient(upX, sellY, upX, sellY + btnH, [
      { offset: 0, color: '#ef4444' },
      { offset: 1, color: '#b91c1c' }
    ]);
    r.roundRect(upX, sellY, btnW, btnH, 6, sellGrad, true, '#ef4444', 1);
    r.text(`Sell ${t.sellValue}g`, upX + btnW / 2, sellY + 6, '#ffffff', 10, 'center', 'bold');
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
