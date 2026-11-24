import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { GameState } from '../src/game/GameState';
import { getLeaderboard } from '../src/utils/Leaderboard';
import { SaveSystem, type RunResult } from '../src/utils/SaveSystem';
import { decodeChallenge, encodeChallenge } from '../src/utils/ChallengeCode';
import { runRecordKey, type RunOrigin } from '../src/utils/RunRecords';
import { weeklyMode } from '../src/utils/WeeklyMode';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
} });

const profile = new SaveSystem(true);
profile.recordEndlessRun(900_000, 99); // imported legacy, two independent maxima
function result(id: string, origin: RunOrigin, score: number, wave: number, clearedWave = wave): RunResult {
  return { id, origin, scoreVersion: 1, score, wave, clearedWave, missionDate: '2026-06-28',
    missions: { score, wave, stats: { kills: 999, upgrades: 10, spellsCast: 10, towersPlaced: 10 } },
    campaign: null, endless: true, dailyDate: null, weekly: null };
}

const endless: RunOrigin = { kind: 'endless' };
profile.settleRun(result('strong', endless, 50_000, 20));
profile.settleRun(result('long', endless, 43_000, 29));
const standing = getLeaderboard(profile, 'endless').find(row => row.isPlayer);
assert.deepEqual([standing?.score, standing?.wave], [50_000, 20]);
assert.equal(profile.get().records[runRecordKey(endless, 1)].furthestWave, 29);
assert.equal(profile.get().endlessHighScore, 900_000, 'historical scores are preserved, not mixed');

const oldRun = new GameState();
const p1 = decodeChallenge('P1-A1784F01-HV-2025-W26-122340');
assert(p1 && 'difficulty' in p1);
oldRun.startSharedChallenge(p1);
assert.equal(oldRun.snapshot().origin?.kind, 'custom');
assert.equal(oldRun.challengeRules.version, null);
const weekly: RunOrigin = { kind: 'weekly', period: '2025-W26' };
const campaignBefore = JSON.stringify(profile.get());
const practice = result('practice', { kind: 'custom', code: encodeChallenge(oldRun.challengeRules) }, 100_000, 30);
profile.settleRun({ ...practice, weekly: { id: weeklyMode('2025-W26').id, reward: 4 } });
const before = JSON.parse(campaignBefore);
assert.equal(profile.get().missionCredits, before.missionCredits);
assert.equal(profile.get().talents.points, before.talents.points);
assert.equal(getLeaderboard(profile, 'endless').find(row => row.isPlayer)?.score, 50_000);
assert.equal(profile.get().records[runRecordKey(practice.origin!, 1)].best.score, 100_000);

assert.equal(profile.settleRun(result('reached', weekly, 10_000, 8, 7)).weeklyCredits, 0);
assert.equal(profile.settleRun(result('cleared', weekly, 11_000, 8, 8)).weeklyCredits, weeklyMode('2025-W26').reward);
assert.equal(profile.settleRun(result('repeat', weekly, 20_000, 16, 16)).weeklyCredits, 0);
for (const date of ['2026-06-28', '2026-06-27']) {
  profile.settleRun(result(`on-${date}`, { kind: 'daily', period: date }, 1000, 6));
  assert.equal(profile.get().records[runRecordKey({ kind: 'daily', period: date }, 1)].best.score, 1000);
}

const official = new GameState();
official.startWeekly('2025-W26');
assert.equal(official.snapshot().origin?.kind, 'weekly');
const code = encodeChallenge(official.challengeRules);
assert.match(code, /^P2-R1-S1-/);
assert.equal(decodeChallenge(code.replace('-R1-', '-R9-')), null);
const copy = new GameState();
const parsed = decodeChallenge(code);
assert(parsed && 'difficulty' in parsed);
copy.startSharedChallenge(parsed);
assert.equal(copy.snapshot().origin?.kind, 'custom');
assert.deepEqual(copy.challengeRules, official.challengeRules);
assert.deepEqual(copy.waves.previewNext(), official.waves.previewNext());
const continued = new GameState();
assert(continued.restore(official.snapshot()));
assert.deepEqual(continued.snapshot().origin, official.snapshot().origin);
assert.deepEqual(continued.challengeRules.version, official.challengeRules.version);
continued.restart();
assert.equal(continued.runOrigin.kind, 'custom', 'a new attempt in an expired period is personal practice');
const vector = decodeChallenge('P2-R1-S1-A1784F01-HV-2025-W26-122340');
assert(vector && 'difficulty' in vector);
const fixed = new GameState();
fixed.startSharedChallenge(vector);
const opener = [];
for (let i = 0; i < 12; i++) {
  const wave = fixed.waves.previewNext();
  assert(wave && fixed.waves.forceNext());
  opener.push([wave.waveNumber, wave.enemies.map(enemy => [enemy.id, enemy.count])]);
  fixed.waves.update(1e6, fixed.grid, []);
}
const digest = createHash('sha256').update(JSON.stringify([fixed.gold, fixed.lives, opener])).digest('hex');
assert.equal(digest, 'c7d69cb350f733e9b51a1ff4bd78e879c96d585d8b3447b80f925d8c27d48bb7', 'P2-R1/S1 reference opener');
console.log('PASS paired standings, historical score separation, official-week eligibility, cross-period records, and versioned challenge codes');
