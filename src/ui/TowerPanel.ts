// Tower context panel: shown when a placed tower is selected.
// Desktop uses a compact floating panel; mobile uses a bottom drawer with larger tap targets.

import { Renderer } from '../engine/Renderer';
import type { Tower } from '../game/towers/Tower';
import { t } from '../utils/i18n';
import { towerName } from '../utils/displayText';
import { BOT_H } from './HUD';

export type TowerPanelAction = 'upgrade' | 'sell';

export class TowerPanel {
  private regions: Array<{ x: number; y: number; w: number; h: number; kind: TowerPanelAction }> = [];

  draw(r: Renderer, tower: Tower, gold: number, sx: number, sy: number): void {
    this.regions = [];
    if (r.width < 760) this.drawMobileDrawer(r, tower, gold);
    else this.drawFloatingPanel(r, tower, gold, sx, sy);
  }

  private drawFloatingPanel(r: Renderer, tower: Tower, gold: number, sx: number, sy: number): void {
    const w = 180;
    const h = 90;
    let x = sx - w / 2;
    let y = sy - tower.def.radius - 12 - h;
    x = Math.max(8, Math.min(r.width - w - 8, x));
    y = Math.max(56, Math.min(r.height - h - 8, y));

    r.setShadow('rgba(0, 0, 0, 0.4)', 12, 0, 4);
    r.roundRect(x, y, w, h, 10, 'rgba(15, 23, 42, 0.95)', true, 'rgba(255, 255, 255, 0.08)', 1.5);
    r.clearShadow();

    const levelText = t('tower.level').replace('{level}', String(tower.level));
    r.text(`${towerName(tower.def.id, tower.def.name)} ${levelText}`, x + 12, y + 8, '#ffffff', 13, 'left', 'bold', 'top', 'header');
    r.text(`${t('tower.damage')} ${Math.round(tower.damage)}`, x + 12, y + 26, '#94a3b8', 11, 'left', 'bold', 'top', 'header');
    r.text(`${t('tower.range')} ${Math.round(tower.range)}`, x + 12, y + 42, '#94a3b8', 11, 'left', 'bold', 'top', 'header');
    r.text(`${t('tower.rate')} ${tower.fireRate.toFixed(1)}/s`, x + 12, y + 58, '#94a3b8', 11, 'left', 'bold', 'top', 'header');

    const up = tower.nextUpgrade;
    const btnW = 68;
    const btnH = 24;
    const upX = x + w - btnW - 12;
    const upY = y + 22;
    const sellY = y + 50;
    this.drawUpgradeButton(r, upX, upY, btnW, btnH, up, gold, 10);
    this.drawSellButton(r, upX, sellY, btnW, btnH, tower.sellValue, 10);
  }

  private drawMobileDrawer(r: Renderer, tower: Tower, gold: number): void {
    const margin = 12;
    const w = r.width - margin * 2;
    const h = 108;
    const x = margin;
    const y = Math.max(56, r.height - BOT_H - h - 10);
    const levelText = t('tower.level').replace('{level}', String(tower.level));

    r.setShadow('rgba(0, 0, 0, 0.52)', 18, 0, 6);
    r.roundRect(x, y, w, h, 14, 'rgba(15, 23, 42, 0.96)', true, 'rgba(148, 163, 184, 0.14)', 1.5);
    r.clearShadow();
    r.roundRect(x, y, 4, h, 2, tower.def.color, true);

    r.text(`${towerName(tower.def.id, tower.def.name)} ${levelText}`, x + 16, y + 10, '#ffffff', 14, 'left', 'bold', 'top', 'header');
    r.text(`${t('tower.damage')} ${Math.round(tower.damage)}   ${t('tower.range')} ${Math.round(tower.range)}   ${t('tower.rate')} ${tower.fireRate.toFixed(1)}/s`, x + 16, y + 32, '#94a3b8', 10.5, 'left', 'bold', 'top', 'header');

    const btnGap = 10;
    const btnW = (w - 32 - btnGap) / 2;
    const btnH = 38;
    const btnY = y + 58;
    const upX = x + 16;
    const sellX = upX + btnW + btnGap;
    this.drawUpgradeButton(r, upX, btnY, btnW, btnH, tower.nextUpgrade, gold, 12);
    this.drawSellButton(r, sellX, btnY, btnW, btnH, tower.sellValue, 12);
  }

  private drawUpgradeButton(r: Renderer, x: number, y: number, w: number, h: number, up: Tower['nextUpgrade'], gold: number, fontSize: number): void {
    const canUp = up !== null && gold >= up.cost;
    const grad = canUp
      ? r.linearGradient(x, y, x, y + h, [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#1d4ed8' }])
      : r.linearGradient(x, y, x, y + h, [{ offset: 0, color: '#334155' }, { offset: 1, color: '#1e293b' }]);
    const border = canUp ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)';
    r.roundRect(x, y, w, h, 8, grad, true, border, 1);
    const label = up ? t('tower.upgrade').replace('{cost}', String(up.cost)) : t('common.maxed');
    r.text(label, x + w / 2, y + h / 2, canUp ? '#ffffff' : '#64748b', fontSize, 'center', 'bold', 'middle', 'header');
    this.regions.push({ x, y, w, h, kind: 'upgrade' });
  }

  private drawSellButton(r: Renderer, x: number, y: number, w: number, h: number, sellValue: number, fontSize: number): void {
    const grad = r.linearGradient(x, y, x, y + h, [{ offset: 0, color: '#ef4444' }, { offset: 1, color: '#b91c1c' }]);
    r.roundRect(x, y, w, h, 8, grad, true, '#ef4444', 1);
    r.text(t('tower.sell').replace('{value}', String(sellValue)), x + w / 2, y + h / 2, '#ffffff', fontSize, 'center', 'bold', 'middle', 'header');
    this.regions.push({ x, y, w, h, kind: 'sell' });
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
