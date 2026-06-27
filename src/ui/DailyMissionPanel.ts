// Daily mission UI panel: makes the retention loop visible from the main menu.

import { Renderer } from '../engine/Renderer';
import { dailyDateStr } from '../utils/DailyChallenge';
import { dailyMissions, type DailyMission } from '../utils/DailyMissions';
import { layoutFor, UI } from './Layout';

export class DailyMissionPanel {
  draw(r: Renderer): void {
    const layout = layoutFor(r);
    const missions = dailyMissions(dailyDateStr());
    const isSmall = layout.isPhone || r.height < 560;
    const w = Math.min(r.width - layout.safe * 2, isSmall ? 360 : 420);
    const h = isSmall ? 106 : 126;
    const x = r.width / 2 - w / 2;
    const y = Math.max(layout.safe, r.height - h - layout.safe);

    const bg = r.linearGradient(x, y, x, y + h, [
      { offset: 0, color: 'rgba(15, 23, 42, 0.88)' },
      { offset: 1, color: 'rgba(2, 6, 23, 0.92)' },
    ]);
    r.setShadow('rgba(20, 184, 166, 0.22)', 16, 0, 4);
    r.roundRect(x, y, w, h, layout.radius, bg, true, 'rgba(45, 212, 191, 0.24)', 1.2);
    r.clearShadow();

    r.text('DAILY OBJECTIVES', x + 16, y + 12, '#5eead4', 10, 'left', 'bold', 'top', 'header');
    r.text(dailyDateStr(), x + w - 16, y + 12, UI.color.textDim, 10, 'right', 'bold', 'top', 'header');

    const startY = y + (isSmall ? 34 : 40);
    const rowH = isSmall ? 21 : 25;
    for (let i = 0; i < missions.length; i++) {
      this.drawMissionRow(r, missions[i], x + 16, startY + i * rowH, w - 32, rowH - 3, isSmall);
    }
  }

  private drawMissionRow(r: Renderer, mission: DailyMission, x: number, y: number, w: number, h: number, isSmall: boolean): void {
    r.roundRect(x, y, w, h, 7, 'rgba(15, 23, 42, 0.72)', true, 'rgba(148, 163, 184, 0.08)', 1);
    r.roundRect(x, y, 3, h, 2, '#14b8a6', true);
    r.text(mission.title, x + 12, y + h / 2, UI.color.text, isSmall ? 9.5 : 10.5, 'left', 'bold', 'middle', 'header');
    r.text(`${mission.target}`, x + w - 42, y + h / 2, UI.color.gold, isSmall ? 9.5 : 10.5, 'right', 'bold', 'middle', 'header');
    r.text(`+${mission.reward}`, x + w - 12, y + h / 2, '#5eead4', isSmall ? 9 : 10, 'right', 'bold', 'middle', 'header');
  }
}
