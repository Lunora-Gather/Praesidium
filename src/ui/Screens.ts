// Full-screen overlays: main menu, pause, victory, defeat.
// Win/loss screens include a compact battle report so each run ends with useful feedback.

import { Renderer } from '../engine/Renderer';
import { t } from '../utils/i18n';

export type MenuClickAction = 'start' | 'endless' | 'challenge' | 'daily' | 'resume' | 'restart' | 'menu' | 'settings' | 'stats' | null;

export interface ScreenStats {
  stars?: number;
  wave?: number;
  kills?: number;
  gold?: number;
  lives?: number;
  towersPlaced?: number;
  upgrades?: number;
  spellsCast?: number;
  damageDealt?: number;
  durationSec?: number;
}

export class Screens {
  private regions: Array<{ x: number; y: number; w: number; h: number; action: MenuClickAction }> = [];

  draw(r: Renderer, kind: 'menu' | 'paused' | 'won' | 'lost', score = 0, seed = 0, stats?: ScreenStats): void {
    this.regions = [];

    const bgGrad = r.linearGradient(0, 0, 0, r.height, [
      { offset: 0, color: 'rgba(10, 14, 20, 0.85)' },
      { offset: 1, color: 'rgba(17, 24, 39, 0.95)' }
    ]);
    r.rect(0, 0, r.width, r.height, bgGrad);

    const cx = r.width / 2;
    const cy = r.height / 2;
    const isMenu = kind === 'menu';
    const isEndScreen = kind === 'won' || kind === 'lost';
    const cardW = Math.min(r.width - 32, isEndScreen ? 500 : 440);
    const cardH = isMenu ? 440 : isEndScreen ? 430 : 360;
    const cardX = cx - cardW / 2;
    const cardY = cy - cardH / 2;

    let glowColor = 'rgba(59, 130, 246, 0.15)';
    if (kind === 'won') glowColor = 'rgba(16, 185, 129, 0.22)';
    if (kind === 'lost') glowColor = 'rgba(239, 68, 68, 0.22)';

    r.setShadow(glowColor, 32, 0, 8);
    r.roundRect(cardX, cardY, cardW, cardH, 16, 'rgba(15, 23, 42, 0.88)', true, 'rgba(255, 255, 255, 0.08)', 1.5);
    r.clearShadow();

    const titleKey = kind === 'menu' ? 'app.title' : kind === 'paused' ? 'hud.pause' : kind === 'won' ? 'win.title' : 'lose.title';
    let titleGrad: CanvasGradient;
    let textGlow = 'rgba(59, 130, 246, 0.4)';

    if (kind === 'won') {
      textGlow = 'rgba(52, 211, 153, 0.45)';
      titleGrad = r.linearGradient(cx - 100, cardY + 24, cx + 100, cardY + 24, [
        { offset: 0, color: '#34d399' },
        { offset: 1, color: '#059669' }
      ]);
    } else if (kind === 'lost') {
      textGlow = 'rgba(248, 113, 113, 0.45)';
      titleGrad = r.linearGradient(cx - 100, cardY + 24, cx + 100, cardY + 24, [
        { offset: 0, color: '#f87171' },
        { offset: 1, color: '#dc2626' }
      ]);
    } else {
      titleGrad = r.linearGradient(cx - 120, cardY + 24, cx + 120, cardY + 24, [
        { offset: 0, color: '#60a5fa' },
        { offset: 0.5, color: '#a78bfa' },
        { offset: 1, color: '#f472b6' }
      ]);
    }

    r.setShadow(textGlow, 12, 0, 0);
    r.text(t(titleKey), cx, cardY + 22, titleGrad, 36, 'center', 'bold', 'top', 'header');
    r.clearShadow();

    if (kind === 'menu') r.text(t('app.tagline'), cx, cardY + 70, '#94a3b8', 13, 'center');
    if (kind === 'paused') r.text(t('hud.paused_title'), cx, cardY + 75, '#94a3b8', 13, 'center');
    if (kind === 'won') this.drawVictoryReport(r, cardX, cardY, cardW, score, stats);
    if (kind === 'lost') this.drawDefeatReport(r, cardX, cardY, cardW, score, seed, stats);

    const btnW = cardW - 48;
    const btnH = 38;
    const btnX = cx - btnW / 2;
    let startButtonY = cardY + (isMenu ? 105 : isEndScreen ? 315 : 170);
    if (kind === 'lost' && seed !== 0) startButtonY = cardY + 335;

    const labelKey = kind === 'menu' ? 'menu.start' : kind === 'paused' ? 'menu.resume' : (kind === 'won' ? 'menu.playAgain' : 'menu.retry');
    const primaryAction: MenuClickAction = kind === 'menu' ? 'start' : kind === 'paused' ? 'resume' : 'restart';

    this.drawButton(r, btnX, startButtonY, btnW, btnH, t(labelKey), primaryAction, '#3b82f6', '#1d4ed8');
    let currentY = startButtonY + btnH + 10;

    if (isMenu) {
      this.drawButton(r, btnX, currentY, btnW, btnH, t('menu.endless'), 'endless', '#8b5cf6', '#6d28d9');
      currentY += btnH + 10;
      this.drawButton(r, btnX, currentY, btnW, btnH, t('menu.challenge'), 'challenge', '#475569', '#334155');
      currentY += btnH + 10;
      this.drawButton(r, btnX, currentY, btnW, btnH, t('menu.daily'), 'daily', '#10b981', '#047857');
      currentY += btnH + 10;

      const halfW = (btnW - 10) / 2;
      this.drawButton(r, btnX, currentY, halfW, btnH, t('menu.settings'), 'settings', '#475569', '#334155', 13, false);
      this.drawButton(r, btnX + halfW + 10, currentY, halfW, btnH, t('stats.title'), 'stats', '#475569', '#334155', 13, false);
      r.text(t('menu.shortcuts'), cx, cardY + cardH - 24, '#64748b', 10, 'center');
    } else {
      this.drawButton(r, btnX, currentY, btnW, btnH, t('hud.menu'), 'menu', '#475569', '#1e293b', 13, false);
    }
  }

  private drawVictoryReport(r: Renderer, cardX: number, cardY: number, cardW: number, score: number, stats?: ScreenStats): void {
    const cx = cardX + cardW / 2;
    const starCount = stats?.stars ?? 0;
    const starY = cardY + 70;
    r.setShadow('rgba(251, 191, 36, 0.45)', 14, 0, 0);
    for (let i = 0; i < 3; i++) {
      const starX = cx - 44 + i * 44;
      const active = i < starCount;
      r.text(active ? '★' : '☆', starX, starY, active ? '#fbbf24' : '#334155', 30, 'center', 'normal', 'top', 'header');
    }
    r.clearShadow();

    r.text(this.victoryAdvice(starCount), cx, cardY + 112, '#94a3b8', 12, 'center', 'bold', 'top');
    this.drawReportPanel(r, cardX + 24, cardY + 140, cardW - 48, 142, '#10b981', this.buildRows(score, stats));
  }

  private drawDefeatReport(r: Renderer, cardX: number, cardY: number, cardW: number, score: number, seed: number, stats?: ScreenStats): void {
    const cx = cardX + cardW / 2;
    if (stats?.wave !== undefined) {
      r.text(t('lose.survived').replace('{wave}', String(stats.wave)), cx, cardY + 76, '#f87171', 14, 'center', 'bold', 'top', 'header');
    }
    r.text(t('summary.defeatAdvice'), cx, cardY + 100, '#94a3b8', 12, 'center', 'bold', 'top');
    this.drawReportPanel(r, cardX + 24, cardY + 128, cardW - 48, 126, '#ef4444', this.buildRows(score, stats));

    if (seed !== 0) {
      const seedHex = seed.toString(16).toUpperCase().padStart(8, '0');
      r.text(`${t('menu.endless')} SEED: ${seedHex}`, cx, cardY + 266, '#c084fc', 12, 'center', 'bold', 'top', 'header');
      this.drawButton(r, cx - 90, cardY + 286, 180, 28, t('share.copy'), 'challenge', '#a855f7', '#7e22ce', 11);
    }
  }

  private buildRows(score: number, stats?: ScreenStats): Array<[string, string]> {
    const rows: Array<[string, string]> = [[t('hud.score'), score.toLocaleString()]];
    if (stats?.durationSec !== undefined) rows.push([t('summary.duration'), this.formatTime(stats.durationSec)]);
    if (stats?.kills !== undefined) rows.push([t('win.kills'), `${stats.kills}`]);
    if (stats?.gold !== undefined) rows.push([t('win.gold'), `${stats.gold}g`]);
    if (stats?.towersPlaced !== undefined) rows.push([t('summary.towers'), `${stats.towersPlaced}`]);
    if (stats?.upgrades !== undefined) rows.push([t('summary.upgrades'), `${stats.upgrades}`]);
    if (stats?.spellsCast !== undefined) rows.push([t('summary.spells'), `${stats.spellsCast}`]);
    if (stats?.damageDealt !== undefined) rows.push([t('summary.damage'), `${Math.round(stats.damageDealt)}`]);
    return rows;
  }

  private drawReportPanel(r: Renderer, x: number, y: number, w: number, h: number, accent: string, rows: Array<[string, string]>): void {
    r.roundRect(x, y, w, h, 10, 'rgba(10, 15, 30, 0.66)', true, 'rgba(255, 255, 255, 0.05)', 1);
    r.roundRect(x, y, 4, h, 2, accent, true);
    r.text(t('summary.title'), x + 14, y + 10, '#e2e8f0', 11, 'left', 'bold', 'top', 'header');

    const colW = (w - 28) / 2;
    for (let i = 0; i < rows.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const rx = x + 14 + col * colW;
      const ry = y + 34 + row * 24;
      const [label, value] = rows[i];
      r.text(label, rx, ry, '#64748b', 10, 'left', 'bold');
      r.text(value, rx + colW - 8, ry, '#f8fafc', 11, 'right', 'bold', 'top', 'header');
    }
  }

  private drawButton(r: Renderer, x: number, y: number, w: number, h: number, label: string, action: MenuClickAction, colorA: string, colorB: string, fontSize = 14, strong = true): void {
    const grad = r.linearGradient(x, y, x, y + h, [
      { offset: 0, color: colorA },
      { offset: 1, color: colorB }
    ]);
    r.roundRect(x, y, w, h, 8, grad, true, 'rgba(255, 255, 255, 0.12)', 1);
    r.text(label, x + w / 2, y + h / 2, strong ? '#ffffff' : '#cbd5e1', fontSize, 'center', 'bold', 'middle');
    this.regions.push({ x, y, w, h, action });
  }

  private victoryAdvice(stars: number): string {
    if (stars >= 3) return t('summary.victoryPerfect');
    if (stars >= 2) return t('summary.victoryGood');
    return t('summary.victoryPass');
  }

  private formatTime(sec: number): string {
    if (sec <= 0) return '0s';
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  hit(x: number, y: number): MenuClickAction {
    for (const b of this.regions) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.action;
    }
    return null;
  }
}
