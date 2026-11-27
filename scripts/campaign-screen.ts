import assert from 'node:assert/strict';
import { chromium, webkit, type Page } from 'playwright';
import { join } from 'node:path';
import { serveBuild } from './browser-server';

const app = await serveBuild(process.env.TEST_BUILD_DIR);
const captureDirectory = process.env.TEST_CAMPAIGN_CAPTURE_DIR;

async function capture(page: Page, name: string, screen = 'campaign'): Promise<void> {
  if (captureDirectory) await page.screenshot({ path: join(captureDirectory, `${screen}-${name}.png`), scale: 'css' });
}

function campaignLayout(page: Page): Promise<number[][]> {
  return page.locator('#campaign').evaluate(root => [
    '.campaign-briefing', '.campaign-map canvas', '.campaign-legend', '#campaign-mission',
    '.campaign-difficulties', '.campaign-deploy', '.campaign-route h2', '.campaign-route button',
  ].map(selector => {
    const box = root.querySelector(selector)!.getBoundingClientRect();
    return [box.left, box.top + root.scrollTop, box.width, box.height].map(value => Math.round(value));
  }));
}

try {
  for (const engine of [webkit, chromium]) {
    const browser = await engine.launch();
    try {
      const desktop = await browser.newContext({ viewport: { width: 1216, height: 788 }, locale: 'zh-CN' });
      const page = await desktop.newPage();
      page.setDefaultTimeout(8000);
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      const button = (name: string | RegExp) => page.getByRole('button', { name, exact: typeof name === 'string' });
      await page.goto(app.url);
      await page.waitForFunction(() => navigator.serviceWorker.controller?.state === 'activated');
      await desktop.setOffline(true);
      await page.reload();
      const home = page.locator('#home');
      await home.getByRole('heading', { name: 'Praesidium' }).waitFor();
      await page.waitForFunction(() => Boolean(document.querySelector<HTMLImageElement>('.home-art img')?.naturalWidth));
      assert.equal(await home.locator('.home-mode-list button').count(), 4);
      assert.equal(await home.getByRole('button', { name: '继续', exact: true }).count(), 0);
      await capture(page, `${engine.name()}-desktop`, 'home');
      await home.getByRole('button', { name: '简报', exact: true }).press('Enter');
      const brief = page.getByRole('dialog', { name: '作战简报' });
      await brief.waitFor();
      await brief.getByRole('button', { name: '关闭' }).press('Enter');
      await brief.waitFor({ state: 'hidden' });
      await home.getByRole('button', { name: '统计', exact: true }).press('Enter');
      const stats = page.getByRole('dialog', { name: '统计', exact: true });
      await stats.getByRole('heading', { name: '暂无游玩统计' }).waitFor();
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'stats-title');
      await page.keyboard.press('Escape');
      await stats.waitFor({ state: 'hidden' });
      await home.waitFor();
      assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement)?.dataset.homeAction), 'stats');
      await button('开始游戏').press('Enter');
      const campaign = page.locator('#campaign');
      await campaign.getByRole('heading', { name: '战役选关', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'campaign-title');
      assert.equal(await campaign.getByRole('listitem').count(), 10);
      const map = campaign.locator('[data-campaign="map"]');
      const alpha = await map.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
      await capture(page, `${engine.name()}-desktop`);
      assert.equal(await campaign.evaluate(element => element.scrollHeight <= element.clientHeight + 1), true);
      const desktopLayout = await campaignLayout(page);
      await button(/^02 · 交叉路口/).click();
      assert.deepEqual(await campaignLayout(page), desktopLayout, 'A locked stage must not move the briefing or route');
      assert.equal(await campaign.getByRole('heading', { name: '交叉路口', exact: true }).count(), 1);
      assert.equal(await button('未解锁').isDisabled(), true);
      assert.notEqual(await map.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL()), alpha);
      assert.match(await campaign.locator('[data-campaign="deploy-detail"]').textContent() ?? '', /阿尔法前哨/);
      await capture(page, `${engine.name()}-desktop-locked`);
      for (const sector of (await campaign.locator('.campaign-route button').all()).slice(2)) {
        await sector.press('Enter');
        assert.deepEqual(await campaignLayout(page), desktopLayout, 'Switching between locks and theme labels must keep the same layout');
      }
      await button(/^02 · 交叉路口/).press('Escape');
      await campaign.waitFor({ state: 'hidden' });
      await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === '开始游戏');
      await button('无尽模式').press('Enter');
      await button(/^战场/).waitFor();
      await button('暂停').press('Enter');
      await button('继续').waitFor();
      await button('菜单').press('Enter');
      await home.getByRole('button', { name: '继续', exact: true }).waitFor();
      await capture(page, `${engine.name()}-desktop-resume`, 'home');
      await button('开始游戏').press('Enter');
      await button('困难').press('Enter');
      assert.equal(await button('困难').getAttribute('aria-pressed'), 'true');
      await button('开始作战 — 阿尔法前哨').press('Enter');
      const replacement = page.getByRole('dialog', { name: '替换当前续局？' });
      await replacement.waitFor();
      await replacement.getByRole('button', { name: '取消' }).press('Enter');
      await replacement.waitFor({ state: 'hidden' });
      await page.waitForFunction(() => document.querySelector('.campaign-deploy')?.getAttribute('aria-disabled') !== 'true');
      assert.equal(await button('困难').getAttribute('aria-pressed'), 'true');
      await button('开始作战 — 阿尔法前哨').press('Enter');
      await replacement.getByRole('button', { name: '替换并开始' }).press('Enter');
      await button(/^战场/).waitFor();
      await page.waitForFunction(() => document.querySelector('#battle-status')?.textContent?.includes('220'));
      const result = await page.evaluate(() => new Promise<{ difficulty: string; mode: string }>((resolve, reject) => {
        const request = indexedDB.open('praesidium-progress');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const entry = db.transaction('state').objectStore('state').get('checkpoint');
          db.close();
          entry.onsuccess = () => resolve({ difficulty: entry.result.snapshot.difficulty, mode: entry.result.snapshot.origin.kind });
          entry.onerror = () => reject(entry.error);
        };
      }));
      assert.deepEqual(result, { difficulty: 'hard', mode: 'campaign' });
      assert.deepEqual(errors, []);
      await desktop.close();

      const completed = await browser.newContext({ viewport: { width: 320, height: 568 }, locale: 'en-US' });
      const records = await completed.newPage();
      await records.addInitScript(() => localStorage.setItem('praesidium:save', JSON.stringify({
        maxLevelReached: 2, levelStars: { 1: 3 },
        records: { '1:campaign:1:normal': { best: { id: 'record-1', score: 1234567, wave: 12 }, furthestWave: 12 } },
      })));
      await records.goto(app.url);
      await records.getByRole('button', { name: 'Start', exact: true }).press('Enter');
      await records.getByRole('button', { name: 'Start mission — Crossroads' }).waitFor();
      const unlockedLayout = await campaignLayout(records);
      await records.getByRole('button', { name: /^01 · Outpost Alpha/ }).press('Enter');
      await records.getByRole('button', { name: 'Replay mission — Outpost Alpha' }).waitFor();
      assert.match(await records.locator('[data-campaign="deploy-detail"]').textContent() ?? '', /1,234,567/);
      assert.deepEqual(await campaignLayout(records), unlockedLayout, 'Stars and best score must fit the existing action area');
      await completed.close();

      for (const [width, height] of [[320, 568], [568, 320]]) {
        const mobile = await browser.newContext({
          viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US',
        });
        const phone = await mobile.newPage();
        phone.setDefaultTimeout(8000);
        const controls = (name: string | RegExp) => phone.getByRole('button', { name, exact: typeof name === 'string' });
        await phone.goto(app.url);
        const start = controls('Start');
        await start.waitFor();
        await phone.waitForFunction(() => Boolean(document.querySelector<HTMLImageElement>('.home-art img')?.naturalWidth));
        const bounds = await start.boundingBox();
        assert(bounds && bounds.height >= 44 && bounds.y + bounds.height <= height, 'The touch start button fits the initial view');
        assert.equal(await phone.locator('#home').evaluate(element => element.scrollWidth <= element.clientWidth), true);
        await capture(phone, `${engine.name()}-${width}x${height}`, 'home');
        await phone.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        const screen = phone.locator('#campaign');
        await screen.waitFor();
        await capture(phone, `${engine.name()}-${width}x${height}`);
        assert.equal(await screen.evaluate(element => element.scrollWidth <= element.clientWidth), true);
        const deploy = await controls('Start mission — Outpost Alpha').boundingBox();
        assert(deploy && deploy.y + deploy.height <= height, `Launch button fits the initial ${width}×${height} view: ${JSON.stringify(deploy)}`);
        const phoneLayout = await campaignLayout(phone);
        const last = controls(/^10 · Apex Bastion/);
        await last.tap();
        await screen.getByRole('heading', { name: 'Apex Bastion', exact: true }).waitFor();
        assert.equal(await controls('Locked').isDisabled(), true);
        assert.deepEqual(await campaignLayout(phone), phoneLayout, 'Stage previews must preserve mobile layout independently of scroll position');
        await controls(/^01 · Outpost Alpha/).tap();
        await controls('Start mission — Outpost Alpha').tap();
        await controls(/^Battlefield/).waitFor();
        await mobile.close();
      }
      console.log(`PASS ${engine.name()}: offline home artwork and campaign, briefing and stats focus, locked previews, difficulty and saved-run protection, landscape and portrait touch`);
    } finally { await browser.close(); }
  }
} finally { await app.close(); }
