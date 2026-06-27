// Shared layout tokens and helpers for Canvas UI.
// The goal is visual consistency across HUD, menus, level select, and panels.

import type { Renderer } from '../engine/Renderer';

export type LayoutMode = 'compact' | 'phone' | 'tablet' | 'desktop' | 'wide';

export interface UILayout {
  mode: LayoutMode;
  isCompact: boolean;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  safe: number;
  gap: number;
  radius: number;
  panelW: number;
  panelMaxW: number;
  buttonH: number;
  cardGap: number;
  minTap: number;
}

export const UI = {
  color: {
    bg0: '#020617',
    bg1: '#0f172a',
    panel: 'rgba(15, 23, 42, 0.9)',
    panelSoft: 'rgba(15, 23, 42, 0.72)',
    stroke: 'rgba(148, 163, 184, 0.14)',
    strokeStrong: 'rgba(96, 165, 250, 0.32)',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    textDim: '#64748b',
    blue: '#3b82f6',
    cyan: '#67e8f9',
    green: '#10b981',
    gold: '#fbbf24',
    red: '#ef4444',
    violet: '#8b5cf6',
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
  },
};

export function layoutFor(r: Renderer): UILayout {
  const minSide = Math.min(r.width, r.height);
  const compact = r.height < 620 || r.width < 430;
  const mode: LayoutMode = r.width >= 1280 ? 'wide'
    : r.width >= 960 ? 'desktop'
      : r.width >= 760 ? 'tablet'
        : r.width >= 560 ? 'phone'
          : 'compact';
  const isPhone = mode === 'phone' || mode === 'compact';
  const safe = mode === 'compact' ? 8 : isPhone ? 12 : 18;
  const gap = mode === 'compact' ? 6 : isPhone ? 8 : 12;
  return {
    mode,
    isCompact: compact || mode === 'compact',
    isPhone,
    isTablet: mode === 'tablet',
    isDesktop: mode === 'desktop' || mode === 'wide',
    safe,
    gap,
    radius: isPhone ? UI.radius.md : UI.radius.lg,
    panelW: Math.min(r.width - safe * 2, isPhone ? 420 : 560),
    panelMaxW: Math.min(r.width - safe * 2, mode === 'wide' ? 720 : 560),
    buttonH: isPhone ? 36 : 40,
    cardGap: gap + 2,
    minTap: Math.min(48, Math.max(38, Math.floor(minSide * 0.11))),
  };
}

export function clampPanel(x: number, y: number, w: number, h: number, r: Renderer, safe = 12): { x: number; y: number } {
  return {
    x: Math.max(safe, Math.min(r.width - w - safe, x)),
    y: Math.max(safe, Math.min(r.height - h - safe, y)),
  };
}

export function cardColumns(r: Renderer, itemCount: number, preferredW: number, minW: number, safe: number, gap: number): number {
  const maxColsByWidth = Math.max(1, Math.floor((r.width - safe * 2 + gap) / (minW + gap)));
  const preferredCols = Math.max(1, Math.floor((r.width - safe * 2 + gap) / (preferredW + gap)));
  return Math.max(1, Math.min(itemCount, maxColsByWidth, Math.max(1, preferredCols)));
}

export function drawGlassPanel(r: Renderer, x: number, y: number, w: number, h: number, radius: number, accent = UI.color.blue, alpha = 0.9): void {
  const fill = r.linearGradient(x, y, x, y + h, [
    { offset: 0, color: `rgba(15, 23, 42, ${alpha})` },
    { offset: 0.62, color: `rgba(8, 13, 28, ${Math.min(0.98, alpha + 0.04)})` },
    { offset: 1, color: `rgba(2, 6, 23, ${Math.min(0.98, alpha + 0.06)})` },
  ]);
  r.setShadow(`${accent}26`, 22, 0, 6);
  r.roundRect(x, y, w, h, radius, fill, true, UI.color.stroke, 1.2);
  r.clearShadow();
}

export function drawSectionTitle(r: Renderer, text: string, x: number, y: number, color = UI.color.text): void {
  r.text(text, x, y, color, 12, 'left', 'bold', 'top', 'header');
}
