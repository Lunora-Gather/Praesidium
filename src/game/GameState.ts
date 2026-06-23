// Top-level game state machine + economy/lives + owning all gameplay objects.
// Rendering is done by ui/Renderer; this holds authoritative simulation state.

import { Grid } from './grid/Grid';
import { LEVEL_1 } from './grid/Level';
import { Tower } from './towers/Tower';
import { Enemy } from './enemies/Enemy';
import { Projectile } from './projectiles/Projectile';
import { WaveManager } from './waves/WaveManager';
import { getTowerDef, TowerDef } from './towers/TowerRegistry';
import { BALANCE } from '../config/balance';

export type Phase = 'menu' | 'playing' | 'won' | 'lost';

export class GameState {
  readonly grid: Grid;
  gold = BALANCE.startGold as number;
  lives = BALANCE.startLives as number;
  phase: Phase = 'menu';
  readonly towers: Tower[] = [];
  readonly enemies: Enemy[] = [];
  readonly projectiles: Projectile[] = [];
  readonly waves: WaveManager;
  selectedTowerId: string | null = 'turret'; // shop selection
  hoverTile: { tx: number; ty: number } | null = null;
  score = 0;

  constructor() {
    this.grid = new Grid(LEVEL_1);
    this.waves = new WaveManager(BALANCE.waveCount);
  }

  start(): void {
    this.gold = BALANCE.startGold;
    this.lives = BALANCE.startLives;
    this.score = 0;
    this.towers.length = 0;
    this.enemies.length = 0;
    this.projectiles.length = 0;
    this.waves.reset();
    this.phase = 'playing';
  }

  /** Try to place a tower of the selected type at a tile. Returns success. */
  tryPlace(tx: number, ty: number): boolean {
    if (!this.selectedTowerId) return false;
    const def: TowerDef = getTowerDef(this.selectedTowerId);
    if (this.gold < def.cost) return false;
    if (!this.grid.isBuildable(tx, ty)) return false;
    if (this.towers.some((t) => t.tx === tx && t.ty === ty)) return false;
    this.gold -= def.cost;
    this.towers.push(new Tower(def, tx, ty, this.grid));
    return true;
  }

  sellTower(t: Tower): void {
    this.gold += Math.floor(t.def.cost * BALANCE.tower.sellRefund);
    const i = this.towers.indexOf(t);
    if (i >= 0) this.towers.splice(i, 1);
  }

  update(dt: number): void {
    if (this.phase !== 'playing') return;

    this.waves.update(dt, this.grid, this.enemies);

    // towers
    for (const t of this.towers) {
      const { target } = t.update(dt, this.enemies, this.grid);
      if (target && t.canFire()) {
        t.resetCooldown();
        this.projectiles.push(new Projectile(t.pos, target, t.def));
      }
    }

    // projectiles
    for (const p of this.projectiles) p.update(dt);

    // collisions / damage
    for (const p of this.projectiles) {
      if (p.dead) continue;
      if (!p.target || p.target.dead) continue;
      if (p.pos.distSq(p.target.pos) > (p.target.radius + 4) * (p.target.radius + 4)) continue;
      this.applyHit(p);
      p.dead = true;
    }

    // enemies
    for (const e of this.enemies) e.update(dt, this.grid);
    for (const e of this.enemies) {
      if (e.reachedGoal) {
        this.lives -= 1;
        if (this.lives <= 0) {
          this.lives = 0;
          this.phase = 'lost';
        }
      } else if (e.dead) {
        this.gold += e.reward;
        this.score += e.reward;
      }
    }
    this.compact(this.enemies);

    // cleanup
    this.compact(this.projectiles);

    // win check
    if (this.waves.state === 'done' && this.enemies.length === 0) {
      this.phase = 'won';
    }
  }

  /** Remove dead entries in-place (avoids array reallocation churn). */
  private compact<T extends { dead: boolean }>(arr: T[]): void {
    let w = 0;
    for (let r = 0; r < arr.length; r++) {
      if (!arr[r].dead) {
        if (w !== r) arr[w] = arr[r];
        w++;
      }
    }
    arr.length = w;
  }

  private applyHit(p: Projectile): void {
    if (p.splash) {
      const r2 = p.splash * p.splash;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (p.pos.distSq(e.pos) <= r2) this.damageEnemy(e, p.damage);
      }
    } else if (p.target && !p.target.dead) {
      this.damageEnemy(p.target, p.damage);
    }
  }

  private damageEnemy(e: Enemy, dmg: number): void {
    e.takeDamage(dmg);
  }
}
