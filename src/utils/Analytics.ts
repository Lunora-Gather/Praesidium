// Session analytics: tracks player behavior in localStorage.
// This is what separates hobby projects from market winners — data-driven iteration.
// Metrics: session count, total play time, per-level completion rate, churn point (wave died),
// tower usage frequency, spell usage, return visits.

import { load, save } from './storage';
import type { Difficulty } from '../config/Difficulty';
import type { RunOrigin } from './RunRecords';

export type IntroAction = 'tower' | 'wave' | 'spell' | 'intel';
export interface ModeSample { started: number; finished: number; won: number; bestWave: number; activeSec: number; simulatedSec: number }
export interface DifficultySample { started: number; finished: number; won: number }
export interface OnboardingSample { introRun: string; firstTowerSec: number | null; firstWaveSec: number | null; firstSpellSec: number | null; intelOpened: boolean }

export interface AnalyticsData {
  sessions: number;
  totalPlaySec: number;
  simulatedSec: number;
  timedSessions: number;
  byMode: Partial<Record<RunOrigin['kind'], ModeSample>>;
  byDifficulty: Partial<Record<Difficulty, DifficultySample>>;
  onboarding: OnboardingSample | null;
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

const KEY = 'analytics:v2';

const DEFAULTS: AnalyticsData = {
  sessions: 0,
  totalPlaySec: 0,
  simulatedSec: 0,
  timedSessions: 0,
  byMode: {},
  byDifficulty: {},
  onboarding: null,
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
    const legacy = load<Partial<AnalyticsData>>('analytics', {});
    const loaded = load<Partial<AnalyticsData> | null>(KEY, null) ?? {
      ...legacy, totalPlaySec: 0, simulatedSec: legacy.totalPlaySec ?? 0, timedSessions: 0,
      avgSessionSec: 0, longestSessionSec: 0,
    };
    this.data = {
      ...DEFAULTS, ...loaded,
      byMode: { ...loaded.byMode },
      byDifficulty: { ...loaded.byDifficulty },
      levelsCompleted: { ...loaded.levelsCompleted },
      levelsAttempted: { ...loaded.levelsAttempted },
      churnPoints: Array.isArray(loaded.churnPoints) ? [...loaded.churnPoints] : [],
      towerUsage: { ...loaded.towerUsage },
      spellUsage: { ...loaded.spellUsage },
    };
  }

  /** Call on game start. */
  startSession(runId: string, origin: RunOrigin): void {
    this.sessionSec = 0;
    this.data.sessions++;
    this.data.timedSessions++;
    this.mode(origin).started++;
    if (origin.kind === 'campaign') {
      this.difficulty(origin.difficulty).started++;
      if (origin.level === 1 && this.data.onboarding === null) {
        this.data.onboarding = { introRun: runId, firstTowerSec: null, firstWaveSec: null, firstSpellSec: null, intelOpened: false };
      }
    }
    const today = new Date().toISOString().slice(0, 10);
    if (this.data.lastPlayDate && this.data.lastPlayDate !== today) {
      this.data.returnDays++;
    }
    this.data.lastPlayDate = today;
    this.persist();
  }

  get activeSeconds(): number { return this.sessionSec; }

  private mode(origin: RunOrigin): ModeSample {
    return this.data.byMode[origin.kind] ??= { started: 0, finished: 0, won: 0, bestWave: 0, activeSec: 0, simulatedSec: 0 };
  }

  private difficulty(difficulty: Difficulty): DifficultySample {
    return this.data.byDifficulty[difficulty] ??= { started: 0, finished: 0, won: 0 };
  }

  tickActive(seconds: number, origin: RunOrigin): void {
    this.sessionSec += seconds;
    this.data.totalPlaySec += seconds;
    this.mode(origin).activeSec += seconds;
  }

  tickSimulation(seconds: number, origin: RunOrigin): void {
    this.data.simulatedSec += seconds;
    this.mode(origin).simulatedSec += seconds;
  }

  recordOutcome(origin: RunOrigin, won: boolean, wave: number): void {
    const mode = this.mode(origin);
    mode.finished++;
    if (won) mode.won++;
    mode.bestWave = Math.max(mode.bestWave, wave);
    if (origin.kind === 'campaign') {
      const difficulty = this.difficulty(origin.difficulty);
      difficulty.finished++;
      if (won) difficulty.won++;
    }
    this.persist();
  }

  recordFirstAction(action: IntroAction, runId: string, origin: RunOrigin): void {
    const sample = this.data.onboarding;
    if (!sample || origin.kind !== 'campaign' || origin.level > 2) return;
    if (action === 'intel') {
      if (sample.intelOpened) return;
      sample.intelOpened = true;
    } else {
      if (sample.introRun !== runId && action !== 'spell') return;
      const key = action === 'wave' ? 'firstWaveSec' : action === 'tower' ? 'firstTowerSec' : 'firstSpellSec';
      if (sample[key] !== null) return;
      sample[key] = Math.round(this.sessionSec * 10) / 10;
    }
    this.persist();
  }

  resumeSession(duration: number): void {
    this.sessionSec = duration;
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
    if (this.data.timedSessions > 0) {
      this.data.avgSessionSec = this.data.totalPlaySec / this.data.timedSessions;
    }
    this.persist();
  }

  get(): Readonly<AnalyticsData> { return this.data; }

  private persist(): void { save(KEY, this.data); }
}
