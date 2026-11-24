// Tower context panel: shown when a placed tower is selected.
// Desktop uses a compact floating panel; mobile uses a bottom drawer with larger tap targets.

import type { FocusRegion } from './ControlFocus';
import { Renderer } from '../engine/Renderer';
import type { Tower } from '../game/towers/Tower';
import { t } from '../utils/i18n';
import { towerName } from '../utils/displayText';
import { BOT_H, battleTopHeight } from './BattleHudLayout';
import { clampPanel, layoutFor, UI } from './Layout';
import type { BattleLayout } from './BattleLayout';

export type TowerPanelAction = 'upgrade' | 'sell' | 'target';

export class TowerPanel {
  private regions: Array<FocusRegion & { kind: TowerPanelAction }> = [];

  get focusRegions(): readonly FocusRegion[] { return this.regions; }
  private bounds: { x: number; y: number; w: number; h: number } | null = null;

  draw(r: Renderer, tower: Tower, gold: number, sx: number, sy: number, tools: BattleLayout['tools']): void {
    this.regions = [];
    if (r.width < 760 || r.height < 500) this.drawMobileDrawer(r, tower, gold, tools);
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
    const y = Math.max(battleTopHeight(r.width), Math.min(r.height - BOT_H - h - layout.gap, clamped.y));
    this.bounds = { x, y, w, h };

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
    const btnH = 20;
    const upX = x + w - btnW - 12;
    const upY = y + 24;
    const sellY = y + 47;
    this.drawUpgradeButton(r, upX, upY, btnW, btnH, up, gold, 10);
    this.drawSellButton(r, upX, sellY, btnW, btnH, tower.sellValue, 10);
    this.drawTargetButton(r, upX, y + 70, btnW, btnH, tower.strategy, 10);
  }

  private drawMobileDrawer(r: Renderer, tower: Tower, gold: number, tools: BattleLayout['tools']): void {
    const layout = layoutFor(r);
    const margin = layout.safe;
    const shopY = r.height - BOT_H;
    const right = tools.dy > 0 ? tools.x - margin : r.width;
    const bottom = tools.dy === 0 && tools.y < shopY ? tools.y : shopY;
    const w = Math.min(440, right - margin * 2);
    const h = 90;
    const x = (right - w) / 2;
    const y = Math.max(battleTopHeight(r.width), bottom - h - layout.gap);
    this.bounds = { x, y, w, h };
    const levelText = t('tower.level').replace('{level}', String(tower.level));

    r.setShadow('rgba(0, 0, 0, 0.52)', 18, 0, 6);
    r.roundRect(x, y, w, h, layout.radius, 'rgba(15, 23, 42, 0.96)', true, 'rgba(148, 163, 184, 0.14)', 1.5);
    r.clearShadow();
    r.roundRect(x, y, 4, h, 2, tower.def.color, true);

    r.text(`${towerName(tower.def.id, tower.def.name)} ${levelText}`, x + 16, y + 10, UI.color.text, 14, 'left', 'bold', 'top', 'header');
    r.text(`${t('tower.damage')} ${Math.round(tower.damage)}   ${t('tower.range')} ${Math.round(tower.range)}   ${t('tower.rate')} ${tower.fireRate.toFixed(1)}/s`, x + 16, y + 32, UI.color.textMuted, layout.isCompact ? 9.5 : 10.5, 'left', 'bold', 'top', 'header');

    const btnGap = layout.gap;
    const btnW = (w - 32 - 2 * btnGap) / 3;
    const btnH = 38;
    const btnY = y + h - btnH - 7;
    const upX = x + 16;
    const sellX = upX + btnW + btnGap;
    this.drawUpgradeButton(r, upX, btnY, btnW, btnH, tower.nextUpgrade, gold, 12);
    this.drawSellButton(r, sellX, btnY, btnW, btnH, tower.sellValue, 12);
    this.drawTargetButton(r, sellX + btnW + btnGap, btnY, btnW, btnH, tower.strategy, 11);
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
    this.regions.push({ x, y, w, h, kind: 'upgrade', label });
  }

  private drawSellButton(r: Renderer, x: number, y: number, w: number, h: number, sellValue: number, fontSize: number): void {
    const grad = r.linearGradient(x, y, x, y + h, [{ offset: 0, color: UI.color.red }, { offset: 1, color: '#b91c1c' }]);
    r.roundRect(x, y, w, h, 8, grad, true, UI.color.red, 1);
    r.text(t('tower.sell').replace('{value}', String(sellValue)), x + w / 2, y + h / 2, '#ffffff', fontSize, 'center', 'bold', 'middle', 'header');
    this.regions.push({ x, y, w, h, kind: 'sell', label: t('tower.sell').replace('{value}', String(sellValue)) });
  }

  private drawTargetButton(r: Renderer, x: number, y: number, w: number, h: number, strategy: Tower['strategy'], fontSize: number): void {
    r.roundRect(x, y, w, h, 8, '#1e293b', true, '#475569');
    r.text(t(`target.${strategy}`), x + w / 2, y + h / 2, UI.color.text, fontSize, 'center', 'bold', 'middle', 'header', w - 8);
    this.regions.push({ x, y, w, h, kind: 'target', label: t('controls.target').replace('{priority}', t(`target.${strategy}`)) });
  }

  hit(px: number, py: number): TowerPanelAction | null {
    for (const b of this.regions) {
      if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return b.kind;
    }
    return null;
  }

  contains(px: number, py: number): boolean {
    const bounds = this.bounds;
    return bounds !== null && px >= bounds.x && px <= bounds.x + bounds.w && py >= bounds.y && py <= bounds.y + bounds.h;
  }

  clear(): void {
    this.regions.length = 0;
    this.bounds = null;
  }
}
