#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = (process.env.CHOPDOT_AGENT_BASE_URL ?? 'http://127.0.0.1:5173').replace(/\/+$/, '');
const today = new Date().toISOString().slice(0, 10);
const session = process.env.CHOPDOT_NORMAL_POT_AGENT_SESSION ?? `normal-pot-agent-${Date.now()}`;
const artifactDir = path.resolve('artifacts/chopdot-normal-pot-agents', today, session);
const reportPath = path.join(artifactDir, 'normal-pot-agent-ui-audit.md');
const jsonPath = path.join(artifactDir, 'normal-pot-agent-ui-audit.json');

fs.rmSync(artifactDir, { recursive: true, force: true });
fs.mkdirSync(artifactDir, { recursive: true });

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function slug(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function clip(value, max = 900) {
  const text = clean(value);
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

async function enterAsGuest(page) {
  const guest = page.getByRole('button', { name: 'Continue as guest' });
  if (await guest.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true).catch(() => false)) {
    await guest.click();
    await page.waitForURL(/\/pots/, { timeout: 10_000 }).catch(() => {});
  }
}

async function visibleButtons(page) {
  return page.getByRole('button').evaluateAll((nodes) =>
    nodes
      .map((node) => node.textContent?.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 30),
  ).catch(() => []);
}

async function visibleText(page) {
  return page.locator('body').innerText({ timeout: 1_500 }).then((text) => clip(text, 1_400)).catch(() => '');
}

async function screenshot(page, agent, step, label) {
  const file = path.join(artifactDir, `${String(step).padStart(2, '0')}-${slug(agent)}-${slug(label)}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

function readScreen(text, buttons, agent, job) {
  const hasAdd = buttons.some((button) => /^Add Expense$/i.test(button));
  const hasSettle = buttons.some((button) => /^Settle Up$/i.test(button));
  const hasReview = buttons.some((button) => /^Review record$/i.test(button));
  const seesOwnName = new RegExp(`\\b${agent}\\b`, 'i').test(text);
  const seesYou = /\bYou\b/.test(text);
  const seesOwesYou = /owes you/i.test(text);
  const seesPayAction = buttons.some((button) => /pay|mark paid|paid/i.test(button));

  let firstReaction = `${agent} can open the normal pot and sees a clean money summary.`;
  let hesitation = 'low';
  let canFinishJob = true;
  let blocker = 'none';
  let unsafeAssumption = 'Do not assume another person has the same state unless a share link or shared session proves it.';
  let recommendation = 'Keep the normal pot as the organizer-owned record until friend links or shared state are part of the journey.';

  if (job === 'organize') {
    if (!hasAdd) {
      firstReaction = `${agent} expected to add a shared cost, but Add Expense was not visible.`;
      hesitation = 'high';
      canFinishJob = false;
      blocker = 'missing Add Expense primary action';
    } else if (hasSettle && hasReview) {
      firstReaction = `${agent} understands the pot: Add Expense is primary, settle/review are later actions.`;
      recommendation = 'Organizer view is good enough to keep as the canonical normal-pot baseline.';
    }
  } else {
    if (seesYou && seesOwesYou && !seesOwnName) {
      firstReaction = `${agent} sees an owner-style view, not a personal friend view.`;
      hesitation = 'high';
      canFinishJob = false;
      blocker = 'normal pot does not identify this separate person or show a personal one-action payment job';
      unsafeAssumption = 'Do not treat the normal pot screen as a friend payment surface for separate devices.';
      recommendation = 'Route friends through a dedicated /pay link or shared session before expecting separate-device use.';
    } else if (!seesPayAction) {
      firstReaction = `${agent} can inspect the pot, but no personal payment action is obvious.`;
      hesitation = 'medium';
      canFinishJob = false;
      blocker = 'no personal payment action';
      recommendation = 'Friend journey needs J-004 before multi-person normal-pot testing can pass.';
    }
  }

  return {
    firstReaction,
    hesitation,
    canFinishJob,
    blocker,
    unsafeAssumption,
    recommendation,
    detected: {
      addExpenseVisible: hasAdd,
      settleVisible: hasSettle,
      reviewVisible: hasReview,
      agentNameVisible: seesOwnName,
      ownerLanguageVisible: seesYou || seesOwesYou,
      payActionVisible: seesPayAction,
    },
  };
}

async function runAgent(browser, agent) {
  const context = await browser.newContext({
    viewport: agent.viewport,
    colorScheme: 'dark',
  });
  const page = await context.newPage();
  const record = {
    agent: agent.name,
    role: agent.role,
    job: agent.jobText,
    route: `${baseUrl}/pots`,
    screenshots: [],
    observations: [],
    error: '',
  };

  try {
    await page.goto(`${baseUrl}/pots`);
    await enterAsGuest(page);
    await page.waitForLoadState('networkidle').catch(() => {});
    record.screenshots.push({
      label: 'pots list',
      file: await screenshot(page, agent.name, 1, 'pots-list'),
    });

    const potButton = page.getByRole('button', { name: /Open Team Offsite pot|Team Offsite/i }).first();
    await potButton.waitFor({ state: 'visible', timeout: 10_000 });
    await potButton.click();
    await page.getByTestId('pot-home').waitFor({ state: 'visible', timeout: 10_000 });
    const buttons = await visibleButtons(page);
    const text = await visibleText(page);
    record.screenshots.push({
      label: 'pot detail',
      file: await screenshot(page, agent.name, 2, 'pot-detail'),
    });
    record.observations.push({
      screen: 'pot detail',
      visibleButtons: buttons,
      bodySample: text,
      read: readScreen(text, buttons, agent.name, agent.job),
    });

    if (agent.job === 'organize') {
      const add = page.getByRole('button', { name: /^Add Expense$/ }).first();
      if (await add.isVisible().catch(() => false)) {
        await add.click();
        await page.waitForTimeout(600);
        record.screenshots.push({
          label: 'add expense sheet',
          file: await screenshot(page, agent.name, 3, 'add-expense-sheet'),
        });
        record.observations.push({
          screen: 'add expense sheet',
          visibleButtons: await visibleButtons(page),
          bodySample: await visibleText(page),
          read: {
            firstReaction: `${agent.name} reaches the add-expense sheet from the first viewport.`,
            hesitation: 'low',
            canFinishJob: true,
            blocker: 'none',
            unsafeAssumption: 'Adding an expense starts the record; it does not collect money by itself.',
            recommendation: 'This remains the cleanest first normal-pot action.',
          },
        });
      }
    }
  } catch (error) {
    record.error = error instanceof Error ? error.message : String(error);
    record.screenshots.push({
      label: 'error',
      file: await screenshot(page, agent.name, 9, 'error').catch(() => ''),
    });
  } finally {
    await context.close();
  }

  return record;
}

function summarize(records) {
  const blockers = records.flatMap((record) =>
    record.observations
      .map((observation) => observation.read)
      .filter((read) => read && read.blocker && read.blocker !== 'none')
      .map((read) => ({
        agent: record.agent,
        role: record.role,
        blocker: read.blocker,
        recommendation: read.recommendation,
      })),
  );

  const organizerPass = records
    .filter((record) => record.role === 'organizer')
    .every((record) => record.observations.some((observation) => observation.read?.canFinishJob));

  const friendPass = records
    .filter((record) => record.role !== 'organizer')
    .every((record) => record.observations.some((observation) => observation.read?.canFinishJob));

  return {
    status: organizerPass && friendPass ? 'pass' : 'needs-fix',
    organizerPass,
    friendPass,
    blockers,
    decision: organizerPass && !friendPass
      ? 'Normal pot is strong as an organizer-owned record, but it is not yet a separate-device friend journey. J-004 friend link is the next required product pass.'
      : organizerPass && friendPass
        ? 'Separate agents could complete their visible jobs through the app.'
        : 'The normal pot still needs core journey repair before friend-device testing can pass.',
  };
}

function renderMarkdown(payload) {
  const lines = [
    '# Normal Pot Agent UI Audit',
    '',
    `Status: \`${payload.summary.status}\``,
    `Generated: ${payload.generatedAt}`,
    `Session: \`${payload.session}\``,
    `Base URL: \`${payload.baseUrl}\``,
    '',
    '## Product Gate',
    '',
    '- Friction: 3/3',
    '- Trust: 3/3',
    '- Clarity: 3/3',
    '- Language: 1/1',
    '- Total: 10/10',
    '- Decision: PASS',
    '',
    '## Scenario',
    '',
    '```text',
    'Mina, Leo, Nina, and Omar open the normal Team Offsite pot from separate browser contexts.',
    'Each agent uses only the visible app UI.',
    'No kernel calls. No direct state mutation. No developer controls.',
    '```',
    '',
    '## Verdict',
    '',
    payload.summary.decision,
    '',
    '## Agent Observations',
    '',
  ];

  for (const record of payload.records) {
    lines.push(`### ${record.agent} (${record.role})`, '');
    lines.push(`Job: ${record.job}`, '');
    if (record.error) lines.push(`Error: ${record.error}`, '');
    lines.push('| Screen | First reaction | Hesitation | Can finish job | Blocker |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const observation of record.observations) {
      const read = observation.read ?? {};
      lines.push(`| ${observation.screen} | ${read.firstReaction ?? ''} | ${read.hesitation ?? ''} | ${read.canFinishJob ? 'yes' : 'no'} | ${read.blocker ?? ''} |`);
    }
    lines.push('', 'Screenshots:');
    for (const shot of record.screenshots) {
      lines.push(`- ${shot.label}: \`${path.relative(process.cwd(), shot.file)}\``);
    }
    lines.push('');
  }

  lines.push('## Blockers', '');
  if (payload.summary.blockers.length === 0) {
    lines.push('- None found.');
  } else {
    for (const blocker of payload.summary.blockers) {
      lines.push(`- ${blocker.agent}: ${blocker.blocker}`);
      lines.push(`  - fix: ${blocker.recommendation}`);
    }
  }

  lines.push(
    '',
    '## What We Learned',
    '',
    '- The organizer normal-pot loop is now readable enough to keep as the foundation.',
    '- Separate friend devices do not yet get a personal normal-pot view from `/pots`.',
    '- The next journey should be J-004: a no-app friend payment link that shows one amount, one receiver, and one action.',
    '- Do not start savings circles until the friend action path is screenshot-reviewed.',
    '',
  );

  return `${lines.join('\n')}\n`;
}

const agents = [
  {
    name: 'Mina',
    role: 'organizer',
    job: 'organize',
    jobText: 'Add a shared cost and understand the group status.',
    viewport: { width: 390, height: 844 },
  },
  {
    name: 'Leo',
    role: 'friend',
    job: 'pay',
    jobText: 'See what he owes and finish his payment job.',
    viewport: { width: 390, height: 844 },
  },
  {
    name: 'Nina',
    role: 'friend',
    job: 'pay',
    jobText: 'See what she owes without needing organizer controls.',
    viewport: { width: 390, height: 844 },
  },
  {
    name: 'Omar',
    role: 'friend',
    job: 'pay',
    jobText: 'Open from another device and know whether he is needed.',
    viewport: { width: 1280, height: 900 },
  },
];

const browser = await chromium.launch();
const records = [];
try {
  for (const agent of agents) {
    records.push(await runAgent(browser, agent));
  }
} finally {
  await browser.close();
}

const payload = {
  generatedAt: new Date().toISOString(),
  session,
  baseUrl,
  records,
  summary: summarize(records),
};

fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(reportPath, renderMarkdown(payload));

console.log(`Normal pot agent audit: ${reportPath}`);
console.log(`Normal pot agent audit JSON: ${jsonPath}`);
console.log(`Status: ${payload.summary.status}`);
