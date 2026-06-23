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

## Features (Phase 3 — full systems suite)

- **Fixed-timestep game loop** with render interpolation (60 Hz update, smooth render)
- **Data-driven design** — add towers/enemies/spells by dropping a definition object, no engine code changes
- **Grid map** with serpentine paths, buildable tiles, spawn & goal markers
- **A\* pathfinding** ready for dynamic obstacle avoidance when towers block tiles
- **6 tower archetypes**: Turret, Sniper, Mortar(splash), Frost(slow), Tesla, Cannon — each with damage type, target strategy, 3 upgrade levels
- **5 enemy types**: Grunt, Scout, Brute, Zealot, Boss — with damage resistances (rock-paper-scissors)
- **Typed damage system**: Physical / Fire / Ice / Lightning + per-enemy resistance maps
- **Tower targeting strategies**: first/last/strongest/weakest/closest — cyclable per-tower (KeyT)
- **Homing projectiles** with finite lifetime, splash, slow, damage type
- **3 player spells**: Meteor (AoE Fire), Freeze (global slow), Repair (heal lives) — cooldown + gold cost
- **Wave system** — 12 waves with escalating HP, boss every 6th wave, force-next-wave button
- **Economy** — gold from kills, tower placement cost, upgrade cost, sell refund, spell cost
- **Lives & win/lose** — lose a life per enemy that reaches the goal; win when all waves cleared
- **3 levels** with distinct layouts + LevelManager + level select screen
- **Star rating** per level based on lives retained (3/2/1 stars)
- **Save system** — high score, level unlocks, tower unlocks, tutorial progress (localStorage)
- **Settings** — mute/FPS/range/pause-on-blur toggles, persistent
- **Particle effects** — hit sparks, death bursts, splash explosions
- **Procedural audio** via Web Audio API — SFX + background music (no asset files)
- **Tutorial** — contextual first-run hints that disappear after triggered
- **Run statistics** — kills, towers placed, upgrades, spells cast, gold earned, damage dealt
- **Unified input** — mouse + touch + keyboard (1-6 tower, Q/W/E spell, Space pause, Esc menu, S sell, U upgrade, T cycle target)
- **HUD** — gold, lives, wave counter, score, tower shop, spell bar, control buttons
- **Screen overlays** — main menu, level select, pause, victory, defeat, settings
- **19 unit tests** — core logic verified (stars, resistance, upgrades, A*, vectors)

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
