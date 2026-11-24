import assert from 'node:assert/strict';
import { GameState } from '../src/game/GameState';
import { Vec2 } from '../src/engine/math/Vec2';
import { clearRun, loadRun, loadRunSettlements, saveRun } from '../src/utils/RunSave';
import { save } from '../src/utils/storage';
import { decodeChallenge, encodeChallenge } from '../src/utils/ChallengeCode';
import { dailyDateStr } from '../src/utils/DailyChallenge';

const storage = new Map<string, string>();
let blockProfileWrite = false;
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (blockProfileWrite && key === 'praesidium:save') throw new Error('profile write unavailable');
      storage.set(key, value);
    },
    removeItem: (key: string) => storage.delete(key),
  },
});

const DT = 1 / 60;
const KEY = 'run:snapshot';
const json = <T>(data: T): T => JSON.parse(JSON.stringify(data));

const live = new GameState();
live.setDifficulty('hard');
live.selectLevel(0);
live.gold = 1_000;
assert(live.tryPlace(2, 10));
assert(live.tryPlace(2, 9));
assert(live.upgradeTower(live.towers[0]));
assert(live.upgradeTower(live.towers[0]));
live.towers[0].cycleStrategy();
live.waves.autoSend = true;
assert(live.waves.forceNext());

for (let i = 0; i < 900; i++) {
  live.update(DT);
  if (live.waves.current >= 2 && live.enemies.length && live.projectiles.some(shot => shot.target && !shot.target.dead)) break;
}
assert(live.waves.current >= 2, 'fixture advances past the first wave');
assert(live.enemies.length > 0, 'fixture includes live enemies');
assert(live.projectiles.some(shot => shot.target && !shot.target.dead), 'fixture includes an in-flight shot');
live.enemies[0].applySlow(0.5, 2);
live.enemies[0].shield(10);
live.lives--;
assert(live.castSpell('repair', Vec2.zero));
live.autoSave();

const checkpoint = loadRun();
assert(checkpoint?.v === 2);
const restored = new GameState();
restored.restore(checkpoint);
assert.equal(restored.analytics.get().sessions, live.analytics.get().sessions);
assert.deepEqual(restored.analytics.get().levelsAttempted, live.analytics.get().levelsAttempted);
assert.equal(restored.towers[0].sellValue, live.towers[0].sellValue);
assert.equal(restored.towers[0].damage, live.towers[0].damage);
assert.equal(restored.towers[0].fireRate, live.towers[0].fireRate);
assert.deepEqual(json(restored.snapshot()), checkpoint);
for (let i = 0; i < 3_600; i++) {
  live.update(DT);
  restored.update(DT);
  if (i % 60 === 0) assert.deepEqual(json(restored.snapshot()), json(live.snapshot()), `simulation drift at tick ${i}`);
}
assert.equal(restored.phase, live.phase);
console.log('PASS  active battle round-trip and 60 seconds of identical simulation');

const legacy = {
  ...checkpoint,
  v: 1,
  waveCurrent: 6,
  weeklyModeActive: false,
  spellCooldowns: [-0.01, 0, 0],
};
save(KEY, legacy);
const legacyCheckpoint = loadRun();
assert(legacyCheckpoint?.v === 1);
const migrated = new GameState();
migrated.restore(legacyCheckpoint);
assert.equal(migrated.waves.current, 6);
assert.equal(migrated.waves.state, 'running');
assert.equal(migrated.towers[0].damage, restored.towers[0].damage);
assert.equal(migrated.spells[0].cooldown, 0);
migrated.update(DT);
assert.equal(migrated.enemies.length, 1);
console.log('PASS  legacy wave 6 resumes without multiplying upgrades');

const seeded = new GameState();
seeded.startWeekly();
function advanceEmptyWave(state: GameState): void {
  assert(state.waves.forceNext());
  state.waves.update(1_000_000, state.grid, []);
}
for (let i = 0; i < 16; i++) advanceEmptyWave(seeded);
const next = seeded.waves.previewNext();
assert(next);
saveRun(seeded.snapshot());
assert(seeded.waves.forceNext());
const nextGroups = seeded.waves.snapshot().spawnGroups;
const savedChallenge = loadRun();
assert(savedChallenge?.v === 2);
assert.equal(savedChallenge.dailyDate, null);
const resumedChallenge = new GameState();
resumedChallenge.restore(savedChallenge);
assert.equal(resumedChallenge.activeWeeklyMode?.weekKey, seeded.activeWeeklyMode?.weekKey);
assert.deepEqual(resumedChallenge.waves.previewNext(), next);
const spawned: GameState['enemies'] = [];
assert(resumedChallenge.waves.forceNext());
resumedChallenge.waves.update(1_000_000, resumedChallenge.grid, spawned);
assert.equal(spawned.length, next.totalCount);
save(KEY, { ...savedChallenge, v: 1, waveCurrent: next.waveNumber });
const legacyEndless = loadRun();
assert(legacyEndless?.v === 1);
const resumedLegacyEndless = new GameState();
resumedLegacyEndless.restore(legacyEndless);
assert.deepEqual(resumedLegacyEndless.waves.snapshot().spawnGroups, nextGroups);
assert(resumedChallenge.save.recordDailyRun(800, 9, '2026-06-28'));
assert(!resumedChallenge.save.recordDailyRun(1_000, 12, '2026-06-27'));
assert.equal(resumedChallenge.save.get().dailyHighScore, 800);
const random = new GameState();
random.startEndless();
const randomSeed = random.endlessSeed;
random.restart();
assert.equal(random.endlessSeed, randomSeed);
assert.equal(random.weeklyModeActive, false);
console.log('PASS  seeded wave forecasts, legacy RNG position, and restart preserve run context');

for (const broken of [
  { ...checkpoint, difficulty: 'constructor' },
  { ...checkpoint, levelIndex: -1 },
  { ...checkpoint, towers: [checkpoint.towers[0], checkpoint.towers[0]] },
  { ...checkpoint, projectiles: [{ ...checkpoint.projectiles[0], targetIndex: 9_999 }] },
  { ...checkpoint, waves: { ...checkpoint.waves, state: 'running', spawnGroups: [] } },
]) {
  save(KEY, broken);
  assert.equal(loadRun(), null);
}
clearRun();
assert.equal(loadRun(), null);
console.log('PASS  corrupt saves rejected and save slot clears');

storage.clear();
save('talents', { points: 12, ranks: { damage: 2 } });
const original = new GameState();
original.startSharedChallenge({ seed: 0xa1784f01, weeklyKey: '2025-W26', difficulty: 'hard', talentRanks: [1, 2, 2, 3, 4, 0], variedOpener: true });
const code = encodeChallenge(original.challengeRules);
assert.deepEqual(decodeChallenge(code), original.challengeRules);
assert.deepEqual(decodeChallenge('0xcafe'), { seed: 0xcafe });
for (const invalid of ['0', '123456789', 'P1-A1784F01-H-2025-W00-122340', 'P1-A1784F01-H-2025-W26-122346']) {
  assert.equal(decodeChallenge(invalid), null);
}
assert(original.talents.rankUp('damage'));
assert.equal(original.talents.rank('damage'), 3);
assert.equal(original.talentMultiplier('damage'), 1.16);
const replay = new GameState();
const decoded = decodeChallenge(code);
assert(decoded && 'difficulty' in decoded);
replay.startSharedChallenge(decoded);
assert.equal(replay.activeWeeklyMode?.weekKey, '2025-W26');
assert.equal(replay.gold, original.gold);
assert.equal(replay.lives, original.lives);
assert.equal(replay.difficulty, original.difficulty);
assert.equal(replay.talentMultiplier('damage'), original.talentMultiplier('damage'));
const anotherSeed = new GameState();
anotherSeed.startSharedChallenge({ ...original.challengeRules, seed: 3 });
let openingDifferences = 0;
for (let i = 0; i < 16; i++) {
  assert.deepEqual(replay.waves.previewNext(), original.waves.previewNext());
  if (i < 12 && JSON.stringify(original.waves.previewNext()) !== JSON.stringify(anotherSeed.waves.previewNext())) openingDifferences++;
  advanceEmptyWave(original);
  advanceEmptyWave(replay);
  advanceEmptyWave(anotherSeed);
}
assert(openingDifferences >= 2);
original.autoSave(true);
const originalSaved = loadRun();
assert(originalSaved?.v === 2);
const loadedReplay = new GameState();
assert(loadedReplay.restore(originalSaved));
assert.equal(encodeChallenge(loadedReplay.challengeRules), code);
loadedReplay.restart();
assert.equal(encodeChallenge(loadedReplay.challengeRules), code);

const utcBoundary = new Date('2026-06-27T04:00:00+08:00');
const date = dailyDateStr(utcBoundary);
assert.equal(date, '2026-06-26');
loadedReplay.startDaily(date);
assert.equal(loadedReplay.difficulty, 'normal');
assert.deepEqual(loadedReplay.challengeRules.talentRanks, [0, 0, 0, 0, 0, 0]);
assert.equal(loadedReplay.snapshot().dailyDate, date);
assert.equal(loadedReplay.activeWeeklyMode?.weekKey, '2026-W26');
console.log('PASS  cross-week challenge code round-trip, locked loadout, and UTC daily rules');

storage.clear();
save('talents', { points: 8, ranks: { damage: 2 } });
const player = new GameState();
player.selectLevel(0);
player.autoSave();
const sameRun = loadRun();
assert(sameRun?.v === 2);
const duplicate = new GameState();
assert(duplicate.restore(sameRun));

function win(state: GameState): void {
  state.score = 1_200;
  state.waves.current = state.waves.totalWaves;
  state.waves.state = 'done';
  state.enemies.length = 0;
  state.update(DT);
  assert.equal(state.phase, 'won');
}

blockProfileWrite = true;
win(player);
assert.equal(player.talents.talentPoints, 11);
assert.equal(loadRun()?.v, 2);
assert.equal(loadRunSettlements().length, 1);
assert.equal(storage.get('praesidium:save'), undefined);
const blocked = new GameState();
assert.equal(blocked.restore(sameRun), false);
assert.equal(loadRun()?.v, 2);
blockProfileWrite = false;
const persisted = new GameState();
assert.equal(loadRun(), null);
assert.equal(loadRunSettlements().length, 0);
assert.equal(persisted.talents.talentPoints, 11);
assert.equal(persisted.talents.rank('damage'), 2);
assert.equal(persisted.save.getStars(1), 3);
assert(persisted.save.isLevelUnlocked(2));
assert.equal(persisted.save.getRecord({ kind: 'campaign', level: 1, difficulty: 'normal' })?.best.score, 1_200);
assert.equal(persisted.restore(sameRun), false);
player.autoSave();
win(duplicate);
assert.equal(duplicate.talents.talentPoints, 11);

const otherRun = new GameState();
otherRun.selectLevel(1);
otherRun.autoSave(true);
const otherSnapshot = loadRun();
assert(otherSnapshot?.v === 2);
player.restart();
player.autoSave();
assert.deepEqual(loadRun(), otherSnapshot);
win(player);
assert.deepEqual(loadRun(), otherSnapshot);
for (let i = 0; i < 5; i++) {
  player.restart();
  win(player);
}
assert.equal(player.achievements.isUnlocked('conqueror'), false);
for (let i = 1; i < player.levels.total; i++) {
  player.selectLevel(i);
  win(player);
}
assert.equal(player.achievements.isUnlocked('conqueror'), true);
console.log('PASS  settlement retries atomically, deduplicates the same run, preserves other saves and counts distinct wins');
