// Deterministic-ish balance simulation: runs simple bot strategies across levels/difficulties.
// It is not a replacement for playtesting; it is a regression alarm for impossible levels,
// runaway difficulty spikes, obvious tower under/over-use, and late-campaign blockers.
// The report now includes actionable tuning notes so late-campaign fixes can be planned quickly.

const store: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
};

import { DIFFICULTY_LIST, Difficulty } from '../src/config/Difficulty';
import { GameState } from '../src/game/GameState';
import { LEVELS } from '../src/game/grid/LevelManager';
import { getTowerDef, TOWER_LIST } from '../src/game/towers/TowerRegistry';
import type { Tower } from '../src/game/towers/Tower';

type BotPlanId = 'balanced' | 'antiFast' | 'antiBoss';

interface SimResult {
  level: number;
  levelName: string;
  difficulty: Difficulty;
  plan: BotPlanId;
  won: boolean;
  phase: string;
  stars: number;
  lives: number;
  score: number;
  wave: number;
  kills: number;
  towers: number;
  upgrades: number;
  spells: number;
  durationSec: number;
  build: Record<string, number>;
}

const BOT_PLANS: Record<BotPlanId, string[]> = {
  balanced: ['turret', 'mortar', 'frost', 'sniper', 'tesla', 'cannon'],
  antiFast: ['turret', 'frost', 'tesla', 'mortar', 'sniper', 'cannon'],
  antiBoss: ['turret', 'sniper', 'frost', 'cannon', 'tesla', 'mortar'],
};

const DT = 1 / 30;
const MAX_SECONDS = 420;
const THINK_INTERVAL = 0.35;
const LATE_CAMPAIGN_START = 9;

function buildableSites(state: GameState): Array<{ tx: number; ty: number; score: number }> {
  const waypoints = state.grid.waypoints;
  const sites: Array<{ tx: number; ty: number; score: number }> = [];

  for (let ty = 0; ty < state.grid.rows; ty++) {
    for (let tx = 0; tx < state.grid.cols; tx++) {
      if (!state.grid.isBuildable(tx, ty)) continue;
      const center = state.grid.tileCenter(tx, ty);
      const minPathDistance = Math.min(...waypoints.map(wp => center.sub(wp).len()));
      const centerBias = Math.abs(tx - state.grid.cols / 2) + Math.abs(ty - state.grid.rows / 2);
      const score = minPathDistance + centerBias * 6;
      sites.push({ tx, ty, score });
    }
  }

  return sites.sort((a, b) => a.score - b.score);
}

function occupied(state: GameState, tx: number, ty: number): boolean {
  return state.towers.some(t => t.tx === tx && t.ty === ty);
}

function nextAffordableTower(plan: BotPlanId, gold: number, towerCount: number): string | null {
  const order = BOT_PLANS[plan];
  const preferred = order[towerCount % order.length];
  if (gold >= getTowerDef(preferred).cost) return preferred;
  for (const id of order) {
    if (gold >= getTowerDef(id).cost) return id;
  }
  return null;
}

function chooseUpgradeTower(state: GameState): Tower | null {
  const candidates = state.towers
    .filter(tower => tower.nextUpgrade && state.gold >= tower.nextUpgrade.cost)
    .sort((a, b) => {
      const aScore = a.level * 100 - a.damage * a.fireRate;
      const bScore = b.level * 100 - b.damage * b.fireRate;
      return aScore - bScore;
    });
  return candidates[0] ?? null;
}

function maintainEconomy(state: GameState, plan: BotPlanId, sites: Array<{ tx: number; ty: number }>, build: Record<string, number>): void {
  // Early game needs bodies on the map; mid/late game should upgrade high-value towers.
  const shouldUpgrade = state.towers.length >= 4 && (state.towers.length >= 8 || state.gold >= 160);
  if (shouldUpgrade) {
    const upgradeTarget = chooseUpgradeTower(state);
    if (upgradeTarget && state.upgradeTower(upgradeTarget)) return;
  }

  const towerId = nextAffordableTower(plan, state.gold, state.towers.length);
  if (!towerId) return;

  state.selectedTowerId = towerId;
  for (const site of sites) {
    if (occupied(state, site.tx, site.ty)) continue;
    if (state.tryPlace(site.tx, site.ty)) {
      build[towerId] = (build[towerId] ?? 0) + 1;
      return;
    }
  }

  const upgradeTarget = chooseUpgradeTower(state);
  if (upgradeTarget) state.upgradeTower(upgradeTarget);
}

function castUsefulSpells(state: GameState): void {
  if (state.enemies.length >= 9 && state.gold >= 60) {
    const meteor = state.spells.find(sp => sp.def.id === 'meteor');
    const target = state.enemies[Math.floor(state.enemies.length / 2)]?.pos;
    if (meteor?.ready && target) state.castSpell('meteor', target);
  }
  if (state.enemies.length >= 12 && state.gold >= 45) {
    const freeze = state.spells.find(sp => sp.def.id === 'freeze');
    const target = state.enemies[0]?.pos;
    if (freeze?.ready && target) state.castSpell('freeze', target);
  }
  if (state.lives <= 6 && state.gold >= 80) {
    const repair = state.spells.find(sp => sp.def.id === 'repair');
    if (repair?.ready) state.castSpell('repair', state.grid.waypoints[state.grid.waypoints.length - 1]);
  }
}

function simulate(levelIndex: number, difficulty: Difficulty, plan: BotPlanId): SimResult {
  const state = new GameState();
  state.setDifficulty(difficulty);
  state.selectLevel(levelIndex);
  state.waves.autoSend = true;

  const sites = buildableSites(state);
  const build: Record<string, number> = Object.fromEntries(TOWER_LIST.map(t => [t.id, 0]));

  let thinkTimer = 0;
  for (let frame = 0; frame < MAX_SECONDS / DT; frame++) {
    thinkTimer -= DT;
    if (thinkTimer <= 0) {
      maintainEconomy(state, plan, sites, build);
      castUsefulSpells(state);
      thinkTimer = THINK_INTERVAL;
    }

    if (state.waves.state !== 'running' && state.waves.state !== 'done') state.waves.forceNext();
    state.update(DT);
    if (state.phase !== 'playing') break;
  }

  const stats = state.stats.get();
  return {
    level: levelIndex + 1,
    levelName: LEVELS[levelIndex]?.name ?? `Level ${levelIndex + 1}`,
    difficulty,
    plan,
    won: state.phase === 'won',
    phase: state.phase,
    stars: state.lastStars,
    lives: state.lives,
    score: state.score,
    wave: state.waves.current,
    kills: stats.kills,
    towers: stats.towersPlaced,
    upgrades: stats.upgrades,
    spells: stats.spellsCast,
    durationSec: Math.round(stats.durationSec),
    build,
  };
}

function bestByLevelAndDifficulty(results: SimResult[]): SimResult[] {
  const groups = new Map<string, SimResult>();
  for (const result of results) {
    const key = `${result.level}:${result.difficulty}`;
    const prev = groups.get(key);
    if (!prev || Number(result.won) > Number(prev.won) || result.stars > prev.stars || result.score > prev.score) {
      groups.set(key, result);
    }
  }
  return [...groups.values()].sort((a, b) => a.level - b.level || DIFFICULTY_LIST.findIndex(d => d.id === a.difficulty) - DIFFICULTY_LIST.findIndex(d => d.id === b.difficulty));
}

function resultLine(r: SimResult): string {
  const mark = r.won ? 'WIN ' : 'LOSS';
  return `${mark} L${String(r.level).padStart(2, '0')} ${r.levelName.padEnd(16)} ${r.difficulty.padEnd(6)} via ${r.plan.padEnd(8)} | stars=${r.stars} lives=${r.lives} wave=${r.wave} score=${r.score} kills=${r.kills} towers=${r.towers} upgrades=${r.upgrades}`;
}

function towerTotalsFor(results: SimResult[]): Map<string, number> {
  const towerTotals = new Map<string, number>();
  for (const r of results) {
    for (const [id, count] of Object.entries(r.build)) towerTotals.set(id, (towerTotals.get(id) ?? 0) + count);
  }
  return towerTotals;
}

function printTowerDistribution(results: SimResult[], title: string): void {
  const totals = towerTotalsFor(results);
  console.log(`\n${title}`);
  for (const [id, count] of [...totals.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`- ${id.padEnd(7)} ${count}`);
  }
}

function lateCampaignReview(best: SimResult[], allResults: SimResult[]): string[] {
  const risks: string[] = [];
  const lateBest = best.filter(r => r.level >= LATE_CAMPAIGN_START);
  const normalLate = lateBest.filter(r => r.difficulty === 'normal');
  const level9 = normalLate.find(r => r.level === 9);
  const level10 = normalLate.find(r => r.level === 10);

  console.log('\n=== Late Campaign Review ===');
  if (normalLate.length === 0) {
    console.log('No late-campaign normal results found.');
    risks.push('late-campaign results missing');
  } else {
    for (const r of normalLate) console.log(resultLine(r));
  }

  if (!level9) risks.push('level 9 result missing');
  else if (!level9.won && level9.wave <= 2) risks.push('level 9 collapses before meaningful speed-pressure learning');

  if (!level10) risks.push('level 10 result missing');
  else if (!level10.won && level10.wave <= 2) risks.push('level 10 collapses before final-gate strategy emerges');

  const lateAll = allResults.filter(r => r.level >= LATE_CAMPAIGN_START);
  const lateTowerTotals = towerTotalsFor(lateAll);
  const usedLateTowers = [...lateTowerTotals.values()].filter(count => count > 0).length;
  if (usedLateTowers < Math.min(4, TOWER_LIST.length)) risks.push('late-campaign simulations use too few tower types');

  printTowerDistribution(lateAll, 'Late-campaign tower distribution:');

  if (risks.length === 0) console.log('\n✓ No late-campaign automation red flags detected.');
  else {
    console.log('\n⚠ Late-campaign review flags:');
    for (const risk of risks) console.log(`- ${risk}`);
  }
  return risks;
}

function actionNotesForRisks(risks: string[]): string[] {
  const notes = new Set<string>();
  for (const risk of risks) {
    if (risk.includes('normal blocker')) {
      notes.add('Review the failing level wave mix first; reduce early count spikes before changing tower stats globally.');
    }
    if (risk.includes('level 9')) {
      notes.add('For Overdrive Gate, tune speed pressure before HP pressure: add safer early build windows or reduce fast enemy density.');
    }
    if (risk.includes('level 10')) {
      notes.add('For Apex Bastion, keep the final gate strategic: prefer clearer boss phases or path coverage windows over raw HP inflation.');
    }
    if (risk.includes('too few tower types')) {
      notes.add('Improve late-map tower diversity by adding build positions that reward both control towers and long-range damage.');
    }
    if (risk.includes('result missing')) {
      notes.add('Check the simulation loop or level registration before tuning numbers; missing results mean the data is incomplete.');
    }
  }

  if (notes.size === 0) {
    notes.add('No automated tuning action required. Record the report in docs/BALANCE_REVIEW_NOTES.md and compare against outside playtests.');
    notes.add('If playtests still show frustration, tune level readability before changing numerical balance.');
  }
  return [...notes];
}

function printActionableTuningNotes(risks: string[]): void {
  console.log('\n=== Actionable Tuning Notes ===');
  const notes = actionNotesForRisks(risks);
  for (let i = 0; i < notes.length; i++) console.log(`${i + 1}. ${notes[i]}`);
}

function summarize(results: SimResult[]): string[] {
  const best = bestByLevelAndDifficulty(results);
  const normal = best.filter(r => r.difficulty === 'normal');
  const hard = best.filter(r => r.difficulty === 'hard');
  const brutal = best.filter(r => r.difficulty === 'brutal');

  const winRate = (items: SimResult[]) => items.length === 0 ? 0 : items.filter(r => r.won).length / items.length;
  const avgStars = (items: SimResult[]) => items.length === 0 ? 0 : items.reduce((sum, r) => sum + r.stars, 0) / items.length;

  console.log('\n=== Praesidium Balance Simulation ===');
  console.log(`Levels: ${LEVELS.length} | Plans: ${Object.keys(BOT_PLANS).join(', ')} | dt=${DT}`);
  console.log(`Normal win-rate: ${(winRate(normal) * 100).toFixed(0)}% | avg stars ${avgStars(normal).toFixed(2)}`);
  console.log(`Hard win-rate:   ${(winRate(hard) * 100).toFixed(0)}% | avg stars ${avgStars(hard).toFixed(2)}`);
  console.log(`Brutal win-rate: ${(winRate(brutal) * 100).toFixed(0)}% | avg stars ${avgStars(brutal).toFixed(2)}`);

  console.log('\nBest result by level/difficulty:');
  for (const r of best) console.log(resultLine(r));

  const risks: string[] = [];
  const weakSpots = best.filter(r => r.difficulty === 'normal' && !r.won);
  if (weakSpots.length > 0) {
    console.log('\n⚠ Normal-mode blockers detected:');
    for (const r of weakSpots) {
      console.log(`- Level ${r.level} (${r.levelName}) failed best bot plan at wave ${r.wave}.`);
      risks.push(`normal blocker on level ${r.level}`);
    }
  } else {
    console.log('\n✓ No normal-mode blockers detected by the simple bot.');
  }

  printTowerDistribution(results, 'Tower placement distribution across all simulations:');

  risks.push(...lateCampaignReview(best, results));
  printActionableTuningNotes(risks);
  return risks;
}

const results: SimResult[] = [];
for (let levelIndex = 0; levelIndex < LEVELS.length; levelIndex++) {
  for (const diff of DIFFICULTY_LIST) {
    for (const plan of Object.keys(BOT_PLANS) as BotPlanId[]) {
      results.push(simulate(levelIndex, diff.id, plan));
    }
  }
}

const risks = summarize(results);

const normalBest = bestByLevelAndDifficulty(results).filter(r => r.difficulty === 'normal');
if (normalBest.some(r => r.wave <= 1 && !r.won)) {
  console.error('\nBalance sim failed: a normal-mode level collapses before completing wave 1.');
  process.exit(1);
}

if (risks.some(risk => risk.includes('result missing'))) {
  console.error('\nBalance sim failed: required late-campaign review result is missing.');
  process.exit(1);
}
