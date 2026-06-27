// Daily mission UI panel: makes the retention loop visible from the main menu and end screens.

import { Renderer } from '../engine/Renderer';
import { dailyDateStr } from '../utils/DailyChallenge';
import { dailyMissions, evaluateMissions, type DailyMission, type MissionProgress } from '../utils/DailyMissions';
import { layoutFor, UI } from './Layout';

export interface MissionPanelRunStats {
  wave?: number;
  score: number;
  kills?: number;
  upgrades?: number;
  spellsCast?: number;
  towersPlaced?: number;
}

export class DailyMissionPanel {
  draw(r: Renderer): void {
    const layout = layoutFor(r);
    const missions = dailyMissions(dailyDateStr());
    const box = this.panelBox(r, false);
    this.drawFrame(r, box.x, box.y, box.w, box.h, 'DAILY OBJECTIVES');
    r.text(dailyDateStr(), box.x + box.w - 16, box.y + 12, UI.color.textDim, 10, 'right', 'bold', 'top', 'header');

    const startY = box.y + (box.isSmall ? 34 : 40);
    const rowH = box.isSmall ? 21 : 25;
    for (let i = 0; i < missions.length; i++) {
      this.drawMissionRow(r, missions[i], box.x + 16, startY + i * rowH, box.w - 32, rowH - 3, box.isSmall);
    }
  }

  drawProgress(r: Renderer, run: MissionPanelRunStats | undefined): void {
    if (!run) return;
    const layout = layoutFor(r);
    const isSideRail = r.width >= 1060 && r.height >= 620;
    if (!isSideRail && r.height < 740) return;

    const missions = dailyMissions(dailyDateStr());
    const progress = evaluateMissions(missions, {
      wave: run.wave ?? 0,
      score: run.score,
      stats: {
        kills: run.kills ?? 0,
        upgrades: run.upgrades ?? 0,
        spellsCast: run.spellsCast ?? 0,
        towersPlaced: run.towersPlaced ?? 0,
      },
    });
    const box = this.panelBox(r, true);
    this.drawFrame(r, box.x, box.y, box.w, box.h, 'DAILY PROGRESS');
    const completed = progress.filter(item => item.complete).length;
    r.text(`${completed}/${progress.length}`, box.x + box.w - 16, box.y + 12, completed === progress.length ? UI.color.green : UI.color.gold, 10, 'right', 'bold', 'top', 'header');

    const startY = box.y + (box.isSmall ? 34 : 40);
    const rowH = box.isSmall ? 21 : 25;
    for (let i = 0; i < progress.length; i++) {
      this.drawProgressRow(r, progress[i], box.x + 16, startY + i * rowH, box.w - 32, rowH - 3, box.isSmall);
    }
  }

  private panelBox(r: Renderer, progressMode: boolean): { x: number; y: number; w: number; h: number; isSmall: boolean } {
    const layout = layoutFor(r);
    const isSmall = layout.isPhone || r.height < 560;
    const isSideRail = r.width >= 1060 && r.height >= 620;
    const w = Math.min(r.width - layout.safe * 2, isSmall ? 360 : isSideRail ? 320 : 420);
    const h = isSmall ? 106 : 126;
    const x = isSideRail ? r.width - w - layout.safe : r.width / 2 - w / 2;
    const y = isSideRail ? (progressMode ? 238 : 96) : Math.max(layout.safe, r.height - h - layout.safe);
    return { x, y, w, h, isSmall };
  }

  private drawFrame(r: Renderer, x: number, y: number, w: number, h: number, title: string): void {
    const layout = layoutFor(r);
    const bg = r.linearGradient(x, y, x, y + h, [
      { offset: 0, color: 'rgba(15, 23, 42, 0.88)' },
      { offset: 1, color: 'rgba(2, 6, 23, 0.92)' },
    ]);
    r.setShadow('rgba(20, 184, 166, 0.22)', 16, 0, 4);
    r.roundRect(x, y, w, h, layout.radius, bg, true, 'rgba(45, 212, 191, 0.24)', 1.2);
    r.clearShadow();
    r.text(title, x + 16, y + 12, '#5eead4', 10, 'left', 'bold', 'top', 'header');
  }

  private drawMissionRow(r: Renderer, mission: DailyMission, x: number, y: number, w: number, h: number, isSmall: boolean): void {
    r.roundRect(x, y, w, h, 7, 'rgba(15, 23, 42, 0.72)', true, 'rgba(148, 163, 184, 0.08)', 1);
    r.roundRect(x, y, 3, h, 2, '#14b8a6', true);
    r.text(mission.title, x + 12, y + h / 2, UI.color.text, isSmall ? 9.5 : 10.5, 'left', 'bold', 'middle', 'header');
    r.text(`${mission.target}`, x + w - 42, y + h / 2, UI.color.gold, isSmall ? 9.5 : 10.5, 'right', 'bold', 'middle', 'header');
    r.text(`+${mission.reward}`, x + w - 12, y + h / 2, '#5eead4', isSmall ? 9 : 10, 'right', 'bold', 'middle', 'header');
  }

  private drawProgressRow(r: Renderer, item: MissionProgress, x: number, y: number, w: number, h: number, isSmall: boolean): void {
    const color = item.complete ? UI.color.green : '#14b8a6';
    r.roundRect(x, y, w, h, 7, 'rgba(15, 23, 42, 0.72)', true, 'rgba(148, 163, 184, 0.08)', 1);
    r.roundRect(x, y, 3, h, 2, color, true);
    r.text(item.complete ? '✓' : '•', x + 12, y + h / 2, color, isSmall ? 9.5 : 10.5, 'center', 'bold', 'middle', 'header');
    r.text(item.mission.title, x + 24, y + h / 2, UI.color.text, isSmall ? 9.5 : 10.5, 'left', 'bold', 'middle', 'header');
    r.text(`${Math.min(item.value, item.mission.target)}/${item.mission.target}`, x + w - 12, y + h / 2, item.complete ? UI.color.green : UI.color.gold, isSmall ? 9 : 10, 'right', 'bold', 'middle', 'header');
  }
}
