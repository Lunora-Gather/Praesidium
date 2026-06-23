// Data-driven tower registry. Phase 2 ships 4 tower archetypes; adding more
// is one object literal. Splash/slow fields are honored by CombatSystem.

import { BALANCE } from '../../config/balance';

export interface TowerDef {
  id: string;
  name: string;
  color: string;
  range: number; // px
  fireRate: number; // shots/sec
  damage: number;
  projectileSpeed: number; // px/s
  projectileLife: number; // s
  cost: number;
  splash?: number; // splash radius px (undefined = single-target)
  slow?: { factor: number; duration: number }; // slow effect
  radius: number; // visual/occupancy radius
  description: string;
}

export const TOWER_DEFS: Record<string, TowerDef> = {
  turret: {
    id: 'turret',
    name: 'Turret',
    color: '#4fc3f7',
    range: BALANCE.tower.range,
    fireRate: BALANCE.tower.fireRate,
    damage: BALANCE.tower.damage,
    projectileSpeed: BALANCE.tower.projectileSpeed,
    projectileLife: BALANCE.tower.projectileLife,
    cost: BALANCE.tower.cost,
    radius: 16,
    description: 'Balanced single-target DPS.',
  },
  sniper: {
    id: 'sniper',
    name: 'Sniper',
    color: '#ffd54f',
    range: 300,
    fireRate: 0.5,
    damage: 85,
    projectileSpeed: 720,
    projectileLife: 2,
    cost: 140,
    radius: 13,
    description: 'Long range, high damage, slow fire.',
  },
  mortar: {
    id: 'mortar',
    name: 'Mortar',
    color: '#ff8a65',
    range: 170,
    fireRate: 0.7,
    damage: 22,
    projectileSpeed: 240,
    projectileLife: 2,
    cost: 120,
    splash: 60,
    radius: 18,
    description: 'Splash damage to groups.',
  },
  frost: {
    id: 'frost',
    name: 'Frost',
    color: '#80deea',
    range: 110,
    fireRate: 1.1,
    damage: 6,
    projectileSpeed: 420,
    projectileLife: 1.5,
    cost: 100,
    slow: { factor: 0.45, duration: 1.8 },
    radius: 15,
    description: 'Slows enemies, low damage.',
  },
};

export function getTowerDef(id: string): TowerDef {
  const def = TOWER_DEFS[id];
  if (!def) throw new Error(`Unknown tower: ${id}`);
  return def;
}

export const TOWER_LIST = Object.values(TOWER_DEFS);
