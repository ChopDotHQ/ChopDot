#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = (process.env.CHOPDOT_AGENT_BASE_URL ?? 'http://127.0.0.1:5173').replace(/\/+$/, '');
const today = new Date().toISOString().slice(0, 10);
const session = process.env.CHOPDOT_P022_SESSION ?? `p022-regular-pot-${Date.now()}`;
const artifactDir = path.resolve('artifacts/chopdot-p022-regular-pot', today, session);
const reportPath = path.join(artifactDir, 'p022-regular-pot-coherence-audit.md');
const jsonPath = path.join(artifactDir, 'p022-regular-pot-coherence-audit.json');
const potId = 'p022-friday-crew';

fs.rmSync(artifactDir, { recursive: true, force: true });
fs.mkdirSync(artifactDir, { recursive: true });

const forbiddenWords = [
  'evidence',
  'rail',
  'claim',
  'kernel',
  'adapter',
  'obligation',
  'chapter',
  'test-token',
  'raw JSON',
  'protocol',
  'settlement',
  'native',
  'host',
  'state machine',
];

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function slug(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function clip(value, max = 1400) {
  const text = clean(value);
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

async function screenshot(page, step, label) {
  const file = path.join(artifactDir, `${String(step).padStart(2, '0')}-${slug(label)}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function bodyText(page, max = 1400) {
  return page.locator('body').innerText({ timeout: 2_000 }).then((text) => clip(text, max)).catch(() => '');
}

async function visibleButtons(page) {
  return page.getByRole('button').evaluateAll((nodes) =>
    nodes
      .map((node) => node.textContent?.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 40),
  ).catch(() => []);
}

function forbiddenIn(text) {
  return forbiddenWords.filter((word) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text));
}

async function continueAsGuest(page) {
  await page.goto(`${baseUrl}/pots`);
  const guest = page.getByRole('button', { name: 'Continue as guest' });
  if (await guest.waitFor({ state: 'visible', timeout: 8_000 }).then(() => true).catch(() => false)) {
    await guest.click();
    await page.waitForURL(/\/pots/, { timeout: 10_000 }).catch(() => {});
  }
}

async function seedEmptyPot(page) {
  await page.evaluate((id) => {
    const now = new Date().toISOString();
    const pot = {
      id,
      name: 'Friday Crew',
      type: 'expense',
      baseCurrency: 'CHF',
      members: [
        { id: 'owner', name: 'Mina', role: 'Owner', status: 'active' },
        { id: 'leo', name: 'Leo', role: 'Member', status: 'active' },
        { id: 'nina', name: 'Nina', role: 'Member', status: 'active' },
      ],
      spendGroup: {
        id: 'sg_friday_crew',
        label: 'Friday Crew',
        memberIds: ['owner', 'leo', 'nina'],
        defaultSplitRule: 'equal',
        preferredPaymentApp: 'twint',
        activePotId: id,
        closedPotIds: [],
      },
      expenses: [],
      history: [],
      closeouts: [],
      archived: false,
      budgetEnabled: false,
      checkpointEnabled: false,
      mode: 'casual',
      confirmationsEnabled: false,
      lastEditAt: now,
    };
    window.localStorage.setItem('chopdot_pots', JSON.stringify([pot]));
    window.localStorage.removeItem('chopdot_capture_link_tokens');
    window.sessionStorage.setItem('chopdot_capture_acting_member', 'owner');
  }, potId);
}

async function storage(page) {
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

async function contextWithStorage(browser, saved, person, viewport = { width: 390, height: 844 }) {
  const context = await browser.newContext({ viewport, colorScheme: 'dark' });
  await context.addInitScript(({ local, session: sessionStorage, actingPerson }) => {
    for (const [key, value] of Object.entries(local)) {
      if (value !== null && value !== undefined) window.localStorage.setItem(key, value);
    }
    for (const [key, value] of Object.entries(sessionStorage)) {
      if (value !== null && value !== undefined) window.sessionStorage.setItem(key, value);
    }
    window.sessionStorage.setItem('chopdot_capture_acting_member', actingPerson);
  }, { ...saved, actingPerson: person });
  return { context, page: await context.newPage() };
}

async function tokenFor(page, type, memberId) {
  return page.evaluate(({ tokenType, id }) => {
    const raw = window.localStorage.getItem('chopdot_capture_link_tokens');
    const records = raw ? JSON.parse(raw) : [];
    const record = records.find((item) => {
      if (item.type !== tokenType || item.consumedAt) return false;
      if (tokenType === 'pay') return item.payload.fromMemberId === id;
      if (tokenType === 'confirm') return item.payload.receiverId === id;
      return false;
    });
    return record?.token ?? '';
  }, { tokenType: type, id: memberId });
}

async function openFridayCrew(page) {
  await page.goto(`${baseUrl}/pots`);
  await page.getByRole('button', { name: /Friday Crew/i }).first().click();
  await page.getByTestId('pot-home').waitFor({ state: 'visible', timeout: 10_000 });
}

async function captureScreen(page, screenshots, step, label, checks = []) {
  const text = await bodyText(page);
  const buttons = await visibleButtons(page);
  const file = await screenshot(page, step, label);
  const forbidden = forbiddenIn(text);
  return {
    step,
    label,
    file,
    text,
    buttons,
    forbidden,
    checks: checks.map((check) => ({
      label: check.label,
      pass: check.pass(text, buttons),
    })),
  };
}

async function markPaidFromLink(browser, saved, memberId, memberName, stepStart, screenshots) {
  const tokenProbe = await contextWithStorage(browser, saved, memberId);
  const tokenPage = tokenProbe.page;
  await tokenPage.goto(`${baseUrl}/pots`);
  const token = await tokenFor(tokenPage, 'pay', memberId);
  await tokenProbe.context.close();
  if (!token) {
    throw new Error(`No pay token for ${memberName}`);
  }

  const { context, page } = await contextWithStorage(browser, saved, memberId);
  await page.goto(`${baseUrl}/pay?t=${token}`);
  await page.getByTestId('capture-handoff-screen').waitFor({ state: 'visible', timeout: 10_000 });
  screenshots.push(await captureScreen(page, screenshots, stepStart, `${memberName} pay link`, [
    { label: `${memberName} sees amount`, pass: (text) => /40\.00 CHF|CHF 40\.00/i.test(text) },
    { label: `${memberName} sees Mina`, pass: (text) => /Mina/i.test(text) },
    { label: 'one mark-paid action', pass: (_text, buttons) => buttons.includes('Mark paid') },
  ]));
  await page.getByTestId('capture-handoff-mark-paid').click();
  await page.getByTestId('capture-handoff-waiting-confirmation').waitFor({ state: 'visible', timeout: 10_000 });
  screenshots.push(await captureScreen(page, screenshots, stepStart + 1, `${memberName} marked paid`, [
    { label: 'waiting state visible', pass: (text) => /Waiting for Mina|Marked paid/i.test(text) },
  ]));
  const nextStorage = await storage(page);
  await context.close();
  return nextStorage;
}

async function confirmFromLink(browser, saved, payerName, stepStart, screenshots) {
  const tokenProbe = await contextWithStorage(browser, saved, 'owner');
  const tokenPage = tokenProbe.page;
  await tokenPage.goto(`${baseUrl}/pots`);
  const token = await tokenFor(tokenPage, 'confirm', 'owner');
  await tokenProbe.context.close();
  if (!token) {
    throw new Error(`No confirm token for ${payerName}`);
  }

  const { context, page } = await contextWithStorage(browser, saved, 'owner');
  await page.goto(`${baseUrl}/confirm?t=${token}`);
  await page.getByTestId('capture-confirm-screen').waitFor({ state: 'visible', timeout: 10_000 });
  screenshots.push(await captureScreen(page, screenshots, stepStart, `Mina confirms ${payerName}`, [
    { label: `Mina sees ${payerName}`, pass: (text) => new RegExp(payerName, 'i').test(text) },
    { label: 'confirm action visible', pass: (_text, buttons) => buttons.includes('Confirm received') },
  ]));
  await page.getByTestId('capture-confirm-submit').click();
  await page.getByTestId('capture-confirm-done').waitFor({ state: 'visible', timeout: 10_000 });
  screenshots.push(await captureScreen(page, screenshots, stepStart + 1, `Mina confirmed ${payerName}`, [
    { label: 'confirmed received state', pass: (text) => /Confirmed received/i.test(text) },
  ]));
  const nextStorage = await storage(page);
  await context.close();
  return nextStorage;
}

function summarize(screenshots, stateChecks, errors = []) {
  const failedChecks = [
    ...screenshots.flatMap((shot) =>
      shot.checks
        .filter((check) => !check.pass)
        .map((check) => `${shot.label}: ${check.label}`),
    ),
    ...stateChecks.filter((check) => !check.pass).map((check) => check.label),
  ];
  const forbidden = screenshots.flatMap((shot) => shot.forbidden.map((word) => `${shot.label}: ${word}`));
  const status = errors.length || failedChecks.length || forbidden.length ? 'needs-fix' : 'pass';
  return {
    status,
    failedChecks,
    forbidden,
    errors,
  };
}

function renderReport(payload) {
  const lines = [
    '# P-022 Regular Pot Coherence Audit',
    '',
    `Status: \`${payload.summary.status}\``,
    `Generated: ${payload.generatedAt}`,
    `Session: \`${payload.session}\``,
    `Base URL: \`${payload.baseUrl}\``,
    '',
    '## User Journey',
    '',
    '"I am Mina, I am using a regular pot for dinner, so I need to add costs, split/pay, confirm received money, and close the record without wondering which flow I am in."',
    '',
    '## Transport Note',
    '',
    'The app is local-storage based in this pass. The runner copies browser storage between Mina, Leo, and Nina contexts to simulate shared session transport, while every product action is performed through the visible app UI.',
    '',
    '## Screenshots',
    '',
    '| Step | Screen | File |',
    '| --- | --- | --- |',
  ];
  for (const shot of payload.screenshots) {
    lines.push(`| ${shot.step} | ${shot.label} | \`${path.relative(process.cwd(), shot.file)}\` |`);
  }
  lines.push('', '## Checks', '');
  for (const shot of payload.screenshots) {
    lines.push(`### ${shot.step}. ${shot.label}`);
    for (const check of shot.checks) {
      lines.push(`- ${check.pass ? 'PASS' : 'FAIL'}: ${check.label}`);
    }
    if (shot.forbidden.length) {
      lines.push(`- FAIL: forbidden words visible: ${shot.forbidden.join(', ')}`);
    }
    lines.push('');
  }
  lines.push('## State Checks', '');
  for (const check of payload.stateChecks) {
    lines.push(`- ${check.pass ? 'PASS' : 'FAIL'}: ${check.label}`);
  }
  lines.push('', '## Result', '');
  if (payload.summary.status === 'pass') {
    lines.push('The regular pot journey works as one coherent flow: Mina can add a cost, split a payment, friends mark paid from simple links, Mina confirms received money, and the record can be saved.');
  } else {
    lines.push('The regular pot journey still has gaps before it should be considered coherent.');
  }
  if (payload.summary.failedChecks.length) {
    lines.push('', 'Failed checks:', ...payload.summary.failedChecks.map((item) => `- ${item}`));
  }
  if (payload.summary.forbidden.length) {
    lines.push('', 'Forbidden language:', ...payload.summary.forbidden.map((item) => `- ${item}`));
  }
  if (payload.summary.errors.length) {
    lines.push('', 'Errors:', ...payload.summary.errors.map((item) => `- ${item}`));
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

const browser = await chromium.launch();
const screenshots = [];
const stateChecks = [];
const errors = [];

try {
  const minaContext = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
  const mina = await minaContext.newPage();
  await continueAsGuest(mina);
  await seedEmptyPot(mina);
  await mina.reload();
  await mina.goto(`${baseUrl}/pots`);
  await mina.getByRole('button', { name: /Friday Crew/i }).first().waitFor({ state: 'visible', timeout: 10_000 });
  await mina.waitForTimeout(350);
  screenshots.push(await captureScreen(mina, screenshots, 1, 'pots list', [
    { label: 'Friday Crew visible', pass: (text, buttons) => /Friday Crew/i.test(text) || buttons.some((button) => /Friday Crew/i.test(button)) },
  ]));

  await openFridayCrew(mina);
  screenshots.push(await captureScreen(mina, screenshots, 2, 'pot before first cost', [
    { label: 'normal pot title visible', pass: (text) => /Friday Crew/i.test(text) },
    { label: 'split payment shortcut visible', pass: (text) => /Split this payment/i.test(text) },
    { label: 'add first cost visible', pass: (text) => /No expenses yet|Add the first shared cost/i.test(text) },
  ]));

  await mina.getByRole('button', { name: /No expenses yet|Add Expense/i }).first().click();
  await mina.getByPlaceholder(/0\.00|0\.000000/).first().fill('90');
  await mina.getByPlaceholder('Dinner, taxi, tickets').fill('Apero');
  screenshots.push(await captureScreen(mina, screenshots, 3, 'add expense sheet', [
    { label: 'amount entered', pass: (text) => /90|CHF/i.test(text) },
    { label: 'save action visible', pass: (_text, buttons) => buttons.some((button) => /^Save/.test(button)) },
  ]));
  await mina.getByRole('button', { name: /^Save/ }).last().click();
  await mina.getByText('Apero').waitFor({ state: 'visible', timeout: 10_000 });
  screenshots.push(await captureScreen(mina, screenshots, 4, 'pot after first cost', [
    { label: 'Apero still visible', pass: (text) => /Apero/i.test(text) },
    { label: '90 CHF visible', pass: (text) => /90\.00 CHF|CHF 90\.00/i.test(text) },
  ]));

  await mina.getByTestId('pot-open-spend-card').click();
  await mina.getByTestId('spend-card-screen').waitFor({ state: 'visible', timeout: 10_000 });
  screenshots.push(await captureScreen(mina, screenshots, 5, 'split payment start', [
    { label: 'capture entry visible', pass: (text) => /Add receipt|Split this payment/i.test(text) },
    { label: 'TWINT visible', pass: (text) => /TWINT/i.test(text) },
  ]));
  await mina.getByTestId('spend-card-enter-total').click();
  await mina.getByTestId('spend-card-quick-amount').waitFor({ state: 'visible', timeout: 10_000 });
  await mina.getByTestId('spend-card-quick-amount').fill('120');
  await mina.getByTestId('spend-card-quick-memo').fill('Dinner');
  await mina.getByTestId('spend-card-pay-now').click();
  await mina.getByTestId('spend-card-created-summary').waitFor({ state: 'visible', timeout: 10_000 });
  screenshots.push(await captureScreen(mina, screenshots, 6, 'split payment created', [
    { label: 'payment links ready', pass: (text) => /Payment links|Send to Leo and Nina|Pay links/i.test(text) },
    { label: 'open shares visible', pass: (text) => /open/i.test(text) },
  ]));
  let shared = await storage(mina);
  await minaContext.close();

  shared = await markPaidFromLink(browser, shared, 'leo', 'Leo', 7, screenshots);
  shared = await confirmFromLink(browser, shared, 'Leo', 9, screenshots);
  shared = await markPaidFromLink(browser, shared, 'nina', 'Nina', 11, screenshots);
  shared = await confirmFromLink(browser, shared, 'Nina', 13, screenshots);

  const minaReturn = await contextWithStorage(browser, shared, 'owner');
  const returnPage = minaReturn.page;
  await openFridayCrew(returnPage);
  await returnPage.waitForTimeout(500);
  screenshots.push(await captureScreen(returnPage, screenshots, 15, 'pot after confirmations', [
    { label: 'Apero still visible after capture flow', pass: (text) => /Apero/i.test(text) },
    { label: 'Dinner visible after capture flow', pass: (text) => /Dinner/i.test(text) },
    { label: 'paid dinner no longer counted as open', pass: (text) => /60(?:\.00)?\s+open|Still open\s+60/i.test(text) },
    { label: 'close or review action visible', pass: (_text, buttons) => buttons.some((button) => /Close record|Review record/i.test(button)) },
  ]));

  const closeButton = returnPage.getByRole('button', { name: /Close record|Review record/ }).first();
  await closeButton.click();
  await returnPage.getByTestId('closeout-review-screen').waitFor({ state: 'visible', timeout: 10_000 });
  screenshots.push(await captureScreen(returnPage, screenshots, 16, 'close record review', [
    { label: 'close review visible', pass: (text) => /Check what will be saved|Still open|Confirmed/i.test(text) },
    { label: 'close review shows remaining Apero shares only', pass: (text) => /30\.00/i.test(text) && !/40\.00/i.test(text) },
    { label: 'close action visible', pass: (_text, buttons) => buttons.some((button) => /Close record|Close with note|Add note to close/i.test(button)) },
  ]));
  const note = returnPage.getByTestId('closeout-annotation');
  if (await note.isVisible().catch(() => false)) {
    await note.fill('Leo and Nina paid back through the shared payment links.');
  }
  await returnPage.getByTestId('closeout-confirm').click();
  await returnPage.getByTestId('pot-home').waitFor({ state: 'visible', timeout: 10_000 });
  await returnPage.getByTestId('pot-home').getByText('Record saved').first().waitFor({ state: 'visible', timeout: 10_000 });
  screenshots.push(await captureScreen(returnPage, screenshots, 17, 'saved record', [
    { label: 'record saved visible', pass: (text) => /Record saved/i.test(text) },
    { label: 'open saved record is not labeled closed', pass: (text) => !/Record saved\s+2 still open\s+Closed/i.test(text) },
    { label: 'saved note visible if needed', pass: (text) => /paid back|Ready for history|still open/i.test(text) },
  ]));

  const potsRaw = await returnPage.evaluate(() => window.localStorage.getItem('chopdot_pots'));
  const pots = potsRaw ? JSON.parse(potsRaw) : [];
  const pot = pots.find((item) => item.id === potId);
  stateChecks.push({
    label: 'normal add expense survived capture projection',
    pass: Boolean(pot?.expenses?.some((expense) => /Apero/i.test(expense.memo ?? ''))),
  });
  stateChecks.push({
    label: 'payment moment expense exists in normal pot',
    pass: Boolean(pot?.expenses?.some((expense) => /Dinner/i.test(expense.memo ?? ''))),
  });
  stateChecks.push({
    label: 'saved record stored on pot',
    pass: Boolean(pot?.closeouts?.length),
  });
  await minaReturn.context.close();
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
} finally {
  await browser.close();
}

const summary = summarize(screenshots, stateChecks, errors);
const payload = {
  generatedAt: new Date().toISOString(),
  session,
  baseUrl,
  screenshots,
  stateChecks,
  summary,
};

fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(reportPath, renderReport(payload));
console.log(`P-022 audit: ${reportPath}`);
console.log(`P-022 audit JSON: ${jsonPath}`);
console.log(`Status: ${summary.status}`);
if (summary.status !== 'pass') {
  process.exitCode = 1;
}
