// Stats/Profile screen: shows player analytics data and offline deterministic leaderboards.

import { Renderer } from '../engine/Renderer';
import { AnalyticsData } from '../utils/Analytics';
import { t } from '../utils/i18n';
import { SaveSystem } from '../utils/SaveSystem';
import { getLeaderboard } from '../utils/Leaderboard';
import { getTowerDef } from '../game/towers/TowerRegistry';
import { towerName } from '../utils/displayText';
import { drawGlassPanel, layoutFor, UI } from './Layout';

export class StatsScreen {
  private regions: Array<{ x: number; y: number; w: number; h: number; action: string }> = [];
  currentTab: 'stats' | 'rankings' = 'stats';
  selectedBoard: 'level' | 'endless' | 'daily' = 'daily';
  selectedLevelIdx = 0;

  draw(r: Renderer, data: Readonly<AnalyticsData>, save: SaveSystem): void {
    this.regions = [];
    const layout = layoutFor(r);

    const bgGrad = r.linearGradient(0, 0, 0, r.height, [
      { offset: 0, color: 'rgba(10, 14, 20, 0.85)' },
      { offset: 1, color: 'rgba(17, 24, 39, 0.95)' }
    ]);
    r.rect(0, 0, r.width, r.height, bgGrad);

    const cx = r.width / 2;
    const titleY = layout.isCompact ? 14 : 20;
    const titleGrad = r.linearGradient(cx - 100, 36, cx + 100, 36, [
      { offset: 0, color: '#60a5fa' },
      { offset: 1, color: '#3b82f6' }
    ]);
    r.text(t('stats.title'), cx, titleY, titleGrad, layout.isCompact ? 23 : 26, 'center', 'bold', 'top', 'header');

    const tabW = layout.isPhone ? 116 : 130;
    const tabH = layout.isCompact ? 25 : 28;
    const tabGap = layout.gap;
    const tabStartX = cx - (tabW * 2 + tabGap) / 2;
    const tabY = titleY + (layout.isCompact ? 34 : 38);

    this.drawTab(r, tabStartX, tabY, tabW, tabH, t('stats.statistics'), this.currentTab === 'stats', 'tab_stats');
    this.drawTab(r, tabStartX + tabW + tabGap, tabY, tabW, tabH, t('stats.rankings'), this.currentTab === 'rankings', 'tab_rankings');

    const startY = tabY + tabH + (layout.isCompact ? 12 : 18);
    if (this.currentTab === 'stats') this.drawStatsTab(r, data, startY);
    else this.drawRankingsTab(r, save, startY);
  }

  private drawTab(r: Renderer, x: number, y: number, w: number, h: number, label: string, selected: boolean, action: string): void {
    const bg = selected
      ? r.linearGradient(x, y, x, y + h, [{ offset: 0, color: UI.color.blue }, { offset: 1, color: '#1d4ed8' }])
      : 'rgba(30, 41, 59, 0.7)';
    const border = selected ? UI.color.blue : 'rgba(255, 255, 255, 0.08)';
    r.roundRect(x, y, w, h, h / 2, bg, true, border, 1);
    r.text(label.toUpperCase(), x + w / 2, y + h / 2, '#ffffff', 10, 'center', 'bold', 'middle', 'header');
    this.regions.push({ x, y, w, h, action });
  }

  private drawStatsTab(r: Renderer, data: Readonly<AnalyticsData>, startY: number): void {
    const layout = layoutFor(r);
    const cx = r.width / 2;
    const fmt = (sec: number) => sec < 60 ? `${Math.round(sec)}s` : sec < 3600 ? `${Math.round(sec / 60)}m` : `${(sec / 3600).toFixed(1)}h`;

    const sessionRows: Array<[string, string]> = [
      [t('stats.sessions'), `${data.sessions}`],
      [t('stats.playtime'), fmt(data.totalPlaySec)],
      [t('stats.avgSession'), fmt(data.avgSessionSec)],
      [t('stats.longestSession'), fmt(data.longestSessionSec)],
      [t('stats.returnDays'), `${data.returnDays}`],
      [t('stats.endlessBest'), `${data.endlessBestWave}`],
      [t('stats.endlessRuns'), `${data.endlessRuns}`],
    ];

    const canThree = r.width >= 940 && r.height >= 560;
    const colCount = canThree ? 3 : r.width >= 620 ? 2 : 1;
    const gap = layout.gap;
    const cardW = Math.floor((r.width - layout.safe * 2 - gap * (colCount - 1)) / colCount);
    const cardH = layout.isCompact ? 214 : 244;
    const totalW = colCount * cardW + (colCount - 1) * gap;
    const startX = cx - totalW / 2;

    const cards = [
      { title: t('stats.sessionData'), kind: 'session' },
      { title: t('stats.towerUsage'), kind: 'tower' },
      { title: t('stats.levelRates'), kind: 'level' },
    ] as const;

    for (let i = 0; i < cards.length; i++) {
      const col = i % colCount;
      const row = Math.floor(i / colCount);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);
      this.drawCard(r, x, y, cardW, cardH, cards[i].title);
      if (cards[i].kind === 'session') this.drawSessionRows(r, x, y, cardW, cardH, sessionRows);
      if (cards[i].kind === 'tower') this.drawTowerRows(r, x, y, cardW, data);
      if (cards[i].kind === 'level') this.drawLevelRows(r, x, y, cardW, data);
    }

    const rows = Math.ceil(cards.length / colCount);
    const btnY = startY + rows * (cardH + gap) + (layout.isCompact ? 0 : 4);
    this.drawCloseButton(r, Math.min(btnY, r.height - 52), 'menu', t('common.menu'));
  }

  private drawSessionRows(r: Renderer, x: number, y: number, w: number, h: number, rows: Array<[string, string]>): void {
    let rowY = y + 40;
    const rowStep = Math.max(23, Math.floor((h - 56) / rows.length));
    for (const [label, val] of rows) {
      r.text(label, x + 16, rowY, UI.color.textDim, 11, 'left', 'bold');
      r.text(val, x + w - 16, rowY, UI.color.text, 11, 'right', 'bold', 'top', 'header');
      rowY += rowStep;
    }
  }

  private drawTowerRows(r: Renderer, x: number, y: number, w: number, data: Readonly<AnalyticsData>): void {
    const sorted = Object.entries(data.towerUsage).sort((a, b) => b[1] - a[1]);
    let rowY = y + 40;
    for (let i = 0; i < 6; i++) {
      let label = `${i + 1}. —`;
      let val = '0';
      if (i < sorted.length) {
        const [id, count] = sorted[i];
        label = `${i + 1}. ${this.localizedTowerName(id)}`;
        val = `${count}`;
      }
      r.text(label, x + 16, rowY, '#cbd5e1', 12, 'left', 'bold');
      r.text(val, x + w - 16, rowY, UI.color.gold, 12, 'right', 'bold', 'top', 'header');
      rowY += 30;
    }
  }

  private drawLevelRows(r: Renderer, x: number, y: number, w: number, data: Readonly<AnalyticsData>): void {
    let rowY = y + 40;
    for (let i = 0; i < 6; i++) {
      const attempted = data.levelsAttempted[i] ?? 0;
      const completed = data.levelsCompleted[i] ?? 0;
      const rate = attempted > 0 ? Math.round((completed / attempted) * 100) : 0;
      r.text(`${t('stats.level')} ${i + 1}`, x + 16, rowY, '#cbd5e1', 12, 'left', 'bold', 'top', 'header');
      const rateColor = rate >= 75 ? UI.color.green : rate >= 40 ? '#f59e0b' : attempted > 0 ? UI.color.red : UI.color.textDim;
      r.text(`${completed}/${attempted} (${rate}%)`, x + w - 16, rowY, rateColor, 12, 'right', 'bold', 'top', 'header');
      rowY += 30;
    }
  }

  private drawRankingsTab(r: Renderer, save: SaveSystem, startY: number): void {
    const layout = layoutFor(r);
    const cx = r.width / 2;
    const subH = layout.isCompact ? 22 : 24;
    const subY = startY;
    const lvlW = layout.isPhone ? 27 : 30;
    const lvlGap = 4;
    const totalLvlW = 6 * lvlW + 5 * lvlGap;
    const endW = layout.isPhone ? 58 : 68;
    const dlyW = layout.isPhone ? 52 : 58;
    const totalW = totalLvlW + layout.gap + endW + 6 + dlyW;
    const leftLvlX = cx - totalW / 2;

    for (let i = 0; i < 6; i++) {
      const lx = leftLvlX + i * (lvlW + lvlGap);
      const sel = this.selectedBoard === 'level' && this.selectedLevelIdx === i;
      const bg = sel
        ? r.linearGradient(lx, subY, lx, subY + subH, [{ offset: 0, color: UI.color.green }, { offset: 1, color: '#059669' }])
        : 'rgba(30, 41, 59, 0.6)';
      const border = sel ? UI.color.green : 'rgba(255, 255, 255, 0.05)';
      r.roundRect(lx, subY, lvlW, subH, 6, bg, true, border, 1);
      r.text(`L${i + 1}`, lx + lvlW / 2, subY + subH / 2, '#ffffff', 9, 'center', 'bold', 'middle', 'header');
      this.regions.push({ x: lx, y: subY, w: lvlW, h: subH, action: `level_${i}` });
    }

    const endX = leftLvlX + totalLvlW + layout.gap;
    this.drawBoardButton(r, endX, subY, endW, subH, t('stats.endless'), this.selectedBoard === 'endless', UI.color.violet, '#6d28d9', 'board_endless');

    const dlyX = endX + endW + 6;
    this.drawBoardButton(r, dlyX, subY, dlyW, subH, t('stats.daily'), this.selectedBoard === 'daily', '#f59e0b', '#d97706', 'board_daily');

    const cardW = Math.min(layout.panelW, 430);
    const cardH = Math.min(226, r.height - subY - subH - 78);
    const cardX = cx - cardW / 2;
    const cardY = subY + subH + 14;
    drawGlassPanel(r, cardX, cardY, cardW, cardH, layout.radius, UI.color.violet, 0.88);

    const entries = getLeaderboard(save, this.selectedBoard, this.selectedLevelIdx);
    const title = this.leaderboardTitle();
    r.text(title, cx, cardY + 12, UI.color.textMuted, 11, 'center', 'bold', 'top', 'header');

    let rowY = cardY + 36;
    const rowH = Math.max(23, Math.floor((cardH - 48) / 6));
    for (let idx = 0; idx < entries.length && idx < 6; idx++) {
      const entry = entries[idx];
      const isPlayer = entry.isPlayer;
      if (isPlayer) r.roundRect(cardX + 8, rowY - 2, cardW - 16, rowH - 2, 6, 'rgba(59, 130, 246, 0.15)', true, UI.color.blue, 1);

      const rank = idx + 1;
      const rankColor = rank === 1 ? UI.color.gold : rank === 2 ? '#e2e8f0' : rank === 3 ? '#cd7f32' : UI.color.textDim;
      r.text(`${rank}.`, cardX + 20, rowY + 3, rankColor, 12, 'center', 'bold', 'top', 'header');
      r.text(entry.name, cardX + 44, rowY + 3, isPlayer ? '#38bdf8' : '#ffffff', 12, 'left', isPlayer ? 'bold' : 'normal');
      if (entry.wave !== undefined && cardW > 360) r.text(`${t('stats.wave')} ${entry.wave}`, cardX + cardW - 112, rowY + 3, UI.color.textMuted, 10, 'right', 'bold', 'top', 'header');
      r.text(`${entry.score.toLocaleString()} ${t('stats.points')}`, cardX + cardW - 20, rowY + 3, isPlayer ? UI.color.gold : '#e2e8f0', 11, 'right', 'bold', 'top', 'header');
      rowY += rowH;
    }

    this.drawCloseButton(r, Math.min(cardY + cardH + 12, r.height - 52), 'close', t('common.back'));
  }

  private drawCard(r: Renderer, x: number, y: number, w: number, h: number, title: string): void {
    r.roundRect(x, y, w, h, 12, 'rgba(15, 23, 42, 0.92)', true, 'rgba(255, 255, 255, 0.08)', 1.5);
    r.roundRect(x, y, 4, h, 2, UI.color.blue, true);
    r.text(title.toUpperCase(), x + 16, y + 14, UI.color.textMuted, 11, 'left', 'bold');
  }

  private drawBoardButton(r: Renderer, x: number, y: number, w: number, h: number, label: string, selected: boolean, colorA: string, colorB: string, action: string): void {
    const bg = selected
      ? r.linearGradient(x, y, x, y + h, [{ offset: 0, color: colorA }, { offset: 1, color: colorB }])
      : 'rgba(30, 41, 59, 0.6)';
    const border = selected ? colorA : 'rgba(255, 255, 255, 0.05)';
    r.roundRect(x, y, w, h, 6, bg, true, border, 1);
    r.text(label.toUpperCase(), x + w / 2, y + h / 2, '#ffffff', 9, 'center', 'bold', 'middle', 'header');
    this.regions.push({ x, y, w, h, action });
  }

  private drawCloseButton(r: Renderer, y: number, action: string, label: string): void {
    const layout = layoutFor(r);
    const cx = r.width / 2;
    const hintY = Math.max(y, r.height - (layout.buttonH + 34));
    r.text(t('stats.close'), cx, hintY, UI.color.textDim, 11, 'center');
    const btnW = Math.min(190, layout.panelW * 0.5);
    const btnH = layout.buttonH - 4;
    const btnX = cx - btnW / 2;
    const btnY = hintY + 18;
    const btnGrad = r.linearGradient(btnX, btnY, btnX, btnY + btnH, [
      { offset: 0, color: '#475569' },
      { offset: 1, color: '#1e293b' }
    ]);
    r.roundRect(btnX, btnY, btnW, btnH, 9, btnGrad, true, 'rgba(255, 255, 255, 0.08)', 1);
    r.text(label, cx, btnY + btnH / 2, '#ffffff', 12, 'center', 'bold', 'middle');
    this.regions.push({ x: btnX, y: btnY, w: btnW, h: btnH, action });
  }

  private localizedTowerName(id: string): string {
    try {
      const def = getTowerDef(id);
      return towerName(def.id, def.name);
    } catch {
      return id.toUpperCase();
    }
  }

  private leaderboardTitle(): string {
    if (this.selectedBoard === 'level') return t('stats.leaderboard.level').replace('{level}', `${this.selectedLevelIdx + 1}`);
    if (this.selectedBoard === 'endless') return t('stats.leaderboard.endless');
    return t('stats.leaderboard.daily');
  }

  hit(x: number, y: number): string | null {
    for (const b of this.regions) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.action;
    return null;
  }

  apply(action: string): void {
    if (action === 'tab_stats') this.currentTab = 'stats';
    else if (action === 'tab_rankings') this.currentTab = 'rankings';
    else if (action === 'board_endless') this.selectedBoard = 'endless';
    else if (action === 'board_daily') this.selectedBoard = 'daily';
    else if (action.startsWith('level_')) {
      this.selectedBoard = 'level';
      this.selectedLevelIdx = parseInt(action.split('_')[1], 10);
    }
  }
}
