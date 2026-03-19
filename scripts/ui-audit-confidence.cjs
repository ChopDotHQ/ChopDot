#!/usr/bin/env node
/**
 * Confidence validation script:
 * - Real keyboard tab traversal (page.keyboard.press('Tab'))
 * - Landmark inventory (main/header/nav/footer + role variants)
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const APP_URL = process.env.UI_AUDIT_URL || 'http://localhost:5173';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = path.join(__dirname, '../output/playwright', `ui-audit-confidence-${timestamp}`);
fs.mkdirSync(runDir, { recursive: true });

function cssPathFor(el) {
  if (!el || !el.tagName) return null;
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const cls = (el.className && typeof el.className === 'string')
    ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
    : '';
  return `${tag}${id}${cls}`;
}

async function gatherLandmarks(page) {
  return page.evaluate(() => {
    const byTag = {
      main: document.querySelectorAll('main').length,
      header: document.querySelectorAll('header').length,
      nav: document.querySelectorAll('nav').length,
      footer: document.querySelectorAll('footer').length,
      aside: document.querySelectorAll('aside').length,
    };
    const byRole = {
      main: document.querySelectorAll('[role="main"]').length,
      banner: document.querySelectorAll('[role="banner"]').length,
      navigation: document.querySelectorAll('[role="navigation"]').length,
      contentinfo: document.querySelectorAll('[role="contentinfo"]').length,
      complementary: document.querySelectorAll('[role="complementary"]').length,
      tablist: document.querySelectorAll('[role="tablist"]').length,
      tab: document.querySelectorAll('[role="tab"]').length,
      dialog: document.querySelectorAll('[role="dialog"]').length,
    };
    return { byTag, byRole };
  });
}

async function realTabWalk(page, steps = 30) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.keyboard.press('Tab');
  const result = [];
  for (let i = 0; i < steps; i++) {
    const active = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || !(el instanceof HTMLElement)) return null;
      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute('role');
      const ariaLabel = el.getAttribute('aria-label');
      const ariaLabelledby = el.getAttribute('aria-labelledby');
      const text = (el.textContent || '').trim().slice(0, 60);
      const id = el.id || null;
      const className = (el.className && typeof el.className === 'string')
        ? el.className.trim().split(/\s+/).slice(0, 4).join(' ')
        : null;
      return { tag, role, ariaLabel, ariaLabelledby, text, id, className };
    });
    if (!active) break;
    result.push(active);
    await page.keyboard.press('Tab');
  }

  // Add a coarse selector string for readability
  const withSelector = await page.evaluate((rows) => {
    return rows.map((r) => {
      const candidates = Array.from(document.querySelectorAll(r.id ? `#${r.id}` : r.tag));
      const el = candidates.find((c) => {
        const txt = (c.textContent || '').trim().slice(0, 60);
        return txt === r.text;
      }) || candidates[0];
      const selector = (function cssPathFor(node) {
        if (!node || !node.tagName) return null;
        const tag = node.tagName.toLowerCase();
        const id = node.id ? `#${node.id}` : '';
        const cls = (node.className && typeof node.className === 'string')
          ? '.' + node.className.trim().split(/\s+/).slice(0, 2).join('.')
          : '';
        return `${tag}${id}${cls}`;
      })(el);
      return { ...r, selector };
    });
  }, result);

  return withSelector;
}

async function gotoTab(page, tab) {
  const btn = page.locator(`button:has-text("${tab}")`).first();
  if ((await btn.count()) > 0) {
    await btn.click();
    await page.waitForTimeout(700);
    return true;
  }
  return false;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  const out = { appUrl: APP_URL, timestamp: new Date().toISOString(), screens: {} };
  try {
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 20000 });
    const guestBtn = page.getByRole('button', { name: /continue as guest/i });
    if ((await guestBtn.count()) > 0) {
      await guestBtn.first().click();
      await page.waitForTimeout(1200);
    }

    const screens = [
      { key: 'pots', action: async () => gotoTab(page, 'Pots') },
      { key: 'you', action: async () => gotoTab(page, 'You') },
      {
        key: 'settings',
        action: async () => {
          await gotoTab(page, 'You');
          const settingsLink = page.getByText(/settings/i).first();
          if ((await settingsLink.count()) > 0) {
            await settingsLink.click();
            await page.waitForTimeout(700);
            return true;
          }
          return false;
        },
      },
      {
        key: 'create-pot',
        action: async () => {
          await gotoTab(page, 'Pots');
          const fabBtn = page.locator('button').filter({ has: page.locator('.w-6.h-6.text-white') }).first();
          if ((await fabBtn.count()) > 0) {
            await fabBtn.click();
            await page.waitForTimeout(700);
            return true;
          }
          return false;
        },
      },
    ];

    for (const s of screens) {
      const ok = await s.action();
      if (!ok) continue;
      const landmarks = await gatherLandmarks(page);
      const tabWalk = await realTabWalk(page, 26);
      out.screens[s.key] = {
        url: page.url(),
        landmarks,
        tabWalk,
      };
    }
  } finally {
    await browser.close();
  }

  const reportPath = path.join(runDir, 'confidence-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(out, null, 2));
  console.log('Confidence audit:', reportPath);
  console.log('Screens:', Object.keys(out.screens).join(', '));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
