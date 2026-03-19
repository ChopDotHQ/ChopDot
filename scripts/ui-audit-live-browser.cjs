#!/usr/bin/env node
/**
 * Live (headed) browser audit – opens visible Chromium window
 * and walks through the app while capturing snapshots and screenshots.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const APP_URL = process.env.UI_AUDIT_URL || 'http://localhost:5173';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = path.join(__dirname, '../output/playwright', `ui-audit-live-${timestamp}`);
fs.mkdirSync(runDir, { recursive: true });

async function capture(page, name) {
  await page.screenshot({ path: path.join(runDir, `${name}.png`), fullPage: false });
  const snapshot = await page.evaluate(() => ({
    url: document.location.href,
    title: document.title,
    landmarks: {
      main: document.querySelectorAll('main').length,
      nav: document.querySelectorAll('nav').length,
      header: document.querySelectorAll('header').length,
    },
    focusableCount: document.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ).length,
  }));
  return { name, ...snapshot };
}

async function main() {
  // HEADED: visible browser window
  const browser = await chromium.launch({
    headless: false,
    slowMo: 150,
    args: ['--window-size=390,844'],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
  });
  const page = await context.newPage();

  const steps = [];
  try {
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 20000 });
    steps.push(await capture(page, '01-initial'));

    const guest = page.getByRole('button', { name: /continue as guest/i });
    if ((await guest.count()) > 0) {
      await guest.click();
      await page.waitForTimeout(1200);
      steps.push(await capture(page, '02-after-guest'));
    }

    for (const tab of ['Pots', 'People', 'Activity', 'You']) {
      const btn = page.locator(`button:has-text("${tab}")`).last();
      if ((await btn.count()) > 0) {
        await btn.click();
        await page.waitForTimeout(800);
        steps.push(await capture(page, `03-tab-${tab.toLowerCase()}`));
      }
    }

    // Open wallet sheet
    try {
      const connect = page.getByRole('button', { name: /connect wallet/i }).first();
      if ((await connect.count()) > 0) {
        await connect.click();
        await page.waitForTimeout(800);
        steps.push(await capture(page, '04-wallet-sheet'));
        // WalletConnectionSheet doesn't listen to Escape; close via backdrop click (top area)
        await page.mouse.click(195, 150);
        await page.waitForTimeout(800);
      }
    } catch (e) {
      console.warn('Wallet sheet step skipped:', e.message);
    }

    // Back to You, try Settings
    await page.locator('button:has-text("You")').last().click();
    await page.waitForTimeout(800);
    try {
      const general = page.getByRole('button', { name: /General/i }).first();
      if ((await general.count()) > 0) {
        await general.click();
        await page.waitForTimeout(1000);
        steps.push(await capture(page, '05-settings'));
      }
    } catch (e) {
      console.warn('Settings step skipped:', e.message);
    }
  } finally {
    await browser.close();
  }

  const outPath = path.join(runDir, 'live-audit-results.json');
  fs.writeFileSync(outPath, JSON.stringify({ steps, runDir }, null, 2));
  console.log('Live browser audit done.');
  console.log('  Screenshots:', runDir);
  console.log('  Results:', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
