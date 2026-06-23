// Data-driven tower registry. Phase 3: 6 archetypes with damage types.
// Splash/slow fields honored by CombatSystem; damage type by Enemy.takeDamage.

import { BALANCE } from '../../config/balance';
import { DamageType } from '../DamageType';
import type { TargetStrategy } from './Targeting';

export interface TowerDef {
  id: string;
  name: string;
  color: string;
  range: number;
  fireRate: number;
  damage: number;
  projectileSpeed: number;
  projectileLife: number;
  cost: number;
  splash?: number;
  slow?: { factor: number; duration: number };
  radius: number;
  description: string;
  damageType: DamageType;
  defaultStrategy: TargetStrategy;
}

export const TOWER_DEFS: Record<string, TowerDef> = {
  turret: {
    id: 'turret', name: 'Turret', color: '#4fc3f7',
    range: BALANCE.tower.range, fireRate: BALANCE.tower.fireRate,
    damage: BALANCE.tower.damage, projectileSpeed: BALANCE.tower.projectileSpeed,
    projectileLife: BALANCE.tower.projectileLife, cost: BALANCE.tower.cost,
    radius: 16, description: 'Balanced single-target DPS.',
    damageType: DamageType.Physical, defaultStrategy: 'first',
  },
  sniper: {
    id: 'sniper', name: 'Sniper', color: '#ffd54f',
    range: 300, fireRate: 0.5, damage: 85, projectileSpeed: 720,
    projectileLife: 2, cost: 140, radius: 13,
    description: 'Long range, high damage, slow fire.',
    damageType: DamageType.Physical, defaultStrategy: 'strongest',
  },
  mortar: {
    id: 'mortar', name: 'Mortar', color: '#ff8a65',
    range: 170, fireRate: 0.7, damage: 22, projectileSpeed: 240,
    projectileLife: 2, cost: 120, splash: 60, radius: 18,
    description: 'Splash damage to groups.',
    damageType: DamageType.Fire, defaultStrategy: 'first',
  },
  frost: {
    id: 'frost', name: 'Frost', color: '#80deea',
    range: 110, fireRate: 1.1, damage: 6, projectileSpeed: 420,
    projectileLife: 1.5, cost: 100, slow: { factor: 0.45, duration: 1.8 },
    radius: 15, description: 'Slows enemies, low damage.',
    damageType: DamageType.Ice, defaultStrategy: 'first',
  },
  tesla: {
    id: 'tesla', name: 'Tesla', color: '#fff176',
    range: 130, fireRate: 1.0, damage: 28, projectileSpeed: 900,
    projectileLife: 0.4, cost: 160, radius: 14,
    description: 'Lightning chain — fast, short life.',
    damageType: DamageType.Lightning, defaultStrategy: 'closest',
  },
  cannon: {
    id: 'cannon', name: 'Cannon', color: '#ff5722',
    range: 200, fireRate: 0.55, damage: 70, projectileSpeed: 300,
    projectileLife: 2, cost: 180, splash: 50, radius: 18,
    description: 'Heavy splash, fire damage.',
    damageType: DamageType.Fire, defaultStrategy: 'strongest',
  },
};

export function getTowerDef(id: string): TowerDef {
  const def = TOWER_DEFS[id];
  if (!def) throw new Error(`Unknown tower: ${id}`);
  return def;
}

export const TOWER_LIST = Object.values(TOWER_DEFS);
