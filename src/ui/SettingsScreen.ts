import { MAX_CAMERA_SHAKE, type GraphicsQuality, type SettingsStore } from '../config/Settings';
import { CameraShake, HEAVY_IMPACT, TOUCH_SHAKE_SCALE } from '../engine/CameraShake';
import { LEVELS } from '../game/grid/LevelManager';
import { setLocale, t, type Locale } from '../utils/i18n';
import { getLevelTheme } from './LevelThemes';
import { drawRouteMap } from './RoutePreview';
import './settings.css';

const TOGGLES = [
  ['reducedMotion', 'settings.motion'], ['muted', 'settings.sound'], ['pauseOnBlur', 'settings.blur'],
  ['showRange', 'settings.range'], ['showFps', 'settings.fps'],
] as const;

const GRAPHICS: readonly GraphicsQuality[] = ['auto', 'clear', 'low'];

export class SettingsScreen {
  private readonly dialog = document.createElement('dialog');
  private readonly recoil = new CameraShake();
  private readonly touch = matchMedia('(any-pointer: coarse)');
  private frame = 0;

  constructor(store: SettingsStore, changed: () => void, manageProgress: (back: () => void) => void) {
    this.dialog.id = 'settings-screen';
    this.dialog.setAttribute('aria-labelledby', 'settings-title');
    this.dialog.innerHTML = `
      <header class="settings-header">
        <h2 id="settings-title" data-setting-text="settings.title" tabindex="-1"></h2>
        <button type="button" data-part="back" class="settings-back" data-setting-text="common.back"></button>
      </header>
      <div class="settings-scroll">
        <section class="settings-motion" aria-labelledby="settings-shake-title">
          <div class="settings-motion-controls">
            <div class="settings-motion-heading">
              <h3 id="settings-shake-title" data-setting-text="settings.shake"></h3>
              <output class="settings-percent" for="settings-shake-level" data-part="shake-value" aria-hidden="true"></output>
            </div>
            <input type="range" id="settings-shake-level" data-part="shake-level" min="0" max="${MAX_CAMERA_SHAKE}" step="1"
                   aria-labelledby="settings-shake-title" aria-describedby="settings-shake-note">
            <div class="settings-range-ends" aria-hidden="true">
              <span data-setting-text="settings.shakeOff"></span>
              <span>${MAX_CAMERA_SHAKE}%</span>
            </div>
            <p id="settings-shake-note" class="settings-motion-note"></p>
            <button type="button" class="settings-row settings-reduce" data-toggle="reducedMotion"></button>
          </div>
          <div class="settings-preview">
            <canvas data-part="preview" aria-hidden="true"></canvas>
            <button type="button" data-part="preview-button" class="settings-test" data-setting-text="settings.shakePreview"></button>
          </div>
        </section>
        <div class="settings-preferences">
          <section>
            <h3 data-setting-text="settings.play"></h3>
            <button type="button" class="settings-row" data-toggle="muted"></button>
            <button type="button" class="settings-row" data-toggle="pauseOnBlur"></button>
            <label class="settings-row">
              <span id="settings-language-label" data-setting-text="settings.language"></span>
              <span class="settings-select">
                <select data-part="language" aria-labelledby="settings-language-label">
                  <option value="en" lang="en">English</option>
                  <option value="zh" lang="zh-Hans">简体中文</option>
                </select>
              </span>
            </label>
          </section>
          <section>
            <h3 data-setting-text="settings.display"></h3>
            <label class="settings-row">
              <span id="settings-graphics-label" data-setting-text="settings.graphics"></span>
              <span class="settings-select"><select data-part="graphics" aria-labelledby="settings-graphics-label"></select></span>
            </label>
            <button type="button" class="settings-row" data-toggle="showRange"></button>
            <button type="button" class="settings-row" data-toggle="showFps"></button>
          </section>
        </div>
        <button type="button" data-part="progress" class="settings-progress" data-setting-text="progress.manage"></button>
      </div>`;
    document.body.append(this.dialog);

    const get = <Element extends HTMLElement>(part: string): Element => this.dialog.querySelector<Element>(`[data-part="${part}"]`)!;
    const preview = get<HTMLCanvasElement>('preview');
    const previewButton = get<HTMLButtonElement>('preview-button');
    const shakeLevel = get<HTMLInputElement>('shake-level');
    const shakeValue = get<HTMLOutputElement>('shake-value');
    const scroll = this.dialog.querySelector<HTMLElement>('.settings-scroll')!;
    const progress = get<HTMLButtonElement>('progress');
    const note = this.dialog.querySelector<HTMLParagraphElement>('#settings-shake-note')!;
    const graphics = get<HTMLSelectElement>('graphics');
    const language = get<HTMLSelectElement>('language');
    const updateShakeControls = (): void => {
      const value = shakeLevel.valueAsNumber;
      const percent = `${value}%`;
      shakeValue.value = percent;
      shakeLevel.setAttribute('aria-valuetext', value ? percent : t('settings.shakeOff'));
      shakeLevel.style.setProperty('--shake-fill', `${value / MAX_CAMERA_SHAKE * 100}%`);
      const reduced = store.get().reducedMotion;
      previewButton.disabled = reduced || value === 0;
      note.textContent = t(reduced ? 'settings.shakeReduced' : 'settings.shakeDetail');
    };
    shakeLevel.oninput = () => {
      this.stopPreview(preview);
      updateShakeControls();
    };
    shakeLevel.onchange = () => {
      store.update({ cameraShake: shakeLevel.valueAsNumber });
      changed();
    };
    const toggles = TOGGLES.map(([key, label]) => {
      const button = this.dialog.querySelector<HTMLButtonElement>(`[data-toggle="${key}"]`)!;
      button.onclick = () => {
        store.toggle(key);
        refresh();
        changed();
      };
      return { key, label, button };
    });
    for (const value of GRAPHICS) graphics.add(new Option('', value));
    graphics.onchange = () => {
      store.update({ graphics: graphics.value as GraphicsQuality });
      changed();
    };
    language.onchange = () => {
      const locale = language.value as Locale;
      setLocale(locale);
      store.update({ locale });
      refresh();
      changed();
    };
    get('back').onclick = () => this.dialog.close();
    progress.onclick = () => {
      const position = scroll.scrollTop;
      this.dialog.close();
      manageProgress(() => {
        this.open();
        scroll.scrollTop = position;
        progress.focus({ preventScroll: true });
      });
    };

    previewButton.onclick = () => {
      const intensity = shakeLevel.valueAsNumber;
      if (store.get().reducedMotion || intensity === 0) return;
      this.stopPreview(preview);
      const scale = this.touch.matches ? TOUCH_SHAKE_SCALE : 1;
      this.recoil.trigger(HEAVY_IMPACT * (intensity / 100) * scale, performance.now());
      const animate = (now: number): void => {
        if (now >= this.recoil.endsAt || !this.dialog.open) {
          this.stopPreview(preview);
          return;
        }
        const { x, y } = this.recoil.sample(now);
        preview.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        this.frame = requestAnimationFrame(animate);
      };
      this.frame = requestAnimationFrame(animate);
    };

    const refresh = (): void => {
      this.stopPreview(preview);
      const config = store.get();
      for (const element of this.dialog.querySelectorAll<HTMLElement>('[data-setting-text]')) {
        element.textContent = t(element.dataset.settingText!);
      }
      for (const { key, label, button } of toggles) {
        button.textContent = t(label);
        button.setAttribute('aria-pressed', String(key === 'muted' ? !config[key] : config[key]));
      }
      shakeLevel.value = String(config.cameraShake);
      updateShakeControls();
      for (const option of graphics.options) option.textContent = t(`settings.graphics.${option.value}`);
      graphics.value = config.graphics;
      language.value = config.locale;
    };

    this.dialog.addEventListener('close', () => {
      this.stopPreview(preview);
      changed();
    });
    drawRouteMap(preview, LEVELS[0], getLevelTheme(1));
    refresh();
  }

  get isOpen(): boolean { return this.dialog.open; }

  open(): void {
    if (this.isOpen) return;
    this.dialog.showModal();
    this.dialog.querySelector<HTMLElement>('#settings-title')!.focus({ preventScroll: true });
    this.dialog.querySelector('.settings-scroll')!.scrollTop = 0;
  }

  private stopPreview(canvas: HTMLCanvasElement): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.recoil.reset();
    canvas.style.removeProperty('transform');
  }
}
