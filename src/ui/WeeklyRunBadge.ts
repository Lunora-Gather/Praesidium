// Weekly run badge: shows active weekly-mode rule inside seeded runs.

import { Renderer } from '../engine/Renderer';
import type { GameState } from '../game/GameState';
import { weeklyRuleSummary } from '../utils/WeeklyRules';
import { TOP_H } from './HUD';

export function drawWeeklyRunBadge(r: Renderer, s: GameState): void {
  if (!s.activeWeeklyMode) return;
  if (r.width < 760 || r.height < 520) return;

  const title = s.activeWeeklyMode.title;
  const rule = weeklyRuleSummary(s.activeWeeklyMode);
  const label = `WEEKLY MODE · ${title}`;
  const w = Math.min(420, Math.max(260, Math.max(label.length, rule.length) * 7.4 + 34));
  const h = 42;
  const x = 14;
  const y = TOP_H + 66;
  const pulse = 0.22 + Math.sin(Date.now() / 650) * 0.04;

  r.setShadow(`rgba(168, 85, 247, ${pulse})`, 14, 0, 4);
  r.roundRect(x, y, w, h, 12, 'rgba(30, 27, 75, 0.82)', true, 'rgba(168, 85, 247, 0.42)', 1.2);
  r.clearShadow();
  r.roundRect(x + 8, y + 8, 4, h - 16, 3, '#c084fc', true);
  r.text(label, x + 22, y + 10, '#e9d5ff', 10, 'left', 'bold', 'top', 'header');
  r.text(rule, x + 22, y + 27, '#c4b5fd', 9, 'left', 'bold', 'top');
}
