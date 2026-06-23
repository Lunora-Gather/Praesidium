// Run statistics: kill count, towers placed, gold earned, damage dealt.
// Useful for achievements (Phase 4) and end-of-run summary.

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

export class StatsTracker {
  private data: RunStats;

  constructor() {
    this.data = {
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
    this.data = {
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

  recordKill(): void { this.data.kills++; }
  recordPlace(): void { this.data.towersPlaced++; }
  recordUpgrade(): void { this.data.upgrades++; }
  recordSpell(): void { this.data.spellsCast++; }
  recordGold(g: number): void { this.data.goldEarned += g; }
  recordDamage(d: number): void { this.data.damageDealt += d; }
  tick(dt: number): void { this.data.durationSec += dt; }

  get(): Readonly<RunStats> { return this.data; }
}
