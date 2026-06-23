// Data-driven enemy registry. Phase 3 adds Boss + damage resistances.
// Adding an enemy = one object literal; no combat code changes.

import { BALANCE } from '../../config/balance';
import { DamageType, ResistanceMap } from '../DamageType';

export interface EnemyDef {
  id: string;
  name: string;
  color: string;
  hp: number;
  speed: number; // px/s
  reward: number;
  radius: number;
  damageType?: DamageType; // for enemies that deal damage to towers (future)
  resist?: ResistanceMap; // damage multipliers per type
  isBoss?: boolean;
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
    resist: { [DamageType.Ice]: 0.5 }, // resists ice
  },
  zealot: {
    id: 'zealot',
    name: 'Zealot',
    color: '#ff8a65',
    hp: BALANCE.enemyBaseHp * 1.3,
    speed: BALANCE.enemyBaseSpeed * 1.2,
    reward: BALANCE.enemyBaseReward * 1.2,
    radius: 11,
    resist: { [DamageType.Fire]: 0.3 }, // heavily resists fire
  },
  boss: {
    id: 'boss',
    name: 'Warlord',
    color: '#d32f2f',
    hp: BALANCE.enemyBaseHp * 8,
    speed: BALANCE.enemyBaseSpeed * 0.5,
    reward: BALANCE.enemyBaseReward * 5,
    radius: 22,
    isBoss: true,
    resist: {
      [DamageType.Fire]: 0.4,
      [DamageType.Ice]: 0.4,
      [DamageType.Lightning]: 0.7,
    },
  },
  // Phase 5 enemies — expands tactical depth
  phantom: {
    id: 'phantom',
    name: 'Phantom',
    color: '#b39ddb',
    hp: BALANCE.enemyBaseHp * 1.0,
    speed: BALANCE.enemyBaseSpeed * 1.4,
    reward: BALANCE.enemyBaseReward * 1.5,
    radius: 10,
    resist: { [DamageType.Physical]: 0.5 }, // ethereal — resists physical
  },
  titan: {
    id: 'titan',
    name: 'Titan',
    color: '#78909c',
    hp: BALANCE.enemyBaseHp * 5,
    speed: BALANCE.enemyBaseSpeed * 0.4,
    reward: BALANCE.enemyBaseReward * 3,
    radius: 20,
    resist: {
      [DamageType.Fire]: 0.6,
      [DamageType.Ice]: 0.6,
      [DamageType.Lightning]: 0.6,
    },
  },
};

export function getEnemyDef(id: string): EnemyDef {
  const def = ENEMY_DEFS[id];
  if (!def) throw new Error(`Unknown enemy: ${id}`);
  return def;
}
