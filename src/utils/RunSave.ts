// Versioned run snapshots. Read validation protects gameplay startup from damaged saves.

import { BALANCE } from '../config/balance';
import { DIFFICULTIES, type Difficulty } from '../config/Difficulty';
import { ENEMY_DEFS } from '../game/enemies/EnemyRegistry';
import type { EnemySnapshot } from '../game/enemies/Enemy';
import { TileType } from '../game/grid/Level';
import { LEVELS } from '../game/grid/LevelManager';
import type { ProjectileSnapshot } from '../game/projectiles/Projectile';
import { PLAYER_SPELLS } from '../game/spells/PlayerSpells';
import type { RunStatsSnapshot } from '../game/StatsTracker';
import { isTalentLoadout, type TalentLoadout } from '../game/Talents';
import { MAX_LEVEL, type TowerSnapshot } from '../game/towers/Tower';
import { TOWER_LIST } from '../game/towers/TowerRegistry';
import type { WaveSnapshot } from '../game/waves/WaveManager';
import { save, load, remove } from './storage';
import { isWeekKey, weeklySeed } from './WeeklyMode';
import { dailySeed } from './DailyChallenge';
import { CURRENT_SCORE, isDateKey, isRunOrigin, isRunVersion, type RunOrigin, type RunVersion } from './RunRecords';
import type { RunResult } from './SaveSystem';

interface RunBasics {
  levelIndex: number;
  difficulty: Difficulty;
  endless: boolean;
  endlessSeed: number;
  gold: number;
  lives: number;
  score: number;
  spellCooldowns: number[];
}

export interface LegacyRunSnapshot extends RunBasics {
  v: 1;
  waveCurrent: number;
  weeklyModeActive?: boolean;
  stats?: Partial<RunStatsSnapshot>;
  towers: Omit<TowerSnapshot, 'cooldown' | 'angle'>[];
}

export interface RunSnapshot extends RunBasics {
  v: 2;
  runId?: string;
  origin?: RunOrigin;
  version?: RunVersion | null;
  missionDate?: string;
  activeSec?: number;
  talentRanks?: TalentLoadout;
  variedOpener?: boolean;
  wavesClearedThrough?: number;
  weeklyKey: string | null;
  dailyDate: string | null;
  towers: TowerSnapshot[];
  enemies: EnemySnapshot[];
  projectiles: ProjectileSnapshot[];
  waves: WaveSnapshot;
  stats: RunStatsSnapshot;
  comboCount: number;
  comboTimer: number;
}

const KEY = 'run:snapshot';
const SETTLEMENT_KEY = 'run:settlements';
const TOWER_IDS = new Set(TOWER_LIST.map(tower => tower.id));
const ENEMY_IDS = new Set(Object.keys(ENEMY_DEFS));
const STRATEGIES = new Set(['first', 'last', 'strongest', 'weakest', 'closest']);
const WAVE_STATES = new Set(['idle', 'running', 'between', 'done']);
const STATS_FIELDS = ['kills', 'towersPlaced', 'upgrades', 'spellsCast', 'goldEarned', 'damageDealt', 'durationSec'];

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function number(value: unknown, min = 0): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min;
}

function integer(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): value is number {
  return number(value, min) && Number.isSafeInteger(value) && value <= max;
}

function member(value: unknown, values: ReadonlySet<string>): value is string {
  return typeof value === 'string' && values.has(value);
}

function position(value: unknown): boolean {
  return object(value) && number(value.x, -Infinity) && number(value.y, -Infinity);
}

function runId(value: unknown): value is string {
  return typeof value === 'string' && /^[\w-]{1,80}$/.test(value);
}

function validWaves(waves: unknown, maxWave: number): waves is WaveSnapshot {
  if (!object(waves) || !integer(waves.current, 0, maxWave) || !member(waves.state, WAVE_STATES)
      || !number(waves.timer) || !number(waves.betweenTimer) || !number(waves.spawnAt)
      || !integer(waves.enemiesThisWave, 0) || !integer(waves.rngState, 0, 0xffffffff)
      || typeof waves.autoSend !== 'boolean' || !Array.isArray(waves.spawnGroups)) return false;
  const groups = waves.spawnGroups;
  if (groups.length > ENEMY_IDS.size || (waves.state === 'running') !== (groups.length > 0)
      || (waves.state === 'idle') !== (waves.current === 0)) return false;
  const count = groups.reduce((total, group) => {
    if (!object(group) || !member(group.id, ENEMY_IDS) || !integer(group.count, 1)) return Infinity;
    return total + group.count;
  }, 0);
  return count <= waves.enemiesThisWave;
}

export function isRunSnapshot(data: unknown): data is RunSnapshot | LegacyRunSnapshot {
  if (!object(data) || (data.v !== 1 && data.v !== 2) || !integer(data.levelIndex, 0, LEVELS.length - 1)
      || typeof data.difficulty !== 'string' || !Object.prototype.hasOwnProperty.call(DIFFICULTIES, data.difficulty)
      || typeof data.endless !== 'boolean' || !integer(data.endlessSeed, 0, 0xffffffff)
      || !number(data.gold) || !integer(data.lives, 1) || !number(data.score)
      || !Array.isArray(data.towers) || !Array.isArray(data.spellCooldowns)
      || data.spellCooldowns.length > PLAYER_SPELLS.length
      || !data.spellCooldowns.every(value => number(value, data.v === 1 ? -Infinity : 0))) return false;

  const level = LEVELS[data.levelIndex];
  const occupied = new Set<number>();
  for (const tower of data.towers) {
    if (!object(tower) || !member(tower.id, TOWER_IDS) || !member(tower.strategy, STRATEGIES)
        || !integer(tower.tx, 0, level.cols - 1) || !integer(tower.ty, 0, level.rows - 1)
        || !integer(tower.level, 1, MAX_LEVEL) || !number(tower.dmgMul, Number.EPSILON)
        || !number(tower.rangeMul, Number.EPSILON) || !number(tower.fireRateMul, Number.EPSILON)) return false;
    const cell = tower.ty * level.cols + tower.tx;
    if (level.tiles[cell] !== TileType.Buildable || occupied.has(cell)) return false;
    occupied.add(cell);
    if (data.v === 2 && (!number(tower.cooldown) || !number(tower.angle, -Infinity))) return false;
  }

  const stats = data.stats;
  const maxWave = data.endless ? 0xffffffff : BALANCE.waveCount;
  if (data.v === 1) {
    return integer(data.waveCurrent, 0, maxWave)
      && (data.weeklyModeActive === undefined || typeof data.weeklyModeActive === 'boolean')
      && (stats === undefined || (object(stats) && STATS_FIELDS.every(key => stats[key] === undefined || number(stats[key]))));
  }

  if (!object(stats) || !STATS_FIELDS.every(key => number(stats[key]))
      || !validWaves(data.waves, maxWave) || !integer(data.comboCount, 0) || !number(data.comboTimer)
      || (data.weeklyKey !== null && (!data.endless || !isWeekKey(data.weeklyKey)))
      || (data.dailyDate !== null && (!data.endless || !isDateKey(data.dailyDate)))
      || (data.runId !== undefined && !runId(data.runId))
      || (data.version !== undefined && data.version !== null && !isRunVersion(data.version))
      || (data.missionDate !== undefined && !isDateKey(data.missionDate))
      || (data.activeSec !== undefined && !number(data.activeSec))
      || (data.origin !== undefined && !isRunOrigin(data.origin))
      || (data.talentRanks !== undefined && !isTalentLoadout(data.talentRanks))
      || (data.variedOpener !== undefined && (typeof data.variedOpener !== 'boolean' || (data.variedOpener && !data.endless)))
      || (data.wavesClearedThrough !== undefined && !integer(data.wavesClearedThrough, 0, data.waves.current))
      || !Array.isArray(data.enemies) || !Array.isArray(data.projectiles)) return false;

  const origin = data.origin;
  if (isRunOrigin(origin)) {
    if ((origin.kind === 'campaign') === data.endless) return false;
    if (origin.kind === 'campaign' && (origin.level !== data.levelIndex + 1 || origin.difficulty !== data.difficulty)) return false;
    if (origin.kind === 'weekly' && (origin.period !== data.weeklyKey || data.endlessSeed !== weeklySeed(origin.period))) return false;
    if (origin.kind === 'daily' && (origin.period !== data.dailyDate || data.endlessSeed !== dailySeed(origin.period))) return false;
  }
  const currentWave = data.waves.current;
  if (!data.enemies.every(enemy => object(enemy) && member(enemy.id, ENEMY_IDS) && position(enemy.pos)
      && integer(enemy.wpIndex, 0, level.waypoints.length - 1) && number(enemy.hp, Number.EPSILON)
      && number(enemy.maxHp, enemy.hp) && number(enemy.baseSpeed, Number.EPSILON)
      && number(enemy.shieldHp) && number(enemy.slowTimer) && number(enemy.slowFactor) && enemy.slowFactor <= 1
      && (enemy.waveNumber === undefined || integer(enemy.waveNumber, 0, currentWave))
      && (enemy.slows === undefined || (Array.isArray(enemy.slows) && enemy.slows.every(slow =>
        object(slow) && number(slow.factor) && slow.factor < 1 && number(slow.remaining, Number.EPSILON)))))) return false;

  const maxEnemyIndex = data.enemies.length - 1;
  return data.projectiles.every(projectile => object(projectile) && member(projectile.towerId, TOWER_IDS)
    && (projectile.targetIndex === null || integer(projectile.targetIndex, 0, maxEnemyIndex))
    && position(projectile.pos) && position(projectile.vel) && number(projectile.damage)
    && number(projectile.life, Number.EPSILON) && number(projectile.trailTimer)
    && Array.isArray(projectile.trail) && projectile.trail.length <= 8 && projectile.trail.every(position));
}

export function saveRun(snapshot: RunSnapshot, replace = true): boolean {
  if (!replace) {
    const current = loadRun();
    if (current && runIdentity(current) !== runIdentity(snapshot)) return false;
  }
  return save(KEY, snapshot);
}

export function runIdentity(snapshot: RunSnapshot | LegacyRunSnapshot): string {
  if (snapshot.v === 2 && snapshot.runId) return snapshot.runId;
  // Older saves have no ID. Restoring the same checkpoint in two tabs must yield the same ID.
  const serialized = JSON.stringify(snapshot);
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let i = 0; i < serialized.length; i++) {
    const value = serialized.charCodeAt(i);
    first = Math.imul(first ^ value, 0x01000193);
    second = Math.imul(second ^ value, 0x85ebca6b);
  }
  return `legacy-${(first >>> 0).toString(36)}-${(second >>> 0).toString(36)}`;
}

export function loadRun(): RunSnapshot | LegacyRunSnapshot | null {
  const data = load<unknown>(KEY, null);
  return isRunSnapshot(data) ? data : null;
}

export function clearRun(owner?: string): void {
  if (owner) {
    const current = loadRun();
    if (!current || runIdentity(current) !== owner) return;
  }
  remove(KEY);
}

export function isRunResult(result: unknown): result is RunResult {
  if (!object(result) || !runId(result.id) || !number(result.score) || !integer(result.wave, 0)
      || typeof result.endless !== 'boolean' || !isDateKey(result.missionDate)
      || (result.dailyDate !== null && !isDateKey(result.dailyDate))
      || (result.origin !== undefined && !isRunOrigin(result.origin))
      || (result.scoreVersion !== undefined && result.scoreVersion !== 0 && result.scoreVersion !== CURRENT_SCORE)
      || (result.clearedWave !== undefined && !integer(result.clearedWave, 0, result.wave))) return false;
  const campaign = result.campaign;
  if (campaign !== null && (!object(campaign) || !integer(campaign.level, 1, LEVELS.length) || !integer(campaign.stars, 1, 3))) return false;
  const weekly = result.weekly;
  if (weekly !== null && (!object(weekly) || typeof weekly.id !== 'string' || !integer(weekly.reward, 0))) return false;
  const missions = result.missions;
  if (!object(missions) || missions.wave !== result.wave || missions.score !== result.score || !object(missions.stats)) return false;
  const stats = missions.stats;
  return ['kills', 'upgrades', 'spellsCast', 'towersPlaced'].every(field => integer(stats[field], 0));
}

export function loadRunSettlements(): RunResult[] {
  return load<unknown[]>(SETTLEMENT_KEY, []).filter(isRunResult);
}

export function stageRunSettlement(result: RunResult): RunResult {
  const pending = loadRunSettlements();
  const previous = pending.find(run => run.id === result.id);
  if (previous) return previous;
  save(SETTLEMENT_KEY, [...pending, result]);
  return result;
}

export function clearRunSettlement(id: string): void {
  const pending = loadRunSettlements();
  const remaining = pending.filter(run => run.id !== id);
  if (remaining.length === pending.length) return;
  if (remaining.length === 0) remove(SETTLEMENT_KEY);
  else save(SETTLEMENT_KEY, remaining);
}
