// HUD: top bar with gold/lives/wave/score + bottom tower shop + control buttons.
// All drawn directly to canvas via the Renderer; no DOM widgets.

import { Renderer } from '../engine/Renderer';
import { GameState } from '../game/GameState';
import { TOWER_LIST } from '../game/towers/TowerRegistry';
import { Vec2 } from '../engine/math/Vec2';

export class HUD {
  /** Draw the HUD; returns hit regions for click handling (shop buttons, etc.). */
  draw(r: Renderer, s: GameState): HudRegions {
    const regions: HudRegions = { shop: [], buttons: [] };

    // top bar
    r.rect(0, 0, r.width, 48, '#11182788');
    r.text(`GOLD ${s.gold}`, 16, 14, '#ffd54f', 18);
    r.text(`LIVES ${s.lives}`, 160, 14, '#e57373', 18);
    r.text(`WAVE ${s.waves.current}/${s.waves.totalWaves}`, 300, 14, '#81c784', 18);
    r.text(`SCORE ${s.score}`, 460, 14, '#ffffff', 18);

    // tower shop (bottom bar)
    const shopH = 64;
    const shopY = r.height - shopH;
    r.rect(0, shopY, r.width, shopH, '#11182788');
    const slotW = 120;
    const padding = 12;
    let x = padding;
    for (const def of TOWER_LIST) {
      const selected = s.selectedTowerId === def.id;
      const affordable = s.gold >= def.cost;
      r.rect(x, shopY + 8, slotW, shopH - 16, selected ? '#1f6feb' : '#1f2937', true);
      r.rect(x, shopY + 8, slotW, shopH - 16, affordable ? '#3a3a3a' : '#2a2a2a', false);
      r.text(def.name, x + 8, shopY + 14, affordable ? '#e6e6e6' : '#666', 14);
      r.text(`${def.cost}g`, x + 8, shopY + 38, affordable ? '#ffd54f' : '#666', 13);
      // mini icon
      r.circle(new Vec2(x + slotW - 22, shopY + 28), 10, def.color);
      regions.shop.push({ x, y: shopY + 8, w: slotW, h: shopH - 16, towerId: def.id });
      x += slotW + padding;
    }

    // send-wave / pause buttons (right side of top bar)
    let bx = r.width - 16;
    const btnW = 96;
    const btnH = 32;
    const btnY = 8;
    const drawBtn = (label: string, color: string, action: string): void => {
      bx -= btnW;
      r.rect(bx, btnY, btnW, btnH, color, true);
      r.text(label, bx + btnW / 2, btnY + 9, '#fff', 13, 'center');
      regions.buttons.push({ x: bx, y: btnY, w: btnW, h: btnH, action });
      bx -= 8;
    };
    const waveLabel = s.waves.inProgress
      ? 'Wave…'
      : s.waves.current >= s.waves.totalWaves ? 'Last wave' : `Send W${s.waves.current + 1}`;
    drawBtn('Settings', '#374151', 'settings');
    drawBtn('Pause', '#374151', 'pause');
    drawBtn('Menu', '#374151', 'menu');
    drawBtn(waveLabel, '#1f6feb', 'send');

    return regions;
  }

  hitShop(regions: HudRegions, x: number, y: number): string | null {
    for (const s of regions.shop) {
      if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return s.towerId;
    }
    return null;
  }

  hitButton(regions: HudRegions, x: number, y: number): string | null {
    for (const b of regions.buttons) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.action;
    }
    return null;
  }
}

export interface HudRegions {
  shop: Array<{ x: number; y: number; w: number; h: number; towerId: string }>;
  buttons: Array<{ x: number; y: number; w: number; h: number; action: string }>;
}
