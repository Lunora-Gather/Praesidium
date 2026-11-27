import { getLocale, t } from '../utils/i18n';
import { weeklyMode } from '../utils/WeeklyMode';
import { weeklyRuleSummary } from '../utils/WeeklyRules';
import './home.css';

export type HomeAction = 'start' | 'continue' | 'endless' | 'daily' | 'weekly' | 'challenge' | 'settings' | 'stats' | 'brief';

export class HomeScreen {
  private readonly root = document.querySelector<HTMLElement>('#home')!;
  private readonly buttons = new Map<HomeAction, HTMLButtonElement>();
  private readonly labels = this.root.querySelectorAll<HTMLElement>('[data-home-text]');
  private readonly tools = this.root.querySelector<HTMLElement>('.home-tools')!;
  private readonly weeklyNote = this.root.querySelector<HTMLElement>('#home-weekly-note')!;
  private readonly dailyNote = this.root.querySelector<HTMLElement>('#home-daily-note')!;
  private lastFocused: HomeAction | null = null;
  private locale = '';
  private canContinue = false;
  private blocked = false;
  private refreshAfter = 0;

  constructor(activate: (action: HomeAction) => void) {
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-home-action]')) {
      const action = button.dataset.homeAction as HomeAction;
      this.buttons.set(action, button);
      button.addEventListener('focus', () => { this.lastFocused = action; });
      button.addEventListener('click', () => activate(action));
    }
  }

  show(canContinue: boolean, blocked: boolean): void {
    const entering = this.root.hidden;
    const locale = getLocale();
    const now = performance.now();
    if (entering || locale !== this.locale || canContinue !== this.canContinue || now >= this.refreshAfter) {
      this.locale = locale;
      this.canContinue = canContinue;
      this.refreshAfter = now + 60_000;
      this.root.dataset.checkpoint = String(canContinue);
      this.buttons.get('continue')!.hidden = !canContinue;
      for (const node of this.labels) node.textContent = t(node.dataset.homeText!);
      for (const button of this.buttons.values()) button.setAttribute('aria-label', t(button.dataset.homeLabel!));
      this.tools.setAttribute('aria-label', t('home.tools'));
      const week = weeklyMode();
      this.weeklyNote.textContent = t(`weekly.${week.mode}`);
      this.dailyNote.textContent = weeklyRuleSummary(week);
    }
    if (blocked !== this.blocked) {
      this.blocked = blocked;
      for (const button of this.buttons.values()) {
        if (blocked) button.setAttribute('aria-disabled', 'true');
        else button.removeAttribute('aria-disabled');
      }
    }
    if (entering) {
      this.root.hidden = false;
      if (this.lastFocused) this.focus(this.lastFocused);
    }
  }

  hide(): void { this.root.hidden = true; }

  focus(action: HomeAction): void {
    const button = this.buttons.get(action);
    if (button?.hidden) this.buttons.get('start')?.focus();
    else button?.focus();
  }
}
