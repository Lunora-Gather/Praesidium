// Session analytics: tracks player behavior in localStorage.
// This is what separates hobby projects from market winners — data-driven iteration.
// Metrics: session count, total play time, per-level completion rate, churn point (wave died),
// tower usage frequency, spell usage, return visits.

import { load, save } from './storage';

export interface AnalyticsData {
  sessions: number;
  totalPlaySec: number;
  lastPlayDate: string; // ISO date
  returnDays: number; // distinct days played
  levelsCompleted: Record<number, number>; // levelIndex -> times won
  levelsAttempted: Record<number, number>; // levelIndex -> times started
  endlessBestWave: number;
  endlessRuns: number;
  churnPoints: Array<{ level: number; wave: number; difficulty: string }>; // where players died
  towerUsage: Record<string, number>; // towerId -> times placed
  spellUsage: Record<string, number>; // spellId -> times cast
  avgSessionSec: number;
  longestSessionSec: number;
}

const KEY = 'analytics';

const DEFAULTS: AnalyticsData = {
  sessions: 0,
  totalPlaySec: 0,
  lastPlayDate: '',
  returnDays: 0,
  levelsCompleted: {},
  levelsAttempted: {},
  endlessBestWave: 0,
  endlessRuns: 0,
  churnPoints: [],
  towerUsage: {},
  spellUsage: {},
  avgSessionSec: 0,
  longestSessionSec: 0,
};

export class Analytics {
  private data: AnalyticsData;
  private sessionSec = 0;

  constructor() {
    this.data = { ...DEFAULTS, ...load<Partial<AnalyticsData>>(KEY, {}) };
  }

  /** Call on game start. */
  startSession(): void {
    this.sessionSec = 0;
    this.data.sessions++;
    const today = new Date().toISOString().slice(0, 10);
    if (this.data.lastPlayDate && this.data.lastPlayDate !== today) {
      this.data.returnDays++;
    }
    this.data.lastPlayDate = today;
    this.persist();
  }

  /** Call every frame with dt. */
  tick(dt: number): void {
    this.sessionSec += dt;
    this.data.totalPlaySec += dt;
  }

  /** Call on level start. */
  recordLevelStart(levelIndex: number): void {
    this.data.levelsAttempted[levelIndex] = (this.data.levelsAttempted[levelIndex] ?? 0) + 1;
    this.persist();
  }

  /** Call on level win. */
  recordLevelWin(levelIndex: number): void {
    this.data.levelsCompleted[levelIndex] = (this.data.levelsCompleted[levelIndex] ?? 0) + 1;
    this.persist();
  }

  /** Call on death with current wave. */
  recordDeath(level: number, wave: number, difficulty: string): void {
    this.data.churnPoints.push({ level, wave, difficulty });
    if (this.data.churnPoints.length > 50) this.data.churnPoints.shift();
    this.persist();
  }

  /** Call on endless run end. */
  recordEndlessRun(wave: number): void {
    this.data.endlessRuns++;
    if (wave > this.data.endlessBestWave) this.data.endlessBestWave = wave;
    this.persist();
  }

  /** Call on tower place. */
  recordTowerPlace(id: string): void {
    this.data.towerUsage[id] = (this.data.towerUsage[id] ?? 0) + 1;
  }

  /** Call on spell cast. */
  recordSpellCast(id: string): void {
    this.data.spellUsage[id] = (this.data.spellUsage[id] ?? 0) + 1;
  }

  /** Call on session end (blur/close/game end). */
  endSession(): void {
    if (this.sessionSec > this.data.longestSessionSec) {
      this.data.longestSessionSec = this.sessionSec;
    }
    if (this.data.sessions > 0) {
      this.data.avgSessionSec = this.data.totalPlaySec / this.data.sessions;
    }
    this.persist();
  }

  get(): Readonly<AnalyticsData> { return this.data; }

  private persist(): void { save(KEY, this.data); }
}
