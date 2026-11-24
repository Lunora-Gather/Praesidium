import assert from 'node:assert/strict';
import { GameState } from '../src/game/GameState';
import { Analytics } from '../src/utils/Analytics';
import { buildProductHealth } from '../src/utils/ProductHealth';
import { Tutorial } from '../src/utils/Tutorial';
import { save } from '../src/utils/storage';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
} });

const tutorial = new Tutorial();
const state = new GameState();
state.selectLevel(0);
tutorial.update(state);
assert.equal(tutorial.active?.id, 'select', 'a preselected tower is not a player action');
tutorial.record('select');
tutorial.record('place');
tutorial.record('wave');
tutorial.record('inspect');
tutorial.record('upgrade');
state.waves.current = 2;
tutorial.update(state);
assert.equal(tutorial.active?.id, 'intel', 'starting a second wave is not Intel discovery');
tutorial.record('intel');
tutorial.update(state);
assert.equal(tutorial.active?.id, 'spell');
tutorial.reset();
assert.equal(tutorial.active?.id, 'select');

storage.clear();
save('analytics', { totalPlaySec: 600, avgSessionSec: 200, sessions: 3 });
const analytics = new Analytics();
assert.equal(analytics.get().totalPlaySec, 0, 'legacy simulated time cannot be relabeled as active time');
assert.equal(analytics.get().simulatedSec, 600);
const origin = { kind: 'campaign', level: 1, difficulty: 'hard' } as const;
analytics.startSession('intro-run', origin);
analytics.tickActive(2, origin);
analytics.tickSimulation(6, origin);
assert.equal(analytics.get().totalPlaySec, 2);
assert.equal(analytics.get().simulatedSec, 606);
analytics.recordFirstAction('tower', 'intro-run', origin);
analytics.tickActive(3, origin);
analytics.recordFirstAction('wave', 'intro-run', origin);
analytics.recordFirstAction('intel', 'intro-run', origin);
analytics.recordOutcome(origin, true, 12);
assert.equal(analytics.get().onboarding?.firstTowerSec, 2);
assert.equal(analytics.get().onboarding?.firstWaveSec, 5);
assert.equal(analytics.get().onboarding?.intelOpened, true);
assert.equal(analytics.get().byDifficulty.hard?.won, 1);
assert.equal(analytics.get().byMode.campaign?.finished, 1);
assert.equal(buildProductHealth(analytics.get()).balanceScore, null);
assert.equal(buildProductHealth(analytics.get()).retentionScore, null);
console.log('PASS action-based tutorial, local discovery timing, speed-independent playtime and honest sample handling');
