import assert from 'node:assert/strict';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { ProgressStore, progressGuard } from '../src/utils/ProgressStore';
import { GameState } from '../src/game/GameState';
import { load, save } from '../src/utils/storage';
import type { RunResult } from '../src/utils/SaveSystem';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
  },
});

function victory(id: string, level: number, score: number): RunResult {
  return {
    id, score, wave: 12, missionDate: '2026-06-28',
    missions: { score, wave: 12, stats: { kills: 1, upgrades: 0, spellsCast: 0, towersPlaced: 1 } },
    campaign: { level, stars: 3 }, endless: false, dailyDate: null, weekly: null,
  };
}

const legacyGame = new GameState();
legacyGame.selectLevel(0);
const first = legacyGame.snapshot();
const a = victory(first.runId!, 1, 800);
const b = victory('second-victory', 2, 1_500);
const factory = new IDBFactory();
assert(save('talents', { points: 2, ranks: { damage: 1 } }));
assert(save('run:snapshot', first));
assert(save('run:settlements', [a, b]));
const [left, right] = await Promise.all([ProgressStore.open(factory), ProgressStore.open(factory)]);
try {
  await Promise.all([left.settle(a.id), right.settle(b.id), right.settle(a.id)]);
  const committed = await left.read();
  assert.deepEqual(committed.profile.levelStars, { 1: 3, 2: 3 });
  assert.equal(committed.profile.talents.points, 8);
  assert.equal(committed.profile.maxLevelReached, 3);
  assert.equal(committed.checkpoint, null, 'only the settled run checkpoint was removed');
  assert.deepEqual(await right.pending(), []);
  assert.deepEqual(load('run:snapshot', null), first, 'migration must not destroy the legacy source');
  assert.deepEqual(load('run:settlements', []), [a, b]);
  console.log('PASS transactional two-connection settlement, duplicate retry, and non-destructive migration');

  const fromMenu = progressGuard(committed);
  legacyGame.restart();
  const active = legacyGame.snapshot();
  assert(await left.start(active, 'tab-a', fromMenu));
  assert.equal(await right.start(first, 'tab-b', fromMenu), false, 'stale menu cannot replace a new checkpoint');
  legacyGame.waves.forceNext();
  const later = legacyGame.snapshot();
  assert(await left.checkpoint(later, 'tab-a', 2));
  assert.equal(await left.checkpoint(active, 'tab-a', 1), false, 'older snapshot from the same owner is fenced');
  const saved = await right.read();
  assert.equal(saved.checkpoint?.snapshot.v === 2 && saved.checkpoint.snapshot.waves.current, 1);
  const transferred = await right.claim('tab-b', progressGuard(saved));
  assert.equal(transferred?.owner, 'tab-b');
  assert.equal(await left.checkpoint(later, 'tab-a', 3), false, 'previous owner cannot write even with a larger sequence');
  assert.equal(await left.stage(victory(active.runId!, 1, 4_000), 'tab-a'), false, 'previous owner cannot settle the taken-over run');
  assert(await right.stage(victory(active.runId!, 1, 4_000), 'tab-b'));
  legacyGame.restart();
  const replacement = legacyGame.snapshot();
  assert(await left.start(replacement, 'tab-a', progressGuard(await left.read())));
  const originalPut = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (value, key) {
    if (this.name === 'state' && key === 'profile') throw new DOMException('Main write blocked', 'QuotaExceededError');
    return originalPut.call(this, value, key);
  };
  try {
    await assert.rejects(right.settle(active.runId!), { name: 'QuotaExceededError' });
    assert.equal((await left.pending())[0]?.id, active.runId, 'failed commit retains the durable result');
    assert.equal((await left.read()).profile.levelHighScores[1], 800, 'the failed result did not modify the profile');
  } finally { IDBObjectStore.prototype.put = originalPut; }
  const reopened = await ProgressStore.open(factory);
  try { assert(await reopened.settle(active.runId!)); }
  finally { reopened.close(); }
  assert.deepEqual((await left.read()).checkpoint?.snapshot, replacement, 'late settlement must not clear a different run');
  assert.deepEqual(await left.pending(), []);
  console.log('PASS slot acquisition, stale snapshot rejection, owner fencing, and late settlement');

  const exported = await left.exportBackup();
  const cloned = JSON.stringify(exported);
  assert.equal(await right.restoreBackup('{"format":"Praesidium progress","schema":1}', progressGuard(await right.read())), 'invalid');
  assert.deepEqual((await right.read()).checkpoint?.snapshot, replacement);
  const freshFactory = new IDBFactory();
  storage.clear();
  const fresh = await ProgressStore.open(freshFactory);
  try {
    assert.equal(await fresh.restoreBackup(cloned, progressGuard(await fresh.read())), 'restored');
    const imported = await fresh.read();
    assert.deepEqual(imported.profile, exported.profile);
    assert.deepEqual(imported.checkpoint?.snapshot, replacement);
    assert.equal(imported.checkpoint?.owner, null);
    assert.equal(await fresh.checkpoint(replacement, 'tab-a', 100), false, 'an imported owner token must not authorize writes');
    assert(await fresh.stage(a, 'tab-a'), 'already settled run retained its deduplication marker');
    assert.equal(await fresh.settle(a.id), null);
    assert.deepEqual((await fresh.read()).profile, imported.profile);
  } finally { fresh.close(); }
  console.log('PASS versioned backup export and transactional restore; invalid files leave data untouched');
} finally {
  left.close();
  right.close();
}
