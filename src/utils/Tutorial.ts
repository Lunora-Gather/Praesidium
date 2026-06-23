// Tutorial: contextual first-run hints that disappear after triggered.
// Stored as ordered checks; each reveals one tip then marks itself shown.

import { GameState } from '../game/GameState';
import { load, save } from './storage';

export interface TutorialStep {
  id: string;
  text: string;
  check: (s: GameState) => boolean; // true => step completed
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  { id: 'place', text: 'Click a buildable tile to place a Turret.', check: (s) => s.towers.length > 0 },
  { id: 'wave', text: 'Click "Send Wave" (bottom-right) to summon enemies.', check: (s) => s.waves.current >= 1 },
  { id: 'upgrade', text: 'Click a placed tower to upgrade or sell it.', check: (s) => s.towers.some((t) => t.level > 1) },
  { id: 'spell', text: 'Try a spell: Meteor (AoE) or Freeze (slow all).', check: (s) => s.spells.some((sp) => !sp.ready) },
];

export class Tutorial {
  private shownIds: Set<string>;
  active: TutorialStep | null = null;

  constructor() {
    this.shownIds = new Set(load<string[]>('tutorial:shown', []));
  }

  update(s: GameState): void {
    // pick the first unshown step whose check is not yet satisfied
    this.active = null;
    for (const step of TUTORIAL_STEPS) {
      if (this.shownIds.has(step.id)) continue;
      if (step.check(s)) {
        this.shownIds.add(step.id);
        save('tutorial:shown', [...this.shownIds]);
      } else {
        this.active = step;
        break;
      }
    }
  }

  reset(): void {
    this.shownIds.clear();
    save('tutorial:shown', []);
    this.active = TUTORIAL_STEPS[0] ?? null;
  }
}
