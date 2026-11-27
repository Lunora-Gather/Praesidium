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
  'docs/media/praesidium-hero-menu.png',
  'docs/media/praesidium-campaign-route.png',
  'docs/media/praesidium-combat.png',
  'docs/media/praesidium-weekly-mode.png',
  'docs/media/praesidium-mobile-landscape.png',
  '.github/ISSUE_TEMPLATE/bug_report.md',
  '.github/ISSUE_TEMPLATE/playtest_feedback.md',
  '.github/ISSUE_TEMPLATE/config.yml',
  '.github/workflows/deploy.yml',
  'public/manifest.json',
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
check('PR workflow exercises both installed engines', contains('.github/workflows/verify.yml', 'pull_request:')
  && contains('.github/workflows/verify.yml', 'chromium webkit') && contains('.github/workflows/verify.yml', 'npm run verify:browser'));
check('deploy verifies real browsers before publishing', contains('.github/workflows/deploy.yml', 'npm run verify:browser'));

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
check('html loads the public manifest', html.includes('href="/manifest.json"'));
check('html declares a responsive viewport and permits zoom', html.includes('width=device-width, initial-scale=1.0') && !html.includes('user-scalable=no'));
check('html avoids blocking Google Fonts', !html.includes('fonts.googleapis.com') && !html.includes('fonts.gstatic.com'));
check('html registers versioned service worker', html.includes("serviceWorker.register('./sw.js', { updateViaCache: 'none' })"));

// README and docs
check('README mentions quality verification', contains('README.md', 'npm run verify'));
check('README mentions balance sim', contains('README.md', 'npm run balance:sim'));
check('README links release docs', contains('README.md', 'docs/RELEASE_CHECKLIST.md'));
check('README embeds real media captures', contains('README.md', 'docs/media/praesidium-hero-menu.png') && contains('README.md', 'docs/media/praesidium-combat.png'));
check('privacy explains localStorage', contains('docs/PRIVACY.md', 'localStorage'));
check('changelog has Unreleased section', contains('CHANGELOG.md', '## Unreleased'));
check('final QA defines release candidate criteria', contains('docs/FINAL_RELEASE_QA.md', 'public free-game release candidate'));
check('mobile QA covers tower drawer', contains('docs/MOBILE_QA.md', 'Tower drawer'));
check('layout QA covers HUD and level select', contains('docs/LAYOUT_QA.md', 'HUD') && contains('docs/LAYOUT_QA.md', 'Level select'));
check('weekly QA covers official and imported runs', contains('docs/WEEKLY_MODE_QA.md', 'official Weekly Challenge')
  && contains('docs/WEEKLY_MODE_QA.md', 'Pasted codes launch personal practice'));
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
const version = pkg.version ?? '';
const versionedNotes = `docs/RELEASE_NOTES_v${version}.md`;
check('stable package version', /^\d+\.\d+\.\d+$/.test(version));
check('lockfile matches the package version', JSON.parse(read('package-lock.json')).packages?.['']?.version === version);
check('changelog has a current release section', contains('CHANGELOG.md', `## ${version} - `));
check(`release notes define v${version}`, fileExists(versionedNotes) && contains(versionedNotes, `v${version}`));
check('current release notes mention verification', fileExists(versionedNotes) && contains(versionedNotes, 'npm run verify'));
check('deployment status explains empty combined status', contains('docs/DEPLOYMENT_STATUS.md', 'statuses: []'));
check('deployment status names pages URL', contains('docs/DEPLOYMENT_STATUS.md', 'https://lunora-gather.github.io/Praesidium/'));
check('bug template has severity labels', contains('.github/ISSUE_TEMPLATE/bug_report.md', 'S0 Blocker'));
check('playtest template records first wave timing', contains('.github/ISSUE_TEMPLATE/playtest_feedback.md', 'Time to first wave sent'));
check('issue template config links live game', contains('.github/ISSUE_TEMPLATE/config.yml', 'https://lunora-gather.github.io/Praesidium/'));

// Manifest
const manifest = read('public/manifest.json');
check('manifest names Praesidium', manifest.includes('Praesidium'));
check('public manifest aligns campaign count', contains('public/manifest.json', 'ten themed campaign zones'));
check('public manifest start URL is relative', contains('public/manifest.json', '"start_url": "./"'));
check('manifest uses standalone/fullscreen display', manifest.includes('fullscreen') || manifest.includes('standalone'));
check('manifest start_url is relative', manifest.includes('"start_url"'));
check('installed game supports both orientations', manifest.includes('"orientation": "any"'));
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
  'stats.exportReport',
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
check('HUD and battle use the shared field geometry', contains('src/ui/HUD.ts', 'battleHudLayout(r.width, layout.field)'));
check('level select uses native campaign controls', html.includes('aria-labelledby="campaign-difficulty"') && html.includes('class="campaign-deploy"'));
check('level select has compact landscape layout', contains('src/ui/level-select.css', '(orientation: landscape)'));
check('screens use shared layout tokens', contains('src/ui/Screens.ts', 'layoutFor'));
check('settings screen uses a named dialog with a scrollable body',
  contains('src/ui/SettingsScreen.ts', "createElement('dialog')") && contains('src/ui/SettingsScreen.ts', 'aria-labelledby')
  && contains('src/ui/settings.css', '.settings-scroll') && contains('src/ui/settings.css', 'overflow: auto'));
check('stats screen uses a named dialog and scrollable content', contains('src/ui/StatsScreen.ts', 'aria-labelledby')
  && contains('src/ui/stats.css', '.stats-scroll') && contains('src/ui/stats.css', 'overflow: auto'));
check('stats screen exposes product health tab', contains('src/ui/StatsScreen.ts', 'health.title') && contains('src/ui/StatsScreen.ts', 'buildProductHealth'));
check('stats screen can export playtest report', fileExists('src/utils/PlaytestReport.ts') && contains('src/ui/StatsScreen.ts', 'exportReport') && contains('src/main.ts', 'buildPlaytestReport'));
check('daily mission panel exists', fileExists('src/ui/DailyMissionPanel.ts'));
check('daily mission progress can render after runs', contains('src/ui/DailyMissionPanel.ts', 'drawProgress'));
check('daily mission progress leaves short results unobstructed', contains('src/ui/DailyMissionPanel.ts', 'if (!isSideRail && r.height < 740) return'));
check('daily mission rewards persist once', contains('src/utils/SaveSystem.ts', 'recordDailyMissionProgress') && contains('src/utils/SaveSystem.ts', 'dailyMissionClaims'));
check('weekly mode system exists', fileExists('src/utils/WeeklyMode.ts') && contains('src/utils/WeeklyMode.ts', 'weeklyMode'));
check('weekly run badge exists', fileExists('src/ui/WeeklyRunBadge.ts') && contains('src/ui/WeeklyRunBadge.ts', 'drawWeeklyRunBadge'));
check('weekly rules affect seeded runs', contains('src/game/GameState.ts', 'weeklyModeActive') && contains('src/game/waves/WaveManager.ts', 'setWeeklyRules'));
check('campaign has ten levels', contains('src/game/grid/LevelManager.ts', 'LEVEL_9') && contains('src/game/grid/LevelManager.ts', 'LEVEL_10') && contains('src/game/grid/LevelManager.ts', 'Apex Bastion'));
check('level themes include ten-level campaign themes', contains('src/ui/LevelThemes.ts', 'overdrive-gate') && contains('src/ui/LevelThemes.ts', 'apex-bastion'));
check('selftest covers ten-level campaign', contains('scripts/selftest.ts', 'campaign has at least ten levels'));
check('balance sim has late campaign review', contains('scripts/balance-sim.ts', 'Late Campaign Review') && contains('scripts/balance-sim.ts', 'LATE_CAMPAIGN_START'));
check('balance sim names late campaign maps', contains('scripts/balance-sim.ts', 'level 9') && contains('scripts/balance-sim.ts', 'level 10'));
check('balance sim has new-player probe', contains('scripts/balance-sim.ts', 'New-player Pressure Probe') && contains('scripts/balance-sim.ts', 'newcomer'));
check('run advice supports summary advice', contains('src/utils/RunAdvice.ts', 'buildDefeatAdviceFromSummary'));
check('defeat screen uses run advice', contains('src/ui/Screens.ts', 'buildDefeatAdviceFromSummary'));
check('boss encounters are diversified', contains('src/game/waves/WaveManager.ts', 'bossEncounter') && contains('src/game/waves/WaveManager.ts', 'phantom'));
check('boss encounter classifier exists', fileExists('src/utils/BossEncounter.ts') && contains('src/utils/BossEncounter.ts', 'classifyBossEncounter'));
check('HUD labels boss encounters', contains('src/ui/HUD.ts', 'classifyBossEncounter') && contains('src/ui/HUD.ts', 'encounter.label'));
check('selftest covers boss encounter variety', contains('scripts/selftest.ts', 'later boss encounter changes composition'));
check('selftest covers boss encounter classifier', contains('scripts/selftest.ts', 'boss classifier detects fast escort'));
check('talent screen has native modal focus and scrollable content', html.includes('<dialog id="talent-screen"')
  && contains('src/ui/TalentPanel.ts', 'this.dialog.showModal()') && contains('src/ui/talents.css', 'overflow: auto'));
check('codex uses native scroll and the combat sprites', html.includes('<dialog id="codex-screen"')
  && contains('src/ui/CodexScreen.ts', 'drawEnemySprite') && contains('src/ui/codex.css', 'overflow: auto'));
check('tower panel uses a reserved area beside the board', contains('src/ui/TowerPanel.ts', "BattleLayout['detail']")
  && contains('src/main.ts', 'state.gold, layout.detail'));
check('level themes exist', fileExists('src/ui/LevelThemes.ts'));
check('world renderer uses level themes', contains('src/ui/WorldRenderer.ts', 'getLevelTheme'));
check('world renderer draws battle backdrop', contains('src/ui/WorldRenderer.ts', 'drawBattleBackdrop'));
check('world renderer draws path flow markers', contains('src/ui/WorldRenderer.ts', 'drawPathFlow'));
check('combat renders cached tower and enemy sprites', contains('src/ui/WorldRenderer.ts', 'drawTowerSprite')
  && contains('src/ui/WorldRenderer.ts', 'drawEnemySprite') && fileExists('src/ui/BattleSprites.ts'));
check('battle information area has boss warning', contains('src/ui/HUD.ts', 'drawBossWarning'));
check('HUD uses shared compact geometry', contains('src/ui/HUD.ts', 'battleHudLayout') && contains('src/ui/BattleLayout.ts', 'battleTopHeight'));
check('tower panel has mobile drawer', contains('src/ui/TowerPanel.ts', 'drawMobileDrawer'));
check('screens have compact layout', contains('src/ui/Screens.ts', 'compact'));
check('home loads its locally bundled artwork', fileExists('src/assets/home-outpost.webp') && html.includes('src/assets/home-outpost.webp'));
check('home keeps the daily weekly ops brief and four modes available', html.includes('data-home-action="brief"')
  && ['endless', 'daily', 'weekly', 'challenge'].every(action => html.includes(`data-home-action="${action}"`)));
check('home has a compact landscape layout', contains('src/ui/home.css', '(orientation: landscape)'));
check('campaign route lists all stages', html.includes('<ol data-campaign="route">') && contains('src/ui/LevelSelect.ts', 'index < this.levels.total'));
check('campaign preview renders the actual path', contains('src/ui/LevelSelect.ts', 'drawRouteMap') && contains('src/ui/RoutePreview.ts', 'level.waypoints'));
check('tutorial has a real Intel discovery action', contains('src/utils/Tutorial.ts', "'intel'")
  && contains('src/main.ts', "tutorialAction('intel')") && contains('src/utils/i18n.ts', 'tutorial.intel'));
check('tutorial highlights target controls', contains('src/main.ts', 'drawTutorialTarget') && contains('src/main.ts', 'findFirstBuildableScreenTile'));
check('settings persist mute', contains('src/config/Settings.ts', 'muted') && contains('src/config/Settings.ts', 'save(KEY, this.current)'));
check('audio has compressor', contains('src/engine/Audio.ts', 'DynamicsCompressorNode'));
check('audio has SFX throttling', contains('src/engine/Audio.ts', 'canPlay'));
check('particle system has meteor impact', contains('src/game/effects/ParticleSystem.ts', 'meteorImpact'));
check('particle system has freeze pulse', contains('src/game/effects/ParticleSystem.ts', 'freezePulse'));
check('particle system has boss death effect', contains('src/game/effects/ParticleSystem.ts', 'bossDeath'));
check('particle system caps pooled effects', contains('src/game/effects/ParticleSystem.ts', 'MAX_PARTICLES'));
check('main wires enhanced spell effects', contains('src/main.ts', 'meteorImpact'));
check('renderer caps device pixel ratio', contains('src/engine/Renderer.ts', 'resize(maxPixelRatio = 2)') && contains('src/engine/Renderer.ts', 'Math.min(maxPixelRatio, window.devicePixelRatio'));
check('service worker builds a versioned cache', contains('public/sw.js', '${RELEASE}-${REVISION}')
  && contains('vite.config.ts', 'praesidium-v${version}'));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
