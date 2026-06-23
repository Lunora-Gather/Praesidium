// Light-weight ECS. Entities are plain integer ids; components live in
// typed stores owned by the game world. Systems iterate over the world.

export type EntityId = number;

export class World {
  private nextId = 1;
  private readonly alive = new Set<EntityId>();

  spawn(): EntityId {
    const id = this.nextId++;
    this.alive.add(id);
    return id;
  }

  kill(id: EntityId): void {
    this.alive.delete(id);
  }

  isAlive(id: EntityId): boolean {
    return this.alive.has(id);
  }

  get aliveCount(): number {
    return this.alive.size;
  }

  /** Compact dead entities' component arrays. Systems call this per-frame. */
  reap<T extends { id: EntityId; dead: boolean }>(arr: T[]): T[] {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i].dead) {
        this.kill(arr[i].id);
        arr.splice(i, 1);
      }
    }
    return arr;
  }
}
