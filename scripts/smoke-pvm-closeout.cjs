const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const APP_URL = process.env.SMOKE_URL || 'http://127.0.0.1:4173';
const ROOT = path.resolve(__dirname, '..');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = path.join(ROOT, 'output', 'playwright', `smoke-pvm-closeout-${timestamp}`);
const reportPath = path.join(ROOT, 'artifacts', 'SMOKE_PVM_CLOSEOUT.md');

fs.mkdirSync(runDir, { recursive: true });

const seededPot = {
  id: 'pvm-e2e-pot',
  name: 'PVM E2E Pot',
  type: 'expense',
  baseCurrency: 'DOT',
  mode: 'casual',
  checkpointEnabled: false,
  budgetEnabled: false,
  archived: false,
  members: [
    {
      id: 'owner',
      name: 'You',
      role: 'Owner',
      status: 'active',
      address: '15owner111111111111111111111111111111111111111111',
      evmAddress: '0x1111111111111111111111111111111111111111',
    },
    {
      id: 'alice',
      name: 'Alice',
      role: 'Member',
      status: 'active',
      address: '15alice11111111111111111111111111111111111111111',
      evmAddress: '0x2222222222222222222222222222222222222222',
    },
  ],
  expenses: [
    {
      id: 'exp-1',
      amount: 10,
      currency: 'DOT',
      paidBy: 'alice',
      memo: 'Venue snacks',
      date: '2026-03-16T00:00:00.000Z',
      split: [
        { memberId: 'owner', amount: 5 },
        { memberId: 'alice', amount: 5 },
      ],
      attestations: [],
      hasReceipt: false,
    },
  ],
  history: [],
  closeouts: [],
  createdAt: '2026-03-16T00:00:00.000Z',
};

const anchoredCloseoutPot = {
  ...seededPot,
  closeouts: [
    {
      id: 'closeout-active-1',
      potId: 'pvm-e2e-pot',
      asset: 'DOT',
      snapshotHash: `0x${'b'.repeat(64)}`,
      contractAddress: '0x3333333333333333333333333333333333333333',
      closeoutId: '98765',
      contractTxHash: `0x${'c'.repeat(64)}`,
      status: 'active',
      createdByMemberId: 'owner',
      createdAt: Date.now(),
      participantMemberIds: ['owner', 'alice'],
      participantAddresses: [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
      ],
      settledLegCount: 0,
      totalLegCount: 1,
      legs: [
        {
          index: 0,
          fromMemberId: 'owner',
          toMemberId: 'alice',
          fromAddress: '0x1111111111111111111111111111111111111111',
          toAddress: '0x2222222222222222222222222222222222222222',
          amount: '5.000000',
          asset: 'DOT',
          status: 'pending',
        },
      ],
    },
  ],
};

async function maybeContinueAsGuest(page) {
  const guestBtn = page.getByRole('button', { name: /continue as guest/i });
  if (await guestBtn.count()) {
    await guestBtn.first().click();
    await page.waitForTimeout(1000);
  }
}

async function screenshot(page, name) {
  const filePath = path.join(runDir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
  let status = 'FAIL';
  let detail = '';
  let shot = '';

  try {
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await maybeContinueAsGuest(page);

    await page.evaluate((pot) => {
      localStorage.setItem('chopdot_e2e_seed_pots', JSON.stringify([pot]));
      localStorage.setItem('chopdot_e2e_seed_settlements', JSON.stringify([]));
    }, anchoredCloseoutPot);

    await page.goto(`${APP_URL}/pots`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.getByText('PVM E2E Pot', { exact: true }).click();

    await page.getByRole('button', { name: /settle up/i }).click();
    await page.getByRole('button', { name: /alice/i }).click();
    await page.getByText(/onchain closeout/i).waitFor({ timeout: 20000 });
    await page.getByText(/98765/i).waitFor({ timeout: 20000 });
    await page.getByText(/anchored/i).waitFor({ timeout: 20000 });

    shot = await screenshot(page, 'pvm-closeout-pass');
    status = 'PASS';
    detail = 'Anchored closeout context is visible and ready for live settlement.';
  } catch (error) {
    shot = await screenshot(page, 'pvm-closeout-fail').catch(() => '');
    detail = error instanceof Error ? error.message : String(error);
  } finally {
    await browser.close();
  }

  const report = [
    '# Smoke Report - PVM Closeout',
    '',
    `- Generated: ${new Date().toISOString()}`,
    `- App URL: ${APP_URL}`,
    `- Result: ${status}`,
    `- Detail: ${detail}`,
    `- Screenshot: ${shot}`,
    `- Run artifacts: ${runDir}`,
    '',
  ].join('\n');

  fs.writeFileSync(reportPath, report);
  console.log(`Wrote ${reportPath}`);
  console.log(`RESULT=${status}`);
  if (status !== 'PASS') {
    process.exit(1);
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
