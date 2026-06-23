// Achievement system: track milestones across runs, persist to localStorage.

import { load, save } from '../utils/storage';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  check: (stats: AchievementStats) => boolean;
}

export interface AchievementStats {
  totalKills: number;
  totalWavesCleared: number;
  totalGoldEarned: number;
  towersPlaced: number;
  upgrades: number;
  spellsCast: number;
  bestStars: number;
  levelsCompleted: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_blood', name: 'First Blood', description: 'Defeat your first enemy.', check: (s) => s.totalKills >= 1 },
  { id: 'sharpshooter', name: 'Sharpshooter', description: 'Defeat 100 enemies total.', check: (s) => s.totalKills >= 100 },
  { id: 'warlord', name: 'Warlord', description: 'Defeat 1000 enemies total.', check: (s) => s.totalKills >= 1000 },
  { id: 'tycoon', name: 'Tycoon', description: 'Earn 5000 gold total.', check: (s) => s.totalGoldEarned >= 5000 },
  { id: 'architect', name: 'Architect', description: 'Place 50 towers.', check: (s) => s.towersPlaced >= 50 },
  { id: 'upgrader', name: 'Upgrader', description: 'Upgrade towers 25 times.', check: (s) => s.upgrades >= 25 },
  { id: 'archmage', name: 'Archmage', description: 'Cast 20 spells.', check: (s) => s.spellsCast >= 20 },
  { id: 'perfect', name: 'Flawless', description: 'Earn 3 stars on a level.', check: (s) => s.bestStars >= 3 },
  { id: 'veteran', name: 'Veteran', description: 'Clear 10 waves total.', check: (s) => s.totalWavesCleared >= 10 },
  { id: 'conqueror', name: 'Conqueror', description: 'Complete all levels.', check: (s) => s.levelsCompleted >= 3 },
];

export class AchievementSystem {
  private unlocked = new Set<string>();
  private stats: AchievementStats;

  constructor() {
    const loaded = load<Partial<AchievementStats>>('achievements:stats', {});
    this.stats = {
      totalKills: 0, totalWavesCleared: 0, totalGoldEarned: 0,
      towersPlaced: 0, upgrades: 0, spellsCast: 0, bestStars: 0, levelsCompleted: 0,
      ...loaded,
    };
    this.unlocked = new Set(load<string[]>('achievements:unlocked', []));
  }

  recordKill(): void { this.stats.totalKills++; this.persist(); }
  recordWave(): void { this.stats.totalWavesCleared++; this.persist(); }
  recordGold(g: number): void { this.stats.totalGoldEarned += g; this.persist(); }
  recordPlace(): void { this.stats.towersPlaced++; this.persist(); }
  recordUpgrade(): void { this.stats.upgrades++; this.persist(); }
  recordSpell(): void { this.stats.spellsCast++; this.persist(); }
  recordStars(stars: number): void { this.stats.bestStars = Math.max(this.stats.bestStars, stars); this.persist(); }
  recordLevelComplete(): void { this.stats.levelsCompleted++; this.persist(); }

  newlyUnlocked(): AchievementDef[] {
    const newly: AchievementDef[] = [];
    for (const a of ACHIEVEMENTS) {
      if (this.unlocked.has(a.id)) continue;
      if (a.check(this.stats)) {
        this.unlocked.add(a.id);
        newly.push(a);
      }
    }
    if (newly.length > 0) save('achievements:unlocked', [...this.unlocked]);
    return newly;
  }

  isUnlocked(id: string): boolean { return this.unlocked.has(id); }
  get all(): readonly AchievementDef[] { return ACHIEVEMENTS; }
  get statsView(): Readonly<AchievementStats> { return this.stats; }

  private persist(): void { save('achievements:stats', this.stats); }
}
