// Player-cast spells: global cooldown abilities with gold cost.
// Phase 3 ships Meteor (AoE damage) + Freeze (global slow) + Repair (heal lives).

import { Vec2 } from '../../engine/math/Vec2';
import type { GameState } from '../GameState';
import { DamageType } from '../DamageType';

export interface SpellDef {
  id: string;
  name: string;
  color: string;
  cooldown: number; // seconds
  cost: number; // gold
  radius?: number; // AoE radius (undefined = instant global)
  damage?: number;
  damageType?: DamageType; // defaults to Physical if undefined
  slow?: { factor: number; duration: number };
  heal?: number;
  description: string;
}

export const SPELL_DEFS: Record<string, SpellDef> = {
  meteor: {
    id: 'meteor',
    name: 'Meteor',
    color: '#ff7043',
    cooldown: 25,
    cost: 80,
    radius: 90,
    damage: 120,
    damageType: DamageType.Fire,
    description: 'AoE damage at target location.',
  },
  freeze: {
    id: 'freeze',
    name: 'Freeze',
    color: '#4dd0e1',
    cooldown: 30,
    cost: 100,
    slow: { factor: 0.2, duration: 3 },
    description: 'Slow all enemies on the map.',
  },
  repair: {
    id: 'repair',
    name: 'Repair',
    color: '#81c784',
    cooldown: 45,
    cost: 120,
    heal: 3,
    description: 'Restore 3 lives.',
  },
};

export class PlayerSpell {
  readonly def: SpellDef;
  cooldown = 0;

  constructor(def: SpellDef) {
    this.def = def;
  }

  get ready(): boolean {
    return this.cooldown <= 0;
  }

  update(dt: number): void {
    if (this.cooldown > 0) this.cooldown -= dt;
  }

  /** Try to cast. Returns true if cast. target is world pos (for AoE). */
  cast(target: Vec2, state: GameState): boolean {
    if (!this.ready || state.gold < this.def.cost) return false;
    state.gold -= this.def.cost;
    this.cooldown = this.def.cooldown;

    if (this.def.damage && this.def.radius) {
      const r2 = this.def.radius * this.def.radius;
      const type = this.def.damageType ?? DamageType.Physical;
      for (const e of state.enemies) {
        if (e.dead) continue;
        if (target.distSq(e.pos) > r2) continue;
        const actual = e.takeDamage(this.def.damage, type);
        state.stats.recordDamage(actual);
        state.combat.bus.emit('hit', { enemy: e, damage: actual, x: e.pos.x, y: e.pos.y });
        if (e.hp <= 0) {
          const reward = Math.round(e.reward * state.talents.multiplier('gold') * state.diffMul.rewardMul);
          state.gold += reward;
          state.score += reward;
          state.stats.recordKill();
          state.stats.recordGold(reward);
          state.achievements.recordKill();
          state.achievements.recordGold(reward);
          state.combat.bus.emit('kill', { enemy: e, x: e.pos.x, y: e.pos.y });
        }
      }
    }
    if (this.def.slow) {
      for (const e of state.enemies) {
        if (e.dead) continue;
        e.applySlow(this.def.slow.factor, this.def.slow.duration);
      }
    }
    if (this.def.heal) {
      state.lives += this.def.heal;
    }
    return true;
  }
}

export const PLAYER_SPELLS = Object.values(SPELL_DEFS).map((d) => new PlayerSpell(d));
