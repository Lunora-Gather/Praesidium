// Mid-run save: persists game state to localStorage on every wave boundary.
// Restored on page reload so players don't lose progress when they close the tab.
// This is the #1 retention fix for tower defense — sessions are 10-30 min.

import { save, load, remove } from './storage';

export interface RunSnapshot {
  v: 1;
  levelIndex: number;
  difficulty: string;
  endless: boolean;
  endlessSeed: number;
  weeklyModeActive?: boolean;
  gold: number;
  lives: number;
  score: number;
  waveCurrent: number;
  towers: Array<{
    id: string; tx: number; ty: number; level: number;
    strategy: string; invested: number;
    dmgMul: number; rangeMul: number; fireRateMul: number;
  }>;
  spellCooldowns: number[];
  stats: { kills: number; towersPlaced: number; upgrades: number; spellsCast: number; goldEarned: number; damageDealt: number; durationSec: number };
}

const KEY = 'run:snapshot';

export function saveRun(s: RunSnapshot): void {
  save(KEY, s);
}

export function loadRun(): RunSnapshot | null {
  return load<RunSnapshot | null>(KEY, null);
}

export function clearRun(): void {
  remove(KEY);
}
