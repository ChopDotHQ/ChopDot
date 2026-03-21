#!/usr/bin/env node
/**
 * UX metrics pass:
 * - Task timings (success rate + duration ms)
 * - Runtime interaction smoothness proxies (RAF delta + long tasks)
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const APP_URL = process.env.UI_AUDIT_URL || 'http://localhost:5173';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = path.join(__dirname, '../output/playwright', `ui-audit-ux-metrics-${timestamp}`);
fs.mkdirSync(runDir, { recursive: true });

async function gotoGuest(page) {
  await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 20000 });
  const guest = page.getByRole('button', { name: /continue as guest/i });
  if ((await guest.count()) > 0) {
    await guest.first().click();
    await page.waitForTimeout(1000);
  }
}

async function measureLongTasksSetup(page) {
  await page.addInitScript(() => {
    window.__auditLongTasks = [];
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            window.__auditLongTasks.push({
              startTime: e.startTime,
              duration: e.duration,
              name: e.name,
            });
          }
        });
        observer.observe({ type: 'longtask', buffered: true });
        window.__auditLongTaskObserver = observer;
      } catch {
        // noop
      }
    }
  });
}

async function sampleRaf(page, frames = 120) {
  return page.evaluate(async (f) => {
    const deltas = [];
    await new Promise((resolve) => {
      let count = 0;
      let prev = performance.now();
      function tick(now) {
        deltas.push(now - prev);
        prev = now;
        count += 1;
        if (count >= f) resolve();
        else requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
    const sorted = [...deltas].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    const over33 = deltas.filter((d) => d > 33).length;
    return { frameCount: deltas.length, p95DeltaMs: p95, over33msFrames: over33 };
  }, frames);
}

async function getLongTasks(page) {
  return page.evaluate(() => {
    const arr = window.__auditLongTasks || [];
    const max = arr.reduce((m, x) => Math.max(m, x.duration || 0), 0);
    const total = arr.reduce((s, x) => s + (x.duration || 0), 0);
    return { count: arr.length, maxDuration: max, totalDuration: total };
  });
}

async function timeStep(name, fn) {
  const start = Date.now();
  try {
    await fn();
    return { name, ok: true, ms: Date.now() - start };
  } catch (error) {
    return { name, ok: false, ms: Date.now() - start, error: String(error?.message || error) };
  }
}

async function runJourney(page) {
  const steps = [];
  steps.push(await timeStep('goto-guest', async () => {
    await gotoGuest(page);
  }));
  steps.push(await timeStep('open-wallet-sheet', async () => {
    const connectBtn = page.getByRole('button', { name: /connect wallet/i }).first();
    if ((await connectBtn.count()) === 0) throw new Error('connect wallet button not found');
    await connectBtn.click();
    await page.waitForTimeout(400);
  }));
  steps.push(await timeStep('close-wallet-sheet-escape', async () => {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }));
  steps.push(await timeStep('tab-people', async () => {
    await page.locator('button:has-text("People")').first().click();
    await page.waitForTimeout(350);
  }));
  steps.push(await timeStep('tab-activity', async () => {
    await page.locator('button:has-text("Activity")').first().click();
    await page.waitForTimeout(350);
  }));
  steps.push(await timeStep('tab-you', async () => {
    await page.locator('button:has-text("You")').first().click();
    await page.waitForTimeout(350);
  }));
  return steps;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  const out = { appUrl: APP_URL, timestamp: new Date().toISOString(), journeys: [], smoothness: {} };

  try {
    await measureLongTasksSetup(page);
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 20000 });

    for (let i = 0; i < 5; i += 1) {
      const steps = await runJourney(page);
      out.journeys.push({ run: i + 1, steps });
    }

    await gotoGuest(page);
    const pre = await sampleRaf(page, 90);
    await page.locator('button:has-text("People")').first().click();
    await page.waitForTimeout(350);
    await page.locator('button:has-text("Activity")').first().click();
    await page.waitForTimeout(350);
    await page.locator('button:has-text("Pots")').first().click();
    await page.waitForTimeout(350);
    const post = await sampleRaf(page, 90);
    const lt = await getLongTasks(page);
    out.smoothness = { pre, post, longTasks: lt };
  } finally {
    await browser.close();
  }

  const summary = {
    runCount: out.journeys.length,
    steps: {},
  };
  for (const run of out.journeys) {
    for (const s of run.steps) {
      if (!summary.steps[s.name]) summary.steps[s.name] = [];
      summary.steps[s.name].push(s);
    }
  }
  for (const [k, arr] of Object.entries(summary.steps)) {
    const ok = arr.filter((x) => x.ok).length;
    const avg = Math.round(arr.reduce((acc, x) => acc + x.ms, 0) / arr.length);
    summary.steps[k] = { attempts: arr.length, successRate: `${ok}/${arr.length}`, avgMs: avg };
  }

  const outPath = path.join(runDir, 'ux-metrics-results.json');
  fs.writeFileSync(outPath, JSON.stringify({ ...out, summary }, null, 2));
  console.log('UX metrics audit:', outPath);
  console.log('Summary:', JSON.stringify(summary, null, 2));
  console.log('Smoothness:', JSON.stringify(out.smoothness, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
