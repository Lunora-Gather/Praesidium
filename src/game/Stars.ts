// Level completion stars: based on lives retained + speed + gold hoarded.
// Persisted per-level in SaveSystem.

export interface LevelStars {
  livesRemaining: number; // >0 => 1 star baseline
  // 3-star: lives >= threshold, finished before timeBonus cutoff, gold >= floor
  stars: number; // 0..3
  bestStars: number; // best across runs
}

export interface LevelStarDef {
  livesFor3: number; // keep at least this many lives for 3-star
  livesFor2: number; // keep at least this for 2-star
}

export const STAR_THRESHOLDS: LevelStarDef = {
  livesFor3: 15,
  livesFor2: 10,
};

export function computeStars(livesRemaining: number): number {
  if (livesRemaining >= STAR_THRESHOLDS.livesFor3) return 3;
  if (livesRemaining >= STAR_THRESHOLDS.livesFor2) return 2;
  if (livesRemaining > 0) return 1;
  return 0;
}
