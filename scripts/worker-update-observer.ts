import type { BrowserContext, JSHandle } from 'playwright';

const poll = { polling: 50, timeout: 15_000 };

export async function observeWorkerUpdates(context: BrowserContext, scope: string) {
  // A same-origin page outside the game scope can watch activation without keeping the old worker in use.
  const page = await context.newPage();
  const url = new URL('/worker-observer.html', scope).href;
  await page.route(url, route => route.fulfill({ contentType: 'text/html', body: '<title>Worker observer</title>' }));
  await page.goto(url);
  const registration = await page.evaluateHandle(async scope => {
    const registration = await navigator.serviceWorker.getRegistration(scope);
    if (!registration?.active || navigator.serviceWorker.controller) throw new Error('Expected an active game worker and an uncontrolled observer');
    return registration;
  }, scope);

  async function update() {
    // Keep the installing worker even if a failed install removes it from the registration.
    const change = await registration.evaluateHandle(reg => {
      const change = { worker: reg.installing };
      reg.addEventListener('updatefound', () => { change.worker = reg.installing; }, { once: true });
      return change;
    });
    await registration.evaluate(async reg => { await reg.update(); });
    // waitForFunction resolves only after this handle is non-null.
    return page.waitForFunction(change => change.worker!, change, poll);
  }

  async function waitFor(worker: JSHandle<ServiceWorker>, state: 'redundant' | 'installed' | 'activated') {
    await page.waitForFunction(({ worker, state, registration }) => {
      if (worker.state !== state) return false;
      if (state === 'installed') return registration.waiting === worker;
      if (state === 'activated') return registration.active === worker;
      return true;
    }, { worker, state, registration }, poll);
  }

  return { update, waitFor };
}
