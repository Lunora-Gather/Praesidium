import { t } from '../utils/i18n';
import './progress.css';

export interface ProgressAction {
  label: string;
  detail?: string;
  run: () => void;
  keepOpen?: boolean;
}

export class ProgressDialog {
  private readonly dialog = document.createElement('dialog');
  private readonly header = document.createElement('header');
  private readonly title = document.createElement('h2');
  private readonly body = document.createElement('div');
  private readonly backupFeedback = document.createElement('p');
  private onBack: (() => void) | undefined;
  readonly notice = document.createElement('button');

  constructor(onManage: () => void) {
    this.dialog.id = 'progress-dialog';
    this.dialog.className = 'app-dialog';
    this.dialog.setAttribute('aria-labelledby', 'progress-title');
    this.dialog.setAttribute('aria-describedby', 'progress-description');
    this.title.id = 'progress-title';
    this.title.tabIndex = -1;
    this.header.className = 'progress-header';
    this.body.className = 'progress-body';
    this.backupFeedback.className = 'progress-backup-feedback';
    this.backupFeedback.setAttribute('role', 'status');
    this.dialog.append(this.header, this.body);
    this.dialog.addEventListener('close', () => {
      const back = this.onBack;
      this.onBack = undefined;
      back?.();
    });

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

  setBackupFeedback(failed: boolean): boolean {
    if (!this.isOpen || !this.backupFeedback.isConnected) return false;
    this.backupFeedback.textContent = failed ? t('progress.exportFailed') : '';
    return true;
  }

  private setTitle(titleKey: string): void {
    this.title.textContent = t(titleKey);
    this.header.replaceChildren(this.title);
  }

  private show(): void {
    this.dialog.showModal();
    this.body.scrollTop = 0;
    this.title.focus({ preventScroll: true });
  }

  private button(label: string, action: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = t(label);
    button.addEventListener('click', action);
    return button;
  }

  confirm(title: string, description: string, accept: string, detail?: string): Promise<boolean> {
    this.setTitle(title);
    this.dialog.dataset.view = 'confirm';
    const message = document.createElement('p');
    message.id = 'progress-description';
    message.textContent = t(description);
    const buttons = document.createElement('div');
    buttons.className = 'actions';
    let accepted = false;
    const confirm = this.button(accept, () => { accepted = true; this.dialog.close(); });
    confirm.className = 'progress-primary';
    buttons.append(this.button('common.cancel', () => this.dialog.close()), confirm);
    this.body.replaceChildren(message);
    if (detail) {
      const preview = document.createElement('p');
      preview.className = 'progress-summary';
      preview.textContent = detail;
      this.body.append(preview);
    }
    this.body.append(buttons);
    this.show();
    return new Promise(resolve => this.dialog.addEventListener('close', () => resolve(accepted), { once: true }));
  }

  manage(messageKey: string, actions: readonly ProgressAction[], retry?: ProgressAction, back?: () => void): void {
    this.setTitle('progress.manage');
    this.dialog.dataset.view = 'manage';
    this.onBack = back;
    const close = this.button(back ? 'common.back' : 'common.close', () => this.dialog.close());
    close.className = 'progress-back';
    this.header.append(close);

    const status = document.createElement('section');
    status.setAttribute('aria-labelledby', 'progress-status-heading');
    status.className = 'progress-summary';
    const statusHeading = document.createElement('h3');
    statusHeading.id = 'progress-status-heading';
    statusHeading.textContent = t('progress.onDevice');
    const message = document.createElement('p');
    message.id = 'progress-description';
    message.textContent = t(messageKey);
    status.append(statusHeading, message);
    if (retry) {
      const retryButton = this.actionButton(retry);
      retryButton.className = 'progress-retry';
      status.append(retryButton);
    }
    this.body.replaceChildren(status);
    if (actions.length) {
      const backup = document.createElement('section');
      backup.setAttribute('aria-labelledby', 'progress-backups-heading');
      backup.className = 'progress-backups';
      const heading = document.createElement('h3');
      heading.id = 'progress-backups-heading';
      heading.textContent = t('progress.backups');
      backup.append(heading);
      for (const action of actions) backup.append(this.actionButton(action));
      this.backupFeedback.textContent = '';
      backup.append(this.backupFeedback);
      this.body.append(backup);
    }
    this.show();
  }

  private actionButton(action: ProgressAction): HTMLButtonElement {
    const button = this.button(action.label, () => {
      if (!action.keepOpen) {
        this.onBack = undefined;
        this.dialog.close();
      }
      action.run();
    });
    if (action.detail) {
      const title = document.createElement('span');
      title.className = 'progress-action-name';
      title.textContent = button.textContent;
      const detail = document.createElement('span');
      detail.className = 'progress-action-detail';
      detail.id = action.detail;
      detail.textContent = t(action.detail);
      button.className = 'progress-action';
      button.setAttribute('aria-label', t(action.label));
      button.setAttribute('aria-describedby', detail.id);
      button.replaceChildren(title, detail);
    }
    return button;
  }
}
