// Tutorial: contextual first-run hints that disappear after the player
// performs the relevant action. Each step shows a tip until its check passes.
// Commercial onboarding goal: new players should understand the first tower,
// first wave, first upgrade, first spell, and Intel Codex without outside help.

import { GameState } from '../game/GameState';
import { load, save } from './storage';
import { t } from './i18n';

export interface TutorialStep {
  id: string;
  text: string;
  check: (s: GameState) => boolean; // true => step completed
}

function text(key: string, fallback: string): string {
  const value = t(key);
  return value === key ? fallback : value;
}

function step(id: string, key: string, fallback: string, check: (s: GameState) => boolean): TutorialStep {
  return {
    id,
    get text() { return text(key, fallback); },
    check,
  };
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  step('select', 'tutorial.select', 'Select a tower from the bottom bar. Turret is a safe first choice.', (s) => !!s.selectedTowerId || s.towers.length > 0),
  step('place', 'tutorial.place', 'Click a glowing buildable tile to place your first tower.', (s) => s.towers.length > 0),
  step('wave', 'tutorial.wave', 'Click Send Wave when your first tower is ready.', (s) => s.waves.current >= 1 || s.waves.inProgress),
  step('inspect', 'tutorial.inspect', 'Click a placed tower to inspect upgrade and sell options.', (s) => !!s.selectedTower || s.stats.get().upgrades > 0),
  step('upgrade', 'tutorial.upgrade', 'Upgrade one early tower before the lane gets crowded.', (s) => s.towers.some((tower) => tower.level > 1) || s.stats.get().upgrades > 0),
  step('spell', 'tutorial.spell', 'Use Q/W/E or the spell buttons when a wave leaks through.', (s) => s.stats.get().spellsCast > 0 || s.spells.some((sp) => !sp.ready)),
  step('intel', 'tutorial.intel', 'Open Intel to check enemy traits and recommended counters.', (s) => s.waves.current >= 2 || s.enemies.some((enemy) => enemy.isBoss)),
  step('talent', 'tutorial.talent', 'After a victory, spend talent points to make future runs stronger.', (s) => s.lastStars > 0 || s.talents.talentPoints > 0),
];

export class Tutorial {
  private shownIds: Set<string>;
  active: TutorialStep | null = null;

  constructor() {
    this.shownIds = new Set(load<string[]>('tutorial:shown:v3', []));
  }

  update(s: GameState): void {
    // pick the first unshown step whose check is not yet satisfied
    this.active = null;
    for (const step of TUTORIAL_STEPS) {
      if (this.shownIds.has(step.id)) continue;
      if (step.check(s)) {
        this.shownIds.add(step.id);
        save('tutorial:shown:v3', [...this.shownIds]);
      } else {
        this.active = step;
        break;
      }
    }
  }

  reset(): void {
    this.shownIds.clear();
    save('tutorial:shown:v3', []);
    this.active = TUTORIAL_STEPS[0] ?? null;
  }
}
