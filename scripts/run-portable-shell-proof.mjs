import { chromium } from 'playwright';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const port = Number(process.env.PORT || 5180);
const hostProfile = (process.env.HOST_PROFILE || 'web').toLowerCase();
const localBaseUrl = `http://127.0.0.1:${port}/`;
const baseUrl = process.env.PROOF_URL || (hostProfile === 'telegram'
  ? `${localBaseUrl}?tgWebAppStartParam=portable-proof`
  : localBaseUrl);
const defaultOutDir = hostProfile === 'web'
  ? path.join(root, 'proof', 'portable-shell-web')
  : path.join(root, 'proof', `portable-shell-${hostProfile}`);
const outDir = process.env.PROOF_OUT || defaultOutDir;
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
  const context = await browser.newContext(getHostContextOptions(hostProfile));
  await installHostShim(context, hostProfile);
  if (hostProfile === 'telegram') {
    await context.route('https://telegram.org/js/telegram-web-app.js?62', (route) => route.fulfill({
      contentType: 'application/javascript',
      body: '/* Telegram script is provided by the proof shim in this localhost run. */',
    }));
  }

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

  const hostCallLogBeforeReload = await page.evaluate(() => window.__chopdotTelegramProof?.calls ?? []);
  await page.reload({ waitUntil: 'networkidle' });
  await shot('after-refresh-persisted');

  const text = await page.locator('body').innerText();
  const storageSnapshot = await page.evaluate(() => ({
    hasPersistedState: Boolean(window.localStorage.getItem('chopdot-portable-shell-state-v1')),
    keys: Object.keys(window.localStorage).sort(),
  }));
  const capabilityMatrix = await page.evaluate((profile) => {
    let canUseLocalStorage = false;
    try {
      window.localStorage.setItem('__chopdot_capability_test__', '1');
      window.localStorage.removeItem('__chopdot_capability_test__');
      canUseLocalStorage = true;
    } catch {
      canUseLocalStorage = false;
    }

    const safeAreaProbe = document.createElement('div');
    safeAreaProbe.style.cssText = [
      'position:absolute',
      'left:-9999px',
      'top:-9999px',
      'padding-top:env(safe-area-inset-top)',
      'padding-right:env(safe-area-inset-right)',
      'padding-bottom:env(safe-area-inset-bottom)',
      'padding-left:env(safe-area-inset-left)',
    ].join(';');
    document.body.appendChild(safeAreaProbe);
    const safeArea = getComputedStyle(safeAreaProbe);
    const safeAreaInsets = {
      top: safeArea.paddingTop,
      right: safeArea.paddingRight,
      bottom: safeArea.paddingBottom,
      left: safeArea.paddingLeft,
    };
    safeAreaProbe.remove();

    return {
      hostProfile: profile,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      screen: {
        width: window.screen.width,
        height: window.screen.height,
      },
      userAgent: window.navigator.userAgent,
      canUseLocalStorage,
      canUseClipboard: Boolean(window.navigator.clipboard?.writeText),
      canUseShareSheet: Boolean(window.navigator.share),
      browserHistoryLength: window.history.length,
      displayModeStandalone: window.matchMedia('(display-mode: standalone)').matches || Boolean(window.navigator.standalone),
      safeAreaInsets,
      hostBackButton: Boolean(window.Telegram?.WebApp?.BackButton),
      hostMainButton: Boolean(window.Telegram?.WebApp?.MainButton),
      hasTelegramWebApp: Boolean(window.Telegram?.WebApp),
      canUseTelegramCloudStorage: Boolean(window.Telegram?.WebApp?.CloudStorage?.setItem),
      launchStartParam: window.Telegram?.WebApp?.initDataUnsafe?.start_param ?? new URLSearchParams(window.location.search).get('tgWebAppStartParam'),
      telegramPlatform: window.Telegram?.WebApp?.platform ?? null,
      telegramViewportStableHeight: window.Telegram?.WebApp?.viewportStableHeight ?? null,
    };
  }, hostProfile);
  const hostCallLogAfterReload = await page.evaluate(() => window.__chopdotTelegramProof?.calls ?? []);

  const report = {
    baseUrl,
    hostProfile,
    viewport: getHostContextOptions(hostProfile).viewport,
    capabilityMatrix,
    hostCallLog: {
      beforeReload: hostCallLogBeforeReload,
      afterReload: hostCallLogAfterReload,
    },
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

function getHostContextOptions(profile) {
  const baseOptions = {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  };

  if (profile === 'telegram') {
    return {
      ...baseOptions,
      userAgent: [
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)',
        'AppleWebKit/605.1.15 (KHTML, like Gecko)',
        'Mobile/15E148 TelegramBot (like TwitterBot)',
      ].join(' '),
      locale: 'en-US',
      colorScheme: 'light',
    };
  }

  return baseOptions;
}

async function installHostShim(context, profile) {
  if (profile !== 'telegram') {
    return;
  }

  await context.addInitScript(() => {
    window.__chopdotTelegramProof = {
      calls: [],
      cloudStorage: {},
      backCallbacks: [],
    };

    const record = (name, payload = {}) => {
      window.__chopdotTelegramProof.calls.push({ name, payload });
    };

    window.Telegram = {
      WebApp: {
        initData: 'query_id=portable-shell-proof',
        initDataUnsafe: {
          start_param: 'portable-proof',
          user: {
            id: 1001,
            first_name: 'Mina',
            username: 'mina',
          },
        },
        platform: 'ios',
        colorScheme: 'light',
        viewportHeight: window.innerHeight,
        viewportStableHeight: window.innerHeight,
        safeAreaInset: { top: 0, right: 0, bottom: 0, left: 0 },
        contentSafeAreaInset: { top: 0, right: 0, bottom: 0, left: 0 },
        ready() {
          record('ready');
        },
        expand() {
          record('expand');
        },
        setHeaderColor(color) {
          record('setHeaderColor', { color });
        },
        setBackgroundColor(color) {
          record('setBackgroundColor', { color });
        },
        BackButton: {
          show() {
            record('BackButton.show');
          },
          hide() {
            record('BackButton.hide');
          },
          onClick(callback) {
            window.__chopdotTelegramProof.backCallbacks.push(callback);
            record('BackButton.onClick');
          },
          offClick(callback) {
            window.__chopdotTelegramProof.backCallbacks = window.__chopdotTelegramProof.backCallbacks.filter((item) => item !== callback);
            record('BackButton.offClick');
          },
        },
        MainButton: {
          setText() {},
          show() {},
          hide() {},
          onClick() {},
          offClick() {},
        },
        CloudStorage: {
          setItem(key, value, callback) {
            window.__chopdotTelegramProof.cloudStorage[key] = value;
            record('CloudStorage.setItem', { key, bytes: value.length });
            callback?.(null, true);
          },
          removeItem(key, callback) {
            delete window.__chopdotTelegramProof.cloudStorage[key];
            record('CloudStorage.removeItem', { key });
            callback?.(null, true);
          },
        },
      },
    };
  });
}
