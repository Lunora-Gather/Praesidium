import { DIFFICULTIES, type Difficulty } from '../config/Difficulty';
import { LEVELS } from '../game/grid/LevelManager';
import { isWeekKey } from './WeeklyMode';

// Increment rules for numerical/gameplay changes and score for any change affecting comparability.
// Unsupported rule versions must not silently play or rank as the current version.
export const CURRENT_RULES = 1;
export const CURRENT_SCORE = 1;
export type RunVersion = { rules: typeof CURRENT_RULES; score: typeof CURRENT_SCORE };
export const CURRENT_RUN_VERSION: RunVersion = Object.freeze({ rules: CURRENT_RULES, score: CURRENT_SCORE });

export type RunOrigin =
  | { kind: 'campaign'; level: number; difficulty: Difficulty }
  | { kind: 'endless' }
  | { kind: 'daily' | 'weekly'; period: string }
  | { kind: 'custom'; code: string }
  | { kind: 'legacy' };

export interface ScoreRecord {
  best: { id: string; score: number; wave: number };
  furthestWave: number;
}

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const whole = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

export function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(time.valueOf()) && time.toISOString().slice(0, 10) === value;
}

export function isRunVersion(value: unknown): value is RunVersion {
  return object(value) && value.rules === CURRENT_RULES && value.score === CURRENT_SCORE;
}

export function isRunOrigin(value: unknown): value is RunOrigin {
  if (!object(value)) return false;
  switch (value.kind) {
    case 'campaign': return whole(value.level) && value.level > 0 && value.level <= LEVELS.length
      && typeof value.difficulty === 'string' && Object.prototype.hasOwnProperty.call(DIFFICULTIES, value.difficulty);
    case 'daily': return isDateKey(value.period);
    case 'weekly': return isWeekKey(value.period);
    case 'custom': return typeof value.code === 'string' && /^[A-Z0-9-]{1,64}$/.test(value.code);
    case 'endless': case 'legacy': return true;
    default: return false;
  }
}

export function runRecordKey(origin: RunOrigin, scoreVersion: number): string {
  const base = `${scoreVersion}:${origin.kind}`;
  if (origin.kind === 'campaign') return `${base}:${origin.level}:${origin.difficulty}`;
  if (origin.kind === 'daily' || origin.kind === 'weekly') return `${base}:${origin.period}`;
  if (origin.kind === 'custom') return `${base}:${origin.code}`;
  return base;
}

export function isScoreRecord(value: unknown): value is ScoreRecord {
  return object(value) && object(value.best) && typeof value.best.id === 'string' && /^[\w-]{1,80}$/.test(value.best.id)
    && typeof value.best.score === 'number' && Number.isFinite(value.best.score) && value.best.score >= 0
    && whole(value.best.wave) && whole(value.furthestWave) && value.furthestWave >= value.best.wave;
}
