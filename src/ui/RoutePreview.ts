import { TileType, type LevelDef } from '../game/grid/Level';
import type { LevelTheme } from './LevelThemes';
import { drawRouteMarker } from './RouteMarkers';

export function drawRouteMap(canvas: HTMLCanvasElement, level: LevelDef, theme: LevelTheme): void {
  const cell = 30;
  canvas.width = level.cols * cell;
  canvas.height = level.rows * cell;
  const ctx = canvas.getContext('2d')!;
  const { width, height } = canvas;
  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, theme.buildable);
  background.addColorStop(1, theme.background);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  for (let y = 0; y < level.rows; y++) {
    for (let x = 0; x < level.cols; x++) {
      const kind = level.tiles[y * level.cols + x];
      if (kind === TileType.Blocked) continue;
      ctx.fillStyle = kind === TileType.Buildable ? '#b3d4fa1a' : `${theme.pathGlow}27`;
      ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
      if (kind === TileType.Buildable) {
        ctx.fillStyle = '#bddbfc40';
        ctx.fillRect(x * cell + cell / 2 - 1, y * cell + cell / 2 - 1, 2, 2);
      }
    }
  }

  const path = level.waypoints.map(({ x, y }) => ({ x: (x + .5) * cell, y: (y + .5) * cell }));
  ctx.beginPath();
  ctx.lineJoin = ctx.lineCap = 'round';
  ctx.moveTo(path[0].x, path[0].y);
  for (const point of path.slice(1)) ctx.lineTo(point.x, point.y);
  ctx.strokeStyle = `${theme.pathGlow}26`;
  ctx.lineWidth = 22;
  ctx.stroke();
  ctx.strokeStyle = `${theme.pathGlow}99`;
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.strokeStyle = theme.pathCore;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = theme.pathCore;
  for (let i = 1; i < path.length; i++) {
    const from = path[i - 1];
    const to = path[i];
    if (Math.hypot(to.x - from.x, to.y - from.y) < cell * 3) continue;
    ctx.save();
    ctx.translate((from.x + to.x) / 2, (from.y + to.y) / 2);
    ctx.rotate(Math.atan2(to.y - from.y, to.x - from.x));
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(-3, -4);
    ctx.lineTo(-3, 4);
    ctx.fill();
    ctx.restore();
  }

  const origin = path[0];
  const goal = path[path.length - 1];
  drawRouteMarker(ctx, origin.x, origin.y, 7, theme.pathCore, theme.background);
  drawRouteMarker(ctx, goal.x, goal.y, 7.5, theme.pathCore, theme.background, true);
}
