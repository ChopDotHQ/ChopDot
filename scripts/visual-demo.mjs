import { chromium } from 'playwright';
import fs from 'node:fs';

const APP_URL = process.env.APP_URL || 'http://127.0.0.1:5173';
const DEMO_EMAIL = process.env.DEMO_EMAIL;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;
const POT_NAME = process.env.DEMO_POT_NAME || `Visual Demo Pot ${Date.now()}`;

function readEnvVarFromDotEnv(key) {
  try {
    const raw = fs.readFileSync('.env', 'utf8');
    const line = raw
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.startsWith(`${key}=`));
    if (!line) return undefined;
    return line.slice(key.length + 1).trim();
  } catch {
    return undefined;
  }
}

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  readEnvVarFromDotEnv('VITE_SUPABASE_URL') ||
  readEnvVarFromDotEnv('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  readEnvVarFromDotEnv('VITE_SUPABASE_ANON_KEY') ||
  readEnvVarFromDotEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY');
let createdPotName = POT_NAME;

async function step(name, fn) {
  process.stdout.write(`\n[visual-demo] ${name}\n`);
  await fn();
}

async function clickIfVisible(page, locator, timeout = 1500) {
  try {
    await locator.first().waitFor({ state: 'visible', timeout });
    await locator.first().click();
    return true;
  } catch {
    return false;
  }
}

async function fillIfVisible(page, locator, value, timeout = 1500) {
  try {
    await locator.first().waitFor({ state: 'visible', timeout });
    await locator.first().fill(value);
    return true;
  } catch {
    return false;
  }
}

const browser = await chromium.launch({
  headless: false,
  slowMo: 350,
});

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on('console', (msg) => {
  const text = msg.text();
  if (/Failed to create pot|Service create failed|Supabase|Auth|error/i.test(text)) {
    process.stdout.write(`[browser-console] ${text}\n`);
  }
});
page.on('response', async (res) => {
  const url = res.url();
  if (url.includes('supabase.co') && url.includes('/rest/v1/')) {
    const status = res.status();
    if (status >= 400) {
      process.stdout.write(`[supabase-http] ${status} ${url}\n`);
    }
  }
});

try {
  await step('Open app', async () => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  });

  await step('Force logout / clear local session', async () => {
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.context().clearCookies();
    await page.reload({ waitUntil: 'domcontentloaded' });
  });

  await step('Login as guest (if shown)', async () => {
    const emailButton = page.getByRole('button', { name: /email & password/i });
    const guestButton = page.getByRole('button', { name: /continue as guest/i });

    if (DEMO_EMAIL && DEMO_PASSWORD) {
      await clickIfVisible(page, emailButton, 4000);
      await fillIfVisible(page, page.locator('#email-login-email'), DEMO_EMAIL, 3000);
      await fillIfVisible(page, page.locator('#email-login-password'), DEMO_PASSWORD, 3000);
      await clickIfVisible(page, page.getByRole('button', { name: /continue with email/i }), 3000);
      return;
    }

    process.stdout.write('[visual-demo] No DEMO_EMAIL/DEMO_PASSWORD provided, using guest/anonymous login.\n');
    await clickIfVisible(page, guestButton, 4000);
  });

  await step('Create a pot', async () => {
    const createPotBtn = page.getByRole('button', { name: /create pot/i });
    const createShortBtn = page.getByRole('button', { name: /^create$/i });
    if (!(await clickIfVisible(page, createPotBtn, 4000))) {
      await clickIfVisible(page, createShortBtn, 2000);
    }

    const nameLocators = [
      page.getByLabel(/pot name|savings pot name/i),
      page.getByPlaceholder(/e\.g\.,\s*groceries|house down payment/i),
      page.locator('input').first(),
    ];
    let filledName = false;
    for (const locator of nameLocators) {
      if (await fillIfVisible(page, locator, POT_NAME, 2000)) {
        filledName = true;
        const value = await locator.first().inputValue().catch(() => POT_NAME);
        createdPotName = value?.trim() || POT_NAME;
        break;
      }
    }
    if (!filledName) {
      throw new Error('Could not fill pot name in create form.');
    }

    const submitCreate = page.getByRole('button', { name: /create pot/i });
    await clickIfVisible(page, submitCreate, 3000);

    const created =
      (await clickIfVisible(page, page.getByRole('button', { name: /^add$/i }), 6000)) ||
      (await clickIfVisible(page, page.getByRole('button', { name: /add expense/i }), 3000));

    if (!created) {
      await page.screenshot({ path: 'dist/visual-demo-create-stuck.png', fullPage: true });
      throw new Error('Create pot appears stuck (did not reach pot home/add actions). If using Supabase mode, provide DEMO_EMAIL/DEMO_PASSWORD.');
    }
  });

  await step('Add an expense', async () => {
    // If app opens choose-pot selector first, pick the pot we just created.
    const choosePotSearch = page.getByPlaceholder(/search pots/i);
    if (await fillIfVisible(page, choosePotSearch, POT_NAME, 2000)) {
      await clickIfVisible(page, page.getByText(POT_NAME, { exact: false }), 3000);
      await clickIfVisible(page, page.getByRole('button', { name: /continue|next|select/i }), 1000);
    }

    await fillIfVisible(page, page.getByPlaceholder('0.00'), '42.50', 3000);
    await fillIfVisible(page, page.getByPlaceholder(/enter description/i), 'Coffee + snacks', 3000);

    const paidBySelect = page.locator('select').filter({ hasText: /select member|you/i }).first();
    try {
      await paidBySelect.waitFor({ state: 'visible', timeout: 2000 });
      await paidBySelect.selectOption({ label: 'You' }).catch(async () => {
        await paidBySelect.selectOption({ index: 1 });
      });
    } catch {
      // Continue if select not found in this UI variant
    }

    const saveExpense = page.getByRole('button', { name: /save expense|update expense/i });
    await clickIfVisible(page, saveExpense, 3000);
  });

  await step('Open settle flow (optional)', async () => {
    const settleBtn = page.getByRole('button', { name: /^settle$/i });
    if (await clickIfVisible(page, settleBtn, 2500)) {
      const confirmBtn = page.getByRole('button', { name: /confirm .* settlement/i });
      await clickIfVisible(page, confirmBtn, 1500);
      const confirmCash = page.getByRole('button', { name: /confirm cash settlement/i });
      await clickIfVisible(page, confirmCash, 1500);
    }
  });

  await step('Capture screenshot', async () => {
    try {
      await page.screenshot({ path: 'dist/visual-demo.png', fullPage: true });
    } catch (e) {
      process.stdout.write(`[visual-demo] Screenshot skipped: ${String(e)}\n`);
    }
  });

  await step('Verify pot exists in Supabase', async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      process.stdout.write('[visual-demo] Supabase env missing; skipping DB verification.\n');
      return;
    }
    const authToken = await page.evaluate(() => {
      return (
        window.localStorage.getItem('chopdot_auth_token') ||
        window.sessionStorage.getItem('chopdot_auth_token')
      );
    });
    if (!authToken) {
      throw new Error('No auth token found in browser storage after login.');
    }

    const url = new URL(`${SUPABASE_URL}/rest/v1/pots`);
    url.searchParams.set('select', 'id,name,created_at');
    url.searchParams.set('name', `eq.${createdPotName}`);
    url.searchParams.set('order', 'created_at.desc');
    url.searchParams.set('limit', '1');
    const res = await fetch(url.toString(), {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${authToken}`,
      },
    });
    const body = await res.text();
    process.stdout.write(`[visual-demo] Supabase verify status=${res.status} expectedPotName="${createdPotName}" body=${body}\n`);
    if (!res.ok) throw new Error(`Supabase verification failed: ${res.status}`);
    const parsed = JSON.parse(body);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const recentUrl = new URL(`${SUPABASE_URL}/rest/v1/pots`);
      recentUrl.searchParams.set('select', 'id,name,created_at');
      recentUrl.searchParams.set('order', 'created_at.desc');
      recentUrl.searchParams.set('limit', '5');
      const recent = await fetch(recentUrl.toString(), {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${authToken}`,
        },
      });
      const recentBody = await recent.text();
      process.stdout.write(`[visual-demo] Supabase recent pots status=${recent.status} body=${recentBody}\n`);
      throw new Error(`Pot "${createdPotName}" was not found in Supabase after creation.`);
    }
  });

  process.stdout.write('\n[visual-demo] Completed. Keeping browser open for 20 seconds so you can watch.\n');
  await page.waitForTimeout(20_000);
} finally {
  await context.close();
  await browser.close();
}
