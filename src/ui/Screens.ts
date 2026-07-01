// Full-screen overlays: main menu, pause, victory, defeat.
// Win/loss screens include a compact battle report so each run ends with useful feedback.

import { Renderer } from '../engine/Renderer';
import { t } from '../utils/i18n';
import { dailyDateStr } from '../utils/DailyChallenge';
import { dailyMissions } from '../utils/DailyMissions';
import { buildDefeatAdviceFromSummary } from '../utils/RunAdvice';
import { weeklyMode } from '../utils/WeeklyMode';
import { DailyMissionPanel } from './DailyMissionPanel';
import { drawGlassPanel, layoutFor, UI } from './Layout';

export type MenuClickAction = 'start' | 'endless' | 'challenge' | 'daily' | 'resume' | 'restart' | 'next' | 'levels' | 'menu' | 'settings' | 'stats' | null;

export interface ScreenStats {
  stars?: number;
  wave?: number;
  advice?: string;
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
  missionCredits?: number;
  weeklyCredits?: number;
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
  private readonly dailyMissionPanel = new DailyMissionPanel();

  draw(r: Renderer, kind: 'menu' | 'paused' | 'won' | 'lost', score = 0, seed = 0, stats?: ScreenStats): void {
    this.regions = [];
    const layout = layoutFor(r);

    const bgGrad = r.linearGradient(0, 0, 0, r.height, [
      { offset: 0, color: 'rgba(8, 12, 24, 0.92)' },
      { offset: 0.55, color: 'rgba(15, 23, 42, 0.94)' },
      { offset: 1, color: 'rgba(2, 6, 23, 0.98)' }
    ]);
    r.rect(0, 0, r.width, r.height, bgGrad);

    if (kind === 'menu') {
      this.drawReleaseMenu(r, layout.isCompact);
      return;
    }

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
    drawGlassPanel(r, cardX, cardY, cardW, cardH, layout.radius + 2, glowColor, 0.9);

    const titleKey = kind === 'paused' ? 'hud.pause' : kind === 'won' ? 'win.title' : 'lose.title';
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
    r.text(t(titleKey), cx, cardY + 22, titleGrad, compact ? 31 : 36, 'center', 'bold', 'top', 'header');
    r.clearShadow();

    if (kind === 'paused') r.text(t('hud.paused_title'), cx, cardY + 75, UI.color.textMuted, 13, 'center');
    if (kind === 'won') {
      this.drawVictoryReport(r, cardX, cardY, cardW, score, stats, compact);
      this.dailyMissionPanel.drawProgress(r, { score, ...(stats ?? {}) });
    }
    if (kind === 'lost') {
      this.drawDefeatReport(r, cardX, cardY, cardW, score, seed, stats, compact);
      this.dailyMissionPanel.drawProgress(r, { score, ...(stats ?? {}) });
    }

    const btnW = cardW - 48;
    const btnH = compact ? 34 : 38;
    const btnX = cx - btnW / 2;
    let startButtonY = cardY + (isEndScreen ? (compact ? cardH - 102 : 315) : 170);
    if (kind === 'lost' && seed !== 0) startButtonY = cardY + (compact ? cardH - 84 : 335);

    if (kind === 'paused') {
      this.drawButton(r, btnX, startButtonY, btnW, btnH, t('menu.resume'), 'resume', UI.color.blue, '#1d4ed8');
      this.drawButton(r, btnX, startButtonY + btnH + 10, btnW, btnH, t('hud.menu'), 'menu', '#475569', '#1e293b', 13, false);
      return;
    }

    if (kind === 'won') {
      const hasNext = !!stats?.hasNextLevel;
      this.drawButton(r, btnX, startButtonY, btnW, btnH, hasNext ? t('summary.nextLevel') : t('menu.levels'), hasNext ? 'next' : 'levels', UI.color.green, '#047857');
      const halfW = (btnW - 10) / 2;
      this.drawButton(r, btnX, startButtonY + btnH + 10, halfW, btnH, t('summary.retryForStars'), 'restart', '#475569', '#334155', compact ? 10.5 : 12, false);
      this.drawButton(r, btnX + halfW + 10, startButtonY + btnH + 10, halfW, btnH, t('menu.levels'), 'levels', '#475569', '#334155', compact ? 10.5 : 12, false);
      return;
    }

    this.drawButton(r, btnX, startButtonY, btnW, btnH, t('menu.retry'), 'restart', UI.color.blue, '#1d4ed8');
    this.drawButton(r, btnX, startButtonY + btnH + 10, btnW, btnH, t('hud.menu'), 'menu', '#475569', '#1e293b', 13, false);
  }

  private drawReleaseMenu(r: Renderer, compact: boolean): void {
    this.drawMenuBackdrop(r);

    const layout = layoutFor(r);
    const safe = Math.max(layout.safe, 18);
    const isShort = r.height < 560;
    const cx = r.width / 2;
    const titleY = isShort ? 24 : Math.max(38, r.height * 0.075);
    this.drawHeroCopy(r, cx, titleY, 'center', compact, isShort);

    const stageW = Math.min(r.width - safe * 2, compact ? 620 : 900);
    const stageH = isShort ? 0 : Math.min(230, Math.max(155, r.height * 0.24));
    const stageX = cx - stageW / 2;
    const stageY = titleY + (compact ? 88 : 118);
    if (!isShort) {
      this.drawCommandStage(r, stageX, stageY, stageW, stageH);
      this.drawOpsBrief(r, stageX + 24, stageY + stageH - 76, Math.min(360, stageW - 48));
    }

    const dockW = Math.min(r.width - safe * 2, compact || isShort ? 560 : 820);
    const dockH = compact || isShort ? 156 : 174;
    const dockX = cx - dockW / 2;
    const dockY = isShort
      ? Math.max(112, r.height * 0.30)
      : Math.min(r.height - dockH - safe, stageY + stageH + 18);
    this.drawModeDock(r, dockX, dockY, dockW, dockH, compact || isShort);
  }

  private drawMenuBackdrop(r: Renderer): void {
    const horizonY = Math.max(150, Math.floor(r.height * 0.60));
    const gridGrad = r.linearGradient(0, horizonY, 0, r.height, [
      { offset: 0, color: 'rgba(14, 165, 233, 0.10)' },
      { offset: 1, color: 'rgba(2, 6, 23, 0)' },
    ]);
    r.rect(0, horizonY, r.width, r.height - horizonY, gridGrad, true);

    const oldAlpha = r.ctx.globalAlpha;
    r.ctx.save();
    r.ctx.globalAlpha = 0.18;
    r.ctx.strokeStyle = 'rgba(103, 232, 249, 0.42)';
    r.ctx.lineWidth = 1;
    for (let y = horizonY + 18; y < r.height; y += 34) {
      r.ctx.beginPath();
      r.ctx.moveTo(0, y);
      r.ctx.lineTo(r.width, y + (y - horizonY) * 0.08);
      r.ctx.stroke();
    }
    for (let x = -r.width; x < r.width * 2; x += 92) {
      r.ctx.beginPath();
      r.ctx.moveTo(x, r.height);
      r.ctx.lineTo(r.width / 2 + (x - r.width / 2) * 0.16, horizonY);
      r.ctx.stroke();
    }
    r.ctx.restore();
    r.ctx.globalAlpha = oldAlpha;
  }

  private drawHeroCopy(r: Renderer, x: number, y: number, align: CanvasTextAlign, compact: boolean, isShort: boolean): void {
    const titleSize = isShort ? 32 : compact ? 42 : 58;
    const taglineSize = isShort ? 11 : compact ? 12 : 14;
    const titleW = Math.min(560, r.width - 36);
    const titleX1 = x - titleW / 2;
    const titleGrad = r.linearGradient(titleX1, y, titleX1 + titleW, y, [
      { offset: 0, color: '#67e8f9' },
      { offset: 0.5, color: '#93c5fd' },
      { offset: 1, color: '#f0abfc' },
    ]);

    r.text('PRAESIDIUM', x, y, titleGrad, titleSize, align, 'bold', 'top', 'header');
    r.text(t('app.tagline'), x, y + titleSize + (isShort ? 5 : 8), '#dbeafe', taglineSize, align, 'bold', 'top');
    if (!isShort) {
      r.text('10 zones · Daily ops · Weekly modifiers', x, y + titleSize + 28, UI.color.textDim, compact ? 9.5 : 11, align, 'bold', 'top', 'header');
    }

    const railW = Math.min(isShort ? 320 : 390, r.width - 48);
    const railX = x - railW / 2;
    const railY = y + titleSize + (isShort ? 31 : 58);
    const items: Array<[string, string, string]> = [
      ['01', 'Campaign', '#60a5fa'],
      ['∞', 'Endless', '#a78bfa'],
      ['24H', 'Daily', '#2dd4bf'],
    ];
    const itemW = (railW - 12) / 3;
    for (let i = 0; i < items.length; i++) {
      const [kicker, label, color] = items[i];
      const ix = railX + i * (itemW + 6);
      this.drawCutPanel(r, ix, railY, itemW, isShort ? 31 : 38, 7, 'rgba(2, 6, 23, 0.30)', `${color}55`);
      r.text(kicker, ix + itemW / 2, railY + (isShort ? 6 : 7), color, isShort ? 10 : 12, 'center', 'bold', 'top', 'header');
      r.text(label, ix + itemW / 2, railY + (isShort ? 19 : 23), '#cbd5e1', isShort ? 7.5 : 8.5, 'center', 'bold', 'top', 'header');
    }
  }

  private drawModeDock(r: Renderer, x: number, y: number, w: number, h: number, compact: boolean): void {
    const gap = compact ? 7 : 9;
    const primaryH = compact ? 54 : 64;
    const tileH = compact ? 44 : 50;
    const utilH = compact ? 28 : 30;

    this.drawCutPanel(r, x - 18, y - 14, w + 36, h + 20, 16, 'rgba(2, 6, 23, 0.36)', 'rgba(103, 232, 249, 0.10)');

    this.drawPrimaryButton(r, x, y, w, primaryH, t('menu.start'), 'start');
    y += primaryH + gap + 2;

    const cols = w >= 440 ? 3 : 1;
    const tileW = cols === 3 ? (w - gap * 2) / 3 : w;
    const modes: Array<[string, string, string, string, MenuClickAction]> = [
      ['∞', t('menu.endless'), 'Score climb', '#a78bfa', 'endless'],
      ['◆', t('menu.daily'), 'Fresh route', '#2dd4bf', 'daily'],
      ['#', t('menu.challenge'), 'Seed run', '#f0abfc', 'challenge'],
    ];
    for (let i = 0; i < modes.length; i++) {
      const col = cols === 3 ? i : 0;
      const row = cols === 3 ? 0 : i;
      const [icon, label, sub, color, action] = modes[i];
      this.drawModeTile(r, x + col * (tileW + gap), y + row * (tileH + gap), tileW, tileH, icon, label, sub, color, action, compact);
    }
    y += cols === 3 ? tileH + gap : modes.length * (tileH + gap);

    const utilW = (w - gap) / 2;
    this.drawUtilityButton(r, x, y, utilW, utilH, '⚙', t('menu.settings'), 'settings');
    this.drawUtilityButton(r, x + utilW + gap, y, utilW, utilH, '▣', t('stats.title'), 'stats');

    if (!compact && r.height >= 720) {
      const hintY = y + utilH + 18;
      r.text(t('menu.shortcuts'), x + w / 2, hintY, UI.color.textDim, 9, 'center', 'bold', 'top');
    }
  }

  private drawOpsBrief(r: Renderer, x: number, y: number, w: number): void {
    const mission = dailyMissions(dailyDateStr())[0];
    const week = weeklyMode();
    r.text("TODAY'S OPS", x, y, '#67e8f9', 10, 'left', 'bold', 'top', 'header');
    r.roundRect(x, y + 22, w, 1, 1, 'rgba(103, 232, 249, 0.36)', true);
    r.text(mission.title, x, y + 36, '#e2e8f0', 12, 'left', 'bold', 'top', 'header');
    r.text(`Daily +${mission.reward}  /  Weekly +${week.reward}`, x, y + 55, UI.color.textMuted, 9.5, 'left', 'bold', 'top');
    r.text(this.truncate(week.title, 38), x, y + 73, '#c4b5fd', 10, 'left', 'bold', 'top', 'header');
  }

  private drawCommandStage(r: Renderer, x: number, y: number, w: number, h: number): void {
    this.drawCutPanel(r, x, y, w, h, 22, 'rgba(2, 6, 23, 0.20)', 'rgba(96, 165, 250, 0.10)');
    r.ctx.save();
    r.ctx.globalAlpha = 0.12;
    r.ctx.strokeStyle = '#67e8f9';
    r.ctx.lineWidth = 1;
    for (let gx = x + 34; gx < x + w - 20; gx += 52) {
      r.ctx.beginPath();
      r.ctx.moveTo(gx, y + 18);
      r.ctx.lineTo(gx + 40, y + h - 18);
      r.ctx.stroke();
    }
    r.ctx.restore();
    this.drawPreviewPath(r, x + 70, y + 38, w - 140);
  }

  private drawPreviewPath(r: Renderer, x: number, y: number, w: number): void {
    const h = 92;
    const points = [
      { x, y: y + h * 0.62 },
      { x: x + w * 0.22, y: y + h * 0.62 },
      { x: x + w * 0.22, y: y + h * 0.22 },
      { x: x + w * 0.54, y: y + h * 0.22 },
      { x: x + w * 0.54, y: y + h * 0.78 },
      { x: x + w, y: y + h * 0.78 },
    ];
    r.ctx.save();
    r.ctx.strokeStyle = 'rgba(96, 165, 250, 0.62)';
    r.ctx.lineWidth = 12;
    r.ctx.lineCap = 'round';
    r.ctx.lineJoin = 'round';
    r.ctx.beginPath();
    r.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) r.ctx.lineTo(points[i].x, points[i].y);
    r.ctx.stroke();
    r.ctx.strokeStyle = 'rgba(219, 234, 254, 0.84)';
    r.ctx.lineWidth = 2;
    r.ctx.stroke();
    for (let i = 1; i < points.length - 1; i += 2) {
      const p = points[i];
      r.ctx.fillStyle = i === 1 ? '#34d399' : '#f59e0b';
      r.ctx.beginPath();
      r.ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      r.ctx.fill();
    }
    r.ctx.restore();
  }

  private drawCutPanel(r: Renderer, x: number, y: number, w: number, h: number, cut: number, fill: string | CanvasGradient, stroke?: string | CanvasGradient): void {
    r.ctx.beginPath();
    r.ctx.moveTo(x + cut, y);
    r.ctx.lineTo(x + w, y);
    r.ctx.lineTo(x + w - cut, y + h);
    r.ctx.lineTo(x, y + h);
    r.ctx.closePath();
    r.ctx.fillStyle = fill;
    r.ctx.fill();
    if (stroke) {
      r.ctx.strokeStyle = stroke;
      r.ctx.lineWidth = 1.1;
      r.ctx.stroke();
    }
  }

  private drawPrimaryButton(r: Renderer, x: number, y: number, w: number, h: number, label: string, action: MenuClickAction): void {
    const grad = r.linearGradient(x, y, x + w, y + h, [
      { offset: 0, color: '#2563eb' },
      { offset: 0.52, color: '#0ea5e9' },
      { offset: 1, color: '#14b8a6' },
    ]);
    r.setShadow('rgba(14, 165, 233, 0.34)', 22, 0, 7);
    this.drawCutPanel(r, x, y, w, h, 18, grad, 'rgba(219, 234, 254, 0.36)');
    r.clearShadow();
    r.ctx.save();
    r.ctx.globalAlpha = 0.18;
    r.ctx.fillStyle = '#ffffff';
    r.ctx.beginPath();
    r.ctx.moveTo(x + 16, y + 12);
    r.ctx.lineTo(x + w - 18, y + 8);
    r.ctx.lineTo(x + w - 48, y + h - 10);
    r.ctx.lineTo(x + 32, y + h - 8);
    r.ctx.closePath();
    r.ctx.fill();
    r.ctx.restore();
    r.text('▶', x + 32, y + h / 2, '#ffffff', h >= 62 ? 18 : 15, 'center', 'bold', 'middle', 'header');
    r.text(label, x + 62, y + h / 2 - 1, '#ffffff', h >= 62 ? 18 : 15, 'left', 'bold', 'middle', 'header');
    r.text('CAMPAIGN', x + w - 26, y + h / 2, 'rgba(255,255,255,0.74)', h >= 62 ? 10 : 8.5, 'right', 'bold', 'middle', 'header');
    this.regions.push({ x, y, w, h, action });
  }

  private drawModeTile(r: Renderer, x: number, y: number, w: number, h: number, icon: string, label: string, sub: string, color: string, action: MenuClickAction, compact: boolean): void {
    const grad = r.linearGradient(x, y, x, y + h, [
      { offset: 0, color: 'rgba(15, 23, 42, 0.84)' },
      { offset: 1, color: 'rgba(2, 6, 23, 0.72)' },
    ]);
    this.drawCutPanel(r, x, y, w, h, 10, grad, `${color}55`);
    r.ctx.save();
    r.ctx.fillStyle = color;
    r.ctx.globalAlpha = 0.9;
    r.ctx.fillRect(x, y + 2, 4, h - 4);
    r.ctx.restore();
    const iconX = x + (compact ? 22 : 25);
    r.text(icon, iconX, y + h / 2, color, compact ? 13 : 15, 'center', 'bold', 'middle', 'header');
    r.text(label, x + (compact ? 42 : 48), y + (compact ? 10 : 11), '#f8fafc', compact ? 11 : 12.5, 'left', 'bold', 'top', 'header');
    r.text(sub, x + (compact ? 42 : 48), y + (compact ? 27 : 32), UI.color.textMuted, compact ? 8 : 9, 'left', 'bold', 'top');
    this.regions.push({ x, y, w, h, action });
  }

  private drawUtilityButton(r: Renderer, x: number, y: number, w: number, h: number, icon: string, label: string, action: MenuClickAction): void {
    this.drawCutPanel(r, x, y, w, h, 8, 'rgba(15, 23, 42, 0.42)', 'rgba(148, 163, 184, 0.14)');
    r.text(icon, x + 22, y + h / 2, '#cbd5e1', 12, 'center', 'bold', 'middle', 'header');
    r.text(label, x + 42, y + h / 2, '#cbd5e1', 11, 'left', 'bold', 'middle', 'header');
    this.regions.push({ x, y, w, h, action });
  }

  private drawVictoryReport(r: Renderer, cardX: number, cardY: number, cardW: number, score: number, stats: ScreenStats | undefined, compact: boolean): void {
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
    r.text(this.victoryAdvice(starCount), cx, cardY + (compact ? 94 : 112), UI.color.textMuted, compact ? 10.5 : 12, 'center', 'bold', 'top');
    this.drawBadges(r, cx, cardY + (compact ? 112 : 130), this.buildBadges(stats), compact);
    this.drawReportPanel(r, cardX + 24, cardY + (compact ? 134 : 152), cardW - 48, compact ? 116 : 136, UI.color.green, this.buildRows(score, stats));
  }

  private drawDefeatReport(r: Renderer, cardX: number, cardY: number, cardW: number, score: number, seed: number, stats: ScreenStats | undefined, compact: boolean): void {
    const cx = cardX + cardW / 2;
    if (stats?.wave !== undefined) r.text(t('lose.survived').replace('{wave}', String(stats.wave)), cx, cardY + (compact ? 66 : 76), '#f87171', compact ? 12 : 14, 'center', 'bold', 'top', 'header');
    const advice = stats?.advice ?? buildDefeatAdviceFromSummary(stats ?? {});
    r.text(advice, cx, cardY + (compact ? 90 : 100), UI.color.textMuted, compact ? 10.5 : 12, 'center', 'bold', 'top');
    this.drawBadges(r, cx, cardY + (compact ? 108 : 118), this.buildBadges(stats), compact);
    this.drawReportPanel(r, cardX + 24, cardY + (compact ? 130 : 140), cardW - 48, compact ? 116 : 136, UI.color.red, this.buildRows(score, stats));
    if (seed !== 0) {
      const seedHex = seed.toString(16).toUpperCase().padStart(8, '0');
      const seedY = cardY + (compact ? 254 : 286);
      r.text(`${t('menu.endless')} SEED: ${seedHex}`, cx, seedY, '#c084fc', compact ? 10.5 : 12, 'center', 'bold', 'top', 'header');
      this.drawButton(r, cx - 90, seedY + 20, 180, compact ? 26 : 28, t('share.copy'), 'challenge', '#a855f7', '#7e22ce', compact ? 10 : 11);
    }
  }

  private buildBadges(stats?: ScreenStats): SummaryBadge[] {
    const badges: SummaryBadge[] = [];
    if (stats?.isNewHighScore) badges.push({ label: t('summary.newHighScore'), color: '#60a5fa' });
    if (stats?.isNewLevelScore) badges.push({ label: t('summary.newLevelScore'), color: '#22c55e' });
    if (stats?.isStarUpgrade) badges.push({ label: t('summary.starUpgrade'), color: UI.color.gold });
    if (stats?.isNewEndlessRecord) badges.push({ label: t('summary.endlessRecord'), color: '#a78bfa' });
    if (stats?.isNewDailyRecord) badges.push({ label: t('summary.dailyRecord'), color: '#14b8a6' });
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

  private truncate(text: string, max: number): string {
    return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`;
  }

  hit(x: number, y: number): MenuClickAction {
    for (const b of this.regions) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.action;
    }
    return null;
  }
}
