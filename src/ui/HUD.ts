// HUD: top stat bar + bottom tower shop. Responsive and data-rich.

import { Renderer } from '../engine/Renderer';
import { GameState } from '../game/GameState';
import { TOWER_LIST, getTowerDef } from '../game/towers/TowerRegistry';
import { getEnemyDef } from '../game/enemies/EnemyRegistry';
import { Vec2 } from '../engine/math/Vec2';
import { t } from '../utils/i18n';

export interface HudRegions {
  shop: Array<{ x: number; y: number; w: number; h: number; towerId: string }>;
  buttons: Array<{ x: number; y: number; w: number; h: number; action: string }>;
}

export const TOP_H = 52;
export const BOT_H = 72;

export class HUD {
  draw(r: Renderer, s: GameState, speed = 1, autoSend = false): HudRegions {
    const regions: HudRegions = { shop: [], buttons: [] };

    const topGrad = r.linearGradient(0, 0, 0, TOP_H, [
      { offset: 0, color: 'rgba(6, 10, 15, 0.98)' },
      { offset: 1, color: 'rgba(10, 16, 28, 0.95)' },
    ]);
    r.rect(0, 0, r.width, TOP_H, topGrad);
    r.rect(0, TOP_H - 1, r.width, 1, 'rgba(59,130,246,0.18)');

    const isSmall = r.width < 850;
    const isTiny = r.width < 640;

    const pill = (icon: string, val: string, color: string, x: number): number => {
      const icoW = isSmall ? 16 : 28;
      const valW = Math.max(isSmall ? 22 : 36, val.length * (isSmall ? 7.5 : 10));
      const total = icoW + valW + 4;
      const displayIcon = isSmall ? icon[0] : icon;
      r.text(displayIcon, x + icoW / 2, TOP_H / 2, '#64748b', 10, 'center', 'bold', 'middle');
      r.text(val,  x + icoW + 2, TOP_H / 2, color, isSmall ? 13 : 16, 'left', 'bold', 'middle', 'header');
      return x + total + (isSmall ? 6 : 12);
    };

    let lx = 12;
    lx = pill(t('hud.gold'), `${s.gold}`, '#fbbf24', lx);
    const livesCol = s.lives <= 5
      ? (Math.floor(Date.now() / 400) % 2 === 0 ? '#ef4444' : '#f87171')
      : '#34d399';
    lx = pill(t('hud.lives'), `${s.lives}`, livesCol, lx);
    lx = pill(t('hud.wave'), `${s.waves.current}/${s.endless ? '∞' : s.waves.totalWaves}`, '#34d399', lx);
    pill(t('hud.score'), `${s.score}`, '#e2e8f0', lx);

    if (s.comboCount >= 3) {
      r.setShadow('rgba(239,68,68,0.5)', 8);
      r.text(`🔥 COMBO ×${s.comboCount}`, r.width / 2, TOP_H / 2, '#f87171', 14, 'center', 'bold', 'middle', 'header');
      r.clearShadow();
    }

    if (speed > 1 && !isSmall) {
      r.text(`${speed}×`, r.width / 2 + (s.comboCount >= 3 ? 110 : 0), TOP_H / 2, '#fef08a', 14, 'center', 'bold', 'middle', 'header');
    }

    const btnH = 30;
    const btnY = (TOP_H - btnH) / 2;
    let bx = r.width - 8;

    const topBtn = (label: string, active: boolean, color: string, action: string, w = 68): void => {
      bx -= w;
      const bg = active
        ? r.linearGradient(bx, btnY, bx, btnY + btnH, [{ offset: 0, color }, { offset: 1, color }])
        : 'rgba(20,30,50,0.8)';
      const border = active ? color : 'rgba(255,255,255,0.07)';
      if (active) r.setShadow(color, 6);
      r.roundRect(bx, btnY, w, btnH, 6, bg, true, border, 1);
      r.clearShadow();
      r.text(label, bx + w / 2, btnY + btnH / 2, '#e2e8f0', 11, 'center', 'bold', 'middle');
      regions.buttons.push({ x: bx, y: btnY, w, h: btnH, action });
      bx -= 5;
    };

    const waveInProg = s.waves.inProgress;
    const waveLabel = waveInProg
      ? (isSmall ? '▶ R...' : '▶ Running…')
      : s.waves.current >= s.waves.totalWaves && !s.endless
        ? (isSmall ? '✓ Last' : '✓ Last Wave')
        : (isSmall ? `⚡ W${s.waves.current + 1}` : `⚡ Wave ${s.waves.current + 1}`);

    if (!isTiny) {
      topBtn(isSmall ? 'ⓘ' : 'ⓘ Intel', false, '#475569', 'codex', isSmall ? 32 : 68);
      topBtn(isSmall ? '✦' : '✦ Talent', false, '#475569', 'talent', isSmall ? 32 : 72);
      topBtn(isSmall ? '⚙' : '⚙ Set', false, '#475569', 'settings', isSmall ? 32 : 60);
      topBtn(isSmall ? '🏆' : '🏆 Stats', false, '#475569', 'stats', isSmall ? 32 : 68);
    }
    topBtn(isSmall ? '☰' : '☰ Menu', false, '#475569', 'menu', isSmall ? 32 : 68);
    const autoLabel = autoSend
      ? (isSmall ? '⟳ A ✓' : '⟳ Auto ✓')
      : (isSmall ? '⟳ A' : '⟳ Auto');
    topBtn(autoLabel, autoSend, '#10b981', 'autoSend', isSmall ? 48 : 76);
    topBtn(isSmall ? `${speed}×` : `⚡ ${speed}×`, speed > 1, '#8b5cf6', 'speed', isSmall ? 36 : 68);
    topBtn(isSmall ? '⏸' : '⏸ Pause', false, '#475569', 'pause', isSmall ? 32 : 68);
    topBtn(waveLabel, !waveInProg, '#3b82f6', 'send', isSmall ? 64 : 90);

    if (s.waves.betweenProgress > 0 && !s.waves.inProgress) {
      const bw = 240; const bwY = TOP_H - 2;
      const bwX = (r.width - bw) / 2;
      r.roundRect(bwX, bwY, bw, 2, 1, 'rgba(255,255,255,0.06)', true);
      r.roundRect(bwX, bwY, bw * s.waves.betweenProgress, 2, 1, '#3b82f6', true);
    }

    this.drawWavePreview(r, s, waveInProg, isSmall);

    const botY = r.height - BOT_H;
    const botGrad = r.linearGradient(0, botY, 0, r.height, [
      { offset: 0, color: 'rgba(6, 10, 15, 0.95)' },
      { offset: 1, color: 'rgba(10, 16, 28, 0.98)' },
    ]);
    r.rect(0, botY, r.width, BOT_H, botGrad);
    r.rect(0, botY, r.width, 1, 'rgba(59,130,246,0.12)');

    const gap = 8;
    const padding = 12;
    const availShop = r.width - padding * 2;
    const cardW = Math.max(80, Math.min(120, (availShop - gap * (TOWER_LIST.length - 1)) / TOWER_LIST.length));

    let sx = padding;
    for (const def of TOWER_LIST) {
      const selected = s.selectedTowerId === def.id;
      const affordable = s.gold >= def.cost;
      const cardY = botY + 8;
      const cardH = BOT_H - 16;

      let bg: string | CanvasGradient;
      let border: string;
      if (selected) {
        bg = r.linearGradient(sx, cardY, sx, cardY + cardH, [
          { offset: 0, color: 'rgba(59,130,246,0.3)' },
          { offset: 1, color: 'rgba(37,99,235,0.15)' },
        ]);
        border = '#3b82f6';
        r.setShadow('rgba(59,130,246,0.5)', 14);
      } else if (affordable) {
        bg = r.linearGradient(sx, cardY, sx, cardY + cardH, [
          { offset: 0, color: 'rgba(20,32,56,0.9)' },
          { offset: 1, color: 'rgba(10,16,28,0.9)' },
        ]);
        border = 'rgba(255,255,255,0.12)';
      } else {
        bg = 'rgba(10,15,25,0.6)';
        border = 'rgba(255,255,255,0.03)';
      }

      r.roundRect(sx, cardY, cardW, cardH, 8, bg, true, border, selected ? 1.5 : 1);
      r.clearShadow();

      const dotX = sx + 12;
      const dotY = cardY + cardH / 2 - 2;
      r.setShadow(def.color, selected ? 10 : 4);
      r.circle(new Vec2(dotX, dotY), 5, def.color);
      r.clearShadow();

      const textX = sx + 22;
      if (cardW >= 95) {
        r.text(def.name, textX, cardY + 9, affordable ? '#f1f5f9' : '#475569', 11, 'left', 'bold');
        r.text(`${def.cost}g`, textX, cardY + cardH - 18, affordable ? '#fbbf24' : '#374151', 10, 'left', 'bold', 'top', 'header');
        const idx = TOWER_LIST.findIndex(d => d.id === def.id) + 1;
        r.text(`[${idx}]`, sx + cardW - 16, cardY + 9, 'rgba(100,116,139,0.7)', 9, 'right', 'normal', 'top', 'header');
      } else {
        r.text(def.name.slice(0, 4), textX, cardY + cardH / 2 - 6, affordable ? '#f1f5f9' : '#475569', 10, 'left', 'bold');
        r.text(`${def.cost}g`, textX, cardY + cardH / 2 + 5, affordable ? '#fbbf24' : '#374151', 9, 'left', 'bold', 'top', 'header');
      }

      regions.shop.push({ x: sx, y: cardY, w: cardW, h: cardH, towerId: def.id });
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
      .map(group => `${getEnemyDef(group.id).name}×${group.count}`)
      .join(' · ');
    const more = preview.enemies.length > 5 ? ' · …' : '';
    const threats = this.previewThreats(preview.enemies);
    const recommended = this.previewRecommendations(preview.enemies);
    const line1 = `${t('hud.nextWave')} ${preview.waveNumber}: ${enemyText}${more}`;
    const line2 = `${t('hud.threats')}: ${threats}  |  ${t('hud.recommended')}: ${recommended}`;
    const w = Math.min(620, Math.max(420, Math.max(line1.length, line2.length) * 5.7 + 32));
    const h = 44;
    const x = (r.width - w) / 2;
    const y = TOP_H + 8;

    r.roundRect(x, y, w, h, 12, 'rgba(15, 23, 42, 0.82)', true, 'rgba(59, 130, 246, 0.24)', 1);
    r.text(line1, r.width / 2, y + 10, '#bfdbfe', 10, 'center', 'bold', 'top', 'header');
    r.text(line2, r.width / 2, y + 27, '#94a3b8', 9.5, 'center', 'bold', 'top');
  }

  private previewThreats(enemies: Array<{ id: string; count: number }>): string {
    const sorted = [...enemies]
      .sort((a, b) => this.threatScore(b.id, b.count) - this.threatScore(a.id, a.count))
      .slice(0, 3);

    return sorted
      .map(group => {
        const def = getEnemyDef(group.id);
        const trait = def.traits.find(item => item.includes('Resists') || item.includes('Boss') || item.includes('Fast') || item.includes('Siege')) ?? def.traits[0];
        return `${def.name}(${trait})`;
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
      .map(([id]) => getTowerDef(id).name)
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
