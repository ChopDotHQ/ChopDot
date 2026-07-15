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

if (hostProfile === 'dot-host' && !process.env.PROOF_URL) {
  throw new Error(
    'The .dot proof requires a wrapped PROOF_URL; a direct localhost app has no host iframe.',
  );
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const server = process.env.PROOF_URL ? null : spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', '--host', '127.0.0.1', '--port', String(port)],
  { cwd: root, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: ['ignore', 'pipe', 'pipe'] },
);
let browser = null;
const consoleEvents = [];
const screenshots = [];

try {
  if (server) {
    await waitForServer(baseUrl, server);
  }

  browser = await chromium.launch({
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
  page.on('console', (message) => {
    if (!['debug', 'info'].includes(message.type())) {
      consoleEvents.push({ type: message.type(), text: message.text() });
    }
  });
  page.on('pageerror', (error) => {
    consoleEvents.push({ type: 'pageerror', text: error.message });
  });

  await page.goto(baseUrl, {
    waitUntil: hostProfile === 'dot-host' ? 'domcontentloaded' : 'networkidle',
    timeout: hostProfile === 'dot-host' ? 90_000 : 30_000,
  });
  let app = await resolveAppSurface(page, hostProfile);
  await app.evaluate(() => window.localStorage.clear());

  if (hostProfile === 'dot-host') {
    await app.evaluate(() => window.location.reload());
    app = await resolveAppSurface(page, hostProfile);
  } else {
    await page.reload({ waitUntil: 'networkidle' });
    app = await resolveAppSurface(page, hostProfile);
  }

  const shot = async (name) => {
    const file = `${String(screenshots.length + 1).padStart(2, '0')}-${name}.png`;
    const fullPath = path.join(outDir, file);
    await page.screenshot({ path: fullPath, fullPage: true });
    screenshots.push(file);
  };
  const click = async (name) => {
    if (hostProfile === 'dot-host') {
      await dismissDotHostNotifications(page);
    }
    await app.getByRole('button', { name }).click();
  };
  const fill = (placeholder, value) => app.getByPlaceholder(placeholder).fill(value);

  await shot('first-run');
  await click(/continue as guest/i);
  await shot('guest-setup');
  await fill(/display name/i, 'Mina');
  await click(/^(start|continue as .+)$/i);
  await app.waitForLoadState?.('networkidle').catch(() => {});
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
  await app.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  });
  await shot('add-spend-filled');
  await click(/review split/i);
  await shot('review-split');
  await click(/^back$/i);
  const preservedAmount = await app.getByPlaceholder(/0\.00/i).inputValue();
  const preservedTitle = await app.getByPlaceholder(/dinner at gusto/i).inputValue();
  if (preservedAmount !== '120' || preservedTitle !== 'Dinner at Gusto') {
    throw new Error(`Spend draft was lost on Back: amount=${preservedAmount}, title=${preservedTitle}`);
  }
  await shot('add-spend-after-back');
  await click(/review split/i);
  await click(/save spend/i);
  await shot('open-balances');
  await click(/settle up/i);
  await shot('settle-up');
  await click(/send link to leo/i);
  await shot('settle-up-request-sent');
  const directPayerUrl = hostProfile === 'dot-host'
    ? null
    : await buildPayerUrlFromStoredState(app, 'Weekend Trip', 'Leo');
  if (directPayerUrl) {
    await proveStandalonePacketLink(browser, hostProfile, directPayerUrl, screenshots);
  }
  if (hostProfile === 'dot-host') {
    await click(/view request/i);
  } else {
    app = await openPayerUrl(page, app, hostProfile, directPayerUrl);
  }
  await shot('payment-request');
  const payerText = await app.locator('body').innerText();
  if (/local prototype/i.test(payerText)) {
    throw new Error('Payer view leaked local prototype language.');
  }
  await click(/i paid mina/i);
  await shot('needs-confirm');
  await click(/confirm received from leo/i);
  await shot('after-confirm-leo');
  await click(/settle up/i);
  await click(/send link to nina/i);
  const ninaPayerUrl = hostProfile === 'dot-host'
    ? null
    : await buildPayerUrlFromStoredState(app, 'Weekend Trip', 'Nina');
  if (hostProfile === 'dot-host') {
    await click(/view request/i);
  } else {
    app = await openPayerUrl(page, app, hostProfile, ninaPayerUrl);
  }
  const ninaPayerText = await app.locator('body').innerText();
  if (/local prototype/i.test(ninaPayerText)) {
    throw new Error('Nina payer view leaked local prototype language.');
  }
  await shot('payment-request-nina');
  await click(/i paid mina/i);
  await click(/confirm received from nina/i);
  await shot('after-confirm-nina');
  await click(/finish group/i);
  await shot('finish-group');
  await click(/finish and save summary/i);
  const summaryText = await app.locator('body').innerText();
  if (!/all settled/i.test(summaryText) || /still open/i.test(summaryText)) {
    throw new Error('Fully settled summary did not render as a success state.');
  }
  await shot('group-summary');
  await click(/done/i);
  await shot('history-home');

  const hostCallLogBeforeReload = await app.evaluate(() => window.__chopdotTelegramProof?.calls ?? []);
  if (hostProfile === 'dot-host') {
    await page.goto('about:blank');
    await page.goto(baseUrl, {waitUntil: 'domcontentloaded', timeout: 90_000});
  } else {
    await page.reload({waitUntil: 'networkidle', timeout: 30_000});
  }
  app = await resolveAppSurface(page, hostProfile);
  await shot('after-refresh-persisted');

  const text = await app.locator('body').innerText();
  const storageSnapshot = await app.evaluate(() => ({
    hasPersistedState: Boolean(window.localStorage.getItem('chopdot-portable-shell-state-v1')),
    keys: Object.keys(window.localStorage).sort(),
  }));
  const capabilityMatrix = await app.evaluate((profile) => {
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
      insideDotHostWrapper: profile === 'dot-host' && window.self !== window.top,
      appUrl: window.location.href,
    };
  }, hostProfile);
  const hostCallLogAfterReload = await app.evaluate(() => window.__chopdotTelegramProof?.calls ?? []);

  const report = {
    baseUrl: redactProofUrl(baseUrl, true),
    hostProfile,
    viewport: getHostContextOptions(hostProfile).viewport,
    capabilityMatrix,
    hostCallLog: {
      beforeReload: hostCallLogBeforeReload,
      afterReload: hostCallLogAfterReload,
    },
    screenshots,
    payerEntryMode: hostProfile === 'dot-host' ? 'in_app_view_request' : 'direct_payer_url',
    directPayerUrl: directPayerUrl ? redactUrlOrigin(directPayerUrl) : null,
    standalonePacketUrl: directPayerUrl ? redactUrlOrigin(directPayerUrl) : null,
    standalonePacketProof: Boolean(directPayerUrl),
    storageSnapshot,
    finalText: text,
    consoleEvents,
    passed: consoleEvents.every((event) => event.type !== 'pageerror'),
  };

  await writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  if (consoleEvents.some((event) => event.type === 'pageerror')) {
    throw new Error(`Page errors occurred. See ${path.join(outDir, 'report.json')}`);
  }

  console.log(`Portable shell proof written to ${outDir}`);
} catch (error) {
  const failure = error instanceof Error
    ? { name: error.name, message: error.message }
    : { name: 'UnknownError', message: String(error) };
  const failureReport = {
    baseUrl: redactProofUrl(baseUrl, true),
    hostProfile,
    viewport: getHostContextOptions(hostProfile).viewport,
    screenshots,
    consoleEvents,
    failure,
    failedAt: new Date().toISOString(),
    passed: false,
  };
  await writeFile(path.join(outDir, 'report.json'), JSON.stringify(failureReport, null, 2));
  throw error;
} finally {
  if (browser) {
    await browser.close().catch(() => {});
  }
  if (server) {
    server.kill();
  }
}

async function resolveAppSurface(page, profile) {
  if (profile !== 'dot-host') {
    await page.locator('body').waitFor({ timeout: 60_000 });
    return page;
  }

  await acceptTrustedProviderIfPresent(page);
  await dismissDotHostNotifications(page);
  const frame = await waitForDotHostAppFrame(page);
  await frame.waitForLoadState?.('domcontentloaded').catch(() => {});
  await frame.getByRole('button', { name: /continue as guest/i }).waitFor({ timeout: 60_000 }).catch(() => {});
  return frame;
}

async function openPayerUrl(page, app, profile, payerUrl) {
  if (profile === 'dot-host') {
    const wrappedUrl = new URL(baseUrl);
    const appUrl = new URL(payerUrl);
    wrappedUrl.search = appUrl.search;
    await page.goto(wrappedUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 90_000 });
  } else {
    await app.evaluate((url) => {
      window.location.assign(url);
    }, payerUrl);
    await page.waitForLoadState('networkidle').catch(() => {});
  }

  const nextApp = await resolveAppSurface(page, profile);
  await nextApp.getByRole('button', { name: /i paid mina/i }).waitFor({ timeout: 60_000 });
  return nextApp;
}

async function proveStandalonePacketLink(browser, profile, payerUrl, screenshots) {
  const standaloneContext = await browser.newContext(getHostContextOptions(profile));
  await installHostShim(standaloneContext, profile);
  await standaloneContext.addInitScript(() => {
    // Headless mobile Chromium exposes navigator.share without a real share
    // sheet, so the promise never resolves. Exercise the product's copy
    // fallback in this proof context instead.
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    });
  });

  if (profile === 'telegram') {
    await standaloneContext.route('https://telegram.org/js/telegram-web-app.js?62', (route) => route.fulfill({
      contentType: 'application/javascript',
      body: '/* Telegram script is provided by the proof shim in this localhost run. */',
    }));
  }

  const standalonePage = await standaloneContext.newPage();
  await standalonePage.goto(payerUrl, { waitUntil: 'networkidle' });
  await standalonePage.evaluate(() => window.localStorage.clear());
  await standalonePage.reload({ waitUntil: 'networkidle' });
  await standalonePage.getByRole('button', { name: /i paid mina/i }).waitFor({ timeout: 60_000 });
  await saveProofScreenshot(standalonePage, screenshots, 'standalone-payer-request');

  await standalonePage.getByRole('button', { name: /i paid mina/i }).click();
  await standalonePage.getByText(/mina still needs to confirm/i).waitFor({ timeout: 60_000 });
  await saveProofScreenshot(standalonePage, screenshots, 'standalone-marked-paid');
  await standaloneContext.close();
}

async function buildPayerUrlFromStoredState(app, groupName, memberName) {
  await app.waitForFunction(({ groupName, memberName }) => {
    const raw = window.localStorage.getItem('chopdot-portable-shell-state-v1');
    if (!raw) {
      return false;
    }

    const state = JSON.parse(raw);
    const group = Object.values(state.groups ?? {}).find((candidate) => candidate.name === groupName);
    const member = Object.values(state.users ?? {}).find((candidate) => candidate.name === memberName);

    if (!group || !member) {
      return false;
    }

    return Object.values(state.splits ?? {}).some((split) => {
      const expense = state.expenses?.[split.expenseId];
      return split.userId === member.id && split.status === 'request_sent' && expense?.groupId === group.id;
    });
  }, { groupName, memberName }, { timeout: 10_000 });

  const payerUrl = await app.evaluate(({ groupName, memberName }) => {
    const raw = window.localStorage.getItem('chopdot-portable-shell-state-v1');
    if (!raw) {
      throw new Error('Cannot build payer URL: no persisted ChopDot state.');
    }

    const state = JSON.parse(raw);
    const group = Object.values(state.groups ?? {}).find((candidate) => candidate.name === groupName);
    const member = Object.values(state.users ?? {}).find((candidate) => candidate.name === memberName);

    if (!group || !member) {
      throw new Error(`Cannot build payer URL for ${memberName} in ${groupName}.`);
    }

    const url = new URL(window.location.href);
    url.searchParams.set('payGroupId', group.id);
    url.searchParams.set('payMemberId', member.id);
    const requestedSplits = Object.values(state.splits ?? {}).filter((split) => {
      const expense = state.expenses?.[split.expenseId];
      return split.userId === member.id && split.status === 'request_sent' && expense?.groupId === group.id;
    });
    const amount = requestedSplits.reduce((sum, split) => sum + split.amount, 0);
    const requesterId = state.expenses?.[requestedSplits[0]?.expenseId]?.paidByUserId;
    const requester = state.users?.[requesterId];
    const paymentMethodLabels = {
      cash: 'Cash',
      bank_transfer: 'Bank Transfer',
      link: 'Payment Link',
    };
    const createdAt = new Date();
    const request = {
      requestId: `req-${group.id}-${member.id}-proof`,
      groupName: group.name,
      requesterName: requester?.name ?? 'Mina',
      payerName: member.name,
      amount,
      currency: state.currency ?? 'USD',
      paymentMethodLabel: state.preferredPaymentMethod ? paymentMethodLabels[state.preferredPaymentMethod] : 'Cash',
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    };
    const bytes = new TextEncoder().encode(JSON.stringify(request));
    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    const packet = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    url.searchParams.set('payRequest', packet);
    url.hash = '';
    return url.toString();
  }, { groupName, memberName });

  return payerUrl;
}

async function saveProofScreenshot(page, screenshots, name) {
  const file = `${String(screenshots.length + 1).padStart(2, '0')}-${name}.png`;
  const fullPath = path.join(outDir, file);
  await page.screenshot({ path: fullPath, fullPage: true });
  screenshots.push(file);
}

function redactUrlOrigin(url) {
  return redactProofUrl(url, false);
}

function redactProofUrl(url, includeOrigin) {
  try {
    const parsed = new URL(url);
    const redactedParams = new URLSearchParams();
    for (const key of parsed.searchParams.keys()) {
      redactedParams.set(key, '[redacted]');
    }
    const search = redactedParams.size ? `?${redactedParams.toString()}` : '';
    return `${includeOrigin ? parsed.origin : ''}${parsed.pathname}${search}`;
  } catch {
    return '[invalid-url]';
  }
}

async function acceptTrustedProviderIfPresent(page) {
  const trustedProvider = page.getByRole('button', { name: /use trusted provider/i });
  try {
    await trustedProvider.waitFor({ timeout: 45_000 });
    await trustedProvider.click();
    await page.waitForLoadState('networkidle').catch(() => {});
  } catch {
    // Some gateways skip the trusted-provider interstitial after it has been accepted.
  }
}

async function waitForDotHostAppFrame(page) {
  const started = Date.now();
  while (Date.now() - started < 60_000) {
    const frames = page.frames();
    const appFrame = frames.find((frame) => {
      const url = frame.url();
      return (
        /\.app\.paseo\.li/i.test(url) ||
        /\.app\.dot\.li/i.test(url) ||
        /ipfs/i.test(url)
      );
    });

    if (appFrame) {
      return appFrame;
    }

    await page.waitForTimeout(500);
  }

  throw new Error('Timed out waiting for .dot host app iframe.');
}

async function dismissDotHostNotifications(page) {
  const dismissButtons = page.getByRole('button', { name: /dismiss/i });
  const count = await dismissButtons.count().catch(() => 0);
  for (let index = 0; index < count; index += 1) {
    await dismissButtons.nth(index).click({ timeout: 2_000 }).catch(() => {});
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
