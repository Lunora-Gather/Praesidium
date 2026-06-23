// Talent tree: persistent meta-upgrades bought with talent points (earned per star).
// Phase 4 — wired so spending points buffs all future runs.

import { load, save } from '../utils/storage';

export interface TalentDef {
  id: string;
  name: string;
  description: string;
  maxRank: number;
  costPerRank: number; // talent points per rank
  effect: (rank: number) => number; // returns the bonus value at given rank
}

export const TALENTS: TalentDef[] = [
  { id: 'gold', name: 'Greed', description: '+10% gold from kills per rank.', maxRank: 5, costPerRank: 1, effect: (r) => 1 + 0.1 * r },
  { id: 'damage', name: 'Power', description: '+8% tower damage per rank.', maxRank: 5, costPerRank: 1, effect: (r) => 1 + 0.08 * r },
  { id: 'range', name: 'Vision', description: '+6% tower range per rank.', maxRank: 5, costPerRank: 1, effect: (r) => 1 + 0.06 * r },
  { id: 'firerate', name: 'Haste', description: '+5% fire rate per rank.', maxRank: 5, costPerRank: 2, effect: (r) => 1 + 0.05 * r },
  { id: 'lives', name: 'Fortitude', description: '+2 starting lives per rank.', maxRank: 5, costPerRank: 1, effect: (r) => r * 2 },
  { id: 'spellcd', name: 'Arcane', description: '-8% spell cooldown per rank.', maxRank: 3, costPerRank: 3, effect: (r) => 1 - 0.08 * r },
];

export class TalentTree {
  private ranks: Record<string, number> = {};
  private points = 0;

  constructor() {
    const loaded = load<Partial<{ points: number; ranks: Record<string, number> }>>('talents', {});
    this.points = loaded.points ?? 0;
    this.ranks = loaded.ranks ?? {};
  }

  get talentPoints(): number { return this.points; }

  awardPoints(n: number): void { this.points += n; this.persist(); }

  rank(id: string): number { return this.ranks[id] ?? 0; }

  canRankUp(id: string): boolean {
    const def = TALENTS.find((t) => t.id === id);
    if (!def) return false;
    return this.rank(id) < def.maxRank && this.points >= def.costPerRank;
  }

  rankUp(id: string): boolean {
    if (!this.canRankUp(id)) return false;
    const def = TALENTS.find((t) => t.id === id)!;
    this.points -= def.costPerRank;
    this.ranks[id] = (this.ranks[id] ?? 0) + 1;
    this.persist();
    return true;
  }

  /** Active multiplier for a given talent (1.0 if unranked). */
  multiplier(id: string): number {
    const def = TALENTS.find((t) => t.id === id);
    if (!def) return 1;
    return def.effect(this.rank(id));
  }

  private persist(): void { save('talents', { points: this.points, ranks: this.ranks }); }
}
