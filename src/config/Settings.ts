// Game settings — persistent via localStorage. Decoupled from balance (which
// is gameplay tuning) vs settings (player preferences).

import { load, save } from '../utils/storage';
import type { Locale } from '../utils/i18n';

export interface Settings {
  muted: boolean;
  showFps: boolean;
  showRange: boolean; // show all tower ranges on hover
  pauseOnBlur: boolean;
  reducedMotion: boolean;
  locale: Locale;
  graphics: GraphicsQuality;
  cameraShake: number;
}

export type GraphicsQuality = 'auto' | 'clear' | 'low';
export const MAX_CAMERA_SHAKE = 150;
const LEGACY_SHAKE = { off: 0, light: 45, standard: 100, strong: 145 } as const;

const KEY = 'settings';

const DEFAULTS: Settings = {
  muted: false,
  showFps: false,
  showRange: true,
  pauseOnBlur: true,
  reducedMotion: false,
  locale: 'en',
  graphics: 'auto',
  cameraShake: 100,
};

export class SettingsStore {
  private current: Settings;

  constructor() {
    const stored = load<Partial<Omit<Settings, 'cameraShake'> & { cameraShake: unknown }>>(KEY, {});
    this.current = { ...DEFAULTS, reducedMotion: typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches };
    for (const key of ['muted', 'showFps', 'showRange', 'pauseOnBlur', 'reducedMotion'] as const) {
      if (typeof stored[key] === 'boolean') this.current[key] = stored[key];
    }
    if (stored.locale === 'en' || stored.locale === 'zh') this.current.locale = stored.locale;
    else if (typeof navigator !== 'undefined' && /^zh(?:-|$)/i.test(navigator.language)) this.current.locale = 'zh';
    if (stored.graphics === 'auto' || stored.graphics === 'clear' || stored.graphics === 'low') this.current.graphics = stored.graphics;
    const shake = stored.cameraShake;
    if (typeof shake === 'number' && Number.isFinite(shake)) {
      this.current.cameraShake = Math.max(0, Math.min(MAX_CAMERA_SHAKE, Math.round(shake)));
    } else if (shake === 'off' || shake === 'light' || shake === 'standard' || shake === 'strong') {
      this.current.cameraShake = LEGACY_SHAKE[shake];
    } else if (typeof matchMedia === 'function' && matchMedia('(any-pointer: coarse)').matches) this.current.cameraShake = 0;
  }

  get(): Readonly<Settings> {
    return this.current;
  }

  update(patch: Partial<Settings>): void {
    this.current = { ...this.current, ...patch };
    save(KEY, this.current);
  }

  toggle(key: Exclude<keyof Settings, 'locale' | 'graphics' | 'cameraShake'>): void {
    this.update({ [key]: !this.current[key] });
  }
}
