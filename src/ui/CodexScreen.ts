// Codex / Intel overlay: readable strategy reference for towers and enemies.

import { Renderer } from '../engine/Renderer';
import { Vec2 } from '../engine/math/Vec2';
import { TOWER_LIST, getTowerDef } from '../game/towers/TowerRegistry';
import { ENEMY_DEFS } from '../game/enemies/EnemyRegistry';
import { DamageType } from '../game/DamageType';
import { t } from '../utils/i18n';

type CodexTab = 'towers' | 'enemies';
type CodexAction = 'close' | 'tab_towers' | 'tab_enemies';

export class CodexScreen {
  private regions: Array<{ x: number; y: number; w: number; h: number; action: CodexAction }> = [];
  private tab: CodexTab = 'towers';

  draw(r: Renderer): void {
    this.regions = [];
    r.rect(0, 0, r.width, r.height, 'rgba(2, 6, 12, 0.82)');

    const cardW = Math.min(r.width - 28, 760);
    const cardH = Math.min(r.height - 36, 640);
    const x = (r.width - cardW) / 2;
    const y = (r.height - cardH) / 2;
    const cx = r.width / 2;

    r.setShadow('rgba(59, 130, 246, 0.18)', 24, 0, 4);
    r.roundRect(x, y, cardW, cardH, 18, 'rgba(15, 23, 42, 0.96)', true, 'rgba(148, 163, 184, 0.16)', 1.5);
    r.clearShadow();

    r.text(t('codex.title'), cx, y + 18, '#bfdbfe', 24, 'center', 'bold', 'top', 'header');
    r.text(t('codex.subtitle'), cx, y + 48, '#64748b', 11, 'center', 'bold', 'top');

    const tabW = 132;
    const tabH = 28;
    const tabGap = 10;
    const tabY = y + 76;
    const tabX = cx - tabW - tabGap / 2;
    this.drawTab(r, tabX, tabY, tabW, tabH, t('codex.towers'), this.tab === 'towers', 'tab_towers');
    this.drawTab(r, tabX + tabW + tabGap, tabY, tabW, tabH, t('codex.enemies'), this.tab === 'enemies', 'tab_enemies');

    const listX = x + 22;
    const listY = tabY + 42;
    const listW = cardW - 44;
    const listH = cardH - 138;
    if (this.tab === 'towers') this.drawTowers(r, listX, listY, listW, listH);
    else this.drawEnemies(r, listX, listY, listW, listH);

    const closeW = 132;
    const closeH = 32;
    const closeX = cx - closeW / 2;
    const closeY = y + cardH - closeH - 16;
    r.roundRect(closeX, closeY, closeW, closeH, 9, 'rgba(30, 41, 59, 0.92)', true, 'rgba(255,255,255,0.08)', 1);
    r.text(t('common.close'), cx, closeY + closeH / 2, '#ffffff', 12, 'center', 'bold', 'middle');
    this.regions.push({ x: closeX, y: closeY, w: closeW, h: closeH, action: 'close' });
  }

  private drawTab(r: Renderer, x: number, y: number, w: number, h: number, label: string, selected: boolean, action: CodexAction): void {
    const bg = selected
      ? r.linearGradient(x, y, x, y + h, [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#1d4ed8' }])
      : 'rgba(30, 41, 59, 0.7)';
    const border = selected ? '#60a5fa' : 'rgba(255,255,255,0.08)';
    r.roundRect(x, y, w, h, 14, bg, true, border, 1);
    r.text(label.toUpperCase(), x + w / 2, y + h / 2, '#ffffff', 10, 'center', 'bold', 'middle', 'header');
    this.regions.push({ x, y, w, h, action });
  }

  private drawTowers(r: Renderer, x: number, y: number, w: number, h: number): void {
    const compact = w < 560;
    const cols = compact ? 1 : 2;
    const gap = 10;
    const rowH = compact ? 70 : 84;
    const cardW = (w - gap * (cols - 1)) / cols;

    for (let i = 0; i < TOWER_LIST.length; i++) {
      const tower = TOWER_LIST[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const tx = x + col * (cardW + gap);
      const ty = y + row * (rowH + gap);
      if (ty + rowH > y + h) continue;

      r.roundRect(tx, ty, cardW, rowH, 12, 'rgba(2, 6, 23, 0.46)', true, 'rgba(148, 163, 184, 0.12)', 1);
      r.setShadow(tower.color, 8, 0, 0);
      r.circle(new Vec2(tx + 16, ty + 20), 6, tower.color);
      r.clearShadow();
      r.text(tower.name, tx + 30, ty + 10, '#f8fafc', 13, 'left', 'bold', 'top', 'header');
      r.text(`${this.damageTypeName(tower.damageType)} · ${tower.cost}g · R${Math.round(tower.range)}`, tx + cardW - 12, ty + 11, '#94a3b8', 10, 'right', 'bold', 'top', 'header');
      r.text(tower.description, tx + 14, ty + 34, '#cbd5e1', 10.5, 'left', 'normal');
      r.text(`${t('codex.strategy')}: ${tower.defaultStrategy}`, tx + 14, ty + rowH - 20, '#64748b', 10, 'left', 'bold', 'top');
    }
  }

  private drawEnemies(r: Renderer, x: number, y: number, w: number, h: number): void {
    const enemies = Object.values(ENEMY_DEFS);
    const compact = w < 560;
    const rowH = compact ? 72 : 76;

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      const ey = y + i * (rowH + 7);
      if (ey + rowH > y + h) continue;

      r.roundRect(x, ey, w, rowH, 12, 'rgba(2, 6, 23, 0.46)', true, 'rgba(148, 163, 184, 0.12)', 1);
      r.setShadow(enemy.color, 8, 0, 0);
      r.circle(new Vec2(x + 17, ey + 20), enemy.isBoss ? 8 : 6, enemy.color);
      r.clearShadow();

      r.text(enemy.name, x + 34, ey + 10, '#f8fafc', 13, 'left', 'bold', 'top', 'header');
      r.text(enemy.traits.slice(0, 3).map(trait => this.traitName(trait)).join(' · '), x + w - 12, ey + 11, '#94a3b8', 10, 'right', 'bold', 'top');
      r.text(enemy.description, x + 14, ey + 33, '#cbd5e1', 10, 'left', 'normal');

      const resist = this.resistanceSummary(enemy.resist);
      const counters = enemy.recommendedTowerIds.map(id => getTowerDef(id).name).join(' + ');
      r.text(`${t('codex.resist')}: ${resist}`, x + 14, ey + rowH - 19, '#64748b', 10, 'left', 'bold', 'top');
      r.text(`${t('codex.counters')}: ${counters}`, x + w - 14, ey + rowH - 19, '#fbbf24', 10, 'right', 'bold', 'top');
    }
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

  private traitName(trait: string): string {
    const map: Record<string, string> = {
      'Standard': 'trait.standard',
      'No resistance': 'trait.noResistance',
      'Fast': 'trait.fast',
      'Low HP': 'trait.lowHp',
      'Armored': 'trait.armored',
      'High HP': 'trait.highHp',
      'Resists Ice': 'trait.resistsIce',
      'Aggressive': 'trait.aggressive',
      'Resists Fire': 'trait.resistsFire',
      'Boss': 'trait.boss',
      'Massive HP': 'trait.massiveHp',
      'Broad resistance': 'trait.broadResistance',
      'Ethereal': 'trait.ethereal',
      'Resists Physical': 'trait.resistsPhysical',
      'Siege': 'trait.siege',
      'Very high HP': 'trait.veryHighHp',
      'Elemental resistance': 'trait.elementalResistance',
    };
    return t(map[trait] ?? trait);
  }

  hit(x: number, y: number): CodexAction | null {
    for (const region of this.regions) {
      if (x >= region.x && x <= region.x + region.w && y >= region.y && y <= region.y + region.h) return region.action;
    }
    return null;
  }

  apply(action: CodexAction): 'close' | 'stay' {
    if (action === 'close') return 'close';
    if (action === 'tab_towers') this.tab = 'towers';
    if (action === 'tab_enemies') this.tab = 'enemies';
    return 'stay';
  }
}
