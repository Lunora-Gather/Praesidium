// Track actions, not correlations such as the default tower or wave number.
import type { GameState } from '../game/GameState';
import { load, save } from './storage';
import { t } from './i18n';

const ORDER = ['select', 'place', 'wave', 'inspect', 'upgrade', 'intel', 'spell', 'talent'] as const;
export type TutorialAction = typeof ORDER[number];
const KEY = 'tutorial:actions:v4';
const LEGACY_KEY = 'tutorial:shown:v3';

export interface TutorialStep { id: TutorialAction; text: string }
export const TUTORIAL_STEPS: TutorialStep[] = ORDER.map(id => ({ id, get text() { return t(`tutorial.${id}`); } }));

export class Tutorial {
  private readonly completed: Set<TutorialAction>;
  active: TutorialStep | null = null;

  constructor() {
    const stored = load<string[] | null>(KEY, null);
    const legacy = load<string[]>(LEGACY_KEY, []);
    // Don't force a tutorial on players who had already finished onboarding.
    this.completed = new Set(ORDER.filter(id => Array.isArray(stored) ? stored.includes(id) : ORDER.every(step => legacy.includes(step))));
  }

  record(action: TutorialAction): void {
    if (this.completed.has(action)) return;
    this.completed.add(action);
    save(KEY, [...this.completed]);
  }

  update(state: GameState): void {
    this.active = state.phase === 'playing' && state.runOrigin.kind === 'campaign' && state.levels.levelNumber <= 2
      ? TUTORIAL_STEPS.find(step => !this.completed.has(step.id)) ?? null : null;
  }

  reset(): void {
    this.completed.clear();
    save(KEY, []);
    this.active = TUTORIAL_STEPS[0] ?? null;
  }
}
