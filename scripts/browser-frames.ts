import assert from 'node:assert/strict';
import { chromium, webkit, type Page } from 'playwright';
import { serveBuild } from './browser-server';

const app = await serveBuild(process.env.TEST_BUILD_DIR);
const engines = { chromium, webkit };
async function measure(page: Page, scene: string) {
  const metrics = await page.evaluate(async () => {
    const state = window as typeof window & { sampleFrames?: number[] };
    state.sampleFrames = [];
    const start = performance.now();
    await new Promise(resolve => setTimeout(resolve, 2000));
    const seconds = (performance.now() - start) / 1000;
    const frames = state.sampleFrames;
    state.sampleFrames = undefined;
    const deltas = frames.slice(1).map((time, index) => time - frames[index]).sort((a, b) => a - b);
    return { fps: frames.length / seconds, p95Ms: deltas[Math.max(0, Math.ceil(deltas.length * .95) - 1)] ?? 0 };
  });
  console.log(`${scene}: ${metrics.fps.toFixed(1)} canvas frames/s, p95 ${metrics.p95Ms.toFixed(1)} ms between draws`);
  return metrics;
}
try {
  for (const name of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(engines)) {
    const engine = engines[name as keyof typeof engines];
    assert(engine, `Unknown browser: ${name}`);
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, serviceWorkers: 'block' });
      const page = await context.newPage();
      await page.addInitScript(() => {
        const fillRect = CanvasRenderingContext2D.prototype.fillRect;
        CanvasRenderingContext2D.prototype.fillRect = function (x, y, w, h) {
          if (x === 0 && y === 0 && w === innerWidth && h === innerHeight && this.canvas.id === 'c' && this.fillStyle === '#0a0e14') {
            (window as typeof window & { sampleFrames?: number[] }).sampleFrames?.push(performance.now());
          }
          return fillRect.call(this, x, y, w, h);
        };
      });
      await page.goto(app.url);
      const button = (label: string) => page.getByRole('button', { name: label, exact: true });
      await button('Endless Mode').waitFor();
      const menu = await measure(page, `${name} menu`);
      await button('Endless Mode').press('Enter');
      await button('Send Wave').press('Enter');
      const battle = await measure(page, `${name} battle 1×`);
      await page.getByRole('button', { name: /speed.*1/i }).press('Enter');
      await page.getByRole('button', { name: /speed.*2/i }).press('Enter');
      await measure(page, `${name} battle 3×`);
      await button('Pause').press('Enter');
      await button('Resume').waitFor();
      const paused = await measure(page, `${name} paused`);
      assert(battle.fps > 25, 'battle draws must not stall on the benchmark host');
      assert(menu.fps <= 40 && paused.fps <= 32, 'non-battle scenes should not draw at battle cadence');
      await context.close();
    } finally { await browser.close(); }
  }
} finally { await app.close(); }
