import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium, type Page } from 'playwright';
import { serveBuild } from './browser-server';

const arg = process.argv[2];
assert(arg, 'Usage: tsx scripts/capture-candidate.ts <output-directory>');
const out = resolve(arg);
await mkdir(out, { recursive: true });
const app = await serveBuild(process.env.TEST_BUILD_DIR);
const browser = await chromium.launch();
const button = (page: Page, name: string | RegExp) => page.getByRole('button', { name, exact: typeof name === 'string' });

try {
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: out, size: { width: 1280, height: 720 } }, serviceWorkers: 'block', locale: 'en-US' });
  const page = await desktop.newPage();
  await page.goto(app.url);
  await button(page, 'Endless Mode').waitFor();
  await page.screenshot({ path: join(out, 'command-deck.png') });
  await button(page, 'Endless Mode').press('Enter');
  const board = button(page, /^Battlefield, column/);
  await board.waitFor();
  for (let i = 0; i < 9; i++) await board.press('ArrowDown');
  await board.press('ArrowRight');
  await board.press('Enter');
  await board.press('ArrowUp');
  await board.press('Enter');
  await button(page, 'Start wave 1').press('Enter');
  await page.waitForFunction(() => document.getElementById('game-announcement')?.textContent?.includes('Wave 1'));
  // Hold on actual live combat long enough to show enemies entering the route in the clip.
  await page.waitForTimeout(7500);
  await page.screenshot({ path: join(out, 'combat.png') });
  const video = page.video();
  await desktop.close();
  assert(video, 'Video recording was not initialized');
  await video.saveAs(join(out, 'gameplay-candidate.webm'));
  await video.delete();

  const phone = await browser.newContext({ viewport: { width: 568, height: 320 }, hasTouch: true, serviceWorkers: 'block', locale: 'en-US' });
  const narrow = await phone.newPage();
  await narrow.goto(app.url);
  await button(narrow, 'Weekly Challenge').press('Enter');
  await button(narrow, 'Operations briefing').waitFor();
  await narrow.screenshot({ path: join(out, 'mobile-landscape.png') });
  await narrow.setViewportSize({ width: 320, height: 568 });
  await narrow.waitForFunction(() => document.querySelector('button[aria-label="Skip wave interval"]')?.getBoundingClientRect().y === 33);
  await narrow.screenshot({ path: join(out, 'mobile-portrait.png') });
  await button(narrow, 'Operations briefing').press('Enter');
  await narrow.getByRole('dialog', { name: 'Operations briefing' }).waitFor();
  await narrow.screenshot({ path: join(out, 'mobile-briefing.png') });
  await phone.close();
  console.log(out);
} finally { await browser.close(); await app.close(); }
