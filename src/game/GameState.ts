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
import { AchievementSystem, AchievementDef } from './Achievements';
import { TalentTree } from './Talents';
import { Difficulty, DIFFICULTIES, DifficultyDef } from '../config/Difficulty';
import { Vec2 } from '../engine/math/Vec2';
import { saveRun, clearRun, RunSnapshot } from '../utils/RunSave';
import { Analytics } from '../utils/Analytics';
import { dailySeed } from '../utils/DailyChallenge';
import { weeklyMode, type WeeklyMode } from '../utils/WeeklyMode';
import { DEFAULT_WEEKLY_RULES, weeklyRules, type WeeklyRuleSet } from '../utils/WeeklyRules';

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
  achievementUnlocked: AchievementDef;
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
  private lastKnownWave = 0;
  private analyticsSessionActive = false;
  readonly spells = PLAYER_SPELLS.map((s) => new PlayerSpell(s.def));
  readonly analytics = new Analytics();
  difficulty: Difficulty = 'normal';
  endless = false;
  endlessSeed = 0;
  weeklyModeActive = false;
  activeWeeklyMode: WeeklyMode | null = null;
  private activeWeeklyRules: WeeklyRuleSet = DEFAULT_WEEKLY_RULES;

  get diffMul(): DifficultyDef { return DIFFICULTIES[this.difficulty]; }

  setDifficulty(d: Difficulty): void { this.difficulty = d; }
  selectedTowerId: string | null = 'turret';
  hoverTile: { tx: number; ty: number } | null = null;
  selectedTower: Tower | null = null;
  selectedSpellId: string | null = null;
  score = 0;
  fps = 0;
  lastStars = 0;
  lastRunNewHighScore = false;
  lastRunNewLevelScore = false;
  lastRunStarUpgrade = false;
  lastRunNewEndlessRecord = false;
  lastRunNewDailyRecord = false;
  lastRunMissionCredits = 0;
  lastRunWeeklyCredits = 0;
  comboCount = 0;
  comboTimer = 0;
  static readonly COMBO_WINDOW = 2;

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

  private resetRunRecordFlags(): void {
    this.lastRunNewHighScore = false;
    this.lastRunNewLevelScore = false;
    this.lastRunStarUpgrade = false;
    this.lastRunNewEndlessRecord = false;
    this.lastRunNewDailyRecord = false;
    this.lastRunMissionCredits = 0;
    this.lastRunWeeklyCredits = 0;
  }

  private startAnalyticsSession(): void {
    if (this.analyticsSessionActive) return;
    this.analytics.startSession();
    this.analyticsSessionActive = true;
  }

  private endAnalyticsSession(): void {
    if (!this.analyticsSessionActive) return;
    this.analytics.endSession();
    this.analyticsSessionActive = false;
  }

  private configureWeeklyRules(): void {
    this.activeWeeklyMode = this.weeklyModeActive ? weeklyMode() : null;
    this.activeWeeklyRules = this.activeWeeklyMode ? weeklyRules(this.activeWeeklyMode) : DEFAULT_WEEKLY_RULES;
    this.waves.setWeeklyRules(this.activeWeeklyRules);
  }

  start(): void {
    this.lastKnownWave = 0;
    this.grid = new Grid(this.levels.current);
    const diff = DIFFICULTIES[this.difficulty];

    if (this.endless) {
      if (this.endlessSeed === 0) {
        this.weeklyModeActive = false;
        this.endlessSeed = Math.floor(Math.random() * 0xffffffff) >>> 0;
      } else {
        this.weeklyModeActive = true;
      }
    } else {
      this.weeklyModeActive = false;
    }
    this.configureWeeklyRules();

    this.gold = Math.max(0, Math.round((BALANCE.startGold + diff.goldStartBonus) * this.activeWeeklyRules.startGoldMul));
    this.lives = BALANCE.startLives + Math.round(this.talents.multiplier('lives'));
    this.score = 0;
    this.lastStars = 0;
    this.resetRunRecordFlags();
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
      this.waves.endlessSeed = this.endlessSeed;
      this.waves.reset();
      this.waves.setDifficulty(diff.hpMul, diff.countMul);
    } else {
      this.endlessSeed = 0;
      this.waves.setDifficulty(diff.hpMul, diff.countMul);
    }
    this.waves.setWeeklyRules(this.activeWeeklyRules);
    this.setPhase('playing');
    this.startAnalyticsSession();
    this.analytics.recordLevelStart(this.levels.levelNumber - 1);
    logger.info('Run started', { level: this.levels.levelNumber, name: this.levels.current.name, weeklyMode: this.activeWeeklyMode?.id ?? 'none' });
  }

  goMenu(): void {
    if (this.phase === 'playing') this.endAnalyticsSession();
    this.setPhase('menu');
  }

  goLevelSelect(): void { this.setPhase('levelSelect'); }

  selectLevel(i: number): void {
    this.levels.setLevel(i);
    this.grid = new Grid(this.levels.current);
    this.start();
  }

  advanceLevel(): void {
    this.save.recordLevelReached(this.levels.levelNumber + 1);
    if (!this.levels.hasNext) {
      this.goLevelSelect();
      return;
    }
    this.levels.advance();
    this.start();
  }

  tryPlace(tx: number, ty: number): boolean {
    if (!this.selectedTowerId) return false;
    if (this.activeWeeklyRules.maxTowers !== null && this.towers.length >= this.activeWeeklyRules.maxTowers) return false;
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
    this.analytics.recordTowerPlace(def.id);
    this.achievements.recordPlace();
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
    this.achievements.recordUpgrade();
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
    if (this.activeWeeklyRules.repairDisabled && id === 'repair') return false;
    const sp = this.spells.find((s) => s.def.id === id);
    if (!sp) return false;
    if (!sp.cast(target, this)) return false;
    this.stats.recordSpell();
    this.analytics.recordSpellCast(id);
    this.achievements.recordSpell();
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
    this.analytics.tick(dt);

    if (this.comboCount > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.comboCount = 0;
    }

    this.waves.update(dt, this.grid, this.enemies);
    if (this.waves.current !== this.lastKnownWave) {
      if (this.lastKnownWave > 0) this.achievements.recordWave();
      this.lastKnownWave = this.waves.current;
      this.bus.emit('waveChanged', { current: this.waves.current, total: this.waves.totalWaves });
    }

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

    for (const p of this.projectiles) {
      p.update(dt);
      if (Math.random() < 30 * dt) this.particles.burst(p.pos, 1, p.color, 30, 0.25, p.splash ? 2 : 1.2);
    }
    this.combat.resolve(this.projectiles, this.enemies, this);
    this.compact(this.projectiles);

    this.movement.update(dt, this.enemies, this.grid, this);
    this.particles.update(dt);
    for (const sp of this.spells) sp.update(dt);

    if (this.lives <= 0) {
      const runStats = this.stats.get();
      const today = new Date().toISOString().slice(0, 10);
      this.lastRunMissionCredits = this.save.recordDailyMissionProgress(today, {
        wave: this.waves.current,
        score: this.score,
        stats: runStats,
      });
      this.lastRunWeeklyCredits = this.save.recordWeeklyRun(this.activeWeeklyMode?.id, this.waves.current, this.activeWeeklyMode?.reward ?? 0);
      if (this.endless && this.waves.current > 0) {
        const stars = Math.min(3, Math.floor(this.waves.current / 4));
        this.talents.awardPoints(stars);
        this.achievements.recordStars(stars);
        this.analytics.recordEndlessRun(this.waves.current);

        if (this.endlessSeed === dailySeed()) {
          this.lastRunNewDailyRecord = this.save.recordDailyRun(this.score, this.waves.current, today);
        } else {
          this.lastRunNewEndlessRecord = this.save.recordEndlessRun(this.score, this.waves.current);
        }
      }
      this.analytics.recordDeath(this.levels.levelNumber, this.waves.current, this.difficulty);
      this.endAnalyticsSession();
      this.lastRunNewHighScore = this.save.recordScore(this.score);
      this.setPhase('lost');
      return;
    }

    if (this.waves.state === 'done' && this.enemies.length === 0) {
      const runStats = this.stats.get();
      this.lastStars = computeStars(this.lives);
      this.talents.awardPoints(this.lastStars);
      this.achievements.recordStars(this.lastStars);
      this.achievements.recordLevelComplete();
      this.analytics.recordLevelWin(this.levels.levelNumber - 1);
      const today = new Date().toISOString().slice(0, 10);
      this.lastRunMissionCredits = this.save.recordDailyMissionProgress(today, {
        wave: this.waves.current,
        score: this.score,
        stats: runStats,
      });
      this.lastRunWeeklyCredits = this.save.recordWeeklyRun(this.activeWeeklyMode?.id, this.waves.current, this.activeWeeklyMode?.reward ?? 0);
      this.bus.emit('levelWon', { level: this.levels.levelNumber, stars: this.lastStars });
      const newly = this.achievements.newlyUnlocked();
      if (newly.length > 0) logger.info('Achievements unlocked', newly.map((a) => a.id));
      this.save.recordLevelReached(this.levels.levelNumber + 1);
      this.lastRunStarUpgrade = this.save.recordStars(this.levels.levelNumber, this.lastStars);
      this.lastRunNewLevelScore = this.save.recordLevelScore(this.levels.levelNumber, this.score);
      this.lastRunNewHighScore = this.save.recordScore(this.score);
      logger.info('Level won', {
        score: this.score,
        stars: this.lastStars,
        isNewHigh: this.lastRunNewHighScore,
        isNewLevelScore: this.lastRunNewLevelScore,
        isStarUpgrade: this.lastRunStarUpgrade,
        hasNext: this.levels.hasNext,
      });
      this.endAnalyticsSession();
      this.setPhase('won');
      return;
    }
    this.checkAchievements();
  }

  checkAchievements(): void {
    const newly = this.achievements.newlyUnlocked();
    if (newly.length > 0) {
      for (const ach of newly) this.bus.emit('achievementUnlocked', ach);
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

  snapshot(): RunSnapshot {
    return {
      v: 1,
      levelIndex: this.levels.levelNumber - 1,
      difficulty: this.difficulty,
      endless: this.endless,
      endlessSeed: this.endlessSeed,
      weeklyModeActive: this.weeklyModeActive,
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

  autoSave(): void {
    if (this.phase === 'playing') saveRun(this.snapshot());
  }

  clearSave(): void {
    clearRun();
  }
}
