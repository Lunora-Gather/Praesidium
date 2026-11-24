import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, webkit, type Page } from 'playwright';
import { build } from 'vite';
import { version as packageVersion } from '../package.json';
import { serveBuild } from './browser-server';

const root = await mkdtemp(join(tmpdir(), 'praesidium-offline-'));
const buildRelease = async (version: string): Promise<string> => {
  const out = join(root, version);
  await build({
    logLevel: 'error', build: { outDir: out, emptyOutDir: true },
    plugins: [{ name: 'offline-test-release', transform(code, id) {
      if (id.endsWith('/src/main.ts')) return code + `\ndocument.documentElement.dataset.testRelease = ${JSON.stringify(version)};`;
    } }],
  });
  const worker = await readFile(join(out, 'sw.js'), 'utf8');
  const html = await readFile(join(out, 'index.html'), 'utf8');
  assert(worker.includes(`const RELEASE = "praesidium-v${packageVersion}";`), 'offline worker must advertise the package version');
  assert(html.includes(`name="praesidium-release" content="${packageVersion}"`), 'served HTML must advertise the package version');
  return out;
};
const waitRelease = (page: Page, value: string) => page.waitForFunction(value =>
  document.documentElement.dataset.testRelease === value && Boolean(document.querySelector('#game-controls button')), value,
  { timeout: 7000 });
const updateWorker = (page: Page) => page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())?.update().catch(() => undefined); });
const engines = { chromium, webkit };
try {
  const earlier = await buildRelease('A');
  const later = await buildRelease('B');
  const latestModule = 'assets/' + (await readdir(join(later, 'assets'))).find(name => name.endsWith('.js'));
  const app = await serveBuild(earlier);
  try {
    for (const name of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(engines)) {
      const engine = engines[name as keyof typeof engines];
      assert(engine, `Unknown browser: ${name}`);
      app.serve(earlier);
      const browser = await engine.launch();
      try {
        const context = await browser.newContext();
        const running = await context.newPage();
        await running.goto(app.url);
        await waitRelease(running, 'A');
        await running.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
        await running.evaluate(() => caches.open('other-project'));
        await running.getByRole('button', { name: 'Endless Mode', exact: true }).press('Enter');
        await running.getByRole('button', { name: /^Battlefield, column/ }).waitFor();

        // A healthy response to HTML with a missing module must not replace the installed release.
        app.serve(later, file => file === latestModule ? 503 : undefined);
        await updateWorker(running);
        const probe = await context.newPage();
        await probe.goto(app.url);
        await waitRelease(probe, 'A');
        assert.equal(await probe.getByRole('button', { name: 'Resume', exact: true }).count(), 1);
        await probe.close();

        // Even an OK response must contain the bytes declared by this build.
        app.serve(later, file => file === latestModule ? 200 : undefined);
        await updateWorker(running);
        const invalid = await context.newPage();
        await invalid.goto(app.url);
        await waitRelease(invalid, 'A');
        await invalid.close();

        app.serve(later);
        await updateWorker(running);
        await running.waitForFunction(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting));
        assert.equal(await running.evaluate(() => document.documentElement.dataset.testRelease), 'A', 'a battle must not be reloaded to activate the update');
        await running.close();

        const relaunched = await context.newPage();
        await relaunched.goto(app.url);
        await relaunched.waitForFunction(async () => !(await navigator.serviceWorker.getRegistration())?.waiting);
        await relaunched.reload();
        await waitRelease(relaunched, 'B');
        app.serve(later, () => 503);
        await relaunched.reload();
        await waitRelease(relaunched, 'B');
        assert.equal(await relaunched.getByRole('button', { name: 'Resume', exact: true }).count(), 1);
        assert((await relaunched.evaluate(() => caches.keys())).includes('other-project'));

        // A compatible rollback may change the shell, never the authoritative save.
        app.serve(earlier);
        await updateWorker(relaunched);
        await relaunched.waitForFunction(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting));
        await relaunched.close();
        const rollback = await context.newPage();
        await rollback.goto(app.url);
        await rollback.waitForFunction(async () => !(await navigator.serviceWorker.getRegistration())?.waiting);
        await rollback.reload();
        await waitRelease(rollback, 'A');
        await rollback.getByRole('button', { name: 'Resume', exact: true }).waitFor();
        console.log(`PASS ${name}: staged release rejects incomplete and mismatched assets, preserves live battle and other caches, starts offline and rolls back to a compatible build with checkpoint`);
        await context.close();
      } finally { await browser.close(); }
    }
  } finally { await app.close(); }
} finally { await rm(root, { recursive: true, force: true }); }
