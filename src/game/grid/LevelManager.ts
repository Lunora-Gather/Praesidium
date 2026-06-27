// Level manager: owns a list of LevelDef, tracks current index, advances on win.
// Campaign content is intentionally data-driven so new levels can be added without touching game flow.

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

// Level 4: Long spiral — maximizes path length for sustained DPS
const LEVEL_4: LevelDef = {
  name: 'Vortex',
  cols: COLS,
  rows: ROWS,
  tiles: makeTiles(COLS, ROWS, walkPath([
    [1, 10], [1, 1], [14, 1], [14, 10], [3, 10], [3, 3], [12, 3], [12, 8], [5, 8], [5, 5], [10, 5], [10, 7],
  ])),
  waypoints: [
    { x: 1, y: 10 }, { x: 1, y: 1 }, { x: 14, y: 1 }, { x: 14, y: 10 },
    { x: 3, y: 10 }, { x: 3, y: 3 }, { x: 12, y: 3 }, { x: 12, y: 8 },
    { x: 5, y: 8 }, { x: 5, y: 5 }, { x: 10, y: 5 }, { x: 10, y: 7 },
  ],
};

// Level 5: Split decision — two parallel lanes converging
const LEVEL_5: LevelDef = {
  name: 'Convergence',
  cols: COLS,
  rows: ROWS,
  tiles: makeTiles(COLS, ROWS, walkPath([
    [1, 2], [6, 2], [6, 5], [8, 5], [8, 2], [14, 2], [14, 6], [10, 6], [10, 9], [5, 9], [5, 6], [1, 6],
  ])),
  waypoints: [
    { x: 1, y: 2 }, { x: 6, y: 2 }, { x: 6, y: 5 }, { x: 8, y: 5 },
    { x: 8, y: 2 }, { x: 14, y: 2 }, { x: 14, y: 6 }, { x: 10, y: 6 },
    { x: 10, y: 9 }, { x: 5, y: 9 }, { x: 5, y: 6 }, { x: 1, y: 6 },
  ],
};

// Level 6: Zigzag extreme — tight turns test targeting strategy
const LEVEL_6: LevelDef = {
  name: 'Labyrinth',
  cols: COLS,
  rows: ROWS,
  tiles: makeTiles(COLS, ROWS, walkPath([
    [1, 10], [3, 10], [3, 2], [5, 2], [5, 10], [7, 10], [7, 2], [9, 2], [9, 10], [11, 10], [11, 2], [13, 2], [13, 6],
  ])),
  waypoints: [
    { x: 1, y: 10 }, { x: 3, y: 10 }, { x: 3, y: 2 }, { x: 5, y: 2 },
    { x: 5, y: 10 }, { x: 7, y: 10 }, { x: 7, y: 2 }, { x: 9, y: 2 },
    { x: 9, y: 10 }, { x: 11, y: 10 }, { x: 11, y: 2 }, { x: 13, y: 2 },
    { x: 13, y: 6 },
  ],
};

// Level 7: Relay Array — wide switchbacks reward slow/control and area coverage
const LEVEL_7: LevelDef = {
  name: 'Relay Array',
  cols: COLS,
  rows: ROWS,
  tiles: makeTiles(COLS, ROWS, walkPath([
    [1, 9], [4, 9], [4, 2], [2, 2], [2, 5], [7, 5], [7, 1], [12, 1], [12, 4], [9, 4], [9, 8], [14, 8], [14, 3],
  ])),
  waypoints: [
    { x: 1, y: 9 }, { x: 4, y: 9 }, { x: 4, y: 2 }, { x: 2, y: 2 },
    { x: 2, y: 5 }, { x: 7, y: 5 }, { x: 7, y: 1 }, { x: 12, y: 1 },
    { x: 12, y: 4 }, { x: 9, y: 4 }, { x: 9, y: 8 }, { x: 14, y: 8 }, { x: 14, y: 3 },
  ],
};

// Level 8: Blackout Ridge — late split-pressure lane with limited central build windows
const LEVEL_8: LevelDef = {
  name: 'Blackout Ridge',
  cols: COLS,
  rows: ROWS,
  tiles: makeTiles(COLS, ROWS, walkPath([
    [1, 3], [5, 3], [5, 9], [3, 9], [3, 6], [8, 6], [8, 2], [13, 2], [13, 10], [10, 10], [10, 5], [14, 5],
  ])),
  waypoints: [
    { x: 1, y: 3 }, { x: 5, y: 3 }, { x: 5, y: 9 }, { x: 3, y: 9 },
    { x: 3, y: 6 }, { x: 8, y: 6 }, { x: 8, y: 2 }, { x: 13, y: 2 },
    { x: 13, y: 10 }, { x: 10, y: 10 }, { x: 10, y: 5 }, { x: 14, y: 5 },
  ],
};

// Level 9: Overdrive Gate — speed pressure and boss-preparation coverage check
const LEVEL_9: LevelDef = {
  name: 'Overdrive Gate',
  cols: COLS,
  rows: ROWS,
  tiles: makeTiles(COLS, ROWS, walkPath([
    [1, 10], [6, 10], [6, 7], [2, 7], [2, 2], [8, 2], [8, 5], [13, 5], [13, 9], [10, 9], [10, 3], [14, 3],
  ])),
  waypoints: [
    { x: 1, y: 10 }, { x: 6, y: 10 }, { x: 6, y: 7 }, { x: 2, y: 7 },
    { x: 2, y: 2 }, { x: 8, y: 2 }, { x: 8, y: 5 }, { x: 13, y: 5 },
    { x: 13, y: 9 }, { x: 10, y: 9 }, { x: 10, y: 3 }, { x: 14, y: 3 },
  ],
};

// Level 10: Apex Bastion — final campaign gate with long-range and boss pressure
const LEVEL_10: LevelDef = {
  name: 'Apex Bastion',
  cols: COLS,
  rows: ROWS,
  tiles: makeTiles(COLS, ROWS, walkPath([
    [1, 6], [4, 6], [4, 2], [12, 2], [12, 10], [3, 10], [3, 4], [8, 4], [8, 8], [14, 8], [14, 5],
  ])),
  waypoints: [
    { x: 1, y: 6 }, { x: 4, y: 6 }, { x: 4, y: 2 }, { x: 12, y: 2 },
    { x: 12, y: 10 }, { x: 3, y: 10 }, { x: 3, y: 4 }, { x: 8, y: 4 },
    { x: 8, y: 8 }, { x: 14, y: 8 }, { x: 14, y: 5 },
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
markSpawnGoal(LEVEL_4);
markSpawnGoal(LEVEL_5);
markSpawnGoal(LEVEL_6);
markSpawnGoal(LEVEL_7);
markSpawnGoal(LEVEL_8);
markSpawnGoal(LEVEL_9);
markSpawnGoal(LEVEL_10);

export const LEVELS: LevelDef[] = [LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, LEVEL_5, LEVEL_6, LEVEL_7, LEVEL_8, LEVEL_9, LEVEL_10];

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
