import { decodeChallenge, unsupportedChallengeVersion } from '../utils/ChallengeCode';
import { t } from '../utils/i18n';

type ParsedChallenge = NonNullable<ReturnType<typeof decodeChallenge>>;

export class ChallengeDialog {
  private readonly dialog = document.querySelector<HTMLDialogElement>('#challenge-dialog')!;
  private readonly title = document.querySelector('#challenge-title')!;
  private readonly label = document.querySelector('#challenge-label')!;
  private readonly input = document.querySelector<HTMLInputElement>('#challenge-code')!;
  private readonly status = document.querySelector('#challenge-status')!;
  private readonly close = document.querySelector<HTMLButtonElement>('#challenge-close')!;
  private readonly submit = document.querySelector<HTMLButtonElement>('#challenge-submit')!;

  constructor(onStart: (code: ParsedChallenge) => void) {
    this.close.addEventListener('click', () => this.dialog.close());
    this.input.addEventListener('input', () => {
      this.input.removeAttribute('aria-invalid');
      this.status.textContent = '';
    });
    this.dialog.querySelector('form')!.addEventListener('submit', event => {
      event.preventDefault();
      if (this.input.readOnly) {
        void this.copy();
        return;
      }

      const code = decodeChallenge(this.input.value);
      if (code === null) {
        this.input.setAttribute('aria-invalid', 'true');
        this.status.textContent = t(unsupportedChallengeVersion(this.input.value) ? 'challenge.unsupported' : 'challenge.invalid');
        this.input.focus();
        return;
      }
      this.dialog.close();
      onStart(code);
    });
  }

  get isOpen(): boolean { return this.dialog.open; }

  open(code?: string): void {
    if (this.dialog.open) return;
    const sharing = code !== undefined;
    this.title.textContent = t(sharing ? 'share.open' : 'menu.challenge');
    this.label.textContent = t(sharing ? 'share.label' : 'challenge.label');
    this.close.textContent = t('common.close');
    this.submit.textContent = t(sharing ? 'share.copyCode' : 'challenge.launch');
    this.status.textContent = '';
    this.input.removeAttribute('aria-invalid');
    this.input.value = code ?? '';
    this.input.readOnly = sharing;
    this.dialog.showModal();
    this.input.focus();
    if (sharing) this.input.select();
  }

  private async copy(): Promise<void> {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(this.input.value);
        this.status.textContent = t('share.copiedCode');
        return;
      }
    } catch {
      // Keep the complete code selectable when clipboard access is unavailable.
    }
    this.input.focus();
    this.input.select();
    this.status.textContent = t('share.manual');
  }
}
