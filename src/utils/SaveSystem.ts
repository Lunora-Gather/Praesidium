// Save system: persists meta-progression (unlocks, high score, reached level).
// Gameplay state is NOT saved mid-run in Phase 2; that's a Phase 3 target.

import { load, save } from './storage';
import { LEVELS } from '../game/grid/LevelManager';

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
};

export class SaveSystem {
  private data: SaveData;

  constructor() {
    const loaded = load<Partial<SaveData>>(KEY, {});
    this.data = { ...DEFAULTS, ...loaded };
    if (this.data.version !== CURRENT_VERSION) this.migrate();
  }

  private migrate(): void {
    // forward-only migrations would go here
    this.data.version = CURRENT_VERSION;
    this.persist();
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

  reset(): void {
    this.data = { ...DEFAULTS };
    this.persist();
  }

  private persist(): void {
    save(KEY, this.data);
  }
}
