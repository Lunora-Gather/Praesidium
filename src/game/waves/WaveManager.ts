// Wave manager: spawns queued enemies over time, advances waves, signals end.
// Supports endless mode: beyond the scripted waves, new waves are generated
// procedurally with ever-increasing HP/count, so the run only ends on death.

import { BALANCE } from '../../config/balance';
import type { Grid } from '../grid/Grid';
import type { Enemy } from '../enemies/Enemy';
import { getEnemyDef } from '../enemies/EnemyRegistry';
import { Enemy as EnemyClass } from '../enemies/Enemy';
import { Rng } from '../../utils/rng';

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
    const phantomCount = i >= 7 ? Math.floor((i - 6) * 0.4) : 0;
    const titanCount = i >= 9 ? Math.floor((i - 8) * 0.3) : 0;
    const bossCount = (i + 1) % 6 === 0 ? 1 : 0; // boss every 6th wave
    waves.push({
      enemies: [
        { id: 'grunt', count: gruntCount },
        { id: 'scout', count: scoutCount },
        { id: 'brute', count: bruteCount },
        { id: 'zealot', count: zealotCount },
        { id: 'phantom', count: phantomCount },
        { id: 'titan', count: titanCount },
        { id: 'boss', count: bossCount },
      ],
    });
  }
  return waves;
}

/**
 * Procedurally generate wave #i (0-based) for endless mode — scales forever.
 * Driven by a seeded Rng so each run's endless waves are reproducible from the
 * run's seed number (shareable for challenge races).
 */
function endlessWave(i: number, rng: Rng): WaveDef {
  // i is the absolute wave index (>= scripted waveCount). Scale aggressively,
  // with seed-driven jitter so different seeds feel different.
  const gruntCount = 6 + i * 3 + rng.int(0, 3);
  const scoutCount = Math.floor(i * 1.1) + rng.int(0, 2);
  const bruteCount = Math.floor(i * 0.8) + rng.int(0, 2);
  const zealotCount = Math.floor(i * 0.7) + rng.int(0, 2);
  const phantomCount = Math.floor(i * 0.5) + rng.int(0, 2);
  const titanCount = Math.floor(i * 0.3) + rng.int(0, 1);
  // boss every 5th endless wave, then +1 boss each cycle
  const bossCount = (i + 1) % 5 === 0 ? Math.floor(i / 5) : 0;
  return {
    enemies: [
      { id: 'grunt', count: gruntCount },
      { id: 'scout', count: scoutCount },
      { id: 'brute', count: bruteCount },
      { id: 'zealot', count: zealotCount },
      { id: 'phantom', count: phantomCount },
      { id: 'titan', count: titanCount },
      { id: 'boss', count: bossCount },
    ],
  };
}

export class WaveManager {
  readonly waves: WaveDef[];
  current = 0;
  private spawnQueue: Array<{ id: string; at: number }> = [];
  private timer = 0; // accumulates time to schedule spawns
  state: 'idle' | 'running' | 'between' | 'done' = 'idle';
  private betweenTimer = 0;
  enemiesThisWave = 0;
  /** Endless mode: never reach 'done', keep generating waves forever. */
  endless = false;
  /** Extra HP multiplier applied per endless wave (compounds on growth). */
  endlessHpBonus = 0;
  /** Seed for endless-wave generation (shareable to reproduce a challenge run). */
  endlessSeed = 0;
  private endlessRng: Rng = new Rng(0);

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
    // re-seed the endless RNG so each run is a fresh sequence
    this.endlessRng = new Rng(this.endlessSeed || 1);
  }

  get totalWaves(): number {
    return this.waves.length;
  }

  /** Auto-send next wave when current wave's enemies are all spawned. */
  autoSend = false;

  /** Auto-starts first wave after a short countdown; between waves waits waveInterDelay. */
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
      // auto-send: skip the inter-wave delay
      if (this.autoSend || this.betweenTimer >= BALANCE.waveInterDelay) this.startNext();
      return;
    }

    // running
    while (this.spawnQueue.length > 0 && this.timer >= this.spawnQueue[0].at) {
      const spec = this.spawnQueue.shift()!;
      const def = getEnemyDef(spec.id);
      const hpMul = (1 + (this.current - 1) * (BALANCE.enemyHpGrowth - 1)) * this.diffHpMul * (1 + this.endlessHpBonus);
      out.push(new EnemyClass(def, grid.waypoints[0], hpMul));
    }
    if (this.spawnQueue.length === 0) {
      this.state = 'between';
      this.betweenTimer = 0;
      // endless: never 'done'; scripted mode: done after last wave
      if (!this.endless && this.current >= this.waves.length) this.state = 'done';
    }
  }

  setDifficulty(hpMul: number, countMul: number): void {
    this.diffHpMul = hpMul;
    this.diffCountMul = countMul;
  }

  private diffHpMul = 1;
  private diffCountMul = 1;

  private startNext(): void {
    this.current++;
    // endless: never done; scripted: done when past last wave
    if (!this.endless && this.current > this.waves.length) {
      this.state = 'done';
      return;
    }
    // scripted waves use index [0..length-1]; endless waves beyond that use endlessWave()
    const wave = this.current <= this.waves.length
      ? this.waves[this.current - 1]
      : endlessWave(this.current - 1, this.endlessRng);
    // endless HP ramps each wave past the scripted cap
    if (this.endless && this.current > this.waves.length) {
      this.endlessHpBonus += 0.15; // +15% HP per endless wave, compounding
    }
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
    this.timer = 0;
    this.betweenTimer = 0;
    this.state = 'running';
  }

  /** Force-start next wave (player clicks "Send Wave"). Returns true if started. */
  forceNext(): boolean {
    if (this.state === 'running') return false;
    if (this.state === 'done') return false;
    this.betweenTimer = BALANCE.waveInterDelay; // trip the gate
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
