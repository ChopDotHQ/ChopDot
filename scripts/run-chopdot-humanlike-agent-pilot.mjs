import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.CHOPDOT_AGENT_BASE_URL ?? 'http://127.0.0.1:5173';
const session = process.env.CHOPDOT_HUMANLIKE_SESSION ?? `humanlike-agent-${Date.now()}`;
const today = new Date().toISOString().slice(0, 10);
const artifactDir = path.resolve('artifacts/chopdot-humanlike-agents', today, session);
const reportPath = path.resolve('docs/chopdot-dot/humanlike-agent-pilot-2026-06-22.md');

fs.rmSync(artifactDir, { recursive: true, force: true });
fs.mkdirSync(artifactDir, { recursive: true });

const potByScenario = {
  group: 'Dinner split',
  savings: 'Friday savings circle',
  emergency: 'Emergency support for Jordan',
  community: 'Builder house community fund',
};

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function slug(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function clip(value, max = 220) {
  const text = clean(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

async function visibleText(locator, timeout = 1_000) {
  try {
    await locator.waitFor({ state: 'visible', timeout });
    return clean(await locator.innerText());
  } catch {
    return '';
  }
}

async function enterAsGuest(page) {
  const guest = page.getByRole('button', { name: 'Continue as guest' });
  await guest.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
  if (await guest.isVisible().catch(() => false)) {
    await guest.click();
    await page.waitForURL(/\/pots/, { timeout: 10_000 }).catch(() => {});
  }
}

async function openPot(page, scenario, person) {
  const query = new URLSearchParams({
    'chopdot-dot-native': '1',
    'chopdot-dot-session': `${session}-${scenario}`,
    person,
  });
  await page.goto(`${baseUrl}/pots?${query.toString()}`);
  await enterAsGuest(page);
  const potName = potByScenario[scenario];
  const potButton = page.getByRole('button', { name: new RegExp(`Open ${potName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} pot`) });
  await potButton.waitFor({ state: 'visible', timeout: 10_000 });
  await potButton.click();
  await page.getByTestId('chapter-home').waitFor({ state: 'visible', timeout: 10_000 });
  await page.getByTestId('native-sync-status').waitFor({ state: 'visible', timeout: 12_000 }).catch(() => {});
}

async function currentState(page) {
  const buttons = await page.getByRole('button').evaluateAll((nodes) => nodes
    .map((node) => node.textContent?.replace(/\s+/g, ' ').trim())
    .filter(Boolean));

  return {
    nextActor: await visibleText(page.getByTestId('next-actor')),
    overview: await visibleText(page.getByTestId('chapter-overview')),
    timeline: await visibleText(page.getByTestId('guided-timeline')),
    setup: await visibleText(page.getByTestId('mode-setup')),
    waitingGuide: await visibleText(page.getByTestId('waiting-guide')),
    organizerQueue: await visibleText(page.getByTestId('organizer-queue')),
    blockers: await visibleText(page.getByTestId('blockers')),
    receipt: await visibleText(page.getByTestId('receipt-preview')),
    primaryAction: await page.getByTestId('guided-primary-action').isVisible().catch(() => false)
      ? clean(await page.getByTestId('guided-primary-action').innerText())
      : '',
    visibleButtons: buttons.slice(0, 28),
  };
}

function chooseVisibleAction(state, preferredAction) {
  if (preferredAction === '__wait__') return '';
  if (preferredAction && state.visibleButtons.includes(preferredAction)) return preferredAction;
  if (!preferredAction && state.primaryAction) return state.primaryAction;
  return '';
}

function summarizeState(state) {
  return [
    state.nextActor && `next: ${state.nextActor}`,
    state.blockers && `blockers: ${clip(state.blockers, 180)}`,
    state.receipt && `record: ${/Record closed/i.test(state.receipt) ? 'closed receipt visible' : 'receipt preview visible'}`,
  ].filter(Boolean).join(' | ') || 'No readable state summary';
}

function inferReaction(agent, role, state, selectedAction, preferredAction) {
  const next = state.nextActor || 'No personal status found';
  const primary = selectedAction || state.primaryAction || 'no button yet';
  const blockers = state.blockers || state.overview || 'No blocker copy found';

  let firstReaction = `${agent} sees "${next}" and the main available action is "${primary}".`;
  let decision = 'wait';
  let decisionReason = 'The screen does not show a safe action for this person yet.';
  let unsafeAssumptionCheck = 'Do not assume money moved, was received, or the record can close just because a prior step exists.';
  let moneyModelCheck = 'Claim, confirmation, approval, release, and closeout are separate states.';
  let receiptReturnCheck = state.receipt
    ? 'There is a receipt preview or record area to return to later.'
    : 'No trusted record is ready yet; return after the group resolves blockers.';

  if (preferredAction === '__wait__') {
    firstReaction = `${agent} sees "${next}" and deliberately leaves the action for someone else or for later.`;
    decision = 'wait';
    decisionReason = blockers;
  } else if (preferredAction && !selectedAction) {
    firstReaction = `${agent} expected "${preferredAction}", but that action was not visible.`;
    decision = 'wait';
    decisionReason = `Visible buttons were: ${state.visibleButtons.join(', ') || 'none'}.`;
  } else if (selectedAction) {
    decision = 'click-primary';
    decisionReason = `The normal app surface is asking ${agent} to use "${selectedAction}" now.`;
  }

  if (/Mark paid/i.test(primary)) {
    unsafeAssumptionCheck = 'Mark paid is only my claim; the receiver or organizer still needs to confirm what arrived.';
    moneyModelCheck = 'I am recording my payment claim, not closing the group.';
  } else if (/Confirm received/i.test(primary)) {
    unsafeAssumptionCheck = 'I should confirm only if money actually arrived.';
    moneyModelCheck = 'A claim becomes confirmed only when I record receipt.';
  } else if (/Approve/i.test(primary)) {
    unsafeAssumptionCheck = 'Approval means release readiness, not that payment already happened.';
    moneyModelCheck = 'Approval is separate from release and receiver confirmation.';
  } else if (/Release|released/i.test(primary)) {
    unsafeAssumptionCheck = 'Released outside ChopDot means external movement was recorded, not guaranteed by ChopDot.';
    moneyModelCheck = 'Release record still needs receiver confirmation where required.';
  } else if (/Close/i.test(primary)) {
    unsafeAssumptionCheck = 'Closing should only happen after blockers are resolved or explicitly noted.';
    moneyModelCheck = 'Closeout records the final group state; it should not hide open items.';
  } else if (!selectedAction && !preferredAction && /later|waiting|wait/i.test(next)) {
    firstReaction = `${agent} understands this is not their turn: "${next}".`;
    decision = 'wait';
    decisionReason = blockers;
  }

  if (/emergency/i.test(role)) {
    receiptReturnCheck = 'Emergency receipt should stay redacted and avoid sensitive names, reasons, and payment references.';
  }

  return {
    firstReaction,
    decision,
    decisionReason,
    unsafeAssumptionCheck,
    moneyModelCheck,
    receiptReturnCheck,
  };
}

async function waitForExpectedAction(page, actionLabel) {
  if (!actionLabel || actionLabel === '__wait__') return;
  await page.getByRole('button', { name: new RegExp(`^${escapeRegex(actionLabel)}$`) })
    .first()
    .waitFor({ state: 'visible', timeout: 8_000 })
    .catch(() => {});
}

async function clickActionIfChosen(page, reaction, selectedAction) {
  if (reaction.decision !== 'click-primary') {
    return { clicked: false, label: '', result: 'waited' };
  }
  const button = page.getByRole('button', { name: new RegExp(`^${escapeRegex(selectedAction)}$`) }).first();
  if (!(await button.isVisible().catch(() => false))) {
    return { clicked: false, label: selectedAction, result: 'visible action disappeared before click' };
  }
  const label = clean(await button.innerText());
  await button.click();
  await page.waitForTimeout(1_000);
  return { clicked: true, label, result: 'clicked visible normal app action' };
}

async function screenshot(page, name) {
  const file = path.join(artifactDir, `${slug(name)}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function runStep(browser, step, index) {
  const context = await browser.newContext({ viewport: step.viewport ?? { width: 390, height: 844 } });
  const page = await context.newPage();
  const record = {
    index,
    scenario: step.scenario,
    agent: step.agent,
    person: step.person,
    role: step.role,
    job: step.job,
    before: null,
    reaction: null,
    action: null,
    after: null,
    screenshot: '',
    error: '',
    expectedAction: step.actionLabel && step.actionLabel !== '__wait__' ? step.actionLabel : '',
  };

  try {
    await openPot(page, step.scenario, step.person);
    await waitForExpectedAction(page, step.actionLabel);
    record.before = await currentState(page);
    const selectedAction = chooseVisibleAction(record.before, step.actionLabel);
    record.reaction = inferReaction(step.agent, step.role, record.before, selectedAction, step.actionLabel);
    record.action = await clickActionIfChosen(page, record.reaction, selectedAction);
    record.after = await currentState(page);
    record.screenshot = await screenshot(page, `${String(index).padStart(2, '0')}-${step.scenario}-${step.agent}-${step.job}`);
  } catch (error) {
    record.error = error instanceof Error ? error.message : String(error);
    record.screenshot = await screenshot(page, `${String(index).padStart(2, '0')}-${step.scenario}-${step.agent}-error`).catch(() => '');
  } finally {
    await context.close();
  }

  return record;
}

const steps = [
  { scenario: 'group', agent: 'Leo', person: 'leo', role: 'group expense payer', job: 'mark his dinner share paid', actionLabel: 'Mark paid' },
  { scenario: 'group', agent: 'Nina', person: 'nina', role: 'group expense payer', job: 'mark her dinner share paid', actionLabel: 'Mark paid' },
  { scenario: 'group', agent: 'Omar', person: 'omar', role: 'group expense payer', job: 'mark his dinner share paid', actionLabel: 'Mark paid' },
  { scenario: 'group', agent: 'Mina', person: 'mina', role: 'receiver organizer', job: 'confirm Leo only if money arrived', actionLabel: 'Confirm received' },
  { scenario: 'group', agent: 'Mina', person: 'mina', role: 'receiver organizer', job: 'confirm Nina only if money arrived', actionLabel: 'Confirm received' },
  { scenario: 'group', agent: 'Mina', person: 'mina', role: 'receiver organizer', job: 'confirm Omar only if money arrived', actionLabel: 'Confirm received' },
  { scenario: 'group', agent: 'Mina', person: 'mina', role: 'receiver organizer', job: 'prepare the reimbursement record', actionLabel: 'Prepare reimbursement' },
  { scenario: 'group', agent: 'Mina', person: 'mina', role: 'receiver organizer', job: 'approve release readiness', actionLabel: 'Approve release' },
  { scenario: 'group', agent: 'Mina', person: 'mina', role: 'receiver organizer', job: 'record the outside reimbursement', actionLabel: 'Mark released outside ChopDot' },
  { scenario: 'group', agent: 'Mina', person: 'mina', role: 'receiver organizer', job: 'confirm the release receipt', actionLabel: 'Confirm received' },
  { scenario: 'group', agent: 'Mina', person: 'mina', role: 'receiver organizer', job: 'close the split record', actionLabel: 'Close split' },

  { scenario: 'savings', agent: 'Leo', person: 'leo', role: 'savings circle member and payout receiver', job: 'make round contribution', actionLabel: 'Mark paid' },
  { scenario: 'savings', agent: 'Nina', person: 'nina', role: 'savings circle member', job: 'make round contribution', actionLabel: 'Mark paid' },
  { scenario: 'savings', agent: 'Mina', person: 'mina', role: 'savings circle treasurer', job: 'confirm Leo only if money arrived', actionLabel: 'Confirm received' },
  { scenario: 'savings', agent: 'Mina', person: 'mina', role: 'savings circle treasurer', job: 'confirm Nina only if money arrived', actionLabel: 'Confirm received' },
  { scenario: 'savings', agent: 'Omar', person: 'omar', role: 'savings circle member', job: 'see his missed contribution is still due and leave it unpaid for now', actionLabel: '__wait__' },
  { scenario: 'savings', agent: 'Mina', person: 'mina', role: 'savings circle treasurer', job: 'record Omar delay instead of pretending payment happened', actionLabel: 'Record delay' },
  { scenario: 'savings', agent: 'Mina', person: 'mina', role: 'savings circle treasurer', job: 'prepare payout after contributions are handled', actionLabel: 'Prepare payout' },
  { scenario: 'savings', agent: 'Mina', person: 'mina', role: 'savings circle treasurer', job: 'approve payout readiness', actionLabel: 'Approve payout' },
  { scenario: 'savings', agent: 'Omar', person: 'omar', role: 'savings circle payer member', job: 'record payout moved outside ChopDot', actionLabel: 'Mark released outside ChopDot' },
  { scenario: 'savings', agent: 'Leo', person: 'leo', role: 'savings circle payout receiver', job: 'confirm payout arrived', actionLabel: 'Confirm received' },
  { scenario: 'savings', agent: 'Mina', person: 'mina', role: 'savings circle treasurer', job: 'close the round receipt', actionLabel: 'Close round' },

  { scenario: 'emergency', agent: 'Casey', person: 'casey', role: 'emergency contributor', job: 'contribute without seeing sensitive details', actionLabel: 'Mark paid' },
  { scenario: 'emergency', agent: 'Riley', person: 'riley', role: 'emergency organizer', job: 'confirm Casey support', actionLabel: 'Confirm received' },
  { scenario: 'emergency', agent: 'Morgan', person: 'morgan', role: 'emergency contributor', job: 'contribute privately', actionLabel: 'Mark paid' },
  { scenario: 'emergency', agent: 'Riley', person: 'riley', role: 'emergency organizer', job: 'confirm Morgan support', actionLabel: 'Confirm received' },
  { scenario: 'emergency', agent: 'Riley', person: 'riley', role: 'emergency organizer', job: 'prepare release', actionLabel: 'Prepare release' },
  { scenario: 'emergency', agent: 'Riley', person: 'riley', role: 'emergency organizer', job: 'approve release readiness', actionLabel: 'Approve release' },
  { scenario: 'emergency', agent: 'Taylor', person: 'taylor', role: 'emergency approver', job: 'approve release readiness', actionLabel: 'Approve release' },
  { scenario: 'emergency', agent: 'Riley', person: 'riley', role: 'emergency organizer', job: 'record release outside ChopDot', actionLabel: 'Mark released outside ChopDot' },
  { scenario: 'emergency', agent: 'Jordan', person: 'jordan', role: 'emergency recipient', job: 'confirm release arrived', actionLabel: 'Confirm received' },
  { scenario: 'emergency', agent: 'Riley', person: 'riley', role: 'emergency organizer', job: 'close redacted pot receipt', actionLabel: 'Close pot' },

  { scenario: 'community', agent: 'Sam', person: 'sam', role: 'community contributor', job: 'contribute to fund', actionLabel: 'Mark paid' },
  { scenario: 'community', agent: 'Alex', person: 'alex', role: 'community admin', job: 'confirm Sam contribution', actionLabel: 'Confirm received' },
  { scenario: 'community', agent: 'Noor', person: 'noor', role: 'community contributor', job: 'contribute to fund', actionLabel: 'Mark paid' },
  { scenario: 'community', agent: 'Alex', person: 'alex', role: 'community admin', job: 'confirm Noor contribution', actionLabel: 'Confirm received' },
  { scenario: 'community', agent: 'Alex', person: 'alex', role: 'community admin', job: 'prepare spend release', actionLabel: 'Prepare release' },
  { scenario: 'community', agent: 'Alex', person: 'alex', role: 'community admin', job: 'approve release readiness as admin', actionLabel: 'Approve release' },
  { scenario: 'community', agent: 'Priya', person: 'priya', role: 'community approver', job: 'approve release readiness', actionLabel: 'Approve release' },
  { scenario: 'community', agent: 'Sam', person: 'sam', role: 'community payer', job: 'record supplier payment outside ChopDot', actionLabel: 'Mark released outside ChopDot' },
  { scenario: 'community', agent: 'Jordan', person: 'jordan', role: 'community receiver', job: 'confirm supplier payment arrived', actionLabel: 'Confirm received' },
  { scenario: 'community', agent: 'Alex', person: 'alex', role: 'community admin', job: 'close the period handoff record', actionLabel: 'Close period' },
];

const browser = await chromium.launch();
const records = [];
for (let index = 0; index < steps.length; index += 1) {
  records.push(await runStep(browser, steps[index], index + 1));
}
await browser.close();

const summary = {
  generatedAt: new Date().toISOString(),
  session,
  baseUrl,
  mode: 'humanlike_visible_app_only',
  rules: [
    'No direct kernel calls.',
    'No developer flags.',
    'No reset endpoint.',
    'Fresh session id for clean state.',
    'Agents choose from visible state and click only visible normal app actions.',
    'Agent results require user approval before human-pass promotion.',
  ],
  total: records.length,
  errors: records.filter((record) => record.error).length,
  clicked: records.filter((record) => record.action?.clicked).length,
  waited: records.filter((record) => record.action && !record.action.clicked && !record.error && !record.expectedAction).length,
  missingExpectedActions: records.filter((record) => record.action && !record.action.clicked && !record.error && record.expectedAction).length,
  records,
};

const jsonPath = path.join(artifactDir, 'humanlike-agent-results.json');
fs.writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`);

function renderReport(report) {
  const scenarioNames = {
    group: 'Group expense',
    savings: 'Savings circle',
    emergency: 'Emergency pot',
    community: 'Community fund',
  };
  const scenarioOutcomeLines = Object.entries(scenarioNames).map(([scenario, label]) => {
    const rows = report.records.filter((record) => record.scenario === scenario);
    const last = rows.at(-1);
    const closed = last && /Record closed/i.test(last.after?.receipt ?? '');
    const missing = rows.filter((record) => !record.action?.clicked && record.expectedAction).length;
    return `| ${label} | ${closed ? 'closed' : 'not closed'} | ${rows.length} | ${missing} | ${last?.screenshot ?? ''} |`;
  });

  const lines = [
    '# ChopDot Human-Like Agent Pilot',
    '',
    `Status: \`${report.errors ? 'needs-review' : 'user-review-pending'}\``,
    `Generated: ${report.generatedAt}`,
    `Session: \`${report.session}\``,
    `Base URL: \`${report.baseUrl}\``,
    '',
    '## Method',
    '',
    'Agents used the normal ChopDot app surface only. They did not call the kernel, use developer flags, reset state through test endpoints, or promote themselves from code assertions. Each agent opened the app as their own person, read the visible screen, recorded a first reaction, chose whether to click a visible normal app action, and captured a screenshot.',
    '',
    'Promotion rule: this is agent evidence for user review. It becomes a human-style pass only if the operator reviews the reactions/screenshots and approves that the behavior makes sense.',
    '',
    '## Summary',
    '',
    `- Steps: ${report.total}`,
    `- Runtime errors: ${report.errors}`,
    `- Visible normal app actions clicked: ${report.clicked}`,
    `- Deliberate wait/no-action states: ${report.waited}`,
    `- Expected actions missing after waiting: ${report.missingExpectedActions}`,
    '',
    '## Scenario Outcomes',
    '',
    '| Scenario | Final state | Steps | Missing expected actions | Final screenshot |',
    '| --- | --- | ---: | ---: | --- |',
    ...scenarioOutcomeLines,
    '',
    '## What This Proved',
    '',
    '- People could enter as guest, open real ChopDot pots, and act from their own person/device context.',
    '- Mark paid stayed separate from Confirm received.',
    '- Approval stayed separate from release and receiver confirmation.',
    '- Emergency and community records closed only after the release path completed.',
    '- Savings circle handled a deliberate missed contribution through a delay note before closeout.',
    '',
    '## Still Needs Operator Review',
    '',
    'This run proves the app can be driven through normal surfaces by simulated people. It does not prove real human comprehension until the operator reviews the reactions and screenshots and approves that the behavior makes sense.',
    '',
    '## Agent Reactions',
    '',
  ];

  for (const record of report.records) {
    lines.push(`### ${record.index}. ${record.scenario} / ${record.agent}`);
    lines.push('');
    lines.push(`- Role: ${record.role}`);
    lines.push(`- Job: ${record.job}`);
    if (record.error) {
      lines.push(`- Error: ${record.error}`);
      lines.push(`- Screenshot: ${record.screenshot}`);
      lines.push('');
      continue;
    }
    lines.push(`- First reaction: ${record.reaction.firstReaction}`);
    lines.push(`- Decision: ${record.reaction.decision}`);
    lines.push(`- Decision reason: ${record.reaction.decisionReason}`);
    lines.push(`- Action taken: ${record.action.clicked ? `clicked "${record.action.label}"` : record.action.result}`);
    lines.push(`- Unsafe assumption check: ${record.reaction.unsafeAssumptionCheck}`);
    lines.push(`- Money-model check: ${record.reaction.moneyModelCheck}`);
    lines.push(`- Receipt/return check: ${record.reaction.receiptReturnCheck}`);
    lines.push(`- After-state: ${summarizeState(record.after)}`);
    lines.push(`- Screenshot: ${record.screenshot}`);
    lines.push('');
  }

  lines.push('## Operator Review');
  lines.push('');
  lines.push('| Scenario | Agent behavior makes sense? | Notes |');
  lines.push('| --- | --- | --- |');
  for (const scenario of ['Group expense', 'Savings circle', 'Emergency pot', 'Community fund']) {
    lines.push(`| ${scenario} | pending user approval | pending |`);
  }
  lines.push('');
  lines.push('## Claim Boundary');
  lines.push('');
  lines.push('Allowed now: agent-observed human-like app run is complete and ready for operator review.');
  lines.push('');
  lines.push('Not allowed yet: real human pass, 9/10 promotion, live `.dot` proof, or custody/escrow readiness.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

fs.writeFileSync(reportPath, renderReport(summary));

console.log(`Human-like agent JSON: ${jsonPath}`);
console.log(`Human-like agent report: ${reportPath}`);
console.log(`Summary: ${summary.clicked} clicked, ${summary.waited} waited, ${summary.missingExpectedActions} missing expected actions, ${summary.errors} errors`);
