// Settings overlay: mute/FPS/range toggles + language switch. Persisted via SettingsStore.

import { Renderer } from '../engine/Renderer';
import { SettingsStore, Settings } from '../config/Settings';
import { Vec2 } from '../engine/math/Vec2';
import { getLocale, setLocale, t } from '../utils/i18n';
import { drawGlassPanel, layoutFor, UI } from './Layout';

type ClickAction = 'back' | 'toggleMute' | 'toggleFps' | 'toggleRange' | 'togglePauseOnBlur' | 'cycleLang';

export class SettingsScreen {
  private regions: Array<{ x: number; y: number; w: number; h: number; action: ClickAction }> = [];

  constructor(private readonly store: SettingsStore) {}

  draw(r: Renderer): void {
    this.regions = [];
    const layout = layoutFor(r);

    const bgGrad = r.linearGradient(0, 0, 0, r.height, [
      { offset: 0, color: 'rgba(10, 14, 20, 0.8)' },
      { offset: 1, color: 'rgba(17, 24, 39, 0.9)' }
    ]);
    r.rect(0, 0, r.width, r.height, bgGrad);

    const cx = r.width / 2;
    const cy = r.height / 2;
    const compact = layout.isCompact;
    const cardW = Math.min(layout.panelW, 420);
    const cardH = Math.min(compact ? 340 : 380, r.height - layout.safe * 2);
    const cardX = cx - cardW / 2;
    const cardY = cy - cardH / 2;

    drawGlassPanel(r, cardX, cardY, cardW, cardH, layout.radius, UI.color.blue, 0.9);

    const titleGrad = r.linearGradient(cx - 80, cardY + 24, cx + 80, cardY + 24, [
      { offset: 0, color: '#60a5fa' },
      { offset: 1, color: '#3b82f6' }
    ]);
    r.text(t('settings.title'), cx, cardY + (compact ? 16 : 20), titleGrad, compact ? 22 : 24, 'center', 'bold', 'top', 'header');

    const s = this.store.get();
    const langLabel = getLocale() === 'en' ? t('settings.language.en') : t('settings.language.zh');
    const rows: Array<{ label: string; value: boolean; action: ClickAction }> = [
      { label: t('settings.sound'), value: !s.muted, action: 'toggleMute' },
      { label: t('settings.fps'), value: s.showFps, action: 'toggleFps' },
      { label: t('settings.range'), value: s.showRange, action: 'toggleRange' },
      { label: t('settings.blur'), value: s.pauseOnBlur, action: 'togglePauseOnBlur' },
      { label: langLabel, value: getLocale() === 'zh', action: 'cycleLang' },
    ];

    const rowH = compact ? 40 : 46;
    const rowW = cardW - layout.safe * 2 - 12;
    const startX = cx - rowW / 2;
    let y = cardY + (compact ? 58 : 68);

    for (const row of rows) {
      r.roundRect(startX, y + 3, rowW, rowH - 6, 10, 'rgba(2, 6, 23, 0.22)', true, 'rgba(148, 163, 184, 0.06)', 1);
      r.line(new Vec2(startX + 12, y + rowH), new Vec2(startX + rowW - 12, y + rowH), 'rgba(255, 255, 255, 0.04)', 1);
      r.text(row.label, startX + 14, y + rowH / 2, UI.color.text, compact ? 12.5 : 14, 'left', 'bold', 'middle');

      const toggleW = 40;
      const toggleH = 22;
      const toggleX = startX + rowW - toggleW - 12;
      const toggleY = y + (rowH - toggleH) / 2;

      r.roundRect(toggleX, toggleY, toggleW, toggleH, 11, row.value ? UI.color.green : '#334155', true);
      r.circle(
        new Vec2(row.value ? toggleX + toggleW - 11 : toggleX + 11, toggleY + 11),
        7,
        '#ffffff'
      );

      this.regions.push({ x: startX, y, w: rowW, h: rowH, action: row.action });
      y += rowH;
    }

    const btnW = cardW - 64;
    const btnH = layout.buttonH - 2;
    const btnX = cx - btnW / 2;
    const btnY = cardY + cardH - btnH - (compact ? 14 : 20);

    const btnGrad = r.linearGradient(btnX, btnY, btnX, btnY + btnH, [
      { offset: 0, color: '#475569' },
      { offset: 1, color: '#1e293b' }
    ]);
    r.roundRect(btnX, btnY, btnW, btnH, 9, btnGrad, true, 'rgba(255, 255, 255, 0.08)', 1);
    r.text(t('common.back'), cx, btnY + btnH / 2, '#ffffff', 13, 'center', 'bold', 'middle');

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
