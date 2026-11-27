import type { Renderer } from '../engine/Renderer';
import type { GameState } from '../game/GameState';
import { weeklyRuleSummary } from '../utils/WeeklyRules';
import { t } from '../utils/i18n';
import type { BattleBox } from './BattleLayout';

export function drawWeeklyRunBadge(r: Renderer, s: GameState, box: BattleBox): void {
  if (!s.activeWeeklyMode) return;
  const { x, y, w, h } = box;
  r.rect(x, y + 5, 1, h - 10, '#43536a');
  r.text(t(`weekly.${s.activeWeeklyMode.mode}`), x + 10, y + h / 2 - 8, '#d6e4ee', h < 42 ? 11 : 12, 'left', 'bold', 'middle', 'ui', w - 18);
  r.text(weeklyRuleSummary(s.activeWeeklyMode), x + 10, y + h / 2 + 8, '#a7b9ca', 10, 'left', 'normal', 'middle', 'ui', w - 18);
}
