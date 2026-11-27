import type { Grid } from '../game/grid/Grid';
import { TileType } from '../game/grid/Level';
import { BOT_H, battleTopHeight } from './BattleHudLayout';

export interface BattleBox { x: number; y: number; w: number; h: number }

export interface BattleLayout {
  camera: { x: number; y: number; zoom: number };
  field: BattleBox;
  board: BattleBox;
  tiles: BattleBox;
  info: BattleBox;
  shop: BattleBox;
  detail: BattleBox & { vertical: boolean; compact?: boolean };
  tools: BattleBox[];
}

const GAP = 6;
const TOOL_SIZE = 44;

export function battleLayout(width: number, height: number, grid: Grid): BattleLayout {
  // Trim fully blocked outer rows and columns, including on maps with an entrance on the edge.
  let left = grid.cols, top = grid.rows, right = 0, bottom = 0;
  for (let y = 0; y < grid.rows; y++) for (let x = 0; x < grid.cols; x++) {
    if (grid.at(x, y) === TileType.Blocked) continue;
    left = Math.min(left, x); top = Math.min(top, y);
    right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
  }
  const tiles = { x: left, y: top, w: right - left, h: bottom - top };
  const mapWidth = tiles.w * grid.tile;
  const mapHeight = tiles.h * grid.tile;
  const margin = width >= 760 ? Math.min(32, Math.round(width * .024)) : 8;
  const frameWidth = width - margin * 2;
  const topHeight = battleTopHeight(width);
  const infoHeight = height < 430 ? 36 : 50;
  const fieldTop = topHeight + infoHeight + 8;
  const shopY = height - BOT_H;
  const fieldHeight = Math.max(1, shopY - fieldTop - 8);
  const side = (width >= 450 && width > height && fieldHeight >= 138) || (width >= 650 && fieldHeight >= 392);
  const split = side && fieldHeight < 392;
  const rightWidth = side ? split ? 108 : 158 : 0;
  const leftWidth = split ? 116 : 0;
  const sideGap = side ? 12 : 0;
  const compactDetail = !side && fieldHeight < 280;
  const detailHeight = compactDetail ? 0 : 72;
  const bottomReserved = side ? 0 : detailHeight + TOOL_SIZE + GAP * (compactDetail ? 1 : 2);
  const maxZoom = side && !split ? 1.45 : 1;
  const mapLeft = margin + leftWidth + (split ? sideGap : 0);
  const mapRight = width - margin - rightWidth - sideGap;
  const zoom = Math.min(maxZoom, Math.max(1, mapRight - mapLeft) / mapWidth,
    Math.max(1, fieldHeight - bottomReserved) / mapHeight);
  const boardW = mapWidth * zoom;
  const boardH = mapHeight * zoom;
  const boardX = Math.max(mapLeft, Math.min((width - boardW) / 2, mapRight - boardW));
  const boardY = fieldTop + (Math.max(1, fieldHeight - bottomReserved) - boardH) / 2;
  const board = { x: boardX, y: boardY, w: boardW, h: boardH };
  const field = { x: margin, y: 0, w: frameWidth, h: height };
  const shop = { x: margin, y: shopY + 5, w: frameWidth, h: BOT_H - 10 };
  const info = { x: margin, y: topHeight, w: frameWidth, h: infoHeight };

  const toolX = side ? width - margin - rightWidth : margin;
  const twoColumns = split && fieldHeight < 194;
  const toolColumns = side ? twoColumns ? 2 : 1 : 4;
  const toolWidth = side ? (rightWidth - (toolColumns - 1) * GAP) / toolColumns : (frameWidth - GAP * 3) / 4;
  const toolHeight = side ? Math.floor(4 / toolColumns) * (TOOL_SIZE + GAP) - GAP : TOOL_SIZE;
  const toolY = side ? split ? fieldTop + (fieldHeight - toolHeight) / 2 : fieldTop : shopY - TOOL_SIZE - GAP;
  const tools = Array.from({ length: 4 }, (_, i) => ({
    x: toolX + i % toolColumns * (toolWidth + GAP), y: toolY + Math.floor(i / toolColumns) * (TOOL_SIZE + GAP),
    w: toolWidth, h: TOOL_SIZE,
  }));
  const detail = split ? { x: margin, y: fieldTop, w: leftWidth, h: fieldHeight, vertical: true }
    : side ? { x: toolX, y: toolY + toolHeight + 12, w: rightWidth, h: fieldHeight - toolHeight - 12, vertical: true }
      : compactDetail ? { x: margin, y: toolY, w: frameWidth - toolWidth - GAP, h: TOOL_SIZE, vertical: false, compact: true }
      : { x: margin, y: toolY - detailHeight - GAP, w: frameWidth, h: detailHeight, vertical: false };

  return { camera: { x: boardX - tiles.x * grid.tile * zoom, y: boardY - tiles.y * grid.tile * zoom, zoom }, field, board, tiles, info, shop, detail, tools };
}
