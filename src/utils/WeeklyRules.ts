// Weekly rules: converts visible weekly mode metadata into optional challenge modifiers.
// Rules are applied only when a weekly-enabled challenge run is started.

import type { WeeklyMode } from './WeeklyMode';

export interface WeeklyRuleSet {
  speedMul: number;
  hpMul: number;
  countMul: number;
  startGoldMul: number;
  maxTowers: number | null;
  bossHpMul: number;
  repairDisabled: boolean;
}

export const DEFAULT_WEEKLY_RULES: WeeklyRuleSet = {
  speedMul: 1,
  hpMul: 1,
  countMul: 1,
  startGoldMul: 1,
  maxTowers: null,
  bossHpMul: 1,
  repairDisabled: false,
};

export function weeklyRules(mode: WeeklyMode | null | undefined): WeeklyRuleSet {
  if (!mode) return DEFAULT_WEEKLY_RULES;
  switch (mode.mode) {
    case 'speed_run':
      return { ...DEFAULT_WEEKLY_RULES, speedMul: 1.18 };
    case 'low_gold':
      return { ...DEFAULT_WEEKLY_RULES, startGoldMul: 0.75 };
    case 'limited_builds':
      return { ...DEFAULT_WEEKLY_RULES, maxTowers: 6 };
    case 'boss_week':
      return { ...DEFAULT_WEEKLY_RULES, bossHpMul: 1.28, hpMul: 1.06 };
    case 'no_repair':
      return { ...DEFAULT_WEEKLY_RULES, repairDisabled: true };
    case 'dense_waves':
      return { ...DEFAULT_WEEKLY_RULES, countMul: 1.16 };
  }
}

export function weeklyRuleSummary(mode: WeeklyMode): string {
  const rules = weeklyRules(mode);
  if (rules.speedMul > 1) return `Enemy speed x${rules.speedMul.toFixed(2)}`;
  if (rules.startGoldMul < 1) return `Start gold x${rules.startGoldMul.toFixed(2)}`;
  if (rules.maxTowers !== null) return `Max ${rules.maxTowers} towers`;
  if (rules.bossHpMul > 1) return `Boss HP x${rules.bossHpMul.toFixed(2)}`;
  if (rules.repairDisabled) return 'Repair disabled';
  if (rules.countMul > 1) return `Enemy count x${rules.countMul.toFixed(2)}`;
  return 'Standard weekly rules';
}
