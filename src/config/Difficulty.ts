// Difficulty selection: scales enemy HP/count/reward. Persisted choice.

export type Difficulty = 'normal' | 'hard' | 'brutal';

export interface DifficultyDef {
  id: Difficulty;
  name: string;
  description: string;
  hpMul: number;
  countMul: number;
  rewardMul: number;
  goldStartBonus: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  normal: { id: 'normal', name: 'Normal', description: 'Balanced experience.', hpMul: 1, countMul: 1, rewardMul: 1, goldStartBonus: 0 },
  hard: { id: 'hard', name: 'Hard', description: '+50% enemy HP, +20% count.', hpMul: 1.5, countMul: 1.2, rewardMul: 1.1, goldStartBonus: 20 },
  brutal: { id: 'brutal', name: 'Brutal', description: '+120% HP, +40% count, -10% reward.', hpMul: 2.2, countMul: 1.4, rewardMul: 0.9, goldStartBonus: 40 },
};

export const DIFFICULTY_LIST = Object.values(DIFFICULTIES);
