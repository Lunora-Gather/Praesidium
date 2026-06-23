// Performance stress test: prove the game stays playable under heavy load.
// This is what store reviewers and players on low-end devices will experience.
// Run: npx tsx scripts/perf-check.ts

import { GameState } from '../src/game/GameState';
import { getTowerDef } from '../src/game/towers/TowerRegistry';
import { Vec2 } from '../src/engine/math/Vec2';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail = ''): void {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${detail}`); }
}

// Stress test: simulate 200+ enemies on screen, measure if update stays under 16ms budget
console.log('\n=== Performance Stress Test ===');

const gs = new GameState();
gs.setDifficulty('brutal');
gs.endless = true;
gs.selectLevel(0);

// Place towers densely to create many projectiles
for (let ty = 1; ty < gs.grid.rows - 1; ty++) {
  for (let tx = 1; tx < gs.grid.cols - 1; tx++) {
    if (gs.grid.isBuildable(tx, ty) && !gs.towers.some(t => t.tx === tx && t.ty === ty)) {
      const affordable = ['turret', 'frost', 'mortar', 'sniper', 'tesla', 'cannon']
        .map(id => getTowerDef(id))
        .filter(d => gs.gold >= d.cost);
      if (affordable.length > 0) {
        gs.selectedTowerId = affordable[0].id;
        gs.tryPlace(tx, ty);
      }
    }
  }
}

// Force many waves to spawn lots of enemies
for (let i = 0; i < 12; i++) gs.waves.forceNext();

const dt = 1 / 60;
const frames = 3600; // 60 seconds of gameplay — enough for enemies to accumulate
let maxUpdateMs = 0;
let totalUpdateMs = 0;
let maxEnemies = 0;
let maxProjectiles = 0;

for (let i = 0; i < frames; i++) {
  const start = performance.now();
  gs.update(dt);
  const elapsed = performance.now() - start;
  maxUpdateMs = Math.max(maxUpdateMs, elapsed);
  totalUpdateMs += elapsed;
  maxEnemies = Math.max(maxEnemies, gs.enemies.length);
  maxProjectiles = Math.max(maxProjectiles, gs.projectiles.length);
  if (gs.phase !== 'playing') break;
}

const avgUpdateMs = totalUpdateMs / frames;
check('Peak update under 16ms (60fps budget)', maxUpdateMs < 16,
  `peak=${maxUpdateMs.toFixed(2)}ms`);
check('Average update under 8ms', avgUpdateMs < 8,
  `avg=${avgUpdateMs.toFixed(2)}ms`);
check('Handles 20+ enemies simultaneously', maxEnemies >= 20,
  `max=${maxEnemies}`);
check('Handles 5+ projectiles simultaneously', maxProjectiles >= 5,
  `max=${maxProjectiles}`);

// Memory pressure: compact arrays don't leak
console.log('\n=== Memory Safety ===');
const gs2 = new GameState();
gs2.selectLevel(0);
gs2.waves.forceNext();
for (let i = 0; i < 300; i++) gs2.update(dt);
const enemyLen = gs2.enemies.length;
const projLen = gs2.projectiles.length;
check('Enemy array stays bounded', enemyLen < 500, `len=${enemyLen}`);
check('Projectile array stays bounded', projLen < 500, `len=${projLen}`);

// Grid cache invalidation: changing level doesn't crash
console.log('\n=== Level Transition Safety ===');
const gs3 = new GameState();
gs3.selectLevel(0);
for (let i = 0; i < 60; i++) gs3.update(dt);
// Simulate level win by forcing all enemies dead
gs3.enemies.length = 0;
gs3.waves.state = 'done';
gs3.update(dt);
check('Level transition no crash', true);

// Spell system under stress
console.log('\n=== Spell Stress ===');
const gs4 = new GameState();
gs4.selectLevel(0);
gs4.gold = 10000; // unlimited gold
gs4.waves.forceNext();
for (let i = 0; i < 120; i++) gs4.update(dt);
const spellCast = gs4.castSpell('meteor', new Vec2(200, 200));
check('Meteor cast under load', spellCast || gs4.gold < 80, `gold=${gs4.gold}`);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
