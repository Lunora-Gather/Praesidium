// Praesidium — entry point.
// wires engine (loop/input/renderer/audio) + game state + UI, handles clicks.

import { GameLoop } from './engine/GameLoop';
import { Input } from './engine/Input';
import { Renderer } from './engine/Renderer';
import { Audio } from './engine/Audio';
import { GameState } from './game/GameState';
import { HUD, HudRegions, TOP_H, BOT_H } from './ui/HUD';
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
import { dailySeed } from './utils/DailyChallenge';

// Global error boundary — prevents one unhandled error from crashing the entire game.
// Logs the error and shows a subtle red indicator instead of a blank screen.
window.addEventListener('error', (e) => {
  console.error('[Praesidium] Unhandled error:', e.error ?? e.message);
  const el = document.getElementById('err');
  const msg = document.getElementById('err-msg');
  if (el && msg) { msg.textContent = (e.error?.stack) ?? e.message ?? 'Error'; el.style.display = 'flex'; }
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Praesidium] Unhandled promise rejection:', e.reason);
  const el = document.getElementById('err');
  const msg = document.getElementById('err-msg');
  if (el && msg) { msg.textContent = (e.reason?.stack) ?? String(e.reason) ?? 'Promise rejected'; el.style.display = 'flex'; }
});

const canvas = document.getElementById('c') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas element #c not found in DOM');

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

interface Toast {
  title: string;
  desc: string;
  timer: number;
  maxTime: number;
}
let activeToasts: Toast[] = [];

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

// sync audio and music mute with stored settings
audio.setMuted(settings.get().muted);
music.setMuted(settings.get().muted);

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
state.bus.on('towerFire', ({ id }) => audio.shoot(id));
state.movement.bus.on('enemyReachedGoal', () => { audio.lifeLost(); renderer.shake(6); });
state.combat.bus.on('hit', (p) => { audio.hit(); state.particles.hit(new Vec2(p.x, p.y), '#fff'); state.particles.floatText(new Vec2(p.x, p.y - 10), `-${Math.round(p.damage)}`, '#ff8a65'); });
state.combat.bus.on('kill', (p) => { audio.enemyDie(); state.particles.death(new Vec2(p.x, p.y), p.enemy.color); const reward = Math.round(p.enemy.reward * state.talents.multiplier('gold') * state.diffMul.rewardMul); state.particles.floatText(new Vec2(p.x, p.y - 16), `+${reward}g`, '#ffd54f', 1.0); if (p.enemy.isBoss) renderer.shake(12); else renderer.shake(3); });
state.combat.bus.on('splash', (p) => {
  state.particles.burst(new Vec2(p.x, p.y), 14, '#ff8a65', 150, 0.5, 4);
  state.particles.shockwave(new Vec2(p.x, p.y), p.radius, '#ff8a65', 0.4);
  renderer.shake(5);
});
state.bus.on('phaseChanged', ({ to }) => {
  if (to === 'won') { audio.win(); music.stop(); state.clearSave(); }
  if (to === 'lost') { audio.lose(); music.stop(); state.clearSave(); }
  if (to === 'playing') { music.start(); music.setMuted(settings.get().muted); }
  if (to === 'menu' || to === 'levelSelect') music.stop();
});
state.bus.on('spellCast', ({ id }) => {
  audio.spellCast(id);
  if (id === 'meteor') {
    renderer.shake(16);
  } else if (id === 'freeze') {
    renderer.shake(8);
  }
});
// mid-run save on every wave boundary
state.bus.on('waveChanged', () => state.autoSave());
state.bus.on('achievementUnlocked', (ach) => {
  audio.achievement();
  activeToasts.push({
    title: ach.name,
    desc: ach.description,
    timer: 4.0,
    maxTime: 4.0
  });
});

function camOffset(): { camX: number; camY: number } {
  const availW = renderer.width;
  const availH = renderer.height - TOP_H - BOT_H;
  return {
    camX: (availW - state.grid.widthPx) / 2,
    camY: TOP_H + Math.max(0, (availH - state.grid.heightPx) / 2),
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

  // update achievement toasts
  for (const t of activeToasts) {
    t.timer -= dt;
  }
  activeToasts = activeToasts.filter(t => t.timer > 0);

  // settings overlay takes priority
  if (showSettings) {
    for (const c of input.clicks()) {
      const a = settingsScreen.hit(c.x, c.y);
      if (a) {
        const res = settingsScreen.apply(a);
        if (res === 'close') showSettings = false;
        audio.setMuted(settings.get().muted);
        music.setMuted(settings.get().muted);
      }
    }
    input.endFrame();
    return;
  }

  // stats overlay takes priority
  if (showStats) {
    for (const c of input.clicks()) {
      const action = statsScreen.hit(c.x, c.y);
      if (action) {
        if (action === 'menu') {
          state.goMenu();
          showStats = false;
        } else if (action === 'close') {
          showStats = false;
        } else {
          statsScreen.apply(action);
        }
      } else {
        showStats = false; // click outside close
      }
    }
    if (input.wasKeyPressed('Escape')) showStats = false;
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
      } else if (a === 'daily') {
        // daily challenge: same seed for everyone today, compete for highest wave
        state.endless = true;
        state.endlessSeed = dailySeed();
        state.selectLevel(0);
        paused = false;
      } else if (a === 'settings') {
        showSettings = true;
      } else if (a === 'stats') {
        showStats = true;
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

      if (c.y < TOP_H) continue; // top bar no-op
      if (c.y > renderer.height - BOT_H) handleHUDClick(c.x, c.y);
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
      if (a === 'challenge') {
        const seedHex = state.endlessSeed.toString(16).toUpperCase().padStart(8, '0');
        if (navigator.clipboard) {
          navigator.clipboard.writeText(seedHex)
            .then(() => {
              alert(t('share.copied').replace('{seed}', seedHex));
            })
            .catch(() => {
              window.prompt(t('share.prompt'), seedHex);
            });
        } else {
          window.prompt(t('share.prompt'), seedHex);
        }
      } else if (a) {
        handleMenuClick(a);
      }
    }
  }

  input.endFrame();
};

const render = (_alpha: number): void => {
  renderer.clear();
  renderer.updateShake();

  // Reset camera for background starfield (screen-space)
  renderer.camX = 0;
  renderer.camY = 0;
  if (state.phase === 'menu' || state.phase === 'levelSelect') starfield.draw(renderer);

  const { camX, camY } = camOffset();

  if (state.phase === 'playing' || state.phase === 'won' || state.phase === 'lost') {
    // Translate camera for world-space entities
    renderer.camX = camX;
    renderer.camY = camY;
    renderer.zoom = 1;
    worldRenderer.draw(renderer, state, settings.get());
    state.particles.draw(renderer);

    // Compute screen position of selected tower before resetting camera
    let towerScreenPos: Vec2 | null = null;
    if (state.selectedTower && state.phase === 'playing') {
      towerScreenPos = renderer.toScreen(state.selectedTower.pos);
    }

    // Reset camera for screen-space HUD and overlays
    renderer.camX = 0;
    renderer.camY = 0;

    hudRegions = hud.draw(renderer, state, gameSpeed, autoSend);
    drawSpells(renderer);
    
    if (towerScreenPos && state.selectedTower && state.phase === 'playing') {
      towerPanel.draw(renderer, state.selectedTower, state.gold, towerScreenPos.x, towerScreenPos.y);
    } else {
      towerPanel.clear();
    }
    
    if (state.phase === 'playing' && tutorial.active) drawTutorial(renderer, tutorial.active.text);
    if (showTalent && state.phase === 'playing') talentPanel.draw(renderer, state.talents);
    if (paused && state.phase === 'playing') screens.draw(renderer, 'paused');
    if (state.phase === 'won') screens.draw(renderer, 'won', state.score, 0, { stars: state.lastStars, kills: state.stats.get().kills, gold: state.stats.get().goldEarned });
    if (state.phase === 'lost') screens.draw(renderer, 'lost', state.score, state.endlessSeed, { wave: state.waves.current, kills: state.stats.get().kills });
    if (settings.get().showFps) renderer.text(`${state.fps} fps`, 8, 52, '#555', 11);
  } else {
    // Reset camera for pure menus and level select overlays
    renderer.camX = 0;
    renderer.camY = 0;
    renderer.zoom = 1;

    if (state.phase === 'levelSelect') {
      levelSelect.draw(renderer);
    } else {
      screens.draw(renderer, 'menu');
    }
  }

  // Stats & Settings screens are always screen space
  renderer.camX = 0;
  renderer.camY = 0;
  if (showStats) statsScreen.draw(renderer, state.analytics.get(), state.save);
  if (showSettings) settingsScreen.draw(renderer);

  // Render active toasts
  drawToasts(renderer);
};

function drawSpells(r: Renderer): void {
  // spell bar left of HUD buttons, bottom-right
  const slotW = 56;
  const gap = 6;
  const y = r.height - BOT_H + 8;
  let x = r.width - 16 - (slotW + gap) * state.spells.length;
  for (const sp of state.spells) {
    const ready = sp.ready && state.gold >= sp.def.cost;
    
    let bg: string | CanvasGradient;
    let border: string;
    if (ready) {
      bg = r.linearGradient(x, y, x, y + 48, [
        { offset: 0, color: 'rgba(30, 41, 59, 0.9)' },
        { offset: 1, color: 'rgba(15, 23, 42, 0.9)' }
      ]);
      border = '#fbbf24'; // glowing gold border
      r.setShadow('rgba(251, 191, 36, 0.35)', 8, 0, 0);
    } else {
      bg = 'rgba(15, 23, 42, 0.4)';
      border = 'rgba(255, 255, 255, 0.03)';
    }
    
    r.roundRect(x, y, slotW, 48, 6, bg, true, border, 1);
    r.clearShadow();
    
    r.text(sp.def.name, x + slotW / 2, y + 6, ready ? '#f8fafc' : '#475569', 11, 'center', 'bold');
    r.text(`${sp.def.cost}g`, x + slotW / 2, y + 26, ready ? '#fbbf24' : '#475569', 10, 'center', 'bold', 'top', 'header');
    
    if (!sp.ready) {
      const cdH = Math.round(48 * (sp.cooldown / sp.def.cooldown));
      // Cooldown semi-transparent overlay
      r.roundRect(x, y + 48 - cdH, slotW, cdH, 0, 'rgba(0, 0, 0, 0.65)', true);
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
  r.text(text, x + w / 2, y + h / 2, '#fff', 14, 'center', 'normal', 'middle');
}

function drawToasts(r: Renderer): void {
  const toastW = 280;
  const toastH = 50;
  const startX = 16;
  const bottomY = r.height - BOT_H - 16; // anchor above bottom shop

  for (let i = 0; i < activeToasts.length; i++) {
    const t = activeToasts[i];
    const targetY = bottomY - i * (toastH + 10) - toastH;

    // Slide in/out animation logic
    let slideX = startX;
    if (t.maxTime - t.timer < 0.4) {
      // Slide in from left
      const progress = (t.maxTime - t.timer) / 0.4; // 0 -> 1
      slideX = startX - toastW * (1 - progress);
    } else if (t.timer < 0.4) {
      // Slide out to left
      const progress = t.timer / 0.4; // 1 -> 0
      slideX = startX - toastW * (1 - progress);
    }

    // Draw Toast Card
    r.setShadow('rgba(251, 191, 36, 0.25)', 12, 0, 0);
    // Glass container with glowing gold border
    r.roundRect(slideX, targetY, toastW, toastH, 8, 'rgba(15, 23, 42, 0.95)', true, '#fbbf24', 1.5);
    r.clearShadow();

    // Text drawing: Orbitron title, Inter description
    r.text('🏆 ACHIEVEMENT UNLOCKED!', slideX + 12, targetY + 8, '#fbbf24', 9, 'left', 'bold', 'top', 'header');
    r.text(t.title, slideX + 12, targetY + 22, '#ffffff', 12, 'left', 'bold');
    r.text(t.desc, slideX + 12, targetY + 36, '#94a3b8', 9, 'left');
  }
}

const loop = new GameLoop(update, render);
loop.start();
logger.info('Praesidium booted');
