// Grid + tile helpers + world-space waypoints derived from a LevelDef.

import { LevelDef, TileType } from './Level';
import { Vec2 } from '../../engine/math/Vec2';
import { BALANCE } from '../../config/balance';

export class Grid {
  readonly cols: number;
  readonly rows: number;
  readonly tile: number;
  readonly tiles: readonly TileType[];
  readonly waypoints: readonly Vec2[]; // pixel-space waypoints (tile centers)

  constructor(def: LevelDef, tile = BALANCE.tile) {
    this.cols = def.cols;
    this.rows = def.rows;
    this.tile = tile;
    this.tiles = def.tiles;
    this.waypoints = def.waypoints.map((w) => new Vec2(w.x * tile + tile / 2, w.y * tile + tile / 2));
  }

  get widthPx(): number {
    return this.cols * this.tile;
  }

  get heightPx(): number {
    return this.rows * this.tile;
  }

  at(x: number, y: number): TileType {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return TileType.Blocked;
    return this.tiles[y * this.cols + x];
  }

  isBuildable(x: number, y: number): boolean {
    return this.at(x, y) === TileType.Buildable;
  }

  /** Pixel position -> tile coords (floored). */
  pixelToTile(px: number, py: number): { tx: number; ty: number } {
    return { tx: Math.floor(px / this.tile), ty: Math.floor(py / this.tile) };
  }

  tileCenter(tx: number, ty: number): Vec2 {
    return new Vec2(tx * this.tile + this.tile / 2, ty * this.tile + this.tile / 2);
  }
}
