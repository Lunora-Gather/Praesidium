// Authoritative browser storage. LocalStorage is read once for migration, never dual-written.
import { isRunResult, isRunSnapshot, loadRunSettlements, runIdentity, type LegacyRunSnapshot, type RunSnapshot } from './RunSave';
import { loadLegacyProfile, readProfile, SaveSystem, type RunResult, type RunSettlement, type SaveData } from './SaveSystem';
import { readStored } from './storage';

const DB_NAME = 'praesidium-progress';
const STORES = ['state', 'pending', 'settled'];
type Snapshot = RunSnapshot | LegacyRunSnapshot;

export interface Checkpoint {
  snapshot: Snapshot;
  owner: string | null;
  revision: number;
}

export interface ProgressView {
  profile: SaveData;
  checkpoint: Checkpoint | null;
  corrupt: boolean;
  generation: number;
}

export interface ProgressGuard {
  generation: number;
  owner: string | null;
  id: string | null;
  corrupt: boolean;
}

export function progressGuard(view: ProgressView): ProgressGuard {
  const { generation, checkpoint, corrupt } = view;
  return { generation, owner: checkpoint?.owner ?? null, id: checkpoint ? runIdentity(checkpoint.snapshot) : null, corrupt };
}

function sameGuard(view: ProgressView, expected: ProgressGuard): boolean {
  const actual = progressGuard(view);
  return actual.generation === expected.generation && actual.id === expected.id && actual.owner === expected.owner && actual.corrupt === expected.corrupt;
}

export const MAX_BACKUP_BYTES = 32 * 1024 * 1024;
export interface ProgressBackup {
  format: 'Praesidium progress';
  schema: 1;
  profile: SaveData;
  checkpoint: Snapshot | null;
  pending: RunResult[];
  settled: string[];
}

export function decodeProgressBackup(text: string): ProgressBackup | null {
  if (text.length > MAX_BACKUP_BYTES) return null;
  try {
    const raw = JSON.parse(text) as Partial<ProgressBackup> | null;
    if (!raw || raw.format !== 'Praesidium progress' || raw.schema !== 1
        || !raw.profile || typeof raw.profile !== 'object' || Array.isArray(raw.profile)
        || (raw.checkpoint !== null && !isRunSnapshot(raw.checkpoint))
        || !Array.isArray(raw.pending) || !raw.pending.every(isRunResult)
        || !Array.isArray(raw.settled) || !raw.settled.every(id => typeof id === 'string' && /^[\w-]{1,80}$/.test(id))) return null;
    const profile = readProfile(raw.profile);
    // Validate rather than silently replacing invalid backup fields with player defaults.
    for (const key of Object.keys(readProfile({})) as (keyof SaveData)[]) {
      if (JSON.stringify(profile[key]) !== JSON.stringify(raw.profile[key])) return null;
    }
    if (new Set(raw.settled).size !== raw.settled.length || new Set(raw.pending.map(run => run.id)).size !== raw.pending.length) return null;
    const settled = new Set(raw.settled);
    if (raw.pending.some(run => settled.has(run.id)) || (raw.checkpoint && settled.has(runIdentity(raw.checkpoint)))) return null;
    if (!profile.settledRuns.every(id => settled.has(id))) return null;
    return { format: raw.format, schema: raw.schema, profile, checkpoint: raw.checkpoint, pending: raw.pending, settled: raw.settled };
  } catch { return null; }
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Progress request failed'));
  });
}

export class ProgressStore {
  private constructor(private readonly db: IDBDatabase) {
    db.onversionchange = () => db.close();
  }

  static async open(factory: IDBFactory = globalThis.indexedDB): Promise<ProgressStore> {
    if (!factory) throw new Error('IndexedDB is unavailable');
    const req = factory.open(DB_NAME, 1);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      let blocked = false;
      req.onupgradeneeded = () => {
        for (const name of STORES) req.result.createObjectStore(name);
      };
      req.onblocked = () => { blocked = true; reject(new Error('Progress upgrade is blocked by another tab')); };
      req.onerror = () => reject(req.error ?? new Error('Progress database could not open'));
      req.onsuccess = () => { if (blocked) req.result.close(); else resolve(req.result); };
    });
    const store = new ProgressStore(db);
    try {
      await store.migrate();
      return store;
    } catch (error) {
      store.close();
      throw error;
    }
  }

  close(): void { this.db.close(); }

  private async transaction<T>(mode: IDBTransactionMode, fn: (tx: IDBTransaction) => Promise<T>): Promise<T> {
    const tx = this.db.transaction(STORES, mode);
    const committed = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error ?? new Error('Progress transaction aborted'));
    });
    // No non-IndexedDB awaits inside fn; browsers may commit an inactive transaction.
    try {
      const [result] = await Promise.all([fn(tx), committed]);
      return result;
    } catch (error) {
      try { tx.abort(); } catch { /* It may already have aborted. */ }
      throw error;
    }
  }

  private migrate(): Promise<void> {
    return this.transaction('readwrite', async tx => {
      const state = tx.objectStore('state');
      if (await request(state.get('profile'))) return;
      const profile = loadLegacyProfile();
      state.put(profile, 'profile');
      state.put(0, 'generation');
      const settled = tx.objectStore('settled');
      for (const id of profile.settledRuns) settled.put(true, id);
      const legacy = readStored('run:snapshot');
      if (legacy.kind === 'unavailable') throw new Error('Cannot read legacy progress');
      if (legacy.kind === 'value' && isRunSnapshot(legacy.value)) {
        if (!profile.settledRuns.includes(runIdentity(legacy.value))) {
          state.put({ snapshot: legacy.value, owner: null, revision: 0 } satisfies Checkpoint, 'checkpoint');
        }
      } else if (legacy.kind === 'value' || legacy.kind === 'invalid') {
        state.put(true, 'corrupt');
      }
      const pending = tx.objectStore('pending');
      for (const run of loadRunSettlements()) {
        if (!profile.settledRuns.includes(run.id)) pending.put(run, run.id);
      }
    });
  }

  private async view(state: IDBObjectStore): Promise<ProgressView> {
    const [profile, stored, corrupt, generation] = await Promise.all([
      request<SaveData>(state.get('profile')), request<Checkpoint | undefined>(state.get('checkpoint')),
      request<boolean | undefined>(state.get('corrupt')), request<number>(state.get('generation')),
    ]);
    const checkpoint = stored && isRunSnapshot(stored.snapshot) ? stored : null;
    return { profile: readProfile(profile), checkpoint, corrupt: Boolean(corrupt || (stored && !checkpoint)), generation };
  }

  read(): Promise<ProgressView> {
    return this.transaction('readonly', tx => this.view(tx.objectStore('state')));
  }

  start(snapshot: RunSnapshot, owner: string, expected: ProgressGuard): Promise<boolean> {
    return this.transaction('readwrite', async tx => {
      if (!snapshot.runId || !isRunSnapshot(snapshot)) throw new Error('Cannot save invalid battle');
      const state = tx.objectStore('state');
      const [view, pending, settled] = await Promise.all([
        this.view(state), request(tx.objectStore('pending').get(snapshot.runId)), request(tx.objectStore('settled').get(snapshot.runId)),
      ]);
      if (!sameGuard(view, expected) || pending || settled || expected.id === snapshot.runId) return false;
      state.put({ snapshot, owner, revision: 0 } satisfies Checkpoint, 'checkpoint');
      state.delete('corrupt');
      return true;
    });
  }

  claim(owner: string, expected: ProgressGuard): Promise<Checkpoint | null> {
    return this.transaction('readwrite', async tx => {
      if (!expected.id) return null;
      const state = tx.objectStore('state');
      const [view, ending] = await Promise.all([this.view(state), request(tx.objectStore('pending').get(expected.id))]);
      if (!view.checkpoint || !sameGuard(view, expected) || ending) return null;
      const checkpoint = { ...view.checkpoint, owner };
      state.put(checkpoint, 'checkpoint');
      return checkpoint;
    });
  }

  checkpoint(snapshot: RunSnapshot, owner: string, revision: number): Promise<boolean> {
    return this.transaction('readwrite', async tx => {
      if (!snapshot.runId || !isRunSnapshot(snapshot)) throw new Error('Cannot save invalid battle');
      const state = tx.objectStore('state');
      const [current, ending] = await Promise.all([
        request<Checkpoint | undefined>(state.get('checkpoint')), request(tx.objectStore('pending').get(snapshot.runId)),
      ]);
      if (ending || !current || current.owner !== owner || runIdentity(current.snapshot) !== snapshot.runId || revision <= current.revision) return false;
      state.put({ snapshot, owner, revision } satisfies Checkpoint, 'checkpoint');
      return true;
    });
  }

  stage(run: RunResult, owner: string): Promise<boolean> {
    return this.transaction('readwrite', async tx => {
      if (!isRunResult(run)) throw new Error('Cannot settle an invalid result');
      const pending = tx.objectStore('pending');
      const [current, existing, settled] = await Promise.all([
        request<Checkpoint | undefined>(tx.objectStore('state').get('checkpoint')),
        request(pending.get(run.id)), request(tx.objectStore('settled').get(run.id)),
      ]);
      if (existing || settled) return true;
      if (!current || current.owner !== owner || runIdentity(current.snapshot) !== run.id) return false;
      pending.add(run, run.id);
      return true;
    });
  }

  buyTalent(id: string, cost: number, maxRank: number, generation: number): Promise<boolean> {
    return this.transaction('readwrite', async tx => {
      const state = tx.objectStore('state');
      const [profile, currentGeneration] = await Promise.all([request<SaveData>(state.get('profile')), request(state.get('generation'))]);
      if (currentGeneration !== generation) return false;
      const reducer = new SaveSystem(true);
      reducer.adopt(readProfile(profile));
      if (!reducer.buyTalent(id, cost, maxRank)) return false;
      state.put(reducer.get(), 'profile');
      return true;
    });
  }

  exportBackup(): Promise<ProgressBackup> {
    return this.transaction('readonly', async tx => {
      const [view, pending, settled] = await Promise.all([
        this.view(tx.objectStore('state')), request<RunResult[]>(tx.objectStore('pending').getAll()),
        request(tx.objectStore('settled').getAllKeys()),
      ]);
      return { format: 'Praesidium progress', schema: 1, profile: view.profile,
        checkpoint: view.checkpoint?.snapshot ?? null, pending, settled: settled.map(String) };
    });
  }

  async restoreBackup(text: string, expected: ProgressGuard): Promise<'invalid' | 'changed' | 'restored'> {
    const backup = decodeProgressBackup(text);
    if (!backup) return 'invalid';
    return this.transaction('readwrite', async tx => {
      const state = tx.objectStore('state');
      const view = await this.view(state);
      if (!sameGuard(view, expected)) return 'changed';
      const pending = tx.objectStore('pending');
      const settled = tx.objectStore('settled');
      pending.clear();
      settled.clear();
      state.put(backup.profile, 'profile');
      state.put(view.generation + 1, 'generation');
      state.delete('corrupt');
      if (backup.checkpoint) state.put({ snapshot: backup.checkpoint, owner: null, revision: 0 } satisfies Checkpoint, 'checkpoint');
      else state.delete('checkpoint');
      for (const run of backup.pending) pending.put(run, run.id);
      for (const id of backup.settled) settled.put(true, id);
      return 'restored';
    });
  }

  pending(): Promise<RunResult[]> {
    return this.transaction('readonly', tx => request<RunResult[]>(tx.objectStore('pending').getAll()));
  }

  settle(id: string): Promise<RunSettlement | null> {
    return this.transaction('readwrite', async tx => {
      const pending = tx.objectStore('pending');
      const run = await request<RunResult | undefined>(pending.get(id));
      if (!run) return null;
      const state = tx.objectStore('state');
      const settled = tx.objectStore('settled');
      const [exists, profile, checkpoint] = await Promise.all([
        request(settled.get(id)), request<SaveData>(state.get('profile')),
        request<Checkpoint | undefined>(state.get('checkpoint')),
      ]);
      let result: RunSettlement | null = null;
      if (!exists) {
        const reducer = new SaveSystem(true);
        reducer.adopt(readProfile(profile));
        result = reducer.settleRun(run);
        state.put(reducer.get(), 'profile');
        settled.add(true, id);
      }
      if (checkpoint && runIdentity(checkpoint.snapshot) === id) state.delete('checkpoint');
      pending.delete(id);
      return result;
    });
  }
}
