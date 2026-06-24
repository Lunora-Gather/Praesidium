// Seed-based deterministic Leaderboard generator.
// Generates realistic competitor scores so players can compete offline.

import { SaveSystem } from './SaveSystem';
import { Rng } from './rng';
import { dailySeed } from './DailyChallenge';

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
  type: 'level' | 'endless' | 'daily',
  levelIndex = 0
): LeaderboardEntry[] {
  const saveSystem = save.get();
  let playerBest = 0;
  let playerWave: number | undefined = undefined;

  let seed = 0;
  let baseTarget = 5000;
  let baseWave = 20;

  if (type === 'level') {
    playerBest = saveSystem.levelHighScores[levelIndex + 1] ?? 0;
    seed = (levelIndex + 1) * 7919; // LCG seed prime multiplier
    // Base targets scale with level index
    baseTarget = 2000 + levelIndex * 2500;
  } else if (type === 'endless') {
    playerBest = saveSystem.endlessHighScore;
    playerWave = saveSystem.endlessMaxWave;
    seed = 88319; // static endless seed
    baseTarget = 25000;
    baseWave = 35;
  } else if (type === 'daily') {
    // only show daily if it matches current daily challenge date
    const today = new Date().toISOString().slice(0, 10);
    if (saveSystem.dailyDate === today) {
      playerBest = saveSystem.dailyHighScore;
      playerWave = saveSystem.dailyMaxWave;
    }
    seed = dailySeed();
    baseTarget = 30000;
    baseWave = 42;
  }

  const rng = new Rng(seed);
  const entries: LeaderboardEntry[] = [];

  // 1. Generate 5 NPC entries
  const usedNames = new Set<string>();
  for (let i = 0; i < 5; i++) {
    // pick unique name
    let nameIdx = rng.int(0, NPC_NAMES.length - 1);
    let name = NPC_NAMES[nameIdx];
    while (usedNames.has(name)) {
      nameIdx = (nameIdx + 1) % NPC_NAMES.length;
      name = NPC_NAMES[nameIdx];
    }
    usedNames.add(name);

    // generate deterministic score with standard jitter
    const scoreMult = 0.6 + rng.next() * 0.8; // 60% to 140% of base target
    const score = Math.round(baseTarget * scoreMult);

    let wave: number | undefined = undefined;
    if (type !== 'level') {
      const waveMult = 0.5 + rng.next() * 0.9;
      wave = Math.max(1, Math.round(baseWave * waveMult));
    }

    entries.push({ name, score, wave, isPlayer: false });
  }

  // 2. Add player's highscore entry (only if they have recorded a score)
  if (playerBest > 0) {
    entries.push({
      name: 'YOU',
      score: playerBest,
      wave: playerWave,
      isPlayer: true
    });
  }

  // 3. Sort descending (score is the primary sorting key)
  entries.sort((a, b) => b.score - a.score);

  return entries;
}
