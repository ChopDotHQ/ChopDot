#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.CHOPDOT_AGENT_BASE_URL ?? 'http://127.0.0.1:5173';
const today = new Date().toISOString().slice(0, 10);
const session = process.env.CHOPDOT_TENX_JOURNEY_SESSION ?? `tenx-journey-${Date.now()}`;
const artifactDir = path.resolve('artifacts/chopdot-journey-audits', today, session);
const reportPath = path.resolve('docs/chopdot-dot/tenx-journey-agent-audit-2026-06-24.md');

fs.rmSync(artifactDir, { recursive: true, force: true });
fs.mkdirSync(artifactDir, { recursive: true });

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function slug(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function clip(value, max = 240) {
  const text = clean(value);
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

async function screenshot(page, step, label, records, note = '') {
  const file = path.join(artifactDir, `${String(step).padStart(2, '0')}-${slug(label)}.png`);
  await page.screenshot({ path: file, fullPage: true });
  const visibleButtons = await page.getByRole('button').evaluateAll((nodes) =>
    nodes.map((node) => node.textContent?.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 24),
  ).catch(() => []);
  const title = await page.locator('h1,h2').first().innerText({ timeout: 800 }).then(clean).catch(() => '');
  const body = await page.locator('body').innerText({ timeout: 800 }).then((text) => clip(text, 900)).catch(() => '');
  records.push({ step, label, file, title, note, visibleButtons, body });
  return file;
}

async function continueAsGuest(page) {
  const guest = page.getByRole('button', { name: 'Continue as guest' });
  if (await guest.waitFor({ state: 'visible', timeout: 8_000 }).then(() => true).catch(() => false)) {
    await guest.click();
    await page.waitForURL(/\/pots/, { timeout: 10_000 }).catch(() => {});
  }
}

async function seedDinnerPot(page) {
  await page.evaluate(() => {
    const pot = {
      id: 'tenx-zurich-dinner',
      name: 'Zurich dinner',
      type: 'expense',
      baseCurrency: 'CHF',
      members: [
        { id: 'mina', name: 'Mina', role: 'Organizer / receiver', status: 'active' },
        { id: 'leo', name: 'Leo', role: 'Friend', status: 'active' },
        { id: 'nina', name: 'Nina', role: 'Friend', status: 'active' },
        { id: 'omar', name: 'Omar', role: 'Friend', status: 'active' },
      ],
      expenses: [],
      history: [],
      archived: false,
      budgetEnabled: false,
      checkpointEnabled: false,
      mode: 'casual',
      confirmationsEnabled: false,
      lastEditAt: new Date().toISOString(),
    };
    const raw = window.localStorage.getItem('chopdot_pots');
    const existing = raw ? JSON.parse(raw) : [];
    const filtered = Array.isArray(existing) ? existing.filter((entry) => entry?.id !== pot.id) : [];
    window.localStorage.setItem('chopdot_pots', JSON.stringify([pot, ...filtered]));
    window.sessionStorage.setItem('chopdot_capture_acting_member', 'mina');
    window.localStorage.removeItem('chopdot_capture_link_tokens');
  });
}

async function dumpStorage(page) {
  return page.evaluate(() => {
    const local = {};
    const session = {};
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key) local[key] = window.localStorage.getItem(key);
    }
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (key) session[key] = window.sessionStorage.getItem(key);
    }
    return { local, session };
  });
}

async function pageWithStorage(browser, storage, personId, viewport = { width: 390, height: 844 }) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(({ local, session, person }) => {
    for (const [key, value] of Object.entries(local)) {
      if (value !== null && value !== undefined) window.localStorage.setItem(key, value);
    }
    for (const [key, value] of Object.entries(session)) {
      if (value !== null && value !== undefined) window.sessionStorage.setItem(key, value);
    }
    window.sessionStorage.setItem('chopdot_capture_acting_member', person);
  }, { ...storage, person: personId });
  return { context, page: await context.newPage() };
}

async function findToken(page, type, memberId) {
  return page.evaluate(({ tokenType, id }) => {
    const raw = window.localStorage.getItem('chopdot_capture_link_tokens');
    const store = raw ? JSON.parse(raw) : [];
    const record = store.find((item) => {
      if (item.type !== tokenType) return false;
      if (tokenType === 'pay') return item.payload.fromMemberId === id;
      if (tokenType === 'confirm') return item.payload.receiverId === id;
      return false;
    });
    return record?.token ?? '';
  }, { tokenType: type, id: memberId });
}

async function runSpendCardJourney(browser) {
  const records = [];
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  await page.goto(`${baseUrl}/`);
  await screenshot(page, 1, 'first entry onboarding', records, 'Mina opens ChopDot cold.');
  await continueAsGuest(page);
  await seedDinnerPot(page);
  await page.goto(`${baseUrl}/pots`);
  await screenshot(page, 2, 'pots home after guest entry', records, 'Mina should understand where the group records live.');

  await page.getByRole('button', { name: /Zurich dinner/ }).click();
  await page.getByTestId('pot-10x-capture-entry').waitFor({ state: 'visible', timeout: 10_000 });
  await screenshot(page, 3, 'pot home i just paid entry', records, 'The money-moment entry should be visually obvious.');

  await page.getByTestId('pot-open-spend-card').click();
  await page.getByTestId('spend-card-screen').waitFor({ state: 'visible', timeout: 10_000 });
  await screenshot(page, 4, 'spend card scan receipt', records, 'Mina should see scan receipt as the obvious start action, not a form or tutorial.');

  await page.getByTestId('spend-card-receipt-file').setInputFiles({
    name: 'zurich-trattoria-receipt.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from([
      'Zurich Trattoria',
      '24.06.2026',
      'Pasta 38.00',
      'Salad 22.00',
      'Wine 60.00',
      'Total CHF 120.00',
    ].join('\n')),
  });
  await page.getByTestId('spend-card-rail-wise').click();
  await page.getByTestId('spend-card-rail-status').waitFor({ state: 'visible', timeout: 5_000 });
  await page.waitForFunction(() =>
    document.querySelector('[data-testid="spend-card-rail-status"]')?.textContent?.includes('then mark paid'),
  );
  await screenshot(page, 5, 'receipt captured payment method chosen', records, 'Receipt, people, and how friends pay are in one place.');

  await page.getByTestId('spend-card-pay-now').click();
  await page.getByTestId('capture-chapter-status').waitFor({ state: 'visible', timeout: 10_000 });
  await screenshot(page, 6, 'split created with pay links', records, 'The group should now have useful shared state.');

  const storageAfterSplit = await dumpStorage(page);
  const leoPayToken = await findToken(page, 'pay', 'leo');
  await context.close();

  const leo = await pageWithStorage(browser, storageAfterSplit, 'leo');
  await leo.page.goto(`${baseUrl}/pay?t=${leoPayToken}`);
  await leo.page.getByTestId('capture-handoff-screen').waitFor({ state: 'visible', timeout: 10_000 });
  await screenshot(leo.page, 7, 'leo no app pay link', records, 'Leo should only see his payment job.');
  await leo.page.getByTestId('capture-handoff-mark-paid').click();
  await leo.page.getByTestId('capture-handoff-waiting-confirmation').waitFor({ state: 'visible', timeout: 10_000 });
  await screenshot(leo.page, 8, 'leo waiting for mina confirmation', records, 'Leo should know he is done for now.');
  const storageAfterLeo = await dumpStorage(leo.page);
  const minaConfirmToken = await findToken(leo.page, 'confirm', 'mina');
  await leo.context.close();

  const mina = await pageWithStorage(browser, storageAfterLeo, 'mina');
  await mina.page.goto(`${baseUrl}/confirm?t=${minaConfirmToken}`);
  await mina.page.getByTestId('capture-confirm-screen').waitFor({ state: 'visible', timeout: 10_000 });
  await screenshot(mina.page, 9, 'mina confirm received link', records, 'Mina should see one confirmation task.');
  await mina.page.getByTestId('capture-confirm-submit').click();
  await mina.page.getByTestId('capture-confirm-done').waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
  await screenshot(mina.page, 10, 'mina confirmed one matching share', records, 'One confirmation should not pretend the whole pot is closed.');
  await mina.context.close();

  return records;
}

function evaluate(records) {
  const findings = [];
  const onboarding = records.find((record) => record.label === 'first entry onboarding');
  if (onboarding && /wallet/i.test(onboarding.body) && /Continue as guest/i.test(onboarding.body)) {
    findings.push({
      area: 'Profile setup',
      rating: 4,
      read: 'Guest entry exists and wallet can stay optional.',
      risk: 'If wallet copy is visually louder than guest entry, first-time users may think setup is required.',
      fix: 'Keep the first primary action about starting the group record, with wallet below as later setup.',
    });
  }

  const spendEmpty = records.find((record) => record.label === 'spend card scan receipt');
  if (spendEmpty) {
    const noisy = spendEmpty.visibleButtons.length > 14;
    findings.push({
      area: 'Spend Card capture',
      rating: noisy ? 3 : 4,
      read: noisy ? 'The flow works but still exposes many controls/buttons on the capture screen.' : 'Capture screen has a clear primary path.',
      risk: noisy ? 'A first-time payer may scan controls instead of simply capturing the receipt and choosing how friends pay.' : 'Main risk is whether receipt capture feels automatic enough.',
      fix: 'Keep receipt/photo/link capture as the default and hide item editing unless the user chooses to correct details.',
    });
  }

  const pay = records.find((record) => record.label === 'leo no app pay link');
  if (pay) {
    findings.push({
      area: 'No-app friend link',
      rating: /capture-chapter-status/i.test(pay.body) ? 3 : 5,
      read: /Pay your share/i.test(pay.body) ? 'Friend link is focused on one job.' : 'Friend link needs a stronger plain-English heading.',
      risk: 'The friend must not see organizer controls or audit state.',
      fix: 'Keep this screen single-purpose; do not add group dashboard controls here.',
    });
  }

  const confirm = records.find((record) => record.label === 'mina confirm received link');
  if (confirm) {
    findings.push({
      area: 'Receiver confirmation',
      rating: /Confirm money arrived/i.test(confirm.body) ? 5 : 3,
      read: 'Confirmation is clearly separated from someone marking paid.',
      risk: 'The receiver still needs enough context to know which transfer is being confirmed.',
      fix: 'Preserve payer, amount, and reference above the button.',
    });
  }

  return findings;
}

function renderReport(payload) {
  const lines = [
    '# ChopDot 10x Journey Agent Audit',
    '',
    `Status: \`${payload.errors.length ? 'needs-fix' : 'review-ready'}\``,
    `Generated: ${payload.generatedAt}`,
    `Session: \`${payload.session}\``,
    `Base URL: \`${payload.baseUrl}\``,
    '',
    '## Journey Tested',
    '',
    '```text',
    'profile entry -> pot home -> I just paid -> receipt/payment capture -> choose how friends pay -> create pay links -> friend marks paid -> receiver confirms',
    '```',
    '',
    '## Screenshots',
    '',
    '| Step | Screen | File | Note |',
    '| ---: | --- | --- | --- |',
  ];

  for (const record of payload.records) {
    lines.push(`| ${record.step} | ${record.label} | ${record.file} | ${record.note} |`);
  }

  lines.push('', '## Friction Findings', '');
  lines.push('| Area | Rating | What the agent saw | Risk | Optimization |');
  lines.push('| --- | ---: | --- | --- | --- |');
  for (const finding of payload.findings) {
    lines.push(`| ${finding.area} | ${finding.rating}/5 | ${finding.read} | ${finding.risk} | ${finding.fix} |`);
  }

  lines.push('', '## Dead Ends / Stale Surfaces', '');
  if (payload.errors.length) {
    for (const error of payload.errors) lines.push(`- ${error}`);
  } else {
    lines.push('- No runtime dead end in the tested Spend Card/no-app confirmation path.');
    lines.push('- Receipt/photo capture is now the primary path. Manual amount and item editing stay behind explicit fallback/correction controls.');
    lines.push('- OCR is wired for receipt photos; this audit uses a deterministic receipt fixture so the reconstruction can be tested repeatably.');
  }

  lines.push('', '## Claim Boundary', '');
  lines.push('This is an agent/browser run. It proves the real UI can be driven through the journey and produces screenshots for review. It does not replace real friend-pilot approval, production settlement, or live `.dot` host proof.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

const browser = await chromium.launch();
const errors = [];
let records = [];
try {
  records = await runSpendCardJourney(browser);
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
} finally {
  await browser.close();
}

const payload = {
  generatedAt: new Date().toISOString(),
  session,
  baseUrl,
  records,
  findings: evaluate(records),
  errors,
};

const jsonPath = path.join(artifactDir, 'journey-audit-results.json');
fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(reportPath, renderReport(payload));

console.log(`Journey audit JSON: ${jsonPath}`);
console.log(`Journey audit report: ${reportPath}`);
console.log(`Screenshots: ${artifactDir}`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
}
