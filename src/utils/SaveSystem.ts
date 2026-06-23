// Save system: persists meta-progression (unlocks, high score, reached level).
// Gameplay state is NOT saved mid-run in Phase 2; that's a Phase 3 target.

import { load, save } from './storage';

export interface SaveData {
  version: number;
  highScore: number;
  maxLevelReached: number; // 1-based index into LEVELS
  unlockedTowers: string[];
}

const KEY = 'save';
const CURRENT_VERSION = 1;

const DEFAULTS: SaveData = {
  version: CURRENT_VERSION,
  highScore: 0,
  maxLevelReached: 1,
  unlockedTowers: ['turret'],
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
    if (level > this.data.maxLevelReached) {
      this.data.maxLevelReached = level;
      this.persist();
    }
  }

  unlockTower(id: string): void {
    if (!this.data.unlockedTowers.includes(id)) {
      this.data.unlockedTowers.push(id);
      this.persist();
    }
  }

  reset(): void {
    this.data = { ...DEFAULTS };
    this.persist();
  }

  private persist(): void {
    save(KEY, this.data);
  }
}
