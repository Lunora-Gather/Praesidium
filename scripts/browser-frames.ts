import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, webkit, type Page } from 'playwright';
import { isRunSnapshot } from '../src/utils/RunSave';
import { denseBattle } from './perf-fixture';
import { serveBuild } from './browser-server';

const app = await serveBuild(process.env.TEST_BUILD_DIR);
const engines = { chromium, webkit };
const source = process.env.TEST_PERF_SNAPSHOT;
const snapshot: unknown = source ? JSON.parse(await readFile(source, 'utf8')) : denseBattle().snapshot();
assert(isRunSnapshot(snapshot), 'Expected a valid game checkpoint');
const scenario = source ? `wave ${snapshot.v === 2 ? snapshot.waves.current : snapshot.waveCurrent}` : 'dense battle';

async function measure(page: Page, scene: string, seconds = 3, sampleHeap?: () => Promise<number>) {
  const heapBefore = await sampleHeap?.();
  const metrics = await page.evaluate(async seconds => {
    const windowWithProbe = window as typeof window & { frameProbe: { frames: number[]; copies: number; gradients: number } | null };
    const probe = { frames: [] as number[], copies: 0, gradients: 0 };
    windowWithProbe.frameProbe = probe;
    const start = performance.now();
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    const elapsed = (performance.now() - start) / 1000;
    windowWithProbe.frameProbe = null;
    const gaps = probe.frames.slice(1).map((time, index) => time - probe.frames[index]).sort((a, b) => a - b);
    const p95 = gaps[Math.max(0, Math.ceil(gaps.length * .95) - 1)] ?? 0;
    const p99 = gaps[Math.max(0, Math.ceil(gaps.length * .99) - 1)] ?? 0;
    return { fps: probe.frames.length / elapsed, p95, p99,
      gradients: probe.gradients / Math.max(1, probe.frames.length), copies: probe.copies };
  }, seconds);
  const heapAfter = await sampleHeap?.();
  console.log(`${scene}: ${metrics.fps.toFixed(1)} draws/s, P95 ${metrics.p95.toFixed(1)} ms, P99 ${metrics.p99.toFixed(1)} ms, ${metrics.gradients.toFixed(1)} gradients/draw`
    + (heapBefore !== undefined && heapAfter !== undefined ? `, collected JS heap ${heapBefore.toFixed(2)} → ${heapAfter.toFixed(2)} MiB` : ''));
  return metrics;
}

try {
  for (const name of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(engines)) {
    const engine = engines[name as keyof typeof engines];
    assert(engine, `Unknown browser: ${name}`);
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
        serviceWorkers: 'block', locale: 'en-US',
      });
      const page = await context.newPage();
      const cdp = name === 'chromium' ? await context.newCDPSession(page) : null;
      const rate = Number(process.env.TEST_CPU_THROTTLE ?? 1);
      if (cdp && rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      const heap = cdp ? async () => {
        await cdp.send('HeapProfiler.collectGarbage');
        return (await cdp.send('Runtime.getHeapUsage')).usedSize / 1024 ** 2;
      } : undefined;
      await page.addInitScript(snapshot => {
        if (!localStorage.getItem('praesidium:perf-seeded')) {
          localStorage.setItem('praesidium:perf-seeded', '1');
          localStorage.setItem('praesidium:run:snapshot', JSON.stringify(snapshot));
        }
        const w = window as typeof window & { frameProbe: { frames: number[]; copies: number; gradients: number } | null };
        const proto = CanvasRenderingContext2D.prototype;
        const fillRect = proto.fillRect;
        const drawImage = proto.drawImage;
        const linear = proto.createLinearGradient;
        const radial = proto.createRadialGradient;
        proto.fillRect = function (x, y, width, height) {
          if (this.canvas.id === 'c' && x === 0 && y === 0 && width === innerWidth && height === innerHeight
            && (this.fillStyle === '#0a0e14' || this.fillStyle === '#0b131d')) {
            w.frameProbe?.frames.push(performance.now());
          }
          return fillRect.call(this, x, y, width, height);
        };
        proto.drawImage = function (...args: unknown[]) {
          if (w.frameProbe && args[0] === document.getElementById('c')) w.frameProbe.copies++;
          Reflect.apply(drawImage, this, args);
        };
        proto.createLinearGradient = function (...args) {
          if (w.frameProbe) w.frameProbe.gradients++;
          return linear.apply(this, args);
        };
        proto.createRadialGradient = function (...args) {
          if (w.frameProbe) w.frameProbe.gradients++;
          return radial.apply(this, args);
        };
      }, snapshot);
      const button = (label: string | RegExp) => page.getByRole('button', { name: label, exact: typeof label === 'string' });
      await page.goto(app.url);
      await button('Resume').waitFor();
      const menu = await measure(page, `${name} menu`);
      await button('Resume').press('Enter');
      await button(/^Battlefield/).waitFor();
      const battle = await measure(page, `${name} ${scenario} 1×`, 5, heap);
      await button(/game speed 1/i).press('Enter');
      await button(/game speed 2/i).press('Enter');
      await button(/game speed 3/i).waitFor();
      await measure(page, `${name} ${scenario} 3×`, Number(process.env.TEST_SOAK_SECONDS ?? 8), heap);
      await button('Pause').press('Enter');
      await button('Resume').waitFor();
      const paused = await measure(page, `${name} paused ${scenario}`, 4, heap);
      assert(battle.fps > (cdp && rate > 1 ? 10 : 25), 'Battle must keep drawing on the benchmark host');
      assert(menu.fps <= 40 && paused.fps <= 32, 'Non-battle scenes should draw less often');
      assert(paused.fps <= 1 && paused.copies <= 1, 'A settled pause should reuse its rendered frame');
      await context.close();
    } finally { await browser.close(); }
  }
} finally { await app.close(); }
