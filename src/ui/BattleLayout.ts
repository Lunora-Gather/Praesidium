import { BOT_H, battleTopHeight } from './BattleHudLayout';

export interface BattleLayout {
  camera: { x: number; y: number; zoom: number };
  tools: { x: number; y: number; width: number; height: number; dx: number; dy: number };
  shopRight: number;
  infoHeight: number;
  topHeight: number;
}

const TOOL_COUNT = 4;
const GAP = 6;

export function battleLayout(viewWidth: number, viewHeight: number, mapWidth: number, mapHeight: number): BattleLayout {
  const margin = viewWidth < 760 ? 8 : 12;
  const width = viewWidth < 400 ? 52 : 58;
  const stripWidth = TOOL_COUNT * width + (TOOL_COUNT - 1) * GAP;
  const infoHeight = viewWidth >= 1040 ? 64 : 30;
  const topHeight = battleTopHeight(viewWidth);
  const top = topHeight + infoHeight;
  const shopY = viewHeight - BOT_H;

  const inShop = viewWidth >= 1040;
  const sideHeight = Math.floor((shopY - top - (TOOL_COUNT - 1) * GAP - margin) / TOOL_COUNT);
  const onSide = !inShop && viewWidth >= 540 && sideHeight >= 34;
  const height = onSide ? Math.min(44, sideHeight) : 44;
  const stripHeight = TOOL_COUNT * height + (TOOL_COUNT - 1) * GAP;
  const aboveShop = !inShop && !onSide;
  const tools = {
    x: viewWidth - margin - (onSide ? width : stripWidth),
    y: onSide ? (top + shopY - stripHeight) / 2
      : inShop ? shopY + (BOT_H - height) / 2
      : shopY - margin - height,
    width, height,
    dx: onSide ? 0 : width + GAP,
    dy: onSide ? height + GAP : 0,
  };
  const mapRight = onSide ? tools.x - margin : viewWidth - margin;
  const mapBottom = aboveShop ? tools.y - margin : shopY - margin;
  const availableWidth = Math.max(1, mapRight - margin);
  const availableHeight = Math.max(1, mapBottom - top);
  const zoom = Math.min(1, availableWidth / mapWidth, availableHeight / mapHeight);
  return {
    camera: {
      x: margin + (availableWidth - mapWidth * zoom) / 2,
      y: top + (availableHeight - mapHeight * zoom) / 2,
      zoom,
    },
    tools,
    shopRight: inShop ? tools.x - margin : viewWidth,
    infoHeight, topHeight,
  };
}
