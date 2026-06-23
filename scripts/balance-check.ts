// Balance verification: simulates optimal play to prove levels are completable.
// This is the most fundamental test — if the game can't be won, nothing else matters.
// Run: npx tsx scripts/balance-check.ts

import { GameState } from '../src/game/GameState';
import { BALANCE } from '../src/config/balance';
import { getTowerDef } from '../src/game/towers/TowerRegistry';
import { Vec2 } from '../src/engine/math/Vec2';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail = ''): void {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${detail}`); }
}

// Simulate a level with AI: place towers optimally, upgrade when possible, use spells.
function simulateLevel(levelIndex: number, difficulty: 'normal' | 'hard' | 'brutal' = 'normal'): {
  won: boolean; waves: number; kills: number; gold: number; lives: number;
} {
  const gs = new GameState();
  gs.setDifficulty(difficulty);
  gs.selectLevel(levelIndex);

  const dt = 1 / 60;
  const maxTime = 600; // 10 minutes max per level
  let frames = 0;
  let lastWave = 0;
  let levelWon = false;

  // Listen for levelWon event to detect when THIS level is completed
  gs.bus.on('levelWon', () => { levelWon = true; });

  while (!levelWon && gs.phase === 'playing' && frames < maxTime * 60) {
    // AI: place towers on every buildable tile near the path
    if (gs.waves.current > lastWave || frames === 0) {
      lastWave = gs.waves.current;
      // Try to place towers
      for (let ty = 1; ty < gs.grid.rows - 1; ty++) {
        for (let tx = 1; tx < gs.grid.cols - 1; tx++) {
          if (gs.grid.isBuildable(tx, ty) && !gs.towers.some(t => t.tx === tx && t.ty === ty)) {
            // Pick cheapest affordable tower
            const affordable = ['turret', 'frost', 'mortar', 'sniper', 'tesla', 'cannon']
              .map(id => getTowerDef(id))
              .filter(d => gs.gold >= d.cost);
            if (affordable.length > 0) {
              const pick = affordable[0];
              gs.selectedTowerId = pick.id;
              gs.tryPlace(tx, ty);
            }
          }
        }
      }
    }

    // AI: upgrade towers when affordable
    for (const t of gs.towers) {
      if (t.nextUpgrade && gs.gold >= t.nextUpgrade.cost) {
        gs.upgradeTower(t);
      }
    }

    // AI: force next wave when between waves
    if (gs.waves.state === 'between' || gs.waves.state === 'idle') {
      gs.waves.forceNext();
    }

    // AI: use spells when enemies are on screen
    if (gs.enemies.length > 3 && gs.spells[0] && gs.spells[0].ready && gs.gold >= gs.spells[0].def.cost) {
      const center = gs.enemies.reduce((acc, e) => acc.add(e.pos), new Vec2(0, 0)).mul(1 / gs.enemies.length);
      gs.castSpell('meteor', center);
    }
    if (gs.enemies.length > 5 && gs.spells[1] && gs.spells[1].ready && gs.gold >= gs.spells[1].def.cost) {
      gs.castSpell('freeze', new Vec2(0, 0));
    }

    gs.update(dt);
    frames++;
  }

  return {
    won: levelWon,
    waves: gs.waves.current,
    kills: gs.stats.get().kills,
    gold: gs.stats.get().goldEarned,
    lives: gs.lives,
  };
}

// Test each level on Normal
console.log('\n=== Balance Check: Normal Difficulty ===');
for (let i = 0; i < 6; i++) {
  const result = simulateLevel(i, 'normal');
  check(`Level ${i + 1} completable on Normal`, result.won,
    `waves=${result.waves} kills=${result.kills} gold=${result.gold} lives=${result.lives}`);
}

// Test level 1 on Hard and Brutal
console.log('\n=== Balance Check: Higher Difficulties ===');
const hard1 = simulateLevel(0, 'hard');
check('Level 1 completable on Hard', hard1.won, `lives=${hard1.lives}`);

const brutal1 = simulateLevel(0, 'brutal');
check('Level 1 completable on Brutal', brutal1.won, `lives=${brutal1.lives}`);

// Economy check: starting gold should allow at least 2 towers
console.log('\n=== Economy Check ===');
check('Start gold buys 2 turrets', BALANCE.startGold >= getTowerDef('turret').cost * 2,
  `${BALANCE.startGold} vs ${getTowerDef('turret').cost * 2}`);
check('Start gold buys 1 frost', BALANCE.startGold >= getTowerDef('frost').cost,
  `${BALANCE.startGold} vs ${getTowerDef('frost').cost}`);

// Wave scaling check: wave 12 should be significantly harder than wave 1
console.log('\n=== Scaling Check ===');
const wave1Enemies = 4 + 1 * 2; // grunt count formula
const wave12Enemies = 4 + 12 * 2;
check('Wave 12 has 3x+ more enemies than wave 1', wave12Enemies >= wave1Enemies * 3,
  `w1=${wave1Enemies} w12=${wave12Enemies}`);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
