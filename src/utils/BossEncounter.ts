// Boss encounter labels: turns enemy groups into readable strategy cues.

import { t } from './i18n';

export type EncounterGroup = { id: string; count?: number };

export interface BossEncounterInfo {
  id: 'none' | 'fast_escort' | 'armored_escort' | 'phantom_siege' | 'standard_boss';
  label: string;
  advice: string;
  color: string;
}

export function classifyBossEncounter(groups: EncounterGroup[]): BossEncounterInfo {
  const ids = new Set(groups.filter(group => (group.count ?? 1) > 0).map(group => group.id));
  if (!ids.has('boss')) return {
    id: 'none',
    label: '',
    advice: '',
    color: '#64748b',
  };
  const bossIndex = groups.findIndex(group => group.id === 'boss' && (group.count ?? 1) > 0);
  const hasFastBossEscort = bossIndex >= 0 && groups
    .slice(bossIndex + 1)
    .some(group => group.id === 'scout' && (group.count ?? 1) > 0);
  if (hasFastBossEscort) return {
    id: 'fast_escort',
    label: t('boss.fast.title'),
    advice: t('boss.fast.advice'),
    color: '#38bdf8',
  };
  if (ids.has('phantom') || ids.has('titan')) return {
    id: 'phantom_siege',
    label: t('boss.phantom.title'),
    advice: t('boss.phantom.advice'),
    color: '#a78bfa',
  };
  if (ids.has('brute') || ids.has('zealot')) return {
    id: 'armored_escort',
    label: t('boss.armor.title'),
    advice: t('boss.armor.advice'),
    color: '#f59e0b',
  };
  return {
    id: 'standard_boss',
    label: t('boss.standard.title'),
    advice: t('boss.standard.advice'),
    color: '#ef4444',
  };
}
