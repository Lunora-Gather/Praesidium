// Save system: persists meta-progression such as unlocks, high score, reached level,
// level stars, level scores, endless records, and daily challenge records.
// Mid-run snapshots live separately in RunSave.ts.

import { load, save } from './storage';
import { LEVELS } from '../game/grid/LevelManager';
import { dailyMissions, evaluateMissions, type MissionRunSnapshot } from './DailyMissions';

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
}

const KEY = 'save';
const CURRENT_VERSION = 1;
const MAX_LEVEL = LEVELS.length;

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
};

function defaultData(): SaveData {
  return {
    ...DEFAULTS,
    unlockedTowers: [...DEFAULTS.unlockedTowers],
    levelStars: {},
    levelHighScores: {},
    dailyMissionClaims: {},
    weeklyBestWaves: {},
  };
}

export class SaveSystem {
  private data: SaveData;

  constructor() {
    const loaded = load<Partial<SaveData>>(KEY, {});
    this.data = { ...defaultData(), ...loaded };
    this.data.unlockedTowers = [...(loaded.unlockedTowers ?? DEFAULTS.unlockedTowers)];
    this.data.levelStars = { ...(loaded.levelStars ?? {}) };
    this.data.levelHighScores = { ...(loaded.levelHighScores ?? {}) };
    this.data.dailyMissionClaims = { ...(loaded.dailyMissionClaims ?? {}) };
    this.data.weeklyBestWaves = { ...(loaded.weeklyBestWaves ?? {}) };
    if (this.data.version !== CURRENT_VERSION) this.migrate();
    this.clampProgression();
  }

  private migrate(): void {
    // forward-only migrations would go here
    this.data.version = CURRENT_VERSION;
    this.persist();
  }

  private clampProgression(): void {
    const clamped = Math.max(1, Math.min(MAX_LEVEL, this.data.maxLevelReached));
    if (clamped !== this.data.maxLevelReached) {
      this.data.maxLevelReached = clamped;
      this.persist();
    }
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
    this.data = defaultData();
    this.persist();
  }

  private persist(): void {
    save(KEY, this.data);
  }
}
