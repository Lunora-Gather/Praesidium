import { TalentTree, TALENTS } from '../game/Talents';
import { getLocale, t } from '../utils/i18n';
import './talents.css';

interface TalentRow {
  name: HTMLElement;
  description: HTMLElement;
  rank: HTMLElement;
  steps: HTMLElement[];
  button: HTMLButtonElement;
}

export class TalentPanel {
  private readonly dialog = document.querySelector<HTMLDialogElement>('#talent-screen')!;
  private readonly scroll = this.dialog.querySelector<HTMLElement>('.talent-scroll')!;
  private readonly title = this.dialog.querySelector<HTMLElement>('#talent-title')!;
  private readonly back = this.dialog.querySelector<HTMLButtonElement>('.talent-back')!;
  private readonly list = this.dialog.querySelector<HTMLUListElement>('.talent-list')!;
  private readonly status = this.dialog.querySelector<HTMLElement>('.talent-status')!;
  private readonly rows: TalentRow[];
  private displayed = '';
  private pending = false;
  private challenge = false;

  constructor(private readonly talents: TalentTree, private readonly buy: (id: string) => Promise<boolean>, onClose: () => void) {
    this.rows = TALENTS.map(def => {
      const row = document.createElement('li');
      row.className = 'talent-row';
      row.innerHTML = `<div class="talent-description"><h2></h2><p></p></div>
        <div class="talent-rank"><span></span><div class="talent-steps" aria-hidden="true"></div></div>
        <button type="button" class="talent-buy"></button>`;
      const track = row.querySelector('.talent-steps')!;
      const steps = Array.from({ length: def.maxRank }, () => document.createElement('i'));
      track.append(...steps);
      const button = row.querySelector<HTMLButtonElement>('button')!;
      button.addEventListener('click', () => { void this.upgrade(def.id); });
      this.list.append(row);
      return { name: row.querySelector('h2')!, description: row.querySelector('p')!, rank: row.querySelector('.talent-rank span')!, steps, button };
    });
    this.back.onclick = () => this.close();
    this.dialog.addEventListener('close', onClose);
    this.dialog.addEventListener('keydown', event => {
      if (event.code === 'KeyT' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.isComposing) {
        event.preventDefault();
        this.close();
      }
    });
  }

  get isOpen(): boolean { return this.dialog.open; }

  open(challenge: boolean): void {
    if (this.isOpen) return;
    this.challenge = challenge;
    this.status.textContent = '';
    this.displayed = '';
    this.refresh();
    this.dialog.showModal();
    this.scroll.scrollTop = 0;
    this.title.focus({ preventScroll: true });
  }

  close(): void {
    if (this.isOpen) this.dialog.close();
  }

  refresh(): void {
    const points = this.talents.talentPoints;
    const ranks = this.talents.loadout();
    const key = `${getLocale()}:${points}:${ranks.join(',')}:${this.pending}`;
    if (this.displayed === key) return;
    this.displayed = key;
    this.title.textContent = t('talent.title');
    const labels = { back: t('common.backToPause'), scope: t('talent.nextRun'), challenge: t('talent.fixedChallenge'),
      'points-label': t('talent.points'), points: String(points), earn: t('talent.earn') };
    for (const [name, label] of Object.entries(labels)) {
      this.dialog.querySelector(`[data-talent="${name}"]`)!.textContent = label;
    }
    this.dialog.querySelector<HTMLElement>('[data-talent="challenge"]')!.hidden = !this.challenge;
    this.list.setAttribute('aria-busy', String(this.pending));
    for (const [index, def] of TALENTS.entries()) {
      const { name, description, rank, steps, button } = this.rows[index];
      const level = ranks[index];
      const maxed = level >= def.maxRank;
      const shortfall = Math.max(0, def.costPerRank - points);
      const label = maxed ? t('talent.maxed') : shortfall > 0
        ? t('talent.shortfall').replace('{points}', String(shortfall))
        : t('talent.upgrade').replace('{cost}', String(def.costPerRank));
      name.textContent = t(`talent.${def.id}.name`);
      description.textContent = t(`talent.${def.id}.desc`);
      rank.textContent = t('talent.rank').replace('{rank}', String(level)).replace('{max}', String(def.maxRank));
      steps.forEach((step, number) => step.classList.toggle('active', number < level));
      button.textContent = label;
      button.setAttribute('aria-label', `${name.textContent} · ${label}`);
      button.setAttribute('aria-disabled', String(maxed || shortfall > 0 || this.pending));
      button.tabIndex = maxed || shortfall > 0 ? -1 : 0;
    }
  }

  private async upgrade(id: string): Promise<void> {
    if (this.pending || !this.isOpen || !this.talents.canRankUp(id)) return;
    this.pending = true;
    this.refresh();
    const bought = await this.buy(id);
    this.pending = false;
    this.refresh();
    if (!this.isOpen) return;
    this.status.textContent = bought ? t('talent.upgraded').replace('{name}', t(`talent.${id}.name`)).replace('{rank}', String(this.talents.rank(id)))
      : t('talent.buyFailed');
  }
}
