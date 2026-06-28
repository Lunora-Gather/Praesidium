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
import { classifyBossEncounter } from '../utils/BossEncounter';
import { TOP_H, BOT_H } from './HUD';
import { getLevelTheme, LevelTheme } from './LevelThemes';
import { drawWeeklyRunBadge } from './WeeklyRunBadge';

export class WorldRenderer {
  private staticCanvas: HTMLCanvasElement | null = null;
  private staticCtx: CanvasRenderingContext2D | null = null;
  private cacheKey = ''; // identifies which level/theme is cached

  draw(r: Renderer, s: GameState, settings: Readonly<Settings>): void {
    const g = s.grid;
    const theme = getLevelTheme(s.levels.levelNumber);

    // center the grid horizontally in available space (between top bar and shop)
    const availW = r.width;
    const availH = r.height - TOP_H - BOT_H;
    r.camX = (availW - g.widthPx) / 2;
    r.camY = TOP_H + Math.max(0, (availH - g.heightPx) / 2);
    r.zoom = 1;

    const key = `${theme.id}|${g.cols}x${g.rows}x${g.tile}|${g.waypoints.map((w) => `${w.x.toFixed(0)},${w.y.toFixed(0)}`).join(';')}`;
    if (key !== this.cacheKey || !this.staticCanvas) {
      this.renderStatic(g, theme);
      this.cacheKey = key;
    }

    this.drawBattleBackdrop(r, theme);

    if (this.staticCanvas) {
      const ctx = r.ctx;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.staticCanvas, r.camX * dpr, r.camY * dpr);
      ctx.restore();
    }

    this.drawAmbientSweep(r, s, theme);

    // selected tower: range ring + level pips
    if (settings.showRange && s.selectedTower) {
      r.circle(s.selectedTower.pos, s.selectedTower.range, `${theme.accent}33`, true);
      r.circle(s.selectedTower.pos, s.selectedTower.range, theme.accent, false);
    }

    // towers — distinctive shapes per type
    for (const t of s.towers) {
      const ctx = r.ctx;
      const sp = r.toScreen(t.pos);
      const z = r.zoom;
      this.drawTowerGlow(r, t);
      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.rotate(t.angle);
      ctx.shadowColor = t.def.color;
      ctx.shadowBlur = 10 * z;
      ctx.fillStyle = '#1c2740';
      ctx.fillRect(-t.def.radius * z, -t.def.radius * z, t.def.radius * 2 * z, t.def.radius * 2 * z);
      ctx.strokeStyle = t.def.color;
      ctx.lineWidth = 2 * z;
      ctx.strokeRect(-t.def.radius * z, -t.def.radius * z, t.def.radius * 2 * z, t.def.radius * 2 * z);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(-t.def.radius * z + 3 * z, -t.def.radius * z + 3 * z, t.def.radius * 2 * z - 6 * z, 3 * z);
      ctx.fillStyle = t.def.color;
      const id = t.def.id;
      if (id === 'turret') {
        ctx.fillRect(0, -3 * z, (t.def.radius + 10) * z, 6 * z);
      } else if (id === 'sniper') {
        ctx.fillRect(0, -2 * z, (t.def.radius + 16) * z, 4 * z);
        ctx.fillStyle = '#aaa';
        ctx.fillRect((t.def.radius + 10) * z, -3 * z, 6 * z, 6 * z);
      } else if (id === 'mortar') {
        ctx.fillRect(0, -5 * z, (t.def.radius + 6) * z, 10 * z);
      } else if (id === 'frost') {
        ctx.beginPath();
        ctx.moveTo((t.def.radius + 8) * z, 0);
        ctx.lineTo(0, -6 * z);
        ctx.lineTo(-(t.def.radius * 0.5) * z, 0);
        ctx.lineTo(0, 6 * z);
        ctx.closePath();
        ctx.fill();
      } else if (id === 'tesla') {
        ctx.strokeStyle = t.def.color;
        ctx.lineWidth = 2 * z;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc((i * 4 - 4) * z, 0, (4 + i) * z, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = '#fff176';
        ctx.fillRect((t.def.radius + 4) * z, -2 * z, 8 * z, 4 * z);
      } else if (id === 'cannon') {
        ctx.fillRect(0, -4 * z, (t.def.radius + 8) * z, 8 * z);
        ctx.fillRect((t.def.radius + 4) * z, -6 * z, 6 * z, 12 * z);
      }
      ctx.restore();

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

    // enemies — distinctive shapes per type
    for (const e of s.enemies) {
      const ctx = r.ctx;
      const sp = r.toScreen(e.pos);
      const z = r.zoom;
      const rad = e.radius * z;
      this.drawEnemyShadow(r, e);
      ctx.save();
      ctx.translate(sp.x, sp.y);
      if (e.isBoss) {
        const pulse = 0.55 + Math.sin(Date.now() / 110) * 0.15;
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 3 * z;
        ctx.beginPath();
        ctx.arc(0, 0, rad + 8 * z, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = e.color;
      const eid = e.id;
      if (eid === 'grunt') {
        ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2); ctx.fill();
      } else if (eid === 'scout') {
        ctx.beginPath(); ctx.moveTo(rad, 0); ctx.lineTo(-rad, -rad * 0.7); ctx.lineTo(-rad, rad * 0.7); ctx.closePath(); ctx.fill();
      } else if (eid === 'brute') {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); }
        ctx.closePath(); ctx.fill();
      } else if (eid === 'zealot') {
        ctx.beginPath(); ctx.moveTo(0, -rad); ctx.lineTo(rad, 0); ctx.lineTo(0, rad); ctx.lineTo(-rad, 0); ctx.closePath(); ctx.fill();
      } else if (eid === 'phantom') {
        ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2); ctx.strokeStyle = e.color; ctx.lineWidth = 3 * z; ctx.stroke();
      } else if (eid === 'titan') {
        ctx.beginPath();
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#37474f'; ctx.lineWidth = 3 * z;
        ctx.beginPath(); ctx.moveTo(-rad * 0.5, 0); ctx.lineTo(rad * 0.5, 0); ctx.moveTo(0, -rad * 0.5); ctx.lineTo(0, rad * 0.5); ctx.stroke();
      } else if (eid === 'boss') {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2; const r2 = i % 2 === 0 ? rad : rad * 0.5; ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); }
        ctx.closePath(); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      if (e.isSlowed) r.circle(e.pos, e.radius + 2, '#80deea', false);
      const barW = e.radius * 2;
      const barX = e.pos.x - e.radius;
      const barY = e.pos.y - e.radius - 6;
      r.roundRect(barX - 1, barY - 1, barW + 2, 5, 2, 'rgba(0,0,0,0.72)', true);
      r.roundRect(barX, barY, Math.max(2, barW * e.hpRatio), 3, 2, e.hpRatio < 0.35 ? '#f87171' : '#4ade80', true);
      if (e.isBoss) this.drawBossBar(r, e.hpRatio);
    }

    // projectiles + trail
    for (const p of s.projectiles) {
      if (p.damageType === DamageType.Lightning) {
        if (p.trail.length > 0) this.drawLightning(r.ctx, r, p.trail[0], p.pos, p.color, r.zoom);
      } else if (p.trail.length > 1) {
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
      const ok = g.isBuildable(s.hoverTile.tx, s.hoverTile.ty) &&
        !s.towers.some((t) => t.tx === s.hoverTile!.tx && t.ty === s.hoverTile!.ty) &&
        s.gold >= def.cost;
      r.circle(center, def.range, ok ? `${theme.accent}44` : '#e5737344', true);
      r.circle(center, def.range, ok ? theme.accent : '#e57373', false);
      r.rect(s.hoverTile.tx * g.tile, s.hoverTile.ty * g.tile, g.tile, g.tile, ok ? `${theme.accent}55` : '#e5737355', true);
    }

    this.drawBossWarning(r, s);
    drawWeeklyRunBadge(r, s);
    this.drawLowLifeOverlay(r, s);
  }

  private drawBattleBackdrop(r: Renderer, theme: LevelTheme): void {
    const oldCamX = r.camX;
    const oldCamY = r.camY;
    const oldZoom = r.zoom;
    r.camX = 0; r.camY = 0; r.zoom = 1;
    const bg = r.linearGradient(0, TOP_H, 0, r.height - BOT_H, [
      { offset: 0, color: theme.background },
      { offset: 0.55, color: '#020617' },
      { offset: 1, color: '#01040a' },
    ]);
    r.rect(0, TOP_H, r.width, r.height - TOP_H - BOT_H, bg, true);
    r.ctx.save();
    const halo = r.ctx.createRadialGradient(r.width * 0.5, TOP_H + 120, 20, r.width * 0.5, TOP_H + 120, Math.max(r.width, r.height) * 0.65);
    halo.addColorStop(0, theme.ambient);
    halo.addColorStop(1, 'rgba(2, 6, 23, 0)');
    r.ctx.fillStyle = halo;
    r.ctx.fillRect(0, TOP_H, r.width, r.height - TOP_H - BOT_H);
    r.ctx.globalAlpha = 0.08;
    for (let y = TOP_H + 18; y < r.height - BOT_H; y += 18) r.ctx.fillRect(0, y, r.width, 1);
    r.ctx.restore();
    r.camX = oldCamX; r.camY = oldCamY; r.zoom = oldZoom;
  }

  private drawTowerGlow(r: Renderer, tower: GameState['towers'][number]): void {
    const p = r.toScreen(tower.pos);
    const radius = tower.def.radius * 2.4;
    const g = r.ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, radius);
    g.addColorStop(0, `${tower.def.color}55`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    r.ctx.save();
    r.ctx.fillStyle = g;
    r.ctx.beginPath();
    r.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    r.ctx.fill();
    r.ctx.restore();
  }

  private drawEnemyShadow(r: Renderer, enemy: GameState['enemies'][number]): void {
    const p = r.toScreen(enemy.pos);
    r.ctx.save();
    r.ctx.globalAlpha = enemy.isBoss ? 0.34 : 0.24;
    r.ctx.fillStyle = '#000';
    r.ctx.beginPath();
    r.ctx.ellipse(p.x, p.y + enemy.radius * 0.66, enemy.radius * 1.15, enemy.radius * 0.42, 0, 0, Math.PI * 2);
    r.ctx.fill();
    r.ctx.restore();
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
    const pulse = 0.07 + Math.sin(Date.now() / 900 + s.levels.levelNumber) * 0.025;
    r.ctx.save();
    r.ctx.globalAlpha = pulse;
    r.rect(0, 0, s.grid.widthPx, s.grid.heightPx, theme.ambient, true);
    r.ctx.restore();
  }

  private drawBossBar(r: Renderer, hpRatio: number): void {
    const oldCamX = r.camX;
    const oldCamY = r.camY;
    const oldZoom = r.zoom;
    r.camX = 0; r.camY = 0; r.zoom = 1;
    const w = Math.min(620, r.width * 0.62);
    const x = (r.width - w) / 2;
    const y = TOP_H + 6;
    r.roundRect(x, y, w, 10, 5, 'rgba(20, 20, 24, 0.88)', true, '#7f1d1d', 1);
    r.roundRect(x + 2, y + 2, Math.max(4, (w - 4) * hpRatio), 6, 3, hpRatio < 0.3 ? '#f87171' : '#dc2626', true);
    r.text('BOSS', x + w / 2, y + 18, '#fecaca', 10, 'center', 'bold', 'top', 'header');
    r.camX = oldCamX; r.camY = oldCamY; r.zoom = oldZoom;
  }

  private drawBossWarning(r: Renderer, s: GameState): void {
    const boss = s.enemies.find(e => e.isBoss && !e.dead);
    if (!boss) return;
    const encounter = classifyBossEncounter(s.enemies.filter(e => !e.dead).map(e => ({ id: e.id, count: 1 })));
    const oldCamX = r.camX;
    const oldCamY = r.camY;
    const oldZoom = r.zoom;
    r.camX = 0; r.camY = 0; r.zoom = 1;
    const alpha = 0.12 + Math.sin(Date.now() / 150) * 0.05;
    const color = encounter.id === 'none' ? '#ef4444' : encounter.color;
    r.ctx.save();
    r.ctx.globalAlpha = alpha;
    r.rect(0, TOP_H, r.width, 52, color, true);
    r.ctx.restore();
    r.roundRect(r.width / 2 - 170, TOP_H + 9, 340, 34, 12, 'rgba(15, 23, 42, 0.72)', true, `${color}aa`, 1);
    r.text(`⚠ ${encounter.label || 'BOSS WAVE'}`, r.width / 2, TOP_H + 18, color, 15, 'center', 'bold', 'middle', 'header');
    r.text(encounter.advice || 'Stack single-target damage and control', r.width / 2, TOP_H + 34, '#fecaca', 9, 'center', 'bold', 'middle');
    r.camX = oldCamX; r.camY = oldCamY; r.zoom = oldZoom;
  }

  private drawLowLifeOverlay(r: Renderer, s: GameState): void {
    if (s.lives > 5) return;
    const oldCamX = r.camX;
    const oldCamY = r.camY;
    const oldZoom = r.zoom;
    r.camX = 0; r.camY = 0; r.zoom = 1;
    const alpha = Math.min(0.22, 0.06 + (6 - s.lives) * 0.035 + Math.sin(Date.now() / 180) * 0.025);
    r.ctx.save();
    r.ctx.globalAlpha = alpha;
    r.rect(0, 0, r.width, r.height, '#ef4444', true);
    r.ctx.restore();
    r.camX = oldCamX; r.camY = oldCamY; r.zoom = oldZoom;
  }

  /** Render the static layer (tiles + path + spawn/goal) to an offscreen canvas. */
  private renderStatic(g: GameState['grid'], theme: LevelTheme): void {
    if (!this.staticCanvas) {
      this.staticCanvas = document.createElement('canvas');
      this.staticCtx = this.staticCanvas.getContext('2d');
    }
    const ctx = this.staticCtx!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
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

    for (let ty = 0; ty < g.rows; ty++) {
      for (let tx = 0; tx < g.cols; tx++) {
        const t = g.at(tx, ty);
        const px = tx * g.tile;
        const py = ty * g.tile;
        let base = theme.background;
        if (t === TileType.Buildable) base = theme.buildable;
        if (t === TileType.Path) base = theme.path;
        if (t === TileType.Blocked) base = theme.blocked;
        if (t === TileType.Spawn) base = theme.spawnRing;
        if (t === TileType.Goal) base = theme.goalRing;
        ctx.fillStyle = base;
        ctx.fillRect(px, py, g.tile, g.tile);

        if (t === TileType.Buildable) {
          ctx.fillStyle = theme.buildableHighlight;
          ctx.fillRect(px, py, g.tile, 3);
          ctx.strokeStyle = `${theme.accent}22`;
          ctx.beginPath();
          ctx.moveTo(px + 8, py + 8);
          ctx.lineTo(px + 18, py + 8);
          ctx.moveTo(px + 8, py + 8);
          ctx.lineTo(px + 8, py + 18);
          ctx.stroke();
        }
        if (t === TileType.Path) {
          ctx.fillStyle = 'rgba(255,255,255,0.035)';
          ctx.fillRect(px + 4, py + 4, g.tile - 8, g.tile - 8);
        }
        if ((tx * 17 + ty * 31) % 23 === 0 && t === TileType.Buildable) {
          ctx.fillStyle = theme.ambient;
          ctx.beginPath();
          ctx.arc(px + g.tile * 0.68, py + g.tile * 0.32, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = theme.gridLine;
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, g.tile - 1, g.tile - 1);
      }
    }

    if (g.waypoints.length > 1) {
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = `${theme.pathGlow}55`;
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(g.waypoints[0].x, g.waypoints[0].y);
      for (let i = 1; i < g.waypoints.length; i++) ctx.lineTo(g.waypoints[i].x, g.waypoints[i].y);
      ctx.stroke();
      ctx.strokeStyle = theme.pathGlow;
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.strokeStyle = theme.pathCore;
      ctx.lineWidth = 2;
      ctx.stroke();
      this.drawPathFlow(ctx, g.waypoints, theme);
    }

    const drawMarker = (p: Vec2, fill: string, ring: string): void => {
      ctx.fillStyle = `${ring}aa`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = fill;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `${fill}66`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
      ctx.stroke();
    };
    drawMarker(g.waypoints[0], theme.spawn, theme.spawnRing);
    drawMarker(g.waypoints[g.waypoints.length - 1], theme.goal, theme.goalRing);
  }

  private drawPathFlow(ctx: CanvasRenderingContext2D, points: readonly Vec2[], theme: LevelTheme): void {
    ctx.save();
    ctx.fillStyle = `${theme.pathCore}88`;
    for (let i = 0; i + 1 < points.length; i++) {
      const a = points[i];
      const b = points[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 40) continue;
      const ux = dx / len;
      const uy = dy / len;
      const px = -uy;
      const py = ux;
      for (let d = 52; d < len; d += 96) {
        const cx = a.x + ux * d;
        const cy = a.y + uy * d;
        ctx.beginPath();
        ctx.moveTo(cx + ux * 12, cy + uy * 12);
        ctx.lineTo(cx - ux * 10 + px * 7, cy - uy * 10 + py * 7);
        ctx.lineTo(cx - ux * 10 - px * 7, cy - uy * 10 - py * 7);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
