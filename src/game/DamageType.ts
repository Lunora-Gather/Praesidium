// Damage types + enemy resistances. Enables rock-paper-scissors targeting.

export const enum DamageType {
  Physical = 0,
  Fire = 1,
  Ice = 2,
  Lightning = 3,
}

export const DAMAGE_TYPE_COLORS: Record<DamageType, string> = {
  [DamageType.Physical]: '#bdbdbd',
  [DamageType.Fire]: '#ff7043',
  [DamageType.Ice]: '#4dd0e1',
  [DamageType.Lightning]: '#fff176',
};

export type ResistanceMap = Partial<Record<DamageType, number>>; // 0 = immune, 1 = normal, 2 = vulnerable

export function applyResistance(dmg: number, type: DamageType, resist: ResistanceMap): number {
  const mult = resist[type] ?? 1;
  return dmg * mult;
}
