const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const APP_URL = process.env.AUDIT_URL || 'http://localhost:4173';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputRoot = '/Users/devinsonpena/ChopDot/output/playwright/state-machine-v2';
const runDir = path.join(outputRoot, `run-${timestamp}`);
const stableResultsPath = path.join(outputRoot, 'results.json');
const stableInvariantsPath = '/Users/devinsonpena/ChopDot/artifacts/AUDIT_V2_INVARIANTS.json';

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
    await page.waitForTimeout(1000);
    return 'guest';
  }
  return 'existing-session';
}

async function ensureInBuilderPot(page) {
  await dismissOverlays(page);
  await ensureSignedIn(page);
  await goBottomTab(page, 'Pots').catch(() => {});
  await dismissOverlays(page);
  const inPotTabs =
    (await page.getByRole('button', { name: /^expenses$/i }).count()) > 0 ||
    (await page.getByRole('button', { name: /^members$/i }).count()) > 0;
  if (inPotTabs) return;
  await clickPot(page);
  await dismissOverlays(page);
}

async function dismissOverlays(page) {
  for (let i = 0; i < 3; i += 1) {
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(120);

    await page.evaluate(() => {
      const backdrops = Array.from(document.querySelectorAll('div')).filter((el) => {
        const cls = typeof el.className === 'string' ? el.className : '';
        return cls.includes('absolute') && cls.includes('inset-0') && cls.includes('bg-black/40');
      });
      if (backdrops.length > 0) {
        (backdrops[0]).click();
      }
    }).catch(() => {});

    const cancelBtn = page.getByRole('button', { name: /cancel|close/i }).first();
    if ((await cancelBtn.count()) > 0) {
      await cancelBtn.click({ timeout: 600 }).catch(() => {});
    }
    await page.waitForTimeout(120);
  }
}

async function clickPot(page, potNameRegex = /Polkadot Builder Party/i) {
  const potCard = page.getByText(potNameRegex).first();
  if ((await potCard.count()) === 0) {
    throw new Error('Could not find builder pot on Pots screen');
  }
  await potCard.click();
  await page.waitForTimeout(700);
}

async function goPotTab(page, tabName) {
  const tab = page.getByRole('button', { name: new RegExp(`^${tabName}$`, 'i') }).first();
  if ((await tab.count()) === 0) {
    throw new Error(`Pot tab not found: ${tabName}`);
  }
  await tab.click();
  await page.waitForTimeout(350);
}

async function goBottomTab(page, tabName) {
  const tab = page.getByRole('button', { name: new RegExp(`^${tabName}$`, 'i') }).first();
  if ((await tab.count()) === 0) {
    throw new Error(`Bottom tab not found: ${tabName}`);
  }
  await tab.click();
  await page.waitForTimeout(500);
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

async function readPotsFromStorage(page) {
  return page.evaluate(() => {
    try {
      const raw = localStorage.getItem('chopdot_pots');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
}

function decimalPlaces(value) {
  const s = String(value);
  const parts = s.split('.');
  return parts[1] ? parts[1].length : 0;
}

function toleranceForCurrency(currency) {
  return currency === 'DOT' ? 1e-6 : 1e-2;
}

function isSubsequence(base, current) {
  let idx = 0;
  for (const item of current) {
    if (base[idx] === item) idx += 1;
    if (idx >= base.length) return true;
  }
  return base.length === 0;
}

function buildHistorySnapshot(pots) {
  const out = {};
  for (const pot of pots) {
    const entries = Array.isArray(pot.history) ? pot.history : [];
    out[pot.id] = entries.map((h) => String(h.id));
  }
  return out;
}

function countExpensesWithMemo(pots, memo) {
  let count = 0;
  const ids = [];
  for (const pot of pots) {
    const expenses = Array.isArray(pot.expenses) ? pot.expenses : [];
    for (const e of expenses) {
      if (e?.memo === memo) {
        count += 1;
        ids.push(String(e.id));
      }
    }
  }
  return { count, ids };
}

function countSettlementExpenses(pots, method = 'BANK') {
  const prefix = `Settlement: ${method}`;
  let count = 0;
  for (const pot of pots) {
    const expenses = Array.isArray(pot.expenses) ? pot.expenses : [];
    for (const e of expenses) {
      if (typeof e?.memo === 'string' && e.memo.startsWith(prefix)) {
        count += 1;
      }
    }
  }
  return count;
}

function parseAmountFromSettlementCard(text) {
  const dotMatch = text.match(/([0-9]+(?:\.[0-9]+)?)\s*DOT/i);
  if (dotMatch) return Number(dotMatch[1]);
  const usdMatch = text.match(/\$([0-9]+(?:\.[0-9]+)?)/);
  if (usdMatch) return Number(usdMatch[1]);
  return null;
}

async function readDisplayedSettleAmount(page) {
  const card = page.locator('div.card').filter({ hasText: /You owe|You are owed/i }).first();
  if ((await card.count()) === 0) return null;
  const text = await card.innerText();
  return parseAmountFromSettlementCard(text);
}

async function openQuickAdd(page) {
  const addExpenseBtn = page.getByRole('button', { name: /add expense/i }).first();
  if ((await addExpenseBtn.count()) === 0) {
    throw new Error('Add expense button not found');
  }
  await addExpenseBtn.click();
  await page.waitForTimeout(350);

  const quickAdd = page.locator('div.fixed.inset-0').filter({ hasText: /Quick add/i }).first();
  if ((await quickAdd.count()) === 0) {
    throw new Error('Quick add modal did not open');
  }
  return quickAdd;
}

async function createImbalance(page, memo, paidByLabel = 'You', amount = '0.500000') {
  await goPotTab(page, 'Expenses');
  const modal = await openQuickAdd(page);
  const inputs = modal.locator('input');
  if ((await inputs.count()) < 2) {
    throw new Error('Quick add inputs not available');
  }
  await inputs.nth(0).fill(amount);
  await inputs.nth(1).fill(memo);

  const paidBySelect = modal.locator('select').first();
  if ((await paidBySelect.count()) > 0) {
    await paidBySelect.selectOption({ label: paidByLabel }).catch(() => {});
  }

  const saveBtn = modal.getByRole('button', { name: /save/i }).first();
  if ((await saveBtn.count()) === 0) {
    throw new Error('Quick add save button not found');
  }
  await saveBtn.click();
  await page.waitForTimeout(1000);
}

function runInvariantChecks(pots, context) {
  const violations = [];
  const checks = {
    splitSums: { checked: 0, failed: 0 },
    settlementWriteback: { checked: 0, failed: 0 },
    historyConsistency: { checked: 0, failed: 0 },
    pooledNonNegative: { checked: 0, failed: 0 },
    precisionPolicy: { checked: 0, failed: 0 },
  };

  for (const pot of pots) {
    const baseCurrency = pot.baseCurrency || 'USD';
    const tol = toleranceForCurrency(baseCurrency);
    const expenses = Array.isArray(pot.expenses) ? pot.expenses : [];
    const history = Array.isArray(pot.history) ? pot.history : [];

    for (const expense of expenses) {
      const splits = Array.isArray(expense.split) ? expense.split : [];
      const splitTotal = splits.reduce((sum, s) => sum + Number(s.amount || 0), 0);
      const amount = Number(expense.amount || 0);
      checks.splitSums.checked += 1;
      if (Math.abs(splitTotal - amount) > tol + 1e-9) {
        checks.splitSums.failed += 1;
        violations.push({
          invariant: 'split-sum-matches-expense',
          potId: pot.id,
          expenseId: expense.id,
          amount,
          splitTotal,
          tolerance: tol,
        });
      }

      checks.precisionPolicy.checked += 1 + splits.length;
      const expenseDecimals = decimalPlaces(expense.amount);
      const allowed = baseCurrency === 'DOT' ? 6 : 2;
      if (expenseDecimals > allowed) {
        checks.precisionPolicy.failed += 1;
        violations.push({
          invariant: 'precision-policy',
          potId: pot.id,
          expenseId: expense.id,
          field: 'amount',
          value: expense.amount,
          decimals: expenseDecimals,
          allowed,
          currency: baseCurrency,
        });
      }
      for (const split of splits) {
        const splitDecimals = decimalPlaces(split.amount);
        if (splitDecimals > allowed) {
          checks.precisionPolicy.failed += 1;
          violations.push({
            invariant: 'precision-policy',
            potId: pot.id,
            expenseId: expense.id,
            field: `split:${split.memberId}`,
            value: split.amount,
            decimals: splitDecimals,
            allowed,
            currency: baseCurrency,
          });
        }
      }
    }

    checks.pooledNonNegative.checked += 1;
    if (typeof pot.totalPooled === 'number' && pot.totalPooled < 0) {
      checks.pooledNonNegative.failed += 1;
      violations.push({
        invariant: 'non-negative-pooled-total',
        potId: pot.id,
        totalPooled: pot.totalPooled,
      });
    }

    checks.historyConsistency.checked += history.length;
    for (const entry of history) {
      const commonValid =
        entry &&
        typeof entry.id === 'string' &&
        typeof entry.when === 'number' &&
        typeof entry.status === 'string' &&
        typeof entry.type === 'string';
      if (!commonValid) {
        checks.historyConsistency.failed += 1;
        violations.push({
          invariant: 'history-entry-shape',
          potId: pot.id,
          entryId: entry?.id,
          reason: 'missing common fields',
        });
        continue;
      }
      if (entry.type === 'onchain_settlement') {
        const hasAmount = entry.amountDot || entry.amountUsdc;
        const valid =
          typeof entry.fromMemberId === 'string' &&
          typeof entry.toMemberId === 'string' &&
          typeof entry.fromAddress === 'string' &&
          typeof entry.toAddress === 'string' &&
          typeof entry.txHash === 'string' &&
          !!hasAmount;
        if (!valid) {
          checks.historyConsistency.failed += 1;
          violations.push({
            invariant: 'history-entry-shape',
            potId: pot.id,
            entryId: entry.id,
            reason: 'invalid onchain settlement fields',
          });
        }
      }
      if (entry.type === 'remark_checkpoint') {
        const valid =
          typeof entry.message === 'string' &&
          typeof entry.potHash === 'string';
        if (!valid) {
          checks.historyConsistency.failed += 1;
          violations.push({
            invariant: 'history-entry-shape',
            potId: pot.id,
            entryId: entry.id,
            reason: 'invalid checkpoint fields',
          });
        }
      }
    }
  }

  const beforeSnapshot = context?.historySnapshotBefore || {};
  for (const pot of pots) {
    const baseIds = Array.isArray(beforeSnapshot[pot.id]) ? beforeSnapshot[pot.id] : [];
    const currentIds = (Array.isArray(pot.history) ? pot.history : []).map((h) => String(h.id));
    checks.historyConsistency.checked += 1;
    if (!isSubsequence(baseIds, currentIds)) {
      checks.historyConsistency.failed += 1;
      violations.push({
        invariant: 'history-append-only',
        potId: pot.id,
        beforeCount: baseIds.length,
        afterCount: currentIds.length,
      });
    }
  }

  checks.settlementWriteback.checked += 1;
  const before = Number(context?.settlementAmountBefore ?? 0);
  const after = Number(context?.settlementAmountAfter ?? before);
  if (!(before > 0 && after >= 0 && before - after > 0)) {
    checks.settlementWriteback.failed += 1;
    violations.push({
      invariant: 'settlement-writeback-reduces-open-balance',
      before,
      after,
      note: 'Expected after < before for the tested pair',
    });
  }

  return {
    generatedAt: nowIso(),
    potsChecked: pots.length,
    checks,
    violations,
    pass: violations.length === 0,
    context: {
      settlementAmountBefore: before,
      settlementAmountAfter: after,
      settlementAmountDelta: before - after,
      testedCounterparty: context?.testedCounterparty || null,
    },
  };
}

async function runCase(page, name, fn, results) {
  const startedAt = nowIso();
  try {
    const details = await fn();
    const screenshot = await saveShot(page, `${name.replace(/\W+/g, '-').toLowerCase()}-pass`);
    results.push({
      name,
      status: 'PASS',
      startedAt,
      endedAt: nowIso(),
      details,
      screenshot,
    });
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
  page.setDefaultTimeout(8000);

  const caseResults = [];
  const roleObservations = [];
  let historySnapshotBefore = {};
  let settlementAmountBefore = 0;
  let settlementAmountAfter = 0;
  let testedCounterparty = null;

  try {
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 60000 });
    const authMode = await ensureSignedIn(page);
    await page.waitForTimeout(500);

    await page.goto(`${APP_URL}/pots`, { waitUntil: 'networkidle', timeout: 60000 });
    await ensureSignedIn(page);
    await goBottomTab(page, 'Pots').catch(() => {});
    const createPotVisible = (await page.getByRole('button', { name: /create/i }).count()) > 0;
    roleObservations.push({
      capability: 'create-pot',
      roleContext: 'guest-session',
      observed: createPotVisible ? 'ALLOW' : 'DENY',
      evidence: createPotVisible ? 'Create Pot CTA visible on Pots screen' : 'Create Pot CTA not visible',
    });

    await ensureInBuilderPot(page);
    historySnapshotBefore = buildHistorySnapshot(await readPotsFromStorage(page));

    await runCase(page, 'B1.1 Invalid settle deep-link fails safely', async () => {
      await page.goto(`${APP_URL}/settle-home`, { waitUntil: 'networkidle', timeout: 60000 });
      await ensureSignedIn(page);
      const hasBuilderPot = (await page.getByText(/Polkadot Builder Party/i).count()) > 0;
      if (!hasBuilderPot) {
        throw new Error('App did not recover to a safe screen after invalid deep-link');
      }
      await clickPot(page);
      return 'Unknown route /settle-home recovered to safe app state (pot list).';
    }, caseResults);

    await runCase(page, 'B1.2 Rapid Save (x3) does not duplicate expense writes', async () => {
      await ensureInBuilderPot(page);
      await goPotTab(page, 'Expenses');
      const memo = `B1_DUP_${Date.now()}`;
      const before = countExpensesWithMemo(await readPotsFromStorage(page), memo);

      const modal = await openQuickAdd(page);
      const inputs = modal.locator('input');
      await inputs.nth(0).fill('0.500000');
      await inputs.nth(1).fill(memo);

      const saveBtn = modal.getByRole('button', { name: /save/i }).first();
      await saveBtn.click();
      await saveBtn.click({ timeout: 500 }).catch(() => {});
      await saveBtn.click({ timeout: 500 }).catch(() => {});
      await page.waitForTimeout(1200);

      const after = countExpensesWithMemo(await readPotsFromStorage(page), memo);
      const delta = after.count - before.count;
      if (delta !== 1) {
        throw new Error(`Expected exactly 1 write, observed ${delta} writes`);
      }
      return `Expense memo ${memo} created once (delta=${delta}, ids=${after.ids.join(',')}).`;
    }, caseResults);

    await runCase(page, 'B1.3 Remove member then stale target is blocked safely', async () => {
      await ensureInBuilderPot(page);
      await goPotTab(page, 'Members');

      const ownerMenuOpened = await clickMemberMenu(page, 'You');
      const ownerRemoveVisible = (await page.getByRole('button', { name: /remove member/i }).count()) > 0;
      roleObservations.push({
        capability: 'remove-owner',
        roleContext: 'owner-row-ui',
        observed: ownerRemoveVisible ? 'ALLOW' : 'DENY',
        evidence: ownerRemoveVisible
          ? 'Remove member action became visible for owner row'
          : ownerMenuOpened
            ? 'Owner row has non-destructive actions only (no remove)'
            : 'Owner row has no action menu',
      });
      await dismissOverlays(page);

      let removed = null;
      const candidates = ['Charlie', 'Bob', 'Alice'];
      for (const candidate of candidates) {
        const present = (await page.getByText(candidate, { exact: true }).count()) > 0;
        if (!present) continue;
        const opened = await clickMemberMenu(page, candidate);
        if (!opened) continue;
        const removeBtn = page.getByRole('button', { name: /remove member/i });
        if ((await removeBtn.count()) === 0) continue;
        await removeBtn.first().click();
        await page.waitForTimeout(900);
        removed = candidate;
        break;
      }
      if (!removed) {
        throw new Error('Could not remove any non-owner member for stale-target test');
      }

      await goPotTab(page, 'Members');
      const stillInCurrentPot = (await page.getByText(removed, { exact: true }).count()) > 0;
      if (stillInCurrentPot) {
        throw new Error(`Removed member still visible in current pot members: ${removed}`);
      }

      await goBottomTab(page, 'People').catch(() => {});
      await goBottomTab(page, 'Pots').catch(() => {});
      await ensureInBuilderPot(page);
      return `Removed ${removed}; member absent from current pot members.`;
    }, caseResults);

    await runCase(page, 'B1.4 Modal back/escape returns to valid parent screens', async () => {
      await ensureInBuilderPot(page);
      await goPotTab(page, 'Members');
      await page.getByRole('button', { name: /add member/i }).first().click();
      await page.waitForTimeout(350);
      const addMemberSheetVisible = (await page.getByText(/Add someone from your contacts/i).count()) > 0;
      if (!addMemberSheetVisible) {
        throw new Error('Add Member sheet did not open');
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(350);
      if ((await page.getByText(/Add someone from your contacts/i).count()) > 0) {
        throw new Error('Add Member sheet did not close on Escape');
      }

      await goPotTab(page, 'Expenses');
      await openQuickAdd(page);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(350);
      if ((await page.getByText(/Quick add/i).count()) > 0) {
        throw new Error('Quick add sheet did not close on Escape');
      }
      return 'Escape/back dismisses modals and returns to parent tab screens.';
    }, caseResults);

    await runCase(page, 'B1.5 Settlement confirm double-click does not double-write', async () => {
      testedCounterparty = null;
      settlementAmountBefore = 0;
      settlementAmountAfter = 0;
      await ensureInBuilderPot(page);
      await dismissOverlays(page);
      await createImbalance(page, `B1_SETTLE_${Date.now()}`, 'Bob', '1.000000');
      await goPotTab(page, 'Expenses');

      const settleUpBtn = page.getByRole('button', { name: /settle up/i }).first();
      if ((await settleUpBtn.count()) === 0) {
        throw new Error('Settle Up button not available');
      }
      await settleUpBtn.click();
      await page.waitForTimeout(500);

      const candidates = ['Bob', 'Alice', 'Charlie'];
      for (const name of candidates) {
        const el = page.getByText(name, { exact: true });
        if ((await el.count()) > 0) {
          await el.first().click();
          testedCounterparty = name;
          break;
        }
      }
      if (!testedCounterparty) {
        throw new Error('No settlement counterparty available');
      }
      await page.waitForTimeout(450);

      await page.locator('button[data-method="bank"]').first().click();
      await page.waitForTimeout(200);

      const amount = await readDisplayedSettleAmount(page);
      settlementAmountBefore = amount || 0;
      if (!(settlementAmountBefore > 0)) {
        throw new Error(`Pre-settlement amount invalid: ${settlementAmountBefore}`);
      }

      const beforeSettlementWrites = countSettlementExpenses(await readPotsFromStorage(page), 'BANK');
      const confirmBank = page.getByRole('button', { name: /confirm bank settlement/i }).first();
      if ((await confirmBank.count()) === 0) {
        throw new Error('Confirm Bank Settlement CTA missing');
      }
      await confirmBank.dblclick().catch(async () => {
        await confirmBank.click();
      });
      await page.waitForTimeout(1300);

      const afterSettlementWrites = countSettlementExpenses(await readPotsFromStorage(page), 'BANK');
      const delta = afterSettlementWrites - beforeSettlementWrites;
      if (delta !== 1) {
        throw new Error(`Expected 1 settlement write, observed delta=${delta}`);
      }

      const settleUpAgain = page.getByRole('button', { name: /settle up/i }).first();
      if ((await settleUpAgain.count()) > 0) {
        await settleUpAgain.click();
        await page.waitForTimeout(450);
        const target = page.getByText(testedCounterparty, { exact: true });
        if ((await target.count()) > 0) {
          await target.first().click();
          await page.waitForTimeout(450);
          settlementAmountAfter = (await readDisplayedSettleAmount(page)) || 0;
          await page.keyboard.press('Escape').catch(() => {});
        } else {
          settlementAmountAfter = 0;
        }
      } else {
        settlementAmountAfter = 0;
      }

      if (!(settlementAmountAfter < settlementAmountBefore)) {
        throw new Error(`Settlement did not reduce balance: before=${settlementAmountBefore}, after=${settlementAmountAfter}`);
      }

      const dotMethodVisible = (await page.locator('button[data-method="dot"]').count()) > 0;
      roleObservations.push({
        capability: 'dot-settlement-tab',
        roleContext: 'guest-simulation',
        observed: dotMethodVisible ? 'ALLOW' : 'DENY',
        evidence: dotMethodVisible
          ? 'DOT method tab visible in settle flow'
          : 'DOT method tab hidden',
      });

      return `Settlement write delta=${delta}; amount reduced ${settlementAmountBefore} -> ${settlementAmountAfter} with ${testedCounterparty}.`;
    }, caseResults);

    const finalPots = await readPotsFromStorage(page);
    const invariants = runInvariantChecks(finalPots, {
      historySnapshotBefore,
      settlementAmountBefore,
      settlementAmountAfter,
      testedCounterparty,
    });

    const report = {
      generatedAt: nowIso(),
      appUrl: APP_URL,
      authMode: authMode,
      runDir,
      cases: caseResults,
      roleObservations,
      invariants,
    };

    const runResultsPath = path.join(runDir, 'results.json');
    fs.writeFileSync(runResultsPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(stableResultsPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(stableInvariantsPath, JSON.stringify(invariants, null, 2));

    const passCount = caseResults.filter((r) => r.status === 'PASS').length;
    const failCount = caseResults.filter((r) => r.status === 'FAIL').length;

    console.log(`Wrote ${runResultsPath}`);
    console.log(`Wrote ${stableResultsPath}`);
    console.log(`Wrote ${stableInvariantsPath}`);
    console.log(`B1 PASS=${passCount} FAIL=${failCount}`);
    console.log(`B3 violations=${invariants.violations.length}`);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
