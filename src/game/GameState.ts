// Top-level game state machine + economy/lives + owning all gameplay objects.
// Combat/movement delegated to systems; this orchestrates them + economy + phases.

import { Grid } from './grid/Grid';
import { Tower } from './towers/Tower';
import { Enemy } from './enemies/Enemy';
import { Projectile } from './projectiles/Projectile';
import { WaveManager } from './waves/WaveManager';
import { CombatSystem, CombatEvents } from './systems/CombatSystem';
import { MovementSystem, MovementEvents } from './systems/MovementSystem';
import { LevelManager } from './grid/LevelManager';
import { getTowerDef, TowerDef } from './towers/TowerRegistry';
import { BALANCE } from '../config/balance';
import { EventBus } from '../utils/EventBus';
import { SaveSystem } from '../utils/SaveSystem';
import { logger } from '../utils/logger';

export type Phase = 'menu' | 'levelSelect' | 'playing' | 'won' | 'lost';

export interface GameEvents {
  goldChanged: { gold: number };
  livesChanged: { lives: number };
  waveChanged: { current: number; total: number };
  phaseChanged: { from: Phase; to: Phase };
  towerPlaced: { tx: number; ty: number; id: string };
  towerUpgraded: { tx: number; ty: number; level: number };
  towerSold: { tx: number; ty: number; refund: number };
}

export class GameState {
  grid: Grid;
  gold = BALANCE.startGold as number;
  lives = BALANCE.startLives as number;
  phase: Phase = 'menu';
  readonly towers: Tower[] = [];
  readonly enemies: Enemy[] = [];
  readonly projectiles: Projectile[] = [];
  readonly waves: WaveManager;
  readonly levels = new LevelManager();
  readonly bus = new EventBus<GameEvents>();
  readonly combat = new CombatSystem(new EventBus<CombatEvents>());
  readonly movement = new MovementSystem(new EventBus<MovementEvents>());
  readonly save = new SaveSystem();
  selectedTowerId: string | null = 'turret';
  hoverTile: { tx: number; ty: number } | null = null;
  selectedTower: Tower | null = null; // tower clicked for upgrade/sell panel
  score = 0;
  fps = 0;

  constructor() {
    this.grid = new Grid(this.levels.current);
    this.waves = new WaveManager(BALANCE.waveCount);
    logger.info('Praesidium GameState initialized', { levels: this.levels.total });
  }

  private setPhase(p: Phase): void {
    if (p === this.phase) return;
    const from = this.phase;
    this.phase = p;
    this.bus.emit('phaseChanged', { from, to: p });
  }

  /** Start a fresh run on the current level. */
  start(): void {
    this.grid = new Grid(this.levels.current);
    this.gold = BALANCE.startGold;
    this.lives = BALANCE.startLives;
    this.score = 0;
    this.towers.length = 0;
    this.enemies.length = 0;
    this.projectiles.length = 0;
    this.selectedTower = null;
    this.waves.reset();
    this.setPhase('playing');
    logger.info('Run started', { level: this.levels.levelNumber, name: this.levels.current.name });
  }

  goMenu(): void {
    this.setPhase('menu');
  }

  goLevelSelect(): void {
    this.setPhase('levelSelect');
  }

  selectLevel(i: number): void {
    this.levels.setLevel(i);
    this.grid = new Grid(this.levels.current);
    this.start();
  }

  /** Advance to next level after a win. */
  advanceLevel(): void {
    if (!this.levels.hasNext) {
      logger.info('All levels cleared');
      this.setPhase('won');
      return;
    }
    this.levels.advance();
    this.save.recordLevelReached(this.levels.levelNumber);
    this.start();
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
    this.bus.emit('goldChanged', { gold: this.gold });
    this.bus.emit('towerPlaced', { tx, ty, id: def.id });
    return true;
  }

  upgradeTower(t: Tower): boolean {
    const step = t.nextUpgrade;
    if (!step || this.gold < step.cost) return false;
    this.gold -= step.cost;
    t.upgrade();
    this.bus.emit('goldChanged', { gold: this.gold });
    this.bus.emit('towerUpgraded', { tx: t.tx, ty: t.ty, level: t.level });
    return true;
  }

  sellTower(t: Tower): void {
    const refund = t.sellValue;
    this.gold += refund;
    const i = this.towers.indexOf(t);
    if (i >= 0) this.towers.splice(i, 1);
    if (this.selectedTower === t) this.selectedTower = null;
    this.bus.emit('goldChanged', { gold: this.gold });
    this.bus.emit('towerSold', { tx: t.tx, ty: t.ty, refund });
  }

  update(dt: number): void {
    if (this.phase !== 'playing') return;

    this.waves.update(dt, this.grid, this.enemies);
    this.bus.emit('waveChanged', { current: this.waves.current, total: this.waves.totalWaves });

    // towers acquire + fire
    for (const t of this.towers) {
      const { target } = t.update(dt, this.enemies, this.grid);
      if (target && t.canFire()) {
        t.resetCooldown();
        this.projectiles.push(new Projectile(t.pos, target, t.def, t.damage));
      }
    }

    // projectiles move
    for (const p of this.projectiles) p.update(dt);

    // combat resolution (damage/splash/slow)
    this.combat.resolve(this.projectiles, this.enemies, this);
    this.compact(this.projectiles);

    // movement + life loss + cleanup
    this.movement.update(dt, this.enemies, this.grid, this);

    // win/lose
    if (this.lives <= 0) {
      this.setPhase('lost');
      this.save.recordScore(this.score);
      return;
    }
    if (this.waves.state === 'done' && this.enemies.length === 0) {
      const isNew = this.save.recordScore(this.score);
      logger.info('Level won', { score: this.score, isNewHigh: isNew });
      if (this.levels.hasNext) {
        this.advanceLevel();
      } else {
        this.setPhase('won');
      }
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
}
