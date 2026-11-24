export const TOP_H = 52;
export const BOT_H = 72;

type Action = 'send' | 'pause' | 'speed' | 'autoSend' | 'brief' | 'menu' | 'stats' | 'settings' | 'codex' | 'talent';
interface Box { x: number; y: number; w: number; h: number }
export interface BattleHudLayout {
  topHeight: number;
  metrics: Box[];
  controls: Array<Box & { action: Action }>;
}

export function battleTopHeight(width: number): number { return width < 490 ? 84 : TOP_H; }

// Use one geometry for drawing, tapping and calculating the playable map bounds.
export function battleHudLayout(width: number): BattleHudLayout {
  const topHeight = battleTopHeight(width);
  const stacked = topHeight > TOP_H;
  const wide = width >= 1080;
  const pad = wide ? 16 : 8;
  const gap = width < 560 ? 4 : 6;
  const controls: [Action, number][] = [
    ['send', wide ? 94 : 64], ['pause', wide ? 62 : 44], ['speed', 44], ['autoSend', wide ? 65 : 46], ['brief', wide ? 56 : 44],
  ];
  if (wide) controls.push(['menu', 58], ['stats', 54], ['settings', 58], ['codex', 54], ['talent', 56]);
  const natural = controls.reduce((total, [, w]) => total + w, gap * (controls.length - 1));
  const actionW = Math.min(width - 2 * pad, natural);
  const metricsW = stacked ? width - 2 * pad : width - 2 * pad - actionW - gap;
  const slot = metricsW / 4;
  let x = stacked ? (width - actionW) / 2 : width - pad - actionW;
  const fit = (actionW - gap * (controls.length - 1)) / (natural - gap * (controls.length - 1));
  const y = stacked ? 33 : 4;
  return {
    topHeight,
    metrics: Array.from({ length: 4 }, (_, index) => ({ x: pad + slot * index, y: 1, w: slot, h: stacked ? 30 : TOP_H - 2 })),
    controls: controls.map(([action, preferred]) => {
      const w = preferred * fit;
      const region = { x, y, w, h: 44, action };
      x += w + gap;
      return region;
    }),
  };
}
