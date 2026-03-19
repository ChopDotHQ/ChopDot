#!/usr/bin/env node
/**
 * Auth/state coverage audit:
 * - Documents guest flow vs attempted authenticated flow
 * - Captures whether production-like authenticated states were reachable
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const APP_URL = process.env.UI_AUDIT_URL || 'http://localhost:5173';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = path.join(__dirname, '../output/playwright', `ui-audit-auth-coverage-${timestamp}`);
fs.mkdirSync(runDir, { recursive: true });

async function attemptGuest(page) {
  const out = { reachable: false, details: '' };
  const guest = page.getByRole('button', { name: /continue as guest/i });
  if ((await guest.count()) > 0) {
    await guest.first().click();
    await page.waitForTimeout(1200);
    out.reachable = true;
    out.details = 'Guest session entered';
  } else {
    out.details = 'Guest button not found';
  }
  return out;
}

async function attemptAuthenticated(page) {
  const out = { attempted: true, reachable: false, details: '' };
  try {
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 20000 });
    const email = page.locator('input[type="email"]').first();
    const pass = page.locator('input[type="password"]').first();
    if ((await email.count()) === 0 || (await pass.count()) === 0) {
      out.details = 'Email/password fields not discoverable on auth screen';
      return out;
    }

    const id = Math.random().toString(36).slice(2, 8);
    const addr = `audit-${id}@example.com`;
    await email.fill(addr);
    await pass.fill('AuditPass!234');

    const submit = page.getByRole('button').filter({ hasText: /sign up|create account|continue|sign in|login/i }).first();
    if ((await submit.count()) === 0) {
      out.details = 'No auth submit button detected';
      return out;
    }

    await submit.click();
    await page.waitForTimeout(2200);
    const url = page.url();
    const stillAuth = /signin|auth/i.test(url) || (await page.getByRole('button', { name: /continue as guest/i }).count()) > 0;
    if (!stillAuth) {
      out.reachable = true;
      out.details = `Authenticated-like state reached at ${url}`;
    } else {
      out.details = `Auth flow remained on guest/auth state at ${url}`;
    }
    return out;
  } catch (error) {
    out.details = String(error?.message || error);
    return out;
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const result = { appUrl: APP_URL, timestamp: new Date().toISOString() };
  try {
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 20000 });
    result.guest = await attemptGuest(page);
    result.authenticatedAttempt = await attemptAuthenticated(page);
    await page.screenshot({ path: path.join(runDir, 'final-state.png') });
  } finally {
    await browser.close();
  }
  const outPath = path.join(runDir, 'auth-coverage-results.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log('Auth coverage audit:', outPath);
  console.log('Guest:', JSON.stringify(result.guest));
  console.log('Authenticated attempt:', JSON.stringify(result.authenticatedAttempt));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
