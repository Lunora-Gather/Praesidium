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

  reset(): void {
    this.data = { ...DEFAULTS };
    this.persist();
  }

  private persist(): void {
    save(KEY, this.data);
  }
}
