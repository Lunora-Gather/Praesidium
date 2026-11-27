// World renderer: grid, path, towers, enemies, projectiles, hover preview.
// Pure draw — mutates nothing in GameState.
// Static layer (tiles + path + spawn/goal markers) is cached to an offscreen
// canvas; only the dynamic layer (towers/enemies/projectiles/hover) is redrawn
// per frame. Cache is invalidated when the level or visual theme changes.

import { Renderer } from '../engine/Renderer';
import { GameState } from '../game/GameState';
import { TileType } from '../game/grid/Level';
import { Vec2 } from '../engine/math/Vec2';
import { getTowerDef } from '../game/towers/TowerRegistry';
import type { Settings } from '../config/Settings';
import { DamageType } from '../game/DamageType';
import { battleTopHeight, BOT_H } from './BattleHudLayout';
import { getLevelTheme, LevelTheme } from './LevelThemes';
import type { BattleBox } from './BattleLayout';
import { drawRouteMarker } from './RouteMarkers';
import { drawEnemySprite, drawTowerSprite } from './BattleSprites';

export class WorldRenderer {
  private staticCanvas: HTMLCanvasElement | null = null;
  private staticCtx: CanvasRenderingContext2D | null = null;
  private cachedGrid: GameState['grid'] | null = null;
  private cachedPixelRatio = 0;
  private backdrop: { key: string; gradient: CanvasGradient; halo: CanvasGradient } | null = null;

  draw(r: Renderer, s: GameState, settings: Readonly<Settings>, board: BattleBox): void {
    const g = s.grid;
    const theme = getLevelTheme(s.levels.levelNumber);

    const mapPixelRatio = Math.min(r.pixelRatio, Math.max(0.125, Math.round(r.pixelRatio * r.zoom * 64) / 64));
    if (g !== this.cachedGrid || mapPixelRatio !== this.cachedPixelRatio) {
      this.renderStatic(g, theme, mapPixelRatio);
      this.cachedGrid = g;
      this.cachedPixelRatio = mapPixelRatio;
    }
    const fullEffects = settings.graphics !== 'low' && !settings.reducedMotion;

    this.drawBattleBackdrop(r, theme);
    r.ctx.save();
    r.ctx.beginPath();
    r.ctx.rect(board.x, board.y, board.w, board.h);
    r.ctx.clip();

    if (this.staticCanvas) {
      r.ctx.drawImage(this.staticCanvas, r.camX, r.camY, g.widthPx * r.zoom, g.heightPx * r.zoom);
    }

    if (fullEffects) this.drawAmbientSweep(r, s, theme);

    // selected tower: range ring + level pips
    if (settings.showRange && s.selectedTower) {
      r.circle(s.selectedTower.pos, s.selectedTower.range, `${theme.accent}33`, true);
      r.circle(s.selectedTower.pos, s.selectedTower.range, theme.accent, false);
    }

    for (const t of s.towers) {
      const position = r.toScreen(t.pos);
      const size = t.def.radius * 2.65 * r.zoom;
      drawTowerSprite(r, t.def.id, t.def.color, position.x, position.y, size, t.angle);

      if (t.synergyNeighbors > 0) {
        r.ctx.globalAlpha = 0.15 + Math.min(t.synergyNeighbors, 4) * 0.05;
        r.circle(t.pos, t.def.radius + 4, '#ffd54f', false);
        r.ctx.globalAlpha = 1;
      }

      const pipsCount = t.level - 1;
      const pipGap = 5;
      const totalWidth = (pipsCount - 1) * pipGap;
      const startPipX = t.pos.x - totalWidth / 2;
      for (let i = 0; i < pipsCount; i++) {
        r.circle(new Vec2(startPipX + i * pipGap, t.pos.y - t.def.radius - 6), 2, '#ffd54f');
      }

      if (t.currentTarget && !t.currentTarget.dead) {
        r.ctx.save();
        r.ctx.globalAlpha = 0.12;
        r.line(t.pos, t.currentTarget.pos, t.def.color, 1.5);
        r.ctx.restore();
      }
    }

    for (const enemy of s.enemies) {
      const position = r.toScreen(enemy.pos);
      const target = g.waypoints[enemy.nextWaypointIndex || 1];
      const dx = (target?.x ?? enemy.pos.x) - enemy.pos.x;
      const dy = (target?.y ?? enemy.pos.y) - enemy.pos.y;
      const direction = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 0 : 2) : (dy >= 0 ? 1 : 3);
      const radius = enemy.radius * r.zoom;
      if (enemy.isBoss) {
        r.ctx.save();
        r.ctx.globalAlpha = fullEffects ? .66 + Math.sin(r.motionClock / 155) * .13 : .72;
        r.circle(enemy.pos, enemy.radius + 5, '#ef856e', false);
        r.ctx.restore();
      }
      drawEnemySprite(r, enemy.id, enemy.color, position.x, position.y, Math.max(12, radius * 2.8), direction);
      if (enemy.isSlowed) r.circle(enemy.pos, enemy.radius + 2, '#80deea', false);

      const hp = enemy.hpRatio;
      if (hp < .99 || enemy.isBoss) {
        const w = Math.max(6, radius * 1.85);
        const x = position.x - w / 2;
        const y = position.y - radius - 5;
        const ctx = r.ctx;
        ctx.fillStyle = '#0a111c';
        ctx.fillRect(x - 1, y - 1, w + 2, 4);
        ctx.fillStyle = hp <= .35 ? '#ef8273' : '#f2bd82';
        ctx.fillRect(x, y, Math.max(1, w * hp), 2);
      }
    }

    // projectiles + trail
    for (const p of s.projectiles) {
      if (fullEffects && p.damageType === DamageType.Lightning) {
        if (p.trail.length > 0) this.drawLightning(r.ctx, r, p.trail[0], p.pos, p.color, r.zoom);
      } else if (fullEffects && p.trail.length > 1) {
        for (let i = 1; i < p.trail.length; i++) {
          const alpha = i / p.trail.length;
          r.ctx.globalAlpha = alpha * 0.5;
          r.line(p.trail[i - 1], p.trail[i], p.color, p.splash ? 3 : 2);
        }
        r.ctx.globalAlpha = 1;
      }
      r.ctx.save();
      r.ctx.globalAlpha = 0.22;
      r.circle(p.pos, p.splash ? 9 : 7, p.color, true);
      r.ctx.restore();
      r.circle(p.pos, p.splash ? 4 : 3, p.color);
    }

    // hover preview: range circle + placement validity tint
    if (s.hoverTile && s.selectedTowerId && !s.selectedTower) {
      const def = getTowerDef(s.selectedTowerId);
      const center = g.tileCenter(s.hoverTile.tx, s.hoverTile.ty);
      const ok = s.canPlaceTower(s.hoverTile.tx, s.hoverTile.ty, def);
      const x = s.hoverTile.tx * g.tile;
      const y = s.hoverTile.ty * g.tile;
      r.rect(x + 2, y + 2, g.tile - 4, g.tile - 4, ok ? '#84d2fb38' : '#ed887856');
      r.rect(x + 2, y + 2, g.tile - 4, g.tile - 4, ok ? '#9adcff' : '#ed8878', false);
      if (ok) {
        if (settings.showRange) {
          r.circle(center, def.range, '#89c7ef16');
          r.circle(center, def.range, '#89c7efaa', false);
        }
        const pos = r.toScreen(center);
        r.ctx.save();
        r.ctx.globalAlpha = .73;
        drawTowerSprite(r, def.id, def.color, pos.x, pos.y, def.radius * 2.65 * r.zoom, 0);
        r.ctx.restore();
      } else {
        const notch = g.tile * .15;
        r.line(new Vec2(center.x - notch, center.y - notch), new Vec2(center.x + notch, center.y + notch), '#ffd2c9', 2);
        r.line(new Vec2(center.x + notch, center.y - notch), new Vec2(center.x - notch, center.y + notch), '#ffd2c9', 2);
      }
    }

    r.ctx.restore();
    this.drawLowLifeOverlay(r, s);
  }

  private drawBattleBackdrop(r: Renderer, theme: LevelTheme): void {
    const oldCamX = r.camX;
    const oldCamY = r.camY;
    const oldZoom = r.zoom;
    r.camX = 0; r.camY = 0; r.zoom = 1;
    const key = `${r.width}:${r.height}:${r.pixelRatio}:${theme.background}:${theme.ambient}`;
    const top = battleTopHeight(r.width);
    if (this.backdrop?.key !== key) {
      const gradient = r.linearGradient(0, top, 0, r.height - BOT_H, [
        { offset: 0, color: theme.background },
        { offset: 1, color: '#0b131d' },
      ]);
      const halo = r.ctx.createRadialGradient(r.width * 0.5, top + 120, 20, r.width * 0.5, top + 120, Math.max(r.width, r.height) * 0.65);
      halo.addColorStop(0, theme.ambient);
      halo.addColorStop(1, 'rgba(2, 6, 23, 0)');
      this.backdrop = { key, gradient, halo };
    }
    r.rect(0, top, r.width, r.height - top - BOT_H, this.backdrop.gradient);
    r.ctx.save();
    r.ctx.fillStyle = this.backdrop.halo;
    r.ctx.fillRect(0, top, r.width, r.height - top - BOT_H);
    r.ctx.restore();
    r.camX = oldCamX; r.camY = oldCamY; r.zoom = oldZoom;
  }

  private drawLightning(ctx: CanvasRenderingContext2D, r: Renderer, from: Vec2, to: Vec2, color: string, z: number): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5 * z;
    ctx.beginPath();
    const sFrom = r.toScreen(from);
    const sTo = r.toScreen(to);
    const diff = sTo.sub(sFrom);
    const dist = diff.len();
    if (dist <= 0.1) { ctx.restore(); return; }
    const segments = Math.max(3, Math.floor(dist / 12));
    ctx.moveTo(sFrom.x, sFrom.y);
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const targetPoint = sFrom.add(diff.mul(t));
      if (i < segments) {
        const dir = diff.normalize();
        const perp = new Vec2(-dir.y, dir.x);
        const offset = (Math.random() - 0.5) * 8 * z;
        const nextPoint = targetPoint.add(perp.mul(offset));
        ctx.lineTo(nextPoint.x, nextPoint.y);
      } else ctx.lineTo(sTo.x, sTo.y);
    }
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.8 * z;
    ctx.stroke();
    ctx.restore();
  }

  private drawAmbientSweep(r: Renderer, s: GameState, theme: LevelTheme): void {
    const pulse = 0.07 + Math.sin(r.motionClock / 900 + s.levels.levelNumber) * 0.025;
    r.ctx.save();
    r.ctx.globalAlpha = pulse;
    r.rect(0, 0, s.grid.widthPx, s.grid.heightPx, theme.ambient, true);
    r.ctx.restore();
  }

  private drawLowLifeOverlay(r: Renderer, s: GameState): void {
    if (s.lives > 5) return;
    const oldCamX = r.camX;
    const oldCamY = r.camY;
    const oldZoom = r.zoom;
    r.camX = 0; r.camY = 0; r.zoom = 1;
    const alpha = Math.min(0.22, 0.06 + (6 - s.lives) * 0.035 + Math.sin(r.motionClock / 180) * 0.025);
    r.ctx.save();
    r.ctx.globalAlpha = alpha;
    r.rect(0, 0, r.width, r.height, '#ef4444', true);
    r.ctx.restore();
    r.camX = oldCamX; r.camY = oldCamY; r.zoom = oldZoom;
  }

  /** Render the static layer (tiles + path + spawn/goal) to an offscreen canvas. */
  private renderStatic(g: GameState['grid'], theme: LevelTheme, dpr: number): void {
    if (!this.staticCanvas) {
      this.staticCanvas = document.createElement('canvas');
      this.staticCtx = this.staticCanvas.getContext('2d');
    }
    const ctx = this.staticCtx!;
    const w = g.widthPx;
    const h = g.heightPx;
    this.staticCanvas.width = Math.floor(w * dpr);
    this.staticCanvas.height = Math.floor(h * dpr);
    this.staticCanvas.style.width = `${w}px`;
    this.staticCanvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, w, h);

    const tile = g.tile;
    for (let ty = 0; ty < g.rows; ty++) {
      for (let tx = 0; tx < g.cols; tx++) {
        const type = g.at(tx, ty);
        const x = tx * tile;
        const y = ty * tile;
        const buildable = type === TileType.Buildable;
        const blocked = type === TileType.Blocked;
        ctx.fillStyle = buildable ? theme.buildable : blocked ? theme.blocked : theme.path;
        ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
        if (buildable) {
          ctx.fillStyle = theme.buildableHighlight;
          ctx.fillRect(x + 2, y + 2, tile - 4, 1.5);
          ctx.strokeStyle = `${theme.accent}42`;
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(x + 7, y + 14);
          ctx.lineTo(x + 7, y + 7);
          ctx.lineTo(x + 14, y + 7);
          ctx.moveTo(x + tile - 7, y + tile - 14);
          ctx.lineTo(x + tile - 7, y + tile - 7);
          ctx.lineTo(x + tile - 14, y + tile - 7);
          ctx.stroke();
          ctx.fillStyle = `${theme.pathCore}38`;
          ctx.fillRect(x + tile / 2 - 1, y + tile / 2 - 1, 2, 2);
        } else if (blocked) {
          ctx.strokeStyle = `${theme.accent}22`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + 11, y + tile - 11);
          ctx.lineTo(x + tile - 11, y + 11);
          ctx.moveTo(x + 11, y + 11);
          ctx.lineTo(x + tile - 11, y + tile - 11);
          ctx.stroke();
        }
      }
    }

    if (g.waypoints.length > 1) {
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(g.waypoints[0].x, g.waypoints[0].y);
      for (let i = 1; i < g.waypoints.length; i++) ctx.lineTo(g.waypoints[i].x, g.waypoints[i].y);
      ctx.lineWidth = tile * .76;
      ctx.strokeStyle = `${theme.pathGlow}82`;
      ctx.stroke();
      ctx.lineWidth = tile * .69;
      ctx.strokeStyle = theme.background;
      ctx.stroke();
      ctx.strokeStyle = `${theme.pathCore}4d`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([7, 7]);
      ctx.stroke();
      ctx.setLineDash([]);
      this.drawPathFlow(ctx, g.waypoints, theme);
    }

    const origin = g.waypoints[0];
    const goal = g.waypoints[g.waypoints.length - 1];
    drawRouteMarker(ctx, origin.x, origin.y, g.tile * .24, theme.pathCore, theme.background);
    drawRouteMarker(ctx, goal.x, goal.y, g.tile * .24, theme.pathCore, theme.background, true);
  }

  private drawPathFlow(ctx: CanvasRenderingContext2D, points: readonly Vec2[], theme: LevelTheme): void {
    ctx.save();
    ctx.strokeStyle = `${theme.pathCore}ab`;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    for (let i = 0; i + 1 < points.length; i++) {
      const a = points[i];
      const b = points[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 64) continue;
      const ux = dx / len;
      const uy = dy / len;
      const count = Math.max(1, Math.floor(len / 120));
      for (let j = 0; j < count; j++) {
        const d = len * (j + .5) / count;
        const x = a.x + ux * d;
        const y = a.y + uy * d;
        ctx.beginPath();
        ctx.moveTo(x - ux * 5 - uy * 5, y - uy * 5 + ux * 5);
        ctx.lineTo(x + ux * 4, y + uy * 4);
        ctx.lineTo(x - ux * 5 + uy * 5, y - uy * 5 - ux * 5);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
