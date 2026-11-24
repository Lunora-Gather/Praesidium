// Achievement system: track milestones across runs, persist to localStorage.

import { load, save } from '../utils/storage';
import { LEVELS } from './grid/LevelManager';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  metric: keyof AchievementStats;
  target: number;
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
  distinctLevelsCompleted: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_blood', name: 'First Blood', description: 'Defeat your first enemy.', metric: 'totalKills', target: 1 },
  { id: 'sharpshooter', name: 'Sharpshooter', description: 'Defeat 100 enemies total.', metric: 'totalKills', target: 100 },
  { id: 'warlord', name: 'Warlord', description: 'Defeat 1000 enemies total.', metric: 'totalKills', target: 1000 },
  { id: 'tycoon', name: 'Tycoon', description: 'Earn 5000 gold total.', metric: 'totalGoldEarned', target: 5000 },
  { id: 'architect', name: 'Architect', description: 'Place 50 towers.', metric: 'towersPlaced', target: 50 },
  { id: 'upgrader', name: 'Upgrader', description: 'Upgrade towers 25 times.', metric: 'upgrades', target: 25 },
  { id: 'archmage', name: 'Archmage', description: 'Cast 20 spells.', metric: 'spellsCast', target: 20 },
  { id: 'perfect', name: 'Flawless', description: 'Earn 3 stars on a level.', metric: 'bestStars', target: 3 },
  { id: 'veteran', name: 'Veteran', description: 'Clear 10 waves total.', metric: 'totalWavesCleared', target: 10 },
  { id: 'conqueror', name: 'Conqueror', description: 'Complete all levels.', metric: 'distinctLevelsCompleted', target: LEVELS.length },
];

export class AchievementSystem {
  private unlocked = new Set<string>();
  private stats: AchievementStats;
  private statsDirty = false;
  private unlocksDirty = false;

  constructor() {
    const loaded = load<Partial<AchievementStats>>('achievements:stats', {});
    this.stats = {
      totalKills: 0, totalWavesCleared: 0, totalGoldEarned: 0,
      towersPlaced: 0, upgrades: 0, spellsCast: 0, bestStars: 0, levelsCompleted: 0, distinctLevelsCompleted: 0,
      ...loaded,
    };
    this.unlocked = new Set(load<string[]>('achievements:unlocked', []));
  }

  recordEnemyDefeat(gold: number): void {
    this.stats.totalKills++;
    this.stats.totalGoldEarned += gold;
    this.statsDirty = true;
  }
  recordWaves(count: number): void { this.stats.totalWavesCleared += count; this.statsDirty = true; }
  recordPlace(): void { this.stats.towersPlaced++; this.statsDirty = true; }
  recordUpgrade(): void { this.stats.upgrades++; this.statsDirty = true; }
  recordSpell(): void { this.stats.spellsCast++; this.statsDirty = true; }

  syncCampaign(levelStars: Readonly<Record<number, number>>, won = false): void {
    if (won) this.stats.levelsCompleted++;
    const earned = LEVELS.map((_, index) => levelStars[index + 1] ?? 0);
    this.stats.distinctLevelsCompleted = earned.filter(stars => stars > 0).length;
    this.stats.bestStars = Math.max(this.stats.bestStars, ...earned);
    if (won) this.statsDirty = true;
  }

  newlyUnlocked(): AchievementDef[] {
    const newly: AchievementDef[] = [];
    for (const a of ACHIEVEMENTS) {
      if (this.unlocked.has(a.id)) continue;
      if (this.stats[a.metric] >= a.target) {
        this.unlocked.add(a.id);
        newly.push(a);
      }
    }
    if (newly.length > 0) {
      this.unlocksDirty = true;
      this.flush();
    }
    return newly;
  }

  isUnlocked(id: string): boolean { return this.unlocked.has(id); }
  get all(): readonly AchievementDef[] { return ACHIEVEMENTS; }
  get statsView(): Readonly<AchievementStats> { return this.stats; }

  flush(): void {
    if (this.statsDirty && save('achievements:stats', this.stats)) this.statsDirty = false;
    if (this.unlocksDirty && save('achievements:unlocked', [...this.unlocked])) this.unlocksDirty = false;
  }
}
