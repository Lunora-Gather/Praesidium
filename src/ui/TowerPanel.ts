// Tower context panel: shown when a placed tower is selected.
// Desktop uses a compact floating panel; mobile uses a bottom drawer with larger tap targets.

import { Renderer } from '../engine/Renderer';
import type { Tower } from '../game/towers/Tower';
import { t } from '../utils/i18n';
import { towerName } from '../utils/displayText';
import { BOT_H } from './HUD';
import { clampPanel, layoutFor, UI } from './Layout';

export type TowerPanelAction = 'upgrade' | 'sell';

export class TowerPanel {
  private regions: Array<{ x: number; y: number; w: number; h: number; kind: TowerPanelAction }> = [];

  draw(r: Renderer, tower: Tower, gold: number, sx: number, sy: number): void {
    this.regions = [];
    if (r.width < 760) this.drawMobileDrawer(r, tower, gold);
    else this.drawFloatingPanel(r, tower, gold, sx, sy);
  }

  private drawFloatingPanel(r: Renderer, tower: Tower, gold: number, sx: number, sy: number): void {
    const layout = layoutFor(r);
    const w = 192;
    const h = 96;
    const preferredX = sx - w / 2;
    const preferredY = sy - tower.def.radius - layout.gap - h;
    const clamped = clampPanel(preferredX, preferredY, w, h, r, layout.safe);
    const x = clamped.x;
    const y = Math.max(56, clamped.y);

    r.setShadow('rgba(0, 0, 0, 0.42)', 14, 0, 4);
    r.roundRect(x, y, w, h, layout.radius - 4, 'rgba(15, 23, 42, 0.95)', true, 'rgba(255, 255, 255, 0.08)', 1.5);
    r.clearShadow();
    r.roundRect(x, y, 4, h, 2, tower.def.color, true);

    const levelText = t('tower.level').replace('{level}', String(tower.level));
    r.text(`${towerName(tower.def.id, tower.def.name)} ${levelText}`, x + 12, y + 8, UI.color.text, 13, 'left', 'bold', 'top', 'header');
    r.text(`${t('tower.damage')} ${Math.round(tower.damage)}`, x + 12, y + 28, UI.color.textMuted, 11, 'left', 'bold', 'top', 'header');
    r.text(`${t('tower.range')} ${Math.round(tower.range)}`, x + 12, y + 45, UI.color.textMuted, 11, 'left', 'bold', 'top', 'header');
    r.text(`${t('tower.rate')} ${tower.fireRate.toFixed(1)}/s`, x + 12, y + 62, UI.color.textMuted, 11, 'left', 'bold', 'top', 'header');

    const up = tower.nextUpgrade;
    const btnW = 74;
    const btnH = 26;
    const upX = x + w - btnW - 12;
    const upY = y + 24;
    const sellY = y + 56;
    this.drawUpgradeButton(r, upX, upY, btnW, btnH, up, gold, 10);
    this.drawSellButton(r, upX, sellY, btnW, btnH, tower.sellValue, 10);
  }

  private drawMobileDrawer(r: Renderer, tower: Tower, gold: number): void {
    const layout = layoutFor(r);
    const margin = layout.safe;
    const w = r.width - margin * 2;
    const h = layout.isCompact ? 102 : 112;
    const x = margin;
    const y = Math.max(56, r.height - BOT_H - h - layout.gap);
    const levelText = t('tower.level').replace('{level}', String(tower.level));

    r.setShadow('rgba(0, 0, 0, 0.52)', 18, 0, 6);
    r.roundRect(x, y, w, h, layout.radius, 'rgba(15, 23, 42, 0.96)', true, 'rgba(148, 163, 184, 0.14)', 1.5);
    r.clearShadow();
    r.roundRect(x, y, 4, h, 2, tower.def.color, true);

    r.text(`${towerName(tower.def.id, tower.def.name)} ${levelText}`, x + 16, y + 10, UI.color.text, 14, 'left', 'bold', 'top', 'header');
    r.text(`${t('tower.damage')} ${Math.round(tower.damage)}   ${t('tower.range')} ${Math.round(tower.range)}   ${t('tower.rate')} ${tower.fireRate.toFixed(1)}/s`, x + 16, y + 32, UI.color.textMuted, layout.isCompact ? 9.5 : 10.5, 'left', 'bold', 'top', 'header');

    const btnGap = layout.gap;
    const btnW = (w - 32 - btnGap) / 2;
    const btnH = layout.isCompact ? 34 : 38;
    const btnY = y + h - btnH - 12;
    const upX = x + 16;
    const sellX = upX + btnW + btnGap;
    this.drawUpgradeButton(r, upX, btnY, btnW, btnH, tower.nextUpgrade, gold, 12);
    this.drawSellButton(r, sellX, btnY, btnW, btnH, tower.sellValue, 12);
  }

  private drawUpgradeButton(r: Renderer, x: number, y: number, w: number, h: number, up: Tower['nextUpgrade'], gold: number, fontSize: number): void {
    const canUp = up !== null && gold >= up.cost;
    const grad = canUp
      ? r.linearGradient(x, y, x, y + h, [{ offset: 0, color: UI.color.blue }, { offset: 1, color: '#1d4ed8' }])
      : r.linearGradient(x, y, x, y + h, [{ offset: 0, color: '#334155' }, { offset: 1, color: '#1e293b' }]);
    const border = canUp ? UI.color.blue : 'rgba(255, 255, 255, 0.08)';
    r.roundRect(x, y, w, h, 8, grad, true, border, 1);
    const label = up ? t('tower.upgrade').replace('{cost}', String(up.cost)) : t('common.maxed');
    r.text(label, x + w / 2, y + h / 2, canUp ? '#ffffff' : UI.color.textDim, fontSize, 'center', 'bold', 'middle', 'header');
    this.regions.push({ x, y, w, h, kind: 'upgrade' });
  }

  private drawSellButton(r: Renderer, x: number, y: number, w: number, h: number, sellValue: number, fontSize: number): void {
    const grad = r.linearGradient(x, y, x, y + h, [{ offset: 0, color: UI.color.red }, { offset: 1, color: '#b91c1c' }]);
    r.roundRect(x, y, w, h, 8, grad, true, UI.color.red, 1);
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
