// Tower controls sit in a reserved area outside the board.

import type { FocusRegion } from './ControlFocus';
import { Renderer } from '../engine/Renderer';
import type { Tower } from '../game/towers/Tower';
import { t } from '../utils/i18n';
import { towerName } from '../utils/displayText';
import { UI } from './Layout';
import type { BattleLayout } from './BattleLayout';

export type TowerPanelAction = 'upgrade' | 'sell' | 'target';

export class TowerPanel {
  private regions: Array<FocusRegion & { kind: TowerPanelAction }> = [];

  get focusRegions(): readonly FocusRegion[] { return this.regions; }
  private bounds: { x: number; y: number; w: number; h: number } | null = null;

  draw(r: Renderer, tower: Tower, gold: number, box: BattleLayout['detail']): void {
    this.regions = [];
    this.bounds = box;
    if (!box.compact) r.rect(box.x, box.y, box.w, 1, '#293b4c');
    if (box.vertical) this.drawSidePanel(r, tower, gold, box);
    else this.drawMobileDrawer(r, tower, gold, box);
  }

  private drawSidePanel(r: Renderer, tower: Tower, gold: number, box: BattleLayout['detail']): void {
    const { x, y, w, h } = box;
    const titleSpace = h - (3 * 44 + 2);
    const hasName = titleSpace >= 18;
    const hasStats = h >= 203;
    if (hasName) this.drawSummary(r, tower, box, hasStats);
    const startY = y + (hasStats ? 65 : hasName ? Math.min(21, titleSpace) : 1);
    this.drawUpgradeButton(r, x + 5, startY, w - 10, 44, tower.nextUpgrade, gold, 11);
    this.drawTargetButton(r, x + 5, startY + 45, w - 10, 44, tower.strategy, 11);
    this.drawSellButton(r, x + 5, startY + 90, w - 10, 44, tower.sellValue, 11);
  }

  private drawMobileDrawer(r: Renderer, tower: Tower, gold: number, box: BattleLayout['detail']): void {
    const { x, y, w, h } = box;
    if (!box.compact) this.drawSummary(r, tower, box, w >= 294);
    const padding = box.compact ? 0 : 5;
    const gap = box.compact ? 6 : 5;
    const buttonW = (w - padding * 2 - gap * 2) / 3;
    const buttonY = box.compact ? y : y + h - 47;
    this.drawUpgradeButton(r, x + padding, buttonY, buttonW, 44, tower.nextUpgrade, gold, 11);
    this.drawTargetButton(r, x + padding + buttonW + gap, buttonY, buttonW, 44, tower.strategy, 11);
    this.drawSellButton(r, x + padding + (buttonW + gap) * 2, buttonY, buttonW, 44, tower.sellValue, 11);
  }

  private drawSummary(r: Renderer, tower: Tower, box: BattleLayout['detail'], hasStats: boolean): void {
    const { x, y, w, vertical } = box;
    const level = t('tower.level').replace('{level}', String(tower.level));
    const nameWidth = vertical || !hasStats ? w - 16 : w * .43;
    r.text(`${towerName(tower.def.id, tower.def.name)} ${level}`, x + 8, y + 12, '#edf3f8', 12, 'left', 'bold', 'middle', 'ui', nameWidth);
    if (!hasStats) return;
    const damage = `${t('tower.damage')} ${Math.round(tower.damage)}`;
    const range = `${t('tower.range')} ${Math.round(tower.range)}`;
    const rate = `${t('tower.rate')} ${tower.fireRate.toFixed(1)}/s`;
    if (vertical) {
      r.text(`${damage} · ${range}`, x + 8, y + 32, '#a7b9ca', 10, 'left', 'normal', 'middle', 'ui', w - 16);
      r.text(rate, x + 8, y + 48, '#a7b9ca', 10, 'left', 'normal', 'middle', 'ui', w - 16);
    } else r.text(`${damage} · ${range} · ${rate}`, x + w - 8, y + 12, '#a7b9ca', 10, 'right', 'normal', 'middle', 'ui', w * .51);
  }

  private drawUpgradeButton(r: Renderer, x: number, y: number, w: number, h: number, up: Tower['nextUpgrade'], gold: number, fontSize: number): void {
    const canUp = up !== null && gold >= up.cost;
    if (canUp) r.roundRect(x, y + 2, w, h - 4, 5, '#203244');
    const label = up ? t('tower.upgrade').replace('{cost}', String(up.cost)) : t('common.maxed');
    r.text(label, x + w / 2, y + h / 2, canUp ? '#ffffff' : UI.color.textDim, fontSize, 'center', 'bold', 'middle', 'header');
    this.regions.push({ x, y, w, h, kind: 'upgrade', label, disabled: !canUp });
  }

  private drawSellButton(r: Renderer, x: number, y: number, w: number, h: number, sellValue: number, fontSize: number): void {
    r.text(t('tower.sell').replace('{value}', String(sellValue)), x + w / 2, y + h / 2, '#efb8b4', fontSize, 'center', 'bold', 'middle', 'header');
    this.regions.push({ x, y, w, h, kind: 'sell', label: t('tower.sell').replace('{value}', String(sellValue)) });
  }

  private drawTargetButton(r: Renderer, x: number, y: number, w: number, h: number, strategy: Tower['strategy'], fontSize: number): void {
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
