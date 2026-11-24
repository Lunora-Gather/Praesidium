// localStorage-backed persistent state with JSON serialization.

const PREFIX = 'praesidium:';

export function readStored(key: string): { kind: 'value'; value: unknown } | { kind: 'missing' | 'invalid' | 'unavailable' } {
  let raw: string | null;
  try { raw = localStorage.getItem(PREFIX + key); } catch { return { kind: 'unavailable' }; }
  if (raw === null) return { kind: 'missing' };
  try { return { kind: 'value', value: JSON.parse(raw) }; } catch { return { kind: 'invalid' }; }
}

export function load<T>(key: string, fallback: T): T {
  const entry = readStored(key);
  if (entry.kind !== 'value') return fallback;
  const { value } = entry;
  if (fallback !== null && fallback !== undefined) {
    if (value === null || typeof value !== typeof fallback || Array.isArray(value) !== Array.isArray(fallback)) return fallback;
  }
  return value as T;
}

export function save<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}
