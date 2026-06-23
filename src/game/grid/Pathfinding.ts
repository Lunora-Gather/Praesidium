// A* pathfinding over the grid. Used for dynamic obstacle avoidance when
// towers block tiles (Phase 2). Phase 1 enemies walk fixed waypoints; this
// is wired in so future towers blocking the path re-route enemies live.

import type { Grid } from './Grid';
import { TileType } from './Level';
import { Vec2 } from '../../engine/math/Vec2';

interface Node {
  x: number;
  y: number;
  g: number; // cost from start
  f: number; // g + heuristic
  parent: Node | null;
}

export class Pathfinding {
  /** Returns tile-coord path from start to goal, or null if unreachable. */
  static findPath(grid: Grid, start: { x: number; y: number }, goal: { x: number; y: number }): Vec2[] | null {
    const key = (x: number, y: number): number => y * grid.cols + x;
    const open: Node[] = [];
    const closed = new Set<number>();
    const came = new Map<number, Node>();

    const startNode: Node = { x: start.x, y: start.y, g: 0, f: 0, parent: null };
    open.push(startNode);
    came.set(key(start.x, start.y), startNode);

    const h = (x: number, y: number): number => Math.abs(x - goal.x) + Math.abs(y - goal.y);

    while (open.length > 0) {
      // pop lowest f (linear scan is fine for small grids)
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
      const cur = open.splice(bi, 1)[0];
      const ck = key(cur.x, cur.y);
      if (closed.has(ck)) continue;
      closed.add(ck);

      if (cur.x === goal.x && cur.y === goal.y) {
        // reconstruct
        const path: Vec2[] = [];
        let n: Node | null = cur;
        while (n) {
          path.unshift(new Vec2(n.x, n.y));
          n = n.parent;
        }
        return path;
      }

      const neighbors = [
        { x: cur.x + 1, y: cur.y },
        { x: cur.x - 1, y: cur.y },
        { x: cur.x, y: cur.y + 1 },
        { x: cur.x, y: cur.y - 1 },
      ];
      for (const nb of neighbors) {
        const t = grid.at(nb.x, nb.y);
        if (t === TileType.Blocked) continue;
        // towers block tiles; only Path/Spawn/Goal walkable for enemies
        if (t === TileType.Buildable) continue;
        const nk = key(nb.x, nb.y);
        if (closed.has(nk)) continue;
        const ng = cur.g + 1;
        const existing = came.get(nk);
        if (!existing || ng < existing.g) {
          const node: Node = { x: nb.x, y: nb.y, g: ng, f: ng + h(nb.x, nb.y), parent: cur };
          came.set(nk, node);
          open.push(node);
        }
      }
    }
    return null;
  }
}
