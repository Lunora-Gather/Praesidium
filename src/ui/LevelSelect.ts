// Level select screen: shows unlocked levels with name + best score + difficulty picker.

import { Renderer } from '../engine/Renderer';
import { LevelManager } from '../game/grid/LevelManager';
import { SaveSystem } from '../utils/SaveSystem';
import { Difficulty, DIFFICULTY_LIST } from '../config/Difficulty';

type ClickAction = { kind: 'level'; index: number } | { kind: 'back' } | { kind: 'diff'; diff: Difficulty };

export class LevelSelect {
  private regions: Array<{ x: number; y: number; w: number; h: number; action: ClickAction }> = [];
  selectedDiff: Difficulty = 'normal';

  constructor(
    private readonly levels: LevelManager,
    private readonly save: SaveSystem,
  ) {}

  draw(r: Renderer): void {
    this.regions = [];
    
    // Smooth dark background gradient
    const bgGrad = r.linearGradient(0, 0, 0, r.height, [
      { offset: 0, color: '#090d16' },
      { offset: 1, color: '#02060c' }
    ]);
    r.rect(0, 0, r.width, r.height, bgGrad);
    
    const cx = r.width / 2;
    
    // Header gradient title
    const titleGrad = r.linearGradient(cx - 100, 48, cx + 100, 48, [
      { offset: 0, color: '#60a5fa' },
      { offset: 1, color: '#3b82f6' }
    ]);
    r.text('SELECT LEVEL', cx, 40, titleGrad, 28, 'center', 'bold', 'top', 'header');

    // Difficulty picker row
    const diffBtnW = 92;
    const diffGap = 10;
    const diffTotalW = DIFFICULTY_LIST.length * diffBtnW + (DIFFICULTY_LIST.length - 1) * diffGap;
    let dx = cx - diffTotalW / 2;
    const diffY = 86;
    const diffH = 26;
    
    for (const d of DIFFICULTY_LIST) {
      const sel = d.id === this.selectedDiff;
      let btnBg: string | CanvasGradient;
      let btnBorder: string;
      
      if (sel) {
        btnBg = r.linearGradient(dx, diffY, dx, diffY + diffH, [
          { offset: 0, color: '#3b82f6' },
          { offset: 1, color: '#1d4ed8' }
        ]);
        btnBorder = '#3b82f6';
        r.setShadow('rgba(59, 130, 246, 0.4)', 8, 0, 0);
      } else {
        btnBg = r.linearGradient(dx, diffY, dx, diffY + diffH, [
          { offset: 0, color: '#334155' },
          { offset: 1, color: '#1e293b' }
        ]);
        btnBorder = 'rgba(255, 255, 255, 0.08)';
      }
      
      r.roundRect(dx, diffY, diffBtnW, diffH, 13, btnBg, true, btnBorder, 1);
      r.clearShadow();
      
      r.text(d.name, dx + diffBtnW / 2, diffY + diffH / 2, '#ffffff', 11, 'center', 'bold', 'middle', 'header');
      this.regions.push({ x: dx, y: diffY, w: diffBtnW, h: diffH, action: { kind: 'diff', diff: d.id } });
      dx += diffBtnW + diffGap;
    }

    // Grid Level Cards
    const cardW = 190;
    const cardH = 110;
    const gap = 16;
    const total = this.levels.total;
    const cols = Math.min(3, total); // wraps on smaller width
    const rows = Math.ceil(total / cols);
    const totalW = cols * cardW + (cols - 1) * gap;
    const startX = cx - totalW / 2;
    const startY = 135;

    for (let i = 0; i < total; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);
      const unlocked = i + 1 <= this.save.get().maxLevelReached;
      const levelName = this.levels.levelAt(i).name;
      
      let cardBg: string | CanvasGradient;
      let cardBorder: string;
      
      if (unlocked) {
        cardBg = r.linearGradient(x, y, x, y + cardH, [
          { offset: 0, color: 'rgba(30, 41, 59, 0.8)' },
          { offset: 1, color: 'rgba(15, 23, 42, 0.8)' }
        ]);
        cardBorder = 'rgba(255, 255, 255, 0.1)';
      } else {
        cardBg = 'rgba(15, 23, 42, 0.4)';
        cardBorder = 'rgba(255, 255, 255, 0.03)';
      }

      r.roundRect(x, y, cardW, cardH, 12, cardBg, true, cardBorder, 1);
      
      // Card content
      r.text(`LEVEL ${i + 1}`, x + cardW / 2, y + 14, unlocked ? '#94a3b8' : '#475569', 10, 'center', 'bold', 'top', 'header');
      r.text(levelName, x + cardW / 2, y + 32, unlocked ? '#ffffff' : '#475569', 15, 'center', 'bold');
      
      if (unlocked) {
        // Glowing stars
        const stars = this.save.getStars(i + 1);
        const starY = y + 54;
        r.setShadow('rgba(251, 191, 36, 0.3)', 8, 0, 0);
        for (let s = 0; s < 3; s++) {
          const starX = x + cardW / 2 - 24 + s * 24;
          const active = s < stars;
          r.text(active ? '★' : '☆', starX, starY, active ? '#fbbf24' : '#475569', 20, 'center', 'normal', 'top', 'header');
        }
        r.clearShadow();
        
        r.text('CLICK TO PLAY', x + cardW / 2, y + 84, '#60a5fa', 10, 'center', 'bold');
        this.regions.push({ x, y, w: cardW, h: cardH, action: { kind: 'level', index: i } });
      } else {
        r.text('LOCKED', x + cardW / 2, y + 64, '#475569', 12, 'center', 'bold');
      }
    }

    // Back to Menu Button
    const btnY = startY + rows * (cardH + gap) + 15;
    const bw = 180;
    const bh = 36;
    const bx = cx - bw / 2;
    
    const backBtnGrad = r.linearGradient(bx, btnY, bx, btnY + bh, [
      { offset: 0, color: '#475569' },
      { offset: 1, color: '#1e293b' }
    ]);
    r.roundRect(bx, btnY, bw, bh, 8, backBtnGrad, true, 'rgba(255, 255, 255, 0.08)', 1);
    r.text('Menu', cx, btnY + bh / 2, '#ffffff', 13, 'center', 'bold', 'middle');
    this.regions.push({ x: bx, y: btnY, w: bw, h: bh, action: { kind: 'back' } });
  }

  hit(x: number, y: number): ClickAction | null {
    for (const b of this.regions) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.action;
    }
    return null;
  }
}
