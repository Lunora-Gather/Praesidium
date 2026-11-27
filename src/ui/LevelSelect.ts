import type { LevelManager } from '../game/grid/LevelManager';
import type { SaveSystem } from '../utils/SaveSystem';
import { DIFFICULTIES, DIFFICULTY_LIST, type Difficulty } from '../config/Difficulty';
import { getLocale, t } from '../utils/i18n';
import { getLevelTheme } from './LevelThemes';
import { drawRouteMap } from './RoutePreview';
import './level-select.css';

export class LevelSelect {
  private readonly root = document.querySelector<HTMLElement>('#campaign')!;
  private readonly title = this.find<HTMLHeadingElement>('title');
  private readonly progress = this.find<HTMLElement>('progress');
  private readonly meter = this.find<HTMLProgressElement>('meter');
  private readonly briefing = this.find<HTMLElement>('briefing');
  private readonly mission = this.find<HTMLElement>('mission');
  private readonly theme = this.find<HTMLElement>('theme');
  private readonly deploy = this.find<HTMLButtonElement>('deploy');
  private readonly deployLabel = this.find<HTMLElement>('deploy-label');
  private readonly deployDetail = this.find<HTMLElement>('deploy-detail');
  private readonly summary = this.find<HTMLElement>('summary');
  private readonly difficultyNote = this.find<HTMLElement>('difficulty-note');
  private readonly route = this.find<HTMLOListElement>('route');
  private readonly map = this.find<HTMLCanvasElement>('map');
  private readonly difficultyButtons: HTMLButtonElement[] = [];
  private readonly sectors: { button: HTMLButtonElement; name: HTMLElement; status: HTMLElement }[] = [];
  private selected = 0;
  private difficulty: Difficulty = 'normal';
  private profile: ReturnType<SaveSystem['get']> | null = null;
  private drawnLevel = -1;
  private busy = false;

  constructor(
    private readonly levels: LevelManager,
    private readonly save: SaveSystem,
    back: () => void,
    start: (index: number, difficulty: Difficulty) => void,
  ) {
    this.find<HTMLButtonElement>('back').onclick = () => { if (!this.busy) back(); };
    this.deploy.onclick = () => {
      if (!this.busy && this.save.isLevelUnlocked(this.selected + 1)) start(this.selected, this.difficulty);
    };
    this.root.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !this.busy) {
        event.preventDefault();
        back();
      }
    });

    const difficulties = this.find<HTMLElement>('difficulties');
    for (const { id } of DIFFICULTY_LIST) {
      const button = document.createElement('button');
      button.type = 'button';
      button.onclick = () => {
        this.difficulty = id;
        this.refresh();
      };
      this.difficultyButtons.push(button);
      difficulties.append(button);
    }

    for (let index = 0; index < this.levels.total; index++) {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      const number = document.createElement('span');
      number.className = 'campaign-index';
      number.textContent = this.number(index);
      const detail = document.createElement('span');
      detail.className = 'campaign-sector-detail';
      const name = document.createElement('span');
      name.className = 'campaign-sector-name';
      name.textContent = this.levels.levelAt(index).name;
      const status = document.createElement('span');
      status.className = 'campaign-sector-status';
      detail.append(name, status);
      button.append(number, detail);
      button.onclick = event => {
        this.selected = index;
        this.refresh();
        if (event.detail && matchMedia('(max-width: 720px), (max-height: 500px)').matches) {
          this.briefing.scrollIntoView({ block: 'start' });
        }
      };
      item.append(button);
      this.route.append(item);
      this.sectors.push({ button, name, status });
    }
  }

  show(busy: boolean): void {
    if (busy !== this.busy) {
      this.busy = busy;
      if (busy) this.deploy.setAttribute('aria-disabled', 'true');
      else this.deploy.removeAttribute('aria-disabled');
    }
    if (!this.root.hidden) {
      if (this.profile !== this.save.get()) this.refresh();
      return;
    }
    this.selected = this.recommendedIndex();
    this.root.hidden = false;
    this.root.scrollTop = 0;
    this.refresh();
    this.title.focus({ preventScroll: true });
  }

  hide(): void { this.root.hidden = true; }

  private find<T extends HTMLElement = HTMLElement>(part: string): T {
    return this.root.querySelector<T>(`[data-campaign="${part}"]`)!;
  }

  private number(index: number): string { return String(index + 1).padStart(2, '0'); }

  private missionName(index: number): string {
    const level = this.levels.levelAt(index);
    if (getLocale() === 'en') return level.name;
    return t(`campaign.mission.${getLevelTheme(index + 1).id}`);
  }

  private recommendedIndex(): number {
    const unlocked = this.save.getUnlockedLevelCount();
    for (let stage = 1; stage <= unlocked; stage++) {
      if (this.save.getStars(stage) === 0) return stage - 1;
    }
    return Math.min(unlocked, this.levels.total) - 1;
  }

  private refresh(): void {
    this.profile = this.save.get();
    const levelNumber = this.selected + 1;
    const level = this.levels.levelAt(this.selected);
    const name = this.missionName(this.selected);
    const theme = getLevelTheme(levelNumber);
    const stars = this.save.getStars(levelNumber);
    const unlocked = this.save.isLevelUnlocked(levelNumber);
    const score = this.save.getRecord({ kind: 'campaign', level: levelNumber, difficulty: this.difficulty })?.best.score ?? 0;
    const format = new Intl.NumberFormat(getLocale() === 'zh' ? 'zh-CN' : 'en-US');
    for (const label of this.root.querySelectorAll<HTMLElement>('[data-campaign-text]')) {
      label.textContent = t(label.dataset.campaignText!);
    }
    const totalStars = this.save.getTotalStars();
    const maxStars = this.save.getMaxStars();
    this.progress.textContent = t('campaign.stars').replace('{earned}', String(totalStars)).replace('{total}', String(maxStars));
    this.meter.max = maxStars;
    this.meter.value = totalStars;
    this.meter.setAttribute('aria-label', this.progress.textContent);
    this.find('count').textContent = t('campaign.unlocked')
      .replace('{unlocked}', String(this.save.getUnlockedLevelCount())).replace('{total}', String(this.levels.total));

    const stageLabel = t('campaign.stage').replace('{number}', this.number(this.selected));
    this.find('stage').textContent = stageLabel;
    this.mission.textContent = name;
    this.theme.textContent = theme.name === level.name ? ''
      : getLocale() === 'zh' ? t(`campaign.zone.${theme.id}`) : theme.name;
    const best = stars ? [
      t('campaign.stars').replace('{earned}', String(stars)).replace('{total}', '3'),
      ...(score ? [`${t('campaign.best')} ${format.format(score)}`] : []),
    ].join(' · ') : '';
    const detail = unlocked ? best
      : t('campaign.prerequisite').replace('{name}', this.missionName(this.selected - 1));
    const action = t(unlocked ? stars ? 'campaign.replay' : 'campaign.deploy' : 'level.locked');
    this.deploy.disabled = !unlocked;
    this.deployLabel.textContent = action;
    this.deployDetail.textContent = detail;
    this.deploy.setAttribute('aria-label', unlocked ? `${action} — ${name}` : action);
    this.summary.textContent = [stageLabel, name, detail].filter(Boolean).join(' · ');
    this.root.style.setProperty('--campaign-map-accent', theme.pathCore);
    this.root.style.setProperty('--campaign-map-tone', theme.background);
    if (this.drawnLevel !== this.selected) {
      drawRouteMap(this.map, level, theme);
      this.drawnLevel = this.selected;
    }

    for (const [i, { id }] of DIFFICULTY_LIST.entries()) {
      this.difficultyButtons[i].textContent = t(`diff.${id}`);
      this.difficultyButtons[i].setAttribute('aria-pressed', String(this.difficulty === id));
    }
    this.difficultyNote.textContent = this.difficulty === 'normal'
      ? t('campaign.normalNote')
      : t('campaign.difficultyNote')
        .replace('{hp}', String(Math.round(DIFFICULTIES[this.difficulty].hpMul * 100)))
        .replace('{count}', String(Math.round(DIFFICULTIES[this.difficulty].countMul * 100)));
    const recommended = this.recommendedIndex();
    for (const [index, { button, name, status }] of this.sectors.entries()) {
      const earned = this.save.getStars(index + 1);
      const accessible = this.save.isLevelUnlocked(index + 1);
      name.textContent = this.missionName(index);
      status.textContent = !accessible ? t('level.locked') : earned ? `★ ${earned}/3`
        : t(index === recommended ? 'campaign.next' : 'campaign.ready');
      button.dataset.state = accessible ? earned ? 'complete' : 'ready' : 'locked';
      button.setAttribute('aria-pressed', String(index === this.selected));
      button.setAttribute('aria-label', [this.number(index), name.textContent, status.textContent].join(' · '));
    }
  }
}
