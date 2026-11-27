import type { AnalyticsData } from '../utils/Analytics';
import { t } from '../utils/i18n';
import type { SaveSystem } from '../utils/SaveSystem';
import { getLeaderboard, leaderboardRecord, type LeaderboardType } from '../utils/Leaderboard';
import type { Difficulty } from '../config/Difficulty';
import { dailyDateStr } from '../utils/DailyChallenge';
import { weekKey } from '../utils/WeeklyMode';
import { towerName } from '../utils/displayText';
import { buildProductHealth } from '../utils/ProductHealth';
import { LEVELS } from '../game/grid/LevelManager';
import { TOWER_LIST } from '../game/towers/TowerRegistry';
import './stats.css';

const TABS = { overview: 'stats.statistics', rankings: 'stats.rankings', health: 'health.title' } as const;
const BOARD_TYPES: readonly LeaderboardType[] = ['level', 'endless', 'daily', 'weekly', 'practice', 'history'];
const DIFFICULTIES = ['normal', 'hard', 'brutal'] as const;
const MODES = ['campaign', 'endless', 'daily', 'weekly', 'custom'] as const;
type Tab = keyof typeof TABS;
type Metric = readonly [name: string, value: string];

function text<K extends keyof HTMLElementTagNameMap>(tag: K, value: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.textContent = value;
  return element;
}

function action(label: string, run: () => void): HTMLButtonElement {
  const button = text('button', label);
  button.type = 'button';
  button.onclick = run;
  return button;
}

function metrics(items: readonly Metric[]): HTMLDListElement {
  const list = document.createElement('dl');
  for (const [label, value] of items) {
    const row = document.createElement('div');
    row.append(text('dt', label), text('dd', value));
    list.append(row);
  }
  return list;
}

function elapsed(seconds: number): string {
  return seconds < 60 ? `${Math.round(seconds)}s`
    : seconds < 3600 ? `${Math.round(seconds / 60)}m` : `${(seconds / 3600).toFixed(1)}h`;
}

export class StatsScreen {
  private readonly dialog = document.createElement('dialog');
  private readonly filter = document.createElement('dialog');
  private readonly board = document.createElement('select');
  private readonly level = document.createElement('select');
  private readonly difficulty = document.createElement('select');
  private readonly tabs: { key: Tab; button: HTMLButtonElement }[] = [];
  private readonly title = document.createElement('h2');
  private readonly content = document.createElement('div');
  private readonly back: HTMLButtonElement;
  private currentTab: Tab = 'overview';
  private selectedBoard: LeaderboardType = 'daily';
  private boardDifficulty: Difficulty = 'normal';
  private selectedLevelIdx = 0;
  private data!: Readonly<AnalyticsData>;
  private save!: SaveSystem;

  constructor(private readonly exportReport: () => void) {
    this.dialog.id = 'stats-screen';
    this.dialog.setAttribute('aria-labelledby', 'stats-title');
    this.title.id = 'stats-title';
    this.title.tabIndex = -1;
    const header = document.createElement('header');
    header.className = 'stats-header';
    const nav = document.createElement('div');
    nav.className = 'stats-wrap stats-nav';
    this.back = action('', () => this.close());
    this.back.className = 'stats-back';
    nav.append(this.back, this.title);
    const tabs = document.createElement('div');
    tabs.className = 'stats-wrap stats-tabs';
    for (const key of Object.keys(TABS) as Tab[]) {
      const button = action('', () => {
        this.currentTab = key;
        this.render();
      });
      this.tabs.push({ key, button });
      tabs.append(button);
    }
    header.append(nav, tabs);
    this.content.className = 'stats-wrap stats-content';
    const scroll = document.createElement('div');
    scroll.className = 'stats-scroll';
    scroll.append(this.content);
    this.dialog.append(header, scroll);
    document.body.append(this.dialog);
    this.filter.className = 'app-dialog stats-filter';
    this.filter.setAttribute('aria-labelledby', 'stats-filter-title');
    this.filter.addEventListener('close', () => {
      if (!this.isOpen || this.currentTab !== 'rankings') return;
      const trigger = this.content.querySelector<HTMLButtonElement>('.stats-filter-trigger');
      trigger?.focus({ preventScroll: true });
    });
    this.dialog.append(this.filter);
  }

  get isOpen(): boolean { return this.dialog.open; }

  open(data: Readonly<AnalyticsData>, save: SaveSystem): void {
    if (this.isOpen) return;
    this.data = data;
    this.save = save;
    this.title.textContent = t('stats.title');
    this.back.textContent = t('common.back');
    this.render();
    this.dialog.showModal();
    this.title.focus({ preventScroll: true });
  }

  close(): void {
    if (this.filter.open) this.filter.close();
    if (this.isOpen) this.dialog.close();
  }

  private render(): void {
    for (const { key, button } of this.tabs) {
      button.textContent = t(TABS[key]);
      button.setAttribute('aria-pressed', String(this.currentTab === key));
    }
    this.content.replaceChildren();
    if (this.currentTab === 'overview') this.drawOverview();
    else if (this.currentTab === 'rankings') this.drawRankings();
    else this.drawHealth();
    this.content.parentElement!.scrollTop = 0;
  }

  private section(parent: HTMLElement, label: string, className?: string): HTMLElement {
    const section = document.createElement('section');
    if (className) section.className = className;
    section.append(text('h3', t(label)));
    parent.append(section);
    return section;
  }

  private drawOverview(): void {
    const data = this.data;
    const towers = TOWER_LIST.map(def => ({ name: towerName(def.id, def.name), count: data.towerUsage[def.id] ?? 0 }))
      .filter(item => item.count > 0).sort((a, b) => b.count - a.count);
    const levels: Metric[] = LEVELS.flatMap((_, index) => {
      const won = data.levelsCompleted[index] ?? 0;
      const attempted = data.levelsAttempted[index] ?? 0;
      if (!won && !attempted) return [];
      const result = attempted && won <= attempted ? `${won}/${attempted} · ${Math.round(100 * won / attempted)}%` : `${won} ${t('stats.wins')}`;
      return [[`${t('stats.level')} ${index + 1}`, result] as const];
    });
    const modes: Metric[] = MODES.flatMap(mode => {
      const sample = data.byMode[mode];
      if (!sample || (!sample.started && !sample.finished && !sample.activeSec)) return [];
      const runs = sample.started >= sample.finished && sample.started ? `${sample.finished}/${sample.started}`
        : t('stats.finishedRuns').replace('{count}', String(sample.finished));
      return [[t(`stats.mode.${mode}`), `${runs} · ${elapsed(sample.activeSec)}`] as const];
    });
    const difficulty: Metric[] = DIFFICULTIES.flatMap(id => {
      const sample = data.byDifficulty[id];
      return sample?.finished ? [[t(`diff.${id}`), `${sample.won}/${sample.finished} ${t('stats.wins')}`] as const] : [];
    });
    if (!data.sessions && !data.totalPlaySec && !data.simulatedSec && !data.endlessRuns && !data.endlessBestWave
      && !towers.length && !levels.length && !modes.length && !difficulty.length) {
      const empty = this.section(this.content, 'stats.emptyTitle', 'stats-empty');
      empty.append(text('p', t('stats.emptyBody')));
      return;
    }

    const session = this.section(this.content, 'stats.sessionData', 'stats-session');
    const samples: Metric[] = [
      [t('stats.sessions'), String(data.sessions)],
      [t('stats.activeTime'), elapsed(data.totalPlaySec)],
      [t('stats.simTime'), elapsed(data.simulatedSec)],
      [t('stats.avgSession'), elapsed(data.avgSessionSec)],
      [t('stats.longestSession'), elapsed(data.longestSessionSec)],
      [t('stats.returnDays'), String(data.returnDays)],
      [t('stats.endlessBest'), data.endlessBestWave ? String(data.endlessBestWave) : '—'],
      [t('stats.endlessRuns'), String(data.endlessRuns)],
    ];
    session.append(metrics(samples));
    const columns = document.createElement('div');
    columns.className = 'stats-columns';
    this.content.append(columns);
    const groups = [
      ['stats.towerUsage', towers.map(({ name, count }): Metric => [name, count.toLocaleString()])],
      ['stats.levelRates', levels],
      ['stats.modes', modes],
      ['campaign.difficulty', difficulty],
    ] as const;
    for (const [title, items] of groups) if (items.length) this.section(columns, title).append(metrics(items));
  }

  private drawRankings(): void {
    const now = new Date();
    const type = this.selectedBoard;
    const title = type === 'level' ? t('stats.leaderboard.level').replace('{level}', String(this.selectedLevelIdx + 1))
      : t(type === 'endless' || type === 'daily' ? `stats.leaderboard.${type}` : `stats.${type}`);
    const header = document.createElement('div');
    header.className = 'stats-section-head';
    const filter = action(t('stats.selectBoard'), () => this.openFilter());
    filter.className = 'stats-filter-trigger';
    header.append(text('h3', title), filter);
    this.content.append(header);
    const entries = getLeaderboard(this.save, type, this.selectedLevelIdx, this.boardDifficulty, now);
    const record = leaderboardRecord(this.save, type, this.selectedLevelIdx, this.boardDifficulty, now);
    const localOnly = type === 'practice' || type === 'history';
    const meta = [t(localOnly ? 'stats.personalOnly' : 'stats.simulated')];
    if (type === 'level') meta.push(t(`diff.${this.boardDifficulty}`));
    if (type === 'daily') meta.push(dailyDateStr(now));
    if (type === 'weekly') meta.push(weekKey(now));
    if (record && type !== 'level') meta.push(t('stats.furthest').replace('{wave}', String(record.furthestWave)));
    this.content.append(text('p', meta.join(' · ')));
    if (!entries.length) {
      this.content.append(text('p', t('stats.noRecords')));
      return;
    }
    const list = document.createElement('ol');
    list.className = 'stats-ranking';
    for (const [index, entry] of entries.entries()) {
      const row = document.createElement('li');
      const name = entry.name === 'YOU' ? t('stats.you') : entry.name.startsWith('historical.') ? t(entry.name) : entry.name;
      if (entry.isPlayer) row.dataset.player = '';
      const position = text('span', String(index + 1));
      position.className = 'stats-rank-position';
      position.setAttribute('aria-hidden', 'true');
      const info = document.createElement('div');
      info.append(text('strong', name));
      if (entry.wave !== undefined) info.append(text('small', `${t('stats.wave')} ${entry.wave}`));
      row.append(position, info, text('span', `${entry.score.toLocaleString()} ${t('stats.points')}`));
      list.append(row);
    }
    this.content.append(list);
  }

  private openFilter(): void {
    const title = text('h2', t('stats.selectBoard'));
    title.id = 'stats-filter-title';
    this.board.replaceChildren(...BOARD_TYPES.map(type => new Option(t(type === 'level' ? 'campaign.title' : `stats.${type}`), type)));
    this.level.replaceChildren(...LEVELS.map((_, index) => new Option(String(index + 1), String(index))));
    this.difficulty.replaceChildren(...DIFFICULTIES.map(id => new Option(t(`diff.${id}`), id)));
    this.board.value = this.selectedBoard;
    this.level.selectedIndex = this.selectedLevelIdx;
    this.difficulty.value = this.boardDifficulty;
    const fields = [[this.board, 'stats.boardType'], [this.level, 'level.level'], [this.difficulty, 'campaign.difficulty']] as const;
    const labels = fields.map(([select, key], index) => {
      const label = document.createElement('label');
      const name = text('span', t(key));
      name.id = `stats-filter-label-${index}`;
      select.setAttribute('aria-labelledby', name.id);
      label.append(name, select);
      return label;
    });
    const updateVisibility = (): void => {
      for (const label of labels.slice(1)) label.hidden = this.board.value !== 'level';
    };
    this.board.onchange = updateVisibility;
    updateVisibility();
    const buttons = document.createElement('div');
    buttons.className = 'actions';
    buttons.append(action(t('common.cancel'), () => this.filter.close()), action(t('stats.viewBoard'), () => {
      this.selectedBoard = this.board.value as LeaderboardType;
      this.selectedLevelIdx = this.level.selectedIndex;
      this.boardDifficulty = this.difficulty.value as Difficulty;
      this.filter.close();
      this.render();
    }));
    this.filter.replaceChildren(title, ...labels, buttons);
    this.filter.showModal();
    this.board.focus();
  }

  private drawHealth(): void {
    const health = buildProductHealth(this.data);
    const header = document.createElement('div');
    header.className = 'stats-section-head';
    const status = text('p', '');
    status.setAttribute('role', 'status');
    const exportButton = action(t('stats.exportReport'), () => {
      try { this.exportReport(); status.textContent = t('health.exported'); }
      catch { status.textContent = t('health.exportFailed'); }
    });
    exportButton.className = 'stats-filter-trigger';
    header.append(text('h3', t('health.title')), exportButton);
    this.content.append(header, status);
    const scores = document.createElement('div');
    scores.className = 'stats-columns stats-health-scores';
    this.content.append(scores);
    for (const [label, value, detail] of [['health.retention', health.retentionScore, 'health.retentionDetail'],
      ['health.balance', health.balanceScore, 'health.balanceDetail']] as const) {
      const section = this.section(scores, label);
      section.append(text('strong', value === null ? t('health.insufficient') : `${value}/100`), text('p', t(detail)));
    }

    const risks = this.section(this.content, 'health.risks', 'stats-health-risks');
    if (!health.risks.length) {
      risks.append(text('p', t(health.retentionScore === null || health.balanceScore === null ? 'health.sampleHint' : 'health.noRisks')));
      return;
    }
    for (const risk of health.risks) {
      const row = document.createElement('article');
      const severity = text('span', t(`health.level.${risk.level}`));
      severity.dataset.severity = risk.level;
      const heading = text('h4', risk.title);
      heading.append(severity);
      row.append(heading, text('p', risk.detail));
      risks.append(row);
    }
  }
}
