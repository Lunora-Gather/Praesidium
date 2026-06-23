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
    r.rect(0, 0, r.width, r.height, '#0a0e14ee');
    const cx = r.width / 2;
    r.text('SETTINGS', cx, 80, '#8ab4f8', 36, 'center');

    const s = this.store.get();
    const langLabel = getLocale() === 'en' ? 'Language: English' : '语言：中文';
    const rows: Array<{ label: string; value: boolean; action: ClickAction }> = [
      { label: 'Sound', value: !s.muted, action: 'toggleMute' },
      { label: 'Show FPS', value: s.showFps, action: 'toggleFps' },
      { label: 'Show Tower Range', value: s.showRange, action: 'toggleRange' },
      { label: 'Pause on Blur', value: s.pauseOnBlur, action: 'togglePauseOnBlur' },
      { label: langLabel, value: getLocale() === 'zh', action: 'cycleLang' },
    ];

    const rowH = 56;
    const rowW = 320;
    const startX = cx - rowW / 2;
    let y = 160;
    for (const row of rows) {
      r.rect(startX, y, rowW, rowH, '#1f2937', true);
      r.text(row.label, startX + 16, y + 19, '#e6e6e6', 16);
      const toggleX = startX + rowW - 60;
      r.rect(toggleX, y + 16, 40, 24, row.value ? '#1f6feb' : '#374151', true);
      r.circle(
        new Vec2(row.value ? toggleX + 30 : toggleX + 10, y + 28),
        9,
        '#fff',
      );
      this.regions.push({ x: startX, y, w: rowW, h: rowH, action: row.action });
      y += rowH + 12;
    }

    const btnW = 200;
    const btnH = 44;
    const btnX = cx - btnW / 2;
    const btnY = y + 12;
    r.rect(btnX, btnY, btnW, btnH, '#374151', true);
    r.text('Back', cx, btnY + 13, '#fff', 16, 'center');
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
