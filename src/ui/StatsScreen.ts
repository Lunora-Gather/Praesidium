// Stats/Profile screen: shows player their analytics data — the reason they come back.
// Visible progress = retention. No visible progress = "why bother returning?"

import { Renderer } from '../engine/Renderer';
import { AnalyticsData } from '../utils/Analytics';
import { t } from '../utils/i18n';

export class StatsScreen {
  private regions: Array<{ x: number; y: number; w: number; h: number }> = [];

  draw(r: Renderer, data: Readonly<AnalyticsData>): void {
    this.regions = [];
    
    // Dim background with overlay gradient
    const bgGrad = r.linearGradient(0, 0, 0, r.height, [
      { offset: 0, color: 'rgba(10, 14, 20, 0.85)' },
      { offset: 1, color: 'rgba(17, 24, 39, 0.95)' }
    ]);
    r.rect(0, 0, r.width, r.height, bgGrad);
    
    const cx = r.width / 2;
    
    // Title
    const titleGrad = r.linearGradient(cx - 100, 36, cx + 100, 36, [
      { offset: 0, color: '#60a5fa' },
      { offset: 1, color: '#3b82f6' }
    ]);
    r.text(t('stats.title'), cx, 24, titleGrad, 26, 'center', 'bold');
    
    const fmt = (sec: number) => sec < 60 ? `${Math.round(sec)}s` : sec < 3600 ? `${Math.round(sec / 60)}m` : `${(sec / 3600).toFixed(1)}h`;
    
    // Prepare session stats rows
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
    
    // Grid Cards layout coordinates
    const cardW = isDesktop ? 250 : Math.min(r.width - 32, 360);
    const cardH = 270;
    const gap = 16;
    
    let colCount = isDesktop ? 3 : 1;
    let totalW = colCount * cardW + (colCount - 1) * gap;
    let startX = cx - totalW / 2;
    let startY = 70;
    
    // Card 1: Session Data
    let c1x = startX;
    let c1y = startY;
    r.roundRect(c1x, c1y, cardW, cardH, 12, 'rgba(15, 23, 42, 0.9)', true, 'rgba(255, 255, 255, 0.08)', 1.5);
    r.text('SESSION DATA', c1x + 16, c1y + 14, '#94a3b8', 11, 'left', 'bold');
    let rowY = c1y + 40;
    for (const [label, val] of sessionRows) {
      r.text(label, c1x + 16, rowY, '#64748b', 12, 'left', 'bold');
      r.text(val, c1x + cardW - 16, rowY, '#ffffff', 12, 'right', 'bold');
      rowY += 30;
    }
    
    // Card 2: Tower Usage
    let c2x = isDesktop ? startX + cardW + gap : startX;
    let c2y = isDesktop ? startY : startY + cardH + gap;
    r.roundRect(c2x, c2y, cardW, cardH, 12, 'rgba(15, 23, 42, 0.9)', true, 'rgba(255, 255, 255, 0.08)', 1.5);
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
      r.text(val, c2x + cardW - 16, rowY, '#fbbf24', 12, 'right', 'bold');
      rowY += 34;
    }
    
    // Card 3: Level Rates
    let c3x = isDesktop ? startX + (cardW + gap) * 2 : startX;
    let c3y = isDesktop ? startY : startY + (cardH + gap) * 2;
    r.roundRect(c3x, c3y, cardW, cardH, 12, 'rgba(15, 23, 42, 0.9)', true, 'rgba(255, 255, 255, 0.08)', 1.5);
    r.text(t('stats.levelRates').toUpperCase(), c3x + 16, c3y + 14, '#94a3b8', 11, 'left', 'bold');
    
    rowY = c3y + 40;
    for (let i = 0; i < 6; i++) {
      const attempted = data.levelsAttempted[i] ?? 0;
      const completed = data.levelsCompleted[i] ?? 0;
      const rate = attempted > 0 ? Math.round((completed / attempted) * 100) : 0;
      r.text(`LEVEL ${i + 1}`, c3x + 16, rowY, '#cbd5e1', 12, 'left', 'bold');
      
      const rateColor = rate >= 75 ? '#10b981' : rate >= 40 ? '#f59e0b' : attempted > 0 ? '#ef4444' : '#64748b';
      r.text(`${completed}/${attempted} (${rate}%)`, c3x + cardW - 16, rowY, rateColor, 12, 'right', 'bold');
      rowY += 34;
    }
    
    // Close Hint & Menu Button
    let btnY = isDesktop ? startY + cardH + 16 : c3y + cardH + 16;
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
    r.text(t('hud.menu'), cx, btnY + 17, '#ffffff', 12, 'center', 'bold');
    this.regions.push({ x: btnX, y: btnY, w: btnW, h: btnH });
  }

  hit(x: number, y: number): boolean {
    for (const b of this.regions) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
    }
    return false;
  }
}
