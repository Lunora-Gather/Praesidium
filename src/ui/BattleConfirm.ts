import { t } from '../utils/i18n';

export class BattleConfirm {
  private readonly dialog = document.createElement('dialog');
  private readonly title = document.createElement('h2');
  private readonly detail = document.createElement('p');
  private readonly accept = document.createElement('button');
  private readonly cancel = document.createElement('button');
  private action: (() => void) | null = null;

  constructor(onChange: () => void) {
    this.title.id = 'battle-confirm-title';
    this.detail.id = 'battle-confirm-detail';
    this.dialog.className = 'app-dialog battle-confirm';
    this.dialog.setAttribute('aria-labelledby', this.title.id);
    this.dialog.setAttribute('aria-describedby', this.detail.id);
    this.accept.type = this.cancel.type = 'button';
    this.cancel.onclick = () => this.dialog.close();
    this.accept.onclick = () => {
      const action = this.action;
      this.dialog.close();
      action?.();
    };
    this.dialog.addEventListener('close', () => {
      this.action = null;
      onChange();
    });
    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.append(this.cancel, this.accept);
    this.dialog.append(this.title, this.detail, actions);
    document.body.append(this.dialog);
  }

  get isOpen(): boolean { return this.dialog.open; }

  open(title: string, detail: string, accept: string, action: () => void): void {
    if (this.isOpen) return;
    this.title.textContent = title;
    this.detail.textContent = detail;
    this.cancel.textContent = t('common.cancel');
    this.accept.textContent = accept;
    this.action = action;
    this.dialog.showModal();
    this.cancel.focus();
  }
}
