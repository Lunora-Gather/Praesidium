// Data-driven tower registry. Phase 1 ships one tower; the registry shape
// lets us add Sniper/Splash/Frost etc. later without touching combat code.

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
  },
  // Examples ready for Phase 2 — uncomment/extend when implemented:
  // sniper: { id:'sniper', name:'Sniper', color:'#ffd54f', range:300, fireRate:0.5,
  //   damage:80, projectileSpeed:700, projectileLife:1.5, cost:140, radius:14 },
  // splash: { id:'splash', name:'Mortar', color:'#ff8a65', range:160, fireRate:0.7,
  //   damage:18, projectileSpeed:240, projectileLife:1.5, cost:120, splash:60, radius:18 },
};

export function getTowerDef(id: string): TowerDef {
  const def = TOWER_DEFS[id];
  if (!def) throw new Error(`Unknown tower: ${id}`);
  return def;
}

export const TOWER_LIST = Object.values(TOWER_DEFS);
