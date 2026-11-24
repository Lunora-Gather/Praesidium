// Combat system: applies projectile hits, splash, slow, typed damage.
// Emits events for particles/audio/stats. Authoritative damage application.

import { GameState } from '../GameState';
import type { Projectile } from '../projectiles/Projectile';
import type { Enemy } from '../enemies/Enemy';
import type { DamageType } from '../DamageType';
import { EventBus } from '../../utils/EventBus';
import { BALANCE } from '../../config/balance';
import type { Vec2 } from '../../engine/math/Vec2';

export interface CombatEvents {
  hit: { enemy: Enemy; damage: number; x: number; y: number };
  kill: { enemy: Enemy; x: number; y: number; reward: number };
  splash: { x: number; y: number; radius: number };
  arc: { from: Vec2; to: Vec2; color: string };
}

export class CombatSystem {
  readonly bus: EventBus<CombatEvents>;

  constructor(bus?: EventBus<CombatEvents>) {
    this.bus = bus ?? new EventBus<CombatEvents>();
  }

  resolve(projectiles: readonly Projectile[], enemies: readonly Enemy[], state: GameState): void {
    for (const p of projectiles) {
      if (p.dead) continue;

      // Splash weapons: explode on proximity even if target died mid-flight.
      // Non-splash: skip if target is dead (projectile flies straight until timeout).
      if (p.splash) {
        // check if projectile is near ANY enemy (not just its original target)
        const r2 = p.splash * p.splash;
        let hitAny = false;
        for (const e of enemies) {
          if (e.dead) continue;
          if (p.pos.distSq(e.pos) <= r2) {
            hitAny = true;
            break;
          }
        }
        if (!hitAny) continue; // not near any enemy yet, keep flying
        for (const e of enemies) {
          if (e.dead) continue;
          if (p.pos.distSq(e.pos) <= r2) this.damage(e, p.damage, p.damageType, state);
        }
        this.bus.emit('splash', { x: p.pos.x, y: p.pos.y, radius: p.splash });
        p.dead = true;
      } else {
        if (!p.target || p.target.dead) continue;
        const hitR = p.target.radius + 4;
        if (p.pos.distSq(p.target.pos) > hitR * hitR) continue;
        this.damage(p.target, p.damage, p.damageType, state);
        if (p.chain) this.chainFrom(p, p.target, p.chain, enemies, state);
        if (p.slow && !p.target.dead) {
          p.target.applySlow(p.slow.factor, p.slow.duration);
        }
        p.dead = true;
      }
    }
  }

  private chainFrom(projectile: Projectile, primary: Enemy, chain: NonNullable<Projectile['chain']>, enemies: readonly Enemy[], state: GameState): void {
    let previous = primary;
    let damage = projectile.damage;
    const struck = new Set([primary]);
    const rangeSquared = chain.range * chain.range;
    for (let jump = 0; jump < chain.jumps; jump++) {
      let next: Enemy | null = null;
      let closest = Infinity;
      for (const enemy of enemies) {
        if (enemy.dead || struck.has(enemy)) continue;
        const distance = enemy.pos.distSq(previous.pos);
        if (distance <= rangeSquared && distance < closest) {
          next = enemy;
          closest = distance;
        }
      }
      if (!next) break;
      struck.add(next);
      damage *= chain.falloff;
      this.bus.emit('arc', { from: previous.pos, to: next.pos, color: projectile.color });
      this.damage(next, damage, projectile.damageType, state);
      previous = next;
    }
  }

  damage(e: Enemy, dmg: number, type: DamageType, state: GameState, comboEligible = true): void {
    if (e.dead) return;
    const actual = e.takeDamage(dmg, type);
    state.stats.recordDamage(actual);
    this.bus.emit('hit', { enemy: e, damage: actual, x: e.pos.x, y: e.pos.y });
    if (!e.dead) return;

    let reward = Math.round(e.reward * state.talentMultiplier('gold') * state.diffMul.rewardMul);
    if (comboEligible) {
      state.comboCount++;
      state.comboTimer = GameState.COMBO_WINDOW;
      if (state.comboCount >= 3) {
        const percent = Math.min(BALANCE.comboMaxBonusPercent, (state.comboCount - 2) * BALANCE.comboBonusStepPercent);
        reward += Math.floor(reward * percent / 100);
      }
    }
    state.gold += reward;
    state.score += reward;
    state.stats.recordKill();
    state.stats.recordGold(reward);
    state.achievements.recordEnemyDefeat(reward);
    this.bus.emit('kill', { enemy: e, x: e.pos.x, y: e.pos.y, reward });
  }
}
