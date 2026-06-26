// Full-screen overlays: main menu, pause, victory, defeat.
// Win/loss screens include a compact battle report so each run ends with useful feedback.

import { Renderer } from '../engine/Renderer';
import { t } from '../utils/i18n';

export type MenuClickAction = 'start' | 'endless' | 'challenge' | 'daily' | 'resume' | 'restart' | 'next' | 'levels' | 'menu' | 'settings' | 'stats' | null;

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
  hasNextLevel?: boolean;
  isNewHighScore?: boolean;
  isNewLevelScore?: boolean;
  isStarUpgrade?: boolean;
  isNewEndlessRecord?: boolean;
  isNewDailyRecord?: boolean;
}

interface ReportRow {
  label: string;
  value: string;
  icon: string;
  color: string;
}

interface SummaryBadge {
  label: string;
  color: string;
}

export class Screens {
  private regions: Array<{ x: number; y: number; w: number; h: number; action: MenuClickAction }> = [];

  draw(r: Renderer, kind: 'menu' | 'paused' | 'won' | 'lost', score = 0, seed = 0, stats?: ScreenStats): void {
    this.regions = [];

    const bgGrad = r.linearGradient(0, 0, 0, r.height, [
      { offset: 0, color: 'rgba(8, 12, 24, 0.92)' },
      { offset: 0.55, color: 'rgba(15, 23, 42, 0.94)' },
      { offset: 1, color: 'rgba(2, 6, 23, 0.98)' }
    ]);
    r.rect(0, 0, r.width, r.height, bgGrad);

    if (kind === 'menu') this.drawMenuBackdrop(r);

    const cx = r.width / 2;
    const cy = r.height / 2;
    const isEndScreen = kind === 'won' || kind === 'lost';
    const cardW = Math.min(r.width - 32, kind === 'menu' ? 520 : isEndScreen ? 500 : 440);
    const cardH = kind === 'menu' ? Math.min(540, r.height - 40) : isEndScreen ? 430 : 360;
    const cardX = cx - cardW / 2;
    const cardY = cy - cardH / 2;

    let glowColor = 'rgba(59, 130, 246, 0.15)';
    if (kind === 'won') glowColor = 'rgba(16, 185, 129, 0.22)';
    if (kind === 'lost') glowColor = 'rgba(239, 68, 68, 0.22)';

    r.setShadow(glowColor, 32, 0, 8);
    r.roundRect(cardX, cardY, cardW, cardH, 18, 'rgba(15, 23, 42, 0.9)', true, 'rgba(255, 255, 255, 0.08)', 1.5);
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
    r.text(t(titleKey), cx, cardY + 22, titleGrad, kind === 'menu' ? 40 : 36, 'center', 'bold', 'top', 'header');
    r.clearShadow();

    if (kind === 'menu') {
      this.drawReleaseMenu(r, cardX, cardY, cardW, cardH);
      return;
    }

    if (kind === 'paused') r.text(t('hud.paused_title'), cx, cardY + 75, '#94a3b8', 13, 'center');
    if (kind === 'won') this.drawVictoryReport(r, cardX, cardY, cardW, score, stats);
    if (kind === 'lost') this.drawDefeatReport(r, cardX, cardY, cardW, score, seed, stats);

    const btnW = cardW - 48;
    const btnH = 38;
    const btnX = cx - btnW / 2;
    let startButtonY = cardY + (isEndScreen ? 315 : 170);
    if (kind === 'lost' && seed !== 0) startButtonY = cardY + 335;

    if (kind === 'paused') {
      this.drawButton(r, btnX, startButtonY, btnW, btnH, t('menu.resume'), 'resume', '#3b82f6', '#1d4ed8');
      this.drawButton(r, btnX, startButtonY + btnH + 10, btnW, btnH, t('hud.menu'), 'menu', '#475569', '#1e293b', 13, false);
      return;
    }

    if (kind === 'won') {
      const hasNext = !!stats?.hasNextLevel;
      this.drawButton(r, btnX, startButtonY, btnW, btnH, hasNext ? t('summary.nextLevel') : t('menu.levels'), hasNext ? 'next' : 'levels', '#10b981', '#047857');
      const halfW = (btnW - 10) / 2;
      this.drawButton(r, btnX, startButtonY + btnH + 10, halfW, btnH, t('summary.retryForStars'), 'restart', '#475569', '#334155', 12, false);
      this.drawButton(r, btnX + halfW + 10, startButtonY + btnH + 10, halfW, btnH, t('menu.levels'), 'levels', '#475569', '#334155', 12, false);
      return;
    }

    this.drawButton(r, btnX, startButtonY, btnW, btnH, t('menu.retry'), 'restart', '#3b82f6', '#1d4ed8');
    this.drawButton(r, btnX, startButtonY + btnH + 10, btnW, btnH, t('hud.menu'), 'menu', '#475569', '#1e293b', 13, false);
  }

  private drawReleaseMenu(r: Renderer, cardX: number, cardY: number, cardW: number, cardH: number): void {
    const cx = cardX + cardW / 2;
    r.text(t('app.tagline'), cx, cardY + 72, '#cbd5e1', 13, 'center', 'bold');
    r.text('Campaign · Endless · Daily · Challenge Seed', cx, cardY + 92, '#64748b', 10, 'center', 'bold', 'top', 'header');

    const stripY = cardY + 118;
    const chipGap = 8;
    const chipW = (cardW - 48 - chipGap * 3) / 4;
    const chips: Array<[string, string, string]> = [
      ['★', t('level.level'), '#60a5fa'],
      ['✦', t('talent.title'), '#fbbf24'],
      ['ⓘ', t('codex.title'), '#a78bfa'],
      ['🏆', t('stats.title'), '#34d399'],
    ];
    let chipX = cardX + 24;
    for (const [icon, label, color] of chips) {
      r.roundRect(chipX, stripY, chipW, 42, 12, 'rgba(2, 6, 23, 0.44)', true, `${color}55`, 1);
      r.text(icon, chipX + chipW / 2, stripY + 9, color, 13, 'center', 'bold', 'top', 'header');
      r.text(label, chipX + chipW / 2, stripY + 25, '#cbd5e1', 8.5, 'center', 'bold', 'top', 'header');
      chipX += chipW + chipGap;
    }

    const btnW = cardW - 64;
    const btnH = 38;
    const btnX = cx - btnW / 2;
    let y = cardY + 182;
    this.drawButton(r, btnX, y, btnW, btnH, t('menu.start'), 'start', '#3b82f6', '#1d4ed8');
    y += btnH + 10;
    this.drawButton(r, btnX, y, btnW, btnH, t('menu.endless'), 'endless', '#8b5cf6', '#6d28d9');
    y += btnH + 10;

    const halfW = (btnW - 10) / 2;
    this.drawButton(r, btnX, y, halfW, btnH, t('menu.daily'), 'daily', '#10b981', '#047857', 13);
    this.drawButton(r, btnX + halfW + 10, y, halfW, btnH, t('menu.challenge'), 'challenge', '#a855f7', '#7e22ce', 13);
    y += btnH + 12;
    this.drawButton(r, btnX, y, halfW, btnH, t('menu.settings'), 'settings', '#475569', '#334155', 13, false);
    this.drawButton(r, btnX + halfW + 10, y, halfW, btnH, t('stats.title'), 'stats', '#475569', '#334155', 13, false);

    const hintY = Math.min(cardY + cardH - 46, y + btnH + 24);
    r.roundRect(cardX + 24, hintY - 8, cardW - 48, 34, 10, 'rgba(2, 6, 23, 0.35)', true, 'rgba(148, 163, 184, 0.08)', 1);
    r.text(t('menu.shortcuts'), cx, hintY + 1, '#64748b', 9.5, 'center');
  }

  private drawMenuBackdrop(r: Renderer): void {
    const cx = r.width / 2;
    const cy = r.height / 2;
    r.ctx.save();
    r.ctx.globalAlpha = 0.16;
    r.circle({ x: cx - 210, y: cy - 180 } as any, 90, '#3b82f6', true);
    r.circle({ x: cx + 220, y: cy + 180 } as any, 110, '#a855f7', true);
    r.circle({ x: cx + 260, y: cy - 170 } as any, 60, '#10b981', true);
    r.ctx.restore();
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
    this.drawBadges(r, cx, cardY + 130, this.buildBadges(stats));
    this.drawReportPanel(r, cardX + 24, cardY + 152, cardW - 48, 136, '#10b981', this.buildRows(score, stats));
  }

  private drawDefeatReport(r: Renderer, cardX: number, cardY: number, cardW: number, score: number, seed: number, stats?: ScreenStats): void {
    const cx = cardX + cardW / 2;
    if (stats?.wave !== undefined) r.text(t('lose.survived').replace('{wave}', String(stats.wave)), cx, cardY + 76, '#f87171', 14, 'center', 'bold', 'top', 'header');
    r.text(t('summary.defeatAdvice'), cx, cardY + 100, '#94a3b8', 12, 'center', 'bold', 'top');
    this.drawBadges(r, cx, cardY + 118, this.buildBadges(stats));
    this.drawReportPanel(r, cardX + 24, cardY + 140, cardW - 48, 136, '#ef4444', this.buildRows(score, stats));
    if (seed !== 0) {
      const seedHex = seed.toString(16).toUpperCase().padStart(8, '0');
      r.text(`${t('menu.endless')} SEED: ${seedHex}`, cx, cardY + 286, '#c084fc', 12, 'center', 'bold', 'top', 'header');
      this.drawButton(r, cx - 90, cardY + 306, 180, 28, t('share.copy'), 'challenge', '#a855f7', '#7e22ce', 11);
    }
  }

  private buildBadges(stats?: ScreenStats): SummaryBadge[] {
    const badges: SummaryBadge[] = [];
    if (stats?.isNewHighScore) badges.push({ label: t('summary.newHighScore'), color: '#60a5fa' });
    if (stats?.isNewLevelScore) badges.push({ label: t('summary.newLevelScore'), color: '#22c55e' });
    if (stats?.isStarUpgrade) badges.push({ label: t('summary.starUpgrade'), color: '#fbbf24' });
    if (stats?.isNewEndlessRecord) badges.push({ label: t('summary.endlessRecord'), color: '#a78bfa' });
    if (stats?.isNewDailyRecord) badges.push({ label: t('summary.dailyRecord'), color: '#14b8a6' });
    return badges;
  }

  private drawBadges(r: Renderer, cx: number, y: number, badges: SummaryBadge[]): void {
    if (badges.length === 0) return;
    const visible = badges.slice(0, 3);
    const widths = visible.map(badge => Math.max(86, badge.label.length * 6 + 24));
    const gap = 8;
    const totalW = widths.reduce((sum, item) => sum + item, 0) + gap * (visible.length - 1);
    let x = cx - totalW / 2;
    for (let i = 0; i < visible.length; i++) {
      const badge = visible[i];
      const w = widths[i];
      r.roundRect(x, y, w, 18, 9, 'rgba(15, 23, 42, 0.88)', true, badge.color, 1);
      r.text(badge.label, x + w / 2, y + 9, badge.color, 9, 'center', 'bold', 'middle', 'header');
      x += w + gap;
    }
  }

  private buildRows(score: number, stats?: ScreenStats): ReportRow[] {
    const rows: ReportRow[] = [this.reportRow(t('hud.score'), score.toLocaleString(), '◆', '#60a5fa')];
    if (stats?.kills !== undefined) rows.push(this.reportRow(t('win.kills'), `${stats.kills}`, '✦', '#f97316'));
    if (stats?.gold !== undefined) rows.push(this.reportRow(t('win.gold'), `${stats.gold}g`, '●', '#fbbf24'));
    if (stats?.lives !== undefined) rows.push(this.reportRow(t('hud.lives'), `${stats.lives}`, '♥', '#34d399'));
    if (stats?.damageDealt !== undefined) rows.push(this.reportRow(t('summary.damage'), `${Math.round(stats.damageDealt)}`, '⌁', '#f87171'));
    if (stats?.durationSec !== undefined) rows.push(this.reportRow(t('summary.duration'), this.formatTime(stats.durationSec), '◷', '#a78bfa'));
    if (stats?.towersPlaced !== undefined) rows.push(this.reportRow(t('summary.towers'), `${stats.towersPlaced}`, '▲', '#38bdf8'));
    if (stats?.upgrades !== undefined) rows.push(this.reportRow(t('summary.upgrades'), `${stats.upgrades}`, '⬆', '#22c55e'));
    if (stats?.spellsCast !== undefined) rows.push(this.reportRow(t('summary.spells'), `${stats.spellsCast}`, '✹', '#c084fc'));
    return rows;
  }

  private reportRow(label: string, value: string, icon: string, color: string): ReportRow {
    return { label, value, icon, color };
  }

  private drawReportPanel(r: Renderer, x: number, y: number, w: number, h: number, accent: string, rows: ReportRow[]): void {
    r.roundRect(x, y, w, h, 12, 'rgba(10, 15, 30, 0.66)', true, 'rgba(255, 255, 255, 0.05)', 1);
    r.roundRect(x, y, 4, h, 2, accent, true);
    r.text(t('summary.title'), x + 14, y + 10, '#e2e8f0', 11, 'left', 'bold', 'top', 'header');
    const cols = w >= 410 ? 3 : 2;
    const gap = 7;
    const gridX = x + 14;
    const gridY = y + 32;
    const tileW = (w - 28 - gap * (cols - 1)) / cols;
    const tileH = 29;
    for (let i = 0; i < rows.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const rx = gridX + col * (tileW + gap);
      const ry = gridY + row * (tileH + gap);
      if (ry + tileH > y + h - 8) continue;
      const item = rows[i];
      const fill = r.linearGradient(rx, ry, rx, ry + tileH, [
        { offset: 0, color: 'rgba(15, 23, 42, 0.94)' },
        { offset: 1, color: 'rgba(2, 6, 23, 0.86)' }
      ]);
      r.roundRect(rx, ry, tileW, tileH, 8, fill, true, 'rgba(148, 163, 184, 0.1)', 1);
      r.roundRect(rx, ry, 3, tileH, 2, item.color, true);
      r.text(item.icon, rx + 13, ry + tileH / 2, item.color, 11, 'center', 'bold', 'middle', 'header');
      r.text(item.label, rx + 25, ry + 5, '#64748b', 8.5, 'left', 'bold', 'top');
      r.text(item.value, rx + tileW - 8, ry + 16, '#f8fafc', 12, 'right', 'bold', 'top', 'header');
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
