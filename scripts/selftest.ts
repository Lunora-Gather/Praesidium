// Lightweight runtime sanity checks — no test framework, just assertions.
// Run: npx tsx scripts/selftest.ts  (or compile + node). Validates core logic.

import { computeStars } from '../src/game/Stars';
import { applyResistance, DamageType } from '../src/game/DamageType';
import { Tower } from '../src/game/towers/Tower';
import { getTowerDef } from '../src/game/towers/TowerRegistry';
import { Grid } from '../src/game/grid/Grid';
import { LEVELS } from '../src/game/grid/LevelManager';
import { Vec2 } from '../src/engine/math/Vec2';
import { Pathfinding } from '../src/game/grid/Pathfinding';
import { GameState } from '../src/game/GameState';
import { WaveManager } from '../src/game/waves/WaveManager';
import { SaveSystem } from '../src/utils/SaveSystem';
import { setLocale, t as tr } from '../src/utils/i18n';
import { achievementName, enemyName, spellName, towerName, traitName } from '../src/utils/displayText';
import type { MenuClickAction, ScreenStats } from '../src/ui/Screens';
import { dailyMissions, evaluateMissions, missionSummary } from '../src/utils/DailyMissions';
import { buildProductHealth } from '../src/utils/ProductHealth';
import { weekKey, weeklyMode, weeklyModeSummary } from '../src/utils/WeeklyMode';
import { weeklyRules, weeklyRuleSummary } from '../src/utils/WeeklyRules';
import { classifyBossEncounter } from '../src/utils/BossEncounter';
import { drawWeeklyRunBadge } from '../src/ui/WeeklyRunBadge';

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

// --- UI action contract ---
const endActions: MenuClickAction[] = ['next', 'levels', 'restart', 'menu'];
check('end screen action next exists', endActions.includes('next'));
check('end screen action levels exists', endActions.includes('levels'));
const summaryShape: ScreenStats = { stars: 3, hasNextLevel: true, isNewHighScore: true, isNewLevelScore: true, isStarUpgrade: true };
check('screen summary supports hasNextLevel', summaryShape.hasNextLevel === true);
check('screen summary supports record badges', !!summaryShape.isNewHighScore && !!summaryShape.isNewLevelScore && !!summaryShape.isStarUpgrade);

// --- Daily missions / retention ---
const missions = dailyMissions('2026-06-27');
const missionsAgain = dailyMissions('2026-06-27');
check('daily missions returns three objectives', missions.length === 3);
check('daily missions are deterministic per date', missions.map(m => m.id).join('|') === missionsAgain.map(m => m.id).join('|'));
const progress = evaluateMissions(missions, { wave: 20, score: 9999, stats: { kills: 999, upgrades: 99, spellsCast: 99, towersPlaced: 99 } });
check('daily mission progress evaluates all objectives', progress.length === missions.length);
check('high activity completes all daily missions', progress.every(item => item.complete));
check('daily mission summary reports completion', missionSummary(progress).startsWith('3/3'));

// --- Weekly mode / long-term retention ---
const wk = weekKey(new Date(Date.UTC(2026, 5, 27)));
const weeklyA = weeklyMode(wk);
const weeklyB = weeklyMode(wk);
const rules = weeklyRules(weeklyA);
check('weekly mode has stable week key', wk.startsWith('2026-W'));
check('weekly mode deterministic per week', weeklyA.id === weeklyB.id);
check('weekly mode summary includes reward', weeklyModeSummary(weeklyA).includes('reward'));
check('weekly rules expose at least one modifier field', rules.speedMul >= 1 && rules.hpMul >= 1 && rules.countMul >= 1 && rules.startGoldMul <= 1 && rules.bossHpMul >= 1);
check('weekly rule summary is readable', weeklyRuleSummary(weeklyA).length > 6);
check('weekly run badge renderer is exported', typeof drawWeeklyRunBadge === 'function');

// --- Boss encounter variety ---
const wm = new WaveManager(18);
const wave6 = wm.waves[5].enemies.filter(group => group.count > 0);
const wave12 = wm.waves[11].enemies.filter(group => group.count > 0);
const wave18 = wm.waves[17].enemies.filter(group => group.count > 0);
check('wave 6 includes boss', wave6.some(group => group.id === 'boss'));
check('wave 6 boss encounter includes escort enemies', wave6.some(group => group.id !== 'boss' && group.count > 0));
check('later boss encounter changes composition', wave12.map(group => group.id).join('|') !== wave6.map(group => group.id).join('|'));
check('boss classifier detects armored escort', classifyBossEncounter(wave6).id === 'armored_escort');
check('boss classifier detects phantom siege', classifyBossEncounter(wave12).id === 'phantom_siege');
check('boss classifier detects fast escort', classifyBossEncounter(wave18).id === 'fast_escort');

// --- Product health diagnostics ---
const health = buildProductHealth({
  sessions: 6,
  totalPlaySec: 900,
  lastPlayDate: '2026-06-27',
  returnDays: 1,
  levelsCompleted: { 0: 1 },
  levelsAttempted: { 0: 5, 1: 2 },
  endlessBestWave: 4,
  endlessRuns: 1,
  churnPoints: [
    { level: 0, wave: 1, difficulty: 'normal' },
    { level: 0, wave: 2, difficulty: 'normal' },
    { level: 1, wave: 2, difficulty: 'normal' },
  ],
  towerUsage: { turret: 20, sniper: 1, mortar: 1, frost: 1 },
  spellUsage: {},
  avgSessionSec: 150,
  longestSessionSec: 300,
});
check('product health returns scores', health.retentionScore >= 0 && health.balanceScore >= 0);
check('product health flags risks', health.risks.length >= 1);

// --- Localization sanity ---
const i18nKeys = [
  'tower.damage',
  'tower.upgrade',
  'tower.sell',
  'towerDef.turret.name',
  'towerDef.cannon.desc',
  'spell.meteor.name',
  'spell.freeze.desc',
  'enemy.grunt.name',
  'enemy.boss.desc',
  'achievement.first_blood.name',
  'achievement.conqueror.desc',
  'talent.gold.name',
  'talent.damage.desc',
  'achievement.unlocked',
  'trait.resistsIce',
  'hud.auto',
];
setLocale('en');
for (const key of i18nKeys) check(`i18n en ${key}`, tr(key) !== key);
setLocale('zh');
for (const key of i18nKeys) check(`i18n zh ${key}`, tr(key) !== key);
check('localized tower helper zh', towerName('turret', 'Turret') === '哨戒塔');
check('localized enemy helper zh', enemyName('boss', 'Warlord') === '战争领主');
check('localized spell helper zh', spellName('meteor', 'Meteor') === '陨石');
check('localized achievement helper zh', achievementName('first_blood', 'First Blood') === '第一滴血');
check('localized trait helper zh', traitName('Resists Ice') === '抗冰霜');
setLocale('en');

// --- Save/campaign helpers ---
const save = new SaveSystem();
save.reset();
check('default first level unlocked', save.isLevelUnlocked(1) === true);
check('default second level locked', save.isLevelUnlocked(2) === false);
save.recordLevelReached(3);
check('recordLevelReached unlocks through level', save.getUnlockedLevelCount() === 3);
check('unlocked helper reflects progress', save.isLevelUnlocked(3) === true && save.isLevelUnlocked(4) === false);
save.recordStars(1, 2);
save.recordStars(2, 3);
save.recordLevelScore(1, 1234);
check('getStars returns best stars', save.getStars(1) === 2 && save.getStars(2) === 3);
check('getLevelScore returns best score', save.getLevelScore(1) === 1234);
check('campaign total stars', save.getTotalStars() === 5);
check('campaign max stars', save.getMaxStars() === LEVELS.length * 3);
check('campaign ratio', Math.abs(save.getCampaignCompletionRatio() - 5 / (LEVELS.length * 3)) < 1e-9);
save.recordLevelReached(999);
check('recordLevelReached clamps to max level', save.getUnlockedLevelCount() === LEVELS.length);

// --- Integration: full game loop simulation ---
const gs = new GameState();
gs.setDifficulty('normal');
gs.selectLevel(0);
check('game starts in playing', gs.phase === 'playing');
check('initial gold > 0', gs.gold > 0);
check('initial lives > 0', gs.lives > 0);

let placedCount = 0;
for (let ty = 2; ty < 10 && placedCount < 3; ty++) {
  for (let tx = 2; tx < 14 && placedCount < 3; tx++) {
    if (gs.grid.isBuildable(tx, ty) && !gs.towers.some(t => t.tx === tx && t.ty === ty)) {
      if (gs.tryPlace(tx, ty)) placedCount++;
    }
  }
}
check('can place towers', placedCount >= 1);
check('towers on board', gs.towers.length >= 1);

gs.waves.forceNext();
const dt = 1 / 60;
for (let i = 0; i < 90 * 60; i++) {
  gs.update(dt);
  if (gs.phase !== 'playing') break;
}
check('game loop runs without crash', true);
check('enemies spawned or waves progressed', gs.waves.current >= 1);
const stillAlive = gs.phase === 'playing' || gs.phase === 'won';
const diedWithProgress = gs.phase === 'lost' && gs.waves.current >= 1;
check('game reaches meaningful state', stillAlive || diedWithProgress);

// --- End-screen navigation flow ---
const nav = new GameState();
nav.selectLevel(0);
const firstLevel = nav.levels.levelNumber;
nav.advanceLevel();
check('advanceLevel starts next level when available', nav.phase === 'playing' && nav.levels.levelNumber > firstLevel);

const finalNav = new GameState();
finalNav.selectLevel(LEVELS.length - 1);
finalNav.advanceLevel();
check('advanceLevel returns to level select after final level', finalNav.phase === 'levelSelect');

// --- Endless mode ---
const gs2 = new GameState();
gs2.endless = true;
gs2.selectLevel(0);
check('endless starts playing', gs2.phase === 'playing');
check('endless seed set', gs2.endlessSeed !== 0);
check('random endless does not auto-enable weekly mode', gs2.weeklyModeActive === false && gs2.activeWeeklyMode === null);
gs2.waves.forceNext();
for (let i = 0; i < 60 * 60; i++) {
  gs2.update(dt);
  if (gs2.phase !== 'playing') break;
}
check('endless runs without crash', true);
check('endless never reaches won', gs2.phase !== 'won');

// --- Challenge seed reproducibility ---
const gs3 = new GameState();
gs3.endless = true;
gs3.endlessSeed = 0xDEADBEEF;
gs3.selectLevel(0);
check('challenge seed preserved', gs3.endlessSeed === 0xDEADBEEF);
check('challenge wave seed set', gs3.waves.endlessSeed === 0xDEADBEEF);
check('seeded challenge auto-enables weekly mode', gs3.weeklyModeActive === true && gs3.activeWeeklyMode !== null);
check('weekly mode persists in run snapshot', gs3.snapshot().weeklyModeActive === true);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
