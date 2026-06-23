// Talent panel: spend talent points on meta-upgrades. Shown as an overlay
// accessible from the HUD. This is the ONLY way to spend talent points —
// without this UI, the entire talent system is dead functionality.

import { Renderer } from '../engine/Renderer';
import { TalentTree, TALENTS } from '../game/Talents';
import { t } from '../utils/i18n';

export class TalentPanel {
  private regions: Array<{ x: number; y: number; w: number; h: number; talentId: string }> = [];

  draw(r: Renderer, talents: TalentTree): void {
    this.regions = [];
    // full-screen semi-transparent overlay
    r.rect(0, 0, r.width, r.height, '#0a0e14dd', true);

    const cx = r.width / 2;
    r.text(t('talent.title'), cx, 40, '#8ab4f8', 28, 'center');
    r.text(`${t('talent.points')}: ${talents.talentPoints}`, cx, 75, '#ffd54f', 18, 'center');

    const cardW = 180;
    const cardH = 100;
    const gap = 16;
    const cols = 3;
    const totalW = cols * cardW + (cols - 1) * gap;
    const startX = cx - totalW / 2;
    const startY = 110;

    for (let i = 0; i < TALENTS.length; i++) {
      const def = TALENTS[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);

      const rank = talents.rank(def.id);
      const canUp = talents.canRankUp(def.id);
      const bg = canUp ? '#1f2937' : '#111827';
      const border = rank >= def.maxRank ? '#ffd54f' : canUp ? '#3a506b' : '#1a1a1a';

      r.rect(x, y, cardW, cardH, bg, true);
      r.rect(x, y, cardW, cardH, border, false);

      r.text(def.name, x + cardW / 2, y + 12, '#e6e6e6', 14, 'center');
      r.text(def.description, x + cardW / 2, y + 32, '#9aa0a6', 10, 'center');

      // rank bar: filled pips
      const pipW = 24;
      const pipGap = 4;
      const pipsW = def.maxRank * pipW + (def.maxRank - 1) * pipGap;
      let px = x + (cardW - pipsW) / 2;
      const pipY = y + 52;
      for (let p = 0; p < def.maxRank; p++) {
        r.rect(px, pipY, pipW, 8, p < rank ? '#1f6feb' : '#222', true);
        r.rect(px, pipY, pipW, 8, '#3a506b', false);
        px += pipW + pipGap;
      }

      // rank text
      r.text(`${rank}/${def.maxRank}`, x + cardW / 2, y + 72, '#fff', 12, 'center');

      // cost hint
      if (rank < def.maxRank) {
        r.text(`${def.costPerRank}pt`, x + cardW / 2, y + 88, canUp ? '#ffd54f' : '#555', 10, 'center');
      } else {
        r.text('MAX', x + cardW / 2, y + 88, '#ffd54f', 10, 'center');
      }

      if (canUp) {
        this.regions.push({ x, y, w: cardW, h: cardH, talentId: def.id });
      }
    }

    // close hint
    r.text(t('talent.close'), cx, startY + Math.ceil(TALENTS.length / cols) * (cardH + gap) + 20, '#9aa0a6', 13, 'center');
  }

  hit(x: number, y: number): string | null {
    for (const r of this.regions) {
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.talentId;
    }
    return null;
  }
}
