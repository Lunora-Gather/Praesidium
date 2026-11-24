// HUD: top stat bar + bottom tower shop. Responsive and data-rich.

import { Renderer } from '../engine/Renderer';
import { GameState } from '../game/GameState';
import { TOWER_LIST, getTowerDef } from '../game/towers/TowerRegistry';
import { getEnemyDef } from '../game/enemies/EnemyRegistry';
import { Vec2 } from '../engine/math/Vec2';
import { t } from '../utils/i18n';
import { classifyBossEncounter } from '../utils/BossEncounter';
import { enemyName, towerName, traitName as localizedTraitName } from '../utils/displayText';
import { layoutFor, UI } from './Layout';
import type { FocusRegion } from './ControlFocus';
import { battleHudLayout, TOP_H, BOT_H } from './BattleHudLayout';
export { TOP_H, BOT_H } from './BattleHudLayout';

export interface HudRegions {
  topHeight: number;
  shop: Array<FocusRegion & { towerId: string }>;
  buttons: Array<FocusRegion & { action: string }>;
}

export class HUD {
  draw(r: Renderer, s: GameState, speed = 1, autoSend = false, shopRight = r.width, showWavePreview = true): HudRegions {
    const regions: HudRegions = { topHeight: TOP_H, shop: [], buttons: [] };
    const geometry = battleHudLayout(r.width);
    const top = geometry.topHeight;
    regions.topHeight = top;
    const topGrad = r.linearGradient(0, 0, 0, top, [
      { offset: 0, color: 'rgba(6, 10, 15, 0.98)' },
      { offset: 1, color: 'rgba(15, 23, 42, 0.98)' },
    ]);
    r.rect(0, 0, r.width, top, topGrad);
    r.rect(0, top - 1, r.width, 1, 'rgba(96,165,250,0.22)');

    const compact = r.width < 1080;
    const metrics = [
      [t('hud.gold'), String(s.gold), UI.color.gold],
      [t('hud.lives'), String(s.lives), s.lives <= 5 ? '#f87171' : '#34d399'],
      [t('hud.wave'), `${s.waves.current}/${s.endless ? '∞' : s.waves.totalWaves}`, '#34d399'],
      [s.comboCount >= 3 ? `${t('hud.score')} ×${s.comboCount}` : t('hud.score'), String(s.score), '#e2e8f0'],
    ];
    for (const [i, { x, y, w, h }] of geometry.metrics.entries()) {
      const [label, value, color] = metrics[i];
      const middle = y + h / 2;
      r.text(label, x + w / 2, middle - 7, UI.color.textMuted, compact ? 9 : 10, 'center', 'bold', 'middle', 'ui', w - 4);
      r.text(value, x + w / 2, middle + 7, color, compact ? 13 : 15, 'center', 'bold', 'middle', 'header', w - 4);
    }
    const actionLabels = {
      codex: t('hud.intel'), talent: t('hud.talent'), settings: t('menu.settings'), stats: t('hud.stats'),
      menu: t('hud.menu'), autoSend: t('hud.autoLabel'), speed: t('controls.speed').replace('{speed}', String(speed)),
      pause: t('hud.pause'), send: t('hud.send'), brief: t('ops.title'),
    };
    const waveInProg = s.waves.inProgress;
    const next = !s.endless && s.waves.current >= s.waves.totalWaves ? t('hud.last') : `${t('hud.wave')} ${s.waves.current + 1}`;
    const labels = {
      ...actionLabels, send: waveInProg ? '▶ …' : next, pause: compact ? '⏸' : actionLabels.pause, speed: `${speed}×`,
      autoSend: `${t('hud.auto')}${autoSend ? ' ✓' : ''}`, brief: compact ? 'ⓘ' : t('ops.short'),
    };
    for (const { action, x, y, w, h } of geometry.controls) {
      const active = (action === 'send' && !waveInProg) || (action === 'autoSend' && autoSend) || (action === 'speed' && speed > 1);
      const color = action === 'send' ? '#2563eb' : action === 'autoSend' ? '#059669' : '#6d28d9';
      r.roundRect(x, y, w, h, 8, active ? color : '#16243a', true, active ? '#93c5fd' : 'rgba(148,163,184,0.20)', 1);
      r.text(labels[action], x + w / 2, y + h / 2, '#f1f5f9', 11, 'center', 'bold', 'middle', 'ui', w - 6);
      regions.buttons.push({ x, y, w, h, action, label: actionLabels[action], pressed: action === 'autoSend' ? autoSend : undefined });
    }
    if (s.waves.betweenProgress > 0 && !s.waves.inProgress) {
      const w = r.width * 0.42;
      r.roundRect((r.width - w) / 2, top - 2, w * s.waves.betweenProgress, 2, 1, UI.color.blue, true);
    }
    if (showWavePreview) this.drawWavePreview(r, s, waveInProg, r.width < 850);
    const layout = layoutFor(r);

    const botY = r.height - BOT_H;
    const botGrad = r.linearGradient(0, botY, 0, r.height, [
      { offset: 0, color: 'rgba(6, 10, 15, 0.95)' },
      { offset: 1, color: 'rgba(10, 16, 28, 0.98)' },
    ]);
    r.rect(0, botY, r.width, BOT_H, botGrad);
    r.rect(0, botY, r.width, 1, 'rgba(59,130,246,0.12)');

    const gap = r.width < 520 ? 6 : layout.gap;
    const padding = r.width < 520 ? 8 : layout.safe;
    const availShop = shopRight - padding * 2;
    const rawCardW = (availShop - gap * (TOWER_LIST.length - 1)) / TOWER_LIST.length;
    const maxCardW = r.width < 520 ? 66 : 120;
    const cardW = Math.min(maxCardW, rawCardW);
    const shopW = cardW * TOWER_LIST.length + gap * (TOWER_LIST.length - 1);

    let sx = Math.max(padding, (shopRight - shopW) / 2);
    for (const def of TOWER_LIST) {
      const selected = s.selectedTowerId === def.id;
      const affordable = s.gold >= def.cost;
      const cardY = botY + 8;
      const cardH = BOT_H - 16;
      const displayName = towerName(def.id, def.name);

      let bg: string | CanvasGradient;
      let border: string;
      if (selected) {
        bg = r.linearGradient(sx, cardY, sx, cardY + cardH, [
          { offset: 0, color: 'rgba(59,130,246,0.36)' },
          { offset: 1, color: 'rgba(37,99,235,0.16)' },
        ]);
        border = UI.color.blue;
        r.setShadow('rgba(59,130,246,0.5)', 14);
      } else if (affordable) {
        bg = r.linearGradient(sx, cardY, sx, cardY + cardH, [
          { offset: 0, color: 'rgba(20,32,56,0.92)' },
          { offset: 1, color: 'rgba(10,16,28,0.9)' },
        ]);
        border = 'rgba(255,255,255,0.12)';
      } else {
        bg = 'rgba(10,15,25,0.6)';
        border = 'rgba(255,255,255,0.03)';
      }

      r.roundRect(sx, cardY, cardW, cardH, 10, bg, true, border, selected ? 1.6 : 1);
      r.clearShadow();

      const dotX = sx + (cardW < 60 ? cardW / 2 : 12);
      const dotY = cardY + (cardW < 60 ? 16 : cardH / 2 - 2);
      r.setShadow(def.color, selected ? 10 : 4);
      r.circle(new Vec2(dotX, dotY), cardW < 60 ? 4 : 5, def.color);
      r.clearShadow();

      const textX = sx + (cardW < 60 ? cardW / 2 : 22);
      if (cardW >= 95) {
        r.text(displayName, textX, cardY + 9, affordable ? '#f1f5f9' : '#475569', 11, 'left', 'bold');
        r.text(`${def.cost}g`, textX, cardY + cardH - 18, affordable ? UI.color.gold : '#374151', 10, 'left', 'bold', 'top', 'header');
        const idx = TOWER_LIST.findIndex(d => d.id === def.id) + 1;
        r.text(`[${idx}]`, sx + cardW - 16, cardY + 9, 'rgba(100,116,139,0.7)', 9, 'right', 'normal', 'top', 'header');
      } else if (cardW >= 60) {
        r.text(displayName.slice(0, 4), textX, cardY + cardH / 2 - 6, affordable ? '#f1f5f9' : '#475569', 10, 'left', 'bold');
        r.text(`${def.cost}g`, textX, cardY + cardH / 2 + 5, affordable ? UI.color.gold : '#374151', 9, 'left', 'bold', 'top', 'header');
      } else {
        r.text(displayName.slice(0, 1), textX, cardY + 26, affordable ? '#f1f5f9' : '#475569', 10, 'center', 'bold');
        r.text(`${def.cost}`, textX, cardY + 40, affordable ? UI.color.gold : '#374151', 8, 'center', 'bold', 'top', 'header');
      }

      regions.shop.push({ x: sx, y: cardY, w: cardW, h: cardH, towerId: def.id, label: `${displayName}, ${def.cost}g`, pressed: selected });
      sx += cardW + gap;
    }

    return regions;
  }

  private drawWavePreview(r: Renderer, s: GameState, waveInProg: boolean, isSmall: boolean): void {
    if (waveInProg || isSmall || r.width < 1040 || s.comboCount >= 3) return;
    const preview = s.waves.previewNext();
    if (!preview || preview.enemies.length === 0) return;

    const enemyText = preview.enemies
      .slice(0, 5)
      .map(group => {
        const def = getEnemyDef(group.id);
        return `${enemyName(def.id, def.name)}×${group.count}`;
      })
      .join(' · ');
    const more = preview.enemies.length > 5 ? ' · …' : '';
    const threats = this.previewThreats(preview.enemies);
    const recommended = this.previewRecommendations(preview.enemies);
    const encounter = classifyBossEncounter(preview.enemies);
    const hasEncounter = encounter.id !== 'none';
    const line1 = hasEncounter
      ? `${t('hud.nextWave')} ${preview.waveNumber}: ${encounter.label} · ${enemyText}${more}`
      : `${t('hud.nextWave')} ${preview.waveNumber}: ${enemyText}${more}`;
    const line2 = hasEncounter
      ? `${encounter.advice}  |  ${t('hud.recommended')}: ${recommended}`
      : `${t('hud.threats')}: ${threats}  |  ${t('hud.recommended')}: ${recommended}`;
    const w = Math.min(hasEncounter ? 760 : 620, Math.max(420, Math.max(line1.length, line2.length) * 5.7 + 34));
    const h = hasEncounter ? 52 : 44;
    const x = (r.width - w) / 2;
    const y = TOP_H + 8;
    const border = hasEncounter ? `${encounter.color}88` : 'rgba(59, 130, 246, 0.28)';

    r.roundRect(x, y, w, h, 12, 'rgba(15, 23, 42, 0.84)', true, border, 1);
    if (hasEncounter) r.roundRect(x + 8, y + 8, 5, h - 16, 3, encounter.color, true);
    r.text(line1, r.width / 2, y + 10, hasEncounter ? encounter.color : '#bfdbfe', 10, 'center', 'bold', 'top', 'header');
    r.text(line2, r.width / 2, y + (hasEncounter ? 31 : 27), '#94a3b8', 9.5, 'center', 'bold', 'top');
  }

  private previewThreats(enemies: Array<{ id: string; count: number }>): string {
    const sorted = [...enemies]
      .sort((a, b) => this.threatScore(b.id, b.count) - this.threatScore(a.id, a.count))
      .slice(0, 3);

    return sorted
      .map(group => {
        const def = getEnemyDef(group.id);
        const trait = def.traits.find(item => item.includes('Resists') || item.includes('Boss') || item.includes('Fast') || item.includes('Siege')) ?? def.traits[0];
        return `${enemyName(def.id, def.name)}(${localizedTraitName(trait)})`;
      })
      .join(' · ');
  }

  private previewRecommendations(enemies: Array<{ id: string; count: number }>): string {
    const scores = new Map<string, number>();
    for (const group of enemies) {
      const def = getEnemyDef(group.id);
      const weight = this.threatScore(group.id, group.count);
      for (const id of def.recommendedTowerIds) {
        scores.set(id, (scores.get(id) ?? 0) + weight);
      }
    }

    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => {
        const def = getTowerDef(id);
        return towerName(def.id, def.name);
      })
      .join(' + ');
  }

  private threatScore(id: string, count: number): number {
    const def = getEnemyDef(id);
    const hpWeight = def.hp / 40;
    const speedWeight = def.speed / 70;
    const bossWeight = def.isBoss ? 10 : 0;
    const resistWeight = def.resist ? Object.values(def.resist).length * 2 : 0;
    return count + hpWeight + speedWeight + bossWeight + resistWeight;
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
