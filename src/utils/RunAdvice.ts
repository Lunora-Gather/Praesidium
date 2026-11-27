// Suggest one concrete adjustment after a defeat.

import { t } from './i18n';

export interface DefeatSummaryInput {
  wave?: number;
  lives?: number;
  goldAvailable?: number;
  towersPlaced?: number;
  upgrades?: number;
  spellsCast?: number;
}

export function buildDefeatAdviceFromSummary(summary: DefeatSummaryInput): string {
  const wave = summary.wave ?? 0;
  const towers = summary.towersPlaced ?? 0;
  const upgrades = summary.upgrades ?? 0;
  const spells = summary.spellsCast ?? 0;
  const gold = summary.goldAvailable ?? 0;

  if (towers <= 1 && wave <= 2) return t('advice.defeat.moreTowers');
  if (towers >= 2 && upgrades === 0) return t('advice.defeat.upgradeEarlier');
  if (wave >= 2 && spells === 0) return t('advice.defeat.useSpells');
  if ((summary.lives ?? 0) <= 0 && wave <= 3) return t('advice.defeat.coverExit');
  if (gold >= 120 && towers < 4) return t('advice.defeat.spendGold');
  if (wave >= 3 && towers < 3) return t('advice.defeat.addCoverage');
  return t('summary.defeatAdvice');
}
