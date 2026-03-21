#!/usr/bin/env node
/**
 * Keyboard accessibility audit for overlay/modal-like UI:
 * - Real Tab / Shift+Tab traversal while overlay is open
 * - Escape close behaviour
 * - Focus escape detection (activeElement outside overlay roots)
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const APP_URL = process.env.UI_AUDIT_URL || 'http://localhost:5173';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = path.join(__dirname, '../output/playwright', `ui-audit-keyboard-modals-${timestamp}`);
fs.mkdirSync(runDir, { recursive: true });

function selectorSummary(obj) {
  if (!obj) return null;
  const tag = obj.tag || 'unknown';
  const cls = obj.className ? `.${String(obj.className).split(/\s+/).slice(0, 2).join('.')}` : '';
  return `${tag}${cls}`;
}

async function gotoGuest(page) {
  await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 20000 });
  const guest = page.getByRole('button', { name: /continue as guest/i });
  if ((await guest.count()) > 0) {
    await guest.first().click();
    await page.waitForTimeout(1200);
  }
}

async function detectOverlayRoots(page) {
  return page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('div,section,aside'))
      .filter((el) => {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        if (!['fixed', 'absolute'].includes(style.position)) return false;
        const z = Number.parseInt(style.zIndex || '0', 10);
        if (Number.isNaN(z) || z < 30) return false;
        const rect = el.getBoundingClientRect();
        if (rect.width < 120 || rect.height < 80) return false;
        return true;
      })
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        className: el.className || '',
        zIndex: window.getComputedStyle(el).zIndex,
      }));
    return candidates.slice(0, 12);
  });
}

async function currentActive(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || !(el instanceof HTMLElement)) return null;
    return {
      tag: el.tagName.toLowerCase(),
      className: el.className || null,
      text: (el.textContent || '').trim().slice(0, 60),
      ariaLabel: el.getAttribute('aria-label'),
    };
  });
}

async function activeInsideAnyOverlay(page) {
  return page.evaluate(() => {
    const active = document.activeElement;
    if (!active || !(active instanceof HTMLElement)) return false;
    const roots = Array.from(document.querySelectorAll('div,section,aside')).filter((el) => {
      const style = window.getComputedStyle(el);
      if (!['fixed', 'absolute'].includes(style.position)) return false;
      const z = Number.parseInt(style.zIndex || '0', 10);
      if (Number.isNaN(z) || z < 30) return false;
      const rect = el.getBoundingClientRect();
      return rect.width >= 120 && rect.height >= 80;
    });
    return roots.some((r) => r.contains(active));
  });
}

async function walkTab(page, steps, reverse = false) {
  const rows = [];
  for (let i = 0; i < steps; i += 1) {
    await page.keyboard.press(reverse ? 'Shift+Tab' : 'Tab');
    const active = await currentActive(page);
    const inside = await activeInsideAnyOverlay(page);
    rows.push({
      step: i + 1,
      key: reverse ? 'Shift+Tab' : 'Tab',
      active: selectorSummary(active),
      ariaLabel: active?.ariaLabel || null,
      text: active?.text || null,
      insideOverlay: inside,
    });
  }
  return rows;
}

async function openNotifications(page) {
  const bell = page.locator('button').filter({ has: page.locator('svg') }).nth(1);
  if ((await bell.count()) === 0) return false;
  await bell.click();
  await page.waitForTimeout(800);
  return true;
}

async function openWalletSheet(page) {
  const connect = page.getByRole('button', { name: /connect wallet/i }).first();
  if ((await connect.count()) === 0) return false;
  await connect.click();
  await page.waitForTimeout(800);
  return true;
}

async function runScenario(page, name, opener) {
  const ok = await opener(page);
  if (!ok) return { name, skipped: true, reason: 'opener not found' };

  const overlays = await detectOverlayRoots(page);
  const tabForward = await walkTab(page, 16, false);
  const tabBackward = await walkTab(page, 10, true);
  const escaped = tabForward.some((r) => r.insideOverlay === false) || tabBackward.some((r) => r.insideOverlay === false);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const overlaysAfterEsc = await detectOverlayRoots(page);
  const escapeClosed = overlaysAfterEsc.length < overlays.length;

  await page.screenshot({ path: path.join(runDir, `${name}.png`) });

  return {
    name,
    skipped: false,
    overlayCount: overlays.length,
    focusEscapedOverlay: escaped,
    escapeClosed,
    tabForward,
    tabBackward,
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const out = { appUrl: APP_URL, timestamp: new Date().toISOString(), scenarios: [] };

  try {
    await gotoGuest(page);
    out.scenarios.push(await runScenario(page, 'wallet-sheet', openWalletSheet));

    // Re-enter stable screen for second scenario
    await gotoGuest(page);
    out.scenarios.push(await runScenario(page, 'notifications', openNotifications));
  } finally {
    await browser.close();
  }

  const outPath = path.join(runDir, 'keyboard-modal-results.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('Keyboard/modal audit:', outPath);
  for (const s of out.scenarios) {
    if (s.skipped) {
      console.log(`  ${s.name}: skipped (${s.reason})`);
    } else {
      console.log(`  ${s.name}: escaped=${s.focusEscapedOverlay}, escapeClosed=${s.escapeClosed}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
