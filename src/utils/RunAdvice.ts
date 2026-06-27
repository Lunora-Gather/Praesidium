// Context-aware run advice for first-time clarity and defeat recovery.
// Commercial goal: after a loss, the player should know one concrete thing to try next.

import type { GameState } from '../game/GameState';
import { t } from './i18n';

export function buildDefeatAdvice(state: GameState): string {
  const stats = state.stats.get();
  const wave = state.waves.current;
  const towers = state.towers.length;
  const upgrades = stats.upgrades;
  const spells = stats.spellsCast;

  if (towers <= 1 && wave <= 2) return t('advice.defeat.moreTowers');
  if (towers >= 2 && upgrades === 0) return t('advice.defeat.upgradeEarlier');
  if (wave >= 2 && spells === 0) return t('advice.defeat.useSpells');
  if (state.enemies.some(enemy => enemy.isBoss)) return t('advice.defeat.bossFocus');
  if (state.lives <= 0) return t('advice.defeat.coverExit');
  if (state.gold >= 120 && towers < 4) return t('advice.defeat.spendGold');
  if (wave >= 3 && towers < 3) return t('advice.defeat.addCoverage');
  return t('summary.defeatAdvice');
}

export function buildFirstRunNudge(state: GameState): string | null {
  const stats = state.stats.get();
  if (state.towers.length === 0) return t('nudge.placeFirstTower');
  if (state.waves.current === 0 && !state.waves.inProgress) return t('nudge.sendFirstWave');
  if (state.towers.length > 0 && stats.upgrades === 0 && state.gold >= 90 && state.waves.current >= 1) return t('nudge.upgradeTower');
  if (stats.spellsCast === 0 && state.waves.current >= 2 && state.gold >= 60) return t('nudge.trySpell');
  if (state.waves.current >= 2 && state.enemies.length > 0) return t('nudge.openIntel');
  return null;
}
