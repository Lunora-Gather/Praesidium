// Stats/Profile screen: shows player analytics data, leaderboards, and product health diagnostics.

import type { FocusRegion } from './ControlFocus';
import { Renderer } from '../engine/Renderer';
import { AnalyticsData } from '../utils/Analytics';
import { t } from '../utils/i18n';
import { SaveSystem } from '../utils/SaveSystem';
import { getLeaderboard, leaderboardRecord, type LeaderboardType } from '../utils/Leaderboard';
import type { Difficulty } from '../config/Difficulty';
import { dailyDateStr } from '../utils/DailyChallenge';
import { weekKey } from '../utils/WeeklyMode';
import { towerName } from '../utils/displayText';
import { buildProductHealth, type ProductRisk } from '../utils/ProductHealth';
import { drawGlassPanel, layoutFor, UI } from './Layout';
import { LEVELS } from '../game/grid/LevelManager';
import { TOWER_LIST } from '../game/towers/TowerRegistry';

export class StatsScreen {
  private regions: Array<FocusRegion & { action: string }> = [];

  get focusRegions(): readonly FocusRegion[] { return this.regions; }
  currentTab: 'stats' | 'rankings' | 'health' = 'stats';
  selectedBoard: LeaderboardType = 'daily';
  private boardDifficulty: Difficulty = 'normal';
  selectedLevelIdx = 0;
  private metric: 'session' | 'tower' | 'level' | 'modes' = 'session';

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

    const tabW = layout.isPhone ? 92 : 112;
    const tabH = layout.isCompact ? 25 : 28;
    const tabGap = Math.max(6, layout.gap - 2);
    const tabStartX = cx - (tabW * 3 + tabGap * 2) / 2;
    const tabY = titleY + (layout.isCompact ? 34 : 38);

    this.drawTab(r, tabStartX, tabY, tabW, tabH, t('stats.statistics'), this.currentTab === 'stats', 'tab_stats');
    this.drawTab(r, tabStartX + tabW + tabGap, tabY, tabW, tabH, t('stats.rankings'), this.currentTab === 'rankings', 'tab_rankings');
    this.drawTab(r, tabStartX + (tabW + tabGap) * 2, tabY, tabW, tabH, t('health.title'), this.currentTab === 'health', 'tab_health');

    const startY = tabY + tabH + (layout.isCompact ? 12 : 18);
    if (this.currentTab === 'stats') this.drawStatsTab(r, data, startY);
    else if (this.currentTab === 'rankings') this.drawRankingsTab(r, save, startY);
    else this.drawHealthTab(r, data, startY);
  }

  private drawTab(r: Renderer, x: number, y: number, w: number, h: number, label: string, selected: boolean, action: string): void {
    const bg = selected
      ? r.linearGradient(x, y, x, y + h, [{ offset: 0, color: UI.color.blue }, { offset: 1, color: '#1d4ed8' }])
      : 'rgba(30, 41, 59, 0.7)';
    const border = selected ? UI.color.blue : 'rgba(255, 255, 255, 0.08)';
    r.roundRect(x, y, w, h, h / 2, bg, true, border, 1);
    r.text(label.toUpperCase(), x + w / 2, y + h / 2, '#ffffff', w < 100 ? 8 : 10, 'center', 'bold', 'middle', 'header');
    this.regions.push({ x, y, w, h, action, label, pressed: selected });
  }

  private drawStatsTab(r: Renderer, data: Readonly<AnalyticsData>, startY: number): void {
    const layout = layoutFor(r);
    const cx = r.width / 2;
    const fmt = (sec: number) => sec < 60 ? `${Math.round(sec)}s` : sec < 3600 ? `${Math.round(sec / 60)}m` : `${(sec / 3600).toFixed(1)}h`;

    const sessionRows: Array<[string, string]> = [
      [t('stats.sessions'), `${data.sessions}`],
      [t('stats.activeTime'), fmt(data.totalPlaySec)],
      [t('stats.simTime'), fmt(data.simulatedSec)],
      [t('stats.avgSession'), fmt(data.avgSessionSec)],
      [t('stats.longestSession'), fmt(data.longestSessionSec)],
      [t('stats.returnDays'), `${data.returnDays}`],
      [t('stats.endlessBest'), `${data.endlessBestWave}`],
      [t('stats.endlessRuns'), `${data.endlessRuns}`],
    ];

    const wide = r.width >= 1120 && r.height >= 440;
    const colCount = wide ? 4 : 1;
    const gap = layout.gap;
    const cardW = Math.min(wide ? 352 : 460, Math.floor((r.width - layout.safe * 2 - gap * (colCount - 1)) / colCount));
    const totalW = colCount * cardW + (colCount - 1) * gap;
    const startX = cx - totalW / 2;

    const cards = [
      { title: t('stats.sessionData'), kind: 'session' },
      { title: t('stats.towerUsage'), kind: 'tower' },
      { title: t('stats.levelRates'), kind: 'level' },
      { title: t('stats.modes'), kind: 'modes' },
    ] as const;

    let y = startY;
    if (!wide) {
      const selectorW = (cardW - (cards.length - 1) * gap) / cards.length;
      for (const [i, card] of cards.entries()) {
        this.drawBoardButton(r, startX + i * (selectorW + gap), y, selectorW, 26, card.title, this.metric === card.kind, UI.color.blue, '#1d4ed8', `metric_${card.kind}`);
      }
      y += 26 + gap;
    }

    const cardH = Math.min(330, r.height - y - layout.buttonH - layout.safe - gap - 6);
    const visible = wide ? cards : cards.filter(card => card.kind === this.metric);
    for (const [i, card] of visible.entries()) {
      const x = startX + i * (cardW + gap);
      this.drawCard(r, x, y, cardW, cardH, card.title);
      if (card.kind === 'session') this.drawSessionRows(r, x, y, cardW, cardH, sessionRows);
      if (card.kind === 'tower') this.drawTowerRows(r, x, y, cardW, cardH, data);
      if (card.kind === 'level') this.drawLevelRows(r, x, y, cardW, cardH, data);
      if (card.kind === 'modes') {
        const modes = ['campaign', 'endless', 'daily', 'weekly', 'custom'] as const;
        const difficulty = ['normal', 'hard', 'brutal'] as const;
        const rows: Array<[string, string]> = modes.map(mode => {
          const sample = data.byMode[mode];
          return [t(`stats.mode.${mode}`), sample ? `${sample.finished}/${sample.started} · ${fmt(sample.activeSec)}` : '—'];
        });
        for (const id of difficulty) {
          const sample = data.byDifficulty[id];
          rows.push([t(`diff.${id}`), sample ? `${sample.won}/${sample.finished} ${t('stats.wins')}` : '—']);
        }
        this.drawSessionRows(r, x, y, cardW, cardH, rows);
      }
    }
    this.drawCloseButton(r, y + cardH + gap, 'close', t('common.back'));
  }

  private drawHealthTab(r: Renderer, data: Readonly<AnalyticsData>, startY: number): void {
    const layout = layoutFor(r);
    const cx = r.width / 2;
    const health = buildProductHealth(data);
    const gap = layout.gap;
    const panelW = Math.min(layout.panelW, 640);
    const panelX = cx - panelW / 2;
    const scoreCols = r.width >= 620 || r.height < 420 ? 2 : 1;
    const scoreW = (panelW - gap * (scoreCols - 1)) / scoreCols;
    const scoreH = layout.isCompact ? 62 : 94;

    this.drawScoreCard(r, panelX, startY, scoreW, scoreH, t('health.retention'), health.retentionScore, this.scoreColor(health.retentionScore), t('health.retentionDetail'));
    const balanceX = scoreCols === 2 ? panelX + scoreW + gap : panelX;
    const balanceY = scoreCols === 2 ? startY : startY + scoreH + gap;
    this.drawScoreCard(r, balanceX, balanceY, scoreW, scoreH, t('health.balance'), health.balanceScore, this.scoreColor(health.balanceScore), t('health.balanceDetail'));

    const riskY = startY + (scoreCols === 2 ? scoreH + gap : scoreH * 2 + gap * 2);
    const buttonH = layout.buttonH - 6;
    const riskH = Math.min(250, r.height - riskY - gap - layout.safe - buttonH);
    if (riskH >= 28) this.drawRiskPanel(r, panelX, riskY, panelW, riskH, health.risks);
    this.drawHealthActions(r, panelX, riskY + riskH + gap, panelW, buttonH);
  }

  private drawScoreCard(r: Renderer, x: number, y: number, w: number, h: number, title: string, score: number | null, color: string, subtitle: string): void {
    drawGlassPanel(r, x, y, w, h, 12, color, 0.88);
    r.text(title.toUpperCase(), x + 16, y + 12, UI.color.textMuted, 10, 'left', 'bold', 'top', 'header');
    const compact = h < 80;
    r.text(score === null ? '—' : String(score), x + w - 16, y + 10, color, compact ? 22 : 30, 'right', 'bold', 'top', 'header');
    if (score !== null) r.text('/100', x + w - 16, y + (compact ? 31 : 44), UI.color.textDim, 9, 'right', 'bold', 'top', 'header');
    r.text(score === null ? t('health.insufficient') : subtitle, x + 16, y + h - (compact ? 15 : 24), UI.color.text, compact ? 9 : 11, 'left', 'bold', 'top', 'ui', w - 32);
  }

  private drawRiskPanel(r: Renderer, x: number, y: number, w: number, h: number, risks: ProductRisk[]): void {
    drawGlassPanel(r, x, y, w, h, 12, risks.length > 0 ? '#f59e0b' : UI.color.green, 0.88);
    r.text(t('health.risks'), x + 16, y + 12, UI.color.textMuted, 10, 'left', 'bold', 'top', 'header');
    r.text(`${risks.length}`, x + w - 16, y + 12, risks.length > 0 ? UI.color.gold : UI.color.green, 12, 'right', 'bold', 'top', 'header');

    if (risks.length === 0) {
      if (h >= 55) r.text(t('health.noRisks'), x + 16, y + 38, UI.color.text, 12, 'left', 'bold', 'top', 'ui', w - 32);
      if (h >= 80) r.text(t('health.sampleHint'), x + 16, y + 60, UI.color.textDim, 10, 'left', 'normal', 'top', 'ui', w - 32);
      return;
    }

    const visible = risks.slice(0, Math.max(0, Math.floor((h - 34) / 38)));
    let rowY = y + 32;
    for (const item of visible) {
      const color = this.riskColor(item.level);
      r.roundRect(x + 12, rowY, w - 24, 32, 8, 'rgba(15, 23, 42, 0.68)', true, 'rgba(148, 163, 184, 0.08)', 1);
      r.roundRect(x + 12, rowY, 4, 32, 2, color, true);
      r.text(t(`health.level.${item.level}`).toUpperCase(), x + 24, rowY + 6, color, 8, 'left', 'bold', 'top', 'header');
      const textW = w - 110;
      r.text(this.truncate(item.title, w > 520 ? 48 : 32), x + 86, rowY + 5, UI.color.text, 11, 'left', 'bold', 'top', 'ui', textW);
      r.text(this.truncate(item.detail, w > 520 ? 74 : 44), x + 86, rowY + 19, UI.color.textDim, 8.5, 'left', 'normal', 'top', 'ui', textW);
      rowY += 38;
    }
  }

  private drawHealthActions(r: Renderer, x: number, y: number, w: number, btnH: number): void {
    const gap = Math.max(8, layoutFor(r).gap);
    const btnW = Math.min(210, (w - gap) / 2);
    const totalW = btnW * 2 + gap;
    const startX = x + w / 2 - totalW / 2;
    this.drawActionButton(r, startX, y, btnW, btnH, t('stats.exportReport'), 'export_report', UI.color.blue, '#1d4ed8');
    this.drawActionButton(r, startX + btnW + gap, y, btnW, btnH, t('common.back'), 'close', '#475569', '#1e293b');
  }

  private drawActionButton(r: Renderer, x: number, y: number, w: number, h: number, label: string, action: string, colorA: string, colorB: string): void {
    const grad = r.linearGradient(x, y, x, y + h, [{ offset: 0, color: colorA }, { offset: 1, color: colorB }]);
    r.roundRect(x, y, w, h, 8, grad, true, 'rgba(255,255,255,0.10)', 1);
    r.text(label, x + w / 2, y + h / 2, '#ffffff', w < 150 ? 9 : 10.5, 'center', 'bold', 'middle', 'header');
    this.regions.push({ x, y, w, h, action, label });
  }

  private drawSessionRows(r: Renderer, x: number, y: number, w: number, h: number, rows: Array<[string, string]>): void {
    let rowY = y + 40;
    const rowStep = Math.min(24, Math.floor((h - 48) / rows.length));
    for (const [label, val] of rows) {
      r.text(label, x + 16, rowY, UI.color.textDim, 11, 'left', 'bold');
      r.text(val, x + w - 16, rowY, UI.color.text, 11, 'right', 'bold', 'top', 'header');
      rowY += rowStep;
    }
  }

  private drawTowerRows(r: Renderer, x: number, y: number, w: number, h: number, data: Readonly<AnalyticsData>): void {
    const sorted = TOWER_LIST.map(def => [towerName(def.id, def.name), data.towerUsage[def.id] ?? 0] as const)
      .sort((a, b) => b[1] - a[1]);
    const rows: Array<[string, string]> = sorted.map(([name, count]) => [name, String(count)]);
    this.drawSessionRows(r, x, y, w, h, rows);
  }

  private drawLevelRows(r: Renderer, x: number, y: number, w: number, h: number, data: Readonly<AnalyticsData>): void {
    const cols = h >= 285 ? 1 : 2;
    const rows = Math.ceil(LEVELS.length / cols);
    const colWidth = w / cols;
    const rowStep = Math.min(24, Math.floor((h - 47) / rows));
    for (let i = 0; i < LEVELS.length; i++) {
      const attempted = data.levelsAttempted[i] ?? 0;
      const completed = data.levelsCompleted[i] ?? 0;
      const rate = attempted > 0 ? Math.round((completed / attempted) * 100) : 0;
      const colX = x + Math.floor(i / rows) * colWidth;
      const rowY = y + 36 + (i % rows) * rowStep;
      r.text(`${t('stats.level')} ${i + 1}`, colX + 12, rowY, '#cbd5e1', 10, 'left', 'bold', 'top', 'header');
      const rateColor = rate >= 75 ? UI.color.green : rate >= 40 ? '#f59e0b' : attempted > 0 ? UI.color.red : UI.color.textDim;
      r.text(`${completed}/${attempted} (${rate}%)`, colX + colWidth - 12, rowY, rateColor, 10, 'right', 'bold', 'top', 'header');
    }
  }

  private drawRankingsTab(r: Renderer, save: SaveSystem, startY: number): void {
    const layout = layoutFor(r);
    const cx = r.width / 2;
    const subH = layout.isCompact ? 22 : 24;
    const subY = startY;
    const lvlGap = 4;
    const lvlW = Math.min(40, Math.floor((r.width - layout.safe * 2 - lvlGap * (LEVELS.length - 1)) / LEVELS.length));
    const totalLvlW = LEVELS.length * lvlW + (LEVELS.length - 1) * lvlGap;
    const leftLvlX = cx - totalLvlW / 2;

    for (let i = 0; i < LEVELS.length; i++) {
      const lx = leftLvlX + i * (lvlW + lvlGap);
      const sel = this.selectedBoard === 'level' && this.selectedLevelIdx === i;
      const bg = sel
        ? r.linearGradient(lx, subY, lx, subY + subH, [{ offset: 0, color: UI.color.green }, { offset: 1, color: '#059669' }])
        : 'rgba(30, 41, 59, 0.6)';
      const border = sel ? UI.color.green : 'rgba(255, 255, 255, 0.05)';
      r.roundRect(lx, subY, lvlW, subH, 6, bg, true, border, 1);
      r.text(`L${i + 1}`, lx + lvlW / 2, subY + subH / 2, '#ffffff', 9, 'center', 'bold', 'middle', 'header');
      this.regions.push({ x: lx, y: subY, w: lvlW, h: subH, action: `level_${i}`, label: `${t('level.level')} ${i + 1}`, pressed: sel });
    }

    const modesY = subY + subH + 6;
    const types = ['endless', 'daily', 'weekly', 'practice', 'history'] as const;
    const modeW = Math.min(86, (r.width - layout.safe * 2 - (types.length - 1) * 4) / types.length);
    const modeX = cx - (modeW * types.length + (types.length - 1) * 4) / 2;
    for (const [index, type] of types.entries()) {
      this.drawBoardButton(r, modeX + index * (modeW + 4), modesY, modeW, subH, t(`stats.${type}`),
        this.selectedBoard === type, UI.color.violet, '#6d28d9', `board_${type}`);
    }

    const cardW = Math.min(layout.panelW, 430);
    const cardX = cx - cardW / 2;
    const cardY = modesY + subH + 10;
    const cardH = Math.min(226, r.height - cardY - layout.buttonH - layout.safe - 10);
    drawGlassPanel(r, cardX, cardY, cardW, cardH, layout.radius, UI.color.violet, 0.88);

    const now = new Date();
    const entries = getLeaderboard(save, this.selectedBoard, this.selectedLevelIdx, this.boardDifficulty, now);
    const record = leaderboardRecord(save, this.selectedBoard, this.selectedLevelIdx, this.boardDifficulty, now);
    const rankTitle = this.leaderboardTitle();
    r.text(rankTitle, cx, cardY + 8, UI.color.textMuted, 11, 'center', 'bold', 'top', 'header', cardW - 28);
    const localOnly = this.selectedBoard === 'practice' || this.selectedBoard === 'history';
    const period = this.selectedBoard === 'daily' ? dailyDateStr(now) : this.selectedBoard === 'weekly' ? weekKey(now) : '';
    const description = [localOnly ? t('stats.personalOnly') : t('stats.simulated'), period];
    if (record && this.selectedBoard !== 'level') description.push(t('stats.furthest').replace('{wave}', String(record.furthestWave)));
    r.text(description.filter(Boolean).join(' · '), cx, cardY + 23, UI.color.textDim, 9, 'center', 'normal', 'top', 'ui', cardW - 24);
    if (this.selectedBoard === 'level') {
      this.drawBoardButton(r, cardX + cardW - 88, cardY + 7, 80, 22,
        t(`diff.${this.boardDifficulty}`), false, UI.color.violet, '#6d28d9', 'board_difficulty');
    }
    if (!entries.length) r.text(t('stats.noRecords'), cx, cardY + 52, UI.color.textMuted, 12, 'center');
    let rowY = cardY + 39;
    const rowH = Math.min(26, Math.max(12, Math.floor((cardH - 44) / Math.max(1, entries.length))));
    const fontSize = rowH < 17 ? 9 : 11;
    for (let idx = 0; idx < entries.length && idx < 6; idx++) {
      const entry = entries[idx];
      const isPlayer = entry.isPlayer;
      if (isPlayer) r.roundRect(cardX + 8, rowY - 2, cardW - 16, rowH - 2, 6, 'rgba(59, 130, 246, 0.15)', true, UI.color.blue, 1);

      const rank = idx + 1;
      const rankColor = rank === 1 ? UI.color.gold : rank === 2 ? '#e2e8f0' : rank === 3 ? '#cd7f32' : UI.color.textDim;
      r.text(`${rank}.`, cardX + 20, rowY + 2, rankColor, fontSize, 'center', 'bold', 'top', 'header');
      const name = entry.name === 'YOU' ? t('stats.you') : entry.name.startsWith('historical.') ? t(entry.name) : entry.name;
      r.text(name, cardX + 36, rowY + 2, isPlayer ? '#38bdf8' : '#ffffff', fontSize, 'left', isPlayer ? 'bold' : 'normal', 'top', 'ui', cardW * 0.38);
      if (entry.wave !== undefined) r.text(`${t('stats.wave')} ${entry.wave}`, cardX + cardW - 100, rowY + 2, UI.color.textMuted, fontSize, 'right', 'bold', 'top', 'header');
      r.text(`${entry.score.toLocaleString()} ${t('stats.points')}`, cardX + cardW - 20, rowY + 2, isPlayer ? UI.color.gold : '#e2e8f0', fontSize, 'right', 'bold', 'top', 'header');
      rowY += rowH;
    }

    this.drawCloseButton(r, cardY + cardH + 8, 'close', t('common.back'));
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
    this.regions.push({ x, y, w, h, action, label, pressed: selected });
  }

  private drawCloseButton(r: Renderer, y: number, action: string, label: string): void {
    const layout = layoutFor(r);
    const cx = r.width / 2;
    const btnW = Math.min(190, layout.panelW * 0.5);
    const btnH = layout.buttonH - 4;
    const btnX = cx - btnW / 2;
    const btnY = Math.min(y, r.height - layout.safe - btnH);
    const btnGrad = r.linearGradient(btnX, btnY, btnX, btnY + btnH, [
      { offset: 0, color: '#475569' },
      { offset: 1, color: '#1e293b' }
    ]);
    r.roundRect(btnX, btnY, btnW, btnH, 9, btnGrad, true, 'rgba(255, 255, 255, 0.08)', 1);
    r.text(label, cx, btnY + btnH / 2, '#ffffff', 12, 'center', 'bold', 'middle');
    this.regions.push({ x: btnX, y: btnY, w: btnW, h: btnH, action, label });
  }

  private leaderboardTitle(): string {
    if (this.selectedBoard === 'level') return t('stats.leaderboard.level').replace('{level}', `${this.selectedLevelIdx + 1}`);
    if (this.selectedBoard === 'endless') return t('stats.leaderboard.endless');
    if (this.selectedBoard === 'daily') return t('stats.leaderboard.daily');
    return t(`stats.${this.selectedBoard}`);
  }

  private scoreColor(score: number | null): string {
    if (score === null) return UI.color.textDim;
    if (score >= 75) return UI.color.green;
    if (score >= 50) return UI.color.gold;
    return UI.color.red;
  }

  private riskColor(level: ProductRisk['level']): string {
    if (level === 'high') return UI.color.red;
    if (level === 'medium') return UI.color.gold;
    return UI.color.green;
  }

  private truncate(text: string, max: number): string {
    return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`;
  }

  hit(x: number, y: number): string | null {
    for (const b of this.regions) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.action;
    return null;
  }

  apply(action: string): void {
    if (action === 'tab_stats') this.currentTab = 'stats';
    else if (action === 'tab_rankings') this.currentTab = 'rankings';
    else if (action === 'tab_health') this.currentTab = 'health';
    else if (action === 'metric_session') this.metric = 'session';
    else if (action === 'metric_tower') this.metric = 'tower';
    else if (action === 'metric_level') this.metric = 'level';
    else if (action === 'metric_modes') this.metric = 'modes';
    else if (action === 'board_endless') this.selectedBoard = 'endless';
    else if (action === 'board_daily') this.selectedBoard = 'daily';
    else if (action === 'board_weekly') this.selectedBoard = 'weekly';
    else if (action === 'board_history') this.selectedBoard = 'history';
    else if (action === 'board_practice') this.selectedBoard = 'practice';
    else if (action === 'board_difficulty') this.boardDifficulty = this.boardDifficulty === 'normal' ? 'hard' : this.boardDifficulty === 'hard' ? 'brutal' : 'normal';
    else if (action.startsWith('level_')) {
      this.selectedBoard = 'level';
      this.selectedLevelIdx = parseInt(action.split('_')[1], 10);
    }
  }
}
