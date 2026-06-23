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
    r.rect(0, 0, r.width, r.height, '#0a0e14');
    const cx = r.width / 2;
    r.text('SELECT LEVEL', cx, 70, '#8ab4f8', 32, 'center');

    // difficulty picker row
    const diffBtnW = 100;
    const diffGap = 12;
    const diffTotalW = DIFFICULTY_LIST.length * diffBtnW + (DIFFICULTY_LIST.length - 1) * diffGap;
    let dx = cx - diffTotalW / 2;
    const diffY = 110;
    for (const d of DIFFICULTY_LIST) {
      const sel = d.id === this.selectedDiff;
      r.rect(dx, diffY, diffBtnW, 32, sel ? '#1f6feb' : '#374151', true);
      r.text(d.name, dx + diffBtnW / 2, diffY + 9, '#fff', 13, 'center');
      this.regions.push({ x: dx, y: diffY, w: diffBtnW, h: 32, action: { kind: 'diff', diff: d.id } });
      dx += diffBtnW + diffGap;
    }

    const cardW = 180;
    const cardH = 100;
    const gap = 16;
    const total = this.levels.total;
    const cols = Math.min(3, total); // max 3 per row, wraps on mobile
    const rows = Math.ceil(total / cols);
    const totalW = cols * cardW + (cols - 1) * gap;
    const startX = cx - totalW / 2;
    const startY = 160;

    for (let i = 0; i < total; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);
      const unlocked = i + 1 <= this.save.get().maxLevelReached;
      const levelName = this.levels.levelAt(i).name;
      r.rect(x, y, cardW, cardH, unlocked ? '#1f2937' : '#0d1320', true);
      r.rect(x, y, cardW, cardH, unlocked ? '#3a506b' : '#1a1a1a', false);
      r.text(`Level ${i + 1}`, x + cardW / 2, y + 18, unlocked ? '#fff' : '#555', 18, 'center');
      r.text(levelName, x + cardW / 2, y + 48, unlocked ? '#9aa0a6' : '#444', 13, 'center');
      if (unlocked) {
        // show best stars as ★/☆
        const stars = this.save.getStars(i + 1);
        const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        r.text(starStr, x + cardW / 2, y + 70, stars >= 3 ? '#ffd54f' : '#9aa0a6', 16, 'center');
        r.text('Click to play', x + cardW / 2, y + 92, '#8ab4f8', 11, 'center');
        this.regions.push({ x, y, w: cardW, h: cardH, action: { kind: 'level', index: i } });
      } else {
        r.text('Locked', x + cardW / 2, y + 78, '#555', 12, 'center');
      }
    }

    const btnY = startY + rows * (cardH + gap) + 20;
    r.text('← Back to Menu (click below)', cx, btnY, '#9aa0a6', 14, 'center');
    const bw = 160;
    const bx = cx - bw / 2;
    r.rect(bx, btnY + 20, bw, 40, '#374151', true);
    r.text('Menu', cx, btnY + 33, '#fff', 14, 'center');
    this.regions.push({ x: bx, y: btnY + 20, w: bw, h: 40, action: { kind: 'back' } });
  }

  hit(x: number, y: number): ClickAction | null {
    for (const b of this.regions) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.action;
    }
    return null;
  }
}
