// Stats/Profile screen: shows player their analytics data — the reason they come back.
// Visible progress = retention. No visible progress = "why bother returning?"

import { Renderer } from '../engine/Renderer';
import { AnalyticsData } from '../utils/Analytics';
import { t } from '../utils/i18n';

export class StatsScreen {
  private regions: Array<{ x: number; y: number; w: number; h: number }> = [];

  draw(r: Renderer, data: Readonly<AnalyticsData>): void {
    this.regions = [];
    r.rect(0, 0, r.width, r.height, '#0a0e14ee');
    const cx = r.width / 2;
    let y = 60;

    r.text(t('stats.title'), cx, y, '#8ab4f8', 32, 'center');
    y += 50;

    const fmt = (sec: number) => sec < 60 ? `${Math.round(sec)}s` : sec < 3600 ? `${Math.round(sec / 60)}m` : `${(sec / 3600).toFixed(1)}h`;

    const rows: Array<[string, string]> = [
      [t('stats.sessions'), `${data.sessions}`],
      [t('stats.playtime'), fmt(data.totalPlaySec)],
      [t('stats.avgSession'), fmt(data.avgSessionSec)],
      [t('stats.longestSession'), fmt(data.longestSessionSec)],
      [t('stats.returnDays'), `${data.returnDays}`],
      [t('stats.endlessBest'), `${data.endlessBestWave} ${t('stats.waves')}`],
      [t('stats.endlessRuns'), `${data.endlessRuns}`],
    ];

    const rowH = 36;
    const colW = 280;
    const startX = cx - colW;

    for (const [label, value] of rows) {
      r.text(label, startX, y, '#9aa0a6', 14);
      r.text(value, startX + colW, y, '#fff', 14);
      y += rowH;
    }

    // Tower usage ranking
    y += 20;
    r.text(t('stats.towerUsage'), cx, y, '#8ab4f8', 20, 'center');
    y += 30;
    const sorted = Object.entries(data.towerUsage).sort((a, b) => b[1] - a[1]);
    for (let i = 0; i < Math.min(sorted.length, 6); i++) {
      const [id, count] = sorted[i];
      r.text(`${i + 1}. ${id}`, startX, y, '#e6e6e6', 14);
      r.text(`${count}`, startX + colW, y, '#ffd54f', 14);
      y += 28;
    }

    // Level completion rates
    y += 20;
    r.text(t('stats.levelRates'), cx, y, '#8ab4f8', 20, 'center');
    y += 30;
    for (let i = 0; i < 6; i++) {
      const attempted = data.levelsAttempted[i] ?? 0;
      const completed = data.levelsCompleted[i] ?? 0;
      const rate = attempted > 0 ? Math.round((completed / attempted) * 100) : 0;
      r.text(`Level ${i + 1}`, startX, y, '#e6e6e6', 14);
      r.text(`${completed}/${attempted} (${rate}%)`, startX + colW, y, rate >= 50 ? '#81c784' : '#e57373', 14);
      y += 28;
    }

    // Close hint
    y += 20;
    r.text(t('stats.close'), cx, y, '#555', 13, 'center');

    // Back button
    const btnW = 160;
    const btnH = 40;
    const btnX = cx - btnW / 2;
    y += 30;
    r.rect(btnX, y, btnW, btnH, '#374151', true);
    r.text(t('hud.menu'), cx, y + 12, '#fff', 14, 'center');
    this.regions.push({ x: btnX, y, w: btnW, h: btnH });
  }

  hit(x: number, y: number): boolean {
    for (const b of this.regions) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
    }
    return false;
  }
}
