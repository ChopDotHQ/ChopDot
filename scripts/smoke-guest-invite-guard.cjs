const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const APP_URL = process.env.SMOKE_URL || 'http://localhost:4173';
const ROOT = path.resolve(__dirname, '..');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = path.join(ROOT, 'output', 'playwright', `smoke-guest-invite-guard-${timestamp}`);
const reportPath = path.join(ROOT, 'artifacts', 'SMOKE_GUEST_INVITE_GUARD.md');

fs.mkdirSync(runDir, { recursive: true });
fs.mkdirSync(path.dirname(reportPath), { recursive: true });

async function ensureSignedIn(page) {
  const guestBtn = page.getByRole('button', { name: /continue as guest/i });
  if (await guestBtn.count()) {
    await guestBtn.first().click();
    await page.waitForTimeout(900);
    return 'guest';
  }
  return 'existing-session';
}

async function openTargetPot(page, preferredName = 'Polkadot Builder Party') {
  const potsTab = page.getByText('Pots', { exact: true });
  if ((await potsTab.count()) > 0) {
    await potsTab.first().click();
    await page.waitForTimeout(400);
  }

  const preferred = page.getByText(new RegExp(preferredName, 'i')).first();
  if ((await preferred.count()) > 0) {
    await preferred.click();
    await page.waitForTimeout(700);
    return true;
  }
  return false;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
  let status = 'FAIL';
  let detail = '';
  let screenshot = '';
  let authMode = 'unknown';

  try {
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 60000 });
    authMode = await ensureSignedIn(page);

    const opened = await openTargetPot(page);
    if (!opened) throw new Error('Could not open target pot');

    await page.getByRole('button', { name: /members/i }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /add member/i }).click();
    await page.waitForTimeout(400);

    await page.getByRole('button', { name: /invite new/i }).first().click();
    await page.waitForTimeout(300);

    const warning = page.getByText('Email invites are disabled in guest mode. Use QR sharing or add from contacts.');
    if ((await warning.count()) === 0) {
      throw new Error('Guest invite warning text is missing');
    }

    const sendInvite = page.getByRole('button', { name: /send invite/i }).first();
    const isDisabled = await sendInvite.isDisabled();
    if (!isDisabled) {
      throw new Error('Send Invite button should be disabled in guest mode');
    }

    screenshot = path.join(runDir, 'guest-invite-guard-pass.png');
    await page.screenshot({ path: screenshot, fullPage: true });

    status = 'PASS';
    detail = 'Guest mode blocks email invites in UI with clear guidance and disabled CTA.';
  } catch (error) {
    screenshot = path.join(runDir, 'guest-invite-guard-fail.png');
    await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});
    detail = error instanceof Error ? error.message : String(error);
  } finally {
    await browser.close();
  }

  const lines = [
    '# Smoke Report - Guest Invite Guard',
    '',
    `- Generated: ${new Date().toISOString()}`,
    `- App URL: ${APP_URL}`,
    `- Auth mode: ${authMode}`,
    `- Result: ${status}`,
    `- Detail: ${detail}`,
    `- Screenshot: ${screenshot}`,
    `- Run artifacts: ${runDir}`,
    '',
  ];

  fs.writeFileSync(reportPath, lines.join('\n'));
  console.log(`Wrote ${reportPath}`);
  console.log(`RESULT=${status}`);
  if (status !== 'PASS') process.exit(1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
