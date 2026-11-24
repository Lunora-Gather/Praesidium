import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, webkit, type Page } from 'playwright';
import { serveBuild } from './browser-server';

const engineList = { chromium, webkit };
const args = process.argv.slice(2);
const engines = args.length ? args : Object.keys(engineList);
const app = await serveBuild(process.env.TEST_BUILD_DIR);
const board = (page: Page) => page.getByRole('button', { name: /^Battlefield, column/ });
const press = (page: Page, name: string) => page.getByRole('button', { name, exact: true }).press('Enter');

try {
  for (const engine of engines) {
    const type = engineList[engine as keyof typeof engineList];
    assert(type, `Unknown browser: ${engine}`);
    const browser = await type.launch();
    try {
      const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, serviceWorkers: 'block' });
      const errors: Error[] = [];
      const first = await context.newPage();
      first.on('pageerror', error => errors.push(error));
      await first.goto(app.url);
      await press(first, 'Endless Mode');
      await board(first).waitFor();
      await first.reload();
      await board(first).waitFor({ timeout: 5000 });

      const second = await context.newPage();
      second.on('pageerror', error => errors.push(error));
      await second.goto(app.url);
      await second.locator('#game-controls button').first().waitFor();
      assert.equal(await board(second).count(), 0, 'Opening a second tab must not create a second live writer for the same run');
      await second.getByRole('button', { name: 'Resume', exact: true }).waitFor();
      await press(second, 'Endless Mode');
      await second.getByRole('dialog', { name: /checkpoint|saved run/i }).waitFor({ timeout: 3000 });
      await press(second, 'Cancel');
      await second.getByRole('button', { name: 'Resume', exact: true }).waitFor();
      await press(second, 'Resume');
      await second.getByRole('dialog', { name: 'Resume this run here?' }).waitFor();
      await press(second, 'Resume here');
      await board(second).waitFor();
      await first.locator('#progress-notice').waitFor();
      assert.match((await first.locator('#progress-notice').textContent()) ?? '', /another tab/);
      await first.bringToFront();
      await first.getByRole('button', { name: 'Resume', exact: true }).waitFor();
      assert.equal(await board(first).count(), 0);

      await second.bringToFront();
      await second.evaluate(() => {
        const put = IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put = function (value, key) {
          if (key === 'checkpoint') throw new DOMException('Test write failure', 'QuotaExceededError');
          return put.call(this, value, key);
        };
        window.addEventListener('restore-qa-writes', () => { IDBObjectStore.prototype.put = put; }, { once: true });
        window.dispatchEvent(new Event('blur'));
      });
      await second.getByRole('button', { name: /progress could not be saved/i }).waitFor();
      await second.evaluate(() => window.dispatchEvent(new Event('restore-qa-writes')));
      await second.locator('#progress-notice').click();
      await press(second, 'Retry saving');
      await second.locator('#progress-notice').waitFor({ state: 'hidden' });

      // Export through the real UI, reject an invalid file, then restore the actual download.
      if (await second.getByRole('button', { name: 'Pause', exact: true }).count()) await press(second, 'Pause');
      await press(second, 'Settings');
      await press(second, 'Manage saved progress');
      const [download] = await Promise.all([second.waitForEvent('download'), press(second, 'Download backup')]);
      assert.equal(download.suggestedFilename(), 'praesidium-progress.json');
      const backup = await readFile((await download.path())!);
      assert.equal(JSON.parse(backup.toString('utf8')).checkpoint.v, 2);
      const input = second.locator('#progress-backup-input');
      await input.setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
      await second.getByRole('button', { name: /invalid or unsupported backup/i }).waitFor();
      await input.setInputFiles({ name: 'valid.json', mimeType: 'application/json', buffer: backup });
      await second.getByRole('dialog', { name: 'Restore this backup?' }).waitFor();
      await press(second, 'Restore backup');
      await second.getByRole('button', { name: /backup restored/i }).waitFor();
      await press(second, 'Back');
      await press(second, 'Resume');
      await board(second).waitFor();
      assert.deepEqual(errors, []);
      console.log(`PASS ${engine}: refresh, fenced takeover, replacement cancellation, failed-write retry and backup round-trip`);
      await context.close();
    } finally {
      await browser.close();
    }
  }
} finally {
  await app.close();
}
