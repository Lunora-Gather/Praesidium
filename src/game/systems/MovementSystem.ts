// Movement + health system: advances enemies, handles life loss on goal reach,
// cleans dead enemies. Separated so movement rules are testable in isolation.

import type { Grid } from '../grid/Grid';
import type { Enemy } from '../enemies/Enemy';
import type { GameState } from '../GameState';
import { EventBus } from '../../utils/EventBus';

export interface MovementEvents {
  enemyReachedGoal: { enemy: Enemy };
  livesChanged: { lives: number };
}

export class MovementSystem {
  readonly bus: EventBus<MovementEvents>;

  constructor(bus?: EventBus<MovementEvents>) {
    this.bus = bus ?? new EventBus<MovementEvents>();
  }

  update(dt: number, enemies: Enemy[], grid: Grid, state: GameState): void {
    for (const e of enemies) {
      e.update(dt, grid);
      if (e.reachedGoal) {
        state.lives = Math.max(0, state.lives - 1);
        this.bus.emit('enemyReachedGoal', { enemy: e });
        this.bus.emit('livesChanged', { lives: state.lives });
      }
    }
    // compact dead
    let w = 0;
    for (let r = 0; r < enemies.length; r++) {
      if (!enemies[r].dead) {
        if (w !== r) enemies[w] = enemies[r];
        w++;
      }
    }
    enemies.length = w;
  }
}
