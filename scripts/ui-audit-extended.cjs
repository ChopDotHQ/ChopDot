#!/usr/bin/env node
/**
 * Extended UI audit: dark mode + responsive breakpoints
 * Run: node scripts/ui-audit-extended.cjs
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const APP_URL = process.env.UI_AUDIT_URL || 'http://localhost:5173';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = path.join(__dirname, '../output/playwright', `ui-audit-extended-${timestamp}`);

const VIEWPORTS = [
  { name: '375', w: 375, h: 667 },
  { name: '390', w: 390, h: 844 },
  { name: '768', w: 768, h: 1024 },
  { name: '1024', w: 1024, h: 768 },
  { name: '1440', w: 1440, h: 900 },
];

fs.mkdirSync(runDir, { recursive: true });

async function saveShot(page, name) {
  const p = path.join(runDir, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  return p;
}

async function setDarkMode(page) {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(500);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    });
    const page = await context.newPage();

    try {
      await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 15000 });

      const guestBtn = page.getByRole('button', { name: /continue as guest/i });
      if ((await guestBtn.count()) > 0) {
        await guestBtn.first().click();
        await page.waitForTimeout(1500);
      }

      const potsBtn = page.locator('button:has-text("Pots")').first();
      if ((await potsBtn.count()) > 0) {
        await potsBtn.click();
        await page.waitForTimeout(800);
      }

      await saveShot(page, `${vp.name}-light`);
      results.push({ viewport: vp.name, mode: 'light', path: path.join(runDir, `${vp.name}-light.png`) });

      await setDarkMode(page);
      await saveShot(page, `${vp.name}-dark`);
      results.push({ viewport: vp.name, mode: 'dark', path: path.join(runDir, `${vp.name}-dark.png`) });

      await context.close();
    } catch (e) {
      await context.close();
      throw e;
    }
  }

  await browser.close();

  const reportPath = path.join(runDir, 'results.json');
  fs.writeFileSync(reportPath, JSON.stringify({ runDir, timestamp: new Date().toISOString(), screenshots: results }, null, 2));
  console.log('Extended screenshots saved to', runDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
