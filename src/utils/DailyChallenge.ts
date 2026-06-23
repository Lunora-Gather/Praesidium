// Daily challenge: generates a deterministic seed from today's date.
// Everyone on the same day gets the same seed → compete for highest wave.
// This is THE daily retention mechanic — the reason players come back every day.

export function dailySeed(): number {
  const now = new Date();
  // YYYYMMDD as hex — same for everyone on the same calendar day
  const dateNum = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  // scramble with a fixed multiplier to avoid trivial patterns
  return ((dateNum * 2654435761) >>> 0);
}

export function dailyDateStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Best wave survived for a given daily date string, stored in localStorage. */
export function dailyBest(dateStr: string): number {
  try {
    const raw = localStorage.getItem(`praesidium:daily:${dateStr}`);
    return raw ? parseInt(raw, 10) : 0;
  } catch { return 0; }
}

export function setDailyBest(dateStr: string, wave: number): void {
  try {
    const prev = dailyBest(dateStr);
    if (wave > prev) localStorage.setItem(`praesidium:daily:${dateStr}`, String(wave));
  } catch { /* ignore */ }
}
