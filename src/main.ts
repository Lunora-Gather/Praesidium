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
import { achievementDescription, achievementName, spellName, towerDescription, towerName } from './utils/displayText';
import { TalentPanel } from './ui/TalentPanel';
import { StatsScreen } from './ui/StatsScreen';
import { CodexScreen } from './ui/CodexScreen';
import { loadRun } from './utils/RunSave';
import { dailySeed } from './utils/DailyChallenge';
import { buildPlaytestReport, formatPlaytestReport } from './utils/PlaytestReport';

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
const codexScreen = new CodexScreen();

interface RectRegion { x: number; y: number; w: number; h: number; }

let paused = false;
let showSettings = false;
let hudRegions: HudRegions = { shop: [], buttons: [] };
let spellRegions: Array<RectRegion & { spellId: string }> = [];
let cancelPlacementRegion: RectRegion | null = null;
let lastFpsUpdate = 0;
let frameCount = 0;
let placingMode = true;
let gameSpeed = 1;
let showTalent = false;
let showStats = false;
let showCodex = false;
let autoSend = false;

interface Toast { title: string; desc: string; timer: number; maxTime: number; }
let activeToasts: Toast[] = [];

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
  for (let i = 0; i < savedRun.spellCooldowns.length && i < state.spells.length; i++) state.spells[i].cooldown = savedRun.spellCooldowns[i];
  state.stats.restore(savedRun.stats);
  while (state.waves.current < savedRun.waveCurrent && state.waves.state !== 'done') state.waves.forceNext();
  paused = false;
  logger.info('Restored mid-run save', { level: savedRun.levelIndex + 1, wave: savedRun.waveCurrent });
}

audio.setMuted(settings.get().muted);
music.setMuted(settings.get().muted);

const resumeAudio = (): void => audio.resume();
let resizeFrame = 0;
const scheduleResize = (): void => {
  if (resizeFrame !== 0) return;
  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = 0;
    renderer.resize();
  });
};
window.addEventListener('pointerdown', resumeAudio, { once: true });
window.addEventListener('keydown', resumeAudio, { once: true });
window.addEventListener('resize', scheduleResize);
window.addEventListener('blur', () => { if (settings.get().pauseOnBlur && state.phase === 'playing') { paused = true; state.autoSave(); } });
window.addEventListener('focus', () => { if (settings.get().pauseOnBlur && paused && state.phase === 'playing') paused = false; });
window.addEventListener('beforeunload', () => { if (state.phase === 'playing') state.autoSave(); });

state.bus.on('towerPlaced', () => audio.place());
state.bus.on('towerSold', () => audio.place());
state.bus.on('towerUpgraded', () => audio.place());
state.bus.on('towerFire', ({ id }) => audio.shoot(id));
state.movement.bus.on('enemyReachedGoal', () => { audio.lifeLost(); renderer.shake(6); });
state.combat.bus.on('hit', (p) => { audio.hit(); state.particles.hit(new Vec2(p.x, p.y), '#fff'); state.particles.floatText(new Vec2(p.x, p.y - 10), `-${Math.round(p.damage)}`, '#ff8a65'); });
state.combat.bus.on('kill', (p) => {
  audio.enemyDie();
  const pos = new Vec2(p.x, p.y);
  if (p.enemy.isBoss) state.particles.bossDeath(pos, p.enemy.color);
  else state.particles.death(pos, p.enemy.color);
  const reward = Math.round(p.enemy.reward * state.talents.multiplier('gold') * state.diffMul.rewardMul);
  state.particles.floatText(new Vec2(p.x, p.y - 16), `+${reward}g`, '#ffd54f', 1.0);
  if (p.enemy.isBoss) renderer.shake(18); else renderer.shake(3);
});
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
state.bus.on('spellCast', ({ id, x, y }) => {
  audio.spellCast(id);
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
state.bus.on('waveChanged', () => state.autoSave());
state.bus.on('achievementUnlocked', (ach) => {
  audio.achievement();
  activeToasts.push({
    title: achievementName(ach.id, ach.name),
    desc: achievementDescription(ach.id, ach.description),
    timer: 4.0,
    maxTime: 4.0,
  });
});

function camOffset(): { camX: number; camY: number } {
  const availW = renderer.width;
  const availH = renderer.height - TOP_H - BOT_H;
  return { camX: (availW - state.grid.widthPx) / 2, camY: TOP_H + Math.max(0, (availH - state.grid.heightPx) / 2) };
}

function screenToWorld(sx: number, sy: number): { wx: number; wy: number } {
  const { camX, camY } = camOffset();
  return { wx: sx - camX, wy: sy - camY };
}

function hitRegion(region: RectRegion | null, x: number, y: number): boolean {
  return !!region && x >= region.x && x <= region.x + region.w && y >= region.y && y <= region.y + region.h;
}

function hitSpell(x: number, y: number): string | null {
  for (const region of spellRegions) if (x >= region.x && x <= region.x + region.w && y >= region.y && y <= region.y + region.h) return region.spellId;
  return null;
}

function handleHUDClick(x: number, y: number): void {
  const shopPick = hud.hitShop(hudRegions, x, y);
  if (shopPick) {
    state.selectedTowerId = shopPick;
    placingMode = true;
    state.selectedTower = null;
    state.selectedSpellId = null;
    return;
  }
  const btn = hud.hitButton(hudRegions, x, y);
  if (btn === 'send') { if (state.waves.forceNext()) audio.waveStart(); }
  else if (btn === 'pause') paused = !paused;
  else if (btn === 'speed') { gameSpeed = gameSpeed >= 3 ? 1 : gameSpeed + 1; loop.timeScale = gameSpeed; }
  else if (btn === 'talent') showTalent = true;
  else if (btn === 'stats') showStats = true;
  else if (btn === 'codex') showCodex = true;
  else if (btn === 'autoSend') { autoSend = !autoSend; state.waves.autoSend = autoSend; }
  else if (btn === 'menu') state.goMenu();
  else if (btn === 'settings') showSettings = true;
}

function handleWorldClick(x: number, y: number): void {
  const { wx, wy } = screenToWorld(x, y);
  const { tx, ty } = state.grid.pixelToTile(wx, wy);
  if (tx < 0 || ty < 0 || tx >= state.grid.cols || ty >= state.grid.rows) { state.selectedTower = null; return; }

  if (state.selectedTower) {
    const panelAction = towerPanel.hit(x, y);
    if (panelAction === 'upgrade') { state.upgradeTower(state.selectedTower); return; }
    if (panelAction === 'sell') { state.sellTower(state.selectedTower); return; }
  }

  const existing = state.towers.find((tower) => tower.tx === tx && tower.ty === ty);
  if (existing) { state.selectedTower = existing; placingMode = false; state.selectedSpellId = null; return; }
  if (placingMode && state.tryPlace(tx, ty)) { /* audio handled via bus */ }
}

function handleMenuClick(action: MenuClickAction): void {
  if (action === 'start') { state.selectLevel(0); paused = false; }
  else if (action === 'restart') { state.start(); paused = false; }
  else if (action === 'next') { state.advanceLevel(); paused = false; }
  else if (action === 'levels') { state.goLevelSelect(); paused = false; }
  else if (action === 'resume') paused = false;
  else if (action === 'menu') state.goMenu();
}

function buildRunSummary(extra: Partial<ScreenStats> = {}): ScreenStats {
  const run = state.stats.get();
  return {
    kills: run.kills,
    gold: run.goldEarned,
    lives: state.lives,
    towersPlaced: run.towersPlaced,
    upgrades: run.upgrades,
    spellsCast: run.spellsCast,
    damageDealt: run.damageDealt,
    durationSec: run.durationSec,
    hasNextLevel: state.levels.hasNext,
    isNewHighScore: state.lastRunNewHighScore,
    isNewLevelScore: state.lastRunNewLevelScore,
    isStarUpgrade: state.lastRunStarUpgrade,
    isNewEndlessRecord: state.lastRunNewEndlessRecord,
    isNewDailyRecord: state.lastRunNewDailyRecord,
    missionCredits: state.lastRunMissionCredits,
    weeklyCredits: state.lastRunWeeklyCredits,
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
  if (navigator.clipboard) void navigator.clipboard.writeText(text);
  activeToasts.push({ title: 'Playtest report exported', desc: fileName, timer: 3.2, maxTime: 3.2 });
}

const update = (dt: number): void => {
  frameCount++;
  lastFpsUpdate += dt;
  if (lastFpsUpdate >= 0.5) { state.fps = Math.round(frameCount / lastFpsUpdate); frameCount = 0; lastFpsUpdate = 0; }
  starfield.update(dt, renderer.width, renderer.height);

  for (const toast of activeToasts) toast.timer -= dt;
  activeToasts = activeToasts.filter(toast => toast.timer > 0);

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

  if (paused && state.phase === 'playing') {
    for (const c of input.clicks()) {
      if (c.y < TOP_H) { handleHUDClick(c.x, c.y); continue; }
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
      else if (a.kind === 'level') { state.setDifficulty(levelSelect.selectedDiff); state.selectLevel(a.index); }
      else if (a.kind === 'diff') levelSelect.selectedDiff = a.diff;
    }
    input.endFrame();
    return;
  }

  if (state.phase === 'menu') {
    for (const c of input.clicks()) {
      const a = screens.hit(c.x, c.y);
      if (a === 'start') { state.endless = false; state.endlessSeed = 0; state.goLevelSelect(); }
      else if (a === 'endless') { state.endless = true; state.endlessSeed = 0; state.selectLevel(0); paused = false; }
      else if (a === 'challenge') {
        const raw = window.prompt(t('menu.challenge') + ' — hex seed (e.g. 1A2B3C4D):');
        if (raw != null) {
          const seed = parseInt(raw.trim(), 16) >>> 0;
          if (!Number.isNaN(seed) && seed !== 0) { state.endless = true; state.endlessSeed = seed; state.selectLevel(0); paused = false; }
        }
      } else if (a === 'daily') { state.endless = true; state.endlessSeed = dailySeed(); state.selectLevel(0); paused = false; }
      else if (a === 'settings') showSettings = true;
      else if (a === 'stats') showStats = true;
    }
    input.endFrame();
    return;
  }

  if (state.phase === 'playing') {
    const { wx, wy } = screenToWorld(input.pointerX, input.pointerY);
    const { tx, ty } = state.grid.pixelToTile(wx, wy);
    state.hoverTile = tx >= 0 && ty >= 0 && tx < state.grid.cols && ty < state.grid.rows ? { tx, ty } : null;

    for (const c of input.clicks()) {
      if (showTalent) { const tid = talentPanel.hit(c.x, c.y); if (tid) state.talents.rankUp(tid); else showTalent = false; continue; }
      if (hitRegion(cancelPlacementRegion, c.x, c.y)) { placingMode = false; state.selectedTower = null; state.selectedSpellId = null; continue; }
      const clickedSpell = hitSpell(c.x, c.y);
      if (clickedSpell) { state.selectedSpellId = state.selectedSpellId === clickedSpell ? null : clickedSpell; placingMode = false; state.selectedTower = null; continue; }
      if (c.y < TOP_H) { handleHUDClick(c.x, c.y); continue; }
      if (c.y > renderer.height - BOT_H) handleHUDClick(c.x, c.y);
      else if (state.selectedSpellId) { const { wx: castX, wy: castY } = screenToWorld(c.x, c.y); state.castSpell(state.selectedSpellId, new Vec2(castX, castY)); state.selectedSpellId = null; }
      else handleWorldClick(c.x, c.y);
    }

    if (input.wasKeyPressed('Space')) paused = !paused;
    if (input.wasKeyPressed('Escape')) {
      if (state.selectedSpellId) state.selectedSpellId = null;
      else if (state.selectedTower) state.selectedTower = null;
      else if (placingMode) placingMode = false;
      else state.goMenu();
    }
    if (input.wasKeyPressed('KeyS') && state.selectedTower) state.sellTower(state.selectedTower);
    if (input.wasKeyPressed('KeyU') && state.selectedTower) state.upgradeTower(state.selectedTower);
    if (input.wasKeyPressed('KeyT')) { if (showTalent) showTalent = false; else if (state.selectedTower) state.selectedTower.cycleStrategy(); }
    for (let i = 0; i < TOWER_LIST.length; i++) {
      if (input.wasKeyPressed(`Digit${i + 1}`)) { state.selectedTowerId = TOWER_LIST[i].id; placingMode = true; state.selectedTower = null; state.selectedSpellId = null; }
    }
    const spellKeys = ['KeyQ', 'KeyW', 'KeyE'];
    for (let i = 0; i < spellKeys.length && i < state.spells.length; i++) {
      if (input.wasKeyPressed(spellKeys[i])) { state.selectedSpellId = state.spells[i].def.id; placingMode = false; state.selectedTower = null; }
    }

    if (!paused) { state.update(dt); tutorial.update(state); }
  } else {
    for (const c of input.clicks()) {
      const a = screens.hit(c.x, c.y);
      if (a === 'challenge') {
        const seedHex = state.endlessSeed.toString(16).toUpperCase().padStart(8, '0');
        if (navigator.clipboard) navigator.clipboard.writeText(seedHex).then(() => alert(t('share.copied').replace('{seed}', seedHex))).catch(() => window.prompt(t('share.prompt'), seedHex));
        else window.prompt(t('share.prompt'), seedHex);
      } else if (a) handleMenuClick(a);
    }
  }

  input.endFrame();
};

const render = (_alpha: number): void => {
  renderer.clear();
  renderer.updateShake();

  renderer.camX = 0;
  renderer.camY = 0;
  if (state.phase === 'menu' || state.phase === 'levelSelect') starfield.draw(renderer);

  const { camX, camY } = camOffset();

  if (state.phase === 'playing' || state.phase === 'won' || state.phase === 'lost') {
    renderer.camX = camX;
    renderer.camY = camY;
    renderer.zoom = 1;
    worldRenderer.draw(renderer, state, settings.get());
    state.particles.draw(renderer);

    let towerScreenPos: Vec2 | null = null;
    if (state.selectedTower && state.phase === 'playing') towerScreenPos = renderer.toScreen(state.selectedTower.pos);

    renderer.camX = 0;
    renderer.camY = 0;

    hudRegions = hud.draw(renderer, state, gameSpeed, autoSend);
    drawSpells(renderer);
    drawPlacementHint(renderer);

    if (towerScreenPos && state.selectedTower && state.phase === 'playing') towerPanel.draw(renderer, state.selectedTower, state.gold, towerScreenPos.x, towerScreenPos.y);
    else towerPanel.clear();

    if (state.phase === 'playing' && tutorial.active) drawTutorial(renderer, tutorial.active.text, tutorial.active.id);
    if (showTalent && state.phase === 'playing') talentPanel.draw(renderer, state.talents);
    if (paused && state.phase === 'playing') screens.draw(renderer, 'paused');
    if (state.phase === 'won') screens.draw(renderer, 'won', state.score, 0, buildRunSummary({ stars: state.lastStars }));
    if (state.phase === 'lost') screens.draw(renderer, 'lost', state.score, state.endlessSeed, buildRunSummary({ wave: state.waves.current }));
    if (settings.get().showFps) renderer.text(`${state.fps} fps`, 8, 52, '#555', 11);
  } else {
    renderer.camX = 0;
    renderer.camY = 0;
    renderer.zoom = 1;
    if (state.phase === 'levelSelect') levelSelect.draw(renderer);
    else screens.draw(renderer, 'menu');
  }

  renderer.camX = 0;
  renderer.camY = 0;
  if (showStats) statsScreen.draw(renderer, state.analytics.get(), state.save);
  if (showCodex) codexScreen.draw(renderer);
  if (showSettings) settingsScreen.draw(renderer);

  drawToasts(renderer);
};

function drawSpells(r: Renderer): void {
  spellRegions = [];
  const isMobile = r.width < 760;
  const slotW = isMobile ? 68 : 56;
  const slotH = isMobile ? 60 : 48;
  const gap = isMobile ? 8 : 6;
  let x = isMobile ? r.width - slotW - 10 : r.width - 16 - (slotW + gap) * state.spells.length;
  let y = isMobile ? TOP_H + 76 : r.height - BOT_H + 8;

  for (const sp of state.spells) {
    const selected = state.selectedSpellId === sp.def.id;
    const ready = sp.ready && state.gold >= sp.def.cost;
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
    r.text(spellName(sp.def.id, sp.def.name), x + slotW / 2, y + (isMobile ? 8 : 6), ready ? '#f8fafc' : '#475569', isMobile ? 12 : 11, 'center', 'bold');
    r.text(`${sp.def.cost}g`, x + slotW / 2, y + (isMobile ? 30 : 26), ready ? '#fbbf24' : '#475569', isMobile ? 11 : 10, 'center', 'bold', 'top', 'header');
    if (isMobile && ready) r.text(t('spell.ready'), x + slotW / 2, y + 45, '#94a3b8', 9, 'center', 'bold', 'top', 'header');

    if (!sp.ready) {
      const cdH = Math.round(slotH * (sp.cooldown / sp.def.cooldown));
      r.roundRect(x, y + slotH - cdH, slotW, cdH, 0, 'rgba(0, 0, 0, 0.65)', true);
    }

    spellRegions.push({ x, y, w: slotW, h: slotH, spellId: sp.def.id });
    if (isMobile) y += slotH + gap; else x += slotW + gap;
  }
}

function drawPlacementHint(r: Renderer): void {
  cancelPlacementRegion = null;
  if (state.phase !== 'playing' || !placingMode || !state.selectedTowerId || state.selectedTower || state.selectedSpellId) return;

  const def = getTowerDef(state.selectedTowerId);
  const isMobile = r.width < 760;
  const w = isMobile ? Math.min(r.width - 24, 390) : 360;
  const h = isMobile ? 72 : 62;
  const x = isMobile ? 12 : 16;
  const y = r.height - BOT_H - h - 12;

  r.roundRect(x, y, w, h, 12, 'rgba(15, 23, 42, 0.9)', true, 'rgba(59, 130, 246, 0.25)', 1.2);
  r.text(t('placement.selected').replace('{tower}', towerName(def.id, def.name)), x + 14, y + 10, def.color, 12, 'left', 'bold', 'top', 'header');
  r.text(towerDescription(def.id, def.description), x + 14, y + 29, '#cbd5e1', 11, 'left', 'normal');
  if (isMobile) r.text(t('placement.hint'), x + 14, y + 46, '#64748b', 10, 'left', 'normal');

  const btnW = isMobile ? 108 : 132;
  const btnH = 28;
  const btnX = x + w - btnW - 12;
  const btnY = y + h - btnH - 10;
  r.roundRect(btnX, btnY, btnW, btnH, 8, 'rgba(239, 68, 68, 0.16)', true, 'rgba(248, 113, 113, 0.35)', 1);
  r.text(t('placement.cancel'), btnX + btnW / 2, btnY + btnH / 2, '#fecaca', 11, 'center', 'bold', 'middle');
  cancelPlacementRegion = { x: btnX, y: btnY, w: btnW, h: btnH };
}

function drawTutorial(r: Renderer, text: string, stepId: string): void {
  drawTutorialTarget(r, stepId);
  const w = Math.min(520, r.width - 32);
  const h = r.width < 700 ? 54 : 46;
  const x = (r.width - w) / 2;
  const y = Math.max(58, TOP_H + 8);
  r.setShadow('rgba(59, 130, 246, 0.35)', 16, 0, 0);
  r.roundRect(x, y, w, h, 12, 'rgba(15, 23, 42, 0.94)', true, 'rgba(96, 165, 250, 0.55)', 1.4);
  r.clearShadow();
  r.text(text, x + w / 2, y + h / 2, '#dbeafe', r.width < 700 ? 11.5 : 13, 'center', 'bold', 'middle');
}

function drawTutorialTarget(r: Renderer, stepId: string): void {
  const pulse = 0.5 + Math.sin(performance.now() / 180) * 0.5;
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
      const p = renderer.toScreen(state.grid.tileCenter(tx, ty));
      return { x: p.x - state.grid.tile / 2, y: p.y - state.grid.tile / 2, w: state.grid.tile, h: state.grid.tile };
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
    r.roundRect(slideX, targetY, toastW, toastH, 8, 'rgba(15, 23, 42, 0.95)', true, '#fbbf24', 1.5);
    r.clearShadow();
    r.text(t('achievement.unlocked'), slideX + 12, targetY + 8, '#fbbf24', 9, 'left', 'bold', 'top', 'header');
    r.text(toast.title, slideX + 12, targetY + 22, '#ffffff', 12, 'left', 'bold');
    r.text(toast.desc, slideX + 12, targetY + 36, '#94a3b8', 9, 'left');
  }
}

const loop = new GameLoop(update, render);
loop.start();
document.getElementById('boot-loading')?.remove();
logger.info('Praesidium booted');
