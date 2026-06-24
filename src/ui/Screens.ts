// Full-screen overlays: main menu, pause, victory, defeat.
// Rich info: stars on victory, wave count on defeat, keyboard hints on menu.

import { Renderer } from '../engine/Renderer';
import { t } from '../utils/i18n';

export type MenuClickAction = 'start' | 'endless' | 'challenge' | 'daily' | 'resume' | 'restart' | 'menu' | null;

export interface ScreenStats {
  stars?: number;
  wave?: number;
  kills?: number;
  gold?: number;
}

export class Screens {
  private regions: Array<{ x: number; y: number; w: number; h: number; action: MenuClickAction }> = [];

  draw(r: Renderer, kind: 'menu' | 'paused' | 'won' | 'lost', score = 0, seed = 0, stats?: ScreenStats): void {
    this.regions = [];
    
    // Dim background with a dark slate-gray vertical linear gradient overlay
    const bgGrad = r.linearGradient(0, 0, 0, r.height, [
      { offset: 0, color: 'rgba(10, 14, 20, 0.85)' },
      { offset: 1, color: 'rgba(17, 24, 39, 0.95)' }
    ]);
    r.rect(0, 0, r.width, r.height, bgGrad);
    
    const cx = r.width / 2;
    const cy = r.height / 2;
    
    // Responsive modal card dimensions
    const isMenu = kind === 'menu';
    const cardW = Math.min(r.width - 32, 440);
    const cardH = isMenu ? 440 : 360;
    const cardX = cx - cardW / 2;
    const cardY = cy - cardH / 2;
    
    // Neon glow shadow determined by the screen state
    let glowColor = 'rgba(59, 130, 246, 0.15)'; // Blue default (Pause)
    if (kind === 'won') glowColor = 'rgba(16, 185, 129, 0.2)'; // Emerald (Win)
    if (kind === 'lost') glowColor = 'rgba(239, 68, 68, 0.2)'; // Coral (Defeat)
    
    r.setShadow(glowColor, 32, 0, 8);
    // Draw Glassmorphic Card Container
    r.roundRect(cardX, cardY, cardW, cardH, 16, 'rgba(15, 23, 42, 0.85)', true, 'rgba(255, 255, 255, 0.08)', 1.5);
    r.clearShadow();
    
    // Logo & Header text styling using vibrant text gradients
    const titleKey = kind === 'menu' ? 'app.title' : kind === 'paused' ? 'hud.pause' : kind === 'won' ? 'win.title' : 'lose.title';
    let titleGrad: CanvasGradient;
    let textGlow = 'rgba(59, 130, 246, 0.4)';
    
    if (kind === 'won') {
      textGlow = 'rgba(52, 211, 153, 0.4)';
      titleGrad = r.linearGradient(cx - 100, cardY + 24, cx + 100, cardY + 24, [
        { offset: 0, color: '#34d399' },
        { offset: 1, color: '#059669' }
      ]);
    } else if (kind === 'lost') {
      textGlow = 'rgba(248, 113, 113, 0.4)';
      titleGrad = r.linearGradient(cx - 100, cardY + 24, cx + 100, cardY + 24, [
        { offset: 0, color: '#f87171' },
        { offset: 1, color: '#dc2626' }
      ]);
    } else {
      titleGrad = r.linearGradient(cx - 120, cardY + 24, cx + 120, cardY + 24, [
        { offset: 0, color: '#60a5fa' },
        { offset: 0.5, color: '#a78bfa' },
        { offset: 1, color: '#f472b6' }
      ]);
    }
    
    r.setShadow(textGlow, 12, 0, 0);
    r.text(t(titleKey), cx, cardY + 22, titleGrad, 36, 'center', 'bold');
    r.clearShadow();
    
    // Draw specific details inside the card container
    if (kind === 'menu') {
      r.text(t('app.tagline'), cx, cardY + 70, '#94a3b8', 13, 'center');
    }
    
    if (kind === 'paused') {
      r.text(t('hud.paused_title'), cx, cardY + 75, '#94a3b8', 13, 'center');
    }
    
    if (kind === 'won') {
      // Glowing Victory Star Rating UI
      const starCount = stats?.stars ?? 0;
      const starY = cardY + 72;
      r.setShadow('rgba(251, 191, 36, 0.4)', 14, 0, 0);
      for (let i = 0; i < 3; i++) {
        const starX = cx - 40 + i * 40;
        const active = i < starCount;
        r.text(active ? '★' : '☆', starX, starY, active ? '#fbbf24' : '#334155', 28, 'center');
      }
      r.clearShadow();
      
      // Secondary statistics mini-panel
      const statsY = cardY + 115;
      r.roundRect(cardX + 24, statsY, cardW - 48, 64, 8, 'rgba(10, 15, 30, 0.6)', true, 'rgba(255, 255, 255, 0.03)', 1);
      r.text(`${t('hud.score')}: ${score}`, cx, statsY + 10, '#ffffff', 16, 'center', 'bold');
      
      let statDetail = '';
      if (stats?.kills) statDetail += `${t('win.kills')}: ${stats.kills}   |   `;
      if (stats?.gold) statDetail += `${t('win.gold')}: ${stats.gold}g`;
      r.text(statDetail, cx, statsY + 36, '#94a3b8', 12, 'center');
    }
    
    if (kind === 'lost') {
      const statsY = cardY + 72;
      r.roundRect(cardX + 24, statsY, cardW - 48, 72, 8, 'rgba(10, 15, 30, 0.6)', true, 'rgba(255, 255, 255, 0.03)', 1);
      r.text(`${t('hud.score')}: ${score}`, cx, statsY + 10, '#ffffff', 16, 'center', 'bold');
      if (stats?.wave) r.text(t('lose.survived').replace('{wave}', String(stats.wave)), cx, statsY + 32, '#f87171', 13, 'center', 'bold');
      if (stats?.kills) r.text(t('lose.kills').replace('{kills}', String(stats.kills)), cx, statsY + 50, '#94a3b8', 11, 'center');
      
      if (seed !== 0) {
        const seedHex = seed.toString(16).toUpperCase().padStart(8, '0');
        r.text(`${t('menu.endless')} SEED: ${seedHex}`, cx, cardY + 160, '#c084fc', 12, 'center');
        
        // Share Seed Button
        const shareY = cardY + 182;
        const shareW = 180;
        const shareX = cx - shareW / 2;
        const shareBtnGrad = r.linearGradient(shareX, shareY, shareX, shareY + 28, [
          { offset: 0, color: '#a855f7' },
          { offset: 1, color: '#7e22ce' }
        ]);
        r.roundRect(shareX, shareY, shareW, 28, 6, shareBtnGrad, true, 'rgba(255, 255, 255, 0.1)', 1);
        r.text(t('share.copy'), cx, shareY + 14, '#ffffff', 11, 'center', 'bold');
        this.regions.push({ x: shareX, y: shareY, w: shareW, h: 28, action: 'challenge' });
      }
    }
    
    // Draw modern styled action buttons
    const btnW = cardW - 48;
    const btnH = 38;
    const btnX = cx - btnW / 2;
    
    // Calculate button vertical layout starting Y coordinate
    let startButtonY = cardY + (isMenu ? 105 : (kind === 'lost' ? (seed !== 0 ? 220 : 160) : (kind === 'won' ? 195 : 170)));
    
    const labelKey = kind === 'menu' ? 'menu.start' : kind === 'paused' ? 'menu.resume' : (kind === 'won' ? 'menu.playAgain' : 'menu.retry');
    const primaryAction: MenuClickAction = kind === 'menu' ? 'start' : kind === 'paused' ? 'resume' : 'restart';
    
    // 1. Draw Primary Action Button
    const primGrad = r.linearGradient(btnX, startButtonY, btnX, startButtonY + btnH, [
      { offset: 0, color: '#3b82f6' },
      { offset: 1, color: '#1d4ed8' }
    ]);
    r.roundRect(btnX, startButtonY, btnW, btnH, 8, primGrad, true, 'rgba(255, 255, 255, 0.15)', 1);
    r.text(t(labelKey), cx, startButtonY + 19, '#ffffff', 14, 'center', 'bold');
    this.regions.push({ x: btnX, y: startButtonY, w: btnW, h: btnH, action: primaryAction });
    
    let currentY = startButtonY + btnH + 10;
    
    // 2. Draw Secondary Action Buttons
    if (isMenu) {
      // Endless Challenge
      const endlessGrad = r.linearGradient(btnX, currentY, btnX, currentY + btnH, [
        { offset: 0, color: '#8b5cf6' },
        { offset: 1, color: '#6d28d9' }
      ]);
      r.roundRect(btnX, currentY, btnW, btnH, 8, endlessGrad, true, 'rgba(255, 255, 255, 0.15)', 1);
      r.text(t('menu.endless'), cx, currentY + 19, '#ffffff', 13, 'center', 'bold');
      this.regions.push({ x: btnX, y: currentY, w: btnW, h: btnH, action: 'endless' });
      currentY += btnH + 10;
      
      // Shared Seed Challenge
      const challGrad = r.linearGradient(btnX, currentY, btnX, currentY + btnH, [
        { offset: 0, color: '#475569' },
        { offset: 1, color: '#334155' }
      ]);
      r.roundRect(btnX, currentY, btnW, btnH, 8, challGrad, true, 'rgba(255, 255, 255, 0.1)', 1);
      r.text(t('menu.challenge'), cx, currentY + 19, '#e2e8f0', 13, 'center', 'bold');
      this.regions.push({ x: btnX, y: currentY, w: btnW, h: btnH, action: 'challenge' });
      currentY += btnH + 10;
      
      // Daily Global Seed
      const dailyGrad = r.linearGradient(btnX, currentY, btnX, currentY + btnH, [
        { offset: 0, color: '#10b981' },
        { offset: 1, color: '#047857' }
      ]);
      r.roundRect(btnX, currentY, btnW, btnH, 8, dailyGrad, true, 'rgba(255, 255, 255, 0.15)', 1);
      r.text(t('menu.daily'), cx, currentY + 19, '#ffffff', 13, 'center', 'bold');
      this.regions.push({ x: btnX, y: currentY, w: btnW, h: btnH, action: 'daily' });
      currentY += btnH + 10;
      
      // Control shortcuts instructions
      r.text(t('menu.shortcuts'), cx, cardY + cardH - 24, '#64748b', 10, 'center');
    } else {
      // Exit to Menu
      const menuGrad = r.linearGradient(btnX, currentY, btnX, currentY + btnH, [
        { offset: 0, color: '#475569' },
        { offset: 1, color: '#1e293b' }
      ]);
      r.roundRect(btnX, currentY, btnW, btnH, 8, menuGrad, true, 'rgba(255, 255, 255, 0.1)', 1);
      r.text(t('hud.menu'), cx, currentY + 19, '#cbd5e1', 13, 'center', 'bold');
      this.regions.push({ x: btnX, y: currentY, w: btnW, h: btnH, action: 'menu' });
    }
  }

  hit(x: number, y: number): MenuClickAction {
    for (const b of this.regions) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.action;
    }
    return null;
  }
}
