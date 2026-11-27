// Tactical header and tower shelf. The same measured regions drive input and drawing.
import type { Renderer } from '../engine/Renderer';
import type { GameState } from '../game/GameState';
import { TOWER_LIST } from '../game/towers/TowerRegistry';
import { getEnemyDef } from '../game/enemies/EnemyRegistry';
import { getLocale, t } from '../utils/i18n';
import { enemyName, towerName } from '../utils/displayText';
import type { FocusRegion } from './ControlFocus';
import { battleHudLayout, TOP_H } from './BattleHudLayout';
import type { BattleBox, BattleLayout } from './BattleLayout';
import { drawWeeklyRunBadge } from './WeeklyRunBadge';
import { classifyBossEncounter } from '../utils/BossEncounter';
import { getLevelTheme } from './LevelThemes';
import { drawTowerSprite } from './BattleSprites';
export { TOP_H, BOT_H } from './BattleHudLayout';

const INK = '#edf3f8';
const MUTED = '#a7b9ca';
const LINE = '#293b4c';
const SHELF = '#0f1b27';
const AMBER = '#f2c584';

export interface HudRegions {
  topHeight: number;
  shop: Array<FocusRegion & { towerId: string }>;
  buttons: Array<FocusRegion & { action: string }>;
}

export class HUD {
  private wave: { grid: GameState['grid']; key: string; text: string } | null = null;
  private boss: { key: string; grid: GameState['grid']; label: string } | null = null;

  draw(r: Renderer, s: GameState, layout: BattleLayout, placing: boolean, feedback = '',
    pointer?: { x: number; y: number }): HudRegions {
    const geometry = battleHudLayout(r.width, layout.field);
    const regions: HudRegions = { topHeight: geometry.topHeight, shop: [], buttons: [] };
    r.rect(0, 0, r.width, geometry.topHeight, SHELF);
    r.rect(0, geometry.topHeight - 1, r.width, 1, LINE);

    const current = s.waves.current;
    const metrics = [
      [t('hud.gold'), String(s.gold), AMBER],
      [t('hud.lives'), String(s.lives), s.lives <= 5 ? '#fca5a5' : INK],
      [t('hud.wave'), current ? `${current}/${s.endless ? '∞' : s.waves.totalWaves}` : '—', INK],
      [s.comboCount >= 3 ? `${t('hud.score')} ×${s.comboCount}` : t('hud.score'), String(s.score), INK],
    ];
    const stacked = geometry.topHeight > TOP_H;
    for (const [i, { x, y, w, h }] of geometry.metrics.entries()) {
      const [label, value, color] = metrics[i];
      r.text(label, x + w / 2, y + h / 2 - 8, MUTED, 10, 'center', 'normal', 'middle', 'ui', w - 5);
      r.text(value, x + w / 2, y + h / 2 + 7, color, stacked ? 13 : 16, 'center', 'bold', 'middle', 'ui', w - 5);
      if (i > 0) r.rect(x, y + (stacked ? 6 : 13), 1, h - (stacked ? 12 : 26), LINE);
    }

    const sending = s.waves.inProgress;
    const canSend = !sending && s.waves.state !== 'done';
    const speed = s.playbackSpeed;
    const skip = s.waves.autoSend;
    const startWave = t('battle.launch').replace('{wave}', String(current + 1));
    const sendLabel = sending ? t('battle.spawning').replace('{count}', String(s.waves.remainingToSpawn))
      : canSend ? startWave : t('battle.final');
    const labels = {
      send: sendLabel, pause: t('hud.pause'), speed: t('controls.speed').replace('{speed}', String(speed)),
      autoSend: t('hud.autoLabel'), brief: t('ops.title'),
    };
    for (const { action, x, y, w, h } of geometry.controls) {
      const primary = action === 'send' && canSend;
      const disabled = action === 'send' && !canSend;
      const selected = action === 'autoSend' && skip;
      const shortLabel = action === 'speed' ? `${speed}×`
        : action === 'autoSend' ? `${t('hud.auto')}${skip ? ' ✓' : ''}` : action === 'brief' ? t('ops.short') : labels[action];
      const hovered = pointer && pointer.x >= x && pointer.x < x + w && pointer.y >= y && pointer.y < y + h;
      if (primary || selected || (hovered && !disabled)) {
        r.roundRect(x, y + 2, w, h - 4, 6, primary ? AMBER : '#203244');
      } else if (action !== 'send') {
        r.rect(x - 2, y + 12, 1, h - 24, LINE);
      }
      r.text(shortLabel, x + w / 2, y + h / 2, primary ? '#261c12' : disabled ? MUTED : INK, stacked ? 11 : 12, 'center', 'bold', 'middle', 'ui', w - 8);
      regions.buttons.push({ x, y, w, h, action, label: labels[action], pressed: action === 'autoSend' ? skip : undefined, disabled });
    }
    this.drawInfo(r, s, layout.info, feedback);

    const { x, y, w, h } = layout.shop;
    r.rect(0, y - 5, r.width, r.height - y + 5, SHELF);
    r.rect(0, y - 5, r.width, 1, LINE);
    const gap = w < 460 ? 4 : 6;
    const cardW = (w - gap * (TOWER_LIST.length - 1)) / TOWER_LIST.length;
    for (const [index, def] of TOWER_LIST.entries()) {
      const selected = placing && s.selectedTowerId === def.id;
      const affordable = s.gold >= def.cost;
      const sx = x + index * (cardW + gap);
      const displayName = towerName(def.id, def.name);
      const wide = cardW >= 80;
      const hovered = pointer && pointer.x >= sx && pointer.x < sx + cardW && pointer.y >= y && pointer.y < y + h;
      if (index > 0) r.rect(sx - gap / 2, y + 8, 1, h - 16, LINE);
      if (selected || hovered) r.rect(sx, y, cardW, h, selected ? '#1d3042' : '#172636');
      if (selected) r.rect(sx, y + h - 2, cardW, 2, '#9ac4ea');
      const inset = Math.max(0, (cardW - 156) / 2);
      r.ctx.globalAlpha = affordable ? 1 : .58;
      drawTowerSprite(r, def.id, def.color, sx + (wide ? 19 + inset : cardW / 2), y + (wide ? h / 2 + 1 : 13), wide ? 36 : 26, 0);
      r.ctx.globalAlpha = 1;
      if (wide) {
        const shortcutSpace = cardW >= 110 ? 22 : 5;
        r.text(displayName, sx + inset + 39, y + 17, INK, 12, 'left', 'bold', 'middle', 'ui', cardW - inset * 2 - 39 - shortcutSpace);
        r.text(`${def.cost}g`, sx + inset + 39, y + 36, affordable ? AMBER : MUTED, 11, 'left', 'normal', 'middle');
        if (cardW >= 110) r.text(String(index + 1), sx + cardW - inset - 10, y + 17, MUTED, 10, 'right', 'normal', 'middle');
      } else {
        r.text(displayName, sx + cardW / 2, y + 30, INK, 10, 'center', 'bold', 'middle', 'ui', cardW - 4);
        r.text(String(def.cost), sx + cardW / 2, y + 43, affordable ? AMBER : MUTED, 10, 'center', 'normal', 'middle');
      }
      regions.shop.push({ x: sx, y, w: cardW, h, towerId: def.id, label: `${displayName}, ${def.cost}g`, pressed: selected });
    }
    return regions;
  }

  private drawInfo(r: Renderer, s: GameState, box: BattleBox, feedback: string): void {
    const { x, y, w, h } = box;
    const ruleWidth = s.activeWeeklyMode ? Math.min(178, Math.round(w * .42)) : 0;
    const contentWidth = w - ruleWidth;
    const current = s.waves.current;
    const preview = this.previewText(s);
    const compact = h < 42 || w < 400;
    const countdown = s.waves.state === 'between' && !s.waves.autoSend
      ? t('battle.countdown').replace('{seconds}', String(Math.ceil(s.waves.secondsUntilNext))) : '';
    const status = current === 0 ? t('battle.prepare') : countdown || t('battle.wave').replace('{wave}', String(current));
    const mode = s.runOrigin.kind === 'daily' ? t('menu.daily') : s.runOrigin.kind === 'weekly' ? t('menu.weekly')
      : s.runOrigin.kind === 'campaign' ? (getLocale() === 'en' ? s.levels.current.name : t(`campaign.mission.${getLevelTheme(s.levels.levelNumber).id}`))
      : s.runOrigin.kind === 'endless' ? t('menu.endless') : t('battle.practice');
    r.text(`${mode} · ${status}`, x + 10, y + h / 2 - 8, INK, compact ? 11 : 13, 'left', 'bold', 'middle', 'ui', contentWidth - 20);

    let bosses = 0, health = 0;
    for (const enemy of s.enemies) if (enemy.isBoss && !enemy.dead) {
      bosses++;
      health += enemy.hpRatio;
    }
    if (bosses && !feedback) this.drawBossWarning(r, s, { x: x + 10, y: y + h / 2 + 8, w: contentWidth - 20, h }, bosses, health / bosses);
    else r.text(feedback || preview || t('battle.noReinforcements'), x + 10, y + h / 2 + 8, MUTED, compact ? 10 : 11, 'left', 'normal', 'middle', 'ui', contentWidth - 20);
    if (countdown) r.rect(x, y + h - 2, contentWidth * (1 - s.waves.betweenProgress), 2, '#7fadd5');
    if (ruleWidth) drawWeeklyRunBadge(r, s, { x: x + contentWidth, y, w: ruleWidth, h });
  }

  private previewText(s: GameState): string {
    const key = `${s.waves.current}:${s.waves.state === 'done'}:${getLocale()}`;
    if (this.wave?.grid === s.grid && this.wave.key === key) return this.wave.text;
    const wave = s.waves.previewNext();
    const groups = wave?.enemies.slice(0, 2).map(({ id, count }) => `${enemyName(id, getEnemyDef(id).name)} ×${count}`);
    const text = wave && groups?.length ? `${t('ops.nextWave')} · ${groups.join(' · ')}${wave.enemies.length > 2 ? ' …' : ''}` : '';
    this.wave = { grid: s.grid, key, text };
    return text;
  }

  private drawBossWarning(r: Renderer, s: GameState, box: BattleBox, count: number, ratio: number): void {
    const key = `${s.waves.current}:${Math.floor(performance.now() / 500)}:${getLocale()}`;
    if (this.boss?.grid !== s.grid || this.boss.key !== key) {
      const counts = new Map<string, number>();
      for (const enemy of s.enemies) counts.set(enemy.id, (counts.get(enemy.id) ?? 0) + 1);
      const encounter = classifyBossEncounter([...counts].map(([id, count]) => ({ id, count })));
      this.boss = { key, grid: s.grid, label: encounter.label || t('boss.standard.title') };
    }
    const { x, y, w } = box;
    const meterWidth = Math.min(116, w * .33);
    r.text(count > 1 ? `${this.boss.label} ×${count}` : this.boss.label, x, y, '#fecaca', 11, 'left', 'bold', 'middle', 'ui', w - meterWidth - 8);
    r.roundRect(x + w - meterWidth, y - 2, meterWidth, 4, 2, '#3f252c');
    if (ratio > 0) r.roundRect(x + w - meterWidth, y - 2, meterWidth * ratio, 4, 2, '#f38181');
  }

  hitShop(regions: HudRegions, x: number, y: number): string | null {
    for (const s of regions.shop) {
      if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return s.towerId;
    }
    return null;
  }

  hitButton(regions: HudRegions, x: number, y: number): string | null {
    for (const b of regions.buttons) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.action;
    }
    return null;
  }
}

export const SPEED_OPTIONS = [1, 2, 3] as const;
