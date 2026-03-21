const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const APP_URL = process.env.SMOKE_URL || 'http://localhost:4173';
const ROOT = path.resolve(__dirname, '..');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = path.join(ROOT, 'output', 'playwright', `smoke-five-flows-${timestamp}`);
const reportMdPath = path.join(ROOT, 'artifacts', 'SMOKE_5_FLOWS_REPORT.md');

fs.mkdirSync(runDir, { recursive: true });
fs.mkdirSync(path.dirname(reportMdPath), { recursive: true });

function nowIso() {
  return new Date().toISOString();
}

async function saveShot(page, name) {
  const p = path.join(runDir, `${name}.png`);
  await page.screenshot({ path: p, fullPage: true });
  return p;
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

async function clickExactText(page, text) {
  const t = page.getByText(text, { exact: true });
  if ((await t.count()) === 0) return false;
  await t.first().click();
  return true;
}

async function openTargetPot(page, preferredName = 'Polkadot Builder Party') {
  await clickExactText(page, 'Pots');
  await page.waitForTimeout(400);

  const preferred = page.getByText(new RegExp(preferredName, 'i')).first();
  if ((await preferred.count()) > 0) {
    await preferred.click();
    await page.waitForTimeout(700);
    return preferredName;
  }

  const clickedAny = await page.evaluate(() => {
    const clickable = Array.from(document.querySelectorAll('button'));
    const candidate = clickable.find((btn) => {
      const text = btn.textContent?.trim() || '';
      return text.length > 0 && /party|pot|builder|room|group/i.test(text);
    });
    if (!candidate) return null;
    const label = candidate.textContent?.trim() || null;
    candidate.click();
    return label;
  });

  if (clickedAny) {
    await page.waitForTimeout(700);
    return clickedAny;
  }

  return null;
}

async function clickMemberMenu(page, memberName) {
  return page.evaluate((name) => {
    const p = Array.from(document.querySelectorAll('p')).find((el) => el.textContent?.trim() === name);
    const row = p?.closest('div.card') || p?.closest('div');
    if (!row) return false;
    const buttons = Array.from(row.querySelectorAll('button'));
    if (!buttons.length) return false;
    buttons[buttons.length - 1].click();
    return true;
  }, memberName);
}

async function clickAddMemberContact(page, preferredName = 'Diana') {
  return page.evaluate((name) => {
    const pList = Array.from(document.querySelectorAll('p'));
    const match = pList.find((p) => p.textContent?.trim() === name)
      || pList.find((p) => p.textContent?.trim() && p.textContent?.trim() !== 'Add Member' && p.closest('button'));
    const btn = match?.closest('button');
    if (!btn) return null;
    const label = match?.textContent?.trim() || null;
    btn.click();
    return label;
  }, preferredName);
}

async function chooseSettlePerson(page, names = ['Alice', 'Bob', 'Charlie']) {
  for (const name of names) {
    const exact = page.getByText(name, { exact: true });
    if ((await exact.count()) > 0) {
      await exact.first().click();
      return name;
    }
    const fuzzy = page.getByText(new RegExp(name, 'i'));
    if ((await fuzzy.count()) > 0) {
      await fuzzy.first().click();
      return name;
    }
  }
  throw new Error(`Could not select settlement counterparty from: ${names.join(', ')}`);
}

async function runFlow(page, flowName, fn, results) {
  const startedAt = nowIso();
  try {
    const details = await fn();
    const screenshot = await saveShot(page, `${flowName.replace(/\s+/g, '-').toLowerCase()}-pass`);
    results.push({ flow: flowName, status: 'PASS', startedAt, endedAt: nowIso(), details, screenshot });
  } catch (error) {
    const screenshot = await saveShot(page, `${flowName.replace(/\s+/g, '-').toLowerCase()}-fail`);
    results.push({
      flow: flowName,
      status: 'FAIL',
      startedAt,
      endedAt: nowIso(),
      details: error instanceof Error ? error.message : String(error),
      screenshot,
    });
  }
}

async function createImbalance(page, memo) {
  await page.getByRole('button', { name: /expenses/i }).click();
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: /add expense/i }).first().click();
  await page.waitForTimeout(250);

  const inputs = page.locator('input');
  if ((await inputs.count()) < 2) {
    throw new Error('Quick add inputs not available while seeding imbalance');
  }

  await inputs.nth(0).fill('0.5');
  await inputs.nth(1).fill(memo);
  const quickAddModal = page.locator('div.fixed.inset-0').filter({ hasText: 'Quick add (DOT)' }).first();
  const saveQuickAdd = quickAddModal.getByRole('button', { name: /save/i }).first();
  if ((await saveQuickAdd.count()) === 0) {
    throw new Error('Quick add save button not found');
  }
  await saveQuickAdd.click();
  await page.waitForTimeout(900);

  // Close quick-add sheet so it does not block subsequent interactions.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  if ((await page.getByText('Quick add (DOT)', { exact: true }).count()) > 0) {
    const cancel = page.getByRole('button', { name: /cancel/i });
    if ((await cancel.count()) > 0) {
      await cancel.first().click();
    } else {
      await page.keyboard.press('Escape');
    }
  }
  await page.waitForTimeout(250);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
  const results = [];

  try {
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 60000 });
    const authMode = await ensureSignedIn(page);
    await saveShot(page, 'landing-authenticated');

    const openedPot = await openTargetPot(page);
    if (!openedPot) {
      throw new Error('Could not open any pot for smoke flows');
    }
    const membersTab = page.getByRole('button', { name: /members/i });
    if ((await membersTab.count()) === 0) {
      throw new Error('Pot opened but members tab is unavailable');
    }
    await saveShot(page, 'pot-home-initial');

    let addedMemberName = null;

    await runFlow(page, '1) Add Member', async () => {
      await page.getByRole('button', { name: /members/i }).click();
      await page.getByRole('button', { name: /add member/i }).click();
      await page.waitForTimeout(400);

      const label = await clickAddMemberContact(page, 'Diana');
      if (!label) {
        throw new Error('Could not click a contact card in Add Member sheet');
      }
      addedMemberName = label;
      await page.waitForTimeout(900);

      const body = await page.locator('body').innerText();
      if (!body.toLowerCase().includes('added to pot')) {
        throw new Error('No success toast after add-member action');
      }

      // Ensure Add Member sheet is closed before next flow.
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
      if ((await page.getByText('Add someone from your contacts or invite a new person').count()) > 0) {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(300);

      return `Triggered add-member action for: ${label}`;
    }, results);

    await runFlow(page, '2) Remove Member', async () => {
      await page.getByRole('button', { name: /members/i }).click();
      await page.waitForTimeout(400);

      const target = addedMemberName && (await page.getByText(addedMemberName, { exact: true }).count()) > 0
        ? addedMemberName
        : 'Charlie';

      const menuOpened = await clickMemberMenu(page, target);
      if (!menuOpened) {
        throw new Error(`Could not open member menu for ${target}`);
      }
      await page.waitForTimeout(300);

      const removeBtn = page.getByRole('button', { name: /remove member/i });
      if ((await removeBtn.count()) === 0) {
        throw new Error('Remove member action not shown after opening menu');
      }
      await removeBtn.first().click();
      await page.waitForTimeout(800);

      const body = await page.locator('body').innerText();
      if (!body.toLowerCase().includes('member removed')) {
        throw new Error('No success toast after remove-member action');
      }

      return `Removed member target: ${target}`;
    }, results);

    await runFlow(page, '3) Edit Settings', async () => {
      await page.getByRole('button', { name: /settings/i }).click();
      await page.waitForTimeout(400);

      const nameInput = page.locator('input').first();
      const originalName = (await nameInput.inputValue()).trim();
      if (!originalName) {
        throw new Error('Pot name input is empty in Settings');
      }

      const newName = `${originalName} QA`;
      await nameInput.fill(newName);
      await page.waitForTimeout(300);

      await page.getByRole('button', { name: /expenses/i }).click();
      await page.waitForTimeout(300);
      await page.getByRole('button', { name: /settings/i }).click();
      await page.waitForTimeout(300);

      const persistedValue = (await page.locator('input').first().inputValue()).trim();
      if (persistedValue !== newName) {
        throw new Error(`Settings name did not persist. Expected "${newName}", got "${persistedValue}"`);
      }

      return `Pot name persisted: ${newName}`;
    }, results);

    await runFlow(page, '4) Settle DOT (Simulation)', async () => {
      await createImbalance(page, 'Smoke imbalance DOT');
      if ((await page.getByText('Quick add (DOT)', { exact: true }).count()) > 0) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      }

      await page.getByRole('button', { name: /members/i }).click();
      await page.waitForTimeout(400);

      const addWalletButtons = page.locator('button', { hasText: 'Add DOT wallet' });
      if ((await addWalletButtons.count()) >= 2) {
        await addWalletButtons.nth(1).click();

        await page.waitForTimeout(400);
        const inputs = page.locator('input');
        if ((await inputs.count()) < 2) {
          throw new Error('Edit Member modal inputs not found');
        }

        await inputs.nth(0).fill('Alice');
        await inputs.nth(1).fill('15yRkVrk65sM3S3NfYYkzMErU6B5D6uFm1v7vhjqnXQHh5Xg');
        await page.waitForTimeout(300);

        const editModal = page.locator('div.fixed.inset-0').filter({ hasText: 'Edit Member' }).first();
        const saveBtn = editModal.getByRole('button', { name: /^save$/i });
        if ((await saveBtn.count()) === 0) {
          throw new Error('Save button not found in Edit Member modal');
        }
        if (await saveBtn.first().isDisabled()) {
          throw new Error('Save button is disabled after filling valid member/address inputs');
        }
        await saveBtn.first().click();
        await page.waitForTimeout(700);
      }

      await page.getByRole('button', { name: /expenses/i }).click();
      await page.getByRole('button', { name: /settle up/i }).first().click();
      await page.waitForTimeout(500);

      const selected = await chooseSettlePerson(page, ['Alice', 'Bob', 'Charlie']);
      await page.waitForTimeout(600);

      const trackPayment = page.getByRole('button', { name: /track payment/i }).first();
      if ((await trackPayment.count()) === 0) {
        throw new Error('Track payment option not available in receiver settlement flow');
      }
      await trackPayment.click();
      await page.waitForTimeout(500);

      const body = await page.locator('body').innerText();
      if (!/start smart settlement|tracked payment progress|smart settlement/i.test(body.toLowerCase())) {
        throw new Error('Tracked payment flow did not open after choosing Track payment');
      }

      return `Tracked payment flow opened for ${selected}`;
    }, results);

    await runFlow(page, '5) Settle Non-DOT', async () => {
      // Reset to pot home so this flow is independent from prior flow state.
      await clickExactText(page, 'Pots');
      await page.waitForTimeout(400);
      const potCard = page.getByText(/Polkadot Builder Party/i).first();
      if ((await potCard.count()) === 0) {
        throw new Error('Could not return to pot list for non-DOT settlement flow');
      }
      await potCard.click();
      await page.waitForTimeout(500);

      await createImbalance(page, 'Smoke imbalance BANK');

      await page.getByRole('button', { name: /expenses/i }).click();
      await page.waitForTimeout(300);

      const settleUpBtn = page.getByRole('button', { name: /settle up/i }).first();
      if ((await settleUpBtn.count()) === 0) {
        throw new Error('Settle Up button not found');
      }
      await settleUpBtn.click();
      await page.waitForTimeout(500);

      const selected = await chooseSettlePerson(page, ['Bob', 'Charlie', 'Alice']);
      await page.waitForTimeout(500);

      const bankMethod = page.getByRole('button', { name: /^bank$/i }).first();
      if ((await bankMethod.count()) === 0) {
        throw new Error('Bank payment method tab not available');
      }
      await bankMethod.click();
      await page.waitForTimeout(250);

      const confirmBank = page.getByRole('button', { name: /mark bank transfer collected/i });
      if ((await confirmBank.count()) === 0) {
        throw new Error('Mark bank transfer collected CTA not available');
      }
      await confirmBank.first().click();
      await page.waitForTimeout(1200);

      if ((await page.getByRole('button', { name: /mark bank transfer collected/i }).count()) > 0) {
        throw new Error('Bank settlement did not complete (still on settle-home)');
      }

      return `Bank settlement executed against ${selected}`;
    }, results);

    const passed = results.filter((r) => r.status === 'PASS').length;
    const failed = results.filter((r) => r.status === 'FAIL').length;

    const lines = [];
    lines.push('# Smoke Test Report - 5 Critical Flows');
    lines.push('');
    lines.push(`- Generated: ${nowIso()}`);
    lines.push(`- App URL: ${APP_URL}`);
    lines.push(`- Auth mode: ${authMode}`);
    lines.push(`- Result: PASS=${passed} FAIL=${failed}`);
    lines.push(`- Run artifacts: ${runDir}`);
    lines.push('');
    lines.push('## Flow Results');
    lines.push('');

    for (const r of results) {
      lines.push(`### ${r.flow}`);
      lines.push(`- Status: ${r.status}`);
      lines.push(`- Detail: ${r.details}`);
      lines.push(`- Screenshot: ${r.screenshot}`);
      lines.push(`- Started: ${r.startedAt}`);
      lines.push(`- Ended: ${r.endedAt}`);
      lines.push('');
    }

    fs.writeFileSync(reportMdPath, lines.join('\n'));
    fs.writeFileSync(path.join(runDir, 'results.json'), JSON.stringify(results, null, 2));

    console.log(`Wrote ${reportMdPath}`);
    console.log(`Wrote ${path.join(runDir, 'results.json')}`);
    console.log(`PASS=${passed} FAIL=${failed}`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
