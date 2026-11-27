import type { GameState } from '../game/GameState';
import { getEnemyDef } from '../game/enemies/EnemyRegistry';
import { dailyDateStr } from '../utils/DailyChallenge';
import { dailyMissions, evaluateMissions } from '../utils/DailyMissions';
import { achievementDescription, achievementName, enemyName, towerName } from '../utils/displayText';
import { getTowerDef } from '../game/towers/TowerRegistry';
import { classifyBossEncounter } from '../utils/BossEncounter';
import { getLocale, t } from '../utils/i18n';
import { WEEKLY_REWARD_WAVE, weeklyMode } from '../utils/WeeklyMode';
import { weeklyRuleSummary } from '../utils/WeeklyRules';
import './operations.css';

function text<K extends keyof HTMLElementTagNameMap>(tag: K, value: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.textContent = value;
  return element;
}

function section(parent: HTMLElement, title: string, detail?: string): HTMLElement {
  const block = document.createElement('section');
  const heading = document.createElement('div');
  heading.className = 'ops-section-heading';
  heading.append(text('h3', title));
  if (detail) heading.append(text('span', detail));
  block.append(heading);
  parent.append(block);
  return block;
}

function row(list: HTMLElement, label: string, value: string, detail?: string): HTMLLIElement {
  const item = document.createElement('li');
  const labelLine = document.createElement('div');
  labelLine.className = 'ops-row-title';
  labelLine.append(text('strong', label), text('span', value));
  item.append(labelLine);
  if (detail) item.append(text('p', detail));
  list.append(item);
  return item;
}

export class OperationsBrief {
  private readonly dialog = document.createElement('dialog');

  constructor(private readonly replayTutorial: () => void) {
    this.dialog.id = 'ops-brief';
    this.dialog.setAttribute('aria-labelledby', 'ops-title');
    document.body.append(this.dialog);
  }

  get isOpen(): boolean { return this.dialog.open; }

  private button(label: string, run: () => void): HTMLButtonElement {
    const button = text('button', t(label));
    button.type = 'button';
    button.onclick = run;
    return button;
  }

  open(state: GameState): void {
    if (this.isOpen) return;
    const { phase, runOrigin, activeWeeklyMode } = state;
    const isBattle = phase === 'playing';
    const isRun = isBattle || phase === 'won' || phase === 'lost';
    const profile = state.save.get();

    const header = document.createElement('header');
    header.className = 'ops-header';
    const title = text('h2', t('ops.title'));
    title.id = 'ops-title';
    title.tabIndex = -1;
    header.append(title, this.button('common.close', () => this.dialog.close()));

    const content = document.createElement('div');
    content.className = 'ops-content';
    content.tabIndex = 0;
    content.setAttribute('role', 'region');
    content.setAttribute('aria-label', t('ops.content'));

    if (isBattle) this.drawWaves(content, state);
    if (isRun && activeWeeklyMode) {
      const rules = section(content, t('battle.rules'));
      rules.append(text('p', `${t(`weekly.${activeWeeklyMode.mode}`)} · ${weeklyRuleSummary(activeWeeklyMode)}`));
    }
    const activities = document.createElement('div');
    activities.className = 'ops-activities';
    content.append(activities);
    const secondary = document.createElement('div');
    if (isRun && (runOrigin.kind === 'custom' || runOrigin.kind === 'legacy')) {
      activities.append(text('p', t('ops.practice')));
    } else {
      this.drawDaily(activities, state, isRun);
      this.drawWeekly(secondary, state, isRun);
    }

    const credits = section(secondary, t('ops.milestones'));
    const milestone = [5, 10, 25, 50, 100].find(value => value > profile.missionCredits);
    credits.append(text('strong', t('ops.credits').replace('{count}', String(profile.missionCredits))),
      text('p', milestone ? t('ops.nextMilestone').replace('{target}', String(milestone)) : t('ops.allMilestones')));
    activities.append(secondary);
    this.drawAchievements(content, state);

    const footer = document.createElement('footer');
    footer.className = 'ops-footer';
    footer.append(this.button('tutorial.replay', () => { this.replayTutorial(); this.dialog.close(); }));
    this.dialog.replaceChildren(header, content, footer);
    this.dialog.showModal();
    title.focus({ preventScroll: true });
  }

  private drawWaves(content: HTMLElement, state: GameState): void {
    const current = state.waves.current;
    if (current) {
      const active = text('p', t('ops.waveRemaining').replace('{wave}', String(current))
        .replace('{spawning}', String(state.waves.remainingToSpawn)).replace('{alive}', String(state.enemies.length)));
      active.className = 'ops-active-wave';
      content.append(active);
    }
    const block = section(content, t('ops.nextWave'));
    const upcoming = state.waves.previewNext();
    if (!upcoming) {
      block.append(text('p', t('ops.noWave')));
      return;
    }
    const list = document.createElement('ul');
    list.className = 'ops-enemies';
    block.append(list);
    const counters = new Map<string, number>();
    for (const { id, count } of upcoming.enemies) {
      const enemy = getEnemyDef(id);
      row(list, enemyName(id, enemy.name), `×${count}`);
      for (const tower of enemy.recommendedTowerIds) counters.set(tower, (counters.get(tower) ?? 0) + count);
    }
    const encounter = classifyBossEncounter(upcoming.enemies);
    if (encounter.id !== 'none') block.append(text('strong', encounter.label), text('p', encounter.advice));
    const names = [...counters].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => towerName(id, getTowerDef(id).name));
    if (names.length) block.append(text('p', `${t('hud.recommended')} · ${names.join(' · ')}`));
  }

  private drawDaily(parent: HTMLElement, state: GameState, isRun: boolean): void {
    const day = isRun ? state.objectiveDate : dailyDateStr();
    const block = section(parent, t('ops.daily'), day);
    const profile = state.save.get();
    const targets = evaluateMissions(dailyMissions(day), { wave: isRun ? state.waves.current : 0,
      score: isRun ? state.score : 0,
      stats: isRun ? state.stats.get() : { kills: 0, towersPlaced: 0, upgrades: 0, spellsCast: 0 } });
    const list = document.createElement('ul');
    list.className = 'ops-objectives';
    block.append(list);
    for (const { mission, value } of targets) {
      const claimed = profile.dailyMissionClaims[mission.id];
      const count = claimed ? mission.target : Math.min(value, mission.target);
      const label = t(`mission.${mission.kind}.title`);
      const goal = getLocale() === 'zh' ? t(`mission.${mission.kind}.goal`) : mission.description;
      const item = row(list, label, claimed ? t('ops.claimed') : t('ops.reward').replace('{count}', String(mission.reward)), goal);
      const progress = document.createElement('progress');
      progress.max = mission.target;
      progress.value = count;
      progress.setAttribute('aria-label', label);
      const track = document.createElement('div');
      track.className = 'ops-objective-progress';
      track.append(progress, text('span', `${count}/${mission.target}`));
      item.append(track);
    }
  }

  private drawWeekly(parent: HTMLElement, state: GameState, isRun: boolean): void {
    const weeklyRun = isRun && state.runOrigin.kind === 'weekly';
    const week = weeklyMode(weeklyRun ? state.runOrigin.period : undefined);
    const profile = state.save.get();
    const block = section(parent, t('menu.weekly'), week.weekKey);
    const claimed = !!(profile.weeklyRewardClaims[week.id] || profile.weeklyBestWaves[week.id]);
    const goal = t('ops.weeklyGoal').replace('{wave}', String(WEEKLY_REWARD_WAVE));
    const reward = claimed ? t('ops.claimed') : t('ops.reward').replace('{count}', String(week.reward));
    block.append(text('strong', t(`weekly.${week.mode}`)), text('p', weeklyRuleSummary(week)), text('p', goal));
    const cleared = weeklyRun ? `${Math.min(state.clearedWaves, WEEKLY_REWARD_WAVE)}/${WEEKLY_REWARD_WAVE} · ` : '';
    const earn = text('span', `${cleared}${reward}`);
    earn.className = 'ops-reward';
    block.append(earn);
  }

  private drawAchievements(content: HTMLElement, state: GameState): void {
    const achievements = state.achievements.all;
    const unlocked = achievements.filter(achievement => state.achievements.isUnlocked(achievement.id)).length;
    const block = section(content, t('ops.achievements'), `${unlocked}/${achievements.length}`);
    const more = document.createElement('details');
    more.append(text('summary', t('ops.achievementsDetails')));
    const list = document.createElement('ul');
    list.className = 'ops-achievements';
    more.append(list);
    block.append(more);
    for (const achievement of achievements) {
      const done = state.achievements.isUnlocked(achievement.id);
      const value = Math.min(state.achievements.statsView[achievement.metric], achievement.target);
      row(list, achievementName(achievement.id, achievement.name), done ? t('ops.unlocked') : `${value}/${achievement.target}`,
        achievementDescription(achievement.id, achievement.description));
    }
  }
}
