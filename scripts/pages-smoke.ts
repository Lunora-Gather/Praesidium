import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, webkit, type Page } from 'playwright';
import { version } from '../package.json';
import { serveBuild } from './browser-server';

const local = process.argv.includes('--local');
const reference = process.env.TEST_PAGES_BUILD_DIR;
const app = local ? await serveBuild(reference) : null;
const base = new URL(app?.url ?? 'https://lunora-gather.github.io/Praesidium/');
const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

function asset(path: string): URL {
  assert(/^\.\/[\w./-]+$/.test(path) && !path.split('/').includes('..'), `Invalid release asset path: ${path}`);
  const url = new URL(path, base);
  assert(url.href.startsWith(base.href), 'Release asset is outside the game scope');
  return url;
}

async function fetchAsset(url: URL, mime: RegExp): Promise<Buffer> {
  const response = await fetch(url, { cache: 'no-cache', redirect: 'error', signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, `${url.href} did not return HTTP 200`);
  assert.match(response.headers.get('content-type') ?? '', mime, `${url.href} has an unexpected content type`);
  return Buffer.from(await response.arrayBuffer());
}

async function comparePublished(path: string, bytes: Buffer): Promise<void> {
  if (reference) assert.equal(sha256(bytes), sha256(await readFile(join(reference, path))), `${path} differs from the deployed Pages commit`);
}

async function waitForSavedWave(page: Page, wave: number): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const savedWave = await page.evaluate(() => new Promise<number | null>((resolve, reject) => {
      const open = indexedDB.open('praesidium-progress');
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const entry = db.transaction('state').objectStore('state').get('checkpoint');
        db.close();
        entry.onsuccess = () => resolve(entry.result?.snapshot?.waves?.current ?? null);
        entry.onerror = () => reject(entry.error);
      };
    }));
    if (savedWave === wave) return;
    await delay(100);
  }
  assert.fail(`Wave ${wave} did not reach the saved checkpoint`);
}

try {
  const [html, worker] = await Promise.all([
    fetchAsset(base, /text\/html/i), fetchAsset(asset('./sw.js'), /javascript/i),
  ]);
  const shell = html.toString('utf8');
  const sw = worker.toString('utf8');
  assert(shell.includes(`name="praesidium-release" content="${version}"`), `Live HTML is not v${version}`);
  assert(sw.includes(`const RELEASE = "praesidium-v${version}";`), 'Live worker version does not match HTML');
  const entries = /^const PRECACHE = (\[.+\]);$/m.exec(sw);
  assert(entries, 'Live worker has no release integrity manifest');
  const manifest: Array<[string, string]> = JSON.parse(entries[1]);
  assert(manifest.some(([path]) => path === './index.html') && manifest.some(([path]) => path.startsWith('./assets/') && path.endsWith('.js')),
    'Live integrity manifest must cover the shell and the entry module');
  await Promise.all([comparePublished('index.html', html), comparePublished('sw.js', worker), ...manifest.map(async ([path, hash]) => {
    const mime = path.endsWith('.html') ? /html/i : path.endsWith('.js') ? /javascript/i
      : path.endsWith('.css') ? /css/i : path.endsWith('.json') ? /json/i : path.endsWith('.webp') ? /image\/webp/i : /./;
    const bytes = await fetchAsset(asset(path), mime);
    assert.equal(sha256(bytes), hash, `${path} fails integrity verification`);
    if (path === './index.html') assert.equal(sha256(html), hash, 'Root HTML is inconsistent with index.html');
    await comparePublished(path, bytes);
  })]);
  const revision = /^const REVISION = "([a-f\d]+)";$/m.exec(sw)?.[1];
  assert(revision, 'Live worker is missing its release fingerprint');
  console.log(`PASS v${version} revision ${revision}: HTML, worker and ${manifest.length} release assets${reference ? ' match the Pages commit' : ' pass integrity verification'}`);

  for (const engine of [chromium, webkit]) {
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, locale: 'en-US' });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base.href, { waitUntil: 'domcontentloaded' });
      assert.equal(await page.locator('meta[name="praesidium-release"]').getAttribute('content'), version);
      await page.waitForFunction(() => navigator.serviceWorker.controller?.state === 'activated');
      await page.getByRole('button', { name: 'Endless Mode', exact: true }).press('Enter');
      await page.getByRole('button', { name: /^(?:Send Wave|Start wave 1)$/i }).press('Enter');
      await waitForSavedWave(page, 1);
      await page.reload({ waitUntil: 'domcontentloaded' });
      const resume = page.getByRole('button', { name: 'Resume', exact: true });
      await resume.waitFor();
      assert.equal(await page.getByRole('button', { name: 'Pause', exact: true }).count(), 0, 'Automatic reload must start paused');
      await resume.press('Enter');
      await page.getByRole('button', { name: /^Battlefield, column/ }).waitFor();
      assert.match(await page.locator('#battle-status').textContent() ?? '', /wave 1\b/i, 'Battle should reload at the saved wave');
      await context.setOffline(true);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await resume.press('Enter');
      await page.getByRole('button', { name: /^Battlefield, column/ }).waitFor();
      assert.match(await page.locator('#battle-status').textContent() ?? '', /wave 1\b/i, 'Cached game should resume wave 1 offline');
      assert.deepEqual(errors, [], 'No unhandled page errors');
      await context.close();
      console.log(`PASS ${engine.name()}: fresh browser starts a battle, saves wave 1 and reloads it online and offline`);
    } finally { await browser.close(); }
  }
} finally { await app?.close(); }
