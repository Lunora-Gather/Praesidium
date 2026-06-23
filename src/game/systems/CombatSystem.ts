// Combat system: applies projectile hits, splash, slow, typed damage.
// Emits events for particles/audio/stats. Authoritative damage application.

import type { GameState } from '../GameState';
import type { Projectile } from '../projectiles/Projectile';
import type { Enemy } from '../enemies/Enemy';
import { EventBus } from '../../utils/EventBus';

export interface CombatEvents {
  hit: { enemy: Enemy; damage: number; x: number; y: number };
  kill: { enemy: Enemy; x: number; y: number };
  splash: { x: number; y: number; radius: number };
}

export class CombatSystem {
  readonly bus: EventBus<CombatEvents>;

  constructor(bus?: EventBus<CombatEvents>) {
    this.bus = bus ?? new EventBus<CombatEvents>();
  }

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
          if (p.pos.distSq(e.pos) <= r2) this.damage(e, p.damage, p.damageType, state);
        }
        this.bus.emit('splash', { x: p.pos.x, y: p.pos.y, radius: p.splash });
      } else if (p.target && !p.target.dead) {
        this.damage(p.target, p.damage, p.damageType, state);
      }
      if (p.slow && p.target && !p.target.dead) {
        p.target.applySlow(p.slow.factor, p.slow.duration);
      }
      p.dead = true;
    }
  }

  private damage(e: Enemy, dmg: number, type: import('../DamageType').DamageType, state: GameState): void {
    // dmg already includes talent multiplier (baked into Tower.damage at construction)
    const wasAlive = !e.dead;
    const actual = e.takeDamage(dmg, type);
    state.stats.recordDamage(actual);
    this.bus.emit('hit', { enemy: e, damage: actual, x: e.pos.x, y: e.pos.y });
    if (wasAlive && e.hp <= 0) {
      const reward = Math.round(e.reward * state.talents.multiplier('gold') * state.diffMul.rewardMul);
      state.gold += reward;
      state.score += reward;
      state.stats.recordKill();
      state.stats.recordGold(reward);
      state.achievements.recordKill();
      state.achievements.recordGold(reward);
      this.bus.emit('kill', { enemy: e, x: e.pos.x, y: e.pos.y });
    }
  }
}
