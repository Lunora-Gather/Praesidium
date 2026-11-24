import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';
import { serveBuild } from './browser-server';

const engines = { chromium, webkit };
const app = await serveBuild(process.env.TEST_BUILD_DIR);
try {
  for (const engine of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(engines)) {
    const type = engines[engine as keyof typeof engines];
    assert(type, `Unknown browser: ${engine}`);
    const browser = await type.launch();
    try {
      for (const viewport of [{ width: 320, height: 568 }, { width: 568, height: 320 }]) {
        const context = await browser.newContext({ viewport, hasTouch: true, serviceWorkers: 'block' });
        const page = await context.newPage();
        const errors: Error[] = [];
        page.on('pageerror', error => errors.push(error));
        const button = (name: string | RegExp) => page.getByRole('button', { name, exact: typeof name === 'string' });
        await page.goto(app.url);
        await button('Weekly Challenge').waitFor({ timeout: 4000 });
        await button('Endless Mode').press('Enter');
        const board = button(/^Battlefield, column/);
        await board.waitFor();
        const launch = button(/send.*wave/i);
        const auto = button(/auto.*(send|wave)/i);
        await auto.waitFor({ timeout: 3000 });
        await auto.press('Enter');
        await page.waitForFunction(() => document.querySelector('button[aria-label="Auto Send"]')?.getAttribute('aria-pressed') === 'true');
        await auto.press('Enter');
        assert(await launch.boundingBox());
        const status = page.locator('#battle-status');
        assert.match((await status.textContent()) ?? '', /Gold.*Lives.*Wave.*Score/i);
        await button('Operations briefing').press('Enter');
        const ops = page.getByRole('dialog', { name: 'Operations briefing' });
        await ops.getByRole('heading', { name: /next wave/i }).waitFor();
        await ops.getByRole('heading', { name: /daily objectives/i }).waitFor();
        const [dialogBox, closeBox] = await Promise.all([ops.boundingBox(), ops.getByRole('button', { name: 'Close' }).boundingBox()]);
        assert(dialogBox && closeBox && closeBox.y + closeBox.height <= dialogBox.y + dialogBox.height,
          'briefing close action must be visible without scrolling');
        const details = ops.getByRole('region', { name: 'Briefing details' });
        const heading = ops.getByRole('heading', { name: 'Achievements' });
        await heading.scrollIntoViewIfNeeded();
        const [scrollerBox, achievementBox] = await Promise.all([details.boundingBox(), heading.boundingBox()]);
        assert(scrollerBox && achievementBox && achievementBox.y >= scrollerBox.y
          && achievementBox.y + achievementBox.height <= scrollerBox.y + scrollerBox.height,
          'achievements remain reachable in the scrollable briefing');
        await ops.getByRole('button', { name: 'Close' }).click();
        await ops.waitFor({ state: 'hidden' });
        await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Operations briefing');
        if (viewport.height < 400) {
          for (let i = 0; i < 9; i++) await board.press('ArrowDown');
          await board.press('ArrowRight');
          await button(/battlefield.*column 3.*row 11.*open building site/i).waitFor();
          const tile = await board.boundingBox();
          assert(tile);
          await page.touchscreen.tap(tile.x + tile.width / 2, tile.y + tile.height / 2);
          await page.waitForFunction(() => (document.querySelector('#battle-status')?.textContent ?? '').includes('Tap again'));
          assert.match((await board.getAttribute('aria-label')) ?? '', /open building site/i);
          await page.touchscreen.tap(tile.x + tile.width / 2, tile.y + tile.height / 2);
          await button(/battlefield.*column 3.*row 11.*turret/i).waitFor();
          await page.setViewportSize({ width: 320, height: 568 });
          await page.waitForFunction(() => document.querySelector('button[aria-label="Auto Send"]')?.getBoundingClientRect().y === 33);
          await button(/battlefield.*column 3.*row 11.*turret/i).waitFor();
          await button('Pause').press('Enter');
          await button('Settings').press('Enter');
          const motion = button('Reduce motion');
          const before = await motion.getAttribute('aria-pressed');
          await motion.press('Enter');
          await page.waitForFunction(value => document.querySelector('button[aria-label="Reduce motion"]')?.getAttribute('aria-pressed') !== value, before);
          await button('Language: English').press('Enter');
          await button('语言：中文').waitFor();
          await page.reload();
          await page.getByRole('button', { name: /^战场/ }).waitFor();
          assert.equal(await page.evaluate(() => document.documentElement.lang), 'zh-Hans');
        }
        assert.deepEqual(errors, []);
        console.log(`PASS ${engine} ${viewport.width}×${viewport.height}: HUD controls, accessible briefing, focus recovery${viewport.height < 400 ? ', two-tap building' : ''}`);
        await context.close();
      }
      const challenge = await browser.newContext({ serviceWorkers: 'block' });
      const page = await challenge.newPage();
      await page.goto(app.url);
      await page.getByRole('button', { name: 'Challenge Seed', exact: true }).press('Enter');
      const input = page.locator('#challenge-code');
      const code = 'P2-R1-S1-A1784F01-HV-2025-W26-122340';
      await input.fill(code.replace('-R1-', '-R9-'));
      await input.press('Enter');
      await page.getByText(/unsupported challenge rules version/i).waitFor();
      await input.fill(code);
      await input.press('Enter');
      await page.getByRole('button', { name: 'Operations briefing' }).press('Enter');
      await page.getByText(/practice run.*activity rewards do not apply/i).waitFor();
      console.log(`PASS ${engine}: rejects unknown P2 versions and starts a supported code as personal practice`);
      await challenge.close();
    } finally { await browser.close(); }
  }
} finally { await app.close(); }
