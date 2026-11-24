// Top-level game state machine + economy/lives + owning all gameplay objects.
// Orchestrates systems (combat/movement), economy, spells, particles, stats.

import { Grid } from './grid/Grid';
import { Tower } from './towers/Tower';
import { Enemy } from './enemies/Enemy';
import { getEnemyDef } from './enemies/EnemyRegistry';
import { Projectile } from './projectiles/Projectile';
import { WaveManager } from './waves/WaveManager';
import { CombatSystem } from './systems/CombatSystem';
import { MovementSystem } from './systems/MovementSystem';
import { LevelManager } from './grid/LevelManager';
import { getTowerDef, TowerDef } from './towers/TowerRegistry';
import { BALANCE } from '../config/balance';
import { EventBus } from '../utils/EventBus';
import { SaveSystem, type RunResult, type RunSettlement } from '../utils/SaveSystem';
import { logger } from '../utils/logger';
import { ParticleSystem } from './effects/ParticleSystem';
import { PlayerSpell, PLAYER_SPELLS } from './spells/PlayerSpells';
import { StatsTracker } from './StatsTracker';
import { computeStars } from './Stars';
import { AchievementSystem, AchievementDef } from './Achievements';
import { STANDARD_TALENT_LOADOUT, talentEffect, TalentTree, type TalentLoadout } from './Talents';
import { Difficulty, DIFFICULTIES, DifficultyDef } from '../config/Difficulty';
import { Vec2 } from '../engine/math/Vec2';
import { saveRun, clearRun, runIdentity, clearRunSettlement, loadRunSettlements, stageRunSettlement, type LegacyRunSnapshot, type RunSnapshot } from '../utils/RunSave';
import { Analytics, type IntroAction } from '../utils/Analytics';
import { dailyDateStr, dailySeed } from '../utils/DailyChallenge';
import { weeklyMode, weekKey, weeklySeed, type WeeklyMode } from '../utils/WeeklyMode';
import { DEFAULT_WEEKLY_RULES, weeklyRules, type WeeklyRuleSet } from '../utils/WeeklyRules';
import { encodeChallenge, type ChallengeRules } from '../utils/ChallengeCode';
import { CURRENT_RUN_VERSION, type RunOrigin, type RunVersion } from '../utils/RunRecords';

export type Phase = 'menu' | 'levelSelect' | 'playing' | 'won' | 'lost';

export interface GameEvents {
  runStarted: void;
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

export interface BattleStorage {
  checkpoint(snapshot: RunSnapshot): void;
  settle(run: RunResult): Promise<RunSettlement | null>;
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
  readonly save: SaveSystem;
  readonly particles = new ParticleSystem();
  readonly stats = new StatsTracker();
  readonly achievements = new AchievementSystem();
  readonly talents: TalentTree;
  private runTalentRanks: TalentLoadout = STANDARD_TALENT_LOADOUT;
  private variedOpener = false;
  private runId = '';
  private runVersion: RunVersion | null = CURRENT_RUN_VERSION;
  private missionDate = '';
  private origin: RunOrigin = { kind: 'campaign', level: 1, difficulty: 'normal' };
  get runOrigin(): RunOrigin { return this.origin; }
  get clearedWaves(): number { return this.wavesClearedThrough; }
  get objectiveDate(): string { return this.missionDate || dailyDateStr(); }
  private readonly pendingResults: Map<string, RunResult>;
  private lastKnownWave = 0;
  private wavesClearedThrough = 0;
  private achievementFlushTimer = 0;
  private analyticsSessionActive = false;
  readonly spells = PLAYER_SPELLS.map((s) => new PlayerSpell(s.def));
  readonly analytics = new Analytics();
  difficulty: Difficulty = 'normal';
  endless = false;
  endlessSeed = 0;
  activeWeeklyMode: WeeklyMode | null = null;
  private dailyChallengeDate: string | null = null;
  private activeWeeklyRules: WeeklyRuleSet = DEFAULT_WEEKLY_RULES;

  get weeklyModeActive(): boolean { return this.activeWeeklyMode !== null; }

  get diffMul(): DifficultyDef { return DIFFICULTIES[this.difficulty]; }
  get maxLives(): number { return BALANCE.startLives + this.talentMultiplier('lives'); }
  get repairAllowed(): boolean { return !this.activeWeeklyRules.repairDisabled; }

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
  lastRunNewModeRecord = false;
  lastRunMissionCredits = 0;
  lastRunWeeklyCredits = 0;
  lastMissionDate: string | null = null;
  comboCount = 0;
  comboTimer = 0;
  static readonly COMBO_WINDOW = 2;

  constructor(private readonly storage?: BattleStorage) {
    this.save = new SaveSystem(Boolean(storage));
    this.talents = new TalentTree(this.save);
    this.pendingResults = new Map(storage ? [] : loadRunSettlements().map(run => [run.id, run]));
    this.grid = new Grid(this.levels.current);
    this.waves = new WaveManager(BALANCE.waveCount);
    this.retrySettlement();
    this.achievements.syncCampaign(this.save.get().levelStars);
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
    this.lastRunNewModeRecord = false;
    this.lastRunMissionCredits = 0;
    this.lastRunWeeklyCredits = 0;
    this.lastMissionDate = null;
  }

  private startAnalyticsSession(): void {
    if (this.analyticsSessionActive) return;
    this.analytics.startSession(this.runId, this.origin);
    this.analyticsSessionActive = true;
  }

  private endAnalyticsSession(): void {
    if (!this.analyticsSessionActive) return;
    this.analytics.endSession();
    this.analyticsSessionActive = false;
  }

  startEndless(seed = 0): void {
    if (seed) {
      this.startSharedChallenge({ seed, difficulty: 'normal', weeklyKey: null, talentRanks: STANDARD_TALENT_LOADOUT, variedOpener: true });
      return;
    }
    this.endless = true;
    this.endlessSeed = seed;
    this.dailyChallengeDate = null;
    this.setDifficulty('normal');
    this.selectLevel(0);
  }

  startDaily(date = dailyDateStr()): void {
    this.endless = true;
    this.endlessSeed = dailySeed(date);
    this.dailyChallengeDate = date;
    this.origin = { kind: 'daily', period: date };
    this.runVersion = CURRENT_RUN_VERSION;
    this.variedOpener = true;
    this.levels.setLevel(0);
    this.setDifficulty('normal');
    this.startNewRun(weekKey(new Date(`${date}T00:00:00Z`)), STANDARD_TALENT_LOADOUT);
  }

  startWeekly(week = weekKey()): void {
    this.endless = true;
    this.endlessSeed = weeklySeed(week);
    this.dailyChallengeDate = null;
    this.origin = { kind: 'weekly', period: week };
    this.runVersion = CURRENT_RUN_VERSION;
    this.variedOpener = true;
    this.levels.setLevel(0);
    this.setDifficulty('normal');
    this.startNewRun(week, STANDARD_TALENT_LOADOUT);
  }

  startSharedChallenge(rules: ChallengeRules): void {
    this.endless = true;
    this.endlessSeed = rules.seed;
    this.dailyChallengeDate = null;
    this.variedOpener = rules.variedOpener;
    this.origin = { kind: 'custom', code: encodeChallenge(rules) };
    this.runVersion = rules.version === undefined ? CURRENT_RUN_VERSION : rules.version;
    this.levels.setLevel(0);
    this.setDifficulty(rules.difficulty);
    this.startNewRun(rules.weeklyKey, rules.talentRanks);
  }

  get challengeRules(): ChallengeRules {
    return {
      seed: this.endlessSeed, weeklyKey: this.activeWeeklyMode?.weekKey ?? null,
      difficulty: this.difficulty, talentRanks: this.runTalentRanks, variedOpener: this.variedOpener, version: this.runVersion,
    };
  }

  talentMultiplier(id: string): number { return talentEffect(this.runTalentRanks, id); }

  start(): void {
    this.variedOpener = this.endless;
    if (!this.endless) this.endlessSeed = 0;
    if (this.endless && this.endlessSeed === 0) this.endlessSeed = Math.floor(Math.random() * 0xffffffff) + 1;
    this.dailyChallengeDate = null;
    this.runVersion = CURRENT_RUN_VERSION;
    this.origin = this.endless ? { kind: 'endless' }
      : { kind: 'campaign', level: this.levels.levelNumber, difficulty: this.difficulty };
    this.startNewRun(null);
  }

  restart(): void {
    // A saved official battle can finish in its original period; a new attempt after it expires is practice.
    if ((this.origin.kind === 'daily' && this.origin.period !== dailyDateStr())
        || (this.origin.kind === 'weekly' && this.origin.period !== weekKey())) {
      this.origin = { kind: 'custom', code: encodeChallenge(this.challengeRules) };
      this.dailyChallengeDate = null;
    }
    this.startNewRun(this.activeWeeklyMode?.weekKey ?? null, this.runTalentRanks);
  }

  private startNewRun(weeklyKey: string | null, talentRanks = this.talents.loadout()): void {
    this.retrySettlement();
    this.endAnalyticsSession();
    this.achievements.flush();
    this.runId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.runTalentRanks = Object.freeze([...talentRanks]);
    this.missionDate = this.origin.kind === 'daily' ? this.origin.period : dailyDateStr();
    this.resetRun(weeklyKey);
    this.setPhase('playing');
    this.startAnalyticsSession();
    if (!this.endless) this.analytics.recordLevelStart(this.levels.levelNumber - 1);
    this.bus.emit('runStarted', undefined);
    logger.info('Run started', { level: this.levels.levelNumber, name: this.levels.current.name, weeklyMode: this.activeWeeklyMode?.id ?? 'none' });
  }

  private resetRun(weeklyKey: string | null): void {
    this.lastKnownWave = 0;
    this.wavesClearedThrough = 0;
    this.achievementFlushTimer = 0;
    this.grid = new Grid(this.levels.current);
    const diff = DIFFICULTIES[this.difficulty];
    this.activeWeeklyMode = weeklyKey === null ? null : weeklyMode(weeklyKey);
    this.activeWeeklyRules = weeklyRules(this.activeWeeklyMode);

    this.gold = Math.max(0, Math.round((BALANCE.startGold + diff.goldStartBonus) * this.activeWeeklyRules.startGoldMul));
    this.lives = this.maxLives;
    this.score = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.lastStars = 0;
    this.resetRunRecordFlags();
    this.towers.length = 0;
    this.enemies.length = 0;
    this.projectiles.length = 0;
    this.particles.clear();
    this.stats.reset();
    for (const sp of this.spells) sp.cooldown = 0;
    this.selectedTowerId = 'turret';
    this.selectedTower = null;
    this.selectedSpellId = null;
    this.hoverTile = null;
    this.waves.endless = this.endless;
    this.waves.endlessSeed = this.endlessSeed;
    this.waves.variedOpener = this.variedOpener;
    this.waves.autoSend = false;
    this.waves.reset();
    this.waves.setDifficulty(diff.hpMul, diff.countMul);
    this.waves.setWeeklyRules(this.activeWeeklyRules);
  }

  goMenu(): void {
    if (this.phase === 'playing') {
      this.autoSave();
      this.endAnalyticsSession();
    }
    this.setPhase('menu');
  }

  goLevelSelect(): void { this.setPhase('levelSelect'); }

  selectLevel(i: number): void {
    this.levels.setLevel(i);
    this.start();
  }

  advanceLevel(): void {
    if (!this.storage) this.save.recordLevelReached(this.levels.levelNumber + 1);
    if (!this.levels.hasNext) {
      this.goLevelSelect();
      return;
    }
    this.levels.advance();
    this.start();
  }

  tryPlace(tx: number, ty: number): boolean {
    if (!this.selectedTowerId) return false;
    const def: TowerDef = getTowerDef(this.selectedTowerId);
    if (!this.canPlaceTower(tx, ty, def)) return false;
    this.gold -= def.cost;
    const tm = {
      damage: this.talentMultiplier('damage'),
      range: this.talentMultiplier('range'),
      firerate: this.talentMultiplier('firerate'),
    };
    this.towers.push(new Tower(def, tx, ty, this.grid, tm));
    this.updateSynergy();
    this.stats.recordPlace();
    this.analytics.recordTowerPlace(def.id);
    this.achievements.recordPlace();
    this.bus.emit('goldChanged', { gold: this.gold });
    this.bus.emit('towerPlaced', { tx, ty, id: def.id });
    return true;
  }

  canPlaceTower(tx: number, ty: number, def: TowerDef): boolean {
    return this.phase === 'playing' && this.gold >= def.cost && this.grid.isBuildable(tx, ty)
      && (this.activeWeeklyRules.maxTowers === null || this.towers.length < this.activeWeeklyRules.maxTowers)
      && !this.towers.some(tower => tower.tx === tx && tower.ty === ty);
  }

  upgradeTower(t: Tower): boolean {
    if (this.phase !== 'playing' || !this.towers.includes(t)) return false;
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
    const i = this.towers.indexOf(t);
    if (this.phase !== 'playing' || i < 0) return;
    const refund = t.sellValue;
    this.gold += refund;
    this.towers.splice(i, 1);
    this.updateSynergy();
    if (this.selectedTower === t) this.selectedTower = null;
    this.bus.emit('goldChanged', { gold: this.gold });
    this.bus.emit('towerSold', { tx: t.tx, ty: t.ty, refund });
  }

  castSpell(id: string, target: Vec2): boolean {
    if (this.phase !== 'playing') return false;
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

  recordActiveTime(seconds: number): void {
    if (this.phase === 'playing') this.analytics.tickActive(seconds, this.origin);
  }

  recordFirstAction(action: IntroAction): void { this.analytics.recordFirstAction(action, this.runId, this.origin); }

  update(dt: number): void {
    if (this.phase !== 'playing') return;
    this.stats.tick(dt);
    this.analytics.tickSimulation(dt, this.origin);

    if (this.comboCount > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.comboCount = 0;
    }

    this.waves.update(dt, this.grid, this.enemies);
    if (this.waves.current !== this.lastKnownWave) {
      this.lastKnownWave = this.waves.current;
      this.bus.emit('waveChanged', { current: this.waves.current, total: this.waves.totalWaves });
    }

    for (const t of this.towers) {
      const target = t.update(dt, this.enemies, this.grid);
      if (target) {
        t.resetCooldown();
        this.projectiles.push(new Projectile(t.pos, target, t.def, t.damage));
        this.bus.emit('towerFire', { id: t.def.id, tx: t.tx, ty: t.ty });
      }
    }

    for (const p of this.projectiles) {
      p.update(dt);
      if (!p.dead && Math.random() < 30 * dt) this.particles.burst(p.pos, 1, p.color, 30, 0.25, p.splash ? 2 : 1.2);
    }
    this.combat.resolve(this.projectiles, this.enemies, this);
    this.compact(this.projectiles);

    this.movement.update(dt, this.enemies, this.grid, this);
    if (this.lives > 0) this.recordClearedWaves();
    this.particles.update(dt);
    for (const sp of this.spells) sp.update(dt);

    if (this.lives <= 0 || (this.waves.state === 'done' && this.enemies.length === 0)) {
      this.finishRun(this.lives > 0);
      return;
    }
    this.checkAchievements();
    this.achievementFlushTimer += dt;
    if (this.achievementFlushTimer >= 5) {
      this.achievementFlushTimer = 0;
      this.achievements.flush();
    }
  }

  private recordClearedWaves(): void {
    let cleared = this.waves.current - Number(this.waves.inProgress);
    if (cleared <= this.wavesClearedThrough) return;
    for (const enemy of this.enemies) {
      if (enemy.waveNumber > this.wavesClearedThrough) cleared = Math.min(cleared, enemy.waveNumber - 1);
    }
    if (cleared > this.wavesClearedThrough) {
      this.achievements.recordWaves(cleared - this.wavesClearedThrough);
      this.wavesClearedThrough = cleared;
    }
  }

  private finishRun(won: boolean): void {
    const level = this.levels.levelNumber;
    const wave = this.waves.current;
    this.lastStars = won ? computeStars(this.lives) : 0;
    const weekly = this.activeWeeklyMode;
    const run: RunResult = {
      id: this.runId, score: this.score, wave, missionDate: this.missionDate,
      origin: this.origin, scoreVersion: this.runVersion?.score ?? 0, clearedWave: this.wavesClearedThrough,
      missions: { wave, score: this.score, stats: { ...this.stats.get() } },
      campaign: won ? { level, stars: this.lastStars } : null,
      endless: this.endless, dailyDate: this.dailyChallengeDate, weekly: weekly && { id: weekly.id, reward: weekly.reward },
    };
    this.lastMissionDate = run.missionDate;
    if (this.storage) {
      void this.storage.settle(run).then(result => {
        if (result && this.runId === run.id) this.applySettlement(run, result);
      }).catch(error => logger.warn('Settlement failed', error));
    } else {
      const staged = stageRunSettlement(run);
      const result = this.save.settleRun(staged);
      if (result.persisted) this.clearSettlement(staged.id);
      else this.pendingResults.set(staged.id, staged);
      this.applySettlement(staged, result);
    }
    this.endAnalyticsSession();
    this.setPhase(won ? 'won' : 'lost');
  }

  private applySettlement(run: RunResult, result: RunSettlement): void {
    this.lastRunNewHighScore = result.highScore;
    this.lastRunNewLevelScore = result.levelScore;
    this.lastRunStarUpgrade = result.stars;
    this.lastRunNewDailyRecord = result.dailyRecord;
    this.lastRunNewModeRecord = (run.origin?.kind === 'weekly' || run.origin?.kind === 'custom') && Boolean(result.modeRecord);
    this.lastRunNewEndlessRecord = result.endlessRecord;
    this.lastRunMissionCredits = result.missionCredits;
    this.lastRunWeeklyCredits = result.weeklyCredits;

    if (result.applied) {
      if (run.origin) this.analytics.recordOutcome(run.origin, Boolean(run.campaign), run.wave);
      if (run.campaign) {
        this.achievements.syncCampaign(this.save.get().levelStars, true);
        this.analytics.recordLevelWin(run.campaign.level - 1);
        this.bus.emit('levelWon', { level: run.campaign.level, stars: run.campaign.stars });
      } else if (run.endless) {
        if (run.wave > 0 && (!run.origin || run.origin.kind === 'endless')) this.analytics.recordEndlessRun(run.wave);
      } else {
        this.analytics.recordDeath(this.levels.levelNumber, run.wave, this.difficulty);
      }
    }
    this.checkAchievements();
    this.achievements.flush();
  }

  private retrySettlement(): void {
    for (const run of this.pendingResults.values()) {
      if (this.save.settleRun(run).persisted) this.clearSettlement(run.id);
    }
  }

  private clearSettlement(runId: string): void {
    clearRun(runId);
    clearRunSettlement(runId);
    this.pendingResults.delete(runId);
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

  private updateSynergy(): void {
    for (const tower of this.towers) tower.synergyNeighbors = 0;
    for (let i = 0; i < this.towers.length; i++) {
      const tower = this.towers[i];
      for (let j = i + 1; j < this.towers.length; j++) {
        const other = this.towers[j];
        if (Math.abs(other.tx - tower.tx) + Math.abs(other.ty - tower.ty) <= tower.synergyRange) {
          tower.synergyNeighbors++;
          other.synergyNeighbors++;
        }
      }
    }
  }

  snapshot(): RunSnapshot {
    const enemies = this.enemies.filter(enemy => !enemy.dead);
    const enemyIndexes = new Map(enemies.map((enemy, index) => [enemy, index]));
    const { startedAt: _, ...stats } = this.stats.get();
    return {
      v: 2,
      runId: this.runId,
      origin: this.origin,
      version: this.runVersion,
      missionDate: this.missionDate,
      activeSec: this.analytics.activeSeconds,
      talentRanks: this.runTalentRanks,
      variedOpener: this.variedOpener,
      wavesClearedThrough: this.wavesClearedThrough,
      levelIndex: this.levels.levelNumber - 1,
      difficulty: this.difficulty,
      endless: this.endless,
      endlessSeed: this.endlessSeed,
      weeklyKey: this.activeWeeklyMode?.weekKey ?? null,
      dailyDate: this.dailyChallengeDate,
      gold: this.gold,
      lives: this.lives,
      score: this.score,
      waves: this.waves.snapshot(),
      towers: this.towers.map(tower => tower.snapshot()),
      enemies: enemies.map(enemy => enemy.snapshot()),
      projectiles: this.projectiles.filter(projectile => !projectile.dead).map(projectile => projectile.snapshot(enemyIndexes)),
      spellCooldowns: this.spells.map(s => s.cooldown),
      stats,
      comboCount: this.comboCount,
      comboTimer: Math.max(0, this.comboTimer),
    };
  }

  restore(snapshot: RunSnapshot | LegacyRunSnapshot): boolean {
    const id = runIdentity(snapshot);
    if (this.pendingResults.has(id)) return false;
    if (this.save.hasSettledRun(id)) {
      if (!this.storage) clearRun(id);
      return false;
    }
    this.runId = id;
    this.variedOpener = snapshot.v === 2 && snapshot.variedOpener === true;
    this.runTalentRanks = Object.freeze([...(snapshot.v === 2 && snapshot.talentRanks ? snapshot.talentRanks : this.talents.loadout())]);
    this.levels.setLevel(snapshot.levelIndex);
    this.difficulty = snapshot.difficulty;
    this.endless = snapshot.endless;
    this.endlessSeed = snapshot.endlessSeed;
    this.runVersion = snapshot.v === 2 ? snapshot.version ?? null : null;
    this.origin = (snapshot.v === 2 && snapshot.origin) || (snapshot.endless ? { kind: 'legacy' }
      : { kind: 'campaign', level: this.levels.levelNumber, difficulty: snapshot.difficulty });
    const today = dailyDateStr();
    this.missionDate = snapshot.v === 2 ? snapshot.missionDate ?? today : today;
    const legacyDaily = snapshot.endless && snapshot.endlessSeed === dailySeed(today) ? today : null;
    this.dailyChallengeDate = snapshot.v === 2 ? snapshot.dailyDate : legacyDaily;
    const legacyWeekly = snapshot.v === 1 && snapshot.endless && (snapshot.weeklyModeActive ?? snapshot.endlessSeed !== 0);
    this.resetRun(snapshot.v === 2 ? snapshot.weeklyKey : legacyWeekly ? weekKey() : null);
    this.gold = snapshot.gold;
    this.lives = snapshot.lives;
    this.score = snapshot.score;
    this.stats.restore(snapshot.stats);
    for (const [i, spell] of this.spells.entries()) spell.cooldown = Math.max(0, snapshot.spellCooldowns[i] ?? 0);
    for (const saved of snapshot.towers) {
      const tower = new Tower(getTowerDef(saved.id), saved.tx, saved.ty, this.grid);
      tower.restore({ cooldown: 0, angle: 0, ...saved });
      this.towers.push(tower);
    }
    this.updateSynergy();
    if (snapshot.v === 1) {
      this.waves.restartSavedWave(snapshot.waveCurrent);
    } else {
      this.waves.restore(snapshot.waves);
      this.comboCount = snapshot.comboCount;
      this.comboTimer = snapshot.comboTimer;
      for (const enemy of snapshot.enemies) this.enemies.push(Enemy.restore(getEnemyDef(enemy.id), enemy, snapshot.waves.current));
      for (const shot of snapshot.projectiles) {
        const target = shot.targetIndex === null ? null : this.enemies[shot.targetIndex];
        this.projectiles.push(Projectile.restore(getTowerDef(shot.towerId), target, shot));
      }
    }
    this.lastKnownWave = this.waves.current;
    this.wavesClearedThrough = snapshot.v === 2 && snapshot.wavesClearedThrough !== undefined
      ? snapshot.wavesClearedThrough : Math.max(0, this.waves.current - 1);
    this.analytics.resumeSession(snapshot.v === 2 ? snapshot.activeSec ?? 0 : 0);
    this.analyticsSessionActive = true;
    this.setPhase('playing');
    return true;
  }

  autoSave(replace = false): void {
    this.retrySettlement();
    this.achievements.flush();
    if (this.phase === 'playing' && this.lives > 0 && !this.save.hasSettledRun(this.runId)) {
      const snapshot = this.snapshot();
      if (this.storage) this.storage.checkpoint(snapshot);
      else saveRun(snapshot, replace);
      this.analytics.endSession();
    }
  }
}
