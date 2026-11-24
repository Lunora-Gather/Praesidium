// Talent tree: persistent meta-upgrades bought with talent points (earned per star).
// Phase 4 — wired so spending points buffs all future runs.

import { SaveSystem } from '../utils/SaveSystem';

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

export type TalentLoadout = readonly number[];
export const STANDARD_TALENT_LOADOUT: TalentLoadout = Object.freeze(TALENTS.map(() => 0));
const talentIndices = new Map(TALENTS.map((talent, index) => [talent.id, index]));

export function isTalentLoadout(value: unknown): value is TalentLoadout {
  return Array.isArray(value) && value.length === TALENTS.length && TALENTS.every((talent, index) => {
    const rank = value[index];
    return Number.isInteger(rank) && rank >= 0 && rank <= talent.maxRank;
  });
}

export function talentEffect(ranks: TalentLoadout, id: string): number {
  const index = talentIndices.get(id);
  return index === undefined ? 1 : TALENTS[index].effect(ranks[index]);
}

export class TalentTree {
  constructor(private readonly profile = new SaveSystem()) {}

  get talentPoints(): number { return this.profile.get().talents.points; }

  rank(id: string): number {
    const index = talentIndices.get(id);
    return index === undefined ? 0 : Math.min(TALENTS[index].maxRank, this.profile.get().talents.ranks[id] ?? 0);
  }

  loadout(): TalentLoadout { return TALENTS.map(talent => this.rank(talent.id)); }

  canRankUp(id: string): boolean {
    const def = TALENTS.find((t) => t.id === id);
    if (!def) return false;
    return this.rank(id) < def.maxRank && this.talentPoints >= def.costPerRank;
  }

  rankUp(id: string): boolean {
    const def = TALENTS.find((t) => t.id === id);
    return def ? this.profile.buyTalent(id, def.costPerRank, def.maxRank) : false;
  }

  /** Active multiplier for a given talent (1.0 if unranked). */
  multiplier(id: string): number {
    const def = TALENTS.find((t) => t.id === id);
    if (!def) return 1;
    return def.effect(this.rank(id));
  }
}
