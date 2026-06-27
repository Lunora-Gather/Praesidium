// Weekly mode rules: deterministic offline modifiers for longer-term replay goals.

export type WeeklyModeId = 'speed_run' | 'low_gold' | 'limited_builds' | 'boss_week' | 'no_repair' | 'dense_waves';

export interface WeeklyMode {
  id: string;
  weekKey: string;
  title: string;
  description: string;
  mode: WeeklyModeId;
  pressureBonus: number;
  reward: number;
}

const MODES: Array<Omit<WeeklyMode, 'id' | 'weekKey'>> = [
  { title: 'Fast Lane', description: 'Enemies move faster. Build control earlier.', mode: 'speed_run', pressureBonus: 0.18, reward: 3 },
  { title: 'Tight Budget', description: 'Early gold is tighter. Upgrade carefully.', mode: 'low_gold', pressureBonus: 0.14, reward: 3 },
  { title: 'Compact Defense', description: 'Use fewer tower placements. Quality beats quantity.', mode: 'limited_builds', pressureBonus: 0.16, reward: 3 },
  { title: 'Boss Week', description: 'Boss waves matter more. Prepare focused damage.', mode: 'boss_week', pressureBonus: 0.2, reward: 4 },
  { title: 'No Repair', description: 'Win without relying on repair. Prevent leaks early.', mode: 'no_repair', pressureBonus: 0.15, reward: 3 },
  { title: 'Dense Waves', description: 'Later waves are denser. Area damage matters more.', mode: 'dense_waves', pressureBonus: 0.22, reward: 4 },
];

function mix(seed: number): number {
  let x = seed >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return x >>> 0;
}

export function weekKey(date = new Date()): string {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const today = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const day = Math.floor((today - start) / 86400000);
  const week = Math.floor(day / 7) + 1;
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function weeklyMode(key = weekKey()): WeeklyMode {
  const numeric = parseInt(key.replace(/\D/g, ''), 10) || 202601;
  const item = MODES[mix(numeric * 2246822519) % MODES.length];
  return { ...item, id: `${key}:${item.mode}`, weekKey: key };
}

export function weeklyModeSummary(mode: WeeklyMode): string {
  return `${mode.title} · +${Math.round(mode.pressureBonus * 100)}% pressure · reward ${mode.reward}`;
}
