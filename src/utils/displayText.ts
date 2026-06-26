// Display text helpers: keep gameplay registry data stable while UI labels can be localized.

import { t } from './i18n';

function localize(key: string, fallback: string): string {
  const value = t(key);
  return value === key ? fallback : value;
}

export function towerName(id: string, fallback: string): string {
  return localize(`towerDef.${id}.name`, fallback);
}

export function towerDescription(id: string, fallback: string): string {
  return localize(`towerDef.${id}.desc`, fallback);
}

export function enemyName(id: string, fallback: string): string {
  return localize(`enemy.${id}.name`, fallback);
}

export function enemyDescription(id: string, fallback: string): string {
  return localize(`enemy.${id}.desc`, fallback);
}

export function spellName(id: string, fallback: string): string {
  return localize(`spell.${id}.name`, fallback);
}

export function spellDescription(id: string, fallback: string): string {
  return localize(`spell.${id}.desc`, fallback);
}

export function achievementName(id: string, fallback: string): string {
  return localize(`achievement.${id}.name`, fallback);
}

export function achievementDescription(id: string, fallback: string): string {
  return localize(`achievement.${id}.desc`, fallback);
}

export function strategyName(id: string, fallback: string): string {
  return localize(`strategy.${id}`, fallback);
}

export function traitName(trait: string): string {
  const map: Record<string, string> = {
    'Standard': 'trait.standard',
    'No resistance': 'trait.noResistance',
    'Fast': 'trait.fast',
    'Low HP': 'trait.lowHp',
    'Armored': 'trait.armored',
    'High HP': 'trait.highHp',
    'Resists Ice': 'trait.resistsIce',
    'Aggressive': 'trait.aggressive',
    'Resists Fire': 'trait.resistsFire',
    'Boss': 'trait.boss',
    'Massive HP': 'trait.massiveHp',
    'Broad resistance': 'trait.broadResistance',
    'Ethereal': 'trait.ethereal',
    'Resists Physical': 'trait.resistsPhysical',
    'Siege': 'trait.siege',
    'Very high HP': 'trait.veryHighHp',
    'Elemental resistance': 'trait.elementalResistance',
  };
  const key = map[trait];
  return key ? localize(key, trait) : trait;
}
