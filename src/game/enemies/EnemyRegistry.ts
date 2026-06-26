// Data-driven enemy registry. Adding an enemy should primarily mean adding one
// EnemyDef entry here; movement, damage, rewards, resistances, and UI intel are
// handled by shared systems.

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
  description: string;
  traits: string[];
  recommendedTowerIds: string[];
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
    description: 'Baseline infantry with no special resistance. Efficient towers and early upgrades handle them well.',
    traits: ['Standard', 'No resistance'],
    recommendedTowerIds: ['turret', 'mortar'],
  },
  scout: {
    id: 'scout',
    name: 'Scout',
    color: '#ffb74d',
    hp: BALANCE.enemyBaseHp * 0.6,
    speed: BALANCE.enemyBaseSpeed * 1.7,
    reward: BALANCE.enemyBaseReward * 0.8,
    radius: 9,
    description: 'Fast light unit. It punishes slow targeting and benefits from crowd control or rapid fire.',
    traits: ['Fast', 'Low HP'],
    recommendedTowerIds: ['frost', 'tesla', 'turret'],
  },
  brute: {
    id: 'brute',
    name: 'Brute',
    color: '#ba68c8',
    hp: BALANCE.enemyBaseHp * 2.4,
    speed: BALANCE.enemyBaseSpeed * 0.7,
    reward: BALANCE.enemyBaseReward * 1.8,
    radius: 16,
    description: 'Slow armored unit with high HP. Avoid relying only on ice damage; use sustained physical or heavy burst.',
    traits: ['Armored', 'High HP', 'Resists Ice'],
    recommendedTowerIds: ['sniper', 'turret', 'cannon'],
    resist: { [DamageType.Ice]: 0.5 },
  },
  zealot: {
    id: 'zealot',
    name: 'Zealot',
    color: '#ff8a65',
    hp: BALANCE.enemyBaseHp * 1.3,
    speed: BALANCE.enemyBaseSpeed * 1.2,
    reward: BALANCE.enemyBaseReward * 1.2,
    radius: 11,
    description: 'Aggressive mid-speed unit with strong fire resistance. Physical and lightning towers are safer counters.',
    traits: ['Aggressive', 'Resists Fire'],
    recommendedTowerIds: ['tesla', 'sniper', 'turret'],
    resist: { [DamageType.Fire]: 0.3 },
  },
  boss: {
    id: 'boss',
    name: 'Warlord',
    color: '#d32f2f',
    hp: BALANCE.enemyBaseHp * 8,
    speed: BALANCE.enemyBaseSpeed * 0.5,
    reward: BALANCE.enemyBaseReward * 5,
    radius: 22,
    description: 'Boss-class enemy with extreme HP and broad elemental resistance. Stack high single-target damage and support with control.',
    traits: ['Boss', 'Massive HP', 'Broad resistance'],
    recommendedTowerIds: ['sniper', 'turret', 'frost'],
    isBoss: true,
    resist: {
      [DamageType.Fire]: 0.4,
      [DamageType.Ice]: 0.4,
      [DamageType.Lightning]: 0.7,
    },
  },
  phantom: {
    id: 'phantom',
    name: 'Phantom',
    color: '#b39ddb',
    hp: BALANCE.enemyBaseHp * 1.0,
    speed: BALANCE.enemyBaseSpeed * 1.4,
    reward: BALANCE.enemyBaseReward * 1.5,
    radius: 10,
    description: 'Ethereal unit that resists physical damage. Elemental towers and lightning are more reliable.',
    traits: ['Ethereal', 'Resists Physical'],
    recommendedTowerIds: ['tesla', 'mortar', 'frost'],
    resist: { [DamageType.Physical]: 0.5 },
  },
  titan: {
    id: 'titan',
    name: 'Titan',
    color: '#78909c',
    hp: BALANCE.enemyBaseHp * 5,
    speed: BALANCE.enemyBaseSpeed * 0.4,
    reward: BALANCE.enemyBaseReward * 3,
    radius: 20,
    description: 'Very durable siege unit. It resists several elemental types, so physical damage and focused targeting are important.',
    traits: ['Siege', 'Very high HP', 'Elemental resistance'],
    recommendedTowerIds: ['sniper', 'turret', 'cannon'],
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
