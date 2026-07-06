import { chromium } from 'playwright';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const port = Number(process.env.PORT || 5180);
const baseUrl = process.env.PROOF_URL || `http://127.0.0.1:${port}/`;
const outDir = process.env.PROOF_OUT || path.join(root, 'proof', 'portable-shell-web');
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const server = process.env.PROOF_URL ? null : spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', '--host', '127.0.0.1', '--port', String(port)],
  { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] },
);

try {
  if (server) {
    await waitForServer(baseUrl, server);
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: chromePath,
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
  });

  const page = await context.newPage();
  const consoleEvents = [];
  page.on('console', (message) => {
    if (!['debug', 'info'].includes(message.type())) {
      consoleEvents.push({ type: message.type(), text: message.text() });
    }
  });
  page.on('pageerror', (error) => {
    consoleEvents.push({ type: 'pageerror', text: error.message });
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });

  const screenshots = [];
  const shot = async (name) => {
    const file = `${String(screenshots.length + 1).padStart(2, '0')}-${name}.png`;
    const fullPath = path.join(outDir, file);
    await page.screenshot({ path: fullPath, fullPage: true });
    screenshots.push(file);
  };
  const click = (name) => page.getByRole('button', { name }).click();
  const fill = (placeholder, value) => page.getByPlaceholder(placeholder).fill(value);

  await shot('first-run');
  await click(/continue as guest/i);
  await shot('guest-setup');
  await fill(/display name/i, 'Mina');
  await click(/^start$/i);
  await page.waitForLoadState('networkidle');
  await shot('empty-home');
  await click(/start with a group/i);
  await shot('create-group-empty');
  await fill(/weekend trip/i, 'Weekend Trip');
  await fill(/add friend by name/i, 'Leo');
  await click(/add friend/i);
  await fill(/add friend by name/i, 'Nina');
  await click(/add friend/i);
  await shot('create-group-filled');
  await click(/create group/i);
  await shot('group-before-spend');
  await click(/add spend/i);
  await shot('add-spend-empty');
  await fill(/0\.00/i, '120');
  await fill(/dinner at gusto/i, 'Dinner at Gusto');
  await shot('add-spend-filled');
  await click(/review split/i);
  await shot('review-split');
  await click(/save spend/i);
  await shot('open-balances');
  await click(/settle up/i);
  await shot('settle-up');
  await click(/send link to leo/i);
  await shot('settle-up-request-sent');
  await click(/back/i);
  await shot('group-request-sent');
  await click(/payer view/i);
  await shot('payer-view');
  await click(/i paid mina/i);
  await shot('needs-confirm');
  await click(/confirm received from leo/i);
  await shot('after-confirm-leo');
  await click(/finish group/i);
  await shot('finish-group');
  await click(/finish and save summary/i);
  await shot('group-summary');
  await click(/done/i);
  await shot('history-home');

  await page.reload({ waitUntil: 'networkidle' });
  await shot('after-refresh-persisted');

  const text = await page.locator('body').innerText();
  const storageSnapshot = await page.evaluate(() => ({
    hasPersistedState: Boolean(window.localStorage.getItem('chopdot-portable-shell-state-v1')),
    keys: Object.keys(window.localStorage).sort(),
  }));

  const report = {
    baseUrl,
    viewport: { width: 390, height: 844 },
    screenshots,
    storageSnapshot,
    finalText: text,
    consoleEvents,
    passed: consoleEvents.every((event) => event.type !== 'pageerror'),
  };

  await writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();

  if (consoleEvents.some((event) => event.type === 'pageerror')) {
    throw new Error(`Page errors occurred. See ${path.join(outDir, 'report.json')}`);
  }

  console.log(`Portable shell proof written to ${outDir}`);
} finally {
  if (server) {
    server.kill();
  }
}

async function waitForServer(url, child) {
  const errors = [];
  child.stderr.on('data', (data) => errors.push(data.toString()));

  const started = Date.now();
  while (Date.now() - started < 20_000) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  throw new Error(`Vite did not start at ${url}\n${errors.join('')}`);
}
