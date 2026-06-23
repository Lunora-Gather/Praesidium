# Praesidium

> A super large-scale tower defense game — runs in any modern browser, zero install for players.

Praesidium (Latin: "defense / protection") is a web-based tower defense game built with **TypeScript + HTML5 Canvas + Vite**. No engine, no runtime dependencies for end users — just open the URL and play.

## Play

```bash
npm install
npm run dev      # opens http://localhost:5173
```

Build for production:

```bash
npm run build    # outputs static files to dist/
```

The `dist/` folder is fully self-contained — drop it on any static host (GitHub Pages, Vercel, Netlify, S3, even a plain `file://` open).

## Features (Phase 1 — playable core loop)

- **Fixed-timestep game loop** with render interpolation (60 Hz update, smooth render)
- **Data-driven design** — add towers/enemies by dropping a definition object, no engine code changes
- **Grid map** with a serpentine path, buildable tiles, spawn & goal markers
- **Waypoint-based enemy movement** along the path
- **Tower targeting** — picks the enemy closest to the goal within range (smart last-progress targeting)
- **Homing projectiles** with finite lifetime
- **Splash damage** support (ready for mortar-style towers)
- **Wave system** — 12 waves with escalating HP, three enemy types (Grunt / Scout / Brute), force-next-wave button
- **Economy** — gold from kills, tower placement cost, sell refund
- **Lives & win/lose** — lose a life per enemy that reaches the goal; win when all waves cleared
- **Procedural audio** via Web Audio API — no audio asset files needed (shoot/hit/death/place/wave/win/lose blips)
- **Unified input** — mouse + touch + keyboard (1-9 to pick tower, Space to pause, Esc to menu)
- **HUD** — gold, lives, wave counter, score, tower shop, control buttons
- **Screen overlays** — main menu, pause, victory, defeat

## Architecture

Designed for scale. Layers are decoupled so the game can grow to hundreds of tower/enemy types and many levels without rewriting core code.

```
src/
├── main.ts                 # entry: wires engine + game + UI, handles clicks
├── engine/                 # generic engine layer (no game logic)
│   ├── GameLoop.ts         # fixed-timestep loop + render interpolation
│   ├── Input.ts            # mouse/touch/keyboard abstraction
│   ├── Renderer.ts         # Canvas 2D primitives + camera
│   ├── Audio.ts            # Web Audio procedural SFX
│   └── math/Vec2.ts        # immutable 2D vector
├── ecs/
│   └── World.ts            # entity id allocation + dead-entity reaping
├── game/                   # authoritative simulation
│   ├── GameState.ts        # state machine, economy, lives, owns all entities
│   ├── grid/
│   │   ├── Grid.ts         # tile lookup, pixel<->tile conversion
│   │   └── Level.ts        # level data + TileType enum
│   ├── towers/
│   │   ├── Tower.ts        # instance: cooldown, targeting, aiming
│   │   └ TowerRegistry.ts  # data-driven tower definitions
│   ├── enemies/
│   │   ├── Enemy.ts        # instance: waypoint walking, HP, reward
│   │   └── EnemyRegistry.ts# data-driven enemy definitions
│   ├── projectiles/
│   │   └── Projectile.ts   # homing bullet with splash/slow fields ready
│   └── waves/
│       └ WaveManager.ts    # spawn queue, wave progression, force-next
├── ui/                     # pure rendering, mutates nothing
│   ├── HUD.ts              # top bar + tower shop + control buttons
│   ├── WorldRenderer.ts    # grid/path/towers/enemies/projectiles/hover preview
│   └── Screens.ts          # menu / pause / victory / defeat overlays
├── config/
│   └── balance.ts          # ALL numerical tuning in one place
└── utils/
    ├── EventBus.ts         # typed pub/sub (reserved for future decoupling)
    ├── storage.ts          # localStorage persistence helper
    └── rng.ts              # seeded RNG (mulberry32) for deterministic waves
```

### Key design decisions

- **Data-driven registries** — `TowerRegistry` and `EnemyRegistry` are plain object maps. Adding a "Sniper" tower is one object literal; the combat loop never changes.
- **Authoritative collisions in GameState** — projectiles only move themselves; damage application lives in `GameState.update` so splash/slow logic stays centralized.
- **In-place array compaction** — dead entities are swept via a write-index rather than `Array.filter` reallocation, avoiding per-frame GC pressure.
- **No external assets** — graphics are Canvas primitives, audio is synthesized. The whole game ships in ~21 KB JS (gzip ~7.5 KB).

## Roadmap

Phase 1 (this release) is the playable foundation. Planned:

- **Phase 2**: multiple tower types (Sniper, Mortar/splash, Frost/slow), tower upgrades, sell UI
- **Phase 3**: multiple levels + level select, boss enemies, enemy abilities
- **Phase 4**: meta-progression — persistent unlocks, currency, upgrades across runs
- **Phase 5**: polish — particle effects, screen shake, sprite art, music, save/load
- **Phase 6**: accessibility (keyboard-only nav, colorblind palette), localization

## Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| Language | TypeScript | Type safety + fast iteration |
| Rendering | HTML5 Canvas 2D | Zero dependencies, native to browser, perfect for 2D TD |
| Build | Vite | Instant HMR, tiny production output |
| Audio | Web Audio API | Synthesized SFX, no asset files |
| State | localStorage | Save/load without backend |

No game engine, no framework, no runtime libraries shipped to the player.

## License

MIT — see `LICENSE` if added. Otherwise all rights reserved pending decision.
