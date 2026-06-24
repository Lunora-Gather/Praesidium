// Stats/Profile screen: shows player their analytics data and offline leaderboards.
// Tabs: STATISTICS (metrics) and RANKINGS (deterministic leaderboards).

import { Renderer } from '../engine/Renderer';
import { AnalyticsData } from '../utils/Analytics';
import { t } from '../utils/i18n';
import { SaveSystem } from '../utils/SaveSystem';
import { getLeaderboard } from '../utils/Leaderboard';

export class StatsScreen {
  private regions: Array<{ x: number; y: number; w: number; h: number; action: string }> = [];
  currentTab: 'stats' | 'rankings' = 'stats';
  selectedBoard: 'level' | 'endless' | 'daily' = 'daily';
  selectedLevelIdx = 0;

  draw(r: Renderer, data: Readonly<AnalyticsData>, save: SaveSystem): void {
    this.regions = [];
    
    // Dim background with overlay gradient
    const bgGrad = r.linearGradient(0, 0, 0, r.height, [
      { offset: 0, color: 'rgba(10, 14, 20, 0.85)' },
      { offset: 1, color: 'rgba(17, 24, 39, 0.95)' }
    ]);
    r.rect(0, 0, r.width, r.height, bgGrad);
    
    const cx = r.width / 2;
    
    // 1. Title
    const titleGrad = r.linearGradient(cx - 100, 36, cx + 100, 36, [
      { offset: 0, color: '#60a5fa' },
      { offset: 1, color: '#3b82f6' }
    ]);
    r.text(t('stats.title'), cx, 20, titleGrad, 26, 'center', 'bold', 'top', 'header');
    
    // 2. Tab Switcher Bar
    const tabW = 130;
    const tabH = 26;
    const tabGap = 8;
    const tabStartX = cx - (tabW * 2 + tabGap) / 2;
    const tabY = 56;
    
    // Statistics Tab Button
    const statsTabSel = this.currentTab === 'stats';
    const statsTabBg = statsTabSel
      ? r.linearGradient(tabStartX, tabY, tabStartX, tabY + tabH, [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#1d4ed8' }])
      : 'rgba(30, 41, 59, 0.7)';
    const statsTabBorder = statsTabSel ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)';
    r.roundRect(tabStartX, tabY, tabW, tabH, 13, statsTabBg, true, statsTabBorder, 1);
    r.text('STATISTICS', tabStartX + tabW / 2, tabY + tabH / 2, '#ffffff', 10, 'center', 'bold', 'middle', 'header');
    this.regions.push({ x: tabStartX, y: tabY, w: tabW, h: tabH, action: 'tab_stats' });
    
    // Rankings Tab Button
    const rankTabSel = this.currentTab === 'rankings';
    const rankTabStartX = tabStartX + tabW + tabGap;
    const rankTabBg = rankTabSel
      ? r.linearGradient(rankTabStartX, tabY, rankTabStartX, tabY + tabH, [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#1d4ed8' }])
      : 'rgba(30, 41, 59, 0.7)';
    const rankTabBorder = rankTabSel ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)';
    r.roundRect(rankTabStartX, tabY, tabW, tabH, 13, rankTabBg, true, rankTabBorder, 1);
    r.text('RANKINGS', rankTabStartX + tabW / 2, tabY + tabH / 2, '#ffffff', 10, 'center', 'bold', 'middle', 'header');
    this.regions.push({ x: rankTabStartX, y: tabY, w: tabW, h: tabH, action: 'tab_rankings' });
    
    const startY = 96;

    if (this.currentTab === 'stats') {
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
      
      // Card 1: Session Data
      const c1x = startX;
      const c1y = startY + 12;
      r.roundRect(c1x, c1y, cardW, cardH, 12, 'rgba(15, 23, 42, 0.95)', true, 'rgba(255, 255, 255, 0.08)', 1.5);
      r.text('SESSION DATA', c1x + 16, c1y + 14, '#94a3b8', 11, 'left', 'bold');
      let rowY = c1y + 40;
      for (const [label, val] of sessionRows) {
        r.text(label, c1x + 16, rowY, '#64748b', 11, 'left', 'bold');
        r.text(val, c1x + cardW - 16, rowY, '#ffffff', 11, 'right', 'bold', 'top', 'header');
        rowY += 28;
      }
      
      // Card 2: Tower Usage
      const c2x = isDesktop ? startX + cardW + gap : startX;
      const c2y = isDesktop ? c1y : c1y + cardH + gap;
      r.roundRect(c2x, c2y, cardW, cardH, 12, 'rgba(15, 23, 42, 0.95)', true, 'rgba(255, 255, 255, 0.08)', 1.5);
      r.text(t('stats.towerUsage').toUpperCase(), c2x + 16, c2y + 14, '#94a3b8', 11, 'left', 'bold');
      
      const sorted = Object.entries(data.towerUsage).sort((a, b) => b[1] - a[1]);
      rowY = c2y + 40;
      for (let i = 0; i < 6; i++) {
        let label = `${i + 1}. —`;
        let val = '0';
        if (i < sorted.length) {
          const [id, count] = sorted[i];
          label = `${i + 1}. ${id.toUpperCase()}`;
          val = `${count}`;
        }
        r.text(label, c2x + 16, rowY, '#cbd5e1', 12, 'left', 'bold');
        r.text(val, c2x + cardW - 16, rowY, '#fbbf24', 12, 'right', 'bold', 'top', 'header');
        rowY += 32;
      }
      
      // Card 3: Level Rates
      const c3x = isDesktop ? startX + (cardW + gap) * 2 : startX;
      const c3y = isDesktop ? c1y : c1y + (cardH + gap) * 2;
      r.roundRect(c3x, c3y, cardW, cardH, 12, 'rgba(15, 23, 42, 0.95)', true, 'rgba(255, 255, 255, 0.08)', 1.5);
      r.text(t('stats.levelRates').toUpperCase(), c3x + 16, c3y + 14, '#94a3b8', 11, 'left', 'bold');
      
      rowY = c3y + 40;
      for (let i = 0; i < 6; i++) {
        const attempted = data.levelsAttempted[i] ?? 0;
        const completed = data.levelsCompleted[i] ?? 0;
        const rate = attempted > 0 ? Math.round((completed / attempted) * 100) : 0;
        r.text(`LEVEL ${i + 1}`, c3x + 16, rowY, '#cbd5e1', 12, 'left', 'bold', 'top', 'header');
        
        const rateColor = rate >= 75 ? '#10b981' : rate >= 40 ? '#f59e0b' : attempted > 0 ? '#ef4444' : '#64748b';
        r.text(`${completed}/${attempted} (${rate}%)`, c3x + cardW - 16, rowY, rateColor, 12, 'right', 'bold', 'top', 'header');
        rowY += 32;
      }
      
      // Close Button
      let btnY = isDesktop ? c1y + cardH + 16 : c3y + cardH + 16;
      r.text(t('stats.close'), cx, btnY, '#64748b', 11, 'center');
      
      const btnW = 180;
      const btnH = 34;
      const btnX = cx - btnW / 2;
      btnY += 18;
      
      const btnGrad = r.linearGradient(btnX, btnY, btnX, btnY + btnH, [
        { offset: 0, color: '#475569' },
        { offset: 1, color: '#1e293b' }
      ]);
      r.roundRect(btnX, btnY, btnW, btnH, 8, btnGrad, true, 'rgba(255, 255, 255, 0.08)', 1);
      r.text(t('hud.menu'), cx, btnY + btnH / 2, '#ffffff', 12, 'center', 'bold', 'middle');
      this.regions.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: 'menu' });
      
    } else {
      // ─── RANKINGS TAB ───
      // Sub-selector Bar
      const subH = 22;
      const subY = startY + 8;
      
      // Levels sub-buttons: L1..L6
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
      
      // Endless sub-button
      const endX = leftLvlX + totalLvlW + 8;
      const endW = 64;
      const endSel = this.selectedBoard === 'endless';
      const endBg = endSel
        ? r.linearGradient(endX, subY, endX, subY + subH, [{ offset: 0, color: '#8b5cf6' }, { offset: 1, color: '#6d28d9' }])
        : 'rgba(30, 41, 59, 0.6)';
      const endBorder = endSel ? '#8b5cf6' : 'rgba(255, 255, 255, 0.05)';
      r.roundRect(endX, subY, endW, subH, 5, endBg, true, endBorder, 1);
      r.text('ENDLESS', endX + endW / 2, subY + subH / 2, '#ffffff', 9, 'center', 'bold', 'middle', 'header');
      this.regions.push({ x: endX, y: subY, w: endW, h: subH, action: 'board_endless' });
      
      // Daily sub-button
      const dlyX = endX + endW + 6;
      const dlyW = 58;
      const dlySel = this.selectedBoard === 'daily';
      const dlyBg = dlySel
        ? r.linearGradient(dlyX, subY, dlyX, subY + subH, [{ offset: 0, color: '#f59e0b' }, { offset: 1, color: '#d97706' }])
        : 'rgba(30, 41, 59, 0.6)';
      const dlyBorder = dlySel ? '#f59e0b' : 'rgba(255, 255, 255, 0.05)';
      r.roundRect(dlyX, subY, dlyW, subH, 5, dlyBg, true, dlyBorder, 1);
      r.text('DAILY', dlyX + dlyW / 2, subY + subH / 2, '#ffffff', 9, 'center', 'bold', 'middle', 'header');
      this.regions.push({ x: dlyX, y: subY, w: dlyW, h: subH, action: 'board_daily' });
      
      // Leaderboard Card Box
      const cardW = Math.min(r.width - 32, 380);
      const cardH = 210;
      const cardX = cx - cardW / 2;
      const cardY = subY + subH + 14;
      
      r.roundRect(cardX, cardY, cardW, cardH, 12, 'rgba(15, 23, 42, 0.95)', true, 'rgba(255, 255, 255, 0.08)', 1.5);
      
      // Fetch data
      const entries = getLeaderboard(save, this.selectedBoard, this.selectedLevelIdx);
      
      // Header of the Leaderboard Card
      let title = '';
      if (this.selectedBoard === 'level') title = `LEVEL ${this.selectedLevelIdx + 1} LEADERBOARD`;
      else if (this.selectedBoard === 'endless') title = 'ENDLESS MODE LEADERBOARD';
      else if (this.selectedBoard === 'daily') title = 'DAILY CHALLENGE LEADERBOARD';
      
      r.text(title, cx, cardY + 12, '#94a3b8', 11, 'center', 'bold', 'top', 'header');
      
      // Draw rows
      let rowY = cardY + 36;
      const rowH = 26;
      
      for (let idx = 0; idx < entries.length && idx < 6; idx++) {
        const entry = entries[idx];
        const isPlayer = entry.isPlayer;
        
        // player background highlight row capsule
        if (isPlayer) {
          r.roundRect(cardX + 8, rowY - 2, cardW - 16, rowH - 2, 4, 'rgba(59, 130, 246, 0.15)', true, '#3b82f6', 1);
        }
        
        // Rank styling
        const rank = idx + 1;
        let rankColor = '#64748b'; // standard
        if (rank === 1) rankColor = '#fbbf24'; // Gold
        else if (rank === 2) rankColor = '#e2e8f0'; // Silver
        else if (rank === 3) rankColor = '#cd7f32'; // Bronze
        
        // Rank Column
        r.text(`${rank}.`, cardX + 20, rowY + 3, rankColor, 12, 'center', 'bold', 'top', 'header');
        
        // Name Column
        const nameColor = isPlayer ? '#38bdf8' : '#ffffff';
        r.text(entry.name, cardX + 44, rowY + 3, nameColor, 12, 'left', isPlayer ? 'bold' : 'normal');
        
        // Detail (Waves) Column for endless/daily
        if (entry.wave !== undefined) {
          r.text(`WAVE ${entry.wave}`, cardX + cardW - 110, rowY + 3, '#94a3b8', 10, 'right', 'bold', 'top', 'header');
        }
        
        // Score Column
        r.text(`${entry.score.toLocaleString()} PTS`, cardX + cardW - 20, rowY + 3, isPlayer ? '#fbbf24' : '#e2e8f0', 11, 'right', 'bold', 'top', 'header');
        
        rowY += rowH;
      }
      
      // Close instructions
      let btnY = cardY + cardH + 12;
      r.text(t('stats.close'), cx, btnY, '#64748b', 11, 'center');
      
      const btnW = 180;
      const btnH = 34;
      const btnX = cx - btnW / 2;
      btnY += 18;
      
      const btnGrad = r.linearGradient(btnX, btnY, btnX, btnY + btnH, [
        { offset: 0, color: '#475569' },
        { offset: 1, color: '#1e293b' }
      ]);
      r.roundRect(btnX, btnY, btnW, btnH, 8, btnGrad, true, 'rgba(255, 255, 255, 0.08)', 1);
      r.text('Back', cx, btnY + btnH / 2, '#ffffff', 12, 'center', 'bold', 'middle');
      this.regions.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: 'close' });
    }
  }

  hit(x: number, y: number): string | null {
    for (const b of this.regions) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.action;
    }
    return null;
  }

  apply(action: string): void {
    if (action === 'tab_stats') this.currentTab = 'stats';
    else if (action === 'tab_rankings') this.currentTab = 'rankings';
    else if (action === 'board_endless') { this.selectedBoard = 'endless'; }
    else if (action === 'board_daily') { this.selectedBoard = 'daily'; }
    else if (action.startsWith('level_')) {
      this.selectedBoard = 'level';
      this.selectedLevelIdx = parseInt(action.split('_')[1], 10);
    }
  }
}
