// Tutorial: contextual first-run hints that disappear after the player
// performs the relevant action. Each step shows a tip until its check passes.

import { GameState } from '../game/GameState';
import { load, save } from './storage';
import { t } from './i18n';

export interface TutorialStep {
  id: string;
  text: string;
  check: (s: GameState) => boolean; // true => step completed
}

function step(id: string, key: string, check: (s: GameState) => boolean): TutorialStep {
  return {
    id,
    get text() { return t(key); },
    check,
  };
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  step('place', 'tutorial.place', (s) => s.towers.length > 0),
  step('wave', 'tutorial.wave', (s) => s.waves.current >= 1),
  step('upgrade', 'tutorial.upgrade', (s) => s.towers.some((tower) => tower.level > 1) || s.stats.get().upgrades > 0),
  step('spell', 'tutorial.spell', (s) => s.stats.get().spellsCast > 0 || s.spells.some((sp) => !sp.ready)),
  step('intel', 'tutorial.intel', (s) => s.waves.current >= 2 || s.enemies.some((enemy) => enemy.isBoss)),
  step('talent', 'tutorial.talent', (s) => s.lastStars > 0 || s.talents.talentPoints > 0),
];

export class Tutorial {
  private shownIds: Set<string>;
  active: TutorialStep | null = null;

  constructor() {
    this.shownIds = new Set(load<string[]>('tutorial:shown:v2', []));
  }

  update(s: GameState): void {
    // pick the first unshown step whose check is not yet satisfied
    this.active = null;
    for (const step of TUTORIAL_STEPS) {
      if (this.shownIds.has(step.id)) continue;
      if (step.check(s)) {
        this.shownIds.add(step.id);
        save('tutorial:shown:v2', [...this.shownIds]);
      } else {
        this.active = step;
        break;
      }
    }
  }

  reset(): void {
    this.shownIds.clear();
    save('tutorial:shown:v2', []);
    this.active = TUTORIAL_STEPS[0] ?? null;
  }
}
