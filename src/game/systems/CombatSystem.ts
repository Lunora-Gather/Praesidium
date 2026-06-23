// Combat system: applies projectile hits, splash, slow effects, damage numbers.
// Extracted from GameState so combat rules live in one testable place.

import type { GameState } from '../GameState';
import type { Projectile } from '../projectiles/Projectile';
import type { Enemy } from '../enemies/Enemy';
import { EventBus } from '../../utils/EventBus';

export interface CombatEvents {
  hit: { enemy: Enemy; damage: number };
  kill: { enemy: Enemy };
  splash: { x: number; y: number; radius: number };
}

export class CombatSystem {
  readonly bus: EventBus<CombatEvents>;

  constructor(bus?: EventBus<CombatEvents>) {
    this.bus = bus ?? new EventBus<CombatEvents>();
  }

  /** Resolve all live projectiles against enemies. Mutates state. */
  resolve(projectiles: readonly Projectile[], enemies: readonly Enemy[], state: GameState): void {
    for (const p of projectiles) {
      if (p.dead) continue;
      if (!p.target || p.target.dead) continue;
      const hitR = p.target.radius + 4;
      if (p.pos.distSq(p.target.pos) > hitR * hitR) continue;

      if (p.splash) {
        const r2 = p.splash * p.splash;
        for (const e of enemies) {
          if (e.dead) continue;
          if (p.pos.distSq(e.pos) <= r2) {
            this.damage(e, p.damage, state);
          }
        }
        this.bus.emit('splash', { x: p.pos.x, y: p.pos.y, radius: p.splash });
      } else if (p.target && !p.target.dead) {
        this.damage(p.target, p.damage, state);
      }
      if (p.slow && p.target && !p.target.dead) {
        p.target.applySlow?.(p.slow.factor, p.slow.duration);
      }
      p.dead = true;
    }
  }

  private damage(e: Enemy, dmg: number, state: GameState): void {
    const wasAlive = !e.dead;
    e.takeDamage(dmg);
    this.bus.emit('hit', { enemy: e, damage: dmg });
    if (wasAlive && e.hp <= 0) {
      state.gold += e.reward;
      state.score += e.reward;
      this.bus.emit('kill', { enemy: e });
    }
  }
}
