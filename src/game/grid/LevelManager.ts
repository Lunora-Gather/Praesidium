// Level manager: owns a list of LevelDef, tracks current index, advances on win.
// Phase 2 ships 3 levels with distinct layouts.

import type { LevelDef } from './Level';
import { LEVEL_1, TileType } from './Level';

function makeTiles(cols: number, rows: number, pathCells: Array<[number, number]>): TileType[] {
  const t = new Array<TileType>(cols * rows).fill(TileType.Buildable);
  for (let x = 0; x < cols; x++) {
    t[x] = TileType.Blocked;
    t[(rows - 1) * cols + x] = TileType.Blocked;
  }
  for (let y = 0; y < rows; y++) {
    t[y * cols] = TileType.Blocked;
    t[y * cols + cols - 1] = TileType.Blocked;
  }
  for (const [x, y] of pathCells) {
    const i = y * cols + x;
    if (t[i] === TileType.Buildable || t[i] === TileType.Blocked) t[i] = TileType.Path;
  }
  return t;
}

function walkPath(points: Array<[number, number]>): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[i + 1];
    if (ax === bx) {
      for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) out.push([ax, y]);
    } else {
      for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) out.push([x, ay]);
    }
  }
  return out;
}

const COLS = 16;
const ROWS = 12;

const LEVEL_2: LevelDef = {
  name: 'Crossroads',
  cols: COLS,
  rows: ROWS,
  tiles: makeTiles(COLS, ROWS, walkPath([
    [1, 10], [1, 3], [4, 3], [4, 9], [7, 9], [7, 3], [10, 3], [10, 9], [13, 9], [13, 2],
  ])),
  waypoints: [
    { x: 1, y: 10 }, { x: 1, y: 3 }, { x: 4, y: 3 }, { x: 4, y: 9 },
    { x: 7, y: 9 }, { x: 7, y: 3 }, { x: 10, y: 3 }, { x: 10, y: 9 },
    { x: 13, y: 9 }, { x: 13, y: 2 },
  ],
};

const LEVEL_3: LevelDef = {
  name: 'The Gauntlet',
  cols: COLS,
  rows: ROWS,
  tiles: makeTiles(COLS, ROWS, walkPath([
    [2, 11], [2, 2], [5, 2], [5, 9], [8, 9], [8, 2], [11, 2], [11, 9], [13, 9], [13, 5],
  ])),
  waypoints: [
    { x: 2, y: 11 }, { x: 2, y: 2 }, { x: 5, y: 2 }, { x: 5, y: 9 },
    { x: 8, y: 9 }, { x: 8, y: 2 }, { x: 11, y: 2 }, { x: 11, y: 9 },
    { x: 13, y: 9 }, { x: 13, y: 5 },
  ],
};

function markSpawnGoal(def: LevelDef): void {
  const first = def.waypoints[0];
  const last = def.waypoints[def.waypoints.length - 1];
  def.tiles[first.y * def.cols + first.x] = TileType.Spawn;
  def.tiles[last.y * def.cols + last.x] = TileType.Goal;
}
markSpawnGoal(LEVEL_2);
markSpawnGoal(LEVEL_3);

export const LEVELS: LevelDef[] = [LEVEL_1, LEVEL_2, LEVEL_3];

export class LevelManager {
  private index = 0;

  get current(): LevelDef {
    return LEVELS[this.index];
  }

  levelAt(i: number): LevelDef {
    return LEVELS[i];
  }

  get levelNumber(): number {
    return this.index + 1;
  }

  get total(): number {
    return LEVELS.length;
  }

  get hasNext(): boolean {
    return this.index + 1 < LEVELS.length;
  }

  reset(): void {
    this.index = 0;
  }

  advance(): LevelDef | null {
    if (!this.hasNext) return null;
    this.index++;
    return this.current;
  }

  setLevel(i: number): void {
    this.index = Math.max(0, Math.min(LEVELS.length - 1, i));
  }
}
