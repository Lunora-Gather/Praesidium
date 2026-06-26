// Level select screen: campaign map with progress, best stars, best score, and difficulty picker.

import { Renderer } from '../engine/Renderer';
import { LevelManager } from '../game/grid/LevelManager';
import { SaveSystem } from '../utils/SaveSystem';
import { Difficulty, DIFFICULTY_LIST } from '../config/Difficulty';
import { getLocale, t } from '../utils/i18n';
import { getLevelTheme } from './LevelThemes';

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

    const bgGrad = r.linearGradient(0, 0, 0, r.height, [
      { offset: 0, color: '#090d16' },
      { offset: 0.55, color: '#0f172a' },
      { offset: 1, color: '#02060c' }
    ]);
    r.rect(0, 0, r.width, r.height, bgGrad);

    const cx = r.width / 2;
    const isSmall = r.width < 760;

    const titleGrad = r.linearGradient(cx - 120, 34, cx + 120, 34, [
      { offset: 0, color: '#60a5fa' },
      { offset: 0.5, color: '#93c5fd' },
      { offset: 1, color: '#3b82f6' }
    ]);
    r.setShadow('rgba(59, 130, 246, 0.3)', 12, 0, 0);
    r.text(t('level.select'), cx, isSmall ? 18 : 28, titleGrad, isSmall ? 24 : 30, 'center', 'bold', 'top', 'header');
    r.clearShadow();

    const progressY = isSmall ? 54 : 70;
    this.drawCampaignProgress(r, cx, progressY, isSmall);
    this.drawDifficultyPicker(r, cx, progressY + (isSmall ? 42 : 50), isSmall);

    const total = this.levels.total;
    const cols = isSmall ? 2 : Math.min(3, total);
    const gap = isSmall ? 10 : 16;
    const cardW = Math.min(isSmall ? 166 : 218, Math.floor((r.width - 32 - gap * (cols - 1)) / cols));
    const cardH = isSmall ? 118 : 138;
    const rows = Math.ceil(total / cols);
    const totalW = cols * cardW + (cols - 1) * gap;
    const startX = cx - totalW / 2;
    const startY = progressY + (isSmall ? 88 : 104);
    const nextIndex = this.nextPlayableIndex();

    for (let i = 0; i < total; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);
      this.drawLevelCard(r, x, y, cardW, cardH, i, i === nextIndex, isSmall);
    }

    const btnY = Math.min(r.height - 48, startY + rows * (cardH + gap) + 12);
    this.drawBackButton(r, cx, btnY);
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

    r.roundRect(x, y, w, h, 12, 'rgba(15, 23, 42, 0.72)', true, 'rgba(148, 163, 184, 0.12)', 1);
    r.text(`★ ${stars}/${maxStars}`, x + 16, y + h / 2, '#fbbf24', isSmall ? 11 : 13, 'left', 'bold', 'middle', 'header');
    r.text(`${t('level.level')} ${unlocked}/${total}`, cx, y + h / 2, '#cbd5e1', isSmall ? 11 : 13, 'center', 'bold', 'middle', 'header');
    r.text(`${Math.round(ratio * 100)}%`, x + w - 16, y + h / 2, '#60a5fa', isSmall ? 11 : 13, 'right', 'bold', 'middle', 'header');

    const barW = w - 28;
    const barY = y + h + 6;
    r.roundRect(x + 14, barY, barW, 4, 2, 'rgba(30, 41, 59, 0.9)', true);
    r.roundRect(x + 14, barY, Math.max(4, barW * ratio), 4, 2, '#3b82f6', true);
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

  private drawLevelCard(r: Renderer, x: number, y: number, w: number, h: number, index: number, isRecommended: boolean, isSmall: boolean): void {
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
        { offset: 0, color: isRecommended ? `${theme.pathGlow}44` : `${theme.buildable}dd` },
        { offset: 0.55, color: `${theme.background}ee` },
        { offset: 1, color: 'rgba(15, 23, 42, 0.92)' }
      ])
      : 'rgba(15, 23, 42, 0.42)';
    const border = isRecommended ? theme.accent : completed ? '#10b981' : unlocked ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.03)';

    if (isRecommended && unlocked) r.setShadow(`${theme.accent}66`, 14, 0, 0);
    r.roundRect(x, y, w, h, 14, cardBg, true, border, isRecommended ? 1.6 : 1);
    r.clearShadow();
    r.roundRect(x, y, 4, h, 2, accent, true);

    this.drawMiniRoute(r, x + 12, y + h - (isSmall ? 34 : 38), w - 24, isSmall ? 22 : 26, theme.accent, unlocked ? 0.42 : 0.16);

    if (isRecommended && unlocked) {
      const badgeW = isSmall ? 58 : 72;
      r.roundRect(x + w - badgeW - 10, y + 10, badgeW, 20, 10, `${theme.pathGlow}33`, true, theme.accent, 1);
      r.text(t('summary.nextLevel'), x + w - badgeW / 2 - 10, y + 20, '#f8fafc', isSmall ? 8 : 9, 'center', 'bold', 'middle', 'header');
    }

    r.text(`${t('level.level')} ${levelNumber}`, x + 16, y + 12, unlocked ? '#94a3b8' : '#475569', isSmall ? 9 : 10, 'left', 'bold', 'top', 'header');
    r.text(levelName, x + 16, y + 32, unlocked ? '#f8fafc' : '#64748b', isSmall ? 13 : 15, 'left', 'bold', 'top', 'header');
    if (!isSmall) r.text(theme.name, x + 16, y + 52, unlocked ? theme.accent : '#475569', 9, 'left', 'bold', 'top', 'header');

    const starY = y + (isSmall ? 57 : 70);
    r.setShadow('rgba(251, 191, 36, 0.24)', 6, 0, 0);
    for (let s = 0; s < 3; s++) {
      const starX = x + 17 + s * (isSmall ? 20 : 24);
      const active = s < stars;
      r.text(active ? '★' : '☆', starX, starY, active ? '#fbbf24' : '#475569', isSmall ? 17 : 20, 'left', 'normal', 'top', 'header');
    }
    r.clearShadow();

    const scoreLabel = score > 0 ? `${t('hud.score')} ${score.toLocaleString()}` : `${t('hud.score')} —`;
    r.text(scoreLabel, x + 16, y + (isSmall ? 86 : 101), unlocked ? '#cbd5e1' : '#475569', isSmall ? 10 : 11, 'left', 'bold', 'top', 'header');

    if (unlocked) {
      const actionText = completed ? t('menu.playAgain') : t('level.clickToPlay');
      r.text(actionText, x + w - 14, y + h - 22, theme.accent, isSmall ? 9 : 10, 'right', 'bold', 'top', 'header');
      this.regions.push({ x, y, w, h, action: { kind: 'level', index } });
    } else {
      r.text(t('level.locked'), x + w - 14, y + h - 22, '#64748b', isSmall ? 9 : 10, 'right', 'bold', 'top', 'header');
    }
  }

  private drawMiniRoute(r: Renderer, x: number, y: number, w: number, h: number, color: string, alpha: number): void {
    r.ctx.save();
    r.ctx.globalAlpha = alpha;
    r.ctx.strokeStyle = color;
    r.ctx.lineWidth = 2;
    r.ctx.lineCap = 'round';
    r.ctx.beginPath();
    r.ctx.moveTo(x, y + h * 0.65);
    r.ctx.bezierCurveTo(x + w * 0.25, y + h * 0.1, x + w * 0.45, y + h * 0.95, x + w * 0.68, y + h * 0.35);
    r.ctx.bezierCurveTo(x + w * 0.82, y, x + w * 0.92, y + h * 0.3, x + w, y + h * 0.18);
    r.ctx.stroke();
    r.ctx.globalAlpha = Math.min(1, alpha + 0.12);
    r.ctx.fillStyle = color;
    r.ctx.beginPath();
    r.ctx.arc(x + w, y + h * 0.18, 3, 0, Math.PI * 2);
    r.ctx.fill();
    r.ctx.restore();
  }

  private drawBackButton(r: Renderer, cx: number, y: number): void {
    const bw = 180;
    const bh = 36;
    const bx = cx - bw / 2;
    const backBtnGrad = r.linearGradient(bx, y, bx, y + bh, [
      { offset: 0, color: '#475569' },
      { offset: 1, color: '#1e293b' }
    ]);
    r.roundRect(bx, y, bw, bh, 9, backBtnGrad, true, 'rgba(255, 255, 255, 0.08)', 1);
    r.text(t('common.menu'), cx, y + bh / 2, '#ffffff', 13, 'center', 'bold', 'middle');
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
