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
  'docs/FINAL_RELEASE_QA.md',
  'manifest.json',
  'index.html',
];
for (const path of requiredFiles) check(`required file ${path}`, fileExists(path));

// Package scripts
const pkg = JSON.parse(read('package.json')) as { scripts?: Record<string, string> };
check('package has typecheck script', !!pkg.scripts?.typecheck);
check('package has selftest script', !!pkg.scripts?.selftest);
check('package has save restore test script', !!pkg.scripts?.['test:save']);
check('package has balance simulation script', !!pkg.scripts?.['balance:sim']);
check('package has release audit script', !!pkg.scripts?.['release:audit']);
check('verify runs release audit', !!pkg.scripts?.verify?.includes('release:audit'));
check('verify runs balance sim', !!pkg.scripts?.verify?.includes('balance:sim'));
check('verify runs production build', !!pkg.scripts?.verify?.includes('build'));

// HTML metadata
const html = read('index.html');
check('html has release title', html.includes('<title>Praesidium — Sci-Fi Tower Defense</title>'));
check('html has meaningful description', html.includes('sci-fi tower defense web game'));
check('html has canonical URL', html.includes('https://lunora-gather.github.io/Praesidium/'));
check('html has Open Graph title', html.includes('og:title'));
check('html has Open Graph description', html.includes('og:description'));
check('html has Twitter title', html.includes('twitter:title'));
check('html has dark color scheme', html.includes('color-scheme'));
check('html loads manifest', html.includes('href="./manifest.json"'));

// README and docs
check('README mentions quality verification', contains('README.md', 'npm run verify'));
check('README mentions balance sim', contains('README.md', 'npm run balance:sim'));
check('README links release docs', contains('README.md', 'docs/RELEASE_CHECKLIST.md'));
check('privacy explains localStorage', contains('docs/PRIVACY.md', 'localStorage'));
check('changelog has Unreleased section', contains('CHANGELOG.md', '## Unreleased'));
check('final QA defines release candidate criteria', contains('docs/FINAL_RELEASE_QA.md', 'public free-game release candidate'));
check('mobile QA covers tower drawer', contains('docs/MOBILE_QA.md', 'Tower drawer'));

// Manifest
const manifest = read('manifest.json');
check('manifest names Praesidium', manifest.includes('Praesidium'));
check('manifest uses standalone/fullscreen display', manifest.includes('fullscreen') || manifest.includes('standalone'));
check('manifest start_url is relative', manifest.includes('"start_url"'));

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
check('level themes exist', fileExists('src/ui/LevelThemes.ts'));
check('world renderer uses level themes', contains('src/ui/WorldRenderer.ts', 'getLevelTheme'));
check('world renderer has boss warning', contains('src/ui/WorldRenderer.ts', 'drawBossWarning'));
check('HUD has tiny screen branch', contains('src/ui/HUD.ts', 'isUltraTiny'));
check('tower panel has mobile drawer', contains('src/ui/TowerPanel.ts', 'drawMobileDrawer'));
check('screens have compact layout', contains('src/ui/Screens.ts', 'compact'));
check('tutorial has Intel step', contains('src/utils/Tutorial.ts', 'tutorial.intel'));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
