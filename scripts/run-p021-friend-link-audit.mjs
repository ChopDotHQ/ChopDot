#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = (process.env.CHOPDOT_AGENT_BASE_URL ?? 'http://127.0.0.1:5173').replace(/\/+$/, '');
const setupUrl = `${baseUrl}/pots?chopdot-experimental=1`;
const today = new Date().toISOString().slice(0, 10);
const session = process.env.CHOPDOT_P021_SESSION ?? `p021-friend-link-${Date.now()}`;
const artifactDir = path.resolve('artifacts/chopdot-p021-friend-link', today, session);
const reportPath = path.join(artifactDir, 'p021-friend-link-audit.md');
const jsonPath = path.join(artifactDir, 'p021-friend-link-audit.json');
const potId = 'p021-friday-crew';

fs.rmSync(artifactDir, { recursive: true, force: true });
fs.mkdirSync(artifactDir, { recursive: true });

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function slug(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function clip(value, max = 1200) {
  const text = clean(value);
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

async function screenshot(page, step, label) {
  const file = path.join(artifactDir, `${String(step).padStart(2, '0')}-${slug(label)}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function bodyText(page) {
  return page.locator('body').innerText({ timeout: 1_500 }).then((text) => clip(text)).catch(() => '');
}

async function visibleButtons(page) {
  return page.getByRole('button').evaluateAll((nodes) =>
    nodes
      .map((node) => node.textContent?.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 30),
  ).catch(() => []);
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
      lastEditAt: new Date().toISOString(),
    };
    window.localStorage.setItem('chopdot_pots', JSON.stringify([pot]));
    window.localStorage.removeItem('chopdot_capture_link_tokens');
    window.sessionStorage.setItem('chopdot_capture_acting_member', 'owner');
  }, potId);
}

async function seedOpenFriendPayment(page) {
  await page.evaluate((id) => {
    const now = new Date().toISOString();
    const chapterId = `chapter_${id}`;
    const leoLegId = 'leg_leo_to_mina';
    const chapter = {
      schemaVersion: '0.2.0',
      id: chapterId,
      name: 'Friday Crew',
      currency: 'CHF',
      chapterState: 'open',
      potId: id,
      members: [
        { id: 'owner', name: 'Mina' },
        { id: 'leo', name: 'Leo' },
        { id: 'nina', name: 'Nina' },
      ],
      expenses: [
        {
          id: 'exp_dinner_zurich',
          amount: 120,
          currency: 'CHF',
          paidBy: 'owner',
          memo: 'Dinner',
          createdAt: now,
          splitMemberIds: ['owner', 'leo', 'nina'],
          source: 'spend_card',
        },
      ],
      legs: [
        {
          id: leoLegId,
          fromMemberId: 'leo',
          toMemberId: 'owner',
          amount: 40,
          currency: 'CHF',
          state: 'open',
        },
        {
          id: 'leg_nina_to_mina',
          fromMemberId: 'nina',
          toMemberId: 'owner',
          amount: 40,
          currency: 'CHF',
          state: 'open',
        },
      ],
      spendCards: [
        {
          id: 'sc_friday_crew',
          label: 'Friday Crew',
          recentParticipantIds: ['owner', 'leo', 'nina'],
          settlementPreference: 'twint',
          defaultSplitRule: 'equal',
        },
      ],
      createdAt: now,
    };
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
      expenses: [
        {
          id: 'exp_dinner_zurich',
          amount: 120,
          currency: 'CHF',
          paidBy: 'owner',
          memo: 'Dinner',
          date: now,
          split: [
            { memberId: 'owner', amount: 40 },
            { memberId: 'leo', amount: 40 },
            { memberId: 'nina', amount: 40 },
          ],
          attestations: [],
          hasReceipt: false,
        },
      ],
      history: [],
      archived: false,
      budgetEnabled: false,
      checkpointEnabled: false,
      mode: 'auditable',
      confirmationsEnabled: true,
      chapter,
      lastEditAt: now,
    };
    const payToken = `cap_p021_pay_leo_${Date.now()}`;
    window.localStorage.setItem('chopdot_pots', JSON.stringify([pot]));
    window.localStorage.setItem(
      'chopdot_capture_link_tokens',
      JSON.stringify([
        {
          token: payToken,
          type: 'pay',
          payload: {
            chapterId,
            potId: id,
            legId: leoLegId,
            fromMemberId: 'leo',
            toMemberId: 'owner',
            toMemberName: 'Mina',
            amount: 40,
            currency: 'CHF',
            exp: Date.now() + 60 * 60 * 1000,
          },
        },
      ]),
    );
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
      if (item.type !== tokenType) return false;
      if (tokenType === 'pay') return item.payload.fromMemberId === id;
      if (tokenType === 'confirm') return item.payload.receiverId === id;
      return false;
    });
    return record?.token ?? '';
  }, { tokenType: type, id: memberId });
}

function evaluateLeo(text, buttons) {
  const forbidden = ['evidence', 'rail', 'claim', 'kernel', 'adapter', 'obligation', 'chapter', 'test-token', 'raw JSON', 'protocol', 'settlement', 'native', 'host', 'state machine']
    .filter((word) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text));
  const hasAmount = /40\.00 CHF|CHF 40\.00/i.test(text);
  const hasReceiver = /Mina/i.test(text);
  const hasPrimary = buttons.includes('Mark paid');
  const hasFullPotChrome = /Expenses Members Settings|Add Expense|Settle Up|Review record/i.test(text);
  const setupPressure = /sign in|wallet|create account/i.test(text);
  return {
    pass: hasAmount && hasReceiver && hasPrimary && !hasFullPotChrome && !setupPressure && forbidden.length === 0,
    hasAmount,
    hasReceiver,
    hasPrimary,
    hasFullPotChrome,
    setupPressure,
    forbidden,
  };
}

function renderReport(payload) {
  const leo = payload.leoCheck ?? {};
  const forbidden = Array.isArray(leo.forbidden) ? leo.forbidden : [];
  const lines = [
    '# P-021 Friend Link Audit',
    '',
    `Status: \`${payload.status}\``,
    `Generated: ${payload.generatedAt}`,
    `Session: \`${payload.session}\``,
    `Base URL: \`${payload.baseUrl}\``,
    '',
    '## User Journey',
    '',
    '"I am Leo, Mina sent me a ChopDot link, so I need to know what I owe and pay without setting up an account first."',
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
    '## Leo Screen Check',
    '',
    `- amount visible: ${leo.hasAmount ? 'yes' : 'no'}`,
    `- receiver visible: ${leo.hasReceiver ? 'yes' : 'no'}`,
    `- one primary action: ${leo.hasPrimary ? 'yes' : 'no'}`,
    `- full pot chrome hidden: ${leo.hasFullPotChrome ? 'no' : 'yes'}`,
    `- setup pressure absent: ${leo.setupPressure ? 'no' : 'yes'}`,
    `- forbidden words: ${forbidden.length ? forbidden.join(', ') : 'none'}`,
    '',
    '## Result',
    '',
    payload.status === 'pass'
      ? 'Leo can use the friend link as a one-action payment screen, then Mina can confirm the matching item separately.'
      : 'The friend link still needs product cleanup before it can be promoted.',
    '',
  );
  return `${lines.join('\n')}\n`;
}

const browser = await chromium.launch();
const screenshots = [];
let leoCheck = {};
let status = 'needs-fix';
try {
  const minaContext = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
  const mina = await minaContext.newPage();
  await continueAsGuest(mina);
  await seedOpenFriendPayment(mina);
  await mina.reload();
  const savedAfterSplit = await storage(mina);
  const leoPayToken = await tokenFor(mina, 'pay', 'leo');
  await minaContext.close();

  if (!leoPayToken) {
    throw new Error('No generated Leo pay token found after split creation.');
  }

  const leoContext = await contextWithStorage(browser, savedAfterSplit, 'leo');
  const leo = leoContext.page;
  await leo.goto(`${baseUrl}/pay?t=${leoPayToken}`);
  await leo.getByTestId('capture-handoff-screen').waitFor({ state: 'visible', timeout: 10_000 });
  const leoTextBefore = await bodyText(leo);
  const leoButtonsBefore = await visibleButtons(leo);
  leoCheck = evaluateLeo(leoTextBefore, leoButtonsBefore);
  screenshots.push({ step: 1, label: 'Leo pay link', file: await screenshot(leo, 1, 'leo-pay-link') });
  await leo.getByTestId('capture-handoff-mark-paid').click();
  await leo.getByTestId('capture-handoff-waiting-confirmation').waitFor({ state: 'visible', timeout: 10_000 });
  screenshots.push({ step: 2, label: 'Leo done for now', file: await screenshot(leo, 2, 'leo-done-for-now') });
  const savedAfterLeo = await storage(leo);
  const confirmToken = await tokenFor(leo, 'confirm', 'owner');
  await leoContext.context.close();

  if (!confirmToken) {
    throw new Error('No generated Mina confirm token found after Leo marked paid.');
  }

  const confirmContext = await contextWithStorage(browser, savedAfterLeo, 'owner');
  const confirm = confirmContext.page;
  await confirm.goto(`${baseUrl}/confirm?t=${confirmToken}`);
  await confirm.getByTestId('capture-confirm-screen').waitFor({ state: 'visible', timeout: 10_000 });
  screenshots.push({ step: 3, label: 'Mina confirm link', file: await screenshot(confirm, 3, 'mina-confirm-link') });
  await confirm.getByTestId('capture-confirm-submit').click();
  await confirm.getByTestId('capture-confirm-done').waitFor({ state: 'visible', timeout: 10_000 });
  screenshots.push({ step: 4, label: 'Mina confirmed received', file: await screenshot(confirm, 4, 'mina-confirmed-received') });
  await confirmContext.context.close();

  status = leoCheck.pass ? 'pass' : 'needs-fix';
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
  leoCheck,
  screenshots,
};

fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(reportPath, renderReport(payload));
console.log(`P-021 audit: ${reportPath}`);
console.log(`P-021 audit JSON: ${jsonPath}`);
console.log(`Status: ${status}`);
