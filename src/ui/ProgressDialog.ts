import { t } from '../utils/i18n';

export class ProgressDialog {
  private readonly dialog = document.createElement('dialog');
  private readonly title = document.createElement('h2');
  private readonly body = document.createElement('div');
  readonly notice = document.createElement('button');

  constructor(onManage: () => void) {
    this.dialog.className = 'app-dialog';
    this.dialog.setAttribute('aria-labelledby', 'progress-title');
    this.title.id = 'progress-title';
    this.body.className = 'dialog-body';
    this.dialog.append(this.title, this.body);
    this.notice.type = 'button';
    this.notice.id = 'progress-notice';
    this.notice.hidden = true;
    this.notice.addEventListener('click', onManage);
    document.body.append(this.notice, this.dialog);
  }

  get isOpen(): boolean { return this.dialog.open; }

  setNotice(key: string | null): void {
    this.notice.hidden = key === null;
    this.notice.textContent = key ? t(key) : '';
    if (key) this.notice.title = t('progress.manage');
  }

  private show(titleKey: string): HTMLElement {
    this.title.textContent = t(titleKey);
    this.body.replaceChildren();
    if (!this.dialog.open) this.dialog.showModal();
    return this.body;
  }

  private button(label: string, action: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = t(label);
    button.addEventListener('click', action);
    return button;
  }

  confirm(title: string, description: string, accept: string, detail?: string): Promise<boolean> {
    const body = this.show(title);
    const message = document.createElement('p');
    message.textContent = t(description);
    const buttons = document.createElement('div');
    buttons.className = 'actions';
    let accepted = false;
    const cancel = this.button('common.cancel', () => this.dialog.close());
    buttons.append(cancel, this.button(accept, () => { accepted = true; this.dialog.close(); }));
    body.append(message);
    if (detail) {
      const preview = document.createElement('p');
      preview.textContent = detail;
      body.append(preview);
    }
    body.append(buttons);
    cancel.focus();
    return new Promise(resolve => this.dialog.addEventListener('close', () => resolve(accepted), { once: true }));
  }

  manage(messageKey: string, actions: readonly { label: string; run: () => void }[]): void {
    const body = this.show('progress.manage');
    const message = document.createElement('p');
    message.textContent = t(messageKey);
    message.role = 'status';
    const buttons = document.createElement('div');
    buttons.className = 'actions';
    for (const action of actions) buttons.append(this.button(action.label, () => { this.dialog.close(); action.run(); }));
    const close = this.button('common.close', () => this.dialog.close());
    buttons.append(close);
    body.append(message, buttons);
    close.focus();
  }
}
