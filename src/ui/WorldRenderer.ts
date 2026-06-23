// World renderer: grid, path, towers, enemies, projectiles, hover preview.
// Pure draw — mutates nothing in GameState.
// Static layer (tiles + path + spawn/goal markers) is cached to an offscreen
// canvas; only the dynamic layer (towers/enemies/projectiles/hover) is redrawn
// per frame. Cache is invalidated when the level changes.

import { Renderer } from '../engine/Renderer';
import { GameState } from '../game/GameState';
import { TileType } from '../game/grid/Level';
import { Vec2 } from '../engine/math/Vec2';
import { getTowerDef } from '../game/towers/TowerRegistry';
import type { Settings } from '../config/Settings';

export class WorldRenderer {
  private staticCanvas: HTMLCanvasElement | null = null;
  private staticCtx: CanvasRenderingContext2D | null = null;
  private cacheKey = ''; // identifies which level is cached

  draw(r: Renderer, s: GameState, settings: Readonly<Settings>): void {
    const g = s.grid;

    // center the grid horizontally in available space (between top bar and shop)
    const topBar = 48;
    const shopH = 64;
    const availW = r.width;
    const availH = r.height - topBar - shopH;
    r.camX = (availW - g.widthPx) / 2;
    r.camY = topBar + Math.max(0, (availH - g.heightPx) / 2);
    r.zoom = 1;

    // cache key = level dimensions + tile size + waypoint signature.
    // waypoints array identity changes per Grid construction, so hash coords.
    const key = `${g.cols}x${g.rows}x${g.tile}|${g.waypoints.map((w) => `${w.x.toFixed(0)},${w.y.toFixed(0)}`).join(';')}`;
    if (key !== this.cacheKey || !this.staticCanvas) {
      this.renderStatic(g);
      this.cacheKey = key;
    }

    // blit cached static layer (already in world space; draw through identity cam)
    if (this.staticCanvas) {
      const ctx = r.ctx;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.staticCanvas, r.camX, r.camY);
      ctx.restore();
    }

    // selected tower: range ring + level pips
    if (settings.showRange && s.selectedTower) {
      r.circle(s.selectedTower.pos, s.selectedTower.range, '#1f6feb33', true);
      r.circle(s.selectedTower.pos, s.selectedTower.range, '#1f6feb', false);
    }

    // towers
    for (const t of s.towers) {
      r.circle(t.pos, t.def.radius, t.def.color);
      const barrelEnd = t.pos.add(Vec2.fromAngle(t.angle, t.def.radius + 10));
      r.line(t.pos, barrelEnd, '#e6e6e6', 3);
      // level pips above tower
      for (let i = 0; i < t.level - 1; i++) {
        r.circle(new Vec2(t.pos.x - 6 + i * 5, t.pos.y - t.def.radius - 6), 2, '#ffd54f');
      }
    }

    // enemies + hp bars + slow tint + boss health bar
    for (const e of s.enemies) {
      r.circle(e.pos, e.radius, e.color);
      if (e.isSlowed) r.circle(e.pos, e.radius + 2, '#80deea', false);
      const barW = e.radius * 2;
      const barX = e.pos.x - e.radius;
      const barY = e.pos.y - e.radius - 6;
      r.rect(barX, barY, barW, 3, '#000', true);
      r.rect(barX, barY, barW * e.hpRatio, 3, '#4caf50', true);
      // boss: thick health bar across screen width
      if (e.isBoss) {
        const bossBarW = r.width * 0.6;
        const bossBarX = (r.width - bossBarW) / 2 - r.camX;
        const bossBarY = 52 - r.camY;
        r.rect(bossBarX, bossBarY, bossBarW, 8, '#1a1a1a', true);
        r.rect(bossBarX, bossBarY, bossBarW * e.hpRatio, 8, '#d32f2f', true);
        r.rect(bossBarX, bossBarY, bossBarW, 8, '#d32f2f', false);
      }
    }

    // projectiles
    for (const p of s.projectiles) {
      r.circle(p.pos, p.splash ? 4 : 3, p.color);
    }

    // hover preview: range circle + placement validity tint
    if (s.hoverTile && s.selectedTowerId && !s.selectedTower) {
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

  /** Render the static layer (tiles + path + spawn/goal) to an offscreen canvas. */
  private renderStatic(g: GameState['grid']): void {
    if (!this.staticCanvas) {
      this.staticCanvas = document.createElement('canvas');
      this.staticCtx = this.staticCanvas.getContext('2d');
    }
    const ctx = this.staticCtx!;
    const dpr = window.devicePixelRatio || 1;
    const w = g.widthPx;
    const h = g.heightPx;
    this.staticCanvas.width = Math.floor(w * dpr);
    this.staticCanvas.height = Math.floor(h * dpr);
    this.staticCanvas.style.width = `${w}px`;
    this.staticCanvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // tiles with subtle vertical gradient for depth
    for (let ty = 0; ty < g.rows; ty++) {
      for (let tx = 0; tx < g.cols; tx++) {
        const t = g.at(tx, ty);
        const px = tx * g.tile;
        const py = ty * g.tile;
        let base = '#162032';
        if (t === TileType.Buildable) base = '#1c2740';
        if (t === TileType.Path) base = '#3a2a1a';
        if (t === TileType.Blocked) base = '#0d1320';
        if (t === TileType.Spawn) base = '#1b5e20';
        if (t === TileType.Goal) base = '#b71c1c';
        ctx.fillStyle = base;
        ctx.fillRect(px, py, g.tile, g.tile);
        // top highlight strip for buildable tiles (fake lighting)
        if (t === TileType.Buildable) {
          ctx.fillStyle = 'rgba(255,255,255,0.04)';
          ctx.fillRect(px, py, g.tile, 2);
        }
        // grid border
        ctx.strokeStyle = '#0a0e14';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, g.tile - 1, g.tile - 1);
      }
    }

    // path polyline — thicker, with soft glow underlay
    if (g.waypoints.length > 1) {
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 5;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(g.waypoints[0].x, g.waypoints[0].y);
      for (let i = 1; i < g.waypoints.length; i++) ctx.lineTo(g.waypoints[i].x, g.waypoints[i].y);
      ctx.stroke();
      // bright center stroke
      ctx.strokeStyle = '#7a5c4a';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // spawn / goal markers with pulse-ready ring
    const drawMarker = (p: Vec2, fill: string, ring: string): void => {
      ctx.fillStyle = ring;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fill();
    };
    drawMarker(g.waypoints[0], '#388e3c', '#1b5e20');
    drawMarker(g.waypoints[g.waypoints.length - 1], '#d32f2f', '#b71c1c');
  }
}
