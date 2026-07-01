// Final release gate summary.
// This script does not replace npm run verify. It summarizes the remaining release process
// so the project can distinguish completed repository work from external confirmation work.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

interface GateItem {
  area: string;
  item: string;
  done: boolean;
  evidence: string;
  next: string;
}

function exists(path: string): boolean {
  return existsSync(join(root, path));
}

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function includes(path: string, text: string): boolean {
  return exists(path) && read(path).includes(text);
}

const pkg = JSON.parse(read('package.json')) as { scripts?: Record<string, string> };

const gates: GateItem[] = [
  {
    area: 'Build',
    item: 'verify command exists',
    done: !!pkg.scripts?.verify?.includes('release:audit') && !!pkg.scripts.verify.includes('balance:sim') && !!pkg.scripts.verify.includes('build'),
    evidence: 'package.json scripts.verify',
    next: 'Run npm run verify locally or confirm the latest GitHub Actions run.',
  },
  {
    area: 'Deployment',
    item: 'deploy workflow runs verification before publish',
    done: includes('.github/workflows/deploy.yml', 'npm run verify') && includes('.github/workflows/deploy.yml', 'publish_dir: ./dist'),
    evidence: '.github/workflows/deploy.yml',
    next: 'Confirm the latest Actions run is green and Pages shows the newest build.',
  },
  {
    area: 'Campaign',
    item: '10-level campaign is registered',
    done: includes('src/game/grid/LevelManager.ts', 'LEVEL_10') && includes('src/game/grid/LevelManager.ts', 'Apex Bastion'),
    evidence: 'src/game/grid/LevelManager.ts',
    next: 'Playtest levels 9 and 10 after balance simulation.',
  },
  {
    area: 'Balance',
    item: 'late-campaign review exists',
    done: includes('scripts/balance-sim.ts', 'Late Campaign Review') && includes('scripts/balance-sim.ts', 'Actionable Tuning Notes'),
    evidence: 'scripts/balance-sim.ts',
    next: 'Run npm run balance:sim and paste results into docs/BALANCE_REVIEW_NOTES.md.',
  },
  {
    area: 'Retention',
    item: 'daily and weekly systems are visible',
    done: exists('src/ui/DailyMissionPanel.ts') && exists('src/ui/WeeklyRunBadge.ts') && includes('src/game/GameState.ts', 'weeklyModeActive') && exists('src/utils/PlaytestReport.ts'),
    evidence: 'DailyMissionPanel, WeeklyRunBadge, GameState, PlaytestReport',
    next: 'Use exported playtest reports after outside tests to tune retention and first-run clarity.',
  },
  {
    area: 'QA',
    item: 'major QA runbooks exist',
    done: exists('docs/FINAL_RELEASE_QA.md') && exists('docs/CAMPAIGN_EXPANSION_QA.md') && exists('docs/WEEKLY_MODE_QA.md') && exists('docs/CAPTURE_RUNBOOK.md'),
    evidence: 'docs/*_QA.md and docs/CAPTURE_RUNBOOK.md',
    next: 'Execute the checklists and record final pass/fail notes.',
  },
  {
    area: 'Media',
    item: 'static screenshot set exists',
    done: exists('docs/media/praesidium-hero-menu.png')
      && exists('docs/media/praesidium-campaign-route.png')
      && exists('docs/media/praesidium-combat.png')
      && exists('docs/media/praesidium-weekly-mode.png')
      && exists('docs/media/praesidium-mobile-landscape.png')
      && includes('README.md', 'docs/media/praesidium-hero-menu.png'),
    evidence: 'docs/media/*.png and README screenshots',
    next: 'Capture one short gameplay GIF or video before market-grade promotion.',
  },
  {
    area: 'Playtest',
    item: 'outside playtest templates exist',
    done: exists('docs/PLAYTEST_PLAN.md') && exists('docs/PLAYTEST_RESULTS_SUMMARY.md') && exists('.github/ISSUE_TEMPLATE/playtest_feedback.md'),
    evidence: 'playtest docs and issue templates',
    next: 'Run outside playtests and summarize results before market-grade promotion.',
  },
];

const ready = gates.filter(g => g.done);
const remaining = gates.filter(g => !g.done);

console.log('\n=== Praesidium Release Gate ===');
console.log(`Ready checks: ${ready.length}/${gates.length}`);

console.log('\nReady:');
for (const gate of ready) console.log(`- [${gate.area}] ${gate.item} — ${gate.evidence}`);

if (remaining.length > 0) {
  console.log('\nRepository blockers:');
  for (const gate of remaining) console.log(`- [${gate.area}] ${gate.item} — next: ${gate.next}`);
} else {
  console.log('\nRepository blockers: none detected by release gate.');
}

console.log('\nExternal confirmation still required:');
console.log('- [Deployment] Confirm the latest pushed commit is green in GitHub Actions and Pages shows the newest build.');
console.log('- [Playtest] Run outside playtests and summarize results before market-grade promotion.');
console.log('- [Media] Capture one short gameplay GIF or video before market-grade promotion.');
console.log('- [QA] Execute final checklist passes after any fixes discovered by outside playtests.');

console.log('\nRecommended final order:');
console.log('1. npm run verify');
console.log('2. npm run balance:sim');
console.log('3. Record balance output in docs/BALANCE_REVIEW_NOTES.md');
console.log('4. Confirm static screenshots are current; add GIF/video when an encoder is available');
console.log('5. Run outside playtests and fill docs/PLAYTEST_RESULTS_SUMMARY.md');
console.log('6. Make the market-grade decision in docs/QA_RESULTS_TEMPLATE.md');

if (remaining.length > 0) process.exit(1);
