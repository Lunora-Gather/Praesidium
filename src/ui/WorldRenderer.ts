// World renderer: grid, path, towers, enemies, projectiles, hover preview.
// Pure draw — mutates nothing in GameState.

import { Renderer } from '../engine/Renderer';
import { GameState } from '../game/GameState';
import { TileType } from '../game/grid/Level';
import { Vec2 } from '../engine/math/Vec2';
import { getTowerDef } from '../game/towers/TowerRegistry';

export class WorldRenderer {
  draw(r: Renderer, s: GameState): void {
    const g = s.grid;

    // center the grid horizontally in available space (between top bar and shop)
    const topBar = 48;
    const shopH = 64;
    const availW = r.width;
    const availH = r.height - topBar - shopH;
    r.camX = (availW - g.widthPx) / 2;
    r.camY = topBar + Math.max(0, (availH - g.heightPx) / 2);
    r.zoom = 1;

    // tiles
    for (let ty = 0; ty < g.rows; ty++) {
      for (let tx = 0; tx < g.cols; tx++) {
        const t = g.at(tx, ty);
        const px = tx * g.tile;
        const py = ty * g.tile;
        let color = '#162032';
        if (t === TileType.Buildable) color = '#1c2740';
        if (t === TileType.Path) color = '#3a2a1a';
        if (t === TileType.Blocked) color = '#0d1320';
        if (t === TileType.Spawn) color = '#1b5e20';
        if (t === TileType.Goal) color = '#b71c1c';
        r.rect(px, py, g.tile, g.tile, color, true);
        r.rect(px, py, g.tile, g.tile, '#0a0e14', false);
      }
    }

    // path polyline
    if (g.waypoints.length > 1) r.path(g.waypoints, '#5d4037', 3);

    // spawn / goal markers
    r.circle(g.waypoints[0], 8, '#388e3c');
    r.circle(g.waypoints[g.waypoints.length - 1], 8, '#d32f2f');

    // towers
    for (const t of s.towers) {
      r.circle(t.pos, t.def.radius, t.def.color);
      // barrel
      const barrelEnd = t.pos.add(Vec2.fromAngle(t.angle, t.def.radius + 10));
      r.line(t.pos, barrelEnd, '#e6e6e6', 3);
    }

    // enemies + hp bars
    for (const e of s.enemies) {
      r.circle(e.pos, e.radius, e.color);
      const barW = e.radius * 2;
      const barX = e.pos.x - e.radius;
      const barY = e.pos.y - e.radius - 6;
      r.rect(barX, barY, barW, 3, '#000', true);
      r.rect(barX, barY, barW * e.hpRatio, 3, '#4caf50', true);
    }

    // projectiles
    for (const p of s.projectiles) {
      r.circle(p.pos, 3, p.color);
    }

    // hover preview: range circle + placement validity tint
    if (s.hoverTile && s.selectedTowerId) {
      const def = getTowerDef(s.selectedTowerId);
      const center = g.tileCenter(s.hoverTile.tx, s.hoverTile.ty);
      const ok = g.isBuildable(s.hoverTile.tx, s.hoverTile.ty) &&
        !s.towers.some((t) => t.tx === s.hoverTile!.tx && t.ty === s.hoverTile!.ty) &&
        s.gold >= def.cost;
      r.circle(center, def.range, ok ? '#1f6feb44' : '#e5737344', true);
      r.circle(center, def.range, ok ? '#1f6feb' : '#e57373', false);
      r.rect(s.hoverTile.tx * g.tile, s.hoverTile.ty * g.tile, g.tile, g.tile, ok ? '#1f6feb55' : '#e5737355', true);
    }
  }
}
