// Codex / Intel overlay: readable strategy reference for towers and enemies.

import type { FocusRegion } from './ControlFocus';
import { Renderer } from '../engine/Renderer';
import { Vec2 } from '../engine/math/Vec2';
import { TOWER_LIST, getTowerDef } from '../game/towers/TowerRegistry';
import { ENEMY_DEFS } from '../game/enemies/EnemyRegistry';
import { DamageType } from '../game/DamageType';
import { t } from '../utils/i18n';
import { enemyDescription, enemyName, strategyName, towerDescription, towerName, traitName } from '../utils/displayText';
import { drawGlassPanel, layoutFor, UI } from './Layout';

type CodexTab = 'towers' | 'enemies';
type CodexAction = 'close' | 'tab_towers' | 'tab_enemies' | 'previous' | 'next';
const enemies = Object.values(ENEMY_DEFS);

export class CodexScreen {
  private regions: Array<FocusRegion & { action: CodexAction }> = [];

  get focusRegions(): readonly FocusRegion[] { return this.regions; }
  private tab: CodexTab = 'towers';
  private page = 0;
  private pageCount = 1;
  private visible = { start: 0, count: 1 };

  get reading(): string {
    const { start, count } = this.visible;
    const rows = this.tab === 'towers'
      ? TOWER_LIST.slice(start, start + count).map(tower => `${towerName(tower.id, tower.name)}. ${towerDescription(tower.id, tower.description)}`)
      : enemies.slice(start, start + count).map(enemy => `${enemyName(enemy.id, enemy.name)}. ${enemyDescription(enemy.id, enemy.description)} ${t('codex.resist')} ${this.resistanceSummary(enemy.resist)}.`);
    return rows.join(' ');
  }

  draw(r: Renderer): void {
    this.regions = [];
    const layout = layoutFor(r);
    r.rect(0, 0, r.width, r.height, 'rgba(2, 6, 12, 0.82)');

    const cardW = Math.min(r.width - layout.safe * 2, layout.mode === 'wide' ? 820 : 760);
    const cardH = Math.min(r.height - layout.safe * 2, layout.isCompact ? 560 : 640);
    const x = (r.width - cardW) / 2;
    const y = (r.height - cardH) / 2;
    const cx = r.width / 2;

    drawGlassPanel(r, x, y, cardW, cardH, layout.radius + 2, UI.color.blue, 0.94);

    r.text(t('codex.title'), cx, y + (layout.isCompact ? 14 : 18), '#bfdbfe', layout.isCompact ? 22 : 24, 'center', 'bold', 'top', 'header');
    if (!layout.isCompact) r.text(t('codex.subtitle'), cx, y + 48, UI.color.textDim, 11, 'center', 'bold', 'top');

    const tabW = layout.isPhone ? 112 : 132;
    const tabH = layout.isCompact ? 26 : 28;
    const tabGap = layout.gap;
    const tabY = y + (layout.isCompact ? 52 : 76);
    const tabX = cx - tabW - tabGap / 2;
    this.drawTab(r, tabX, tabY, tabW, tabH, t('codex.towers'), this.tab === 'towers', 'tab_towers');
    this.drawTab(r, tabX + tabW + tabGap, tabY, tabW, tabH, t('codex.enemies'), this.tab === 'enemies', 'tab_enemies');

    const closeW = 132;
    const closeH = layout.buttonH - 6;
    const closeX = cx - closeW / 2;
    const closeY = y + cardH - closeH - layout.safe;
    const listX = x + layout.safe + 4;
    const listY = tabY + tabH + layout.gap;
    const listW = cardW - (layout.safe + 4) * 2;
    const listH = closeY - listY - layout.gap;
    const towers = this.tab === 'towers';
    const cols = towers && listW >= 560 ? 2 : 1;
    const gap = 8;
    const towerRowH = layout.isCompact ? 76 : 84;
    const rowH = towers ? towerRowH : 110;
    const capacity = Math.max(1, Math.floor((listH + gap) / (rowH + gap))) * cols;
    this.pageCount = Math.ceil((towers ? TOWER_LIST.length : enemies.length) / capacity);
    this.page = Math.min(this.page, this.pageCount - 1);
    const from = this.page * capacity;
    this.visible = { start: from, count: capacity };
    if (towers) this.drawTowers(r, listX, listY, listW, Math.min(rowH, listH), gap, cols, from, capacity);
    else this.drawEnemies(r, listX, listY, listW, Math.min(rowH, listH), gap, from, capacity);

    if (this.pageCount > 1) {
      const pageButtonWidth = Math.min(92, (listW - closeW - 16) / 2);
      this.drawPageButton(r, listX, closeY, pageButtonWidth, closeH, 'previous', this.page <= 0);
      this.drawPageButton(r, listX + listW - pageButtonWidth, closeY, pageButtonWidth, closeH, 'next', this.page >= this.pageCount - 1);
    }

    r.roundRect(closeX, closeY, closeW, closeH, 9, 'rgba(30, 41, 59, 0.92)', true, 'rgba(255,255,255,0.08)', 1);
    const closeLabel = this.pageCount > 1 ? `${t('common.close')} · ${this.page + 1}/${this.pageCount}` : t('common.close');
    r.text(closeLabel, cx, closeY + closeH / 2, '#ffffff', 12, 'center', 'bold', 'middle');
    this.regions.push({ x: closeX, y: closeY, w: closeW, h: closeH, action: 'close', label: t('common.close') });
  }

  private drawTab(r: Renderer, x: number, y: number, w: number, h: number, label: string, selected: boolean, action: CodexAction): void {
    const bg = selected
      ? r.linearGradient(x, y, x, y + h, [{ offset: 0, color: UI.color.blue }, { offset: 1, color: '#1d4ed8' }])
      : 'rgba(30, 41, 59, 0.7)';
    const border = selected ? '#60a5fa' : 'rgba(255,255,255,0.08)';
    r.roundRect(x, y, w, h, h / 2, bg, true, border, 1);
    r.text(label.toUpperCase(), x + w / 2, y + h / 2, '#ffffff', 10, 'center', 'bold', 'middle', 'header');
    this.regions.push({ x, y, w, h, action, label, pressed: selected });
  }

  private drawPageButton(r: Renderer, x: number, y: number, w: number, h: number, action: 'previous' | 'next', disabled: boolean): void {
    const label = t(action === 'previous' ? 'codex.previous' : 'codex.next');
    r.roundRect(x, y, w, h, 8, disabled ? '#0f172a' : '#1e293b', true, '#475569', 1);
    r.text(label, x + w / 2, y + h / 2, disabled ? UI.color.textDim : UI.color.text, 11, 'center', 'bold', 'middle', 'ui', w - 8);
    this.regions.push({ x, y, w, h, action, label, disabled });
  }

  private drawTowers(r: Renderer, x: number, y: number, w: number, rowH: number, gap: number, cols: number, from: number, count: number): void {
    const compact = w < 560;
    const cardW = (w - gap * (cols - 1)) / cols;

    for (const [i, tower] of TOWER_LIST.slice(from, from + count).entries()) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const tx = x + col * (cardW + gap);
      const ty = y + row * (rowH + gap);
      r.roundRect(tx, ty, cardW, rowH, 12, 'rgba(2, 6, 23, 0.46)', true, 'rgba(148, 163, 184, 0.12)', 1);
      r.setShadow(tower.color, 8, 0, 0);
      r.circle(new Vec2(tx + 16, ty + 20), 6, tower.color);
      r.clearShadow();
      r.text(towerName(tower.id, tower.name), tx + 30, ty + 10, UI.color.text, 13, 'left', 'bold', 'top', 'header');
      r.text(`${this.damageTypeName(tower.damageType)} · ${tower.cost}g · R${Math.round(tower.range)}`, tx + cardW - 12, ty + 11, UI.color.textMuted, compact ? 9 : 10, 'right', 'bold', 'top', 'header');
      if (rowH >= 68) this.drawDescription(r, towerDescription(tower.id, tower.description), tx + 14, ty + 31, cardW - 28, 2);
      r.text(`${t('codex.strategy')}: ${strategyName(tower.defaultStrategy, tower.defaultStrategy)}`, tx + 14, ty + rowH - 19, UI.color.textDim, 10, 'left', 'bold', 'top');
    }
  }

  private drawEnemies(r: Renderer, x: number, y: number, w: number, rowH: number, gap: number, from: number, count: number): void {
    const compact = w < 560;

    for (const [i, enemy] of enemies.slice(from, from + count).entries()) {
      const ey = y + i * (rowH + gap);

      r.roundRect(x, ey, w, rowH, 12, 'rgba(2, 6, 23, 0.46)', true, 'rgba(148, 163, 184, 0.12)', 1);
      r.setShadow(enemy.color, 8, 0, 0);
      r.circle(new Vec2(x + 17, ey + 20), enemy.isBoss ? 8 : 6, enemy.color);
      r.clearShadow();

      r.text(enemyName(enemy.id, enemy.name), x + 34, ey + 10, UI.color.text, 13, 'left', 'bold', 'top', 'header');
      const traitText = enemy.traits.slice(0, compact ? 2 : 3).map(trait => traitName(trait)).join(' · ');
      r.text(traitText, x + w - 12, ey + 11, UI.color.textMuted, compact ? 8.5 : 10, 'right', 'bold', 'top', 'ui', w - 128);
      if (rowH >= 84) this.drawDescription(r, enemyDescription(enemy.id, enemy.description), x + 14, ey + 30, w - 28, rowH >= 106 ? 3 : 2);

      const resist = this.resistanceSummary(enemy.resist);
      const counters = enemy.recommendedTowerIds.map(id => {
        const def = getTowerDef(id);
        return towerName(def.id, def.name);
      }).join(' + ');
      r.text(`${t('codex.resist')} ${resist}`, x + 14, ey + rowH - 31, UI.color.textMuted, compact ? 8.5 : 10, 'left', 'bold', 'top', 'ui', w - 28);
      r.text(`${t('codex.counters')} ${counters}`, x + 14, ey + rowH - 17, UI.color.gold, compact ? 8.5 : 10, 'left', 'bold', 'top', 'ui', w - 28);
    }
  }

  private drawDescription(r: Renderer, text: string, x: number, y: number, width: number, limit: number): void {
    const separator = text.includes(' ') ? ' ' : '';
    const units = separator ? text.split(separator) : Array.from(text);
    r.ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const lines: string[] = [''];
    for (const unit of units) {
      const index = lines.length - 1;
      const candidate = lines[index] ? lines[index] + separator + unit : unit;
      if (lines[index] && r.ctx.measureText(candidate).width > width) {
        if (lines.length === limit) {
          lines[index] += '…';
          break;
        }
        lines.push(unit);
      } else lines[index] = candidate;
    }
    for (const [index, line] of lines.entries()) r.text(line, x, y + index * 12, '#cbd5e1', 10, 'left', 'normal', 'top', 'ui', width);
  }

  private resistanceSummary(resist: Partial<Record<DamageType, number>> | undefined): string {
    if (!resist) return t('codex.none');
    const types: DamageType[] = [DamageType.Physical, DamageType.Fire, DamageType.Ice, DamageType.Lightning];
    const parts = types
      .filter(type => resist[type] !== undefined)
      .map(type => `${this.damageTypeName(type)}×${resist[type]}`);
    return parts.length > 0 ? parts.join(' · ') : t('codex.none');
  }

  private damageTypeName(type: DamageType): string {
    switch (type) {
      case DamageType.Physical: return t('damage.physical');
      case DamageType.Fire: return t('damage.fire');
      case DamageType.Ice: return t('damage.ice');
      case DamageType.Lightning: return t('damage.lightning');
      default: return t('codex.none');
    }
  }

  hit(x: number, y: number): CodexAction | null {
    for (const region of this.regions) {
      if (x >= region.x && x <= region.x + region.w && y >= region.y && y <= region.y + region.h) return region.action;
    }
    return null;
  }

  apply(action: CodexAction): 'close' | 'stay' {
    if (action === 'close') return 'close';
    if (action === 'previous') this.page = Math.max(0, this.page - 1);
    else if (action === 'next') this.page = Math.min(this.pageCount - 1, this.page + 1);
    else {
      const tab = action === 'tab_towers' ? 'towers' : 'enemies';
      if (this.tab !== tab) this.page = 0;
      this.tab = tab;
    }
    return 'stay';
  }
}
