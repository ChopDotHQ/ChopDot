#!/usr/bin/env node
/**
 * Axe a11y audit on deeper screens (Settings, Add Expense, Create Pot, etc.)
 * + keyboard tab order + accessibility tree snapshot
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');

const APP_URL = process.env.UI_AUDIT_URL || 'http://localhost:5173';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = path.join(__dirname, '../output/playwright', `ui-audit-flows-${timestamp}`);
fs.mkdirSync(runDir, { recursive: true });

async function runAxe(page, name) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return {
    url: page.url(), name, timestamp: new Date().toISOString(),
    violations: results.violations.map((v) => ({
      id: v.id, impact: v.impact, description: v.description, help: v.help,
      nodes: v.nodes.length,
      details: v.nodes.slice(0, 3).map((n) => ({
        html: n.html?.slice(0, 150),
        target: n.target,
        failureSummary: n.failureSummary,
      })),
    })),
    passes: results.passes.length,
  };
}

async function getTabOrder(page) {
  return page.evaluate(() => {
    const elements = [];
    let el = document.activeElement;
    const seen = new Set();
    for (let i = 0; i < 60; i++) {
      document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      document.activeElement?.blur?.();
      const next = document.querySelector(':focus') || document.body;
      const focusable = document.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (i === 0) {
        focusable.forEach((f, idx) => {
          elements.push({
            idx,
            tag: f.tagName.toLowerCase(),
            text: (f.textContent || '').trim().slice(0, 50),
            ariaLabel: f.getAttribute('aria-label') || null,
            role: f.getAttribute('role') || null,
            tabindex: f.getAttribute('tabindex'),
          });
        });
        break;
      }
    }
    return elements;
  });
}

async function getAccessibilityTree(page) {
  try {
    const tree = await page.evaluate(() => {
      function walk(el, depth = 0) {
        if (depth > 4) return null;
        const role = el.getAttribute?.('role') || el.tagName?.toLowerCase();
        const label = el.getAttribute?.('aria-label') || el.getAttribute?.('aria-labelledby') || '';
        const text = el.childNodes.length === 1 && el.childNodes[0].nodeType === 3
          ? el.childNodes[0].textContent?.trim().slice(0, 40) : '';
        const kids = [];
        for (const c of el.children || []) {
          const r = walk(c, depth + 1);
          if (r) kids.push(r);
        }
        if (!kids.length && !label && !text && !['button','input','a','select','textarea','nav','main','header','footer','form','dialog'].includes(role)) return null;
        return { role, label, text, children: kids.length ? kids : undefined };
      }
      return walk(document.body);
    });
    return tree;
  } catch {
    return 'snapshot unavailable';
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const results = [];
  const tabOrders = {};
  const a11yTrees = {};
  const page = await context.newPage();

  try {
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 15000 });

    const guestBtn = page.getByRole('button', { name: /continue as guest/i });
    if ((await guestBtn.count()) > 0) {
      await guestBtn.first().click();
      await page.waitForTimeout(1500);
    }

    // Tab: Pots
    const potsBtn = page.locator('button:has-text("Pots")').first();
    if ((await potsBtn.count()) > 0) {
      await potsBtn.click();
      await page.waitForTimeout(800);
    }

    // Get tab order and a11y tree for Pots
    tabOrders['pots'] = await getTabOrder(page);
    a11yTrees['pots'] = await getAccessibilityTree(page);

    // Navigate to You tab → Settings
    const youBtn = page.locator('button:has-text("You")').first();
    if ((await youBtn.count()) > 0) {
      await youBtn.click();
      await page.waitForTimeout(800);
      results.push(await runAxe(page, 'you-tab'));
      tabOrders['you'] = await getTabOrder(page);
      a11yTrees['you'] = await getAccessibilityTree(page);

      const settingsLink = page.getByText(/settings/i).first();
      if ((await settingsLink.count()) > 0) {
        await settingsLink.click();
        await page.waitForTimeout(800);
        results.push(await runAxe(page, 'settings'));
        tabOrders['settings'] = await getTabOrder(page);
      }
    }

    // Back to Pots, try "Add" button (FAB)
    if ((await potsBtn.count()) > 0) {
      await potsBtn.click();
      await page.waitForTimeout(800);
    }
    const fabBtn = page.locator('button').filter({ has: page.locator('.w-6.h-6.text-white') }).first();
    if ((await fabBtn.count()) > 0) {
      await fabBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(runDir, 'fab-action.png') });
      results.push(await runAxe(page, 'fab-action'));
    }

    // Try Create Pot
    const createBtn = page.getByText(/create/i).first();
    if ((await createBtn.count()) > 0) {
      await createBtn.click();
      await page.waitForTimeout(800);
      results.push(await runAxe(page, 'create-pot'));
      tabOrders['create-pot'] = await getTabOrder(page);
    }

  } finally { await browser.close(); }

  const reportPath = path.join(runDir, 'flows-results.json');
  fs.writeFileSync(reportPath, JSON.stringify({ results, tabOrders, a11yTrees }, null, 2));
  const totalV = results.reduce((a, r) => a + r.violations.length, 0);
  console.log('Flows axe audit:', reportPath);
  console.log('Total violations:', totalV);
  results.forEach((r) => { if (r.violations.length) console.log(`  ${r.name}: ${r.violations.length}`); });
  console.log('Tab orders captured for:', Object.keys(tabOrders).join(', '));
  console.log('A11y trees captured for:', Object.keys(a11yTrees).join(', '));
}
main().catch((e) => { console.error(e); process.exit(1); });
