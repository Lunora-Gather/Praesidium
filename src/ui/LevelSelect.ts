// Level select screen: shows unlocked levels with name + best score.

import { Renderer } from '../engine/Renderer';
import { LevelManager } from '../game/grid/LevelManager';
import { SaveSystem } from '../utils/SaveSystem';

type ClickAction = { kind: 'level'; index: number } | { kind: 'back' };

export class LevelSelect {
  private regions: Array<{ x: number; y: number; w: number; h: number; action: ClickAction }> = [];

  constructor(
    private readonly levels: LevelManager,
    private readonly save: SaveSystem,
  ) {}

  draw(r: Renderer): void {
    this.regions = [];
    r.rect(0, 0, r.width, r.height, '#0a0e14');
    const cx = r.width / 2;
    r.text('SELECT LEVEL', cx, 70, '#8ab4f8', 32, 'center');

    const cardW = 280;
    const cardH = 110;
    const gap = 24;
    const total = this.levels.total;
    const totalW = total * cardW + (total - 1) * gap;
    let x = cx - totalW / 2;
    const y = r.height / 2 - cardH / 2;

    for (let i = 0; i < total; i++) {
      const unlocked = i + 1 <= this.save.get().maxLevelReached;
      const levelName = this.levels.levelAt(i).name;
      r.rect(x, y, cardW, cardH, unlocked ? '#1f2937' : '#0d1320', true);
      r.rect(x, y, cardW, cardH, unlocked ? '#3a506b' : '#1a1a1a', false);
      r.text(`Level ${i + 1}`, x + cardW / 2, y + 18, unlocked ? '#fff' : '#555', 18, 'center');
      r.text(levelName, x + cardW / 2, y + 48, unlocked ? '#9aa0a6' : '#444', 13, 'center');
      if (unlocked) {
        r.text('Click to play', x + cardW / 2, y + 78, '#8ab4f8', 12, 'center');
        this.regions.push({ x, y, w: cardW, h: cardH, action: { kind: 'level', index: i } });
      } else {
        r.text('Locked', x + cardW / 2, y + 78, '#555', 12, 'center');
      }
      x += cardW + gap;
    }
    // re-draw with correct names (LevelManager.current is mutable; snapshot list)
    // — handled by caller passing fresh names via redraw; acceptable for Phase 2.

    const btnY = y + cardH + 40;
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
