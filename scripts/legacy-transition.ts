import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';
import { serveBuild } from './browser-server';
import { observeWorkerUpdates } from './worker-update-observer';

const legacy = process.env.TEST_LEGACY_BUILD_DIR;
assert(legacy, 'Set TEST_LEGACY_BUILD_DIR to a production build of the currently published revision');
const candidate = process.env.TEST_BUILD_DIR ?? 'dist';
const app = await serveBuild(legacy);
const engines = { chromium, webkit };
try {
  for (const name of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(engines)) {
    const engine = engines[name as keyof typeof engines];
    assert(engine, `Unknown browser: ${name}`);
    app.serve(legacy);
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({ locale: 'en-US' });
      const oldPage = await context.newPage();
      await oldPage.goto(app.url);
      await oldPage.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
      await oldPage.evaluate(() => localStorage.setItem('praesidium:save', JSON.stringify({ version: 1, maxLevelReached: 2, levelStars: { 1: 2 } })));
      const updates = await observeWorkerUpdates(context, app.url);
      app.serve(candidate);
      const upgrade = await updates.update();
      await updates.waitFor(upgrade, 'installed');
      const preview = await context.newPage();
      await preview.goto(app.url);
      await preview.getByRole('button', { name: /finish updating/i }).waitFor({ timeout: 6000 });
      if (await preview.evaluate(() => typeof indexedDB.databases === 'function')) {
        assert(!(await preview.evaluate(() => indexedDB.databases())).some(db => db.name === 'praesidium-progress'));
      }
      const bypassed = await context.newPage();
      // Emulate a navigation which bypasses control but still has an active legacy registration.
      await bypassed.addInitScript({ content: `
        Object.defineProperty(navigator.serviceWorker, 'controller', {
          get: function () { return null; }, configurable: true
        });
      ` });
      await bypassed.goto(app.url);
      const bypassState = await bypassed.evaluate(async () => ({
        controlled: Boolean(navigator.serviceWorker.controller),
        active: Boolean((await navigator.serviceWorker.getRegistration())?.active),
      }));
      assert.deepEqual(bypassState, { controlled: false, active: true });
      await bypassed.getByRole('button', { name: /finish updating/i }).waitFor({ timeout: 6000 });
      await bypassed.close();
      // An older, still-open build can keep playing. The candidate must import the later value.
      await oldPage.evaluate(() => localStorage.setItem('praesidium:save', JSON.stringify({ version: 1, maxLevelReached: 4, levelStars: { 1: 2, 2: 3, 3: 1 } })));
      await preview.close();
      await oldPage.close();
      await updates.waitFor(upgrade, 'activated');

      const current = await context.newPage();
      await current.goto(app.url);
      await current.getByRole('button', { name: 'Settings', exact: true }).press('Enter');
      await current.getByRole('button', { name: 'Manage saved progress' }).press('Enter');
      await current.getByRole('button', { name: 'Download backup' }).waitFor();
      const actual = await current.evaluate(() => new Promise<Record<number, number>>((resolve, reject) => {
        const req = indexedDB.open('praesidium-progress', 1);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const profile = db.transaction('state').objectStore('state').get('profile');
          profile.onerror = () => { db.close(); reject(profile.error); };
          profile.onsuccess = () => { db.close(); resolve(profile.result.levelStars); };
        };
      }));
      assert.deepEqual(actual, { 1: 2, 2: 3, 3: 1 });
      const source = await current.evaluate(() => JSON.parse(localStorage.getItem('praesidium:save')!));
      assert.equal(source.maxLevelReached, 4);
      assert.deepEqual(source.levelStars, actual);
      console.log(`PASS ${name}: active legacy worker fences controlled and bypassed loads; the last save migrates intact`);
      await context.close();
    } finally { await browser.close(); }
  }
} finally { await app.close(); }
