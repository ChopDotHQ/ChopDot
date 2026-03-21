const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const APP_URL = process.env.AUDIT_URL || 'http://localhost:4173';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputRoot = '/Users/devinsonpena/ChopDot/output/playwright/failure-modes-v2';
const runDir = path.join(outputRoot, `run-${timestamp}`);
const stableResultsPath = path.join(outputRoot, 'results.json');

fs.mkdirSync(runDir, { recursive: true });
fs.mkdirSync(outputRoot, { recursive: true });

function nowIso() {
  return new Date().toISOString();
}

async function saveShot(page, name) {
  const shotPath = path.join(runDir, `${name}.png`);
  await page.screenshot({ path: shotPath, fullPage: true });
  return shotPath;
}

async function ensureSignedIn(page) {
  const guestBtn = page.getByRole('button', { name: /continue as guest/i });
  if (await guestBtn.count()) {
    await guestBtn.first().click();
    await page.waitForTimeout(900);
    return 'guest';
  }
  return 'existing-session';
}

async function dismissOverlays(page) {
  for (let i = 0; i < 3; i += 1) {
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(120);
    const cancelBtn = page.getByRole('button', { name: /cancel|close/i }).first();
    if ((await cancelBtn.count()) > 0) {
      await cancelBtn.click({ timeout: 500 }).catch(() => {});
    }
    await page.waitForTimeout(100);
  }
}

async function goBottomTab(page, tabName) {
  await dismissOverlays(page);
  const tab = page.getByRole('button', { name: new RegExp(`^${tabName}$`, 'i') }).first();
  if ((await tab.count()) === 0) throw new Error(`Bottom tab not found: ${tabName}`);
  await tab.click();
  await page.waitForTimeout(550);
}

async function clickPot(page, potNameRegex = /Polkadot Builder Party/i) {
  const pot = page.getByText(potNameRegex).first();
  if ((await pot.count()) === 0) throw new Error('Builder pot not found');
  await pot.click();
  await page.waitForTimeout(700);
}

async function goPotTab(page, tabName) {
  await dismissOverlays(page);
  const tab = page.getByRole('button', { name: new RegExp(`^${tabName}$`, 'i') }).first();
  if ((await tab.count()) === 0) throw new Error(`Pot tab not found: ${tabName}`);
  await tab.click();
  await page.waitForTimeout(350);
}

async function ensureInBuilderPot(page) {
  await ensureSignedIn(page);
  await goBottomTab(page, 'Pots');
  const already = (await page.getByRole('button', { name: /^expenses$/i }).count()) > 0;
  if (!already) {
    await clickPot(page);
  }
}

async function clickMemberMenu(page, memberName) {
  return page.evaluate((name) => {
    const p = Array.from(document.querySelectorAll('p')).find((el) => el.textContent?.trim() === name);
    if (!p) return false;
    const row = p.closest('div.card') || p.closest('div');
    if (!row) return false;
    const buttons = Array.from(row.querySelectorAll('button'));
    if (!buttons.length) return false;
    buttons[buttons.length - 1].click();
    return true;
  }, memberName);
}

async function ensureMemberAddress(page, memberName = 'Bob') {
  await goPotTab(page, 'Members');
  const hasAddress = await page.evaluate((name) => {
    const p = Array.from(document.querySelectorAll('p')).find((el) => el.textContent?.trim() === name);
    const row = p?.closest('div.card') || p?.closest('div');
    if (!row) return false;
    return row.textContent?.includes('DOT wallet ready') || false;
  }, memberName);
  if (hasAddress) return;

  const opened = await clickMemberMenu(page, memberName);
  if (!opened) throw new Error(`Could not open member menu for ${memberName}`);
  const editBtn = page.getByRole('button', { name: /edit member/i }).first();
  if ((await editBtn.count()) === 0) throw new Error('Edit member action missing');
  await editBtn.click();
  await page.waitForTimeout(450);

  const modal = page.locator('div').filter({ hasText: 'Edit Member' }).first();
  const inputs = modal.locator('input');
  if ((await inputs.count()) < 2) throw new Error('Edit member fields not found');
  await inputs.nth(0).fill(memberName);
  await inputs.nth(1).fill('15JH2k3XfKtNw6gYY3b2j4q6nT9Lb4YJ8gP5m9rAbfQ8wT1');
  const saveBtn = modal.getByRole('button', { name: /^save$/i }).first();
  await saveBtn.click();
  await page.waitForTimeout(700);
}

async function openQuickAdd(page) {
  const addExpenseBtn = page.getByRole('button', { name: /add expense/i }).first();
  if ((await addExpenseBtn.count()) === 0) throw new Error('Add expense button missing');
  await addExpenseBtn.click();
  await page.waitForTimeout(350);
  const modal = page.locator('div.fixed.inset-0').filter({ hasText: /Quick add/i }).first();
  if ((await modal.count()) === 0) throw new Error('Quick add modal missing');
  return modal;
}

async function createImbalance(page, memo, paidByLabel = 'Bob', amount = '1.000000') {
  await goPotTab(page, 'Expenses');
  const modal = await openQuickAdd(page);
  const inputs = modal.locator('input');
  await inputs.nth(0).fill(amount);
  await inputs.nth(1).fill(memo);
  const payerSelect = modal.locator('select').first();
  if ((await payerSelect.count()) > 0) {
    await payerSelect.selectOption({ label: paidByLabel }).catch(() => {});
  }
  await modal.getByRole('button', { name: /save/i }).first().click();
  await page.waitForTimeout(1000);
}

async function setupDotSettle(page) {
  await page.evaluate(() => {
    localStorage.setItem('flag_POLKADOT_APP_ENABLED', JSON.stringify(true));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await ensureInBuilderPot(page);
  await ensureMemberAddress(page, 'Bob');
  await createImbalance(page, `B4_DOT_${Date.now()}`, 'Bob', '1.000000');
  const settleBtn = page.getByRole('button', { name: /settle up/i }).first();
  if ((await settleBtn.count()) === 0) throw new Error('Settle Up button missing');
  await settleBtn.click();
  await page.waitForTimeout(450);
  const bob = page.getByText('Bob', { exact: true }).first();
  if ((await bob.count()) === 0) throw new Error('Bob not available in settle selection');
  await bob.click();
  await page.waitForTimeout(550);
  const dotTab = page.locator('button[data-method="dot"]').first();
  if ((await dotTab.count()) === 0) throw new Error('DOT method tab not visible');
  await dotTab.click();
  await page.waitForTimeout(300);
}

async function countOnchainSettlements(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('chopdot_pots');
    if (!raw) return 0;
    const pots = JSON.parse(raw);
    if (!Array.isArray(pots)) return 0;
    let total = 0;
    for (const pot of pots) {
      const history = Array.isArray(pot.history) ? pot.history : [];
      total += history.filter((h) => h?.type === 'onchain_settlement').length;
    }
    return total;
  });
}

async function readBodyText(page) {
  return page.locator('body').innerText();
}

async function runCase(page, name, fn, results) {
  const startedAt = nowIso();
  try {
    const details = await fn();
    const screenshot = await saveShot(page, `${name.replace(/\W+/g, '-').toLowerCase()}-pass`);
    results.push({ name, status: 'PASS', startedAt, endedAt: nowIso(), details, screenshot });
  } catch (error) {
    const screenshot = await saveShot(page, `${name.replace(/\W+/g, '-').toLowerCase()}-fail`);
    results.push({
      name,
      status: 'FAIL',
      startedAt,
      endedAt: nowIso(),
      details: error instanceof Error ? error.message : String(error),
      screenshot,
    });
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
  const page = await context.newPage();
  page.setDefaultTimeout(9000);

  const results = [];
  const matrix = [];

  try {
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await ensureSignedIn(page);
    await ensureInBuilderPot(page);

    await runCase(page, 'RPC timeout during DOT settlement shows error and no state corruption', async () => {
      await setupDotSettle(page);
      const before = await countOnchainSettlements(page);
      await page.evaluate(async () => {
        const mod = await import('/src/services/chain/sim.ts');
        mod.simChain.sendDot = async () => {
          throw new Error('RPC_TIMEOUT_INJECTED');
        };
      });

      const confirm = page.getByRole('button', { name: /confirm dot settlement/i }).first();
      if ((await confirm.count()) === 0) throw new Error('Confirm DOT Settlement CTA missing');
      await confirm.click();
      await page.waitForTimeout(1200);
      const text = await readBodyText(page);
      const after = await countOnchainSettlements(page);
      const stillOnSettle = (await page.getByRole('button', { name: /confirm dot settlement/i }).count()) > 0;
      const stuckSigning = /Signing\.\.\./i.test(text);

      if (!/Settlement failed/i.test(text)) throw new Error('No settlement failure message shown');
      if (after !== before) throw new Error(`On-chain settlement history changed unexpectedly (${before} -> ${after})`);
      if (!stillOnSettle) throw new Error('User was not kept on recoverable settle screen');
      if (stuckSigning) throw new Error('Transaction toast remained stuck in signing state after failure');

      matrix.push({
        failure: 'RPC timeout',
        injectedAt: 'sim chain sendDot',
        expected: 'clear error + retry path + no corrupted state',
        status: 'PASS',
        evidence: 'Failure toast shown, no history mutation, confirm CTA still visible',
      });
      return `History count unchanged (${before}); retry path preserved.`;
    }, results);

    await runCase(page, 'Wallet disconnect mid-flow is recoverable with clear message', async () => {
      await setupDotSettle(page);
      const before = await countOnchainSettlements(page);
      await page.evaluate(async () => {
        const mod = await import('/src/services/chain/sim.ts');
        mod.simChain.sendDot = async () => {
          throw new Error('WALLET_DISCONNECTED_INJECTED');
        };
      });

      const confirm = page.getByRole('button', { name: /confirm dot settlement/i }).first();
      await confirm.click();
      await page.waitForTimeout(1200);
      const text = await readBodyText(page);
      const after = await countOnchainSettlements(page);
      const retryStillPossible = (await page.getByRole('button', { name: /confirm dot settlement/i }).count()) > 0;
      const stuckSigning = /Signing\.\.\./i.test(text);

      if (!/Settlement failed/i.test(text)) throw new Error('No user-visible disconnect/failure message');
      if (after !== before) throw new Error(`Unexpected settlement write during disconnect (${before} -> ${after})`);
      if (!retryStillPossible) throw new Error('No retry path after disconnect-like failure');
      if (stuckSigning) throw new Error('Transaction toast remained stuck in signing state after disconnect-like failure');

      matrix.push({
        failure: 'Wallet disconnect mid-flow',
        injectedAt: 'sim chain sendDot',
        expected: 'recoverable state + message',
        status: 'PASS',
        evidence: 'Failure message shown, no write, user remains on settlement screen',
      });
      return `No write on injected disconnect; confirm remained available.`;
    }, results);

    await runCase(page, 'Supabase unavailable path shows explicit blocking message', async () => {
      await ensureInBuilderPot(page);
      await goPotTab(page, 'Members');
      await page.getByRole('button', { name: /add member/i }).first().click();
      await page.waitForTimeout(400);
      await page.getByRole('button', { name: /invite new/i }).first().click();
      await page.waitForTimeout(250);
      const emailInput = page.getByPlaceholder(/alice@example\.com/i).first();
      if ((await emailInput.count()) === 0) throw new Error('Invite email input not available');
      await emailInput.fill(`b4-${Date.now()}@example.com`);
      await page.getByRole('button', { name: /send invite/i }).first().click();
      await page.waitForTimeout(1200);
      const text = await readBodyText(page);
      const blocked =
        /supabase not configured/i.test(text) ||
        /must be logged in to invite/i.test(text) ||
        /failed to send invite/i.test(text) ||
        /authentication required/i.test(text);
      if (!blocked) throw new Error('No explicit invite/Supabase failure message observed');
      matrix.push({
        failure: 'Supabase unavailable',
        injectedAt: 'invite flow',
        expected: 'local-safe fallback or explicit blocking',
        status: 'PASS',
        evidence: 'User-visible invite failure message shown',
      });
      return 'Invite action surfaced explicit backend/unavailable error message.';
    }, results);

    await runCase(page, 'localStorage corruption on boot recovers safely from backup', async () => {
      const corruptionContext = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
      await corruptionContext.addInitScript(() => {
        const backup = [{
          id: 'b4-recovery-pot',
          name: 'B4 Recovery Pot',
          type: 'expense',
          baseCurrency: 'USD',
          members: [
            { id: 'owner', name: 'You', role: 'Owner', status: 'active' },
            { id: 'alice', name: 'Alice', role: 'Member', status: 'active' },
          ],
          expenses: [],
          budgetEnabled: false,
          checkpointEnabled: false,
          history: [],
        }];
        localStorage.setItem('chopdot_pots', '{BROKEN_JSON');
        localStorage.setItem('chopdot_pots_backup', JSON.stringify(backup));
      });
      const corruptionPage = await corruptionContext.newPage();
      corruptionPage.setDefaultTimeout(9000);
      await corruptionPage.goto(APP_URL, { waitUntil: 'networkidle', timeout: 60000 });
      await ensureSignedIn(corruptionPage);
      await goBottomTab(corruptionPage, 'Pots');

      const hasRecoveryPot = (await corruptionPage.getByText(/B4 Recovery Pot/i).count()) > 0;
      const storageOk = await corruptionPage.evaluate(() => {
        try {
          const raw = localStorage.getItem('chopdot_pots');
          if (!raw) return false;
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) && parsed.some((p) => p?.id === 'b4-recovery-pot');
        } catch {
          return false;
        }
      });
      const shot = await saveShot(corruptionPage, 'localstorage-corruption-recovery');
      await corruptionContext.close();

      if (!hasRecoveryPot || !storageOk) {
        throw new Error('Corruption recovery did not restore from backup as expected');
      }
      matrix.push({
        failure: 'localStorage corruption',
        injectedAt: 'app boot',
        expected: 'backup restore path and warning',
        status: 'PASS',
        evidence: `Recovery pot restored and chopdot_pots rehydrated (${shot})`,
      });
      return 'App recovered from broken chopdot_pots using chopdot_pots_backup.';
    }, results);

    await runCase(page, 'IPFS backup fail path coverage (blocked by disabled UI path)', async () => {
      await ensureInBuilderPot(page);
      await goPotTab(page, 'Settings');
      const backupBtnVisible =
        (await page.getByRole('button', { name: /backup to crust/i }).count()) > 0 ||
        (await page.getByText(/Backup to Crust/i).count()) > 0;
      const potHomeSource = fs.readFileSync('/Users/devinsonpena/ChopDot/src/components/screens/PotHome.tsx', 'utf8');
      const backupSectionDisabled = potHomeSource.includes('false && showCheckpointSection');

      if (backupBtnVisible) {
        throw new Error('Backup UI unexpectedly visible; blocked-path assumption invalid');
      }
      if (!backupSectionDisabled) {
        throw new Error('Could not confirm disabled backup/checkpoint guard in PotHome');
      }

      matrix.push({
        failure: 'IPFS upload fail',
        injectedAt: 'backup flow',
        expected: 'user-visible failure + no false success CID',
        status: 'BLOCKED',
        evidence: 'Backup/checkpoint UI path is currently disabled in PotHome (false && showCheckpointSection)',
      });
      return 'Runtime backup failure injection blocked because backup UI is disabled by feature guard.';
    }, results);

    const passCount = results.filter((r) => r.status === 'PASS').length;
    const failCount = results.filter((r) => r.status === 'FAIL').length;

    const report = {
      generatedAt: nowIso(),
      appUrl: APP_URL,
      runDir,
      cases: results,
      matrix,
      summary: {
        pass: passCount,
        fail: failCount,
      },
    };

    const runResultsPath = path.join(runDir, 'results.json');
    fs.writeFileSync(runResultsPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(stableResultsPath, JSON.stringify(report, null, 2));

    console.log(`Wrote ${runResultsPath}`);
    console.log(`Wrote ${stableResultsPath}`);
    console.log(`B4 PASS=${passCount} FAIL=${failCount}`);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
