// Top-level game state machine + economy/lives + owning all gameplay objects.
// Orchestrates systems (combat/movement), economy, spells, particles, stats.

import { Grid } from './grid/Grid';
import { Tower } from './towers/Tower';
import { Enemy } from './enemies/Enemy';
import { Projectile } from './projectiles/Projectile';
import { WaveManager } from './waves/WaveManager';
import { CombatSystem } from './systems/CombatSystem';
import { MovementSystem } from './systems/MovementSystem';
import { LevelManager } from './grid/LevelManager';
import { getTowerDef, TowerDef } from './towers/TowerRegistry';
import { BALANCE } from '../config/balance';
import { EventBus } from '../utils/EventBus';
import { SaveSystem } from '../utils/SaveSystem';
import { logger } from '../utils/logger';
import { ParticleSystem } from './effects/ParticleSystem';
import { PlayerSpell, PLAYER_SPELLS } from './spells/PlayerSpells';
import { StatsTracker } from './StatsTracker';
import { computeStars } from './Stars';
import { Vec2 } from '../engine/math/Vec2';

export type Phase = 'menu' | 'levelSelect' | 'playing' | 'won' | 'lost';

export interface GameEvents {
  goldChanged: { gold: number };
  livesChanged: { lives: number };
  waveChanged: { current: number; total: number };
  phaseChanged: { from: Phase; to: Phase };
  towerPlaced: { tx: number; ty: number; id: string };
  towerUpgraded: { tx: number; ty: number; level: number };
  towerSold: { tx: number; ty: number; refund: number };
  spellCast: { id: string; x: number; y: number };
  levelWon: { level: number; stars: number };
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
  readonly combat = new CombatSystem();
  readonly movement = new MovementSystem();
  readonly save = new SaveSystem();
  readonly particles = new ParticleSystem();
  readonly stats = new StatsTracker();
  readonly spells = PLAYER_SPELLS.map((s) => new PlayerSpell(s.def));
  selectedTowerId: string | null = 'turret';
  hoverTile: { tx: number; ty: number } | null = null;
  selectedTower: Tower | null = null;
  selectedSpellId: string | null = null; // when set, next click casts this spell
  score = 0;
  fps = 0;
  lastStars = 0;

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

  start(): void {
    this.grid = new Grid(this.levels.current);
    this.gold = BALANCE.startGold;
    this.lives = BALANCE.startLives;
    this.score = 0;
    this.lastStars = 0;
    this.towers.length = 0;
    this.enemies.length = 0;
    this.projectiles.length = 0;
    this.particles.clear();
    this.stats.reset();
    for (const sp of this.spells) sp.cooldown = 0;
    this.selectedTower = null;
    this.selectedSpellId = null;
    this.waves.reset();
    this.setPhase('playing');
    logger.info('Run started', { level: this.levels.levelNumber, name: this.levels.current.name });
  }

  goMenu(): void { this.setPhase('menu'); }
  goLevelSelect(): void { this.setPhase('levelSelect'); }

  selectLevel(i: number): void {
    this.levels.setLevel(i);
    this.grid = new Grid(this.levels.current);
    this.start();
  }

  advanceLevel(): void {
    this.save.recordLevelReached(this.levels.levelNumber + 1);
    if (!this.levels.hasNext) {
      logger.info('All levels cleared');
      this.setPhase('won');
      return;
    }
    this.levels.advance();
    this.start();
  }

  tryPlace(tx: number, ty: number): boolean {
    if (!this.selectedTowerId) return false;
    const def: TowerDef = getTowerDef(this.selectedTowerId);
    if (this.gold < def.cost) return false;
    if (!this.grid.isBuildable(tx, ty)) return false;
    if (this.towers.some((t) => t.tx === tx && t.ty === ty)) return false;
    this.gold -= def.cost;
    this.towers.push(new Tower(def, tx, ty, this.grid));
    this.stats.recordPlace();
    this.bus.emit('goldChanged', { gold: this.gold });
    this.bus.emit('towerPlaced', { tx, ty, id: def.id });
    return true;
  }

  upgradeTower(t: Tower): boolean {
    const step = t.nextUpgrade;
    if (!step || this.gold < step.cost) return false;
    this.gold -= step.cost;
    t.upgrade();
    this.stats.recordUpgrade();
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

  castSpell(id: string, target: Vec2): boolean {
    const sp = this.spells.find((s) => s.def.id === id);
    if (!sp) return false;
    if (!sp.cast(target, this)) return false;
    this.stats.recordSpell();
    this.bus.emit('goldChanged', { gold: this.gold });
    this.bus.emit('spellCast', { id, x: target.x, y: target.y });
    if (sp.def.damage && sp.def.radius) {
      this.particles.burst(target, 20, sp.def.color, 200, 0.6, 5);
    }
    return true;
  }

  update(dt: number): void {
    if (this.phase !== 'playing') return;
    this.stats.tick(dt);

    this.waves.update(dt, this.grid, this.enemies);
    this.bus.emit('waveChanged', { current: this.waves.current, total: this.waves.totalWaves });

    for (const t of this.towers) {
      const { target } = t.update(dt, this.enemies, this.grid);
      if (target && t.canFire()) {
        t.resetCooldown();
        this.projectiles.push(new Projectile(t.pos, target, t.def, t.damage));
      }
    }

    for (const p of this.projectiles) p.update(dt);
    this.combat.resolve(this.projectiles, this.enemies, this);
    this.compact(this.projectiles);

    this.movement.update(dt, this.enemies, this.grid, this);
    this.particles.update(dt);
    for (const sp of this.spells) sp.update(dt);

    if (this.lives <= 0) {
      this.setPhase('lost');
      this.save.recordScore(this.score);
      return;
    }
    if (this.waves.state === 'done' && this.enemies.length === 0) {
      this.lastStars = computeStars(this.lives);
      this.bus.emit('levelWon', { level: this.levels.levelNumber, stars: this.lastStars });
      const isNew = this.save.recordScore(this.score);
      logger.info('Level won', { score: this.score, stars: this.lastStars, isNewHigh: isNew });
      this.advanceLevel();
    }
  }

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
