// Verify mid-run save/restore round-trip: save a game, load it back, prove state matches.
// This is the #1 retention feature — if it's broken, closing the tab loses all progress.

// Node.js doesn't have localStorage — minimal polyfill
const store: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
};

import { GameState } from '../src/game/GameState';
import { getTowerDef } from '../src/game/towers/TowerRegistry';
import { saveRun, loadRun, clearRun } from '../src/utils/RunSave';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail = ''): void {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${detail}`); }
}

console.log('\n=== Mid-Run Save/Restore Round-Trip ===');

clearRun();
check('no save initially', loadRun() === null);

const gs = new GameState();
gs.setDifficulty('hard');
gs.selectLevel(2);
for (let ty = 2; ty < 10; ty++) {
  for (let tx = 2; tx < 14; tx++) {
    if (gs.grid.isBuildable(tx, ty) && !gs.towers.some(t => t.tx === tx && t.ty === ty)) {
      const affordable = ['turret', 'frost', 'mortar'].map(id => getTowerDef(id)).filter(d => gs.gold >= d.cost);
      if (affordable.length > 0) { gs.selectedTowerId = affordable[0].id; gs.tryPlace(tx, ty); }
    }
  }
}
gs.waves.forceNext();
const dt = 1 / 60;
for (let i = 0; i < 300; i++) gs.update(dt);

const snap = gs.snapshot();
saveRun(snap);
check('save written', snap.v === 1);
check('save has towers', snap.towers.length > 0, `towers=${snap.towers.length}`);
check('save has gold', snap.gold > 0, `gold=${snap.gold}`);
check('save has wave', snap.waveCurrent >= 1, `wave=${snap.waveCurrent}`);
check('save has difficulty', snap.difficulty === 'hard');
check('save has stat snapshot', !!snap.stats);
check('save stat towers placed', snap.stats.towersPlaced >= snap.towers.length, `placed=${snap.stats.towersPlaced} towers=${snap.towers.length}`);
check('save stat duration progresses', snap.stats.durationSec > 0, `duration=${snap.stats.durationSec}`);

const loaded = loadRun();
check('load returns data', loaded !== null);
if (loaded) {
  check('version matches', loaded.v === 1);
  check('level matches', loaded.levelIndex === 2, `got=${loaded.levelIndex}`);
  check('difficulty matches', loaded.difficulty === 'hard');
  check('gold matches', loaded.gold === snap.gold, `saved=${snap.gold} loaded=${loaded.gold}`);
  check('lives matches', loaded.lives === snap.lives);
  check('score matches', loaded.score === snap.score);
  check('wave matches', loaded.waveCurrent === snap.waveCurrent);
  check('tower count matches', loaded.towers.length === snap.towers.length);
  check('endless flag matches', loaded.endless === snap.endless);
  check('endless seed matches', loaded.endlessSeed === snap.endlessSeed);
  check('stat kills match', loaded.stats.kills === snap.stats.kills);
  check('stat towers match', loaded.stats.towersPlaced === snap.stats.towersPlaced);
  check('stat upgrades match', loaded.stats.upgrades === snap.stats.upgrades);
  check('stat spells match', loaded.stats.spellsCast === snap.stats.spellsCast);
  check('stat gold matches', loaded.stats.goldEarned === snap.stats.goldEarned);
  check('stat damage matches', loaded.stats.damageDealt === snap.stats.damageDealt);
  check('stat duration matches', loaded.stats.durationSec === snap.stats.durationSec);

  const restored = new GameState();
  restored.setDifficulty(loaded.difficulty as 'normal' | 'hard' | 'brutal');
  restored.selectLevel(loaded.levelIndex);
  restored.gold = loaded.gold;
  restored.lives = loaded.lives;
  restored.score = loaded.score;
  restored.stats.restore(loaded.stats);
  check('restored stats kills match loaded', restored.stats.get().kills === loaded.stats.kills);
  check('restored stats duration match loaded', restored.stats.get().durationSec === loaded.stats.durationSec);

  if (loaded.towers.length > 0) {
    const t0 = loaded.towers[0];
    check('tower has id', t0.id.length > 0, `id=${t0.id}`);
    check('tower has position', t0.tx >= 0 && t0.ty >= 0);
    check('tower has level', t0.level >= 1);
  }
}

clearRun();
const gs2 = new GameState();
gs2.endless = true;
gs2.endlessSeed = 0xCAFEBABE;
gs2.selectLevel(0);
gs2.waves.forceNext();
for (let i = 0; i < 300; i++) gs2.update(dt);
const snap2 = gs2.snapshot();
saveRun(snap2);
const loaded2 = loadRun();
check('endless save round-trip', loaded2 !== null && loaded2.endless === true);
check('endless seed preserved', loaded2?.endlessSeed === 0xCAFEBABE);
check('endless stats preserved', loaded2 !== null && loaded2.stats.durationSec === snap2.stats.durationSec);

clearRun();
check('clear removes save', loadRun() === null);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
