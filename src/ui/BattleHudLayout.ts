import type { BattleBox } from './BattleLayout';

export const TOP_H = 52;
export const BOT_H = 62;

type Action = 'send' | 'pause' | 'speed' | 'autoSend' | 'brief';
export interface BattleHudLayout {
  topHeight: number;
  metrics: BattleBox[];
  controls: Array<BattleBox & { action: Action }>;
}

export function battleTopHeight(width: number): number { return width < 450 ? 84 : TOP_H; }

export function battleHudLayout(width: number, frame = { x: 8, w: width - 16 }): BattleHudLayout {
  const topHeight = battleTopHeight(width);
  const stacked = topHeight > TOP_H;
  const gap = frame.w < 540 ? 4 : 6;
  const controls: [Action, number][] = [
    ['send', stacked ? 86 : 116], ['pause', 44], ['speed', 44], ['autoSend', stacked ? 68 : 88], ['brief', stacked ? 44 : 58],
  ];
  const natural = controls.reduce((total, [, w]) => total + w, gap * (controls.length - 1));
  const actionW = Math.min(natural, stacked ? frame.w : frame.w - 156);
  const flex = Math.max(0, actionW - gap * (controls.length - 1) - controls.length * 44);
  const flexNatural = controls.reduce((total, [, w]) => total + w - 44, 0);
  const slot = stacked ? frame.w / 4 : Math.min(144, (frame.w - actionW - gap) / 4);
  let x = stacked ? frame.x + (frame.w - actionW) / 2 : frame.x + frame.w - actionW;
  return {
    topHeight,
    metrics: Array.from({ length: 4 }, (_, index) => ({ x: frame.x + slot * index, y: 0, w: slot, h: stacked ? 30 : TOP_H })),
    controls: controls.map(([action, preferred]) => {
      const w = 44 + (preferred - 44) * (flex / flexNatural);
      const region = { x, y: stacked ? 33 : 4, w, h: 44, action };
      x += w + gap;
      return region;
    }),
  };
}
