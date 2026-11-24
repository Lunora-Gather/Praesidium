import type { BattleStorage, GameState } from '../game/GameState';
import { TALENTS } from '../game/Talents';
import { logger } from '../utils/logger';
import { decodeProgressBackup, MAX_BACKUP_BYTES, ProgressStore, progressGuard, type Checkpoint, type ProgressView } from '../utils/ProgressStore';
import { t } from '../utils/i18n';
import { runIdentity, type RunSnapshot } from '../utils/RunSave';
import type { RunResult, RunSettlement } from '../utils/SaveSystem';
import { ProgressDialog } from './ProgressDialog';

const TAB_KEY = 'praesidium:checkpoint-owner';
const previousOwner = (): string | null => {
  try { return sessionStorage.getItem(TAB_KEY); } catch { return null; }
};

async function storageCutoverReady(): Promise<boolean> {
  const workers = navigator.serviceWorker;
  // A forced reload can bypass control while an older active worker still has clients.
  const controller = workers?.controller ?? (await workers?.getRegistration())?.active;
  if (!controller) return true;
  return new Promise(resolve => {
    const { port1, port2 } = new MessageChannel();
    const finish = (supported: boolean): void => { window.clearTimeout(timer); port1.close(); resolve(supported); };
    const timer = window.setTimeout(() => finish(false), 1500);
    port1.onmessage = event => finish(event.data === 'indexeddb-v1');
    try { controller.postMessage('praesidium:progress-protocol', [port2]); }
    catch { finish(false); }
  });
}

export class ProgressController implements BattleStorage {
  private readonly owner = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  private readonly channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('praesidium:progress') : null;
  private readonly dialog = new ProgressDialog(() => this.manage());
  private readonly backupInput = document.createElement('input');
  private store: ProgressStore | null = null;
  private game!: GameState;
  private view: ProgressView | null = null;
  private activeId: string | null = null;
  private revision = 0;
  private staged: RunResult | null = null;
  private resultSink: ((result: RunSettlement | null) => void) | null = null;
  private queue = Promise.resolve();
  private saving = false;
  private pendingCheckpoint: RunSnapshot | null = null;
  private exclusive = false;
  private status: string | null = null;

  get hasCheckpoint(): boolean { return this.view?.checkpoint != null; }
  get blocksInput(): boolean { return this.exclusive || this.dialog.isOpen; }

  async initialize(game: GameState): Promise<void> {
    this.game = game;
    this.backupInput.type = 'file';
    this.backupInput.id = 'progress-backup-input';
    this.backupInput.accept = 'application/json,.json';
    this.backupInput.hidden = true;
    this.backupInput.addEventListener('change', () => {
      const file = this.backupInput.files?.[0];
      this.backupInput.value = '';
      if (file) this.restoreFile(file);
    });
    document.body.append(this.backupInput);
    this.channel?.addEventListener('message', () => this.refresh());
    window.addEventListener('focus', () => this.refresh());
    await this.enqueue(async () => {
      try {
        await this.open();
        const view = this.view;
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
        const lastOwner = previousOwner();
        if (view?.checkpoint && nav?.type === 'reload' && lastOwner && view.checkpoint.owner === lastOwner) {
          await this.claim(view);
        }
      } catch (error) { this.fail(error); }
    });
  }

  private async open(): Promise<boolean> {
    if (!this.store && !await storageCutoverReady()) {
      this.notify('progress.updateNeeded');
      return false;
    }
    this.store ??= await ProgressStore.open();
    for (const run of await this.store.pending()) await this.store.settle(run.id);
    await this.read();
    return true;
  }

  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const next = this.queue.then(work);
    this.queue = next.then(() => undefined, () => undefined);
    return next;
  }

  private notify(key: string | null): void {
    this.status = key;
    this.dialog.setNotice(key);
  }

  private fail(error: unknown): void {
    logger.warn('Local progress could not be saved or loaded', error);
    this.notify('progress.failed');
  }

  private async read(): Promise<ProgressView> {
    if (!this.store) throw new Error('Progress database is not open');
    const view = await this.store.read();
    this.view = view;
    this.game.save.adopt(view.profile);
    this.game.achievements.syncCampaign(view.profile.levelStars);
    const current = view.checkpoint;
    if (this.activeId && this.game.phase === 'playing'
        && (!current || current.owner !== this.owner || runIdentity(current.snapshot) !== this.activeId)) {
      this.activeId = null;
      this.pendingCheckpoint = null;
      this.game.goMenu();
      this.notify('progress.changed');
    } else if (view.corrupt) this.notify('progress.damaged');
    return view;
  }

  refresh(): void {
    if (this.store) void this.enqueue(async () => { await this.read(); }).catch(error => this.fail(error));
  }

  private own(checkpoint: Checkpoint): void {
    this.activeId = runIdentity(checkpoint.snapshot);
    this.revision = checkpoint.revision;
    try { sessionStorage.setItem(TAB_KEY, this.owner); } catch { /* Menu resume still works. */ }
  }

  private async claim(view: ProgressView): Promise<void> {
    const checkpoint = await this.store?.claim(this.owner, progressGuard(view));
    if (!checkpoint) { await this.read(); this.notify('progress.changed'); return; }
    this.own(checkpoint);
    if (!this.game.restore(checkpoint.snapshot)) { this.notify('progress.damaged'); return; }
    await this.read();
    this.notify(null);
    this.channel?.postMessage('changed');
  }

  resume(): void {
    if (this.blocksInput || this.staged) return;
    if (!this.store) { this.manage(); return; }
    this.exclusive = true;
    void (async () => {
      const view = await this.enqueue(() => this.read());
      if (!view.checkpoint) return;
      if (view.checkpoint.owner && view.checkpoint.owner !== this.owner && view.checkpoint.owner !== previousOwner()
          && !await this.dialog.confirm('progress.takeover', 'progress.takeoverDetail', 'progress.takeoverAction')) return;
      await this.enqueue(() => this.claim(view));
    })().catch(error => this.fail(error)).finally(() => { this.exclusive = false; });
  }

  start(action: () => void): void {
    if (this.blocksInput) return;
    if (this.staged || !this.store) { this.manage(); return; }
    this.exclusive = true;
    void (async () => {
      const view = await this.enqueue(() => this.read());
      if ((view.checkpoint || view.corrupt)
          && !await this.dialog.confirm('progress.replace', view.corrupt ? 'progress.damaged' : 'progress.replaceDetail', 'progress.replaceAction')) return;
      await this.enqueue(async () => {
        // The previous slot is untouched until the user confirms and the new snapshot commits.
        this.activeId = null;
        this.pendingCheckpoint = null;
        action();
        if (this.game.phase !== 'playing') return;
        const snapshot = this.game.snapshot();
        try {
          if (!await this.store!.start(snapshot, this.owner, progressGuard(view))) {
            this.game.goMenu();
            await this.read();
            this.notify('progress.changed');
            return;
          }
        } catch (error) { this.game.goMenu(); throw error; }
        this.own({ snapshot, owner: this.owner, revision: 0 });
        await this.read();
        this.notify(null);
        this.channel?.postMessage('changed');
      });
    })().catch(error => this.fail(error)).finally(() => { this.exclusive = false; });
  }

  checkpoint(snapshot: RunSnapshot): void {
    if (!this.store || !this.activeId || snapshot.runId !== this.activeId) return;
    this.pendingCheckpoint = snapshot;
    if (this.saving) return;
    this.saving = true;
    void this.enqueue(async () => {
      while (this.pendingCheckpoint) {
        const next = this.pendingCheckpoint;
        this.pendingCheckpoint = null;
        if (next.runId !== this.activeId) continue;
        if (!await this.store!.checkpoint(next, this.owner, ++this.revision)) {
          // A staged victory is being committed, or another tab replaced this slot.
          if (!this.staged) await this.read();
          break;
        }
        if (this.status === 'progress.failed' && !this.staged) this.notify(null);
      }
    }).catch(error => this.fail(error)).finally(() => { this.saving = false; });
  }

  settle(run: RunResult): Promise<RunSettlement | null> {
    this.staged = run;
    return new Promise(resolve => {
      this.resultSink = resolve;
      this.runSettlement();
    });
  }

  private runSettlement(): void {
    void this.enqueue(async () => {
      const run = this.staged;
      if (!run) return;
      if (!this.store) throw new Error('Progress database is not open');
      const accepted = await this.store.stage(run, this.owner);
      const result = accepted ? await this.store.settle(run.id) : null;
      this.activeId = null;
      this.staged = null;
      const resolve = this.resultSink;
      this.resultSink = null;
      try { await this.read(); }
      finally { resolve?.(result); }
      this.notify(accepted ? null : 'progress.changed');
      if (accepted) this.channel?.postMessage('changed');
    }).catch(error => this.fail(error));
  }

  buyTalent(id: string, onBought?: () => void): void {
    const def = TALENTS.find(talent => talent.id === id);
    const generation = this.view?.generation;
    if (!def || generation === undefined || !this.store) return;
    void this.enqueue(async () => {
      const bought = await this.store!.buyTalent(id, def.costPerRank, def.maxRank, generation);
      await this.read();
      if (bought) { onBought?.(); this.channel?.postMessage('changed'); }
    }).catch(error => this.fail(error));
  }

  private exportBackup(): void {
    this.game.autoSave();
    void this.enqueue(async () => {
      if (!this.store) throw new Error('Progress database is not open');
      const backup = await this.store.exportBackup();
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'praesidium-progress.json';
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    }).catch(error => this.fail(error));
  }

  private restoreFile(file: File): void {
    if (this.blocksInput || this.staged || !this.store) return;
    this.exclusive = true;
    void (async () => {
      const text = file.size <= MAX_BACKUP_BYTES ? await file.text() : '';
      const backup = decodeProgressBackup(text);
      if (!backup) { this.notify('progress.invalidBackup'); return; }
      const view = await this.enqueue(() => this.read());
      const detail = t('progress.preview').replace('{level}', String(backup.profile.maxLevelReached))
        .replace('{checkpoint}', t(backup.checkpoint ? 'progress.hasRun' : 'progress.noRun'));
      if (!await this.dialog.confirm('progress.importTitle', 'progress.importDetail', 'progress.importAction', detail)) return;
      await this.enqueue(async () => {
        const result = await this.store!.restoreBackup(text, progressGuard(view));
        if (result !== 'restored') {
          await this.read();
          this.notify(result === 'invalid' ? 'progress.invalidBackup' : 'progress.changed');
          return;
        }
        this.activeId = null;
        this.pendingCheckpoint = null;
        this.game.goMenu();
        this.channel?.postMessage('changed');
        await this.open();
        this.notify('progress.restored');
      });
    })().catch(error => this.fail(error)).finally(() => { this.exclusive = false; });
  }

  manage(): void {
    if (this.exclusive || this.dialog.isOpen) return;
    const message = this.status ?? (this.hasCheckpoint ? 'progress.saved' : 'progress.empty');
    const retry = { label: this.status === 'progress.updateNeeded' ? 'progress.checkUpdate' : 'progress.retry', run: () => {
      if (this.staged) this.runSettlement();
      else void this.enqueue(async () => {
        if (!await this.open()) return;
        if (this.activeId && this.game.phase === 'playing') {
          this.pendingCheckpoint = null;
          if (!await this.store!.checkpoint(this.game.snapshot(), this.owner, ++this.revision)) {
            await this.read();
            this.notify('progress.changed');
            return;
          }
        }
        this.notify(this.view?.corrupt ? 'progress.damaged' : null);
      }).catch(error => this.fail(error));
    } };
    const actions = [retry];
    if (this.store) actions.unshift({ label: 'progress.export', run: () => this.exportBackup() });
    if (this.store && !this.staged) actions.unshift({ label: 'progress.import', run: () => this.backupInput.click() });
    this.dialog.manage(message, actions);
  }
}
