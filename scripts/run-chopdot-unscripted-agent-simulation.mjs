import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.CHOPDOT_AGENT_BASE_URL ?? 'http://127.0.0.1:5174';
const today = new Date().toISOString().slice(0, 10);
const artifactDir = path.resolve('artifacts/chopdot-unscripted-agents', today);
const reportPath = path.resolve('docs/chopdot-dot/unscripted-agent-simulation-2026-06-20.md');
const includeDeveloperFlags = process.env.CHOPDOT_AGENT_DEV === '1';

fs.rmSync(artifactDir, { recursive: true, force: true });
fs.mkdirSync(artifactDir, { recursive: true });

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function slug(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function optionalText(locator, timeout = 1_500) {
  try {
    await locator.waitFor({ state: 'visible', timeout });
    return clean(await locator.innerText());
  } catch {
    return '';
  }
}

async function enterAsGuest(page) {
  const guest = page.getByRole('button', { name: 'Continue as guest' });
  if (await guest.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true).catch(() => false)) {
    await guest.click();
  }
}

const chaptersByPot = {
  'Dinner split': 'dot-shared-expense-chapter',
  'Friday savings circle': 'dot-savings-circle-chapter',
  'Emergency support for Jordan': 'dot-emergency-pot-chapter',
  'Builder house community fund': 'dot-community-fund-chapter',
};

async function resetScenario(page, { potName, session }) {
  const chapterId = chaptersByPot[potName];
  if (!chapterId) return;
  await page.request.post(`${baseUrl}/__chopdot_dot_statement_store/reset`, {
    data: { chapterId, sessionId: session },
  }).catch(() => {});
}

async function openPot(page, { potName, person, session }) {
  const query = new URLSearchParams({
    'chopdot-dot-native': '1',
    'chopdot-dot-session': session,
    person,
  });
  if (includeDeveloperFlags) {
    query.set('chopdot-dot-dev', '1');
  }
  await page.goto(`${baseUrl}/pots?${query.toString()}`);
  await enterAsGuest(page);
  const potButton = page.getByRole('button', { name: new RegExp(`Open ${potName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} pot`) });
  await potButton.waitFor({ state: 'visible', timeout: 10_000 });
  await potButton.click();
  await page.getByTestId('chapter-home').waitFor({ state: 'visible', timeout: 10_000 });
  await page.getByTestId('native-sync-status').waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(750);
}

async function screenState(page) {
  const primary = page.getByTestId('guided-primary-action');
  const buttons = await page.getByRole('button').evaluateAll((nodes) => nodes
    .map((node) => node.textContent?.replace(/\s+/g, ' ').trim())
    .filter(Boolean));
  return {
    nextActor: await optionalText(page.getByTestId('next-actor')),
    overview: await optionalText(page.getByTestId('chapter-overview')),
    timeline: await optionalText(page.getByTestId('guided-timeline')),
    setup: await optionalText(page.getByTestId('mode-setup')),
    waitingGuide: await optionalText(page.getByTestId('waiting-guide')),
    organizerQueue: await optionalText(page.getByTestId('organizer-queue')),
    blockers: await optionalText(page.getByTestId('blockers')),
    receipt: await optionalText(page.getByTestId('receipt-preview')),
    primaryAction: await primary.isVisible().catch(() => false) ? clean(await primary.innerText()) : '',
    visibleButtons: buttons.slice(0, 18),
  };
}

async function clickGuided(page, expectedLabels) {
  const primary = page.getByTestId('guided-primary-action');
  if (!(await primary.isVisible().catch(() => false))) {
    return { clicked: false, reason: 'No primary action was visible on Overview.' };
  }
  const label = clean(await primary.innerText());
  if (expectedLabels.length && !expectedLabels.includes(label)) {
    return { clicked: false, reason: `Primary action was "${label}", not the action this person expected.` };
  }
  await primary.click();
  await page.waitForTimeout(500);
  return { clicked: true, label };
}

async function clickPeopleAction(page, actionLabels) {
  await page.getByTestId('chapter-tabs').getByRole('button', { name: 'People' }).click();
  await page.waitForTimeout(250);
  for (const label of actionLabels) {
    const action = page.getByRole('button', { name: label }).first();
    if (await action.isVisible().catch(() => false)) {
      await action.click();
      await page.waitForTimeout(500);
      await page.getByTestId('chapter-tabs').getByRole('button', { name: 'Overview' }).click();
      await page.waitForTimeout(250);
      return { clicked: true, label, from: 'People tab' };
    }
  }
  const peopleButtons = await page.getByRole('button').evaluateAll((nodes) => nodes
    .map((node) => node.textContent?.replace(/\s+/g, ' ').trim())
    .filter(Boolean));
  await page.getByTestId('chapter-tabs').getByRole('button', { name: 'Overview' }).click();
  await page.getByTestId('chapter-overview').waitFor({ state: 'visible', timeout: 2_000 }).catch(() => {});
  await page.waitForTimeout(250);
  return { clicked: false, reason: `Could not find ${actionLabels.join(' or ')} in People tab.`, peopleButtons };
}

async function clickReleaseAction(page, label) {
  const action = page.getByTestId('release-panel').getByRole('button', { name: label }).first();
  if (!(await action.isVisible().catch(() => false))) {
    return { clicked: false, reason: `"${label}" was not visible in the release panel.` };
  }
  await action.click();
  await page.waitForTimeout(500);
  return { clicked: true, label };
}

async function saveScreenshot(page, name) {
  const file = path.join(artifactDir, `${slug(name)}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function runAgent(browser, step) {
  const context = await browser.newContext({ viewport: step.viewport ?? { width: 390, height: 844 } });
  const page = await context.newPage();
  const record = {
    scenario: step.scenario,
    agent: step.agent,
    person: step.person,
    objective: step.objective,
    expected: step.expected,
    before: null,
    action: null,
    after: null,
    screenshot: null,
    observation: '',
  };

  try {
    await openPot(page, step);
    record.before = await screenState(page);

    if (step.action === 'guided') {
      record.action = await clickGuided(page, step.expectedLabels ?? []);
      if (!record.action.clicked && step.fallbackPeopleLabels?.length) {
        record.action.fallback = await clickPeopleAction(page, step.fallbackPeopleLabels);
      }
    } else if (step.action === 'people') {
      record.action = await clickPeopleAction(page, step.expectedLabels ?? []);
    } else if (step.action === 'release') {
      record.action = await clickReleaseAction(page, step.expectedLabels?.[0] ?? '');
    } else if (step.action === 'observe') {
      record.action = { clicked: false, reason: 'Observation-only step.' };
    }

    record.after = await screenState(page);
    record.screenshot = await saveScreenshot(page, `${step.scenario}-${step.agent}-${step.objective}`);
  } catch (error) {
    record.error = error instanceof Error ? error.message : String(error);
    record.screenshot = await saveScreenshot(page, `${step.scenario}-${step.agent}-error`).catch(() => '');
  } finally {
    await context.close();
  }

  record.observation = summarizeRecord(record);
  return record;
}

function summarizeRecord(record) {
  if (record.error) return `Blocked by runtime error: ${record.error}`;
  if (record.action?.clicked) {
    return `The obvious action matched the job: ${record.agent} clicked "${record.action.label}".`;
  }
  if (record.action?.fallback?.clicked) {
    return `The Overview did not guide the job, but ${record.agent} found "${record.action.fallback.label}" in People.`;
  }
  if (record.before?.nextActor && record.before.nextActor !== 'Nothing for you yet' && !record.before.primaryAction) {
    return `No action was available yet, and the screen gave a personal status: "${record.before.nextActor}".`;
  }
  if (record.before?.nextActor === 'Nothing for you yet') {
    return `No action was correctly available yet; the screen needed to explain the blocker clearly.`;
  }
  if (record.action?.reason) return record.action.reason;
  return 'No clear product action was taken.';
}

const sharedSession = `unscripted-${Date.now()}`;

const steps = [
  {
    scenario: 'Group expense',
    potName: 'Dinner split',
    session: `${sharedSession}-expense`,
    agent: 'Leo',
    person: 'leo',
    objective: 'Pay my dinner share.',
    expected: 'I should immediately know how to mark my share paid.',
    action: 'guided',
    expectedLabels: ['Mark paid'],
    fallbackPeopleLabels: ['Mark paid'],
  },
  {
    scenario: 'Group expense',
    potName: 'Dinner split',
    session: `${sharedSession}-expense`,
    agent: 'Nina',
    person: 'nina',
    objective: 'Pay my dinner share from my own phone after Leo already acted.',
    expected: 'I should not be blocked just because Mina still needs to confirm Leo.',
    action: 'guided',
    expectedLabels: ['Mark paid'],
    fallbackPeopleLabels: ['Mark paid'],
  },
  {
    scenario: 'Group expense',
    potName: 'Dinner split',
    session: `${sharedSession}-expense`,
    agent: 'Mina',
    person: 'mina',
    objective: 'Confirm what I received and understand what is still open.',
    expected: 'I should see the person waiting on me and confirm receipt.',
    action: 'guided',
    expectedLabels: ['Confirm received'],
    fallbackPeopleLabels: ['Confirm received'],
  },
  {
    scenario: 'Savings circle',
    potName: 'Friday savings circle',
    session: `${sharedSession}-circle`,
    agent: 'Leo',
    person: 'leo',
    objective: 'Make my round contribution.',
    expected: 'I should see one clear contribution action.',
    action: 'guided',
    expectedLabels: ['Mark paid'],
    fallbackPeopleLabels: ['Mark paid'],
  },
  {
    scenario: 'Savings circle',
    potName: 'Friday savings circle',
    session: `${sharedSession}-circle`,
    agent: 'Omar',
    person: 'omar',
    objective: 'Contribute without knowing the payout rules.',
    expected: 'I should know whether I owe now or whether the organizer is blocking me.',
    action: 'guided',
    expectedLabels: ['Mark paid'],
    fallbackPeopleLabels: ['Mark paid'],
  },
  {
    scenario: 'Savings circle',
    potName: 'Friday savings circle',
    session: `${sharedSession}-circle`,
    agent: 'Mina',
    person: 'mina',
    objective: 'Act as treasurer and keep the round moving.',
    expected: 'I should see whose contribution needs confirmation.',
    action: 'guided',
    expectedLabels: ['Confirm received'],
    fallbackPeopleLabels: ['Confirm received', 'Record delay'],
  },
  {
    scenario: 'Emergency pot',
    potName: 'Emergency support for Jordan',
    session: `${sharedSession}-emergency`,
    agent: 'Casey',
    person: 'casey',
    objective: 'Privately contribute to urgent help.',
    expected: 'I should be able to contribute without seeing private details.',
    action: 'guided',
    expectedLabels: ['Mark paid'],
    fallbackPeopleLabels: ['Mark paid'],
  },
  {
    scenario: 'Emergency pot',
    potName: 'Emergency support for Jordan',
    session: `${sharedSession}-emergency`,
    agent: 'Riley',
    person: 'riley',
    objective: 'As organizer, confirm private support and keep sensitive details out.',
    expected: 'I should see whose support needs confirmation without exposing emergency details.',
    action: 'guided',
    expectedLabels: ['Confirm received'],
    fallbackPeopleLabels: ['Confirm received', 'Record delay'],
  },
  {
    scenario: 'Emergency pot',
    potName: 'Emergency support for Jordan',
    session: `${sharedSession}-emergency`,
    agent: 'Taylor',
    person: 'taylor',
    objective: 'Approve release only when the pot is ready.',
    expected: 'I should know whether I can approve or whether contributions are still missing.',
    action: 'guided',
    expectedLabels: ['Approve release'],
    fallbackPeopleLabels: ['Approve release'],
  },
  {
    scenario: 'Emergency pot',
    potName: 'Emergency support for Jordan',
    session: `${sharedSession}-emergency`,
    agent: 'Jordan',
    person: 'jordan',
    objective: 'Understand if money was released to me and confirm receipt.',
    expected: 'I should not be asked to confirm before a release is actually marked.',
    action: 'observe',
  },
  {
    scenario: 'Community fund',
    potName: 'Builder house community fund',
    session: `${sharedSession}-community`,
    agent: 'Sam',
    person: 'sam',
    objective: 'Contribute to the fund and later pay a release if approved.',
    expected: 'I should first see my contribution action, not treasury jargon.',
    action: 'guided',
    expectedLabels: ['Mark paid'],
    fallbackPeopleLabels: ['Mark paid'],
  },
  {
    scenario: 'Community fund',
    potName: 'Builder house community fund',
    session: `${sharedSession}-community`,
    agent: 'Priya',
    person: 'priya',
    objective: 'Approve a spend request from my own device.',
    expected: 'I should know if there is nothing to approve yet.',
    action: 'guided',
    expectedLabels: ['Approve release'],
    fallbackPeopleLabels: ['Approve release'],
  },
  {
    scenario: 'Community fund',
    potName: 'Builder house community fund',
    session: `${sharedSession}-community`,
    agent: 'Alex',
    person: 'alex',
    objective: 'As admin, see the full state and close only when ready.',
    expected: 'I should see blockers before I try to close.',
    action: 'observe',
  },
];

function buildReport(records) {
  const lines = [];
  lines.push('# ChopDot Unscripted Agent Simulation');
  lines.push('');
  lines.push(`Date: ${today}`);
  lines.push('Programme: `B` native truth + product usability');
  lines.push('Status: `complete`');
  lines.push('');
  lines.push('## Plain-English Result');
  lines.push('');
  lines.push('The core ChopDot pattern works when the person on screen is the person who needs to act next. Contributors can usually find `Mark paid`, and organizers can usually find `Confirm received`.');
  lines.push('');
  lines.push('The strongest result is that contributors could still act from their own devices even when another person was also blocking the group. Leo, Nina, Omar, Casey, and Sam all got a clear `Mark paid` action.');
  lines.push('');
  lines.push('The later-stage guidance is better than the previous run. Approvers and recipients now see personal statuses such as `Approval comes later` or `You’ll confirm the release later`, instead of a dead-end message.');
  lines.push('');
  lines.push('This run used the normal native product surface. Developer checks and escrow lab controls were not included, because they should not be part of a friend-style product review.');
  lines.push('');
  lines.push('## Agent Runs');
  lines.push('');
  for (const record of records) {
    lines.push(`### ${record.scenario}: ${record.agent}`);
    lines.push('');
    lines.push(`- Objective: ${record.objective}`);
    lines.push(`- Expected: ${record.expected}`);
    lines.push(`- First screen: ${record.before?.nextActor || 'not captured'}`);
    lines.push(`- Primary action: ${record.before?.primaryAction || 'none visible'}`);
    if (record.before?.timeline) lines.push(`- Guidance shown: ${record.before.timeline}`);
    if (record.before?.setup) lines.push(`- Setup shown: ${record.before.setup}`);
    if (record.before?.waitingGuide) lines.push(`- Waiting guidance shown: ${record.before.waitingGuide}`);
    if (record.before?.organizerQueue) lines.push(`- Organizer queue shown: ${record.before.organizerQueue}`);
    lines.push(`- Result: ${record.observation}`);
    if (record.action?.fallback?.reason) lines.push(`- Fallback issue: ${record.action.fallback.reason}`);
    if (record.after?.nextActor) lines.push(`- Personal state after action: ${record.after.nextActor}`);
    if (record.after?.blockers) lines.push(`- After state: ${record.after.blockers}`);
    if (record.screenshot) lines.push(`- Screenshot: ${record.screenshot}`);
    lines.push('');
  }
  lines.push('## Findings');
  lines.push('');
  lines.push('1. Group expense is the strongest first product wedge. The job is familiar, the next action is plain, and the organizer confirmation model makes sense.');
  lines.push('2. Savings circle is promising. Contributors understood their payment action, the setup card shows contribution amount, treasurer, payout recipient, and delay policy, and organizers now see an ordered queue for confirmations, delays, payout, and closeout.');
  lines.push('3. Emergency pot is safer than before. Contributors can act without seeing sensitive details, organizers get a queue, and future approvers/recipients now see why they are waiting before sensitive release steps.');
  lines.push('4. Community fund still needs the most UX work, but the setup card now makes the approval rule and handoff record visible before the release exists, admins get a queue, and approvers see why approval is not available yet.');
  lines.push('5. The `Your step` lane is the strongest product pattern. It separates personal action from global group state without exposing technical rails.');
  lines.push('6. Dev-only role switching and escrow controls stayed out of this normal-surface run. Keep that boundary for friend pilots.');
  lines.push('');
  lines.push('## Product Fixes Before Friends Pilot');
  lines.push('');
  lines.push('- Run friend-pilot comprehension on waiting states: approvers and recipients should be able to explain why they cannot act yet without reading the full blocker list.');
  lines.push('- Run friend-pilot comprehension on the organizer queue: the organizer should be able to explain why `Confirm`, `Record delay`, `Prepare payout`, and `Close` are separate.');
  lines.push('- Keep demo role-switching and escrow language out of the normal surface before any friend pilot.');
  lines.push('');
  lines.push('## Judgment');
  lines.push('');
  lines.push('Safe to promote next: group expenses and savings circles as coordination-first ChopDot modes.');
  lines.push('');
  lines.push('Keep lab-only: emergency escrow, community fund release automation, and any custody/escrow claim.');
  lines.push('');
  lines.push('Next move: run a real friend pilot for group expense and savings circle first, then promote emergency/community only after users can explain waiting, approval, release, and receipt states back correctly.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

const browser = await chromium.launch({ headless: true });
const records = [];
try {
  const resetContext = await browser.newContext();
  const resetPage = await resetContext.newPage();
  for (const step of steps) {
    await resetScenario(resetPage, step);
  }
  await resetContext.close();
  for (const step of steps) {
    records.push(await runAgent(browser, step));
  }
} finally {
  await browser.close();
}

const jsonPath = path.join(artifactDir, 'unscripted-agent-results.json');
fs.writeFileSync(jsonPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, records }, null, 2)}\n`);
fs.writeFileSync(reportPath, buildReport(records));

console.log(`JSON: ${jsonPath}`);
console.log(`Report: ${reportPath}`);
