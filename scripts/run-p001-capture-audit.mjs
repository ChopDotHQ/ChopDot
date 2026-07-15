#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = (process.env.CHOPDOT_AGENT_BASE_URL ?? 'http://127.0.0.1:5173').replace(/\/+$/, '');
const today = new Date().toISOString().slice(0, 10);
const session = process.env.CHOPDOT_P001_SESSION ?? `p001-capture-${Date.now()}`;
const artifactDir = path.resolve('artifacts/chopdot-p001-capture', today, session);
const reportPath = path.join(artifactDir, 'p001-capture-audit.md');
const jsonPath = path.join(artifactDir, 'p001-capture-audit.json');
const potId = 'p001-friday-crew';

fs.rmSync(artifactDir, { recursive: true, force: true });
fs.mkdirSync(artifactDir, { recursive: true });

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function slug(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function screenshot(page, step, label) {
  const file = path.join(artifactDir, `${String(step).padStart(2, '0')}-${slug(label)}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function continueAsGuest(page) {
  await page.goto(`${baseUrl}/pots`);
  const guest = page.getByRole('button', { name: 'Continue as guest' });
  if (await guest.waitFor({ state: 'visible', timeout: 8_000 }).then(() => true).catch(() => false)) {
    await guest.click();
    await page.waitForURL(/\/pots/, { timeout: 10_000 }).catch(() => {});
  }
}

async function seedCapturePot(page) {
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

async function bodyText(page) {
  return page.locator('body').innerText({ timeout: 1_500 }).then(clean).catch(() => '');
}

async function visibleButtons(page) {
  return page.getByRole('button').evaluateAll((nodes) =>
    nodes
      .map((node) => node.textContent?.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 30),
  ).catch(() => []);
}

function evaluateCapture(text, buttons, manualItemCount) {
  const forbidden = ['evidence', 'rail', 'claim', 'kernel', 'adapter', 'obligation', 'chapter', 'test-token', 'raw JSON', 'protocol', 'settlement', 'native', 'host', 'state machine']
    .filter((word) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text));
  return {
    hasPrimary: buttons.includes('Split this payment'),
    hasGroup: /Friday Crew/i.test(text),
    hasFriends: /Leo|Nina/i.test(text),
    hasPaymentApp: /TWINT/i.test(text),
    manualItemsHidden: manualItemCount === 0,
    forbidden,
    pass: buttons.includes('Split this payment') && /Friday Crew/i.test(text) && /Leo|Nina/i.test(text) && manualItemCount === 0 && forbidden.length === 0,
  };
}

function renderReport(payload) {
  const check = payload.captureCheck ?? {};
  const forbidden = Array.isArray(check.forbidden) ? check.forbidden : [];
  const lines = [
    '# P-001 Capture Audit',
    '',
    `Status: \`${payload.status}\``,
    `Generated: ${payload.generatedAt}`,
    `Session: \`${payload.session}\``,
    `Base URL: \`${payload.baseUrl}\``,
    '',
    '## User Journey',
    '',
    '"I am Mina, I just paid CHF 120 for dinner in Zurich, so I need ChopDot to capture the moment and give Leo and Nina one clear way to pay me back."',
    '',
    '## Screenshots',
    '',
    '| Step | Screen | File |',
    '| --- | --- | --- |',
  ];
  for (const shot of payload.screenshots) {
    const file = shot.file ? `\`${path.relative(process.cwd(), shot.file)}\`` : 'n/a';
    lines.push(`| ${shot.step} | ${shot.label} | ${file} |`);
  }
  lines.push(
    '',
    '## Capture Screen Check',
    '',
    `- primary action visible: ${check.hasPrimary ? 'yes' : 'no'}`,
    `- group visible: ${check.hasGroup ? 'yes' : 'no'}`,
    `- friends visible: ${check.hasFriends ? 'yes' : 'no'}`,
    `- payment app visible: ${check.hasPaymentApp ? 'yes' : 'no'}`,
    `- manual item entry hidden before capture: ${check.manualItemsHidden ? 'yes' : 'no'}`,
    `- forbidden words: ${forbidden.length ? forbidden.join(', ') : 'none'}`,
    '',
    '## Result',
    '',
    payload.status === 'pass'
      ? 'Mina can start from the payment moment, split the amount, and create friend payment actions without manual item entry.'
      : 'The capture moment still needs product cleanup before it can be promoted.',
    '',
  );
  return `${lines.join('\n')}\n`;
}

const browser = await chromium.launch();
const screenshots = [];
let status = 'needs-fix';
let captureCheck = {};

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await continueAsGuest(page);
  await seedCapturePot(page);
  await page.reload();
  await page.goto(`${baseUrl}/pots`);
  await page.getByRole('button', { name: /Friday Crew/ }).click();
  await page.getByTestId('pot-open-spend-card').waitFor({ state: 'visible', timeout: 10_000 });
  screenshots.push({ step: 1, label: 'Pot capture entry', file: await screenshot(page, 1, 'pot-capture-entry') });
  await page.getByTestId('pot-open-spend-card').click();
  await page.getByTestId('spend-card-screen').waitFor({ state: 'visible', timeout: 10_000 });
  await page.getByTestId('spend-card-quick-amount').waitFor({ state: 'visible', timeout: 10_000 });

  const textBefore = await bodyText(page);
  const buttonsBefore = await visibleButtons(page);
  const manualItemCount = await page.getByTestId('receipt-item-add').count();
  captureCheck = evaluateCapture(textBefore, buttonsBefore, manualItemCount);
  screenshots.push({ step: 2, label: 'Mina capture start', file: await screenshot(page, 2, 'mina-capture-start') });

  await page.getByTestId('spend-card-quick-memo').fill('Dinner');
  await page.getByTestId('spend-card-quick-amount').fill('120');
  await page.getByTestId('spend-card-pay-now').click();
  await page.getByTestId('capture-chapter-status').waitFor({ state: 'visible', timeout: 10_000 });
  screenshots.push({ step: 3, label: 'Split created', file: await screenshot(page, 3, 'split-created') });

  status = captureCheck.pass ? 'pass' : 'needs-fix';
  await context.close();
} catch (error) {
  status = 'error';
  screenshots.push({ step: 99, label: `error ${error instanceof Error ? error.message : String(error)}`, file: '' });
} finally {
  await browser.close();
}

const payload = {
  generatedAt: new Date().toISOString(),
  session,
  baseUrl,
  status,
  captureCheck,
  screenshots,
};

fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(reportPath, renderReport(payload));
console.log(`P-001 audit: ${reportPath}`);
console.log(`P-001 audit JSON: ${jsonPath}`);
console.log(`Status: ${status}`);
