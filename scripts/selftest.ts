// Lightweight runtime sanity checks — no test framework, just assertions.
// Run: npx tsx scripts/selftest.ts  (or compile + node). Validates core logic.

import { computeStars } from '../src/game/Stars';
import { applyResistance, DamageType } from '../src/game/DamageType';
import { Tower, UPGRADE_STEPS } from '../src/game/towers/Tower';
import { getTowerDef } from '../src/game/towers/TowerRegistry';
import { Grid } from '../src/game/grid/Grid';
import { LEVELS } from '../src/game/grid/LevelManager';
import { Vec2 } from '../src/engine/math/Vec2';
import { Pathfinding } from '../src/game/grid/Pathfinding';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean): void {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name); }
}

// --- Stars ---
check('3 stars at full lives', computeStars(20) === 3);
check('2 stars at 10 lives', computeStars(10) === 2);
check('1 star at 1 life', computeStars(1) === 1);
check('0 stars at 0 lives', computeStars(0) === 0);

// --- Damage resistance ---
check('no resist = full damage', applyResistance(100, DamageType.Fire, {}) === 100);
check('0.5 resist = half damage', applyResistance(100, DamageType.Fire, { [DamageType.Fire]: 0.5 }) === 50);
check('2.0 vuln = double damage', applyResistance(10, DamageType.Ice, { [DamageType.Ice]: 2 }) === 20);
check('unmatched type = full damage', applyResistance(30, DamageType.Lightning, { [DamageType.Fire]: 0.1 }) === 30);

// --- Tower upgrade ---
const grid = new Grid(LEVELS[0]);
const t = new Tower(getTowerDef('turret'), 2, 2, grid);
const baseDmg = t.damage;
check('tower starts level 1', t.level === 1);
const ok = t.upgrade();
check('upgrade succeeds when available', ok === true);
check('damage scales after upgrade', t.damage > baseDmg);
check('level increments', t.level === 2);
check('sell value positive', t.sellValue > 0);

// --- Pathfinding ---
const path = Pathfinding.findPath(grid, { x: 1, y: 10 }, { x: 14, y: 3 });
check('A* returns a path', path !== null && path.length > 1);
check('path starts at origin', path !== null && path[0].x === 1 && path[0].y === 10);
check('path ends at goal', path !== null && path[path.length - 1].x === 14 && path[path.length - 1].y === 3);

// --- Vec2 ---
const a = new Vec2(3, 4);
check('vec len = 5', a.len() === 5);
check('vec add', a.add(new Vec2(1, 1)).x === 4 && a.add(new Vec2(1, 1)).y === 5);
check('vec normalize', Math.abs(a.normalize().len() - 1) < 1e-9);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
