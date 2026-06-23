// Grid tile types and the map layout. Phase 1 ships one level; the data
// shape is generic so more levels can be added without touching code.

export const enum TileType {
  Buildable = 0,
  Path = 1,
  Blocked = 2,
  Spawn = 3,
  Goal = 4,
}

export interface LevelDef {
  name: string;
  cols: number;
  rows: number;
  // row-major, length === cols*rows
  tiles: TileType[];
  // ordered list of path waypoints (in tile coords); enemies follow these.
  waypoints: Array<{ x: number; y: number }>;
}

// 16x12 level with a winding path. Buildable cells surround the path.
const COLS = 16;
const ROWS = 12;

function makeTiles(): TileType[] {
  const t = new Array<TileType>(COLS * ROWS).fill(TileType.Buildable);
  // border blocked
  for (let x = 0; x < COLS; x++) {
    t[idx(x, 0)] = TileType.Blocked;
    t[idx(x, ROWS - 1)] = TileType.Blocked;
  }
  for (let y = 0; y < ROWS; y++) {
    t[idx(0, y)] = TileType.Blocked;
    t[idx(COLS - 1, y)] = TileType.Blocked;
  }
  // carve a serpentine path
  const pathCells: Array<[number, number]> = [];
  const segments: Array<[number, number]> = [
    [1, 10],
    [1, 2],
    [6, 2],
    [6, 8],
    [11, 8],
    [11, 3],
    [14, 3],
  ];
  for (let i = 0; i < segments.length - 1; i++) {
    const [ax, ay] = segments[i];
    const [bx, by] = segments[i + 1];
    if (ax === bx) {
      for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) pathCells.push([ax, y]);
    } else {
      for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) pathCells.push([x, ay]);
    }
  }
  for (const [x, y] of pathCells) {
    if (t[idx(x, y)] === TileType.Buildable || t[idx(x, y)] === TileType.Blocked) {
      t[idx(x, y)] = TileType.Path;
    }
  }
  t[idx(1, 10)] = TileType.Spawn;
  t[idx(14, 3)] = TileType.Goal;
  return t;
}

function idx(x: number, y: number): number {
  return y * COLS + x;
}

export const LEVEL_1: LevelDef = {
  name: 'Outpost Alpha',
  cols: COLS,
  rows: ROWS,
  tiles: makeTiles(),
  waypoints: [
    { x: 1, y: 10 },
    { x: 1, y: 2 },
    { x: 6, y: 2 },
    { x: 6, y: 8 },
    { x: 11, y: 8 },
    { x: 11, y: 3 },
    { x: 14, y: 3 },
  ],
};
