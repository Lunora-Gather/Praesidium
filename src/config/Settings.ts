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
}

const KEY = 'settings';

const DEFAULTS: Settings = {
  muted: false,
  showFps: false,
  showRange: true,
  pauseOnBlur: true,
  reducedMotion: false,
  locale: 'en',
};

export class SettingsStore {
  private current: Settings;

  constructor() {
    const stored = load<Partial<Settings>>(KEY, {});
    this.current = { ...DEFAULTS, reducedMotion: typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches };
    for (const key of ['muted', 'showFps', 'showRange', 'pauseOnBlur', 'reducedMotion'] as const) {
      if (typeof stored[key] === 'boolean') this.current[key] = stored[key];
    }
    if (stored.locale === 'en' || stored.locale === 'zh') this.current.locale = stored.locale;
  }

  get(): Readonly<Settings> {
    return this.current;
  }

  update(patch: Partial<Settings>): void {
    this.current = { ...this.current, ...patch };
    save(KEY, this.current);
  }

  toggle(key: Exclude<keyof Settings, 'locale'>): void {
    this.update({ [key]: !this.current[key] });
  }
}
