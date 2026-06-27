// Talent panel: spend talent points on meta-upgrades. Shown as an overlay
// accessible from the HUD. This is the ONLY way to spend talent points —
// without this UI, the entire talent system is dead functionality.

import { Renderer } from '../engine/Renderer';
import { TalentTree, TALENTS } from '../game/Talents';
import { t } from '../utils/i18n';
import { cardColumns, layoutFor, UI } from './Layout';

export class TalentPanel {
  private regions: Array<{ x: number; y: number; w: number; h: number; talentId: string }> = [];

  draw(r: Renderer, talents: TalentTree): void {
    this.regions = [];
    const layout = layoutFor(r);

    const bgGrad = r.linearGradient(0, 0, 0, r.height, [
      { offset: 0, color: 'rgba(10, 14, 20, 0.85)' },
      { offset: 1, color: 'rgba(17, 24, 39, 0.95)' }
    ]);
    r.rect(0, 0, r.width, r.height, bgGrad);

    const cx = r.width / 2;
    const titleY = layout.isCompact ? 14 : 24;
    const titleGrad = r.linearGradient(cx - 100, 36, cx + 100, 36, [
      { offset: 0, color: '#60a5fa' },
      { offset: 1, color: '#3b82f6' }
    ]);
    r.text(t('talent.title'), cx, titleY, titleGrad, layout.isCompact ? 23 : 26, 'center', 'bold', 'top', 'header');

    r.setShadow('rgba(251, 191, 36, 0.3)', 10, 0, 0);
    r.text(`${t('talent.points')}: ${talents.talentPoints}`, cx, titleY + (layout.isCompact ? 30 : 34), UI.color.gold, layout.isCompact ? 13 : 16, 'center', 'bold', 'top', 'header');
    r.clearShadow();

    const gap = layout.gap;
    const cols = cardColumns(r, TALENTS.length, 190, 150, layout.safe, gap);
    const rows = Math.ceil(TALENTS.length / cols);
    const startY = titleY + (layout.isCompact ? 60 : 72);
    const availableH = Math.max(240, r.height - startY - 34);
    const cardH = Math.max(92, Math.min(layout.isCompact ? 104 : 112, Math.floor((availableH - gap * (rows - 1)) / rows)));
    const cardW = Math.floor((r.width - layout.safe * 2 - gap * (cols - 1)) / cols);
    const totalW = cols * cardW + (cols - 1) * gap;
    const startX = cx - totalW / 2;

    for (let i = 0; i < TALENTS.length; i++) {
      const def = TALENTS[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);

      const rank = talents.rank(def.id);
      const canUp = talents.canRankUp(def.id);
      const isMax = rank >= def.maxRank;

      let cardBg: string | CanvasGradient;
      let cardBorder: string;
      if (isMax) {
        cardBg = r.linearGradient(x, y, x, y + cardH, [
          { offset: 0, color: 'rgba(10, 15, 30, 0.8)' },
          { offset: 1, color: 'rgba(15, 23, 42, 0.9)' }
        ]);
        cardBorder = UI.color.gold;
        r.setShadow('rgba(251, 191, 36, 0.2)', 8, 0, 0);
      } else if (canUp) {
        cardBg = r.linearGradient(x, y, x, y + cardH, [
          { offset: 0, color: 'rgba(30, 41, 59, 0.85)' },
          { offset: 1, color: 'rgba(15, 23, 42, 0.85)' }
        ]);
        cardBorder = UI.color.blue;
        r.setShadow('rgba(59, 130, 246, 0.25)', 8, 0, 0);
      } else {
        cardBg = 'rgba(15, 23, 42, 0.4)';
        cardBorder = 'rgba(255, 255, 255, 0.03)';
      }

      r.roundRect(x, y, cardW, cardH, layout.radius - 2, cardBg, true, cardBorder, canUp || isMax ? 1.5 : 1);
      r.clearShadow();

      r.text(t(`talent.${def.id}.name`), x + cardW / 2, y + 10, UI.color.text, cardW < 170 ? 11.5 : 13, 'center', 'bold');
      if (cardH >= 104) r.text(t(`talent.${def.id}.desc`), x + cardW / 2, y + 26, UI.color.textMuted, cardW < 170 ? 8 : 9, 'center');

      const pipW = Math.min(20, Math.max(14, Math.floor((cardW - 40) / def.maxRank)));
      const pipGap = 4;
      const pipsW = def.maxRank * pipW + (def.maxRank - 1) * pipGap;
      let px = x + (cardW - pipsW) / 2;
      const pipY = y + (cardH >= 104 ? 48 : 38);
      for (let p = 0; p < def.maxRank; p++) {
        const active = p < rank;
        const pipColor = active ? (isMax ? UI.color.gold : UI.color.blue) : '#1e293b';
        r.roundRect(px, pipY, pipW, 6, 3, pipColor, true);
        px += pipW + pipGap;
      }

      r.text(`${rank}/${def.maxRank}`, x + cardW / 2, pipY + 14, '#ffffff', 11, 'center', 'bold', 'top', 'header');

      const hintY = y + cardH - 24;
      if (isMax) {
        r.text(t('common.maxed'), x + cardW / 2, hintY, UI.color.gold, 10, 'center', 'bold', 'top', 'header');
      } else {
        r.text(t('talent.cost').replace('{cost}', String(def.costPerRank)), x + cardW / 2, hintY, canUp ? UI.color.gold : '#475569', 10, 'center', 'bold', 'top', 'header');
      }

      if (canUp) this.regions.push({ x, y, w: cardW, h: cardH, talentId: def.id });
    }

    const closeY = Math.min(r.height - 20, startY + rows * (cardH + gap) + 4);
    r.text(t('talent.close'), cx, closeY, UI.color.textDim, 12, 'center', 'bold');
  }

  hit(x: number, y: number): string | null {
    for (const r of this.regions) {
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.talentId;
    }
    return null;
  }
}
