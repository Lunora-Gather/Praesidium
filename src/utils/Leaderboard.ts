// Seed-based deterministic Leaderboard generator.
// Generates realistic competitor scores so players can compete offline.

import { SaveSystem } from './SaveSystem';
import { Rng } from './rng';
import { dailyDateStr, dailySeed } from './DailyChallenge';
import { weekKey, weeklySeed } from './WeeklyMode';
import type { Difficulty } from '../config/Difficulty';
import type { RunOrigin, ScoreRecord } from './RunRecords';

export type LeaderboardType = 'level' | 'endless' | 'daily' | 'weekly' | 'practice' | 'history';

type ActiveBoard = Exclude<LeaderboardType, 'practice' | 'history'>;

function boardOrigin(type: ActiveBoard, levelIndex: number, difficulty: Difficulty, now: Date): RunOrigin {
  if (type === 'level') return { kind: 'campaign', level: levelIndex + 1, difficulty };
  if (type === 'daily') return { kind: 'daily', period: dailyDateStr(now) };
  if (type === 'weekly') return { kind: 'weekly', period: weekKey(now) };
  return { kind: 'endless' };
}

export function leaderboardRecord(save: SaveSystem, type: LeaderboardType, levelIndex = 0, difficulty: Difficulty = 'normal', now = new Date()): ScoreRecord | undefined {
  if (type === 'history') return undefined;
  if (type === 'practice') {
    const profile = save.get();
    return profile.lastPracticeKey ? profile.records[profile.lastPracticeKey] : undefined;
  }
  return save.getRecord(boardOrigin(type, levelIndex, difficulty, now));
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  wave?: number;
  isPlayer: boolean;
}

const NPC_NAMES = [
  'NebulaGamer', 'TitanSlayer', 'FrostMage', 'TeslaVolt', 'PraesidiumOP',
  'AlphaDef', 'BruteForce', 'ZealotHunter', 'VoidWalker', 'ShadowNinja',
  'CyberSniper', 'ByteMe', 'PixelSlinger', 'CommandPulse', 'StarShield',
  'ApexGuard', 'GlitchSlayer', 'ZeroChill', 'RogueShield', 'AegisCore'
];

/**
 * Deterministically generates a leaderboard ranking for a given level or challenge seed.
 * Merges the player's stored personal best.
 */
export function getLeaderboard(
  save: SaveSystem,
  type: LeaderboardType,
  levelIndex = 0,
  difficulty: Difficulty = 'normal',
  now = new Date(),
): LeaderboardEntry[] {
  const standing = leaderboardRecord(save, type, levelIndex, difficulty, now);
  const player: LeaderboardEntry[] = standing ? [{ name: 'YOU', score: standing.best.score, wave: type === 'level' ? undefined : standing.best.wave, isPlayer: true }] : [];
  if (type === 'practice') return player;
  if (type === 'history') {
    const profile = save.get();
    return [
      { name: 'historical.endless', score: profile.endlessHighScore, isPlayer: true },
      { name: 'historical.daily', score: profile.dailyHighScore, isPlayer: true },
      { name: 'historical.campaign', score: Object.values(profile.levelHighScores).reduce((best, score) => Math.max(best, score), 0), isPlayer: true },
      { name: 'historical.legacy', score: profile.records['0:legacy']?.best.score ?? 0, isPlayer: true },
    ].filter(row => row.score > 0);
  }

  const origin = boardOrigin(type, levelIndex, difficulty, now);
  const seed = origin.kind === 'daily' ? dailySeed(origin.period)
    : origin.kind === 'weekly' ? weeklySeed(origin.period)
      : origin.kind === 'campaign' ? origin.level * 7919 : 88319;
  const baseTarget = type === 'level' ? 2000 + levelIndex * 2500 : type === 'daily' ? 30000 : type === 'weekly' ? 27000 : 25000;
  const baseWave = type === 'daily' ? 42 : type === 'weekly' ? 38 : 35;
  const rng = new Rng(seed);
  const entries: LeaderboardEntry[] = [...player];
  const used = new Set<string>();
  for (let i = 0; i < 5; i++) {
    let index = rng.int(0, NPC_NAMES.length);
    while (used.has(NPC_NAMES[index])) index = (index + 1) % NPC_NAMES.length;
    const name = NPC_NAMES[index];
    used.add(name);
    const score = Math.round(baseTarget * (0.6 + rng.next() * 0.8));
    const wave = type === 'level' ? undefined : Math.max(1, Math.round(baseWave * (0.5 + rng.next() * 0.9)));
    entries.push({ name, score, wave, isPlayer: false });
  }
  return entries.sort((a, b) => b.score - a.score || (b.wave ?? 0) - (a.wave ?? 0));
}
