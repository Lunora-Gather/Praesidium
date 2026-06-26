// Run statistics: kill count, towers placed, gold earned, damage dealt.
// Used for achievements, analytics, mid-run restore, and end-of-run summaries.

export interface RunStats {
  kills: number;
  towersPlaced: number;
  upgrades: number;
  spellsCast: number;
  goldEarned: number;
  damageDealt: number;
  startedAt: number;
  durationSec: number;
}

export type RunStatsSnapshot = Pick<RunStats, 'kills' | 'towersPlaced' | 'upgrades' | 'spellsCast' | 'goldEarned' | 'damageDealt' | 'durationSec'>;

export class StatsTracker {
  private data: RunStats;

  constructor() {
    this.data = this.empty();
  }

  private empty(): RunStats {
    return {
      kills: 0,
      towersPlaced: 0,
      upgrades: 0,
      spellsCast: 0,
      goldEarned: 0,
      damageDealt: 0,
      startedAt: Date.now(),
      durationSec: 0,
    };
  }

  reset(): void {
    this.data = this.empty();
  }

  restore(snapshot: Partial<RunStatsSnapshot> | undefined): void {
    this.data = {
      ...this.empty(),
      kills: snapshot?.kills ?? 0,
      towersPlaced: snapshot?.towersPlaced ?? 0,
      upgrades: snapshot?.upgrades ?? 0,
      spellsCast: snapshot?.spellsCast ?? 0,
      goldEarned: snapshot?.goldEarned ?? 0,
      damageDealt: snapshot?.damageDealt ?? 0,
      durationSec: snapshot?.durationSec ?? 0,
    };
  }

  recordKill(): void { this.data.kills++; }
  recordPlace(): void { this.data.towersPlaced++; }
  recordUpgrade(): void { this.data.upgrades++; }
  recordSpell(): void { this.data.spellsCast++; }
  recordGold(g: number): void { this.data.goldEarned += g; }
  recordDamage(d: number): void { this.data.damageDealt += d; }
  tick(dt: number): void { this.data.durationSec += dt; }

  get(): Readonly<RunStats> { return this.data; }
}
