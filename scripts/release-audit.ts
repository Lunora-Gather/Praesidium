// Release audit: static checks for public-release packaging and metadata.
// This intentionally avoids network access. It catches missing files, stale SEO copy,
// missing docs, and critical localization/display keys before a release candidate.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let pass = 0;
let fail = 0;

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function check(name: string, condition: boolean): void {
  if (condition) {
    pass++;
    console.log(`  ok  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}`);
  }
}

function fileExists(path: string): boolean {
  return existsSync(join(root, path));
}

function contains(path: string, fragment: string): boolean {
  return read(path).includes(fragment);
}

function hasI18nKey(source: string, key: string): boolean {
  return source.includes(`'${key}'`) || source.includes(`"${key}"`);
}

console.log('\n=== Praesidium Release Audit ===');

// Required release files
const requiredFiles = [
  'README.md',
  'LICENSE',
  'CHANGELOG.md',
  'docs/PRIVACY.md',
  'docs/RELEASE_CHECKLIST.md',
  'docs/MOBILE_QA.md',
  'docs/LAYOUT_QA.md',
  'docs/WEEKLY_MODE_QA.md',
  'docs/CAMPAIGN_EXPANSION_QA.md',
  'docs/BALANCE_REVIEW_NOTES.md',
  'docs/FINAL_RELEASE_QA.md',
  'docs/MEDIA_KIT.md',
  'docs/PLAYTEST_PLAN.md',
  'docs/PLAYTEST_RESULTS_SUMMARY.md',
  'docs/MARKET_READY_PLAN.md',
  'docs/QA_RESULTS_TEMPLATE.md',
  'docs/RELEASE_NOTES_v1.0.0.md',
  'docs/DEPLOYMENT_STATUS.md',
  '.github/ISSUE_TEMPLATE/bug_report.md',
  '.github/ISSUE_TEMPLATE/playtest_feedback.md',
  '.github/ISSUE_TEMPLATE/config.yml',
  '.github/workflows/deploy.yml',
  'manifest.json',
  'index.html',
];
for (const path of requiredFiles) check(`required file ${path}`, fileExists(path));

// Package scripts
const pkg = JSON.parse(read('package.json')) as { version?: string; scripts?: Record<string, string> };
check('package has typecheck script', !!pkg.scripts?.typecheck);
check('package has selftest script', !!pkg.scripts?.selftest);
check('package has save restore test script', !!pkg.scripts?.['test:save']);
check('package has balance simulation script', !!pkg.scripts?.['balance:sim']);
check('package has performance check script', !!pkg.scripts?.['perf:check']);
check('package has release audit script', !!pkg.scripts?.['release:audit']);
check('verify runs release audit', !!pkg.scripts?.verify?.includes('release:audit'));
check('verify runs balance sim', !!pkg.scripts?.verify?.includes('balance:sim'));
check('verify runs performance check', !!pkg.scripts?.verify?.includes('perf:check'));
check('verify runs production build', !!pkg.scripts?.verify?.includes('build'));

// CI/deploy workflow
check('deploy workflow runs npm ci', contains('.github/workflows/deploy.yml', 'npm ci'));
check('deploy workflow runs verify before publish', contains('.github/workflows/deploy.yml', 'npm run verify'));
check('deploy workflow publishes dist', contains('.github/workflows/deploy.yml', 'publish_dir: ./dist'));
check('deploy workflow uses Node 24', contains('.github/workflows/deploy.yml', 'node-version: 24'));

// HTML metadata
const html = read('index.html');
check('html has release title', html.includes('<title>Praesidium — Sci-Fi Tower Defense</title>'));
check('html has meaningful description', html.includes('sci-fi tower defense web game'));
check('html has canonical URL', html.includes('https://lunora-gather.github.io/Praesidium/'));
check('html has Open Graph title', html.includes('og:title'));
check('html has Open Graph description', html.includes('og:description'));
check('html metadata mentions ten campaign zones', html.includes('ten themed campaign zones'));
check('html has Twitter title', html.includes('twitter:title'));
check('html has dark color scheme', html.includes('color-scheme'));
check('html loads manifest', html.includes('href="./manifest.json"'));
check('html has portrait orientation hint', html.includes('orientation-hint'));
check('html avoids blocking Google Fonts', !html.includes('fonts.googleapis.com') && !html.includes('fonts.gstatic.com'));
check('html registers service worker', html.includes("serviceWorker.register('./sw.js')"));

// README and docs
check('README mentions quality verification', contains('README.md', 'npm run verify'));
check('README mentions balance sim', contains('README.md', 'npm run balance:sim'));
check('README links release docs', contains('README.md', 'docs/RELEASE_CHECKLIST.md'));
check('privacy explains localStorage', contains('docs/PRIVACY.md', 'localStorage'));
check('changelog has Unreleased section', contains('CHANGELOG.md', '## Unreleased'));
check('final QA defines release candidate criteria', contains('docs/FINAL_RELEASE_QA.md', 'public free-game release candidate'));
check('mobile QA covers tower drawer', contains('docs/MOBILE_QA.md', 'Tower drawer'));
check('layout QA covers HUD and level select', contains('docs/LAYOUT_QA.md', 'HUD') && contains('docs/LAYOUT_QA.md', 'Level select'));
check('weekly QA covers seeded runs', contains('docs/WEEKLY_MODE_QA.md', 'Seeded challenge starts with weekly mode active'));
check('campaign expansion QA covers levels 7 to 10', contains('docs/CAMPAIGN_EXPANSION_QA.md', 'Overdrive Gate') && contains('docs/CAMPAIGN_EXPANSION_QA.md', 'Apex Bastion'));
check('campaign expansion QA expects late review', contains('docs/CAMPAIGN_EXPANSION_QA.md', 'Late Campaign Review'));
check('balance review notes cover ten-level campaign', contains('docs/BALANCE_REVIEW_NOTES.md', 'Campaign levels: 10'));
check('balance review notes document late report', contains('docs/BALANCE_REVIEW_NOTES.md', 'Late Campaign Review'));
check('QA results template records release decision', contains('docs/QA_RESULTS_TEMPLATE.md', 'Release decision'));
check('media kit defines screenshot list', contains('docs/MEDIA_KIT.md', 'Screenshot capture list'));
check('playtest plan defines release gate', contains('docs/PLAYTEST_PLAN.md', 'Commercial release gate'));
check('playtest plan references issue templates', contains('docs/PLAYTEST_PLAN.md', '.github/ISSUE_TEMPLATE/playtest_feedback.md'));
check('playtest summary defines market-ready decision', contains('docs/PLAYTEST_RESULTS_SUMMARY.md', 'Market-ready decision'));
check('market ready plan defines market gate', contains('docs/MARKET_READY_PLAN.md', 'Market-ready gate'));
check('package version is 1.0.0', pkg.version === '1.0.0');
check('release notes define v1.0.0', contains('docs/RELEASE_NOTES_v1.0.0.md', 'v1.0.0'));
check('release notes mention verification', contains('docs/RELEASE_NOTES_v1.0.0.md', 'npm run verify'));
check('deployment status explains empty combined status', contains('docs/DEPLOYMENT_STATUS.md', 'statuses: []'));
check('deployment status names pages URL', contains('docs/DEPLOYMENT_STATUS.md', 'https://lunora-gather.github.io/Praesidium/'));
check('bug template has severity labels', contains('.github/ISSUE_TEMPLATE/bug_report.md', 'S0 Blocker'));
check('playtest template records first wave timing', contains('.github/ISSUE_TEMPLATE/playtest_feedback.md', 'Time to first wave sent'));
check('issue template config links live game', contains('.github/ISSUE_TEMPLATE/config.yml', 'https://lunora-gather.github.io/Praesidium/'));

// Manifest
const manifest = read('manifest.json');
check('manifest names Praesidium', manifest.includes('Praesidium'));
check('public manifest aligns campaign count', contains('public/manifest.json', 'ten themed campaign zones'));
check('public manifest start URL is relative', contains('public/manifest.json', '"start_url": "./"'));
check('manifest uses standalone/fullscreen display', manifest.includes('fullscreen') || manifest.includes('standalone'));
check('manifest start_url is relative', manifest.includes('"start_url"'));
check('manifest prefers landscape', manifest.includes('"orientation": "landscape"'));
check('manifest includes game category', manifest.includes('"games"'));
check('manifest includes app shortcut', manifest.includes('"shortcuts"'));

// Localization and display keys
const i18n = read('src/utils/i18n.ts');
const displayText = read('src/utils/displayText.ts');
const criticalKeys = [
  'app.title',
  'menu.start',
  'level.select',
  'hud.nextWave',
  'towerDef.turret.name',
  'towerDef.cannon.desc',
  'enemy.boss.desc',
  'spell.meteor.name',
  'achievement.unlocked',
  'summary.title',
  'summary.nextLevel',
  'stats.title',
  'codex.title',
];
for (const key of criticalKeys) check(`i18n key ${key}`, hasI18nKey(i18n, key));
check('display helpers include tower localization', displayText.includes('towerName'));
check('display helpers include enemy localization', displayText.includes('enemyName'));
check('display helpers include achievement localization', displayText.includes('achievementName'));
check('display helpers include trait localization', displayText.includes('traitName'));

// Key release features wired in code
check('layout system exists', fileExists('src/ui/Layout.ts'));
check('layout system defines breakpoints', contains('src/ui/Layout.ts', 'LayoutMode') && contains('src/ui/Layout.ts', 'layoutFor'));
check('HUD uses shared layout tokens', contains('src/ui/HUD.ts', 'layoutFor'));
check('level select uses shared layout tokens', contains('src/ui/LevelSelect.ts', 'layoutFor'));
check('level select has compact landscape layout', contains('src/ui/LevelSelect.ts', 'isCompactLandscape'));
check('screens use shared layout tokens', contains('src/ui/Screens.ts', 'layoutFor'));
check('settings screen uses shared layout tokens', contains('src/ui/SettingsScreen.ts', 'layoutFor'));
check('stats screen uses shared layout tokens', contains('src/ui/StatsScreen.ts', 'layoutFor'));
check('stats screen exposes product health tab', contains('src/ui/StatsScreen.ts', "tab_health") && contains('src/ui/StatsScreen.ts', 'buildProductHealth'));
check('daily mission panel exists', fileExists('src/ui/DailyMissionPanel.ts'));
check('daily mission progress can render after runs', contains('src/ui/DailyMissionPanel.ts', 'drawProgress'));
check('daily mission panel avoids compact menu overlap', contains('src/ui/DailyMissionPanel.ts', 'shouldDrawMenuPanel'));
check('weekly mode system exists', fileExists('src/utils/WeeklyMode.ts') && contains('src/utils/WeeklyMode.ts', 'weeklyMode'));
check('weekly run badge exists', fileExists('src/ui/WeeklyRunBadge.ts') && contains('src/ui/WeeklyRunBadge.ts', 'drawWeeklyRunBadge'));
check('weekly rules affect seeded runs', contains('src/game/GameState.ts', 'weeklyModeActive') && contains('src/game/waves/WaveManager.ts', 'setWeeklyRules'));
check('campaign has ten levels', contains('src/game/grid/LevelManager.ts', 'LEVEL_9') && contains('src/game/grid/LevelManager.ts', 'LEVEL_10') && contains('src/game/grid/LevelManager.ts', 'Apex Bastion'));
check('level themes include ten-level campaign themes', contains('src/ui/LevelThemes.ts', 'overdrive-gate') && contains('src/ui/LevelThemes.ts', 'apex-bastion'));
check('selftest covers ten-level campaign', contains('scripts/selftest.ts', 'campaign has at least ten levels'));
check('balance sim has late campaign review', contains('scripts/balance-sim.ts', 'Late Campaign Review') && contains('scripts/balance-sim.ts', 'LATE_CAMPAIGN_START'));
check('balance sim names late campaign maps', contains('scripts/balance-sim.ts', 'level 9') && contains('scripts/balance-sim.ts', 'level 10'));
check('run advice supports summary advice', contains('src/utils/RunAdvice.ts', 'buildDefeatAdviceFromSummary'));
check('defeat screen uses run advice', contains('src/ui/Screens.ts', 'buildDefeatAdviceFromSummary'));
check('boss encounters are diversified', contains('src/game/waves/WaveManager.ts', 'bossEncounter') && contains('src/game/waves/WaveManager.ts', 'phantom'));
check('boss encounter classifier exists', fileExists('src/utils/BossEncounter.ts') && contains('src/utils/BossEncounter.ts', 'classifyBossEncounter'));
check('HUD labels boss encounters', contains('src/ui/HUD.ts', 'classifyBossEncounter') && contains('src/ui/HUD.ts', 'encounter.label'));
check('selftest covers boss encounter variety', contains('scripts/selftest.ts', 'later boss encounter changes composition'));
check('selftest covers boss encounter classifier', contains('scripts/selftest.ts', 'boss classifier detects fast escort'));
check('talent panel uses shared layout tokens', contains('src/ui/TalentPanel.ts', 'layoutFor'));
check('codex screen uses shared layout tokens', contains('src/ui/CodexScreen.ts', 'layoutFor'));
check('tower panel uses shared layout tokens', contains('src/ui/TowerPanel.ts', 'layoutFor'));
check('level themes exist', fileExists('src/ui/LevelThemes.ts'));
check('world renderer uses level themes', contains('src/ui/WorldRenderer.ts', 'getLevelTheme'));
check('world renderer draws battle backdrop', contains('src/ui/WorldRenderer.ts', 'drawBattleBackdrop'));
check('world renderer draws path flow markers', contains('src/ui/WorldRenderer.ts', 'drawPathFlow'));
check('world renderer draws tower glow', contains('src/ui/WorldRenderer.ts', 'drawTowerGlow'));
check('world renderer draws enemy shadow', contains('src/ui/WorldRenderer.ts', 'drawEnemyShadow'));
check('world renderer has boss warning', contains('src/ui/WorldRenderer.ts', 'drawBossWarning'));
check('HUD has tiny screen branch', contains('src/ui/HUD.ts', 'isUltraTiny'));
check('tower panel has mobile drawer', contains('src/ui/TowerPanel.ts', 'drawMobileDrawer'));
check('screens have compact layout', contains('src/ui/Screens.ts', 'compact'));
check('screens use adaptive full-screen menu dock', contains('src/ui/Screens.ts', 'drawModeDock'));
check('screens preserve daily weekly ops brief', contains('src/ui/Screens.ts', 'drawOpsBrief'));
check('screens avoid compact landscape backdrop collision', contains('src/ui/Screens.ts', 'isShort'));
check('level select uses campaign route rail', contains('src/ui/LevelSelect.ts', 'drawRouteRail'));
check('level select uses mission slab cards', contains('src/ui/LevelSelect.ts', 'drawMissionSlab'));
check('tutorial has Intel step', contains('src/utils/Tutorial.ts', 'tutorial.intel'));
check('settings persist mute', contains('src/config/Settings.ts', 'muted') && contains('src/config/Settings.ts', 'save(KEY, this.current)'));
check('audio has compressor', contains('src/engine/Audio.ts', 'DynamicsCompressorNode'));
check('audio has SFX throttling', contains('src/engine/Audio.ts', 'canPlay'));
check('particle system has meteor impact', contains('src/game/effects/ParticleSystem.ts', 'meteorImpact'));
check('particle system has freeze pulse', contains('src/game/effects/ParticleSystem.ts', 'freezePulse'));
check('particle system has boss death effect', contains('src/game/effects/ParticleSystem.ts', 'bossDeath'));
check('particle system caps pooled effects', contains('src/game/effects/ParticleSystem.ts', 'MAX_PARTICLES'));
check('main wires enhanced spell effects', contains('src/main.ts', 'meteorImpact'));
check('renderer caps device pixel ratio', contains('src/engine/Renderer.ts', 'Math.min(2, window.devicePixelRatio'));
check('service worker uses versioned cache', contains('public/sw.js', "praesidium-v1.0.0"));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
