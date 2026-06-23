// Wave manager: spawns queued enemies over time, advances waves, signals end.

import { BALANCE } from '../../config/balance';
import type { Grid } from '../grid/Grid';
import type { Enemy } from '../enemies/Enemy';
import { getEnemyDef } from '../enemies/EnemyRegistry';
import { Enemy as EnemyClass } from '../enemies/Enemy';

export interface WaveDef {
  enemies: Array<{ id: string; count: number }>;
}

function buildWaves(count: number): WaveDef[] {
  const waves: WaveDef[] = [];
  for (let i = 0; i < count; i++) {
    const gruntCount = 4 + i * 2;
    const scoutCount = i >= 2 ? Math.floor(i * 0.7) : 0;
    const bruteCount = i >= 4 ? Math.floor((i - 3) * 0.6) : 0;
    const zealotCount = i >= 5 ? Math.floor((i - 4) * 0.5) : 0;
    const bossCount = (i + 1) % 6 === 0 ? 1 : 0; // boss every 6th wave
    waves.push({
      enemies: [
        { id: 'grunt', count: gruntCount },
        { id: 'scout', count: scoutCount },
        { id: 'brute', count: bruteCount },
        { id: 'zealot', count: zealotCount },
        { id: 'boss', count: bossCount },
      ],
    });
  }
  return waves;
}

export class WaveManager {
  readonly waves: WaveDef[];
  current = 0;
  private spawnQueue: Array<{ id: string; at: number }> = [];
  private timer = 0; // accumulates time to schedule spawns
  state: 'idle' | 'running' | 'between' | 'done' = 'idle';
  private betweenTimer = 0;
  spawnedThisWave = 0;
  enemiesThisWave = 0;

  constructor(count = BALANCE.waveCount) {
    this.waves = buildWaves(count);
  }

  reset(): void {
    this.current = 0;
    this.spawnQueue.length = 0;
    this.timer = 0;
    this.betweenTimer = 0;
    this.state = 'idle';
    this.spawnedThisWave = 0;
    this.enemiesThisWave = 0;
  }

  get totalWaves(): number {
    return this.waves.length;
  }

  /** Auto-starts first wave after a short countdown; between waves waits waveInterDelay. */
  update(dt: number, grid: Grid, out: Enemy[]): void {
    if (this.state === 'done') return;
    this.timer += dt;
    if (this.state === 'idle') {
      this.betweenTimer += dt;
      if (this.betweenTimer >= 1.5) this.startNext(out);
      return;
    }

    if (this.state === 'between') {
      this.betweenTimer += dt;
      if (this.betweenTimer >= BALANCE.waveInterDelay) this.startNext(out);
      return;
    }

    // running
    while (this.spawnQueue.length > 0 && this.timer >= this.spawnQueue[0].at) {
      const spec = this.spawnQueue.shift()!;
      const def = getEnemyDef(spec.id);
      const hpMul = (1 + (this.current - 1) * (BALANCE.enemyHpGrowth - 1)) * this.diffHpMul;
      out.push(new EnemyClass(def, grid.waypoints[0], hpMul));
    }
    if (this.spawnQueue.length === 0) {
      this.state = 'between';
      this.betweenTimer = 0;
      if (this.current >= this.waves.length) this.state = 'done';
    }
  }

  setDifficulty(hpMul: number, countMul: number): void {
    this.diffHpMul = hpMul;
    this.diffCountMul = countMul;
  }

  private diffHpMul = 1;
  private diffCountMul = 1;

  private startNext(_out: Enemy[]): void {
    this.current++;
    if (this.current > this.waves.length) {
      this.state = 'done';
      return;
    }
    const wave = this.waves[this.current - 1];
    this.spawnQueue = [];
    let t = 0;
    let total = 0;
    const ids: string[] = [];
    for (const g of wave.enemies) {
      const scaled = Math.max(1, Math.round(g.count * this.diffCountMul));
      for (let i = 0; i < scaled; i++) ids.push(g.id);
      total += scaled;
    }
    // interleave spawn order
    for (let i = 0; i < total; i++) {
      const pick = ids[Math.floor(i % ids.length)];
      this.spawnQueue.push({ id: pick, at: t });
      t += BALANCE.enemySpawnGap;
    }
    this.enemiesThisWave = total;
    this.spawnedThisWave = 0;
    this.timer = 0;
    this.betweenTimer = 0;
    this.state = 'running';
    void _out;
  }

  /** Force-start next wave (player clicks "Send Wave"). Returns true if started. */
  forceNext(out: Enemy[]): boolean {
    if (this.state === 'running') return false;
    if (this.state === 'done') return false;
    this.betweenTimer = BALANCE.waveInterDelay; // trip the gate
    this.startNext(out);
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
