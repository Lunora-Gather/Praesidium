// Stats/Profile screen: shows player analytics data and offline deterministic leaderboards.

import { Renderer } from '../engine/Renderer';
import { AnalyticsData } from '../utils/Analytics';
import { t } from '../utils/i18n';
import { SaveSystem } from '../utils/SaveSystem';
import { getLeaderboard } from '../utils/Leaderboard';
import { getTowerDef } from '../game/towers/TowerRegistry';
import { towerName } from '../utils/displayText';

export class StatsScreen {
  private regions: Array<{ x: number; y: number; w: number; h: number; action: string }> = [];
  currentTab: 'stats' | 'rankings' = 'stats';
  selectedBoard: 'level' | 'endless' | 'daily' = 'daily';
  selectedLevelIdx = 0;

  draw(r: Renderer, data: Readonly<AnalyticsData>, save: SaveSystem): void {
    this.regions = [];

    const bgGrad = r.linearGradient(0, 0, 0, r.height, [
      { offset: 0, color: 'rgba(10, 14, 20, 0.85)' },
      { offset: 1, color: 'rgba(17, 24, 39, 0.95)' }
    ]);
    r.rect(0, 0, r.width, r.height, bgGrad);

    const cx = r.width / 2;
    const titleGrad = r.linearGradient(cx - 100, 36, cx + 100, 36, [
      { offset: 0, color: '#60a5fa' },
      { offset: 1, color: '#3b82f6' }
    ]);
    r.text(t('stats.title'), cx, 20, titleGrad, 26, 'center', 'bold', 'top', 'header');

    const tabW = 130;
    const tabH = 26;
    const tabGap = 8;
    const tabStartX = cx - (tabW * 2 + tabGap) / 2;
    const tabY = 56;

    this.drawTab(r, tabStartX, tabY, tabW, tabH, t('stats.statistics'), this.currentTab === 'stats', 'tab_stats');
    this.drawTab(r, tabStartX + tabW + tabGap, tabY, tabW, tabH, t('stats.rankings'), this.currentTab === 'rankings', 'tab_rankings');

    const startY = 96;
    if (this.currentTab === 'stats') this.drawStatsTab(r, data, startY);
    else this.drawRankingsTab(r, save, startY);
  }

  private drawTab(r: Renderer, x: number, y: number, w: number, h: number, label: string, selected: boolean, action: string): void {
    const bg = selected
      ? r.linearGradient(x, y, x, y + h, [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#1d4ed8' }])
      : 'rgba(30, 41, 59, 0.7)';
    const border = selected ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)';
    r.roundRect(x, y, w, h, 13, bg, true, border, 1);
    r.text(label.toUpperCase(), x + w / 2, y + h / 2, '#ffffff', 10, 'center', 'bold', 'middle', 'header');
    this.regions.push({ x, y, w, h, action });
  }

  private drawStatsTab(r: Renderer, data: Readonly<AnalyticsData>, startY: number): void {
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

    const isDesktop = r.width >= 860;
    const cardW = isDesktop ? 250 : Math.min(r.width - 32, 360);
    const cardH = 260;
    const gap = 16;
    const colCount = isDesktop ? 3 : 1;
    const totalW = colCount * cardW + (colCount - 1) * gap;
    const startX = cx - totalW / 2;

    const c1x = startX;
    const c1y = startY + 12;
    this.drawCard(r, c1x, c1y, cardW, cardH, t('stats.sessionData'));
    let rowY = c1y + 40;
    for (const [label, val] of sessionRows) {
      r.text(label, c1x + 16, rowY, '#64748b', 11, 'left', 'bold');
      r.text(val, c1x + cardW - 16, rowY, '#ffffff', 11, 'right', 'bold', 'top', 'header');
      rowY += 28;
    }

    const c2x = isDesktop ? startX + cardW + gap : startX;
    const c2y = isDesktop ? c1y : c1y + cardH + gap;
    this.drawCard(r, c2x, c2y, cardW, cardH, t('stats.towerUsage'));
    const sorted = Object.entries(data.towerUsage).sort((a, b) => b[1] - a[1]);
    rowY = c2y + 40;
    for (let i = 0; i < 6; i++) {
      let label = `${i + 1}. —`;
      let val = '0';
      if (i < sorted.length) {
        const [id, count] = sorted[i];
        label = `${i + 1}. ${this.localizedTowerName(id)}`;
        val = `${count}`;
      }
      r.text(label, c2x + 16, rowY, '#cbd5e1', 12, 'left', 'bold');
      r.text(val, c2x + cardW - 16, rowY, '#fbbf24', 12, 'right', 'bold', 'top', 'header');
      rowY += 32;
    }

    const c3x = isDesktop ? startX + (cardW + gap) * 2 : startX;
    const c3y = isDesktop ? c1y : c1y + (cardH + gap) * 2;
    this.drawCard(r, c3x, c3y, cardW, cardH, t('stats.levelRates'));
    rowY = c3y + 40;
    for (let i = 0; i < 6; i++) {
      const attempted = data.levelsAttempted[i] ?? 0;
      const completed = data.levelsCompleted[i] ?? 0;
      const rate = attempted > 0 ? Math.round((completed / attempted) * 100) : 0;
      r.text(`${t('stats.level')} ${i + 1}`, c3x + 16, rowY, '#cbd5e1', 12, 'left', 'bold', 'top', 'header');
      const rateColor = rate >= 75 ? '#10b981' : rate >= 40 ? '#f59e0b' : attempted > 0 ? '#ef4444' : '#64748b';
      r.text(`${completed}/${attempted} (${rate}%)`, c3x + cardW - 16, rowY, rateColor, 12, 'right', 'bold', 'top', 'header');
      rowY += 32;
    }

    const btnY = isDesktop ? c1y + cardH + 16 : c3y + cardH + 16;
    this.drawCloseButton(r, btnY, 'menu', t('common.menu'));
  }

  private drawRankingsTab(r: Renderer, save: SaveSystem, startY: number): void {
    const cx = r.width / 2;
    const subH = 22;
    const subY = startY + 8;
    const lvlW = 28;
    const lvlGap = 4;
    const totalLvlW = 6 * lvlW + 5 * lvlGap;
    const leftLvlX = cx - (totalLvlW + 10 + 68 + 6 + 58) / 2;

    for (let i = 0; i < 6; i++) {
      const lx = leftLvlX + i * (lvlW + lvlGap);
      const sel = this.selectedBoard === 'level' && this.selectedLevelIdx === i;
      const bg = sel
        ? r.linearGradient(lx, subY, lx, subY + subH, [{ offset: 0, color: '#10b981' }, { offset: 1, color: '#059669' }])
        : 'rgba(30, 41, 59, 0.6)';
      const border = sel ? '#10b981' : 'rgba(255, 255, 255, 0.05)';
      r.roundRect(lx, subY, lvlW, subH, 5, bg, true, border, 1);
      r.text(`L${i + 1}`, lx + lvlW / 2, subY + subH / 2, '#ffffff', 9, 'center', 'bold', 'middle', 'header');
      this.regions.push({ x: lx, y: subY, w: lvlW, h: subH, action: `level_${i}` });
    }

    const endX = leftLvlX + totalLvlW + 8;
    const endW = 64;
    this.drawBoardButton(r, endX, subY, endW, subH, t('stats.endless'), this.selectedBoard === 'endless', '#8b5cf6', '#6d28d9', 'board_endless');

    const dlyX = endX + endW + 6;
    const dlyW = 58;
    this.drawBoardButton(r, dlyX, subY, dlyW, subH, t('stats.daily'), this.selectedBoard === 'daily', '#f59e0b', '#d97706', 'board_daily');

    const cardW = Math.min(r.width - 32, 380);
    const cardH = 210;
    const cardX = cx - cardW / 2;
    const cardY = subY + subH + 14;
    r.roundRect(cardX, cardY, cardW, cardH, 12, 'rgba(15, 23, 42, 0.95)', true, 'rgba(255, 255, 255, 0.08)', 1.5);

    const entries = getLeaderboard(save, this.selectedBoard, this.selectedLevelIdx);
    const title = this.leaderboardTitle();
    r.text(title, cx, cardY + 12, '#94a3b8', 11, 'center', 'bold', 'top', 'header');

    let rowY = cardY + 36;
    const rowH = 26;
    for (let idx = 0; idx < entries.length && idx < 6; idx++) {
      const entry = entries[idx];
      const isPlayer = entry.isPlayer;
      if (isPlayer) r.roundRect(cardX + 8, rowY - 2, cardW - 16, rowH - 2, 4, 'rgba(59, 130, 246, 0.15)', true, '#3b82f6', 1);

      const rank = idx + 1;
      const rankColor = rank === 1 ? '#fbbf24' : rank === 2 ? '#e2e8f0' : rank === 3 ? '#cd7f32' : '#64748b';
      r.text(`${rank}.`, cardX + 20, rowY + 3, rankColor, 12, 'center', 'bold', 'top', 'header');
      r.text(entry.name, cardX + 44, rowY + 3, isPlayer ? '#38bdf8' : '#ffffff', 12, 'left', isPlayer ? 'bold' : 'normal');
      if (entry.wave !== undefined) r.text(`${t('stats.wave')} ${entry.wave}`, cardX + cardW - 110, rowY + 3, '#94a3b8', 10, 'right', 'bold', 'top', 'header');
      r.text(`${entry.score.toLocaleString()} ${t('stats.points')}`, cardX + cardW - 20, rowY + 3, isPlayer ? '#fbbf24' : '#e2e8f0', 11, 'right', 'bold', 'top', 'header');
      rowY += rowH;
    }

    this.drawCloseButton(r, cardY + cardH + 12, 'close', t('common.back'));
  }

  private drawCard(r: Renderer, x: number, y: number, w: number, h: number, title: string): void {
    r.roundRect(x, y, w, h, 12, 'rgba(15, 23, 42, 0.95)', true, 'rgba(255, 255, 255, 0.08)', 1.5);
    r.text(title.toUpperCase(), x + 16, y + 14, '#94a3b8', 11, 'left', 'bold');
  }

  private drawBoardButton(r: Renderer, x: number, y: number, w: number, h: number, label: string, selected: boolean, colorA: string, colorB: string, action: string): void {
    const bg = selected
      ? r.linearGradient(x, y, x, y + h, [{ offset: 0, color: colorA }, { offset: 1, color: colorB }])
      : 'rgba(30, 41, 59, 0.6)';
    const border = selected ? colorA : 'rgba(255, 255, 255, 0.05)';
    r.roundRect(x, y, w, h, 5, bg, true, border, 1);
    r.text(label.toUpperCase(), x + w / 2, y + h / 2, '#ffffff', 9, 'center', 'bold', 'middle', 'header');
    this.regions.push({ x, y, w, h, action });
  }

  private drawCloseButton(r: Renderer, y: number, action: string, label: string): void {
    const cx = r.width / 2;
    r.text(t('stats.close'), cx, y, '#64748b', 11, 'center');
    const btnW = 180;
    const btnH = 34;
    const btnX = cx - btnW / 2;
    const btnY = y + 18;
    const btnGrad = r.linearGradient(btnX, btnY, btnX, btnY + btnH, [
      { offset: 0, color: '#475569' },
      { offset: 1, color: '#1e293b' }
    ]);
    r.roundRect(btnX, btnY, btnW, btnH, 8, btnGrad, true, 'rgba(255, 255, 255, 0.08)', 1);
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
