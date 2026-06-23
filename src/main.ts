// Praesidium — entry point.
// wires engine (loop/input/renderer/audio) + game state + UI, handles clicks.

import { GameLoop } from './engine/GameLoop';
import { Input } from './engine/Input';
import { Renderer } from './engine/Renderer';
import { Audio } from './engine/Audio';
import { GameState } from './game/GameState';
import { HUD, HudRegions } from './ui/HUD';
import { Screens, MenuClickAction } from './ui/Screens';
import { WorldRenderer } from './ui/WorldRenderer';
import { TOWER_LIST } from './game/towers/TowerRegistry';
import { TowerPanel } from './ui/TowerPanel';
import { SettingsScreen } from './ui/SettingsScreen';
import { LevelSelect } from './ui/LevelSelect';
import { SettingsStore } from './config/Settings';
import { logger } from './utils/logger';
import { Music } from './engine/Music';
import { Tutorial } from './utils/Tutorial';
import { Vec2 } from './engine/math/Vec2';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const boot = document.getElementById('boot');
if (boot) boot.remove();

const renderer = new Renderer(canvas);
const input = new Input(canvas);
const audio = new Audio();
const music = new Music();
const settings = new SettingsStore();
const state = new GameState();
const hud = new HUD();
const screens = new Screens();
const worldRenderer = new WorldRenderer();
const towerPanel = new TowerPanel();
const settingsScreen = new SettingsScreen(settings);
const levelSelect = new LevelSelect(state.levels, state.save);
const tutorial = new Tutorial();

let paused = false;
let showSettings = false;
let hudRegions: HudRegions = { shop: [], buttons: [] };
let lastFpsUpdate = 0;
let frameCount = 0;
let placingMode = true; // true=click places tower, false=click selects tower

// sync audio mute with stored setting
audio.setMuted(settings.get().muted);

// resume audio on first interaction (browser autoplay policy)
const resumeAudio = (): void => audio.resume();
window.addEventListener('pointerdown', resumeAudio, { once: true });
window.addEventListener('keydown', resumeAudio, { once: true });
window.addEventListener('resize', () => renderer.resize());
window.addEventListener('blur', () => {
  if (settings.get().pauseOnBlur && state.phase === 'playing') paused = true;
});

// event bus -> audio + particles + music
state.bus.on('towerPlaced', () => audio.place());
state.bus.on('towerSold', () => audio.place());
state.bus.on('towerUpgraded', () => audio.place());
state.combat.bus.on('hit', (p) => { audio.hit(); state.particles.hit(new Vec2(p.x, p.y), '#fff'); });
state.combat.bus.on('kill', (p) => { audio.enemyDie(); state.particles.death(new Vec2(p.x, p.y), p.enemy.color); });
state.combat.bus.on('splash', (p) => state.particles.burst(new Vec2(p.x, p.y), 14, '#ff8a65', 150, 0.5, 4));
state.bus.on('phaseChanged', ({ to }) => {
  if (to === 'won') { audio.win(); music.stop(); }
  if (to === 'lost') { audio.lose(); music.stop(); }
  if (to === 'playing') music.start();
  if (to === 'menu' || to === 'levelSelect') music.stop();
});
state.bus.on('spellCast', () => audio.waveStart());

function camOffset(): { camX: number; camY: number } {
  const topBar = 48;
  const shopH = 64;
  const availW = renderer.width;
  const availH = renderer.height - topBar - shopH;
  return {
    camX: (availW - state.grid.widthPx) / 2,
    camY: topBar + Math.max(0, (availH - state.grid.heightPx) / 2),
  };
}

function screenToWorld(sx: number, sy: number): { wx: number; wy: number } {
  const { camX, camY } = camOffset();
  return { wx: sx - camX, wy: sy - camY };
}

function handleHUDClick(x: number, y: number): void {
  const shopPick = hud.hitShop(hudRegions, x, y);
  if (shopPick) {
    state.selectedTowerId = shopPick;
    placingMode = true;
    state.selectedTower = null;
    return;
  }
  const btn = hud.hitButton(hudRegions, x, y);
  if (btn === 'send') {
    if (state.waves.forceNext(state.grid, state.enemies)) audio.waveStart();
  } else if (btn === 'pause') {
    paused = !paused;
  } else if (btn === 'menu') {
    state.goMenu();
  } else if (btn === 'settings') {
    showSettings = true;
  }
}

function handleWorldClick(x: number, y: number): void {
  const { wx, wy } = screenToWorld(x, y);
  const { tx, ty } = state.grid.pixelToTile(wx, wy);
  if (tx < 0 || ty < 0 || tx >= state.grid.cols || ty >= state.grid.rows) {
    state.selectedTower = null;
    return;
  }

  // if a tower panel is open, check its buttons first
  if (state.selectedTower) {
    const panelAction = towerPanel.hit(x, y);
    if (panelAction === 'upgrade') {
      state.upgradeTower(state.selectedTower);
      return;
    }
    if (panelAction === 'sell') {
      state.sellTower(state.selectedTower);
      return;
    }
  }

  // click on an existing tower -> select it (upgrade/sell panel)
  const existing = state.towers.find((t) => t.tx === tx && t.ty === ty);
  if (existing) {
    state.selectedTower = existing;
    placingMode = false;
    return;
  }

  // otherwise try to place
  if (placingMode && state.tryPlace(tx, ty)) {
    // audio handled via bus
  }
}

function handleMenuClick(action: MenuClickAction): void {
  if (action === 'start') {
    state.selectLevel(0);
    paused = false;
  } else if (action === 'restart') {
    state.start();
    paused = false;
  } else if (action === 'resume') {
    paused = false;
  } else if (action === 'menu') {
    state.goMenu();
  }
}

const update = (dt: number): void => {
  // FPS counter
  frameCount++;
  lastFpsUpdate += dt;
  if (lastFpsUpdate >= 0.5) {
    state.fps = Math.round(frameCount / lastFpsUpdate);
    frameCount = 0;
    lastFpsUpdate = 0;
  }

  // settings overlay takes priority
  if (showSettings) {
    for (const c of input.clicks()) {
      const a = settingsScreen.hit(c.x, c.y);
      if (a) {
        const res = settingsScreen.apply(a);
        if (res === 'close') showSettings = false;
        audio.setMuted(settings.get().muted);
      }
    }
    input.endFrame();
    return;
  }

  if (state.phase === 'levelSelect') {
    for (const c of input.clicks()) {
      const a = levelSelect.hit(c.x, c.y);
      if (!a) continue;
      if (a.kind === 'back') state.goMenu();
      else if (a.kind === 'level') state.selectLevel(a.index);
    }
    input.endFrame();
    return;
  }

  if (state.phase === 'menu') {
    for (const c of input.clicks()) {
      const a = screens.hit(c.x, c.y);
      if (a === 'start') {
        state.goLevelSelect();
      } else if (a === 'restart') {
        state.start();
      }
    }
    if (input.wasKeyPressed('Escape')) {/* no-op */}
    input.endFrame();
    return;
  }

  if (state.phase === 'playing') {
    // hover tile
    const { wx, wy } = screenToWorld(input.pointerX, input.pointerY);
    const { tx, ty } = state.grid.pixelToTile(wx, wy);
    state.hoverTile =
      tx >= 0 && ty >= 0 && tx < state.grid.cols && ty < state.grid.rows ? { tx, ty } : null;

    for (const c of input.clicks()) {
      if (c.y < 48) continue; // top bar no-op
      if (c.y > renderer.height - 64) handleHUDClick(c.x, c.y);
      else if (state.selectedSpellId) {
        const { wx, wy } = screenToWorld(c.x, c.y);
        state.castSpell(state.selectedSpellId, new Vec2(wx, wy));
        state.selectedSpellId = null;
      } else handleWorldClick(c.x, c.y);
    }

    if (input.wasKeyPressed('Space')) paused = !paused;
    if (input.wasKeyPressed('Escape')) {
      if (state.selectedSpellId) state.selectedSpellId = null;
      else if (state.selectedTower) state.selectedTower = null;
      else state.goMenu();
    }
    if (input.wasKeyPressed('KeyS') && state.selectedTower) state.sellTower(state.selectedTower);
    if (input.wasKeyPressed('KeyU') && state.selectedTower) state.upgradeTower(state.selectedTower);
    if (input.wasKeyPressed('KeyT') && state.selectedTower) state.selectedTower.cycleStrategy();
    for (let i = 0; i < TOWER_LIST.length; i++) {
      if (input.wasKeyPressed(`Digit${i + 1}`)) {
        state.selectedTowerId = TOWER_LIST[i].id;
        placingMode = true;
        state.selectedTower = null;
      }
    }
    // spell hotkeys Q/W/E
    const spellKeys = ['KeyQ', 'KeyW', 'KeyE'];
    for (let i = 0; i < spellKeys.length && i < state.spells.length; i++) {
      if (input.wasKeyPressed(spellKeys[i])) state.selectedSpellId = state.spells[i].def.id;
    }

    if (!paused) {
      state.update(dt);
      tutorial.update(state);
    }
  } else {
    // won/lost
    for (const c of input.clicks()) {
      const a = screens.hit(c.x, c.y);
      if (a) handleMenuClick(a);
    }
  }

  input.endFrame();
};

const render = (_alpha: number): void => {
  renderer.clear();
  const { camX, camY } = camOffset();
  renderer.camX = camX;
  renderer.camY = camY;
  renderer.zoom = 1;

  if (state.phase === 'playing' || state.phase === 'won' || state.phase === 'lost') {
    worldRenderer.draw(renderer, state, settings.get());
    state.particles.draw(renderer);
    hudRegions = hud.draw(renderer, state);
    drawSpells(renderer);
    if (state.selectedTower && state.phase === 'playing') {
      const s = renderer.toScreen(state.selectedTower.pos);
      towerPanel.draw(renderer, state.selectedTower, state.gold, s.x, s.y);
    } else {
      towerPanel.clear();
    }
    if (state.phase === 'playing' && tutorial.active) drawTutorial(renderer, tutorial.active.text);
    if (paused && state.phase === 'playing') screens.draw(renderer, 'paused');
    if (state.phase === 'won') screens.draw(renderer, 'won', state.score);
    if (state.phase === 'lost') screens.draw(renderer, 'lost', state.score);
    if (settings.get().showFps) renderer.text(`${state.fps} fps`, 8, 52, '#555', 11);
  } else if (state.phase === 'levelSelect') {
    levelSelect.draw(renderer);
  } else {
    screens.draw(renderer, 'menu');
  }

  if (showSettings) settingsScreen.draw(renderer);
};

function drawSpells(r: Renderer): void {
  // spell bar left of HUD buttons, bottom-right
  const slotW = 56;
  const gap = 6;
  const y = r.height - 64 + 8;
  let x = r.width - 16 - (slotW + gap) * state.spells.length;
  for (const sp of state.spells) {
    const ready = sp.ready && state.gold >= sp.def.cost;
    r.rect(x, y, slotW, 48, ready ? '#1f2937' : '#0d1320', true);
    r.rect(x, y, slotW, 48, ready ? '#3a506b' : '#1a1a1a', false);
    r.text(sp.def.name, x + slotW / 2, y + 6, ready ? '#fff' : '#555', 11, 'center');
    r.text(`${sp.def.cost}g`, x + slotW / 2, y + 26, ready ? '#ffd54f' : '#555', 10, 'center');
    if (!sp.ready) {
      const cdH = Math.round(48 * (sp.cooldown / sp.def.cooldown));
      r.rect(x, y + 48 - cdH, slotW, cdH, '#00000088', true);
    }
    x += slotW + gap;
  }
}

function drawTutorial(r: Renderer, text: string): void {
  const w = 420;
  const h = 44;
  const x = (r.width - w) / 2;
  const y = 60;
  r.rect(x, y, w, h, '#1f6febcc', true);
  r.text(text, x + w / 2, y + 14, '#fff', 14, 'center');
}

new GameLoop(update, render).start();
logger.info('Praesidium booted');
