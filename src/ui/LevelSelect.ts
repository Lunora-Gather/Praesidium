// Level select screen: campaign map with progress, best stars, best score, and difficulty picker.

import { Renderer } from '../engine/Renderer';
import { LevelManager } from '../game/grid/LevelManager';
import { SaveSystem } from '../utils/SaveSystem';
import { Difficulty, DIFFICULTY_LIST } from '../config/Difficulty';
import { getLocale, t } from '../utils/i18n';
import { getLevelTheme } from './LevelThemes';
import { layoutFor, UI } from './Layout';

export type LevelSelectAction = { kind: 'level'; index: number } | { kind: 'back' } | { kind: 'diff'; diff: Difficulty };

export class LevelSelect {
  private regions: Array<{ x: number; y: number; w: number; h: number; action: LevelSelectAction }> = [];
  selectedDiff: Difficulty = 'normal';

  constructor(
    private readonly levels: LevelManager,
    private readonly save: SaveSystem,
  ) {}

  draw(r: Renderer): void {
    this.regions = [];
    const layout = layoutFor(r);

    const bgGrad = r.linearGradient(0, 0, 0, r.height, [
      { offset: 0, color: '#090d16' },
      { offset: 0.55, color: '#0f172a' },
      { offset: 1, color: '#02060c' }
    ]);
    r.rect(0, 0, r.width, r.height, bgGrad);
    this.drawMapBackdrop(r);

    const cx = r.width / 2;
    const isCompactLandscape = layout.isCompact && r.width > r.height;
    const isSmall = layout.isPhone || isCompactLandscape;
    const isCompact = layout.isCompact;
    const titleY = isCompactLandscape ? 10 : isSmall ? 18 : 28;

    const titleGrad = r.linearGradient(cx - 120, 34, cx + 120, 34, [
      { offset: 0, color: '#60a5fa' },
      { offset: 0.5, color: '#93c5fd' },
      { offset: 1, color: '#3b82f6' }
    ]);
    r.setShadow('rgba(59, 130, 246, 0.3)', 12, 0, 0);
    r.text(t('level.select'), cx, titleY, titleGrad, isSmall ? 24 : 30, 'center', 'bold', 'top', 'header');
    r.clearShadow();

    const progressY = isCompactLandscape ? 42 : isSmall ? 54 : 70;
    this.drawCampaignProgress(r, cx, progressY, isSmall);
    this.drawDifficultyPicker(r, cx, progressY + (isCompactLandscape ? 34 : isSmall ? 42 : 50), isSmall);

    const total = this.levels.total;
    const gap = isCompactLandscape ? 8 : isSmall ? layout.gap : 14;
    const cols = isCompactLandscape ? 5 : isSmall ? 2 : 5;
    const startY = progressY + (isCompactLandscape ? 74 : isSmall ? 90 : 132);
    const cardH = isCompactLandscape ? 68 : isSmall ? 104 : 118;
    const cardW = Math.min(isCompactLandscape ? 166 : isSmall ? 166 : 206, Math.floor((r.width - layout.safe * 2 - gap * (cols - 1)) / cols));
    const totalW = cols * cardW + (cols - 1) * gap;
    const startX = cx - totalW / 2;
    const nextIndex = this.nextPlayableIndex();

    if (!isSmall) r.text('CAMPAIGN ROUTE', startX, startY - 26, '#67e8f9', 10, 'left', 'bold', 'top', 'header');
    this.drawRouteRail(r, startX, startY, cardW, cardH, gap, cols, total);

    for (let i = 0; i < total; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);
      this.drawLevelCard(r, x, y, cardW, cardH, i, i === nextIndex, isSmall, isCompact);
    }

    this.drawBackButton(r, cx, layout.safe + 10, isCompact);
  }

  private drawCampaignProgress(r: Renderer, cx: number, y: number, isSmall: boolean): void {
    const unlocked = this.save.getUnlockedLevelCount();
    const total = this.levels.total;
    const stars = this.save.getTotalStars();
    const maxStars = this.save.getMaxStars();
    const ratio = this.save.getCampaignCompletionRatio();
    const w = isSmall ? Math.min(r.width - 36, 380) : 520;
    const h = isSmall ? 30 : 36;
    const x = cx - w / 2;

    r.text(`★ ${stars}/${maxStars}`, x + 16, y + h / 2, UI.color.gold, isSmall ? 11 : 13, 'left', 'bold', 'middle', 'header');
    r.text(`${t('level.level')} ${unlocked}/${total}`, cx, y + h / 2, '#cbd5e1', isSmall ? 11 : 13, 'center', 'bold', 'middle', 'header');
    r.text(`${Math.round(ratio * 100)}%`, x + w - 16, y + h / 2, '#60a5fa', isSmall ? 11 : 13, 'right', 'bold', 'middle', 'header');

    const barW = w - 28;
    const barY = y + h + 6;
    r.roundRect(x + 14, barY, barW, 3, 2, 'rgba(30, 41, 59, 0.72)', true);
    r.roundRect(x + 14, barY, Math.max(4, barW * ratio), 3, 2, UI.color.blue, true);
  }

  private drawDifficultyPicker(r: Renderer, cx: number, y: number, isSmall: boolean): void {
    const diffBtnW = isSmall ? 78 : 104;
    const diffGap = isSmall ? 7 : 10;
    const diffTotalW = DIFFICULTY_LIST.length * diffBtnW + (DIFFICULTY_LIST.length - 1) * diffGap;
    let dx = cx - diffTotalW / 2;
    const diffH = isSmall ? 25 : 30;

    for (const d of DIFFICULTY_LIST) {
      const sel = d.id === this.selectedDiff;
      const color = this.difficultyColor(d.id);
      const btnBg = sel
        ? r.linearGradient(dx, y, dx, y + diffH, [{ offset: 0, color }, { offset: 1, color: '#1e293b' }])
        : r.linearGradient(dx, y, dx, y + diffH, [{ offset: 0, color: '#334155' }, { offset: 1, color: '#1e293b' }]);
      const btnBorder = sel ? color : 'rgba(255, 255, 255, 0.08)';
      if (sel) r.setShadow(`${color}66`, 9, 0, 0);
      r.roundRect(dx, y, diffBtnW, diffH, 14, btnBg, true, btnBorder, 1.2);
      r.clearShadow();
      r.text(this.difficultyName(d.id), dx + diffBtnW / 2, y + diffH / 2, '#ffffff', isSmall ? 10 : 11, 'center', 'bold', 'middle', 'header');
      this.regions.push({ x: dx, y, w: diffBtnW, h: diffH, action: { kind: 'diff', diff: d.id } });
      dx += diffBtnW + diffGap;
    }

    const current = DIFFICULTY_LIST.find(item => item.id === this.selectedDiff);
    if (current && !isSmall) r.text(this.difficultyDescription(current.id), cx, y + diffH + 12, '#64748b', 11, 'center', 'bold', 'top');
  }

  private drawLevelCard(r: Renderer, x: number, y: number, w: number, h: number, index: number, isRecommended: boolean, isSmall: boolean, isCompact: boolean): void {
    const levelNumber = index + 1;
    const theme = getLevelTheme(levelNumber);
    const unlocked = this.save.isLevelUnlocked(levelNumber);
    const stars = this.save.getStars(levelNumber);
    const score = this.save.getLevelScore(levelNumber);
    const levelName = this.levels.levelAt(index).name;
    const completed = stars > 0;

    const accent = completed ? '#10b981' : isRecommended ? theme.accent : unlocked ? theme.accent : '#475569';
    const cardBg = unlocked
      ? r.linearGradient(x, y, x, y + h, [
        { offset: 0, color: isRecommended ? `${theme.pathGlow}4d` : 'rgba(15, 23, 42, 0.86)' },
        { offset: 1, color: 'rgba(2, 6, 23, 0.82)' }
      ])
      : 'rgba(15, 23, 42, 0.36)';
    const border = isRecommended ? theme.accent : completed ? '#10b98188' : unlocked ? `${theme.accent}44` : 'rgba(148, 163, 184, 0.05)';

    if (isRecommended && unlocked) r.setShadow(`${theme.accent}66`, 14, 0, 0);
    this.drawMissionSlab(r, x, y, w, h, isSmall ? 12 : 16, cardBg, border, isRecommended ? 1.5 : 1);
    r.clearShadow();
    r.ctx.save();
    r.ctx.fillStyle = accent;
    r.ctx.globalAlpha = unlocked ? 0.95 : 0.35;
    r.ctx.fillRect(x, y + 8, 4, h - 16);
    r.ctx.restore();

    const markerR = isSmall ? 13 : 15;
    r.ctx.save();
    r.ctx.fillStyle = unlocked ? `${accent}26` : 'rgba(71, 85, 105, 0.18)';
    r.ctx.strokeStyle = unlocked ? accent : '#475569';
    r.ctx.lineWidth = 1.2;
    r.ctx.beginPath();
    r.ctx.arc(x + 23, y + 24, markerR, 0, Math.PI * 2);
    r.ctx.fill();
    r.ctx.stroke();
    r.ctx.restore();
    r.text(String(levelNumber).padStart(2, '0'), x + 23, y + 24, unlocked ? '#e0f2fe' : '#64748b', isSmall ? 8 : 9, 'center', 'bold', 'middle', 'header');

    r.text(levelName, x + 44, y + 14, unlocked ? '#f8fafc' : '#64748b', isSmall ? 12 : 14, 'left', 'bold', 'top', 'header');
    r.text(theme.name, x + 44, y + 33, unlocked ? theme.accent : '#475569', isSmall ? 8 : 9, 'left', 'bold', 'top', 'header');

    const starY = y + (isCompact ? 50 : isSmall ? 58 : 58);
    r.setShadow('rgba(251, 191, 36, 0.24)', 6, 0, 0);
    for (let s = 0; s < 3; s++) {
      const starX = x + 18 + s * (isSmall ? 18 : 20);
      const active = s < stars;
      r.text(active ? '★' : '☆', starX, starY, active ? UI.color.gold : '#475569', isSmall ? 14 : 16, 'left', 'normal', 'top', 'header');
    }
    r.clearShadow();

    if (!isCompact && score > 0) r.text(`${t('hud.score')} ${score.toLocaleString()}`, x + 16, y + h - 24, '#cbd5e1', isSmall ? 8.5 : 9.5, 'left', 'bold', 'top', 'header');

    if (unlocked) {
      const actionText = completed ? t('menu.playAgain') : t('level.clickToPlay');
      r.text(actionText, x + w - 13, y + h - 23, theme.accent, isSmall ? 8.5 : 9.5, 'right', 'bold', 'top', 'header');
      this.regions.push({ x, y, w, h, action: { kind: 'level', index } });
    } else {
      r.text(t('level.locked'), x + w - 13, y + h - 23, '#64748b', isSmall ? 8.5 : 9.5, 'right', 'bold', 'top', 'header');
    }
  }

  private drawMapBackdrop(r: Renderer): void {
    const horizonY = Math.floor(r.height * 0.68);
    r.ctx.save();
    r.ctx.globalAlpha = 0.10;
    r.ctx.strokeStyle = '#38bdf8';
    r.ctx.lineWidth = 1;
    for (let y = horizonY; y < r.height; y += 34) {
      r.ctx.beginPath();
      r.ctx.moveTo(0, y);
      r.ctx.lineTo(r.width, y);
      r.ctx.stroke();
    }
    for (let x = -r.width; x < r.width * 2; x += 100) {
      r.ctx.beginPath();
      r.ctx.moveTo(x, r.height);
      r.ctx.lineTo(r.width / 2 + (x - r.width / 2) * 0.18, horizonY);
      r.ctx.stroke();
    }
    r.ctx.restore();
  }

  private drawRouteRail(r: Renderer, startX: number, startY: number, cardW: number, cardH: number, gap: number, cols: number, total: number): void {
    const rows = Math.ceil(total / cols);
    if (rows < 2) return;
    const x1 = startX + cardW / 2;
    const x2 = startX + (cols - 1) * (cardW + gap) + cardW / 2;
    const y = startY + cardH + gap / 2;
    r.ctx.save();
    r.ctx.strokeStyle = 'rgba(96, 165, 250, 0.14)';
    r.ctx.lineWidth = 3;
    r.ctx.lineCap = 'round';
    r.ctx.lineJoin = 'round';
    r.ctx.beginPath();
    r.ctx.moveTo(x1, y);
    r.ctx.lineTo(x2, y);
    r.ctx.stroke();
    r.ctx.fillStyle = 'rgba(96, 165, 250, 0.18)';
    for (let i = 0; i < cols; i++) {
      const x = startX + i * (cardW + gap) + cardW / 2;
      r.ctx.beginPath();
      r.ctx.arc(x, y, 3, 0, Math.PI * 2);
      r.ctx.fill();
    }
    r.ctx.restore();
  }

  private drawMissionSlab(r: Renderer, x: number, y: number, w: number, h: number, cut: number, fill: string | CanvasGradient, stroke: string | CanvasGradient, strokeWidth: number): void {
    r.ctx.beginPath();
    r.ctx.moveTo(x + cut, y);
    r.ctx.lineTo(x + w, y);
    r.ctx.lineTo(x + w - cut, y + h);
    r.ctx.lineTo(x, y + h);
    r.ctx.closePath();
    r.ctx.fillStyle = fill;
    r.ctx.fill();
    r.ctx.strokeStyle = stroke;
    r.ctx.lineWidth = strokeWidth;
    r.ctx.stroke();
  }

  private drawBackButton(r: Renderer, _cx: number, y: number, compact: boolean): void {
    const layout = layoutFor(r);
    const bw = compact ? 104 : 118;
    const bh = compact ? 26 : 28;
    const bx = layout.safe + 8;
    r.roundRect(bx, y, bw, bh, 8, 'rgba(15, 23, 42, 0.34)', true, 'rgba(148, 163, 184, 0.12)', 1);
    r.text('‹', bx + 18, y + bh / 2 - 1, '#93c5fd', compact ? 16 : 18, 'center', 'bold', 'middle', 'header');
    r.text(t('common.menu'), bx + 37, y + bh / 2, '#cbd5e1', compact ? 10 : 11, 'left', 'bold', 'middle');
    this.regions.push({ x: bx, y, w: bw, h: bh, action: { kind: 'back' } });
  }

  private difficultyName(id: Difficulty): string {
    if (getLocale() !== 'zh') return id === 'normal' ? 'Normal' : id === 'hard' ? 'Hard' : 'Brutal';
    if (id === 'normal') return '普通';
    if (id === 'hard') return '困难';
    return '残酷';
  }

  private difficultyDescription(id: Difficulty): string {
    if (getLocale() !== 'zh') {
      if (id === 'normal') return 'Balanced experience.';
      if (id === 'hard') return '+50% enemy HP, +20% count.';
      return '+120% HP, +40% count, -10% reward.';
    }
    if (id === 'normal') return '均衡体验。';
    if (id === 'hard') return '敌人生命 +50%，数量 +20%。';
    return '生命 +120%，数量 +40%，奖励 -10%。';
  }

  private difficultyColor(id: Difficulty): string {
    if (id === 'normal') return '#3b82f6';
    if (id === 'hard') return '#f59e0b';
    return '#ef4444';
  }

  private nextPlayableIndex(): number {
    const maxReached = this.save.getUnlockedLevelCount();
    for (let i = 1; i <= maxReached; i++) {
      if (this.save.getStars(i) === 0) return i - 1;
    }
    return Math.min(maxReached - 1, this.levels.total - 1);
  }

  hit(x: number, y: number): LevelSelectAction | null {
    for (const b of this.regions) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.action;
    }
    return null;
  }
}
