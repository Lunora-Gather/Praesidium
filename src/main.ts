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
import { HomeScreen, type HomeAction } from './ui/HomeScreen';
import { getLocale, setLocale, t } from './utils/i18n';
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
import { drawRouteMarker } from './ui/RouteMarkers';
import { getLevelTheme } from './ui/LevelThemes';
import { weeklyRuleSummary } from './utils/WeeklyRules';
import { ControlFocus, type FocusRegion } from './ui/ControlFocus';
import { TileType } from './game/grid/Level';
import { BattleConfirm } from './ui/BattleConfirm';
import { AdaptiveResolution } from './engine/AdaptiveResolution';
import { CameraShake, HEAVY_IMPACT, TOUCH_SHAKE_SCALE } from './engine/CameraShake';

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

// Safari can restore focus to a clicked control. Reserve the keyboard marker for keyboard navigation.
const interaction = document.documentElement.dataset;
window.addEventListener('pointerdown', () => { interaction.input = 'pointer'; }, { capture: true, passive: true });
window.addEventListener('keydown', event => {
  if (event.isComposing || event.metaKey || event.ctrlKey) return;
  const { key, altKey } = event;
  if (key === 'Tab' || (!altKey && (key === 'Enter' || key === ' ' || key === 'Escape' || key.startsWith('Arrow')))) {
    interaction.input = 'keyboard';
  }
}, { capture: true });

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
const settingsScreen = new SettingsScreen(settings, applySettings, back => progress.manage(back));
const battleConfirm = new BattleConfirm(() => { lastCanvasDraw = -Infinity; });
const adaptive = new AdaptiveResolution();
const coarsePointer = matchMedia('(any-pointer: coarse)');
const cameraShake = new CameraShake();
const frozenBattle = document.createElement('canvas');
const frozenContext = frozenBattle.getContext('2d')!;
let frozenKey = '';
let pausedPaintKey = '';
let adaptiveActive = false;
let returningFromCampaign = false;
const levelSelect = new LevelSelect(state.levels, state.save, () => {
  returningFromCampaign = true;
  state.goMenu();
}, (index, difficulty) => {
  progress.start(() => {
    state.endless = false;
    state.setDifficulty(difficulty);
    state.selectLevel(index);
  });
});
const tutorial = new Tutorial();
const home = new HomeScreen(handleHomeAction);
const talentPanel = new TalentPanel(state.talents, async id => {
  const bought = await progress.buyTalent(id);
  if (bought) tutorialAction('talent');
  return bought;
}, () => restorePausedFocus('hud.talent'));
const statsScreen = new StatsScreen(exportPlaytestReport);
const codexScreen = new CodexScreen(() => restorePausedFocus('hud.intel'));

function restorePausedFocus(key: string): void {
  if (state.phase !== 'playing' || !paused) return;
  const trigger = [...document.querySelectorAll<HTMLButtonElement>('#game-controls button')]
    .find(button => button.getAttribute('aria-label') === t(key));
  trigger?.focus({ preventScroll: true });
}

const challengeDialog = new ChallengeDialog(code => {
  progress.start(() => {
    if ('difficulty' in code) state.startSharedChallenge(code);
    else state.startEndless(code.seed);
  });
});

interface RectRegion { x: number; y: number; w: number; h: number; }

let paused = false;
let hudRegions: HudRegions = { topHeight: TOP_H, shop: [], buttons: [] };
let spellRegions: Array<FocusRegion & { spellId: string }> = [];
let placementRegion: (FocusRegion & { action: 'build' | 'cast' | 'cancel' }) | null = null;
let battleGeometry: { grid: GameState['grid']; width: number; height: number; layout: BattleLayout } | null = null;
let battleContext: { width: number; text: string; lines: string[] } | null = null;
let lastFpsUpdate = performance.now();
let frameCount = 0;
let placingMode = true;
let meteorTarget: { tx: number; ty: number; position: Vec2 } | null = null;
let placementNotice = '';
let placementNoticeUntil = 0;
let touchPlacement: { tx: number; ty: number; towerId: string } | null = null;
let gameReady = false;
let lastCanvasDraw = -Infinity;
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

interface Toast { title: string; desc: string; timer: number; maxTime: number; achievement?: boolean; }
let activeToasts: Toast[] = [];

function applySettings(): void {
  const config = settings.get();
  audio.setMuted(config.muted);
  music.setMuted(config.muted);
  state.effectsEnabled = !config.reducedMotion && config.graphics !== 'low';
  cameraShake.reset();
  resizeRenderer();
  lastCanvasDraw = -Infinity;
}

function resizeRenderer(): void {
  const quality = settings.get().graphics;
  renderer.resize(quality === 'low' ? 1 : quality === 'clear' ? 2 : adaptive.pixelRatio);
}

function shakeBattle(intensity: number): void {
  const config = settings.get();
  if (config.reducedMotion || config.cameraShake === 0) return;
  const inputScale = coarsePointer.matches ? TOUCH_SHAKE_SCALE : 1;
  cameraShake.trigger(intensity * (config.cameraShake / 100) * inputScale, performance.now());
}

applySettings();

const resumeAudio = (): void => audio.resume();
let resizeFrame = 0;
const scheduleResize = (): void => {
  input.cancelPointer();
  if (resizeFrame !== 0) return;
  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = 0;
    touchPlacement = null;
    meteorTarget = null;
    adaptive.reset();
    resizeRenderer();
    lastCanvasDraw = -Infinity;
  });
};
window.addEventListener('pointerdown', resumeAudio);
window.addEventListener('keydown', resumeAudio);
window.addEventListener('resize', scheduleResize);
window.addEventListener('blur', () => {
  if (state.phase !== 'playing') return;
  if (settings.get().pauseOnBlur && !paused) {
    paused = true;
    resumeOnFocus = true;
  }
  state.autoSave();
  music.stop();
});
window.addEventListener('focus', () => {
  if (resumeOnFocus && state.phase === 'playing') paused = false;
  resumeOnFocus = false;
});
window.addEventListener('pagehide', () => state.autoSave());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    state.autoSave();
    music.stop();
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
state.movement.bus.on('enemyReachedGoal', () => { audio.lifeLost(); shakeBattle(3); });
state.combat.bus.on('hit', (p) => {
  audio.hit();
  if (!state.effectsEnabled) return;
  state.particles.hit(new Vec2(p.x, p.y), '#fff');
  state.particles.floatText(new Vec2(p.x, p.y - 10), `-${Math.round(p.damage)}`, '#ff8a65');
});
state.combat.bus.on('kill', (p) => {
  audio.enemyDie();
  if (p.enemy.isBoss) shakeBattle(HEAVY_IMPACT);
  if (!state.effectsEnabled) return;
  const pos = new Vec2(p.x, p.y);
  if (p.enemy.isBoss) state.particles.bossDeath(pos, p.enemy.color);
  else state.particles.death(pos, p.enemy.color);
  state.particles.floatText(new Vec2(p.x, p.y - 16), `+${p.reward}g`, '#ffd54f', 1.0);
});
state.combat.bus.on('splash', (p) => {
  shakeBattle(2.2);
  if (!state.effectsEnabled) return;
  state.particles.burst(new Vec2(p.x, p.y), 14, '#ff8a65', 150, 0.5, 4);
  state.particles.shockwave(new Vec2(p.x, p.y), p.radius, '#ff8a65', 0.4);
});
state.combat.bus.on('arc', ({ from, to, color }) => { if (state.effectsEnabled) state.particles.arc(from, to, color); });
state.bus.on('phaseChanged', ({ from, to }) => {
  cameraShake.reset();
  statsScreen.close();
  if (from === 'levelSelect') levelSelect.hide();
  if (from === 'menu') home.hide();
  touchPlacement = null;
  meteorTarget = null;
  placementNotice = '';
  frozenKey = '';
  if (to === 'won' || to === 'lost') {
    announcement.textContent = `${t(to === 'won' ? 'win.title' : 'lose.title')}. ${t('hud.score')} ${state.score}.`;
    if (to === 'won') audio.win(); else audio.lose();
    music.stop();
  }
  if (to === 'playing') {
    paused = false;
    resumeOnFocus = false;
    placingMode = true;
    loop.timeScale = state.playbackSpeed;
  }
  if (to !== 'playing') {
    talentPanel.close();
    codexScreen.close();
    music.stop();
    frozenBattle.width = frozenBattle.height = 1;
  }
});
state.bus.on('runStarted', () => {
  touchPlacement = null;
  paused = false;
  resumeOnFocus = false;
  saveOnWave = false;
  placingMode = true;
  talentPanel.close();
  keyboardTile.tx = 1;
  keyboardTile.ty = 1;
  loop.timeScale = state.playbackSpeed;
});
state.bus.on('spellCast', ({ id, x, y }) => {
  audio.spellCast(id);
  saveOnWave = true;
  tutorialAction('spell');
  state.recordFirstAction('spell');
  shakeBattle(id === 'meteor' ? HEAVY_IMPACT : id === 'freeze' ? 4 : 2.2);
  if (!state.effectsEnabled) return;
  const target = new Vec2(x, y);
  if (id === 'meteor') {
    state.particles.meteorImpact(target, 110);
  } else if (id === 'freeze') {
    state.particles.freezePulse(target, Math.max(state.grid.widthPx, state.grid.heightPx) * 0.78);
  } else if (id === 'repair') {
    state.particles.repairPulse(target);
  }
});
state.bus.on('waveChanged', ({ current }) => {
  saveOnWave = true;
  announcement.textContent = t('controls.waveAnnounce').replace('{wave}', String(current));
});
state.bus.on('achievementUnlocked', (ach) => {
  audio.achievement();
  const title = achievementName(ach.id, ach.name);
  announcement.textContent = `${t('achievement.unlocked')} · ${title}`;
  activeToasts.push({
    title,
    desc: achievementDescription(ach.id, ach.description),
    timer: 4.0,
    maxTime: 4.0,
    achievement: true,
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

function reportPlacement(message: string): void {
  placementNotice = message;
  placementNoticeUntil = performance.now() + 3000;
  announcement.textContent = message;
}

function selectSpell(id: string): void {
  touchPlacement = null;
  meteorTarget = null;
  placementNotice = '';
  if (state.selectedSpellId === id) {
    state.selectedSpellId = null;
    return;
  }
  const spell = state.spells.find(candidate => candidate.def.id === id);
  if (!spell?.canCast(state)) {
    if (spell && !spell.def.heal && spell.ready && state.gold >= spell.def.cost && !spell.hasTarget(state)) {
      reportPlacement(t('spell.noEnemies'));
    }
    return;
  }
  placingMode = false;
  state.selectedTower = null;
  state.selectedSpellId = null;
  const name = spellName(id, spell.def.name);
  if (spell.def.radius) {
    state.selectedSpellId = id;
    reportPlacement(t('spell.chooseTarget').replace('{spell}', name));
    return;
  }
  const grid = state.grid;
  battleConfirm.open(
    name,
    t('spell.confirm').replace('{spell}', name).replace('{cost}', String(spell.def.cost)),
    t('spell.cast'),
    () => {
      if (state.phase !== 'playing' || state.grid !== grid) return;
      const target = spell.def.heal ? grid.waypoints[grid.waypoints.length - 1]
        : new Vec2(grid.widthPx / 2, grid.heightPx / 2);
      if (state.castSpell(id, target)) state.autoSave();
    },
  );
}

function pauseBattle(): void {
  paused = true;
  cameraShake.reset();
  pausedPaintKey = '';
  state.autoSave();
}

function cycleTarget(): void {
  if (!state.selectedTower) return;
  state.selectedTower.cycleStrategy();
  state.markCheckpointDirty();
  state.autoSave();
}

function tutorialAction(action: TutorialAction): void {
  if (state.runOrigin.kind === 'campaign' && state.levels.levelNumber <= 2) tutorial.record(action);
}

function openCodex(): void {
  codexScreen.open();
  tutorialAction('intel');
  state.recordFirstAction('intel');
}

function handleHUDClick(x: number, y: number, press?: { x: number; y: number }): void {
  const shopPick = hud.hitShop(hudRegions, x, y);
  if (shopPick) {
    if (press && hud.hitShop(hudRegions, press.x, press.y) !== shopPick) return;
    touchPlacement = null;
    meteorTarget = null;
    placementNotice = '';
    state.selectedTowerId = shopPick;
    tutorialAction('select');
    placingMode = true;
    state.selectedTower = null;
    state.selectedSpellId = null;
    return;
  }
  const btn = hud.hitButton(hudRegions, x, y);
  if (press && hud.hitButton(hudRegions, press.x, press.y) !== btn) return;
  if (btn === 'send' && state.waves.forceNext()) {
    audio.waveStart();
    tutorialAction('wave');
    state.recordFirstAction('wave');
  }
  else if (btn === 'pause') pauseBattle();
  else if (btn === 'speed') {
    state.playbackSpeed = state.playbackSpeed === 1 ? 2 : state.playbackSpeed === 2 ? 3 : 1;
    loop.timeScale = state.playbackSpeed;
    state.autoSave();
  }
  else if (btn === 'autoSend') {
    state.waves.autoSend = !state.waves.autoSend;
    state.autoSave();
  }
  else if (btn === 'brief') operations.open(state);
}

function handleWorldClick(x: number, y: number, press?: { x: number; y: number }): void {
  const tower = state.selectedTower;
  if (tower && towerPanel.contains(x, y)) {
    const action = towerPanel.hit(x, y);
    if (press && towerPanel.hit(press.x, press.y) !== action) return;
    if (action === 'upgrade') state.upgradeTower(tower);
    if (action === 'target') cycleTarget();
    if (action === 'sell') {
      if (!press) state.sellTower(tower);
      else battleConfirm.open(
        t('tower.confirmSell'),
        t('tower.sellDetail').replace('{tower}', towerName(tower.def.id, tower.def.name)).replace('{value}', String(tower.sellValue)),
        t('tower.sell').replace('{value}', String(tower.sellValue)),
        () => { state.sellTower(tower); state.autoSave(); },
      );
    }
    return;
  }
  handleBoardClick(x, y, press);
}

function handleBoardClick(x: number, y: number, press?: { x: number; y: number }): void {
  if (!battleGeometry || battleGeometry.grid !== state.grid || !hitRegion(battleGeometry.layout.board, x, y)) return;
  placementNotice = '';
  const { wx, wy } = screenToWorld(x, y);
  const { tx, ty } = state.grid.pixelToTile(wx, wy);
  if (tx < 0 || ty < 0 || tx >= state.grid.cols || ty >= state.grid.rows) {
    touchPlacement = null;
    meteorTarget = null;
    state.selectedTower = null;
    return;
  }
  const start = press ? screenToWorld(press.x, press.y) : null;
  const startTile = start && state.grid.pixelToTile(start.wx, start.wy);
  if (startTile && (startTile.tx !== tx || startTile.ty !== ty)) {
    touchPlacement = null;
    meteorTarget = null;
    return;
  }
  if (state.selectedSpellId) {
    const position = new Vec2(wx, wy);
    if (press && (meteorTarget?.tx !== tx || meteorTarget.ty !== ty)) {
      meteorTarget = { tx, ty, position };
      return;
    }
    castAimedSpell(press && meteorTarget ? meteorTarget.position : position);
    return;
  }
  const existing = state.towers.find(tower => tower.tx === tx && tower.ty === ty);
  if (existing) {
    tutorialAction('inspect');
    touchPlacement = null;
    state.selectedTower = existing;
    placingMode = false;
    return;
  }
  state.selectedTower = null;
  const towerId = state.selectedTowerId;
  if (!placingMode || !towerId) return;
  const def = getTowerDef(towerId);
  const failure = state.placementFailure(tx, ty, def);
  if (failure) {
    touchPlacement = null;
    reportPlacement(t(`placement.${failure}`).replace('{gold}', String(def.cost - state.gold)));
    return;
  }
  if (press && state.grid.tile * battleCamera.zoom < 28
      && (touchPlacement?.tx !== tx || touchPlacement.ty !== ty || touchPlacement.towerId !== towerId)) {
    touchPlacement = { tx, ty, towerId };
    return;
  }
  touchPlacement = null;
  state.tryPlace(tx, ty);
}

function castAimedSpell(position: Vec2): void {
  if (!state.selectedSpellId) return;
  const spell = state.spells.find(candidate => candidate.def.id === state.selectedSpellId);
  if (!spell) return;
  if (!spell.hasTarget(state, position)) {
    reportPlacement(t(spell.hasTarget(state) ? 'spell.noTarget' : 'spell.noEnemies'));
    return;
  }
  if (state.castSpell(spell.def.id, position)) state.autoSave();
  state.selectedSpellId = null;
  meteorTarget = null;
}

function activatePlacement(): void {
  if (placementRegion?.action === 'build' && touchPlacement) {
    const { tx, ty } = touchPlacement;
    const tile = state.grid.tile * battleCamera.zoom;
    handleBoardClick(battleCamera.x + (tx + .5) * tile, battleCamera.y + (ty + .5) * tile);
  } else if (placementRegion?.action === 'cast' && meteorTarget) {
    placementNotice = '';
    castAimedSpell(meteorTarget.position);
  } else {
    touchPlacement = null;
    meteorTarget = null;
    placementNotice = '';
    placingMode = false;
    state.selectedTower = null;
    state.selectedSpellId = null;
  }
}

function handleHomeAction(action: HomeAction): void {
  if (state.phase !== 'menu' || statsScreen.isOpen || progress.blocksInput) return;
  if (action === 'start') state.goLevelSelect();
  else if (action === 'continue') progress.resume();
  else if (action === 'endless') progress.start(() => state.startEndless());
  else if (action === 'challenge') challengeDialog.open();
  else if (action === 'daily') progress.start(() => state.startDaily());
  else if (action === 'weekly') progress.start(() => state.startWeekly());
  else if (action === 'settings') {
    home.focus('settings');
    settingsScreen.open();
  }
  else if (action === 'stats') {
    home.focus('stats');
    statsScreen.open(state.analytics.get(), state.save);
  }
  else if (action === 'brief') {
    home.focus('brief');
    operations.open(state);
  }
}

function handleMenuClick(action: MenuClickAction): void {
  if (action === 'start') progress.start(() => state.selectLevel(0));
  else if (action === 'restart') progress.start(() => state.restart());
  else if (action === 'next') progress.start(() => state.advanceLevel());
  else if (action === 'levels') { state.goLevelSelect(); paused = false; }
  else if (action === 'resume') paused = false;
  else if (action === 'menu') state.goMenu();
  else if (action === 'share') challengeDialog.open(encodeChallenge(state.challengeRules));
  else if (action === 'settings') {
    restorePausedFocus('menu.settings');
    settingsScreen.open();
  }
  else if (action === 'brief') operations.open(state);
  else if (action === 'stats') {
    restorePausedFocus('hud.stats');
    statsScreen.open(state.analytics.get(), state.save);
  }
  else if (action === 'codex') openCodex();
  else if (action === 'talent') talentPanel.open(state.runOrigin.kind === 'daily' || state.runOrigin.kind === 'weekly');
}

function buildRunSummary(extra: Partial<ScreenStats> = {}): ScreenStats {
  const run = state.stats.get();
  return {
    wave: state.waves.current,
    kills: run.kills,
    gold: run.goldEarned,
    goldAvailable: state.gold,
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
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  if (navigator.clipboard) void navigator.clipboard.writeText(text).catch(() => undefined);
}

const update = (dt: number): void => {
  for (const toast of activeToasts) toast.timer -= dt;
  activeToasts = activeToasts.filter(toast => toast.timer > 0);

  if (challengeDialog.isOpen || operations.isOpen || settingsScreen.isOpen || battleConfirm.isOpen
    || talentPanel.isOpen || codexScreen.isOpen || statsScreen.isOpen || progress.blocksInput) {
    input.endFrame();
    return;
  }

  if (paused && state.phase === 'playing') {
    for (const c of input.clicks()) {
      const a = screens.hit(c.x, c.y);
      if (a) handleMenuClick(a);
      if (talentPanel.isOpen || codexScreen.isOpen || statsScreen.isOpen || operations.isOpen || settingsScreen.isOpen) break;
    }
    if (!talentPanel.isOpen && !codexScreen.isOpen && (input.wasKeyPressed('Space') || input.wasKeyPressed('Escape'))) paused = false;
    input.endFrame();
    return;
  }

  if (state.phase === 'levelSelect' || state.phase === 'menu') {
    input.endFrame();
    return;
  }

  if (state.phase === 'playing') {
    const { wx, wy } = screenToWorld(input.pointerX, input.pointerY);
    const { tx, ty } = state.grid.pixelToTile(wx, wy);
    state.hoverTile = touchPlacement ?? (placingMode && battleGeometry && hitRegion(battleGeometry.layout.board, input.pointerX, input.pointerY) ? { tx, ty } : null);

    for (const c of input.clicks()) {
      if (c.board) { handleBoardClick(c.x, c.y); continue; }
      if (state.selectedTower && towerPanel.contains(c.x, c.y)) {
        handleWorldClick(c.x, c.y, c.press);
        if (battleConfirm.isOpen) break;
        continue;
      }
      if (hitRegion(placementRegion, c.x, c.y)) {
        if (c.press && !hitRegion(placementRegion, c.press.x, c.press.y)) continue;
        activatePlacement();
        continue;
      }
      const clickedSpell = hitSpell(c.x, c.y);
      if (clickedSpell) {
        if (c.press && hitSpell(c.press.x, c.press.y) !== clickedSpell) continue;
        selectSpell(clickedSpell);
        if (battleConfirm.isOpen) break;
        continue;
      }
      if (c.y < hudRegions.topHeight || c.y > renderer.height - BOT_H) handleHUDClick(c.x, c.y, c.press);
      else handleWorldClick(c.x, c.y, c.press);
      if (paused || battleConfirm.isOpen || operations.isOpen || settingsScreen.isOpen) break;
    }

    if (battleConfirm.isOpen || operations.isOpen || settingsScreen.isOpen) { input.endFrame(); return; }
    if (input.wasKeyPressed('Space')) pauseBattle();
    if (input.wasKeyPressed('Escape')) {
      touchPlacement = null;
      meteorTarget = null;
      placementNotice = '';
      if (state.selectedSpellId) state.selectedSpellId = null;
      else if (state.selectedTower) state.selectedTower = null;
      else if (placingMode) placingMode = false;
      else state.goMenu();
    }
    if (input.wasKeyPressed('KeyS') && state.selectedTower) state.sellTower(state.selectedTower);
    if (input.wasKeyPressed('KeyU') && state.selectedTower) state.upgradeTower(state.selectedTower);
    if (input.wasKeyPressed('KeyT') && state.selectedTower) cycleTarget();
    for (let i = 0; i < TOWER_LIST.length; i++) {
      if (input.wasKeyPressed(`Digit${i + 1}`)) { tutorialAction('select'); touchPlacement = null; meteorTarget = null; placementNotice = ''; state.selectedTowerId = TOWER_LIST[i].id; placingMode = true; state.selectedTower = null; state.selectedSpellId = null; }
    }
    const spellKeys = ['KeyQ', 'KeyW', 'KeyE'];
    for (let i = 0; i < spellKeys.length && i < state.spells.length; i++) {
      if (input.wasKeyPressed(spellKeys[i])) selectSpell(state.spells[i].def.id);
    }

    if (liveBattle()) {
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
  return state.phase === 'playing' && !paused && !settingsScreen.isOpen && !statsScreen.isOpen && !talentPanel.isOpen && !codexScreen.isOpen
    && !operations.isOpen && !challengeDialog.isOpen && !battleConfirm.isOpen && !progress.blocksInput;
}

const render = (_alpha: number): void => {
  const now = performance.now();
  const resting = paused || settingsScreen.isOpen || operations.isOpen || challengeDialog.isOpen || battleConfirm.isOpen || progress.blocksInput;
  const live = liveBattle();
  if (live !== adaptiveActive) {
    adaptive.reset();
    adaptiveActive = live;
  }
  if (talentPanel.isOpen) {
    talentPanel.refresh();
    return;
  }
  if (codexScreen.isOpen || statsScreen.isOpen) return;
  if (state.phase === 'menu') {
    syncControlFocus();
    battleStatus.hidden = gameReading.hidden = true;
    home.show(progress.hasCheckpoint, progress.blocksInput);
    if (returningFromCampaign) {
      returningFromCampaign = false;
      home.focus('start');
    }
    return;
  }
  if (state.phase === 'levelSelect') {
    syncControlFocus();
    battleStatus.hidden = gameReading.hidden = true;
    levelSelect.show(progress.blocksInput);
    return;
  }
  if (live && settings.get().graphics === 'auto' && devicePixelRatio > 1 && adaptive.sample(now)) resizeRenderer();
  const staticPause = paused && state.phase === 'playing'
    && !progress.blocksInput && !settingsScreen.isOpen && !activeToasts.length;
  const pauseKey = staticPause ? `${renderer.width}:${renderer.height}:${renderer.pixelRatio}:${settings.get().locale}` : '';
  if (pauseKey && pauseKey === pausedPaintKey && lastCanvasDraw !== -Infinity) return;
  const interval = live ? 0 : resting || state.phase === 'won' || state.phase === 'lost' ? 1000 / 24 : 1000 / 30;
  if (now - lastCanvasDraw < interval - 1) return;
  pausedPaintKey = pauseKey;
  lastCanvasDraw = now;
  frameCount++;
  const elapsed = now - lastFpsUpdate;
  if (elapsed >= 500) {
    state.fps = Math.round(frameCount * 1000 / elapsed);
    lastFpsUpdate = now;
    frameCount = 0;
  }
  renderer.reducedMotion = !state.effectsEnabled;
  renderer.clear('#0b131d');

  renderer.camX = 0;
  renderer.camY = 0;
  renderer.zoom = 1;

  if (state.phase === 'playing' || state.phase === 'won' || state.phase === 'lost') {
    if (!battleGeometry || battleGeometry.grid !== state.grid
      || battleGeometry.width !== renderer.width || battleGeometry.height !== renderer.height) {
      battleGeometry = { grid: state.grid, width: renderer.width, height: renderer.height,
        layout: battleLayout(renderer.width, renderer.height, state.grid) };
    }
    const layout = battleGeometry.layout;
    const { x, y, zoom } = layout.camera;
    const shake = live ? cameraShake.sample(now) : null;
    // Touch targets stay on the unshaken grid between successive taps.
    const touch = coarsePointer.matches;
    const drawnX = x + (shake?.x ?? 0);
    const drawnY = y + (shake?.y ?? 0);
    battleCamera = { x: touch ? x : drawnX, y: touch ? y : drawnY, zoom };
    renderer.camX = drawnX;
    renderer.camY = drawnY;
    renderer.zoom = zoom;
    const config = settings.get();
    const freeze = !live;
    const key = freeze ? `${renderer.canvas.width}:${renderer.canvas.height}:${renderer.width}:${config.reducedMotion}:${config.graphics}:${config.showRange}:${config.locale}` : '';
    if (freeze && frozenKey === key) {
      renderer.ctx.drawImage(frozenBattle, 0, 0, renderer.width, renderer.height);
    } else {
      worldRenderer.draw(renderer, state, config, layout.board);
      if (state.effectsEnabled) state.particles.draw(renderer);
      if (freeze) {
        frozenBattle.width = canvas.width;
        frozenBattle.height = canvas.height;
        frozenContext.drawImage(canvas, 0, 0);
        frozenKey = key;
      } else if (frozenKey) {
        frozenKey = '';
        frozenBattle.width = frozenBattle.height = 1;
      }
    }
    if (meteorTarget) {
      const radius = state.spells.find(spell => spell.def.id === state.selectedSpellId)?.def.radius;
      if (radius) {
        renderer.circle(meteorTarget.position, radius, 'rgba(255,112,67,0.22)');
        renderer.circle(meteorTarget.position, radius, '#fb923c', false);
      }
    }
    if (touchPlacement) {
      const { tile } = state.grid;
      renderer.rect(touchPlacement.tx * tile, touchPlacement.ty * tile, tile, tile, '#a5f3fc', false);
    }

    renderer.camX = 0;
    renderer.camY = 0;
    renderer.zoom = 1;

    const placingTower = state.phase === 'playing' && placingMode && !state.selectedTower && !state.selectedSpellId;
    const tutorialStep = state.phase === 'playing' && !touchPlacement ? tutorial.active : null;
    const feedback = battleFeedback(now);
    const award = activeToasts[activeToasts.length - 1];
    const contextNotice = layout.detail.compact ? feedback || tutorialStep?.text : state.selectedTower ? feedback : '';
    const infoNotice = contextNotice || (award ? `${t('achievement.unlocked')} · ${award.title}` : '');
    const pointer = live && !coarsePointer.matches ? { x: input.pointerX, y: input.pointerY } : undefined;
    hudRegions = hud.draw(renderer, state, layout, placingTower, infoNotice, pointer);
    drawBattleTools(renderer, layout.tools, Boolean(layout.detail.compact && state.selectedTower), pointer);
    if (state.selectedTower && state.phase === 'playing') towerPanel.draw(renderer, state.selectedTower, state.gold, layout.detail);
    else {
      towerPanel.clear();
      if (!layout.detail.compact) drawBattleContext(renderer, layout.detail, feedback || tutorialStep?.text
        || t(placingTower ? 'battle.place' : 'battle.selectTower'));
    }
    if (tutorialStep && !feedback) drawTutorialTarget(renderer, tutorialStep.id);

    if (paused && state.phase === 'playing') screens.draw(renderer, 'paused', state.score, 0, buildRunSummary());
    if (state.phase === 'won' || state.phase === 'lost') {
      const recentAchievements = activeToasts.filter(toast => toast.achievement).length;
      screens.draw(renderer, state.phase, state.score, state.endlessSeed, buildRunSummary({ stars: state.lastStars, recentAchievements }));
    }
    if (config.showFps && live) renderer.text(`${state.fps} fps`, 8, 52, '#555', 11);
  }

  renderer.camX = 0;
  renderer.camY = 0;
  if (paused && state.phase === 'playing') drawToasts(renderer);
  const combat = state.phase === 'playing';
  const feedback = combat ? battleFeedback(now) : '';
  const status = combat ? `${t('hud.gold')} ${state.gold}. ${t('hud.lives')} ${state.lives}. ${t('hud.wave')} ${state.waves.current}. ${t('hud.score')} ${state.score}.` +
    (state.waves.current === 0 ? ` ${t('battle.prepare')}.` : '') +
    (state.activeWeeklyMode ? ` ${weeklyRuleSummary(state.activeWeeklyMode)}.` : '') +
    (feedback ? ` ${feedback}` : '') : '';
  const summary = state.phase === 'won' || state.phase === 'lost';
  const reading = summary
    ? `${t(state.phase === 'won' ? 'win.title' : 'lose.title')}. ${t('hud.wave')} ${state.waves.current}. ${t('hud.score')} ${state.score}. ${t('win.kills')} ${state.stats.get().kills}.` : '';
  syncReading(battleStatus, t('controls.battleStatus'), status);
  syncReading(gameReading, t('summary.title'), reading);
  syncControlFocus();

};

function syncReading(element: HTMLElement, label: string, value: string): void {
  if (element.hidden !== !value) element.hidden = !value;
  if (element.textContent !== value) element.textContent = value;
  if (element.getAttribute('aria-label') !== label) element.setAttribute('aria-label', label);
}

function syncControlFocus(): void {
  if (challengeDialog.isOpen || operations.isOpen || settingsScreen.isOpen || battleConfirm.isOpen
    || talentPanel.isOpen || codexScreen.isOpen || statsScreen.isOpen || progress.blocksInput) return;
  const group = t('controls.group');
  if (state.phase === 'menu' || state.phase === 'levelSelect') controlFocus.sync(state.phase, group, []);
  else if (state.phase !== 'playing' || paused) controlFocus.sync(paused && state.phase === 'playing' ? 'pause' : state.phase, group, screens.focusRegions);
  else {
    if (!battleGeometry) return;
    const { tiles } = battleGeometry.layout;
    const tx = Math.max(tiles.x, Math.min(tiles.x + tiles.w - 1, keyboardTile.tx));
    const ty = Math.max(tiles.y, Math.min(tiles.y + tiles.h - 1, keyboardTile.ty));
    keyboardTile.tx = tx;
    keyboardTile.ty = ty;
    const tower = state.towers.find(candidate => candidate.tx === tx && candidate.ty === ty);
    const tile = state.grid.at(tx, ty);
    const tileName = tower ? towerName(tower.def.id, tower.def.name)
      : t(tile === TileType.Buildable ? 'controls.buildable' : tile === TileType.Blocked ? 'controls.blocked'
        : tile === TileType.Spawn ? 'campaign.entry' : tile === TileType.Goal ? 'campaign.base' : 'controls.route');
    const tileSize = state.grid.tile * battleCamera.zoom;
    const board: FocusRegion = {
      x: battleCamera.x + tx * tileSize, y: battleCamera.y + ty * tileSize, w: tileSize, h: tileSize,
      label: t('controls.board').replace('{column}', String(tx + 1)).replace('{row}', String(ty + 1)).replace('{tile}', tileName),
      board: true,
    };
    const regions = [...hudRegions.shop, board, ...spellRegions, ...hudRegions.buttons, ...towerPanel.focusRegions];
    if (placementRegion) regions.push(placementRegion);
    controlFocus.sync('battle', group, regions);
  }
}

function drawBattleTools(r: Renderer, tools: BattleLayout['tools'], inspecting: boolean, pointer?: { x: number; y: number }): void {
  spellRegions = [];
  for (const [index, sp] of state.spells.entries()) {
    if (inspecting) break;
    const { x, y, w, h } = tools[index];
    const selected = state.selectedSpellId === sp.def.id;
    const ready = sp.canCast(state);
    const caption = sp.def.heal && !state.repairAllowed ? t('spell.disabled')
      : !sp.ready ? `${Math.ceil(sp.cooldown)}s`
        : sp.def.heal && state.lives >= state.maxLives ? t('spell.fullLives')
          : !sp.def.heal && !sp.hasTarget(state) ? t('spell.awaitingEnemy') : `${sp.def.cost}g`;
    const name = spellName(sp.def.id, sp.def.name);
    const inline = w >= 142;
    const hovered = pointer && hitRegion(tools[index], pointer.x, pointer.y);
    if (selected || (ready && hovered)) r.roundRect(x, y + 2, w, h - 4, 5, '#203244');
    if (inline) r.rect(x, y + h + 2, w, 1, '#293b4c');
    else if (index > 0 && tools[index - 1].y === y) r.rect(x - 3, y + 8, 1, h - 16, '#293b4c');
    r.text(name, inline ? x + 11 : x + w / 2, y + (inline ? 22 : 13), ready ? '#edf3f8' : '#a7b9ca',
      inline ? 12 : 11, inline ? 'left' : 'center', 'bold', 'middle', 'ui', inline ? w / 2 : w - 6);
    r.text(caption, inline ? x + w - 11 : x + w / 2, y + (inline ? 22 : 31), ready ? '#f2c584' : '#a7b9ca',
      10, inline ? 'right' : 'center', 'normal', 'middle', 'ui', inline ? w / 2 - 20 : w - 6);
    spellRegions.push({ x, y, w, h, spellId: sp.def.id, label: `${name}, ${caption}`, pressed: selected, disabled: !ready });
  }

  placementRegion = null;
  if (state.phase !== 'playing' || (!placingMode && !state.selectedSpellId && !state.selectedTower)) return;
  const { x, y, w, h } = tools[3];
  const action = touchPlacement ? 'build' : meteorTarget ? 'cast' : 'cancel';
  const label = touchPlacement ? t('battle.build') : meteorTarget ? t('spell.cast')
    : t(state.selectedSpellId ? 'battle.cancel' : state.selectedTower ? 'battle.deselect' : 'battle.cancelBuild');
  const confirm = action !== 'cancel';
  const hovered = pointer && hitRegion(tools[3], pointer.x, pointer.y);
  if (confirm || hovered) r.roundRect(x, y + 2, w, h - 4, 5, confirm ? '#28415a' : '#203244');
  r.text(label, x + w / 2, y + h / 2, '#e3eef7', 11, 'center', 'bold', 'middle', 'ui', w - 8);
  placementRegion = { x, y, w, h, label, action };
}

function battleFeedback(now: number): string {
  if (placementNotice && now < placementNoticeUntil) return placementNotice;
  if (meteorTarget) return t('spell.confirmTarget');
  if (state.selectedSpellId) return t('spell.chooseTarget').replace('{spell}', spellName(state.selectedSpellId, 'Meteor'));
  if (!touchPlacement) return '';
  return t('placement.confirm').replace('{tower}', towerName(touchPlacement.towerId, getTowerDef(touchPlacement.towerId).name));
}

function drawBattleContext(r: Renderer, box: BattleLayout['detail'], text: string): void {
  const { x, y, w, vertical } = box;
  const theme = getLevelTheme(state.levels.levelNumber);
  const baseX = vertical ? x + 8 : x + w / 2 + 8;
  const pad = 12;
  const labelWidth = vertical ? w - 36 : w / 2 - 36;
  const maxWidth = w - pad * 2;
  if (battleContext?.width !== maxWidth || battleContext.text !== text) {
    const tokens = getLocale() === 'zh' ? Array.from(text) : text.match(/\S+\s*/g) ?? [];
    r.ctx.font = 'bold 11px sans-serif';
    let line = '';
    const lines: string[] = [];
    for (const token of tokens) {
      if (line && r.ctx.measureText(line + token).width > maxWidth) {
        lines.push(line.trim());
        line = '';
      }
      line += token;
    }
    if (line) lines.push(line.trim());
    battleContext = { width: maxWidth, text, lines };
  }
  const { lines } = battleContext;
  const visible = vertical ? 4 : 2;
  drawRouteMarker(r.ctx, x + pad + 4, y + 15, 4, theme.pathCore, theme.background);
  drawRouteMarker(r.ctx, baseX + 8, y + (vertical ? 35 : 15), 4, theme.pathCore, theme.background, true);
  r.text(t('campaign.entry'), x + pad + 16, y + 15, '#a7b9ca', 10, 'left', 'normal', 'middle', 'ui', labelWidth);
  r.text(t('campaign.base'), baseX + 20, y + (vertical ? 35 : 15), '#a7b9ca', 10, 'left', 'normal', 'middle', 'ui', labelWidth);
  r.rect(x + pad, y + (vertical ? 50 : 28), w - pad * 2, 1, '#304458');
  const textY = y + (vertical ? 61 : 39);
  for (const [index, value] of lines.slice(0, visible).entries()) {
    r.text(index === visible - 1 && lines.length > visible ? `${value}…` : value, x + pad, textY + index * 14,
      '#e3eef7', 11, 'left', 'bold', 'top', 'ui', maxWidth);
  }
}

function drawTutorialTarget(r: Renderer, stepId: string): void {
  const pulse = 0.5 + Math.sin(r.motionClock / 180) * 0.5;
  const stroke = `rgba(96, 165, 250, ${0.42 + pulse * 0.34})`;
  let target: RectRegion | null = null;
  if (stepId === 'select') target = hudRegions.shop[0] ?? null;
  else if (stepId === 'wave') target = hudRegions.buttons.find(btn => btn.action === 'send') ?? null;
  else if (stepId === 'upgrade' || stepId === 'inspect') target = state.selectedTower ? null : hudRegions.shop[0] ?? null;
  else if (stepId === 'spell') target = spellRegions[0] ?? null;
  else if (stepId === 'intel') target = hudRegions.buttons.find(btn => btn.action === 'pause') ?? null;
  else if (stepId === 'talent') target = hudRegions.buttons.find(btn => btn.action === 'pause') ?? null;

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

let wasLive = false;
const loop = new GameLoop(update, render, 60, seconds => {
  const active = !document.hidden && liveBattle();
  loop.timeScale = active ? state.playbackSpeed : 1;
  if (wasLive && !active) state.autoSave();
  wasLive = active;
  if (active) music.start();
  else music.stop();
  if (active && document.hasFocus()) state.recordActiveTime(seconds);
});
void progress.initialize(state, () => { paused = true; }).then(() => {
  gameReady = true;
  if (!document.hidden) loop.start();
  document.getElementById('boot-loading')?.remove();
  window.setInterval(() => {
    if (liveBattle() && !document.hidden) state.autoSave();
  }, 4000);
  logger.info('Praesidium booted');
});
