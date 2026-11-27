// Measure simulation cost under a dense field using the production fixed step.

import { GameState } from '../src/game/GameState';
import { Vec2 } from '../src/engine/math/Vec2';
import { denseBattle } from './perf-fixture';
import { logger } from '../src/utils/logger';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail = ''): void {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${detail}`); }
}

console.log('\n=== Performance Stress Test ===');
logger.setLevel('warn');

const gs = denseBattle();

const dt = 1 / 60;
const frames = 900; // 15 seconds under a deliberately dense field
const updateTimes: number[] = [];
let maxEnemies = 0;
let maxProjectiles = 0;

for (let i = 0; i < frames; i++) {
  const start = performance.now();
  gs.update(dt);
  if (i >= 100) updateTimes.push(performance.now() - start);
  maxEnemies = Math.max(maxEnemies, gs.enemies.length);
  maxProjectiles = Math.max(maxProjectiles, gs.projectiles.length);
  if (gs.phase !== 'playing') break;
}

updateTimes.sort((a, b) => a - b);
const avgUpdateMs = updateTimes.reduce((sum, ms) => sum + ms, 0) / updateTimes.length;
const p95UpdateMs = updateTimes[Math.floor(updateTimes.length * 0.95)] ?? Infinity;
const peakUpdateMs = updateTimes[updateTimes.length - 1] ?? Infinity;
console.log(`${gs.towers.length} towers | peak enemies ${maxEnemies} | peak shots ${maxProjectiles} | mean ${avgUpdateMs.toFixed(3)} ms | p95 ${p95UpdateMs.toFixed(3)} ms | peak ${peakUpdateMs.toFixed(3)} ms`);
check('95th percentile simulation update under 16ms', p95UpdateMs < 16,
  `p95=${p95UpdateMs.toFixed(2)}ms`);
check('Average update under 8ms', avgUpdateMs < 8,
  `avg=${avgUpdateMs.toFixed(2)}ms`);
check('Handles the dense field throughout the fixture', gs.towers.length === 100 && maxEnemies >= 240 && updateTimes.length === frames - 100,
  `max=${maxEnemies}`);
check('Handles 5+ projectiles simultaneously', maxProjectiles >= 5,
  `max=${maxProjectiles}`);

console.log('\n=== Memory Safety ===');
check('Enemy array contains no expired entries', gs.enemies.every(enemy => !enemy.dead), `len=${gs.enemies.length}`);
check('Projectile array contains no expired entries', gs.projectiles.every(projectile => !projectile.dead), `len=${gs.projectiles.length}`);

// Grid cache invalidation: changing level doesn't crash
console.log('\n=== Level Transition Safety ===');
const gs3 = new GameState();
gs3.selectLevel(0);
for (let i = 0; i < 60; i++) gs3.update(dt);
// Simulate level win by forcing all enemies dead
gs3.enemies.length = 0;
gs3.waves.state = 'done';
gs3.update(dt);
const won = gs3.phase === 'won';
gs3.advanceLevel();
check('Campaign transition initializes a fresh board', won && gs3.phase === 'playing' && gs3.levels.levelNumber === 2
  && gs3.enemies.length === 0 && gs3.projectiles.length === 0);

// Spell system under stress
console.log('\n=== Spell Stress ===');
const gs4 = new GameState();
gs4.selectLevel(0);
gs4.gold = 10000; // unlimited gold
gs4.waves.forceNext();
for (let i = 0; i < 120; i++) gs4.update(dt);
const spellCast = gs4.castSpell('meteor', gs4.enemies[0]?.pos ?? Vec2.zero);
check('Meteor applies splash damage to an active wave', spellCast && gs4.stats.get().damageDealt > 0);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
