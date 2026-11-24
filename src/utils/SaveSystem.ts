// Save system: persists meta-progression such as unlocks, high score, reached level,
// level stars, level scores, endless records, and daily challenge records.
// Mid-run snapshots live separately in RunSave.ts.

import { load, save } from './storage';
import { LEVELS } from '../game/grid/LevelManager';
import { dailyMissions, evaluateMissions, type MissionRunSnapshot } from './DailyMissions';
import { CURRENT_SCORE, isScoreRecord, runRecordKey, type RunOrigin, type ScoreRecord } from './RunRecords';
import { WEEKLY_REWARD_WAVE, weeklyMode } from './WeeklyMode';

export interface SaveData {
  version: number;
  highScore: number;
  maxLevelReached: number; // 1-based index into LEVELS
  unlockedTowers: string[];
  levelStars: Record<number, number>; // levelNumber (1-based) -> best stars 0..3
  levelHighScores: Record<number, number>; // levelNumber (1-based) -> best score
  endlessHighScore: number;
  endlessMaxWave: number;
  dailyHighScore: number;
  dailyMaxWave: number;
  dailyDate: string;
  missionCredits: number;
  dailyMissionClaims: Record<string, boolean>;
  weeklyBestWaves: Record<string, number>;
  talents: { points: number; ranks: Record<string, number> };
  settledRuns: string[];
  records: Record<string, ScoreRecord>;
  lastPracticeKey: string | null;
  weeklyRewardClaims: Record<string, boolean>;
}

export interface RunResult {
  id: string;
  score: number;
  wave: number;
  missions: MissionRunSnapshot;
  missionDate: string;
  campaign: { level: number; stars: number } | null;
  endless: boolean;
  dailyDate: string | null;
  weekly: { id: string; reward: number } | null;
  origin?: RunOrigin;
  scoreVersion?: number;
  clearedWave?: number;
}

export interface RunSettlement {
  applied: boolean;
  persisted: boolean;
  highScore: boolean;
  levelScore: boolean;
  stars: boolean;
  dailyRecord: boolean;
  endlessRecord: boolean;
  modeRecord?: boolean;
  missionCredits: number;
  weeklyCredits: number;
}

const KEY = 'save';
const CURRENT_VERSION = 1;
const MAX_LEVEL = LEVELS.length;
const SETTLED_RUN_LIMIT = 256;

const DEFAULTS: SaveData = {
  version: CURRENT_VERSION,
  highScore: 0,
  maxLevelReached: 1,
  unlockedTowers: ['turret'],
  levelStars: {},
  levelHighScores: {},
  endlessHighScore: 0,
  endlessMaxWave: 0,
  dailyHighScore: 0,
  dailyMaxWave: 0,
  dailyDate: '',
  missionCredits: 0,
  dailyMissionClaims: {},
  weeklyBestWaves: {},
  talents: { points: 0, ranks: {} },
  settledRuns: [],
  records: {},
  lastPracticeKey: null,
  weeklyRewardClaims: {},
};

function validatedRecord<T extends number | boolean>(data: Record<string, unknown> | undefined, valid: (value: unknown) => value is T): Record<string, T> {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return {};
  return Object.fromEntries(Object.entries(data).filter((entry): entry is [string, T] => valid(entry[1])));
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isIntegerCount(value: unknown): value is number {
  return isCount(value) && Number.isSafeInteger(value);
}

export function readProfile(loaded: Partial<SaveData>, legacyTalents: Partial<SaveData['talents']> = {}): SaveData {
  const data = { ...DEFAULTS, ...loaded };
  data.version = CURRENT_VERSION;
  data.unlockedTowers = Array.isArray(loaded.unlockedTowers)
    ? loaded.unlockedTowers.filter(tower => typeof tower === 'string')
    : [...DEFAULTS.unlockedTowers];
  data.levelStars = validatedRecord(loaded.levelStars, (value): value is number => isIntegerCount(value) && value <= 3);
  data.levelHighScores = validatedRecord(loaded.levelHighScores, isCount);
  data.dailyMissionClaims = validatedRecord(loaded.dailyMissionClaims, (value): value is boolean => typeof value === 'boolean');
  data.weeklyBestWaves = validatedRecord(loaded.weeklyBestWaves, isCount);
  data.weeklyRewardClaims = validatedRecord(loaded.weeklyRewardClaims, (value): value is boolean => typeof value === 'boolean');
  data.records = loaded.records && typeof loaded.records === 'object' && !Array.isArray(loaded.records)
    ? Object.fromEntries(Object.entries(loaded.records).filter(([key, entry]) => /^\d+:(campaign|endless|daily|weekly|custom|legacy)(:|$)/.test(key) && isScoreRecord(entry))) : {};
  data.lastPracticeKey = typeof loaded.lastPracticeKey === 'string' && Object.prototype.hasOwnProperty.call(data.records, loaded.lastPracticeKey)
    ? loaded.lastPracticeKey : null;
  for (const key of ['highScore', 'maxLevelReached', 'endlessHighScore', 'endlessMaxWave', 'dailyHighScore', 'dailyMaxWave', 'missionCredits'] as const) {
    if (!isCount(data[key])) data[key] = DEFAULTS[key];
  }
  if (typeof data.dailyDate !== 'string') data.dailyDate = DEFAULTS.dailyDate;
  data.maxLevelReached = Math.max(1, Math.min(MAX_LEVEL, Math.floor(data.maxLevelReached)));

  const talents = loaded.talents ?? legacyTalents;
  data.talents = { points: isIntegerCount(talents.points) ? talents.points : 0, ranks: validatedRecord(talents.ranks, isIntegerCount) };
  data.settledRuns = Array.isArray(loaded.settledRuns)
    ? loaded.settledRuns.filter(id => typeof id === 'string').slice(-SETTLED_RUN_LIMIT)
    : [];
  return data;
}

export function loadLegacyProfile(): SaveData {
  return readProfile(load<Partial<SaveData>>(KEY, {}), load<Partial<SaveData['talents']>>('talents', {}));
}

export class SaveSystem {
  private data: SaveData;
  private batching = false;
  private pendingWrite = false;

  constructor(private readonly detached: boolean = false) {
    this.data = detached ? readProfile({}) : loadLegacyProfile();
  }

  /** Adopt a committed profile for a synchronous UI view, or for a transaction-local reducer. */
  adopt(data: SaveData): void { this.data = data; }

  private refresh(reconcileRun?: string): void {
    if (this.detached || (this.pendingWrite && !reconcileRun)) return;
    const latest = load<Partial<SaveData> | null>(KEY, null);
    if (latest && typeof latest === 'object' && !Array.isArray(latest)) {
      const data = readProfile(latest, load<Partial<SaveData['talents']>>('talents', {}));
      if (!this.pendingWrite || (reconcileRun && data.settledRuns.includes(reconcileRun))) {
        this.data = data;
        this.pendingWrite = false;
      }
    }
  }

  hasSettledRun(id: string): boolean {
    this.refresh(id);
    return !this.pendingWrite && this.data.settledRuns.includes(id);
  }

  settleRun(run: RunResult): RunSettlement {
    this.refresh(run.id);
    const result: RunSettlement = {
      applied: false, persisted: false, highScore: false, levelScore: false, stars: false,
      dailyRecord: false, endlessRecord: false, missionCredits: 0, weeklyCredits: 0,
    };
    if (this.data.settledRuns.includes(run.id)) {
      result.persisted = !this.pendingWrite || this.persist();
      return result;
    }

    this.batching = true;
    try {
      const origin = run.origin;
      const official = origin ? origin.kind !== 'custom' && origin.kind !== 'legacy' : !run.endless || run.dailyDate !== null;
      if (!origin) result.highScore = this.recordScore(run.score); // Legacy pending result.
      if (official) result.missionCredits = this.recordDailyMissionProgress(run.missionDate, run.missions);
      if (origin?.kind === 'weekly' && (run.clearedWave ?? 0) >= WEEKLY_REWARD_WAVE) {
        const mode = weeklyMode(origin.period);
        if (!this.data.weeklyRewardClaims[mode.id] && !this.data.weeklyBestWaves[mode.id]) {
          this.data.weeklyRewardClaims[mode.id] = true;
          this.data.missionCredits += mode.reward;
          result.weeklyCredits = mode.reward;
        }
      }
      if (origin && ((run.endless && run.wave > 0) || run.campaign)) {
        const key = runRecordKey(origin, run.scoreVersion ?? 0);
        result.modeRecord = this.recordStanding(key, run);
        if (origin.kind === 'custom') this.data.lastPracticeKey = key;
        result.levelScore = origin.kind === 'campaign' && result.modeRecord;
        result.endlessRecord = origin.kind === 'endless' && result.modeRecord;
        result.dailyRecord = origin.kind === 'daily' && result.modeRecord;
      }
      if (run.campaign) {
        const { level, stars } = run.campaign;
        this.recordLevelReached(level + 1);
        result.stars = this.recordStars(level, stars);
        if (!origin) result.levelScore = this.recordLevelScore(level, run.score);
        this.data.talents.points += stars;
      } else if (run.endless && run.wave > 0 && official) {
        this.data.talents.points += Math.min(3, Math.floor(run.wave / 4));
        if (!origin && run.dailyDate) result.dailyRecord = this.recordDailyRun(run.score, run.wave, run.dailyDate);
      }
      this.data.settledRuns.push(run.id);
      if (this.data.settledRuns.length > SETTLED_RUN_LIMIT) this.data.settledRuns.shift();
    } finally {
      this.batching = false;
    }
    result.applied = true;
    result.persisted = this.persist();
    return result;
  }

  getRecord(origin: RunOrigin, version = CURRENT_SCORE): ScoreRecord | undefined {
    return this.data.records[runRecordKey(origin, version)];
  }

  private recordStanding(key: string, run: RunResult): boolean {
    const previous = this.data.records[key];
    const best = previous?.best;
    const improves = !best || run.score > best.score || (run.score === best.score && run.wave > best.wave);
    this.data.records[key] = {
      best: improves ? { id: run.id, score: run.score, wave: run.wave } : best,
      furthestWave: Math.max(run.wave, previous?.furthestWave ?? 0),
    };
    return improves;
  }

  buyTalent(id: string, cost: number, maxRank: number): boolean {
    this.refresh();
    const rank = this.data.talents.ranks[id] ?? 0;
    if (rank >= maxRank || this.data.talents.points < cost) return false;
    this.data.talents.ranks[id] = rank + 1;
    this.data.talents.points -= cost;
    this.persist();
    return true;
  }

  get(): Readonly<SaveData> {
    return this.data;
  }

  recordScore(score: number): boolean {
    if (score > this.data.highScore) {
      this.data.highScore = score;
      this.persist();
      return true;
    }
    return false;
  }

  recordLevelReached(level: number): void {
    // level is 1-based; clamp to actual level count to avoid unlocking non-existent levels
    const clamped = Math.min(level, MAX_LEVEL);
    if (clamped > this.data.maxLevelReached) {
      this.data.maxLevelReached = clamped;
      this.persist();
    }
  }

  unlockTower(id: string): void {
    if (!this.data.unlockedTowers.includes(id)) {
      this.data.unlockedTowers.push(id);
      this.persist();
    }
  }

  /** Record best stars for a level (1-based). Returns true if new best. */
  recordStars(levelNumber: number, stars: number): boolean {
    const prev = this.data.levelStars[levelNumber] ?? 0;
    if (stars > prev) {
      this.data.levelStars[levelNumber] = stars;
      this.persist();
      return true;
    }
    return false;
  }

  getStars(levelNumber: number): number {
    return this.data.levelStars[levelNumber] ?? 0;
  }

  recordLevelScore(levelNumber: number, score: number): boolean {
    const prev = this.data.levelHighScores[levelNumber] ?? 0;
    if (score > prev) {
      this.data.levelHighScores[levelNumber] = score;
      this.persist();
      return true;
    }
    return false;
  }

  getLevelScore(levelNumber: number): number {
    return this.data.levelHighScores[levelNumber] ?? 0;
  }

  isLevelUnlocked(levelNumber: number): boolean {
    return levelNumber >= 1 && levelNumber <= this.data.maxLevelReached;
  }

  getUnlockedLevelCount(): number {
    return Math.max(1, Math.min(MAX_LEVEL, this.data.maxLevelReached));
  }

  getTotalStars(): number {
    let total = 0;
    for (let i = 1; i <= MAX_LEVEL; i++) total += this.getStars(i);
    return total;
  }

  getMaxStars(): number {
    return MAX_LEVEL * 3;
  }

  getCampaignCompletionRatio(): number {
    return this.getMaxStars() === 0 ? 0 : this.getTotalStars() / this.getMaxStars();
  }

  recordEndlessRun(score: number, wave: number): boolean {
    let updated = false;
    if (score > this.data.endlessHighScore) {
      this.data.endlessHighScore = score;
      updated = true;
    }
    if (wave > this.data.endlessMaxWave) {
      this.data.endlessMaxWave = wave;
      updated = true;
    }
    if (updated) this.persist();
    return updated;
  }

  recordDailyRun(score: number, wave: number, dateStr: string): boolean {
    if (this.data.dailyDate > dateStr) return false;
    let updated = false;
    if (this.data.dailyDate !== dateStr) {
      this.data.dailyDate = dateStr;
      this.data.dailyHighScore = 0;
      this.data.dailyMaxWave = 0;
      updated = true;
    }
    if (score > this.data.dailyHighScore) {
      this.data.dailyHighScore = score;
      updated = true;
    }
    if (wave > this.data.dailyMaxWave) {
      this.data.dailyMaxWave = wave;
      updated = true;
    }
    if (updated) this.persist();
    return updated;
  }

  recordDailyMissionProgress(dateStr: string, run: MissionRunSnapshot): number {
    let earned = 0;
    const progress = evaluateMissions(dailyMissions(dateStr), run);
    for (const item of progress) {
      if (!item.complete || this.data.dailyMissionClaims[item.mission.id]) continue;
      this.data.dailyMissionClaims[item.mission.id] = true;
      earned += item.mission.reward;
    }
    if (earned > 0) {
      this.data.missionCredits += earned;
      this.persist();
    }
    return earned;
  }

  recordWeeklyRun(weekId: string | null | undefined, wave: number, reward: number): number {
    if (!weekId || wave <= 0) return 0;
    const previous = this.data.weeklyBestWaves[weekId] ?? 0;
    if (wave <= previous) return 0;
    this.data.weeklyBestWaves[weekId] = wave;
    const earned = previous === 0 ? Math.max(0, reward) : 0;
    this.data.missionCredits += earned;
    this.persist();
    return earned;
  }

  reset(): void {
    this.data = readProfile({ talents: DEFAULTS.talents });
    this.persist();
  }

  private persist(): boolean {
    if (this.detached || this.batching) return true;
    const stored = save(KEY, this.data);
    this.pendingWrite = !stored;
    return stored;
  }
}
