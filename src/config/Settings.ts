// Game settings — persistent via localStorage. Decoupled from balance (which
// is gameplay tuning) vs settings (player preferences).

import { load, save } from '../utils/storage';

export interface Settings {
  muted: boolean;
  showFps: boolean;
  showRange: boolean; // show all tower ranges on hover
  pauseOnBlur: boolean;
}

const KEY = 'settings';

const DEFAULTS: Settings = {
  muted: false,
  showFps: false,
  showRange: true,
  pauseOnBlur: true,
};

export class SettingsStore {
  private current: Settings;

  constructor() {
    this.current = { ...DEFAULTS, ...load<Partial<Settings>>(KEY, {}) };
  }

  get(): Readonly<Settings> {
    return this.current;
  }

  update(patch: Partial<Settings>): void {
    this.current = { ...this.current, ...patch };
    save(KEY, this.current);
  }

  toggle(key: keyof Settings): void {
    this.update({ [key]: !this.current[key] } as Partial<Settings>);
  }
}
