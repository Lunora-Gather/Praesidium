// Wave manager: spawns queued enemies over time, advances waves, signals end.
// Supports endless mode: beyond the scripted waves, new waves are generated
// procedurally with ever-increasing HP/count, so the run only ends on death.

import { BALANCE } from '../../config/balance';
import type { Grid } from '../grid/Grid';
import type { Enemy } from '../enemies/Enemy';
import { getEnemyDef } from '../enemies/EnemyRegistry';
import { Enemy as EnemyClass } from '../enemies/Enemy';
import { Rng } from '../../utils/rng';
import { DEFAULT_WEEKLY_RULES, type WeeklyRuleSet } from '../../utils/WeeklyRules';

export interface WaveDef {
  enemies: Array<{ id: string; count: number }>;
}

export interface WavePreview {
  waveNumber: number;
  totalCount: number;
  endless: boolean;
  enemies: Array<{ id: string; count: number }>;
}

function bossEncounter(waveNumber: number): Array<{ id: string; count: number }> {
  const cycle = Math.floor(waveNumber / 6) % 3;
  if (cycle === 0) return [
    { id: 'boss', count: 1 },
    { id: 'scout', count: 4 },
  ];
  if (cycle === 1) return [
    { id: 'boss', count: 1 },
    { id: 'brute', count: 2 },
    { id: 'zealot', count: 3 },
  ];
  return [
    { id: 'boss', count: 1 },
    { id: 'phantom', count: 3 },
    { id: 'titan', count: 1 },
  ];
}

function buildWaves(count: number): WaveDef[] {
  const waves: WaveDef[] = [];
  for (let i = 0; i < count; i++) {
    const waveNumber = i + 1;
    const gruntCount = 4 + i * 2;
    const scoutCount = i >= 2 ? Math.floor(i * 0.7) : 0;
    const bruteCount = i >= 4 ? Math.floor((i - 3) * 0.6) : 0;
    const zealotCount = i >= 5 ? Math.floor((i - 4) * 0.5) : 0;
    const phantomCount = i >= 7 ? Math.floor((i - 6) * 0.4) : 0;
    const titanCount = i >= 9 ? Math.floor((i - 8) * 0.3) : 0;
    const bossGroups = waveNumber % 6 === 0 ? bossEncounter(waveNumber) : [];
    waves.push({
      enemies: [
        { id: 'grunt', count: gruntCount },
        { id: 'scout', count: scoutCount },
        { id: 'brute', count: bruteCount },
        { id: 'zealot', count: zealotCount },
        { id: 'phantom', count: phantomCount },
        { id: 'titan', count: titanCount },
        ...bossGroups,
      ],
    });
  }
  return waves;
}

function endlessWave(i: number, rng: Rng): WaveDef {
  const waveNumber = i + 1;
  const gruntCount = 6 + i * 3 + rng.int(0, 3);
  const scoutCount = Math.floor(i * 1.1) + rng.int(0, 2);
  const bruteCount = Math.floor(i * 0.8) + rng.int(0, 2);
  const zealotCount = Math.floor(i * 0.7) + rng.int(0, 2);
  const phantomCount = Math.floor(i * 0.5) + rng.int(0, 2);
  const titanCount = Math.floor(i * 0.3) + rng.int(0, 1);
  const bossGroups = waveNumber % 5 === 0
    ? bossEncounter(waveNumber).map(group => ({ ...group, count: group.id === 'boss' ? Math.max(1, Math.floor(waveNumber / 10) + 1) : group.count + Math.floor(waveNumber / 10) }))
    : [];
  return {
    enemies: [
      { id: 'grunt', count: gruntCount },
      { id: 'scout', count: scoutCount },
      { id: 'brute', count: bruteCount },
      { id: 'zealot', count: zealotCount },
      { id: 'phantom', count: phantomCount },
      { id: 'titan', count: titanCount },
      ...bossGroups,
    ],
  };
}

export class WaveManager {
  readonly waves: WaveDef[];
  current = 0;
  private spawnQueue: Array<{ id: string; at: number }> = [];
  private timer = 0;
  state: 'idle' | 'running' | 'between' | 'done' = 'idle';
  private betweenTimer = 0;
  enemiesThisWave = 0;
  endless = false;
  endlessHpBonus = 0;
  endlessSeed = 0;
  private endlessRng: Rng = new Rng(0);
  private weeklyRules: WeeklyRuleSet = DEFAULT_WEEKLY_RULES;

  constructor(count = BALANCE.waveCount) {
    this.waves = buildWaves(count);
  }

  reset(): void {
    this.current = 0;
    this.spawnQueue.length = 0;
    this.timer = 0;
    this.betweenTimer = 0;
    this.state = 'idle';
    this.enemiesThisWave = 0;
    this.endlessHpBonus = 0;
    this.endlessRng = new Rng(this.endlessSeed || 1);
  }

  get totalWaves(): number {
    return this.waves.length;
  }

  autoSend = false;

  update(dt: number, grid: Grid, out: Enemy[]): void {
    if (this.state === 'done') return;
    this.timer += dt;
    if (this.state === 'idle') {
      this.betweenTimer += dt;
      if (this.betweenTimer >= 1.5) this.startNext();
      return;
    }

    if (this.state === 'between') {
      this.betweenTimer += dt;
      if (this.autoSend || this.betweenTimer >= BALANCE.waveInterDelay) this.startNext();
      return;
    }

    while (this.spawnQueue.length > 0 && this.timer >= this.spawnQueue[0].at) {
      const spec = this.spawnQueue.shift()!;
      const def = getEnemyDef(spec.id);
      const bossMul = def.isBoss ? this.weeklyRules.bossHpMul : 1;
      const hpMul = (1 + (this.current - 1) * (BALANCE.enemyHpGrowth - 1)) * this.diffHpMul * this.weeklyRules.hpMul * bossMul * (1 + this.endlessHpBonus);
      out.push(new EnemyClass(def, grid.waypoints[0], hpMul, this.weeklyRules.speedMul));
    }
    if (this.spawnQueue.length === 0) {
      this.state = 'between';
      this.betweenTimer = 0;
      if (!this.endless && this.current >= this.waves.length) this.state = 'done';
    }
  }

  setDifficulty(hpMul: number, countMul: number): void {
    this.diffHpMul = hpMul;
    this.diffCountMul = countMul;
  }

  setWeeklyRules(rules: WeeklyRuleSet): void {
    this.weeklyRules = rules;
  }

  private diffHpMul = 1;
  private diffCountMul = 1;

  previewNext(): WavePreview | null {
    if (this.state === 'done' || this.state === 'running') return null;
    const nextWaveNumber = this.current + 1;
    if (!this.endless && nextWaveNumber > this.waves.length) return null;

    const wave = this.previewWaveFor(nextWaveNumber);
    const enemies = this.scaleEnemyGroups(wave);
    const totalCount = enemies.reduce((sum, group) => sum + group.count, 0);

    return {
      waveNumber: nextWaveNumber,
      totalCount,
      endless: this.endless && nextWaveNumber > this.waves.length,
      enemies,
    };
  }

  private previewWaveFor(waveNumber: number): WaveDef {
    if (waveNumber <= this.waves.length) return this.waves[waveNumber - 1];

    const rng = new Rng(this.endlessSeed || 1);
    let wave = this.waves[this.waves.length - 1];
    for (let i = this.waves.length; i < waveNumber; i++) {
      wave = endlessWave(i, rng);
    }
    return wave;
  }

  private scaleEnemyGroups(wave: WaveDef): Array<{ id: string; count: number }> {
    const groups: Array<{ id: string; count: number }> = [];
    for (const group of wave.enemies) {
      if (group.count <= 0) continue;
      const count = Math.max(1, Math.round(group.count * this.diffCountMul * this.weeklyRules.countMul));
      groups.push({ id: group.id, count });
    }
    return groups;
  }

  private startNext(): void {
    this.current++;
    if (!this.endless && this.current > this.waves.length) {
      this.state = 'done';
      return;
    }

    const wave = this.current <= this.waves.length
      ? this.waves[this.current - 1]
      : endlessWave(this.current - 1, this.endlessRng);

    if (this.endless && this.current > this.waves.length) {
      this.endlessHpBonus += 0.15;
    }

    this.spawnQueue = [];
    let t = 0;
    let total = 0;
    const ids: string[] = [];
    for (const g of wave.enemies) {
      if (g.count <= 0) continue;
      const scaled = Math.max(1, Math.round(g.count * this.diffCountMul * this.weeklyRules.countMul));
      for (let i = 0; i < scaled; i++) ids.push(g.id);
      total += scaled;
    }

    const groups = new Map<string, number>();
    for (const id of ids) groups.set(id, (groups.get(id) ?? 0) + 1);
    const groupIds = [...groups.keys()];
    const interleaved: string[] = [];
    while (interleaved.length < total) {
      for (const gid of groupIds) {
        const remaining = groups.get(gid)!;
        if (remaining > 0) {
          interleaved.push(gid);
          groups.set(gid, remaining - 1);
        }
      }
    }
    for (const id of interleaved) {
      this.spawnQueue.push({ id, at: t });
      t += BALANCE.enemySpawnGap;
    }
    this.enemiesThisWave = total;
    this.timer = 0;
    this.betweenTimer = 0;
    this.state = 'running';
  }

  forceNext(): boolean {
    if (this.state === 'running') return false;
    if (this.state === 'done') return false;
    this.betweenTimer = BALANCE.waveInterDelay;
    this.startNext();
    return true;
  }

  get inProgress(): boolean {
    return this.state === 'running';
  }

  get betweenProgress(): number {
    if (this.state !== 'between' && this.state !== 'idle') return 0;
    return Math.min(1, this.betweenTimer / (this.state === 'idle' ? 1.5 : BALANCE.waveInterDelay));
  }
}
