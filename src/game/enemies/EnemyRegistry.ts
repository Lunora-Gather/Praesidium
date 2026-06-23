// Data-driven enemy registry. New enemy types = add an entry, no code changes.

import { BALANCE } from '../../config/balance';

export interface EnemyDef {
  id: string;
  name: string;
  color: string;
  hp: number;
  speed: number; // px/s
  reward: number;
  radius: number;
}

export const ENEMY_DEFS: Record<string, EnemyDef> = {
  grunt: {
    id: 'grunt',
    name: 'Grunt',
    color: '#e57373',
    hp: BALANCE.enemyBaseHp,
    speed: BALANCE.enemyBaseSpeed,
    reward: BALANCE.enemyBaseReward,
    radius: 12,
  },
  scout: {
    id: 'scout',
    name: 'Scout',
    color: '#ffb74d',
    hp: BALANCE.enemyBaseHp * 0.6,
    speed: BALANCE.enemyBaseSpeed * 1.7,
    reward: BALANCE.enemyBaseReward * 0.8,
    radius: 9,
  },
  brute: {
    id: 'brute',
    name: 'Brute',
    color: '#ba68c8',
    hp: BALANCE.enemyBaseHp * 2.4,
    speed: BALANCE.enemyBaseSpeed * 0.7,
    reward: BALANCE.enemyBaseReward * 1.8,
    radius: 16,
  },
};

export function getEnemyDef(id: string): EnemyDef {
  const def = ENEMY_DEFS[id];
  if (!def) throw new Error(`Unknown enemy: ${id}`);
  return def;
}
