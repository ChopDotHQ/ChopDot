#!/usr/bin/env node
/**
 * Cross-browser UI/A11y audit (Chromium, Firefox, WebKit)
 * Captures screenshots + axe violations for key tabs.
 */
const fs = require('fs');
const path = require('path');
const { chromium, firefox, webkit } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');

const APP_URL = process.env.UI_AUDIT_URL || 'http://localhost:5173';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = path.join(__dirname, '../output/playwright', `ui-audit-cross-browser-${timestamp}`);
fs.mkdirSync(runDir, { recursive: true });

const BROWSERS = [
  { name: 'chromium', engine: chromium },
  { name: 'firefox', engine: firefox },
  { name: 'webkit', engine: webkit },
];

const TABS = ['Pots', 'People', 'Activity', 'You'];

async function runAxe(page, name) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return {
    name,
    url: page.url(),
    violations: results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.length,
      help: v.help,
    })),
    passes: results.passes.length,
  };
}

async function gotoGuest(page) {
  await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 20000 });
  const guest = page.getByRole('button', { name: /continue as guest/i });
  if ((await guest.count()) > 0) {
    await guest.first().click();
    await page.waitForTimeout(1200);
  }
}

async function safeClickTab(page, tabLabel) {
  const btn = page
    .locator(`xpath=//button[.//span[normalize-space()="${tabLabel}"]]`)
    .last();
  if ((await btn.count()) > 0) {
    await btn.click();
    await page.waitForTimeout(700);
    return true;
  }
  return false;
}

async function auditBrowser(browserDef) {
  const browser = await browserDef.engine.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const out = { browser: browserDef.name, screens: [] };
  try {
    await gotoGuest(page);
    await page.screenshot({ path: path.join(runDir, `${browserDef.name}-initial.png`) });
    out.screens.push(await runAxe(page, `${browserDef.name}-initial`));

    for (const tab of TABS) {
      const ok = await safeClickTab(page, tab);
      if (!ok) continue;
      const key = `${browserDef.name}-${tab.toLowerCase()}`;
      await page.screenshot({ path: path.join(runDir, `${key}.png`) });
      out.screens.push(await runAxe(page, key));
    }
  } finally {
    await browser.close();
  }
  return out;
}

async function main() {
  const results = [];
  for (const b of BROWSERS) {
    try {
      const r = await auditBrowser(b);
      results.push(r);
    } catch (error) {
      results.push({
        browser: b.name,
        error: String(error?.message || error),
        screens: [],
      });
    }
  }

  const outPath = path.join(runDir, 'cross-browser-results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));

  console.log('Cross-browser audit:', outPath);
  for (const item of results) {
    if (item.error) {
      console.log(`  ${item.browser}: ERROR -> ${item.error}`);
      continue;
    }
    const vCount = item.screens.reduce((acc, s) => acc + s.violations.length, 0);
    console.log(`  ${item.browser}: screens=${item.screens.length}, violations=${vCount}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
