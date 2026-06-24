# 🛡️ Praesidium (守望)

> **A Premium Web-Based Sci-Fi Tower Defense Game**
> 
> *Zero Install, High Performance, Immersive Aesthetics, and Fully Responsive Play.*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.2-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![HTML5 Canvas](https://img.shields.io/badge/HTML5-Canvas-E34F26?style=flat-square&logo=html5)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![Web Audio API](https://img.shields.io/badge/Web_Audio-Synthesis-059669?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-Deploy-22c55e?style=flat-square&logo=github)](https://lunora-gather.github.io/Praesidium/)

**Praesidium** (Latin: *"defense / protection"*) is a super-scale, high-fidelity tower defense game built directly on the web with pure **TypeScript, HTML5 Canvas, and Vite**. With zero engine overhead, zero graphic assets (all procedural rendering), and zero audio files (all procedural sound synthesis), the entire game compiles to a tiny self-contained static site (~90 KB total).

👉 **[Play the Online Live Demo Here!](https://lunora-gather.github.io/Praesidium/)** (Ensure your browser has GitHub Actions Pages enabled)

---

## 🎮 How to Play

### Local Development Server

```bash
# Install dependencies
npm install

# Start the dev server with LAN exposure and hot-reload
npm run dev

# Open in your browser:
# Local: http://localhost:5175
# LAN: http://10.150.246.105:5175 (or your local IP)
```

### Build and Local Preview

```bash
# Build the production optimized bundle
npm run build

# Start a local preview of the production build
npm run preview -- --host --port 4174

# Open: http://localhost:4174
```

---

## ✨ Features

### 🎨 1. Premium Sci-Fi Visual Polish
* **Dual-Font System**: Integrates Google Fonts CDN (Inter for clean, high-readability labels; Orbitron for futuristic headers, scores, wave numbers, and combos).
* **Glassmorphism UI**: Modal cards use translucent backdrops, neon glow shadows, and dynamic gradient borders that transition based on state (emerald for victory, coral-red for defeat, sapphire-blue for pause/menu).
* **Precise Vertical Centering**: Text aligns perfectly across all buttons, cards, list rows, and overlays using native `'middle'` baselines.

### 📱 2. Fully Responsive HUD for All Devices
* **Stat Pill Compression**: On screens narrower than 850px, labels automatically contract to single letters (`GOLD` ➔ `G`, `LIVES` ➔ `L`, `W` / `S`) and shrink font sizes to eliminate overlaps.
* **Micro-Icon Buttons**: Navigation buttons adapt to emoji-based icon mode (e.g., `☰`, `⚙`, `🏆`, `⏸`, `⟳`) on smaller screens.
* **Intelligent Truncation**: Hides non-critical gameplay features (Stats, Settings, Talents) on screens narrower than 640px to maximize the canvas field.

### 🔊 3. Procedural Audio & Music Synthesizer
* **Distinct Tower Soundwaves**: Each of the 6 tower types generates distinct synthesizer patterns (laser hums, heavy mortar thuds, electric crackles, sniper reports, icy slows).
* **Adaptive Music & Alarms**: Synthesises a procedural ambient space music loop in the background, complete with emergency warning sirens and screen shakes on life lost.
* **Achievement Chimes**: Twin-chime victory sounds triggered upon achievement unlocks.

### 🏆 4. Offline Leaderboards & Challenges
* **Seeded NPC Leaderboard**: Generates realistic competitor scores based on Level indices or Endless/Daily seeds, enabling offline social comparison.
* **Daily Challenge**: Compete on a global seed generated daily using your system date.
* **Defeat Seed Sharing**: Easily copy your endless challenge seed to your clipboard via a one-click button on the game over screen.

### 📈 5. Deep Progression & Economy
* **Talent Tree**: Earn talent points from level stars to purchase persistent upgrades (Greed, Power, Vision, Haste, Fortitude, Arcane) that carry over to all subsequent runs.
* **Achievements Panel**: Unlock in-game achievements (Architect, Upgrader, Archmage, Veteran) with smooth slide-in notification cards and audio alerts.
* **6 Towers & 5 Enemy Types**: Standard rock-paper-scissors armor/type mechanics with physical, fire, ice, and lightning damage scaling.

---

## 🏗️ Architecture

Decoupled model-view-controller setup. Game simulation is completely isolated from visual rendering.

```
src/
├── main.ts                 # Controller: Entry point, wires update loop & clicks
├── engine/                 # Generic Engine Layer (framework-agnostic)
│   ├── GameLoop.ts         # Fixed-timestep loop (60Hz) with render interpolation
│   ├── Input.ts            # Mouse, keyboard, and pointer touch abstractions
│   ├── Renderer.ts         # Screen camera, lines, shapes, text wrappers
│   └── Audio.ts            # Web Audio API synthesizers (SFX & music)
├── game/                   # AUTHORITATIVE Game State
│   ├── GameState.ts        # Core state machine, grid mapping, reapers, and waves
│   ├── Achievements.ts     # Achievement definition and unlock trackers
│   ├── Talents.ts          # Meta-upgrades persistence & multiplier maps
│   ├── grid/               # Grids and LevelManager definitions
│   ├── towers/             # Data-driven towers registries (Turret, Sniper, Mortar...)
│   ├── enemies/            # Enemy stats, speeds, and resistances (Grunt, Boss...)
│   ├── projectiles/        # Homing bullets, slows, lightning chains
│   └── waves/              # Procedural WaveManager scaling with seeded Rng
├── ui/                     # Pure View Layer (Visual layout & drawing only)
│   ├── HUD.ts              # Stat pills, responsive top bar, and shop card carousel
│   ├── WorldRenderer.ts    # Game board paths, ranges, level pips, and targets
│   ├── StatsScreen.ts      # Tabbed panel: Detailed metrics & Rankings leaderboard
│   ├── SettingsScreen.ts   # Mute, FPS, ranges toggles, and English/Chinese switch
│   └── Screens.ts          # Main menu, level select, paused, victory overlays
└── utils/
    ├── Leaderboard.ts      # Deterministic NPC generator for rankings
    ├── SaveSystem.ts       # Performance throttled LocalStorage snapshot saver
    └── rng.ts              # mulberry32 seeded generator for reproducible runs
```

---

## 🛠️ Verification & Test Suite

The project includes strict verification scripts ensuring no regressions occur during development:

* **TypeScript type check**:
  ```bash
  npm run typecheck
  ```
* **Authoritative unit testing** (covers vector math, A* pathfinding, upgrade multipliers, resistances):
  ```bash
  npx tsx scripts/selftest.ts   # 33 passed, 0 failed
  ```
* **Save/Restore persistence round-trip check**:
  ```bash
  npx tsx scripts/save-restore-test.ts   # 23 passed, 0 failed
  ```

---

## 📜 License

This project is licensed under the MIT License - see the `LICENSE` file for details.
