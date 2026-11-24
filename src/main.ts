// Praesidium — entry point.
// wires engine (loop/input/renderer/audio) + game state + UI, handles clicks.

import { GameLoop } from './engine/GameLoop';
import { Input } from './engine/Input';
import { Renderer } from './engine/Renderer';
import { Audio } from './engine/Audio';
import { GameState } from './game/GameState';
import { HUD, HudRegions, TOP_H, BOT_H } from './ui/HUD';
import { Screens, MenuClickAction, ScreenStats } from './ui/Screens';
import { WorldRenderer } from './ui/WorldRenderer';
import { getTowerDef, TOWER_LIST } from './game/towers/TowerRegistry';
import { TowerPanel } from './ui/TowerPanel';
import { SettingsScreen } from './ui/SettingsScreen';
import { LevelSelect } from './ui/LevelSelect';
import { SettingsStore } from './config/Settings';
import { logger } from './utils/logger';
import { Music } from './engine/Music';
import { Tutorial, type TutorialAction } from './utils/Tutorial';
import { Vec2 } from './engine/math/Vec2';
import { Starfield } from './ui/Starfield';
import { setLocale, t } from './utils/i18n';
import { achievementDescription, achievementName, spellName, towerName } from './utils/displayText';
import { TalentPanel } from './ui/TalentPanel';
import { StatsScreen } from './ui/StatsScreen';
import { CodexScreen } from './ui/CodexScreen';
import { ProgressController } from './ui/ProgressController';
import { OperationsBrief } from './ui/OperationsBrief';
import { encodeChallenge } from './utils/ChallengeCode';
import { ChallengeDialog } from './ui/ChallengeDialog';
import { buildPlaytestReport, formatPlaytestReport } from './utils/PlaytestReport';
import { battleLayout, type BattleLayout } from './ui/BattleLayout';
import { drawWeeklyRunBadge } from './ui/WeeklyRunBadge';
import { ControlFocus, type FocusRegion } from './ui/ControlFocus';
import { TileType } from './game/grid/Level';

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
setLocale(settings.get().locale);
const progress = new ProgressController();
const state = new GameState(progress);
const hud = new HUD();
const operations = new OperationsBrief(() => {
  tutorial.reset();
  announcement.textContent = t('tutorial.restarted');
});
const battleStatus = document.getElementById('battle-status')!;
const gameReading = document.getElementById('game-reading')!;
const announcement = document.getElementById('game-announcement')!;
const screens = new Screens();
const worldRenderer = new WorldRenderer();
const towerPanel = new TowerPanel();
const settingsScreen = new SettingsScreen(settings);
const levelSelect = new LevelSelect(state.levels, state.save);
const tutorial = new Tutorial();
const starfield = new Starfield(140);
const talentPanel = new TalentPanel();
const statsScreen = new StatsScreen();
const codexScreen = new CodexScreen();
const challengeDialog = new ChallengeDialog(code => {
  progress.start(() => {
    if ('difficulty' in code) state.startSharedChallenge(code);
    else state.startEndless(code.seed);
  });
});

interface RectRegion { x: number; y: number; w: number; h: number; }

let paused = false;
let showSettings = false;
let hudRegions: HudRegions = { topHeight: TOP_H, shop: [], buttons: [] };
let spellRegions: Array<FocusRegion & { spellId: string }> = [];
let cancelPlacementRegion: FocusRegion | null = null;
let lastFpsUpdate = performance.now();
let frameCount = 0;
let placingMode = true;
let touchPlacement: { tx: number; ty: number; towerId: string } | null = null;
let gameSpeed = 1;
let gameReady = false;
let lastCanvasDraw = -Infinity;
let showTalent = false;
let showStats = false;
let showCodex = false;
let resumeOnFocus = false;
let saveOnWave = false;
let battleCamera = { x: 0, y: 0, zoom: 1 };
const keyboardTile = { tx: 1, ty: 1 };
const controlFocus = new ControlFocus(
  region => input.activateAt(region.x + region.w / 2, region.y + region.h / 2, region.board === true),
  (dx, dy) => {
    keyboardTile.tx = Math.max(0, Math.min(state.grid.cols - 1, keyboardTile.tx + dx));
    keyboardTile.ty = Math.max(0, Math.min(state.grid.rows - 1, keyboardTile.ty + dy));
    syncControlFocus();
  },
);

interface Toast { title: string; desc: string; timer: number; maxTime: number; }
let activeToasts: Toast[] = [];

audio.setMuted(settings.get().muted);
music.setMuted(settings.get().muted);

const resumeAudio = (): void => audio.resume();
let resizeFrame = 0;
const scheduleResize = (): void => {
  if (resizeFrame !== 0) return;
  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = 0;
    touchPlacement = null;
    renderer.resize();
  });
};
window.addEventListener('pointerdown', resumeAudio, { once: true });
window.addEventListener('keydown', resumeAudio, { once: true });
window.addEventListener('resize', scheduleResize);
window.addEventListener('blur', () => {
  if (state.phase !== 'playing') return;
  if (settings.get().pauseOnBlur && !paused) {
    paused = true;
    resumeOnFocus = true;
  }
  state.autoSave();
});
window.addEventListener('focus', () => {
  if (resumeOnFocus && state.phase === 'playing') paused = false;
  resumeOnFocus = false;
});
window.addEventListener('pagehide', () => state.autoSave());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    state.autoSave();
    if (gameReady) loop.stop();
  } else if (gameReady) loop.start();
});

state.bus.on('towerPlaced', () => {
  audio.place();
  saveOnWave = true;
  tutorialAction('place');
  state.recordFirstAction('tower');
});
state.bus.on('towerSold', () => { audio.place(); saveOnWave = true; });
state.bus.on('towerUpgraded', () => { audio.place(); saveOnWave = true; tutorialAction('upgrade'); });
state.bus.on('towerFire', ({ id }) => audio.shoot(id));
state.movement.bus.on('enemyReachedGoal', () => { audio.lifeLost(); renderer.shake(6); });
state.combat.bus.on('hit', (p) => { audio.hit(); state.particles.hit(new Vec2(p.x, p.y), '#fff'); state.particles.floatText(new Vec2(p.x, p.y - 10), `-${Math.round(p.damage)}`, '#ff8a65'); });
state.combat.bus.on('kill', (p) => {
  audio.enemyDie();
  const pos = new Vec2(p.x, p.y);
  if (p.enemy.isBoss) state.particles.bossDeath(pos, p.enemy.color);
  else state.particles.death(pos, p.enemy.color);
  state.particles.floatText(new Vec2(p.x, p.y - 16), `+${p.reward}g`, '#ffd54f', 1.0);
  if (p.enemy.isBoss) renderer.shake(18); else renderer.shake(3);
});
state.combat.bus.on('splash', (p) => {
  state.particles.burst(new Vec2(p.x, p.y), 14, '#ff8a65', 150, 0.5, 4);
  state.particles.shockwave(new Vec2(p.x, p.y), p.radius, '#ff8a65', 0.4);
  renderer.shake(5);
});
state.combat.bus.on('arc', ({ from, to, color }) => state.particles.arc(from, to, color));
state.bus.on('phaseChanged', ({ to }) => {
  touchPlacement = null;
  if (to === 'won' || to === 'lost') {
    announcement.textContent = `${t(to === 'won' ? 'win.title' : 'lose.title')}. ${t('hud.score')} ${state.score}.`;
    if (to === 'won') audio.win(); else audio.lose();
    music.stop();
  }
  if (to === 'playing') {
    paused = false;
    resumeOnFocus = false;
    placingMode = true;
    music.start();
    music.setMuted(settings.get().muted);
  }
  if (to === 'menu' || to === 'levelSelect') music.stop();
});
state.bus.on('runStarted', () => {
  touchPlacement = null;
  paused = false;
  resumeOnFocus = false;
  saveOnWave = false;
  placingMode = true;
  showTalent = false;
  keyboardTile.tx = 1;
  keyboardTile.ty = 1;
  gameSpeed = 1;
  loop.timeScale = 1;
});
state.bus.on('spellCast', ({ id, x, y }) => {
  audio.spellCast(id);
  saveOnWave = true;
  tutorialAction('spell');
  state.recordFirstAction('spell');
  const target = new Vec2(x, y);
  if (id === 'meteor') {
    state.particles.meteorImpact(target, 110);
    renderer.shake(18);
  } else if (id === 'freeze') {
    state.particles.freezePulse(target, Math.max(state.grid.widthPx, state.grid.heightPx) * 0.78);
    renderer.shake(9);
  } else if (id === 'repair') {
    state.particles.repairPulse(target);
    renderer.shake(5);
  }
});
state.bus.on('waveChanged', ({ current }) => {
  saveOnWave = true;
  announcement.textContent = t('controls.waveAnnounce').replace('{wave}', String(current));
});
state.bus.on('achievementUnlocked', (ach) => {
  audio.achievement();
  activeToasts.push({
    title: achievementName(ach.id, ach.name),
    desc: achievementDescription(ach.id, ach.description),
    timer: 4.0,
    maxTime: 4.0,
  });
});

function screenToWorld(sx: number, sy: number): { wx: number; wy: number } {
  const { x, y, zoom } = battleCamera;
  return { wx: (sx - x) / zoom, wy: (sy - y) / zoom };
}

function hitRegion(region: RectRegion | null, x: number, y: number): boolean {
  return !!region && x >= region.x && x <= region.x + region.w && y >= region.y && y <= region.y + region.h;
}

function hitSpell(x: number, y: number): string | null {
  for (const region of spellRegions) if (x >= region.x && x <= region.x + region.w && y >= region.y && y <= region.y + region.h) return region.spellId;
  return null;
}

function selectSpell(id: string): void {
  touchPlacement = null;
  if (state.selectedSpellId === id) {
    state.selectedSpellId = null;
    return;
  }
  const spell = state.spells.find(candidate => candidate.def.id === id);
  if (!spell?.canCast(state)) return;
  state.selectedSpellId = id;
  placingMode = false;
  state.selectedTower = null;
}

function tutorialAction(action: TutorialAction): void {
  if (state.runOrigin.kind === 'campaign' && state.levels.levelNumber <= 2) tutorial.record(action);
}

function openCodex(): void {
  showCodex = true;
  tutorialAction('intel');
  state.recordFirstAction('intel');
}

function handleHUDClick(x: number, y: number): void {
  const shopPick = hud.hitShop(hudRegions, x, y);
  if (shopPick) {
    touchPlacement = null;
    state.selectedTowerId = shopPick;
    tutorialAction('select');
    placingMode = true;
    state.selectedTower = null;
    state.selectedSpellId = null;
    return;
  }
  const btn = hud.hitButton(hudRegions, x, y);
  if (btn === 'send' && state.waves.forceNext()) {
    audio.waveStart();
    tutorialAction('wave');
    state.recordFirstAction('wave');
  }
  else if (btn === 'pause') paused = !paused;
  else if (btn === 'speed') { gameSpeed = gameSpeed >= 3 ? 1 : gameSpeed + 1; loop.timeScale = gameSpeed; }
  else if (btn === 'talent') showTalent = true;
  else if (btn === 'stats') showStats = true;
  else if (btn === 'codex') openCodex();
  else if (btn === 'autoSend') state.waves.autoSend = !state.waves.autoSend;
  else if (btn === 'menu') state.goMenu();
  else if (btn === 'settings') showSettings = true;
  else if (btn === 'brief') operations.open(state);
}

function handleWorldClick(x: number, y: number, touch = false): void {
  if (state.selectedTower) {
    const panelAction = towerPanel.hit(x, y);
    if (panelAction === 'upgrade') { state.upgradeTower(state.selectedTower); return; }
    if (panelAction === 'sell') { state.sellTower(state.selectedTower); return; }
    if (panelAction === 'target') { state.selectedTower.cycleStrategy(); return; }
    if (towerPanel.contains(x, y)) return;
  }
  handleBoardClick(x, y, touch);
}

function handleBoardClick(x: number, y: number, touch = false): void {
  const { wx, wy } = screenToWorld(x, y);
  const { tx, ty } = state.grid.pixelToTile(wx, wy);
  if (tx < 0 || ty < 0 || tx >= state.grid.cols || ty >= state.grid.rows) { touchPlacement = null; state.selectedTower = null; return; }
  if (state.selectedSpellId) {
    state.castSpell(state.selectedSpellId, new Vec2(wx, wy));
    state.selectedSpellId = null;
    return;
  }
  const existing = state.towers.find((tower) => tower.tx === tx && tower.ty === ty);
  if (existing) { tutorialAction('inspect'); touchPlacement = null; state.selectedTower = existing; placingMode = false; state.selectedSpellId = null; return; }
  state.selectedTower = null;
  const towerId = state.selectedTowerId;
  if (!placingMode || !towerId) return;
  if (touch && state.grid.tile * battleCamera.zoom < 28) {
    if (!state.canPlaceTower(tx, ty, getTowerDef(towerId))) { touchPlacement = null; return; }
    if (touchPlacement?.tx !== tx || touchPlacement.ty !== ty || touchPlacement.towerId !== towerId) {
      touchPlacement = { tx, ty, towerId };
      return;
    }
  }
  touchPlacement = null;
  state.tryPlace(tx, ty);
}

function handleMenuClick(action: MenuClickAction): void {
  if (action === 'start') progress.start(() => state.selectLevel(0));
  else if (action === 'restart') progress.start(() => state.restart());
  else if (action === 'next') progress.start(() => state.advanceLevel());
  else if (action === 'levels') { state.goLevelSelect(); paused = false; }
  else if (action === 'resume') paused = false;
  else if (action === 'menu') state.goMenu();
  else if (action === 'share') challengeDialog.open(encodeChallenge(state.challengeRules));
  else if (action === 'settings') showSettings = true;
  else if (action === 'brief') operations.open(state);
  else if (action === 'stats') showStats = true;
  else if (action === 'codex') openCodex();
  else if (action === 'talent') showTalent = true;
}

function buildRunSummary(extra: Partial<ScreenStats> = {}): ScreenStats {
  const run = state.stats.get();
  return {
    wave: state.waves.current,
    kills: run.kills,
    gold: run.goldEarned,
    lives: state.lives,
    towersPlaced: run.towersPlaced,
    upgrades: run.upgrades,
    spellsCast: run.spellsCast,
    damageDealt: run.damageDealt,
    durationSec: state.analytics.activeSeconds,
    hasNextLevel: state.levels.hasNext,
    isNewHighScore: state.lastRunNewHighScore,
    isNewLevelScore: state.lastRunNewLevelScore,
    isStarUpgrade: state.lastRunStarUpgrade,
    isNewEndlessRecord: state.lastRunNewEndlessRecord,
    isNewDailyRecord: state.lastRunNewDailyRecord,
    isNewModeRecord: state.lastRunNewModeRecord,
    missionCredits: state.lastRunMissionCredits,
    weeklyCredits: state.lastRunWeeklyCredits,
    missionDate: state.lastMissionDate ?? undefined,
    missionEligible: state.runOrigin.kind !== 'custom' && state.runOrigin.kind !== 'legacy',
    ...extra,
  };
}

function exportPlaytestReport(): void {
  const report = buildPlaytestReport(state.analytics.get(), state.save.get());
  const text = formatPlaytestReport(report);
  const fileName = `praesidium-playtest-report-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  if (navigator.clipboard) void navigator.clipboard.writeText(text).catch(() => undefined);
  activeToasts.push({ title: t('health.exported'), desc: fileName, timer: 3.2, maxTime: 3.2 });
}

const update = (dt: number): void => {
  if (!settings.get().reducedMotion && (state.phase === 'menu' || state.phase === 'levelSelect')) starfield.update(dt, renderer.width, renderer.height);

  for (const toast of activeToasts) toast.timer -= dt;
  activeToasts = activeToasts.filter(toast => toast.timer > 0);

  if (challengeDialog.isOpen || operations.isOpen || progress.blocksInput) {
    input.endFrame();
    return;
  }

  if (showSettings) {
    if (input.wasKeyPressed('Escape')) showSettings = false;
    for (const c of input.clicks()) {
      const a = settingsScreen.hit(c.x, c.y);
      if (a) {
        const res = settingsScreen.apply(a);
        if (res === 'close') showSettings = false;
        if (res === 'progress') progress.manage();
        audio.setMuted(settings.get().muted);
        music.setMuted(settings.get().muted);
      }
    }
    input.endFrame();
    return;
  }

  if (showCodex) {
    for (const c of input.clicks()) {
      const action = codexScreen.hit(c.x, c.y);
      if (action) { const res = codexScreen.apply(action); if (res === 'close') showCodex = false; }
      else showCodex = false;
    }
    if (input.wasKeyPressed('Escape')) showCodex = false;
    input.endFrame();
    return;
  }

  if (showStats) {
    for (const c of input.clicks()) {
      const action = statsScreen.hit(c.x, c.y);
      if (action) {
        if (action === 'menu') { state.goMenu(); showStats = false; }
        else if (action === 'close') showStats = false;
        else if (action === 'export_report') exportPlaytestReport();
        else statsScreen.apply(action);
      } else showStats = false;
    }
    if (input.wasKeyPressed('Escape')) showStats = false;
    input.endFrame();
    return;
  }

  if (showTalent) {
    for (const c of input.clicks()) {
      const id = talentPanel.hit(c.x, c.y);
      if (id && id !== 'close') progress.buyTalent(id, () => tutorialAction('talent'));
      else showTalent = false;
    }
    if (input.wasKeyPressed('Escape') || input.wasKeyPressed('KeyT')) showTalent = false;
    input.endFrame();
    return;
  }

  if (paused && state.phase === 'playing') {
    for (const c of input.clicks()) {
      const a = screens.hit(c.x, c.y);
      if (a) handleMenuClick(a);
    }
    if (input.wasKeyPressed('Space')) paused = false;
    if (input.wasKeyPressed('Escape')) paused = false;
    input.endFrame();
    return;
  }

  if (state.phase === 'levelSelect') {
    for (const c of input.clicks()) {
      const a = levelSelect.hit(c.x, c.y);
      if (!a) continue;
      if (a.kind === 'back') state.goMenu();
      else if (a.kind === 'level') progress.start(() => { state.setDifficulty(levelSelect.selectedDiff); state.selectLevel(a.index); });
      else if (a.kind === 'diff') levelSelect.selectedDiff = a.diff;
    }
    input.endFrame();
    return;
  }

  if (state.phase === 'menu') {
    for (const c of input.clicks()) {
      const a = screens.hit(c.x, c.y);
      if (a === 'start') { state.endless = false; state.endlessSeed = 0; state.goLevelSelect(); }
      else if (a === 'continue') progress.resume();
      else if (a === 'endless') progress.start(() => state.startEndless());
      else if (a === 'challenge') challengeDialog.open();
      else if (a === 'daily') progress.start(() => state.startDaily());
      else if (a === 'weekly') progress.start(() => state.startWeekly());
      else if (a === 'settings') showSettings = true;
      else if (a === 'stats') showStats = true;
      else if (a === 'brief') operations.open(state);
    }
    input.endFrame();
    return;
  }

  if (state.phase === 'playing') {
    const { wx, wy } = screenToWorld(input.pointerX, input.pointerY);
    const { tx, ty } = state.grid.pixelToTile(wx, wy);
    state.hoverTile = touchPlacement ?? (placingMode && tx >= 0 && ty >= 0 && tx < state.grid.cols && ty < state.grid.rows ? { tx, ty } : null);

    for (const c of input.clicks()) {
      if (c.board) { handleBoardClick(c.x, c.y); continue; }
      if (state.selectedTower && towerPanel.contains(c.x, c.y)) { handleWorldClick(c.x, c.y); continue; }
      if (hitRegion(cancelPlacementRegion, c.x, c.y)) { touchPlacement = null; placingMode = false; state.selectedTower = null; state.selectedSpellId = null; continue; }
      const clickedSpell = hitSpell(c.x, c.y);
      if (clickedSpell) { selectSpell(clickedSpell); continue; }
      if (c.y < hudRegions.topHeight) { handleHUDClick(c.x, c.y); continue; }
      if (c.y > renderer.height - BOT_H) handleHUDClick(c.x, c.y);
      else handleWorldClick(c.x, c.y, c.touch);
    }

    if (input.wasKeyPressed('Space')) paused = !paused;
    if (input.wasKeyPressed('Escape')) {
      touchPlacement = null;
      if (state.selectedSpellId) state.selectedSpellId = null;
      else if (state.selectedTower) state.selectedTower = null;
      else if (placingMode) placingMode = false;
      else state.goMenu();
    }
    if (input.wasKeyPressed('KeyS') && state.selectedTower) state.sellTower(state.selectedTower);
    if (input.wasKeyPressed('KeyU') && state.selectedTower) state.upgradeTower(state.selectedTower);
    if (input.wasKeyPressed('KeyT') && state.selectedTower) state.selectedTower.cycleStrategy();
    for (let i = 0; i < TOWER_LIST.length; i++) {
      if (input.wasKeyPressed(`Digit${i + 1}`)) { tutorialAction('select'); touchPlacement = null; state.selectedTowerId = TOWER_LIST[i].id; placingMode = true; state.selectedTower = null; state.selectedSpellId = null; }
    }
    const spellKeys = ['KeyQ', 'KeyW', 'KeyE'];
    for (let i = 0; i < spellKeys.length && i < state.spells.length; i++) {
      if (input.wasKeyPressed(spellKeys[i])) selectSpell(state.spells[i].def.id);
    }

    if (!paused && !showTalent && !showCodex && !showSettings && !showStats) {
      state.update(dt);
      if (saveOnWave) {
        saveOnWave = false;
        state.autoSave();
      }
      tutorial.update(state);
    }
  } else {
    for (const c of input.clicks()) {
      const a = screens.hit(c.x, c.y);
      if (a) handleMenuClick(a);
    }
  }

  input.endFrame();
};

function liveBattle(): boolean {
  return state.phase === 'playing' && !paused && !showSettings && !showCodex && !showStats && !showTalent
    && !operations.isOpen && !challengeDialog.isOpen && !progress.blocksInput;
}

const render = (_alpha: number): void => {
  const now = performance.now();
  const resting = paused || showSettings || showCodex || showStats || showTalent || operations.isOpen || challengeDialog.isOpen || progress.blocksInput;
  const interval = liveBattle() ? 0 : resting || state.phase === 'won' || state.phase === 'lost' ? 1000 / 24 : 1000 / 30;
  if (now - lastCanvasDraw < interval - 1) return;
  lastCanvasDraw = now;
  frameCount++;
  const elapsed = now - lastFpsUpdate;
  if (elapsed >= 500) {
    state.fps = Math.round(frameCount * 1000 / elapsed);
    lastFpsUpdate = now;
    frameCount = 0;
  }
  renderer.reducedMotion = settings.get().reducedMotion;
  renderer.clear();
  renderer.updateShake();

  renderer.camX = 0;
  renderer.camY = 0;
  renderer.zoom = 1;
  if (state.phase === 'menu' || state.phase === 'levelSelect') starfield.draw(renderer);

  if (state.phase === 'playing' || state.phase === 'won' || state.phase === 'lost') {
    const layout = battleLayout(renderer.width, renderer.height, state.grid.widthPx, state.grid.heightPx);
    const { x, y, zoom } = layout.camera;
    const shake = renderer.shakeOffset;
    battleCamera = { x: x + shake.x * zoom, y: y + shake.y * zoom, zoom };
    renderer.camX = battleCamera.x;
    renderer.camY = battleCamera.y;
    renderer.zoom = zoom;
    worldRenderer.draw(renderer, state, settings.get());
    if (!renderer.reducedMotion) state.particles.draw(renderer);

    let towerScreenPos: Vec2 | null = null;
    if (state.selectedTower && state.phase === 'playing') towerScreenPos = renderer.toScreen(state.selectedTower.pos);

    renderer.camX = 0;
    renderer.camY = 0;
    renderer.zoom = 1;

    const placingTower = state.phase === 'playing' && placingMode && !state.selectedTower && !state.selectedSpellId;
    const tutorialStep = state.phase === 'playing' && !touchPlacement ? tutorial.active : null;
    hudRegions = hud.draw(renderer, state, gameSpeed, state.waves.autoSend, layout.shopRight, !tutorialStep && !placingTower);
    drawWeeklyRunBadge(renderer, state);
    drawBattleTools(renderer, layout.tools);
    if (placingTower && !tutorialStep) drawPlacementHint(renderer, layout.infoHeight);

    if (towerScreenPos && state.selectedTower && state.phase === 'playing') towerPanel.draw(renderer, state.selectedTower, state.gold, towerScreenPos.x, towerScreenPos.y, layout.tools);
    else towerPanel.clear();

    if (tutorialStep) drawTutorial(renderer, tutorialStep.text, tutorialStep.id, layout.infoHeight);
    if (paused && state.phase === 'playing') screens.draw(renderer, 'paused');
    if (state.phase === 'won') screens.draw(renderer, 'won', state.score, 0, buildRunSummary({ stars: state.lastStars }));
    if (state.phase === 'lost') screens.draw(renderer, 'lost', state.score, state.endlessSeed, buildRunSummary());
    if (settings.get().showFps) renderer.text(`${state.fps} fps`, 8, 52, '#555', 11);
  } else {
    renderer.camX = 0;
    renderer.camY = 0;
    renderer.zoom = 1;
    if (state.phase === 'levelSelect') levelSelect.draw(renderer);
    else screens.draw(renderer, 'menu', 0, 0, undefined, progress.hasCheckpoint);
  }

  renderer.camX = 0;
  renderer.camY = 0;
  if (showTalent && state.phase === 'playing') talentPanel.draw(renderer, state.talents);
  if (showStats) statsScreen.draw(renderer, state.analytics.get(), state.save);
  if (showCodex) codexScreen.draw(renderer);
  if (showSettings) settingsScreen.draw(renderer);

  drawToasts(renderer);
  const combat = state.phase === 'playing';
  const status = combat ? `${t('hud.gold')} ${state.gold}. ${t('hud.lives')} ${state.lives}. ${t('hud.wave')} ${state.waves.current}. ${t('hud.score')} ${state.score}.` +
    (touchPlacement ? ` ${t('placement.confirm').replace('{tower}', towerName(touchPlacement.towerId, getTowerDef(touchPlacement.towerId).name))}` : '') : '';
  const summary = state.phase === 'won' || state.phase === 'lost';
  const reading = showCodex ? codexScreen.reading : summary
    ? `${t(state.phase === 'won' ? 'win.title' : 'lose.title')}. ${t('hud.wave')} ${state.waves.current}. ${t('hud.score')} ${state.score}. ${t('win.kills')} ${state.stats.get().kills}.` : '';
  syncReading(battleStatus, t('controls.battleStatus'), status);
  syncReading(gameReading, t(showCodex ? 'codex.title' : 'summary.title'), reading);
  syncControlFocus();
};

function syncReading(element: HTMLElement, label: string, value: string): void {
  if (element.hidden !== !value) element.hidden = !value;
  if (element.textContent !== value) element.textContent = value;
  if (element.getAttribute('aria-label') !== label) element.setAttribute('aria-label', label);
}

function syncControlFocus(): void {
  if (challengeDialog.isOpen || operations.isOpen || progress.blocksInput) return;
  const group = t('controls.group');
  if (showSettings) controlFocus.sync('settings', group, settingsScreen.focusRegions);
  else if (showCodex) controlFocus.sync('codex', group, codexScreen.focusRegions);
  else if (showStats) controlFocus.sync('stats', group, statsScreen.focusRegions);
  else if (showTalent) controlFocus.sync('talents', group, talentPanel.focusRegions);
  else if (state.phase === 'levelSelect') controlFocus.sync('route', group, levelSelect.focusRegions);
  else if (state.phase !== 'playing' || paused) controlFocus.sync(paused && state.phase === 'playing' ? 'pause' : state.phase, group, screens.focusRegions);
  else {
    const { tx, ty } = keyboardTile;
    const tower = state.towers.find(candidate => candidate.tx === tx && candidate.ty === ty);
    const tile = state.grid.at(tx, ty);
    const tileName = tower ? towerName(tower.def.id, tower.def.name)
      : t(tile === TileType.Buildable ? 'controls.buildable' : tile === TileType.Blocked ? 'controls.blocked' : 'controls.route');
    const tileSize = state.grid.tile * battleCamera.zoom;
    const board: FocusRegion = {
      x: battleCamera.x + tx * tileSize, y: battleCamera.y + ty * tileSize, w: tileSize, h: tileSize,
      label: t('controls.board').replace('{column}', String(tx + 1)).replace('{row}', String(ty + 1)).replace('{tile}', tileName),
      board: true,
    };
    const regions = [...hudRegions.shop, board, ...spellRegions, ...hudRegions.buttons, ...towerPanel.focusRegions];
    if (cancelPlacementRegion) regions.push(cancelPlacementRegion);
    controlFocus.sync('battle', group, regions);
  }
}

function drawBattleTools(r: Renderer, tools: BattleLayout['tools']): void {
  spellRegions = [];
  const { width: slotW, height: slotH, dx, dy } = tools;
  let { x, y } = tools;

  for (const sp of state.spells) {
    const selected = state.selectedSpellId === sp.def.id;
    const ready = sp.canCast(state);
    const caption = sp.def.heal && !state.repairAllowed ? t('spell.disabled')
      : !sp.ready ? `${Math.ceil(sp.cooldown)}s`
        : sp.def.heal && state.lives >= state.maxLives ? t('spell.fullLives') : `${sp.def.cost}g`;
    let bg: string | CanvasGradient;
    let border: string;
    if (selected) {
      bg = r.linearGradient(x, y, x, y + slotH, [{ offset: 0, color: 'rgba(251, 191, 36, 0.32)' }, { offset: 1, color: 'rgba(146, 64, 14, 0.24)' }]);
      border = '#fbbf24';
      r.setShadow('rgba(251, 191, 36, 0.5)', 12, 0, 0);
    } else if (ready) {
      bg = r.linearGradient(x, y, x, y + slotH, [{ offset: 0, color: 'rgba(30, 41, 59, 0.9)' }, { offset: 1, color: 'rgba(15, 23, 42, 0.9)' }]);
      border = '#fbbf24';
      r.setShadow('rgba(251, 191, 36, 0.35)', 8, 0, 0);
    } else {
      bg = 'rgba(15, 23, 42, 0.4)';
      border = 'rgba(255, 255, 255, 0.03)';
    }

    r.roundRect(x, y, slotW, slotH, 8, bg, true, border, selected ? 1.8 : 1);
    r.clearShadow();
    if (!sp.ready) {
      const cdH = Math.round(slotH * (sp.cooldown / sp.def.cooldown));
      r.rect(x + 2, y + slotH - cdH, slotW - 4, cdH, 'rgba(0, 0, 0, 0.4)');
    }
    const name = spellName(sp.def.id, sp.def.name);
    r.text(name, x + slotW / 2, y + slotH * 0.21, ready ? '#f8fafc' : '#94a3b8', 11, 'center', 'bold');
    r.text(caption, x + slotW / 2, y + slotH * 0.63, ready ? '#fbbf24' : '#94a3b8', 9, 'center', 'bold', 'top', 'header', slotW - 6);

    spellRegions.push({ x, y, w: slotW, h: slotH, spellId: sp.def.id, label: `${name}, ${caption}`, pressed: selected, disabled: !ready });
    x += dx;
    y += dy;
  }

  cancelPlacementRegion = null;
  if (state.phase !== 'playing' || (!placingMode && !state.selectedSpellId && !state.selectedTower)) return;
  r.roundRect(x, y, slotW, slotH, 8, 'rgba(15, 23, 42, 0.84)', true, 'rgba(148, 163, 184, 0.22)', 1);
  r.text(t('common.cancel'), x + slotW / 2, y + slotH / 2, '#cbd5e1', 11, 'center', 'bold', 'middle');
  cancelPlacementRegion = { x, y, w: slotW, h: slotH, label: t('common.cancel') };
}

function drawPlacementHint(r: Renderer, infoHeight: number): void {
  if (!state.selectedTowerId || state.enemies.some(enemy => enemy.isBoss)) return;
  const def = getTowerDef(state.selectedTowerId);
  r.text(t(touchPlacement ? 'placement.confirm' : 'placement.selected').replace('{tower}', towerName(def.id, def.name)), r.width / 2, hudRegions.topHeight + infoHeight / 2, def.color, 12, 'center', 'bold', 'middle', 'header');
}

function drawTutorial(r: Renderer, text: string, stepId: string, infoHeight: number): void {
  drawTutorialTarget(r, stepId);
  const w = Math.min(520, r.width - 32);
  const h = Math.min(40, infoHeight - 5);
  const x = (r.width - w) / 2;
  const y = hudRegions.topHeight + (infoHeight - h) / 2;
  r.setShadow('rgba(59, 130, 246, 0.35)', 16, 0, 0);
  r.roundRect(x, y, w, h, 12, 'rgba(15, 23, 42, 0.94)', true, 'rgba(96, 165, 250, 0.55)', 1.4);
  r.clearShadow();
  r.text(text, x + w / 2, y + h / 2, '#dbeafe', r.width < 700 ? 11.5 : 13, 'center', 'bold', 'middle', 'ui', w - 16);
}

function drawTutorialTarget(r: Renderer, stepId: string): void {
  const pulse = 0.5 + Math.sin(r.motionClock / 180) * 0.5;
  const stroke = `rgba(96, 165, 250, ${0.42 + pulse * 0.34})`;
  let target: RectRegion | null = null;
  if (stepId === 'select') target = hudRegions.shop[0] ?? null;
  else if (stepId === 'wave') target = hudRegions.buttons.find(btn => btn.action === 'send') ?? null;
  else if (stepId === 'upgrade' || stepId === 'inspect') target = state.selectedTower ? null : hudRegions.shop[0] ?? null;
  else if (stepId === 'spell') target = spellRegions[0] ?? null;
  else if (stepId === 'intel') target = hudRegions.buttons.find(btn => btn.action === 'codex') ?? null;
  else if (stepId === 'talent') target = hudRegions.buttons.find(btn => btn.action === 'talent') ?? null;

  if (target) {
    r.roundRect(target.x - 5, target.y - 5, target.w + 10, target.h + 10, 12, 'rgba(59, 130, 246, 0.10)', true, stroke, 2);
    return;
  }

  if (stepId === 'place') {
    const firstSite = findFirstBuildableScreenTile();
    if (firstSite) r.roundRect(firstSite.x - 4, firstSite.y - 4, firstSite.w + 8, firstSite.h + 8, 10, 'rgba(34, 197, 94, 0.10)', true, `rgba(52, 211, 153, ${0.45 + pulse * 0.35})`, 2);
  }
}

function findFirstBuildableScreenTile(): RectRegion | null {
  for (let ty = 0; ty < state.grid.rows; ty++) {
    for (let tx = 0; tx < state.grid.cols; tx++) {
      if (!state.grid.isBuildable(tx, ty) || state.towers.some(tower => tower.tx === tx && tower.ty === ty)) continue;
      const tile = state.grid.tile * battleCamera.zoom;
      return { x: battleCamera.x + tx * tile, y: battleCamera.y + ty * tile, w: tile, h: tile };
    }
  }
  return null;
}

function drawToasts(r: Renderer): void {
  const toastW = 280;
  const toastH = 50;
  const startX = 16;
  const bottomY = r.height - BOT_H - 16;

  for (let i = 0; i < activeToasts.length; i++) {
    const toast = activeToasts[i];
    const targetY = bottomY - i * (toastH + 10) - toastH;
    let slideX = startX;
    if (toast.maxTime - toast.timer < 0.4) slideX = startX - toastW * (1 - (toast.maxTime - toast.timer) / 0.4);
    else if (toast.timer < 0.4) slideX = startX - toastW * (1 - toast.timer / 0.4);

    r.setShadow('rgba(251, 191, 36, 0.25)', 12, 0, 0);
    if (r.reducedMotion) slideX = startX;
    r.roundRect(slideX, targetY, toastW, toastH, 8, 'rgba(15, 23, 42, 0.95)', true, '#fbbf24', 1.5);
    r.clearShadow();
    r.text(t('achievement.unlocked'), slideX + 12, targetY + 8, '#fbbf24', 9, 'left', 'bold', 'top', 'header');
    r.text(toast.title, slideX + 12, targetY + 22, '#ffffff', 12, 'left', 'bold');
    r.text(toast.desc, slideX + 12, targetY + 36, '#94a3b8', 9, 'left');
  }
}

const loop = new GameLoop(update, render, 60, seconds => {
  if (!document.hidden && document.hasFocus() && liveBattle()) state.recordActiveTime(seconds);
});
void progress.initialize(state).then(() => {
  gameReady = true;
  if (!document.hidden) loop.start();
  document.getElementById('boot-loading')?.remove();
  window.setInterval(() => {
    if (state.phase === 'playing' && !paused && !document.hidden) state.autoSave();
  }, 4000);
  logger.info('Praesidium booted');
});
