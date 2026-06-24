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
import { AchievementSystem } from './Achievements';
import { TalentTree } from './Talents';
import { Difficulty, DIFFICULTIES, DifficultyDef } from '../config/Difficulty';
import { Vec2 } from '../engine/math/Vec2';
import { saveRun, clearRun, RunSnapshot } from '../utils/RunSave';
import { Analytics } from '../utils/Analytics';

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
  towerFire: { id: string; tx: number; ty: number };
}

export class GameState {
  grid: Grid;
  gold = 0;
  lives = 0;
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
  readonly achievements = new AchievementSystem();
  readonly talents = new TalentTree();
  readonly spells = PLAYER_SPELLS.map((s) => new PlayerSpell(s.def));
  readonly analytics = new Analytics();
  difficulty: Difficulty = 'normal';
  /** Endless mode: waves never end, run only ends on death. */
  endless = false;
  /** Seed of the current endless run (0 in scripted mode); shareable to reproduce. */
  endlessSeed = 0;

  get diffMul(): DifficultyDef { return DIFFICULTIES[this.difficulty]; }

  setDifficulty(d: Difficulty): void { this.difficulty = d; }
  selectedTowerId: string | null = 'turret';
  hoverTile: { tx: number; ty: number } | null = null;
  selectedTower: Tower | null = null;
  selectedSpellId: string | null = null; // when set, next click casts this spell
  score = 0;
  fps = 0;
  lastStars = 0;
  /** Combo streak: kills within 2s window. Resets on timeout. */
  comboCount = 0;
  comboTimer = 0;
  static readonly COMBO_WINDOW = 2; // seconds to keep combo alive

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
    const diff = DIFFICULTIES[this.difficulty];
    this.gold = BALANCE.startGold + diff.goldStartBonus;
    this.lives = BALANCE.startLives + Math.round(this.talents.multiplier('lives'));
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
    this.waves.endless = this.endless;
    if (this.endless) {
      // only pick a random seed if none was pre-set (challenge mode sets it before start())
      if (this.endlessSeed === 0) {
        this.endlessSeed = Math.floor(Math.random() * 0xffffffff) >>> 0;
      }
      this.waves.endlessSeed = this.endlessSeed;
      this.waves.reset(); // re-seed the endless RNG with the seed
      this.waves.setDifficulty(diff.hpMul, diff.countMul);
    } else {
      this.endlessSeed = 0;
      this.waves.setDifficulty(diff.hpMul, diff.countMul);
    }
    this.setPhase('playing');
    this.analytics.startSession();
    this.analytics.recordLevelStart(this.levels.levelNumber - 1);
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
    const tm = {
      damage: this.talents.multiplier('damage'),
      range: this.talents.multiplier('range'),
      firerate: this.talents.multiplier('firerate'),
    };
    this.towers.push(new Tower(def, tx, ty, this.grid, tm));
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
      this.particles.burst(target, 24, sp.def.color, 200, 0.65, 5);
      this.particles.shockwave(target, sp.def.radius, sp.def.color, 0.65);
    }
    return true;
  }

  update(dt: number): void {
    if (this.phase !== 'playing') return;
    this.stats.tick(dt);

    // combo decay
    if (this.comboCount > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.comboCount = 0;
    }

    this.waves.update(dt, this.grid, this.enemies);
    this.bus.emit('waveChanged', { current: this.waves.current, total: this.waves.totalWaves });

    // compute tower synergy neighbors (towers within 2 tiles of each other)
    for (const t of this.towers) {
      let neighbors = 0;
      for (const o of this.towers) {
        if (o === t) continue;
        if (Math.abs(o.tx - t.tx) + Math.abs(o.ty - t.ty) <= 2) neighbors++;
      }
      t.synergyNeighbors = neighbors;
    }

    for (const t of this.towers) {
      const { target } = t.update(dt, this.enemies, this.grid);
      if (target && t.canFire()) {
        t.resetCooldown();
        this.projectiles.push(new Projectile(t.pos, target, t.def, t.damage));
        this.bus.emit('towerFire', { id: t.def.id, tx: t.tx, ty: t.ty });
      }
    }

    for (const p of this.projectiles) p.update(dt);
    this.combat.resolve(this.projectiles, this.enemies, this);
    this.compact(this.projectiles);

    this.movement.update(dt, this.enemies, this.grid, this);
    this.particles.update(dt);
    for (const sp of this.spells) sp.update(dt);

    if (this.lives <= 0) {
      // award talent points even on defeat (endless: waves survived = progress)
      if (this.endless && this.waves.current > 0) {
        const stars = Math.min(3, Math.floor(this.waves.current / 4)); // 1 star per 4 waves, max 3
        this.talents.awardPoints(stars);
        this.achievements.recordStars(stars);
      this.analytics.recordEndlessRun(this.waves.current);
      }
      this.analytics.recordDeath(this.levels.levelNumber, this.waves.current, this.difficulty);
      this.analytics.endSession();
      this.save.recordScore(this.score);
      this.setPhase('lost');
      return;
    }
    if (this.waves.state === 'done' && this.enemies.length === 0) {
      // endless never reaches 'done' (WaveManager keeps generating); this branch
      // is the scripted-campaign victory path only.
      this.lastStars = computeStars(this.lives);
      this.talents.awardPoints(this.lastStars);
      this.achievements.recordStars(this.lastStars);
      this.achievements.recordLevelComplete();
      this.bus.emit('levelWon', { level: this.levels.levelNumber, stars: this.lastStars });
      const newly = this.achievements.newlyUnlocked();
      if (newly.length > 0) logger.info('Achievements unlocked', newly.map((a) => a.id));
      this.save.recordStars(this.levels.levelNumber, this.lastStars);
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

  /** Serialize current run for mid-run save (called on wave boundaries). */
  snapshot(): RunSnapshot {
    return {
      v: 1,
      levelIndex: this.levels.levelNumber - 1,
      difficulty: this.difficulty,
      endless: this.endless,
      endlessSeed: this.endlessSeed,
      gold: this.gold,
      lives: this.lives,
      score: this.score,
      waveCurrent: this.waves.current,
      towers: this.towers.map(t => ({
        id: t.def.id, tx: t.tx, ty: t.ty, level: t.level,
        strategy: t.strategy, invested: t.sellValue / BALANCE.tower.sellRefund,
        dmgMul: t.damage / t.def.damage / (1 + Math.min(t.synergyNeighbors, 4) * 0.10),
        rangeMul: t.range / t.def.range,
        fireRateMul: t.fireRate / t.def.fireRate / (1 + Math.min(t.synergyNeighbors, 4) * 0.08),
      })),
      spellCooldowns: this.spells.map(s => s.cooldown),
      stats: {
        kills: this.stats.get().kills,
        towersPlaced: this.stats.get().towersPlaced,
        upgrades: this.stats.get().upgrades,
        spellsCast: this.stats.get().spellsCast,
        goldEarned: this.stats.get().goldEarned,
        damageDealt: this.stats.get().damageDealt,
        durationSec: this.stats.get().durationSec,
      },
    };
  }

  /** Auto-save on wave boundary. */
  autoSave(): void {
    if (this.phase === 'playing') saveRun(this.snapshot());
  }

  /** Clear mid-run save (on game end or manual reset). */
  clearSave(): void {
    clearRun();
  }
}
