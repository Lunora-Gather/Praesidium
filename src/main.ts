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

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const boot = document.getElementById('boot');
if (boot) boot.remove();

const renderer = new Renderer(canvas);
const input = new Input(canvas);
const audio = new Audio();
const state = new GameState();
const hud = new HUD();
const screens = new Screens();
const worldRenderer = new WorldRenderer();

let paused = false;
let hudRegions: HudRegions = { shop: [], buttons: [] };

// resume audio on first interaction (browser autoplay policy)
const resumeAudio = (): void => audio.resume();
window.addEventListener('pointerdown', resumeAudio, { once: true });
window.addEventListener('keydown', resumeAudio, { once: true });

window.addEventListener('resize', () => renderer.resize());

function handleHUDClick(x: number, y: number): void {
  const shopPick = hud.hitShop(hudRegions, x, y);
  if (shopPick) {
    state.selectedTowerId = shopPick;
    return;
  }
  const btn = hud.hitButton(hudRegions, x, y);
  if (btn === 'send') {
    state.waves.forceNext(state.grid, state.enemies);
    audio.waveStart();
  } else if (btn === 'pause') {
    paused = !paused;
  } else if (btn === 'menu') {
    state.phase = 'menu';
  }
}

function handleWorldClick(x: number, y: number): void {
  if (!state.selectedTowerId) return;
  // convert screen -> world (account for camera offset applied in WorldRenderer)
  const topBar = 48;
  const shopH = 64;
  const availW = renderer.width;
  const availH = renderer.height - topBar - shopH;
  const camX = (availW - state.grid.widthPx) / 2;
  const camY = topBar + Math.max(0, (availH - state.grid.heightPx) / 2);
  const wx = x - camX;
  const wy = y - camY;
  const { tx, ty } = state.grid.pixelToTile(wx, wy);
  if (tx < 0 || ty < 0 || tx >= state.grid.cols || ty >= state.grid.rows) return;
  if (state.tryPlace(tx, ty)) audio.place();
}

function handleMenuClick(action: MenuClickAction): void {
  if (action === 'start' || action === 'restart') {
    state.start();
    paused = false;
  } else if (action === 'resume') {
    paused = false;
  } else if (action === 'menu') {
    state.phase = 'menu';
  }
}

const update = (dt: number): void => {
  // track hover tile for placement preview
  if (state.phase === 'playing' && !paused) {
    const topBar = 48;
    const shopH = 64;
    const availW = renderer.width;
    const availH = renderer.height - topBar - shopH;
    const camX = (availW - state.grid.widthPx) / 2;
    const camY = topBar + Math.max(0, (availH - state.grid.heightPx) / 2);
    const wx = input.pointerX - camX;
    const wy = input.pointerY - camY;
    const { tx, ty } = state.grid.pixelToTile(wx, wy);
    if (tx >= 0 && ty >= 0 && tx < state.grid.cols && ty < state.grid.rows) {
      state.hoverTile = { tx, ty };
    } else {
      state.hoverTile = null;
    }

    // process clicks
    for (const c of input.clicks()) {
      if (c.y < 48) continue; // top bar no-op
      if (c.y > renderer.height - 64) handleHUDClick(c.x, c.y);
      else handleWorldClick(c.x, c.y);
    }

    if (input.wasKeyPressed('Space')) paused = !paused;
    if (input.wasKeyPressed('Escape')) state.phase = 'menu';

    if (!paused) state.update(dt);
  } else {
    // menu/pause/win/lose screens: handle clicks
    for (const c of input.clicks()) {
      const action = screens.hit(c.x, c.y);
      if (action) handleMenuClick(action);
    }
    if (state.phase === 'won') audio.win();
    if (state.phase === 'lost') audio.lose();
  }

  // keyboard shortcuts for tower shop (1..n)
  if (state.phase === 'playing' && !paused) {
    for (let i = 0; i < TOWER_LIST.length; i++) {
      if (input.wasKeyPressed(`Digit${i + 1}`)) state.selectedTowerId = TOWER_LIST[i].id;
    }
  }

  input.endFrame();
};

const render = (_alpha: number): void => {
  renderer.clear();
  if (state.phase === 'playing' || state.phase === 'won' || state.phase === 'lost') {
    worldRenderer.draw(renderer, state);
    hudRegions = hud.draw(renderer, state);
    if (paused && state.phase === 'playing') screens.draw(renderer, 'paused');
    if (state.phase === 'won') screens.draw(renderer, 'won', state.score);
    if (state.phase === 'lost') screens.draw(renderer, 'lost', state.score);
  } else {
    screens.draw(renderer, 'menu');
  }
};

new GameLoop(update, render).start();
