import assert from 'node:assert/strict';
import { chromium, webkit, type Locator } from 'playwright';
import { serveBuild } from './browser-server';

const app = await serveBuild(process.env.TEST_BUILD_DIR);
try {
  for (const engine of [webkit, chromium]) {
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({
        viewport: { width: 568, height: 320 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, locale: 'en-US',
      });
      const page = await context.newPage();
      page.setDefaultTimeout(8000);
      const errors: Error[] = [];
      page.on('pageerror', error => errors.push(error));
      await page.addInitScript(() => {
        const put = IDBObjectStore.prototype.put;
        const audio = BaseAudioContext.prototype.createOscillator;
        const counters = { checkpoints: 0, oscillators: 0 };
        Object.assign(window, { counters });
        IDBObjectStore.prototype.put = function (value, key) {
          if (key === 'checkpoint') counters.checkpoints++;
          return put.call(this, value, key);
        };
        BaseAudioContext.prototype.createOscillator = function () {
          counters.oscillators++;
          return audio.call(this);
        };
      });
      const button = (name: string | RegExp) => page.getByRole('button', { name, exact: typeof name === 'string' });
      const board = button(/^Battlefield/);
      const status = page.locator('#battle-status');
      const funds = (gold: number) => page.waitForFunction(gold => document.querySelector('#battle-status')?.textContent?.includes(`GOLD ${gold}.`), gold);
      const tap = async (locator: Locator) => {
        await locator.waitFor();
        const box = await locator.boundingBox();
        assert(box);
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      };

      await page.goto(app.url);
      await tap(button('Endless Mode'));
      await board.waitFor();
      const cell = await board.boundingBox();
      assert(cell);
      const x = cell.x + cell.width * 7.5;
      const y = cell.y + cell.height * 9.5;
      if (engine === chromium) {
        const cdp = await context.newCDPSession(page);
        const edge = cell.x + cell.width * 8;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: edge + 3, y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: edge - 3, y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForTimeout(100);
        assert.doesNotMatch(await status.textContent() ?? '', /Tap again/, 'Crossing a tile boundary must not arm a build');
        await cdp.detach();
      }
      await page.touchscreen.tap(x, y);
      await page.waitForFunction(() => document.querySelector('#battle-status')?.textContent?.includes('Tap again to build'));
      await funds(200);
      const build = button('Build');
      assert((await build.boundingBox())!.height >= 44);
      await tap(build);
      await funds(140);
      await page.touchscreen.tap(x, y);
      const sell = button(/^Sell 36g$/);
      await sell.waitFor();
      const sale = await sell.boundingBox();
      assert(sale && sale.height >= 44 && sale.x + sale.width < x, 'Landscape panel belongs beside the battlefield');
      await page.touchscreen.tap(x, y);
      await funds(140);
      assert.equal(await page.getByRole('dialog').count(), 0);
      await tap(sell);
      const confirm = page.getByRole('dialog', { name: 'Sell this tower?' });
      await confirm.waitFor();
      await confirm.getByRole('button', { name: 'Cancel', exact: true }).tap();
      await funds(140);
      await tap(sell);
      await confirm.getByRole('button', { name: 'Sell 36g', exact: true }).tap();
      await funds(176);

      const cannon = button('Cannon, 180g');
      await tap(cannon);
      await page.waitForFunction(() => document.querySelector('button[aria-label="Cannon, 180g"]')?.getAttribute('aria-pressed') === 'true');
      await page.touchscreen.tap(x, y);
      await page.waitForFunction(() => document.querySelector('#battle-status')?.textContent?.includes('You need 4 more gold'));
      await funds(176);

      assert.equal(await button('Freeze, No enemies').isDisabled(), true);
      assert.equal(await button('Meteor, No enemies').isDisabled(), true);
      await tap(button('Freeze, No enemies'));
      await page.waitForFunction(() => document.querySelector('#battle-status')?.textContent?.includes('Wait for enemies'));
      await funds(176);
      await tap(button('Start wave 1'));
      await page.waitForFunction(() => document.querySelector('#battle-status')?.textContent?.includes('WAVE 1.'));
      await tap(button('Meteor, 80g'));
      await page.waitForFunction(() => document.querySelector('button[aria-label^="Meteor,"]')?.getAttribute('aria-pressed') === 'true');
      await page.touchscreen.tap(x, y);
      await page.waitForFunction(() => document.querySelector('#battle-status')?.textContent?.includes('Tap the highlighted tile'));
      await funds(176);
      await page.touchscreen.tap(x, y);
      await page.waitForFunction(() => document.querySelector('#battle-status')?.textContent?.includes('No enemies in range'));
      await funds(176);
      const spawnX = cell.x + cell.width * .5;
      const spawnY = cell.y + cell.height * 8.2;
      await page.touchscreen.tap(spawnX, spawnY);
      await tap(button('Cast'));
      await page.waitForFunction(() => document.querySelector('button[aria-label^="Meteor,"]')?.getAttribute('aria-label')?.endsWith('s'));
      await tap(button('Game speed 1 times'));
      await tap(button('Game speed 2 times'));
      await button('Game speed 3 times').waitFor();
      await tap(button('Pause'));
      await tap(button('Settings'));
      const settings = page.getByRole('dialog', { name: 'Settings' });
      await settings.waitFor();
      const sound = settings.getByRole('button', { name: 'Sound' });
      const soundSize = await sound.boundingBox();
      assert(soundSize && soundSize.height >= 44);
      await sound.tap();
      const graphics = settings.getByRole('combobox', { name: 'Graphics' });
      await graphics.selectOption('clear');
      await graphics.selectOption('low');
      assert.equal(await page.locator('#c').evaluate((canvas: HTMLCanvasElement) => canvas.width), 568);
      await settings.getByRole('button', { name: 'Back' }).tap();
      const counters = () => page.evaluate(() => ({ ...(window as unknown as { counters: { checkpoints: number; oscillators: number } }).counters }));
      await page.waitForTimeout(300);
      const before = await counters();
      await page.waitForTimeout(4300);
      assert.deepEqual(await counters(), before, 'Paused and muted must not write checkpoints or schedule notes');
      await page.reload();
      await button('Resume').waitFor();
      assert.equal(await board.count(), 0, 'Automatic reload requires explicit resume');
      await tap(button('Resume'));
      await button('Game speed 3 times').waitFor();
      assert.match(await status.textContent() ?? '', /WAVE 1\./);
      await tap(button('Pause'));
      await tap(button('Stats'));
      await page.getByRole('dialog', { name: 'Statistics' }).getByRole('heading', { name: 'Session data' }).waitFor();
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`PASS ${engine.name()}: safe touch sale, spell targeting, graphics, idle audio/storage and paused reload`);
    } finally { await browser.close(); }
  }
} finally { await app.close(); }
