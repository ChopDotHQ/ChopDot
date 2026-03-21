#!/usr/bin/env node
/**
 * Content resilience stress test:
 * - Pseudo-localises visible text (expanded strings)
 * - RTL toggle pass
 * - Overflow detection (scrollWidth > clientWidth)
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const APP_URL = process.env.UI_AUDIT_URL || 'http://localhost:5173';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = path.join(__dirname, '../output/playwright', `ui-audit-content-stress-${timestamp}`);
fs.mkdirSync(runDir, { recursive: true });

async function gotoGuest(page) {
  await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 20000 });
  const guest = page.getByRole('button', { name: /continue as guest/i });
  if ((await guest.count()) > 0) {
    await guest.first().click();
    await page.waitForTimeout(1200);
  }
}

async function injectPseudoLocale(page) {
  await page.evaluate(() => {
    const replacer = (s) => {
      if (!s || s.trim().length < 2) return s;
      const map = { a: 'á', e: 'ë', i: 'ï', o: 'ô', u: 'ü', A: 'Â', E: 'Ë', I: 'Ï', O: 'Ö', U: 'Û' };
      const transformed = s.replace(/[aeiouAEIOU]/g, (m) => map[m] || m);
      return `[¡¡ ${transformed} — long text expansion sample !!]`;
    };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const parent = n.parentElement;
      if (!parent) continue;
      const tag = parent.tagName.toLowerCase();
      if (['script', 'style'].includes(tag)) continue;
      n.textContent = replacer(n.textContent || '');
    }
  });
}

async function setRTL(page) {
  await page.evaluate(() => {
    document.documentElement.setAttribute('dir', 'rtl');
  });
}

async function detectOverflow(page) {
  return page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('body *'));
    const offenders = [];
    for (const el of elements) {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 30 || rect.height < 12) continue;
      if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          className: el.className || null,
          text: (el.textContent || '').trim().slice(0, 80),
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
        });
      }
    }
    return offenders.slice(0, 80);
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  const out = { appUrl: APP_URL, timestamp: new Date().toISOString(), cases: {} };
  try {
    await gotoGuest(page);
    await page.screenshot({ path: path.join(runDir, 'baseline.png') });
    out.cases.baselineOverflow = await detectOverflow(page);

    await injectPseudoLocale(page);
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(runDir, 'pseudo-locale.png') });
    out.cases.pseudoLocaleOverflow = await detectOverflow(page);

    await setRTL(page);
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(runDir, 'pseudo-locale-rtl.png') });
    out.cases.pseudoLocaleRtlOverflow = await detectOverflow(page);
  } finally {
    await browser.close();
  }

  const outPath = path.join(runDir, 'content-stress-results.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('Content stress audit:', outPath);
  console.log(`  baseline overflow: ${out.cases.baselineOverflow.length}`);
  console.log(`  pseudo-locale overflow: ${out.cases.pseudoLocaleOverflow.length}`);
  console.log(`  pseudo-locale RTL overflow: ${out.cases.pseudoLocaleRtlOverflow.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
