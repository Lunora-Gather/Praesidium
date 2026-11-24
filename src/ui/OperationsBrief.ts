import type { GameState } from '../game/GameState';
import { getEnemyDef } from '../game/enemies/EnemyRegistry';
import { dailyDateStr } from '../utils/DailyChallenge';
import { dailyMissions, evaluateMissions } from '../utils/DailyMissions';
import { achievementDescription, achievementName, enemyName } from '../utils/displayText';
import { t } from '../utils/i18n';
import { WEEKLY_REWARD_WAVE, weeklyMode } from '../utils/WeeklyMode';
import { weeklyRuleSummary } from '../utils/WeeklyRules';

export class OperationsBrief {
  private readonly dialog = document.createElement('dialog');

  constructor(private readonly replayTutorial: () => void) {
    this.dialog.className = 'app-dialog ops-dialog';
    this.dialog.setAttribute('aria-labelledby', 'ops-title');
    document.body.append(this.dialog);
  }

  get isOpen(): boolean { return this.dialog.open; }

  private heading(parent: HTMLElement, label: string, size: 'h2' | 'h3'): HTMLHeadingElement {
    const title = document.createElement(size);
    title.textContent = label;
    parent.append(title);
    return title;
  }

  private items(parent: HTMLElement, rows: readonly string[]): void {
    const list = document.createElement('ul');
    for (const text of rows) {
      const item = document.createElement('li');
      item.textContent = text;
      list.append(item);
    }
    parent.append(list);
  }

  open(state: GameState): void {
    if (this.dialog.open) return;
    const { phase, runOrigin, activeWeeklyMode } = state;
    const isBattle = phase === 'playing';
    const isRun = isBattle || phase === 'won' || phase === 'lost';
    const profile = state.save.get();
    this.dialog.replaceChildren();
    const title = this.heading(this.dialog, t('ops.title'), 'h2');
    title.id = 'ops-title';
    title.tabIndex = -1;

    const content = document.createElement('div');
    content.className = 'ops-content';
    content.tabIndex = 0;
    content.setAttribute('role', 'region');
    content.setAttribute('aria-label', t('ops.content'));
    this.dialog.append(content);

    if (isBattle) {
      const upcoming = state.waves.previewNext();
      this.heading(content, t('ops.nextWave'), 'h3');
      this.items(content, upcoming ? upcoming.enemies.map(({ id, count }) => `${enemyName(id, getEnemyDef(id).name)} ×${count}`) : [t('ops.noWave')]);
    }
    if (isRun && (runOrigin.kind === 'custom' || runOrigin.kind === 'legacy')) {
      this.items(content, [t('ops.practice'), ...(activeWeeklyMode ? [weeklyRuleSummary(activeWeeklyMode)] : [])]);
    }

    const day = isRun ? state.objectiveDate : dailyDateStr();
    this.heading(content, `${t('ops.daily')} · ${day}`, 'h3');
    const eligible = isRun && runOrigin.kind !== 'custom' && runOrigin.kind !== 'legacy';
    const targets = evaluateMissions(dailyMissions(day), { wave: eligible ? state.waves.current : 0,
      score: eligible ? state.score : 0, stats: eligible ? state.stats.get() : { kills: 0, towersPlaced: 0, upgrades: 0, spellsCast: 0 } });
    this.items(content, targets.map(({ mission, value }) => {
      const claimed = profile.dailyMissionClaims[mission.id];
      return `${t(`mission.${mission.kind}.title`)} · ${Math.min(value, mission.target)}/${mission.target} · ${claimed ? t('ops.claimed') : `+${mission.reward}`}`;
    }));

    const weeklyRun = isRun && runOrigin.kind === 'weekly';
    const week = weeklyMode(weeklyRun ? runOrigin.period : undefined);
    this.heading(content, `${t('menu.weekly')} · ${week.weekKey}`, 'h3');
    const claimed = !!(profile.weeklyRewardClaims[week.id] || profile.weeklyBestWaves[week.id]);
    const goal = t('ops.weeklyGoal').replace('{wave}', String(WEEKLY_REWARD_WAVE));
    const cleared = weeklyRun ? Math.min(state.clearedWaves, WEEKLY_REWARD_WAVE) : 0;
    this.items(content, [t(`weekly.${week.mode}`), weeklyRuleSummary(week),
      `${goal} · ${weeklyRun ? `${cleared}/${WEEKLY_REWARD_WAVE} · ` : ''}${claimed ? t('ops.claimed') : `+${week.reward}`}`]);

    this.heading(content, t('ops.milestones'), 'h3');
    const nextMilestone = [5, 10, 25, 50, 100].find(value => value > profile.missionCredits);
    this.items(content, [t('ops.credits').replace('{count}', String(profile.missionCredits)),
      nextMilestone ? t('ops.nextMilestone').replace('{target}', String(nextMilestone)) : t('ops.allMilestones')]);

    this.heading(content, t('ops.achievements'), 'h3');
    this.items(content, state.achievements.all.map(achievement => {
      const done = state.achievements.isUnlocked(achievement.id);
      const value = Math.min(state.achievements.statsView[achievement.metric], achievement.target);
      return `${achievementName(achievement.id, achievement.name)} · ${done ? t('achievement.unlocked')
        : `${value}/${achievement.target} · ${achievementDescription(achievement.id, achievement.description)}`}`;
    }));

    const actions = document.createElement('div');
    actions.className = 'actions';
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = t('common.close');
    close.addEventListener('click', () => this.dialog.close());
    const replay = document.createElement('button');
    replay.type = 'button';
    replay.textContent = t('tutorial.replay');
    replay.addEventListener('click', () => { this.replayTutorial(); this.dialog.close(); });
    actions.append(replay, close);
    this.dialog.append(actions);
    content.scrollTop = 0;
    this.dialog.showModal();
    title.focus({ preventScroll: true });
  }
}
