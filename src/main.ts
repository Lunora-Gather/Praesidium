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
import { getTowerDef } from './game/towers/TowerRegistry';
import { Tower } from './game/towers/Tower';
import { TowerPanel } from './ui/TowerPanel';
import { SettingsScreen } from './ui/SettingsScreen';
import { LevelSelect } from './ui/LevelSelect';
import { SettingsStore } from './config/Settings';
import { logger } from './utils/logger';
import { Music } from './engine/Music';
import { Tutorial } from './utils/Tutorial';
import { Vec2 } from './engine/math/Vec2';
import { Starfield } from './ui/Starfield';
import { t } from './utils/i18n';
import { TalentPanel } from './ui/TalentPanel';
import { StatsScreen } from './ui/StatsScreen';
import { loadRun } from './utils/RunSave';

// Global error boundary — prevents one unhandled error from crashing the entire game.
// Logs the error and shows a subtle red indicator instead of a blank screen.
window.addEventListener('error', (e) => {
  console.error('[Praesidium] Unhandled error:', e.error ?? e.message);
  const indicator = document.getElementById('err-indicator');
  if (indicator) indicator.textContent = '⚠ Error — see console';
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Praesidium] Unhandled promise rejection:', e.reason);
});

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
const starfield = new Starfield(140);
const talentPanel = new TalentPanel();
const statsScreen = new StatsScreen();

let paused = false;
let showSettings = false;
let hudRegions: HudRegions = { shop: [], buttons: [] };
let lastFpsUpdate = 0;
let frameCount = 0;
let placingMode = true;
let gameSpeed = 1;
let showTalent = false;
let showStats = false;
let autoSend = false;

// restore mid-run save if present (player closed tab mid-game)
const savedRun = loadRun();
if (savedRun && savedRun.v === 1) {
  state.setDifficulty(savedRun.difficulty as 'normal' | 'hard' | 'brutal');
  state.endless = savedRun.endless;
  state.endlessSeed = savedRun.endlessSeed;
  state.selectLevel(savedRun.levelIndex);
  state.gold = savedRun.gold;
  state.lives = savedRun.lives;
  state.score = savedRun.score;
  state.towers.length = 0;
  for (const td of savedRun.towers) {
    const def = getTowerDef(td.id);
    const t = new Tower(def, td.tx, td.ty, state.grid, { damage: td.dmgMul, range: td.rangeMul, firerate: td.fireRateMul });
    while (t.level < td.level && t.nextUpgrade) t.upgrade();
    t.strategy = td.strategy as 'first' | 'last' | 'strongest' | 'weakest' | 'closest';
    state.towers.push(t);
  }
  for (let i = 0; i < savedRun.spellCooldowns.length && i < state.spells.length; i++) {
    state.spells[i].cooldown = savedRun.spellCooldowns[i];
  }
  while (state.waves.current < savedRun.waveCurrent && state.waves.state !== 'done') {
    state.waves.forceNext();
  }
  paused = false;
  logger.info('Restored mid-run save', { level: savedRun.levelIndex + 1, wave: savedRun.waveCurrent });
}

// sync audio mute with stored setting
audio.setMuted(settings.get().muted);

// resume audio on first interaction (browser autoplay policy)
const resumeAudio = (): void => audio.resume();
window.addEventListener('pointerdown', resumeAudio, { once: true });
window.addEventListener('keydown', resumeAudio, { once: true });
window.addEventListener('resize', () => renderer.resize());
window.addEventListener('blur', () => {
  if (settings.get().pauseOnBlur && state.phase === 'playing') { paused = true; state.autoSave(); }
});
// auto-resume on focus so a returning player isn't stuck on the pause screen
// (tower defense is long-form; players tab out constantly — forcing a manual
// Resume click each time is a major流失点)
window.addEventListener('focus', () => {
  if (settings.get().pauseOnBlur && paused && state.phase === 'playing') paused = false;
});
// save on tab close/refresh so progress isn't lost
window.addEventListener('beforeunload', () => { if (state.phase === 'playing') state.autoSave(); });

// event bus -> audio + particles + music
state.bus.on('towerPlaced', () => audio.place());
state.bus.on('towerSold', () => audio.place());
state.bus.on('towerUpgraded', () => audio.place());
state.combat.bus.on('hit', (p) => { audio.hit(); state.particles.hit(new Vec2(p.x, p.y), '#fff'); state.particles.floatText(new Vec2(p.x, p.y - 10), `-${Math.round(p.damage)}`, '#ff8a65'); });
state.combat.bus.on('kill', (p) => { audio.enemyDie(); state.particles.death(new Vec2(p.x, p.y), p.enemy.color); const reward = Math.round(p.enemy.reward * state.talents.multiplier('gold') * state.diffMul.rewardMul); state.particles.floatText(new Vec2(p.x, p.y - 16), `+${reward}g`, '#ffd54f', 1.0); if (p.enemy.isBoss) renderer.shake(12); else renderer.shake(3); });
state.combat.bus.on('splash', (p) => { state.particles.burst(new Vec2(p.x, p.y), 14, '#ff8a65', 150, 0.5, 4); renderer.shake(5); });
state.bus.on('phaseChanged', ({ to }) => {
  if (to === 'won') { audio.win(); music.stop(); state.clearSave(); }
  if (to === 'lost') { audio.lose(); music.stop(); state.clearSave(); }
  if (to === 'playing') music.start();
  if (to === 'menu' || to === 'levelSelect') music.stop();
});
state.bus.on('spellCast', () => audio.waveStart());
// mid-run save on every wave boundary
state.bus.on('waveChanged', () => state.autoSave());

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
    if (state.waves.forceNext()) audio.waveStart();
  } else if (btn === 'pause') {
    paused = !paused;
  } else if (btn === 'speed') {
    gameSpeed = gameSpeed >= 3 ? 1 : gameSpeed + 1;
    loop.timeScale = gameSpeed;
  } else if (btn === 'talent') {
    showTalent = true;
  } else if (btn === 'stats') {
    showStats = true;
  } else if (btn === 'autoSend') {
    autoSend = !autoSend;
    state.waves.autoSend = autoSend;
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
  // starfield runs on every overlay screen (menu/levelSelect/won/lost)
  starfield.update(dt, renderer.width, renderer.height);

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
      else if (a.kind === 'level') { state.setDifficulty(levelSelect.selectedDiff); state.selectLevel(a.index); }
      else if (a.kind === 'diff') levelSelect.selectedDiff = a.diff;
    }
    input.endFrame();
    return;
  }

  if (state.phase === 'menu') {
    for (const c of input.clicks()) {
      const a = screens.hit(c.x, c.y);
      if (a === 'start') {
        state.endless = false;
        state.endlessSeed = 0;
        state.goLevelSelect();
      } else if (a === 'endless') {
        state.endless = true;
        state.endlessSeed = 0; // start() will pick a random seed
        state.selectLevel(0);
        paused = false;
      } else if (a === 'challenge') {
        // prompt for a shared endless seed (hex), then replay that exact run
        const raw = window.prompt(t('menu.challenge') + ' — hex seed (e.g. 1A2B3C4D):');
        if (raw != null) {
          const seed = parseInt(raw.trim(), 16) >>> 0;
          if (!Number.isNaN(seed) && seed !== 0) {
            state.endless = true;
            state.endlessSeed = seed;
            state.selectLevel(0);
            paused = false;
          }
        }
      }
    }
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
      // talent panel takes priority when open
      if (showTalent) {
        const tid = talentPanel.hit(c.x, c.y);
        if (tid) state.talents.rankUp(tid);
        else showTalent = false; // click outside closes
        continue;
      }
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
    if (input.wasKeyPressed('KeyT')) {
      if (showTalent) showTalent = false;
      else if (state.selectedTower) state.selectedTower.cycleStrategy();
    }
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
  renderer.updateShake();

  // starfield behind pure overlay screens (menu/levelSelect only;
  // won/lost still show the game world underneath)
  if (state.phase === 'menu' || state.phase === 'levelSelect') starfield.draw(renderer);

  const { camX, camY } = camOffset();
  renderer.camX = camX;
  renderer.camY = camY;
  renderer.zoom = 1;

  if (state.phase === 'playing' || state.phase === 'won' || state.phase === 'lost') {
    worldRenderer.draw(renderer, state, settings.get());
    state.particles.draw(renderer);
    hudRegions = hud.draw(renderer, state, gameSpeed, autoSend);
    drawSpells(renderer);
    if (state.selectedTower && state.phase === 'playing') {
      const s = renderer.toScreen(state.selectedTower.pos);
      towerPanel.draw(renderer, state.selectedTower, state.gold, s.x, s.y);
    } else {
      towerPanel.clear();
    }
    if (state.phase === 'playing' && tutorial.active) drawTutorial(renderer, tutorial.active.text);
    if (showTalent && state.phase === 'playing') talentPanel.draw(renderer, state.talents);
    if (showStats && state.phase === 'playing') statsScreen.draw(renderer, state.analytics.get());
    if (paused && state.phase === 'playing') screens.draw(renderer, 'paused');
    if (state.phase === 'won') screens.draw(renderer, 'won', state.score, 0, { stars: state.lastStars, kills: state.stats.get().kills, gold: state.stats.get().goldEarned });
    if (state.phase === 'lost') screens.draw(renderer, 'lost', state.score, state.endlessSeed, { wave: state.waves.current, kills: state.stats.get().kills });
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

const loop = new GameLoop(update, render);
loop.start();
logger.info('Praesidium booted');
