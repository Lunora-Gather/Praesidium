// Settings overlay: mute/FPS/range toggles + language switch. Persisted via SettingsStore.

import { Renderer } from '../engine/Renderer';
import { SettingsStore, Settings } from '../config/Settings';
import { Vec2 } from '../engine/math/Vec2';
import { getLocale, setLocale } from '../utils/i18n';

type ClickAction = 'back' | 'toggleMute' | 'toggleFps' | 'toggleRange' | 'togglePauseOnBlur' | 'cycleLang';

export class SettingsScreen {
  private regions: Array<{ x: number; y: number; w: number; h: number; action: ClickAction }> = [];

  constructor(private readonly store: SettingsStore) {}

  draw(r: Renderer): void {
    this.regions = [];
    
    // Dim background with overlay gradient
    const bgGrad = r.linearGradient(0, 0, 0, r.height, [
      { offset: 0, color: 'rgba(10, 14, 20, 0.8)' },
      { offset: 1, color: 'rgba(17, 24, 39, 0.9)' }
    ]);
    r.rect(0, 0, r.width, r.height, bgGrad);
    
    const cx = r.width / 2;
    const cy = r.height / 2;
    
    // Modal card container
    const cardW = Math.min(r.width - 32, 380);
    const cardH = 380;
    const cardX = cx - cardW / 2;
    const cardY = cy - cardH / 2;
    
    r.setShadow('rgba(59, 130, 246, 0.15)', 24, 0, 4);
    // Draw card
    r.roundRect(cardX, cardY, cardW, cardH, 16, 'rgba(15, 23, 42, 0.9)', true, 'rgba(255, 255, 255, 0.08)', 1.5);
    r.clearShadow();
    
    // Gradient header
    const titleGrad = r.linearGradient(cx - 80, cardY + 24, cx + 80, cardY + 24, [
      { offset: 0, color: '#60a5fa' },
      { offset: 1, color: '#3b82f6' }
    ]);
    r.text('SETTINGS', cx, cardY + 20, titleGrad, 24, 'center', 'bold');
    
    const s = this.store.get();
    const langLabel = getLocale() === 'en' ? 'Language: English' : '语言：中文';
    const rows: Array<{ label: string; value: boolean; action: ClickAction }> = [
      { label: 'Sound', value: !s.muted, action: 'toggleMute' },
      { label: 'Show FPS', value: s.showFps, action: 'toggleFps' },
      { label: 'Show Tower Range', value: s.showRange, action: 'toggleRange' },
      { label: 'Pause on Blur', value: s.pauseOnBlur, action: 'togglePauseOnBlur' },
      { label: langLabel, value: getLocale() === 'zh', action: 'cycleLang' },
    ];
    
    const rowH = 46;
    const rowW = cardW - 48;
    const startX = cx - rowW / 2;
    let y = cardY + 68;
    
    for (const row of rows) {
      // Row separator line
      r.line(new Vec2(startX, y + rowH), new Vec2(startX + rowW, y + rowH), 'rgba(255, 255, 255, 0.05)', 1);
      
      // Label text
      r.text(row.label, startX + 4, y + 14, '#e2e8f0', 14, 'left', 'bold');
      
      // Modern slide toggle switch
      const toggleW = 38;
      const toggleH = 20;
      const toggleX = startX + rowW - toggleW - 4;
      const toggleY = y + 12;
      
      // Toggle track background
      r.roundRect(toggleX, toggleY, toggleW, toggleH, 10, row.value ? '#10b981' : '#334155', true);
      
      // Toggle handle circular slider
      r.circle(
        new Vec2(row.value ? toggleX + toggleW - 10 : toggleX + 10, toggleY + 10),
        7,
        '#ffffff'
      );
      
      this.regions.push({ x: startX, y, w: rowW, h: rowH, action: row.action });
      y += rowH;
    }
    
    // Back button at the bottom of the settings card
    const btnW = cardW - 64;
    const btnH = 36;
    const btnX = cx - btnW / 2;
    const btnY = cardY + cardH - btnH - 20;
    
    const btnGrad = r.linearGradient(btnX, btnY, btnX, btnY + btnH, [
      { offset: 0, color: '#475569' },
      { offset: 1, color: '#1e293b' }
    ]);
    r.roundRect(btnX, btnY, btnW, btnH, 8, btnGrad, true, 'rgba(255, 255, 255, 0.08)', 1);
    r.text('Back', cx, btnY + 10, '#ffffff', 13, 'center', 'bold');
    
    this.regions.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: 'back' });
  }

  hit(x: number, y: number): ClickAction | null {
    for (const b of this.regions) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.action;
    }
    return null;
  }

  apply(action: ClickAction): 'close' | 'stay' {
    switch (action) {
      case 'back': return 'close';
      case 'toggleMute': this.store.update({ muted: !this.store.get().muted }); return 'stay';
      case 'toggleFps': this.store.toggle('showFps'); return 'stay';
      case 'toggleRange': this.store.toggle('showRange'); return 'stay';
      case 'togglePauseOnBlur': this.store.toggle('pauseOnBlur'); return 'stay';
      case 'cycleLang': setLocale(getLocale() === 'en' ? 'zh' : 'en'); return 'stay';
    }
  }

  get current(): Readonly<Settings> {
    return this.store.get();
  }
}
