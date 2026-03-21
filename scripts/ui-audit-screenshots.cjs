#!/usr/bin/env node
/**
 * UI Audit Screenshot Capture
 * Captures screenshots of main ChopDot screens for visual audit.
 * Run with: node scripts/ui-audit-screenshots.cjs
 * Requires: npm install playwright (or npx playwright)
 * Server: Expects app at SMOKE_URL or http://localhost:5173
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const APP_URL = process.env.SMOKE_URL || process.env.UI_AUDIT_URL || 'http://localhost:5173';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = path.join(__dirname, '../output/playwright', `ui-audit-${timestamp}`);
const viewport = { width: 390, height: 844 }; // iPhone 15 per Guidelines

fs.mkdirSync(runDir, { recursive: true });

async function saveShot(page, name) {
  const p = path.join(runDir, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  return p;
}

async function main() {
  const results = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
  });

  try {
    const page = await context.newPage();
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 15000 });

    // 1. Initial/landing state
    await saveShot(page, '01-initial');
    results.push({ screen: '01-initial', path: path.join(runDir, '01-initial.png') });

    // 2. Try guest sign-in
    const guestBtn = page.getByRole('button', { name: /continue as guest/i });
    if (await guestBtn.count() > 0) {
      await guestBtn.first().click();
      await page.waitForTimeout(1500);
      await saveShot(page, '02-after-guest');
      results.push({ screen: '02-after-guest', path: path.join(runDir, '02-after-guest.png') });
    }

    // 3. Tab screens: Pots, People, Activity, You
    const tabs = [
      { name: 'pots', selector: 'button:has-text("Pots")' },
      { name: 'people', selector: 'button:has-text("People")' },
      { name: 'activity', selector: 'button:has-text("Activity")' },
      { name: 'you', selector: 'button:has-text("You")' },
    ];
    for (const tab of tabs) {
      const btn = page.locator(tab.selector).first();
      if (await btn.count() > 0) {
        await btn.click();
        await page.waitForTimeout(800);
        await saveShot(page, `03-tab-${tab.name}`);
        results.push({ screen: `03-tab-${tab.name}`, path: path.join(runDir, `03-tab-${tab.name}.png`) });
      }
    }

    // 4. Dark mode (if theme toggle exists)
    const themeToggle = page.locator('button').filter({ has: page.locator('[class*="theme"], [aria-label*="theme"], [aria-label*="dark"], [aria-label*="light"]') }).first();
    if (await themeToggle.count() === 0) {
      // Try You tab settings
      const youBtn = page.locator('button:has-text("You")').first();
      if (await youBtn.count() > 0) {
        await youBtn.click();
        await page.waitForTimeout(600);
      }
      const settingsLink = page.getByText(/settings/i).first();
      if (await settingsLink.count() > 0) {
        await settingsLink.click();
        await page.waitForTimeout(800);
        await saveShot(page, '04-settings');
        results.push({ screen: '04-settings', path: path.join(runDir, '04-settings.png') });
      }
    }

    await browser.close();
  } catch (err) {
    await saveShot(await context.newPage(), 'error-state').catch(() => {});
    await browser.close();
    throw err;
  }

  const reportPath = path.join(runDir, 'results.json');
  fs.writeFileSync(reportPath, JSON.stringify({ runDir, timestamp: new Date().toISOString(), screenshots: results }, null, 2));
  console.log('UI audit screenshots saved to', runDir);
  console.log('Results:', reportPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
