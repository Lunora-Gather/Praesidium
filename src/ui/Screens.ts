// Full-screen overlays for pause, victory, and defeat.
// Win/loss screens include a compact battle report so each run ends with useful feedback.

import type { FocusRegion } from './ControlFocus';
import { Renderer } from '../engine/Renderer';
import { t } from '../utils/i18n';
import { buildDefeatAdviceFromSummary } from '../utils/RunAdvice';
import { DailyMissionPanel } from './DailyMissionPanel';
import { drawGlassPanel, layoutFor, UI } from './Layout';

export type MenuClickAction = 'start' | 'share' | 'resume' | 'restart' | 'next' | 'levels' | 'menu' | 'settings' | 'stats' | 'codex' | 'talent' | 'brief' | null;

export interface ScreenStats {
  stars?: number;
  wave?: number;
  advice?: string;
  kills?: number;
  gold?: number;
  goldAvailable?: number;
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
  isNewModeRecord?: boolean;
  missionCredits?: number;
  weeklyCredits?: number;
  recentAchievements?: number;
  missionDate?: string;
  missionEligible?: boolean;
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
  private regions: Array<FocusRegion & { action: MenuClickAction }> = [];

  get focusRegions(): readonly FocusRegion[] { return this.regions; }
  private readonly dailyMissionPanel = new DailyMissionPanel();

  draw(r: Renderer, kind: 'paused' | 'won' | 'lost', score = 0, seed = 0, stats?: ScreenStats): void {
    this.regions = [];
    const layout = layoutFor(r);

    r.rect(0, 0, r.width, r.height, kind === 'paused' ? '#0d151ff6' : '#0d151f');

    const cx = r.width / 2;
    const cy = r.height / 2;
    const isEndScreen = kind === 'won' || kind === 'lost';
    const compact = layout.isCompact;
    const cardW = Math.min(r.width - layout.safe * 2, isEndScreen ? 520 : 460);
    const cardH = isEndScreen
        ? Math.min(compact ? 398 : 430, r.height - layout.safe * 2)
        : Math.min(360, r.height - layout.safe * 2);
    const cardX = cx - cardW / 2;
    const cardY = cy - cardH / 2;

    let glowColor = UI.color.blue;
    if (kind === 'won') glowColor = UI.color.green;
    if (kind === 'lost') glowColor = UI.color.red;
    if (isEndScreen) drawGlassPanel(r, cardX, cardY, cardW, cardH, layout.radius + 2, glowColor, 0.9);

    const titleKey = kind === 'paused' ? 'hud.pause' : kind === 'won' ? 'win.title' : 'lose.title';
    const titleColor = kind === 'won' ? '#9de7c7' : kind === 'lost' ? '#f1a99b' : '#edf3f8';
    r.text(t(titleKey), cx, cardY + 22, titleColor, compact ? 31 : 36, 'center', 'bold', 'top', 'header');

    const btnW = cardW - 48;
    const btnH = 44;
    const btnX = cx - btnW / 2;

    if (kind === 'paused') {
      const info = stats ? [`${t('hud.wave')} ${stats.wave}`, `${t('hud.lives')} ${stats.lives}`].join('  ·  ') : t('hud.paused_title');
      r.text(info, cx, cardY + 75, UI.color.textMuted, 13, 'center');
      const firstY = cardY + 104;
      const halfW = (btnW - 8) / 2;
      const secondX = btnX + halfW + 8;
      const settingsY = firstY + btnH + 10;
      const referenceY = settingsY + btnH + 8;
      r.roundRect(btnX, firstY, halfW, btnH, 6, '#f2c584');
      r.text(t('menu.resume'), btnX + halfW / 2, firstY + btnH / 2, '#2b2118', 13, 'center', 'bold', 'middle');
      this.regions.push({ x: btnX, y: firstY, w: halfW, h: btnH, action: 'resume', label: t('menu.resume') });
      this.drawButton(r, secondX, firstY, halfW, btnH, t('hud.menu'), 'menu', '#475569', '#1e293b', 13, false);
      this.drawUtilityButton(r, btnX, settingsY, halfW, btnH, '⚙', t('menu.settings'), 'settings');
      this.drawUtilityButton(r, secondX, settingsY, halfW, btnH, '▣', t('hud.stats'), 'stats');
      this.drawUtilityButton(r, btnX, referenceY, halfW, btnH, 'ⓘ', t('hud.intel'), 'codex');
      this.drawUtilityButton(r, secondX, referenceY, halfW, btnH, '✦', t('hud.talent'), 'talent');
      return;
    }

    const footer = cardY + cardH - 16 - btnH;
    if (kind === 'won') {
      const startButtonY = footer - btnH - 8;
      this.drawVictoryReport(r, cardX, cardY, cardW, score, stats, compact, startButtonY - 10);
      this.dailyMissionPanel.drawProgress(r, { score, ...(stats ?? {}) });
      const hasNext = !!stats?.hasNextLevel;
      this.drawButton(r, btnX, startButtonY, btnW, btnH, hasNext ? t('summary.nextLevel') : t('menu.levels'), hasNext ? 'next' : 'levels', UI.color.green, '#047857');
      const halfW = (btnW - 10) / 2;
      this.drawButton(r, btnX, footer, halfW, btnH, t('summary.retryForStars'), 'restart', '#475569', '#334155', compact ? 10.5 : 12, false);
      this.drawButton(r, btnX + halfW + 10, footer, halfW, btnH, t(hasNext ? 'menu.levels' : 'hud.menu'), hasNext ? 'levels' : 'menu', '#475569', '#334155', compact ? 10.5 : 12, false);
      return;
    }

    this.drawDefeatReport(r, cardX, cardY, cardW, score, stats, compact, footer - 10);
    this.dailyMissionPanel.drawProgress(r, { score, ...(stats ?? {}) });
    const gap = 8;
    const actionW = seed ? (btnW - 2 * gap) / 3 : (btnW - gap) / 2;
    this.drawButton(r, btnX, footer, actionW, btnH, t('menu.retry'), 'restart', UI.color.blue, '#1d4ed8');
    this.drawButton(r, btnX + actionW + gap, footer, actionW, btnH, t('hud.menu'), 'menu', '#475569', '#1e293b', 13, false);
    if (seed) this.drawButton(r, btnX + 2 * (actionW + gap), footer, actionW, btnH, t('share.open'), 'share', '#7e22ce', '#581c87', 12);
  }

  private drawUtilityButton(r: Renderer, x: number, y: number, w: number, h: number, icon: string, label: string, action: MenuClickAction): void {
    r.rect(x, y + h - 1, w, 1, '#293b4c');
    r.text(icon, x + 22, y + h / 2, '#cbd5e1', 12, 'center', 'bold', 'middle', 'header');
    r.text(label, x + 42, y + h / 2, '#cbd5e1', 11, 'left', 'bold', 'middle', 'header');
    this.regions.push({ x, y, w, h, action, label });
  }

  private drawVictoryReport(r: Renderer, cardX: number, cardY: number, cardW: number, score: number, stats: ScreenStats | undefined, compact: boolean, bottom: number): void {
    const cx = cardX + cardW / 2;
    const starCount = stats?.stars ?? 0;
    const starY = cardY + (compact ? 58 : 70);
    const starSize = compact ? 25 : 30;
    r.setShadow('rgba(251, 191, 36, 0.45)', 14, 0, 0);
    for (let i = 0; i < 3; i++) {
      const starX = cx - (compact ? 36 : 44) + i * (compact ? 36 : 44);
      const active = i < starCount;
      r.text(active ? '★' : '☆', starX, starY, active ? UI.color.gold : '#334155', starSize, 'center', 'normal', 'top', 'header');
    }
    r.clearShadow();
    r.text(this.victoryAdvice(starCount), cx, cardY + (compact ? 94 : 112), UI.color.textMuted, compact ? 10.5 : 12, 'center', 'bold', 'top', 'ui', cardW - 40);
    this.drawBadges(r, cx, cardY + (compact ? 112 : 130), this.buildBadges(stats), compact);
    const y = cardY + (compact ? 134 : 152);
    this.drawReportPanel(r, cardX + 24, y, cardW - 48, bottom - y, UI.color.green, this.buildRows(score, stats));
  }

  private drawDefeatReport(r: Renderer, cardX: number, cardY: number, cardW: number, score: number, stats: ScreenStats | undefined, compact: boolean, bottom: number): void {
    const cx = cardX + cardW / 2;
    if (stats?.wave !== undefined) r.text(t('lose.survived').replace('{wave}', String(stats.wave)), cx, cardY + (compact ? 66 : 76), '#f87171', compact ? 12 : 14, 'center', 'bold', 'top', 'header');
    const advice = stats?.advice ?? buildDefeatAdviceFromSummary(stats ?? {});
    r.text(advice, cx, cardY + (compact ? 90 : 100), UI.color.textMuted, compact ? 10.5 : 12, 'center', 'bold', 'top', 'ui', cardW - 40);
    this.drawBadges(r, cx, cardY + (compact ? 108 : 118), this.buildBadges(stats), compact);
    const y = cardY + (compact ? 130 : 140);
    this.drawReportPanel(r, cardX + 24, y, cardW - 48, bottom - y, UI.color.red, this.buildRows(score, stats));
  }

  private buildBadges(stats?: ScreenStats): SummaryBadge[] {
    const badges: SummaryBadge[] = [];
    if (stats?.recentAchievements) {
      badges.push({ label: t('summary.newAchievements').replace('{count}', String(stats.recentAchievements)), color: UI.color.gold });
    }
    if (stats?.isNewHighScore) badges.push({ label: t('summary.newHighScore'), color: '#60a5fa' });
    if (stats?.isNewLevelScore) badges.push({ label: t('summary.newLevelScore'), color: '#22c55e' });
    if (stats?.isStarUpgrade) badges.push({ label: t('summary.starUpgrade'), color: UI.color.gold });
    if (stats?.isNewEndlessRecord) badges.push({ label: t('summary.endlessRecord'), color: '#a78bfa' });
    if (stats?.isNewDailyRecord) badges.push({ label: t('summary.dailyRecord'), color: '#14b8a6' });
    if (stats?.isNewModeRecord) badges.push({ label: t('summary.modeRecord'), color: '#a78bfa' });
    if ((stats?.missionCredits ?? 0) > 0) badges.push({ label: t('summary.dailyCredits').replace('{credits}', `${stats?.missionCredits}`), color: '#2dd4bf' });
    if ((stats?.weeklyCredits ?? 0) > 0) badges.push({ label: t('summary.weeklyCredits').replace('{credits}', `${stats?.weeklyCredits}`), color: '#c084fc' });
    return badges;
  }

  private drawBadges(r: Renderer, cx: number, y: number, badges: SummaryBadge[], compact = false): void {
    if (badges.length === 0) return;
    const visible = badges.slice(0, compact ? 2 : 3);
    const widths = visible.map(badge => Math.max(compact ? 78 : 86, badge.label.length * (compact ? 5.2 : 6) + 24));
    const gap = 8;
    const totalW = widths.reduce((sum, item) => sum + item, 0) + gap * (visible.length - 1);
    let x = cx - totalW / 2;
    for (let i = 0; i < visible.length; i++) {
      const badge = visible[i];
      const w = widths[i];
      r.roundRect(x, y, w, compact ? 16 : 18, 9, 'rgba(15, 23, 42, 0.88)', true, badge.color, 1);
      r.text(badge.label, x + w / 2, y + (compact ? 8 : 9), badge.color, compact ? 8 : 9, 'center', 'bold', 'middle', 'header');
      x += w + gap;
    }
  }

  private buildRows(score: number, stats?: ScreenStats): ReportRow[] {
    const rows: ReportRow[] = [this.reportRow(t('hud.score'), score.toLocaleString(), '◆', '#60a5fa')];
    if (stats?.kills !== undefined) rows.push(this.reportRow(t('win.kills'), `${stats.kills}`, '✦', '#f97316'));
    if (stats?.gold !== undefined) rows.push(this.reportRow(t('win.gold'), `${stats.gold}g`, '●', UI.color.gold));
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
    if (h < 30) return;
    if (h < 72) {
      const visible = rows.slice(0, w < 290 ? 3 : 4);
      const slot = w / visible.length;
      r.rect(x, y, w, 1, '#293b4c');
      for (const [i, item] of visible.entries()) {
        const cx = x + (i + .5) * slot;
        r.text(item.label, cx, y + 5, '#acbdce', 9, 'center', 'normal', 'top', 'ui', slot - 6);
        r.text(item.value, cx, y + 18, '#edf3f8', 12, 'center', 'bold', 'top', 'header', slot - 6);
      }
      return;
    }
    r.roundRect(x, y, w, h, 12, 'rgba(10, 15, 30, 0.66)', true, 'rgba(255, 255, 255, 0.05)', 1);
    r.roundRect(x, y, 4, h, 2, accent, true);
    r.text(t('summary.title'), x + 14, y + 10, '#e2e8f0', 11, 'left', 'bold', 'top', 'header');
    const cols = w >= 410 ? 3 : 2;
    const gap = 7;
    const gridX = x + 14;
    const gridY = y + 32;
    const tileW = (w - 28 - gap * (cols - 1)) / cols;
    const tileH = h < 125 ? 25 : 29;
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
      r.text(item.label, rx + 25, ry + 4, UI.color.textDim, 8, 'left', 'bold', 'top');
      r.text(item.value, rx + tileW - 8, ry + (tileH < 28 ? 13 : 16), UI.color.text, tileH < 28 ? 10.5 : 12, 'right', 'bold', 'top', 'header');
    }
  }

  private drawButton(r: Renderer, x: number, y: number, w: number, h: number, label: string, action: MenuClickAction, colorA: string, colorB: string, fontSize = 14, strong = true): void {
    const grad = r.linearGradient(x, y, x, y + h, [
      { offset: 0, color: colorA },
      { offset: 1, color: colorB }
    ]);
    r.roundRect(x, y, w, h, 9, grad, true, 'rgba(255, 255, 255, 0.12)', 1);
    r.text(label, x + w / 2, y + h / 2, strong ? '#ffffff' : '#cbd5e1', fontSize, 'center', 'bold', 'middle', 'ui', w - 12);
    this.regions.push({ x, y, w, h, action, label });
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
