// Minimal typed event bus — decoupled pub/sub across engine and game.

export type Listener<T> = (payload: T) => void;

export class EventBus<TMap extends Record<string, unknown> = Record<string, unknown>> {
  private readonly listeners = new Map<keyof TMap, Set<Listener<unknown>>>();

  on<K extends keyof TMap>(event: K, fn: Listener<TMap[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set<Listener<unknown>>();
      this.listeners.set(event, set);
    }
    set.add(fn as Listener<unknown>);
    return () => this.off(event, fn);
  }

  off<K extends keyof TMap>(event: K, fn: Listener<TMap[K]>): void {
    const set = this.listeners.get(event);
    if (set) set.delete(fn as Listener<unknown>);
  }

  emit<K extends keyof TMap>(event: K, payload: TMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.forEach((fn: Listener<unknown>) => fn(payload));
  }

  clear(): void {
    this.listeners.clear();
  }
}
