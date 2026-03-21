#!/usr/bin/env node
/**
 * Axe accessibility audit - runs axe-core on ChopDot screens
 * Requires: @axe-core/playwright, playwright
 * Run: node scripts/ui-audit-axe.cjs
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');

const APP_URL = process.env.UI_AUDIT_URL || 'http://localhost:5173';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = path.join(__dirname, '../output/playwright', `ui-audit-axe-${timestamp}`);

fs.mkdirSync(runDir, { recursive: true });

async function runAxe(page, name) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const out = {
    url: page.url(),
    name,
    timestamp: new Date().toISOString(),
    violations: results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      nodes: v.nodes.length,
      summary: v.nodes.slice(0, 2).map((n) => n.failureSummary || n.html?.slice(0, 100)),
    })),
    passes: results.passes.length,
    inapplicable: results.inapplicable.length,
  };
  return out;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
  });

  const results = [];

  try {
    const page = await context.newPage();
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 15000 });

    results.push(await runAxe(page, '01-initial'));

    const guestBtn = page.getByRole('button', { name: /continue as guest/i });
    if ((await guestBtn.count()) > 0) {
      await guestBtn.first().click();
      await page.waitForTimeout(1500);
      results.push(await runAxe(page, '02-after-guest'));
    }

    for (const tab of ['Pots', 'People', 'Activity', 'You']) {
      const btn = page.locator(`button:has-text("${tab}")`).first();
      if ((await btn.count()) > 0) {
        await btn.click();
        await page.waitForTimeout(800);
        results.push(await runAxe(page, `03-tab-${tab.toLowerCase()}`));
      }
    }

    await browser.close();
  } catch (err) {
    await browser.close();
    throw err;
  }

  const reportPath = path.join(runDir, 'axe-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  const totalViolations = results.reduce((acc, r) => acc + r.violations.length, 0);
  console.log('Axe audit complete. Results:', reportPath);
  console.log('Total violations across screens:', totalViolations);
  results.forEach((r) => {
    if (r.violations.length > 0) {
      console.log(`  ${r.name}: ${r.violations.length} violations`);
    }
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
