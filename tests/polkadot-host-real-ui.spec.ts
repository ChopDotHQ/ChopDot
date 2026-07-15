import {expect, test, type Browser, type Frame, type Page} from '@playwright/test';
import {
  createTestHostServer,
  PASEO_ASSET_HUB,
  type DevAccountName,
  type TestHostAPI,
  type TestHostServer,
} from '@parity/host-api-test-sdk';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

const sessionSecret = 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC';
const sessionRoom = 'friday-crew-real-ui-five';
const sessionQuery = `chopSession=${sessionRoom}&chopKey=${sessionSecret}`;
const productUrl = `http://127.0.0.1:4177/?${sessionQuery}`;
const proofDirectory = path.resolve('proof/polkadot-host-real-ui');
const storageKey = 'chopdot-portable-shell-state-v1';

const definitions = [
  {account: 'alice', person: 'Mina'},
  {account: 'bob', person: 'Leo'},
  {account: 'charlie', person: 'Nina'},
  {account: 'dave', person: 'Omar'},
  {account: 'eve', person: 'Vera'},
] as const satisfies ReadonlyArray<{account: DevAccountName; person: string}>;

type Definition = typeof definitions[number];
type Participant = Definition & {
  server: TestHostServer;
  page: Page;
  frame: Frame;
  statementCursor: number;
  publishedCursor: number;
};

interface PortableState {
  currentUserId: string | null;
  users: Record<string, {id: string; name: string; accountPublicKeyHex?: string}>;
  groups: Record<string, {id: string; name: string; memberIds: string[]}>;
  expenses: Record<string, {id: string; groupId: string; amount: number; paidByUserId: string}>;
  splits: Record<string, {id: string; expenseId: string; userId: string; amount: number; status: string}>;
  savedRecords: Record<string, {id: string; groupId: string; dateSaved: string; totalAmount: number; openAmount: number}>;
}

declare global {
  interface Window {
    __TEST_HOST__: TestHostAPI;
    __CHOPDOT_CAPTURED_SHARES__?: Array<{url?: string}>;
  }
}

async function openParticipant(browser: Browser, definition: Definition): Promise<Participant> {
  const server = await createTestHostServer({
    productUrl,
    accounts: [definition.account],
    productAccounts: {'chopdot-shell-proof.dot/0': definition.account},
    networks: [PASEO_ASSET_HUB],
  });
  const page = await browser.newPage({viewport: {width: 430, height: 932}});
  await page.goto(`${server.url}?${sessionQuery}`);
  await expect.poll(() => page.evaluate(() => window.__TEST_HOST__.getConnectionStatus())).toBe('connected');
  await expect(page.locator('iframe')).toHaveCount(1);
  const frame = page.frames().find(candidate => candidate !== page.mainFrame());
  if (!frame) throw new Error(`${definition.person} product frame did not attach.`);
  await expect.poll(() => frame.evaluate(() => window.__CHOPDOT_SESSION_OBSERVER__?.status)).toBe('ready');
  return {...definition, server, page, frame, statementCursor: 0, publishedCursor: 0};
}

async function onboard(participant: Participant): Promise<void> {
  await participant.frame.getByRole('button', {name: 'Continue as guest'}).click();
  await participant.frame.getByPlaceholder('Display name').fill(participant.person);
  await participant.frame.getByRole('button', {name: `Continue as ${participant.person}`}).click();
  await expect(participant.frame.getByText(`Hey, ${participant.person}`)).toBeVisible();
}

async function relayNewStatements(participants: Participant[]): Promise<number> {
  const outgoing: Array<{sender: Participant; statement: unknown}> = [];
  for (const participant of participants) {
    const statements = await participant.page.evaluate(() => window.__TEST_HOST__.getSubmittedStatements());
    for (const submission of statements.slice(participant.statementCursor)) {
      outgoing.push({sender: participant, statement: submission.statement});
    }
    participant.statementCursor = statements.length;
  }

  for (const {sender, statement} of outgoing) {
    for (const recipient of participants) {
      if (recipient === sender) continue;
      await recipient.page.evaluate(value => window.__TEST_HOST__.injectStatement(value), statement);
    }
  }
  if (outgoing.length > 0) await participants[0].page.waitForTimeout(350);
  return outgoing.length;
}

async function waitForSubmitted(participant: Participant, expectedNew: number): Promise<void> {
  const expectedPublished = participant.publishedCursor + expectedNew;
  try {
    await expect.poll(() => participant.frame.evaluate(
      () => window.__CHOPDOT_SESSION_OBSERVER__?.published ?? 0,
    )).toBe(expectedPublished);
    participant.publishedCursor = expectedPublished;
    await expect.poll(() => participant.page.evaluate(
      () => window.__TEST_HOST__.getSubmittedStatements().length,
    )).toBeGreaterThan(participant.statementCursor);
  } catch (error) {
    const diagnostic = await participant.frame.evaluate(() => ({
      observer: window.__CHOPDOT_SESSION_OBSERVER__,
      state: window.localStorage.getItem('chopdot-portable-shell-state-v1'),
    }));
    throw new Error(`${participant.person} did not publish ${expectedNew} statement(s): ${JSON.stringify(diagnostic)}`, {cause: error});
  }
}

async function stateOf(participant: Participant): Promise<PortableState> {
  return participant.frame.evaluate((key) => {
    const value = window.localStorage.getItem(key);
    if (!value) throw new Error('Portable state has not been saved.');
    return JSON.parse(value) as PortableState;
  }, storageKey);
}

async function waitForState(
  participant: Participant,
  predicate: (state: PortableState) => boolean,
): Promise<void> {
  try {
    await expect.poll(async () => predicate(await stateOf(participant))).toBe(true);
  } catch (error) {
    const diagnostic = await participant.frame.evaluate(() => ({
      observer: window.__CHOPDOT_SESSION_OBSERVER__,
      state: window.localStorage.getItem('chopdot-portable-shell-state-v1'),
    }));
    throw new Error(`${participant.person} did not reach the expected shared state: ${JSON.stringify(diagnostic)}`, {cause: error});
  }
}

async function capture(participant: Participant, name: string): Promise<void> {
  await participant.frame.locator('#root').screenshot({
    path: path.join(proofDirectory, `${name}-${participant.person.toLowerCase()}.png`),
  });
}

async function installShareCapture(frame: Frame): Promise<void> {
  await frame.evaluate(() => {
    window.__CHOPDOT_CAPTURED_SHARES__ = [];
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (value: {url?: string}) => {
        window.__CHOPDOT_CAPTURED_SHARES__!.push(value);
      },
    });
  });
}

async function openCapturedPayerLink(mina: Participant, payer: Participant, index: number): Promise<void> {
  const capturedUrl = await mina.frame.evaluate((shareIndex) => {
    const value = window.__CHOPDOT_CAPTURED_SHARES__?.[shareIndex]?.url;
    if (!value) throw new Error(`Missing shared payer URL ${shareIndex}.`);
    return value;
  }, index);
  const capturedParams = new URL(capturedUrl).searchParams;
  await payer.frame.evaluate(({groupId, memberId, packet}) => {
    const url = new URL(window.location.href);
    url.searchParams.set('payGroupId', groupId);
    url.searchParams.set('payMemberId', memberId);
    if (packet) url.searchParams.set('payRequest', packet);
    window.history.replaceState({}, '', url);
  }, {
    groupId: capturedParams.get('payGroupId')!,
    memberId: capturedParams.get('payMemberId')!,
    packet: capturedParams.get('payRequest'),
  });
}

function sharedProjection(state: PortableState) {
  return {
    users: Object.values(state.users).sort((a, b) => a.id.localeCompare(b.id)),
    groups: Object.values(state.groups).sort((a, b) => a.id.localeCompare(b.id)),
    expenses: Object.values(state.expenses).sort((a, b) => a.id.localeCompare(b.id)),
    splits: Object.values(state.splits).sort((a, b) => a.id.localeCompare(b.id)),
    savedRecords: Object.values(state.savedRecords).sort((a, b) => a.id.localeCompare(b.id)),
  };
}

test('five people complete the real ChopDot group journey from isolated Polkadot hosts', async ({browser}) => {
  test.setTimeout(240_000);
  await mkdir(proofDirectory, {recursive: true});
  const participants: Participant[] = [];

  try {
    for (const definition of definitions) participants.push(await openParticipant(browser, definition));
    const mina = participants[0];
    const payers = participants.slice(1);

    await Promise.all(participants.map(onboard));
    await Promise.all(participants.map(participant => waitForSubmitted(participant, 1)));
    expect(await relayNewStatements(participants)).toBeGreaterThanOrEqual(5);
    for (const participant of participants) {
      await waitForState(participant, state => Object.keys(state.users).length === 5);
    }
    await capture(mina, '01-onboarded');

    await mina.frame.getByRole('button', {name: 'Start with a group'}).click();
    await mina.frame.getByPlaceholder('e.g. Weekend Trip').fill('Friday Crew');
    for (const payer of payers) {
      await mina.frame.getByLabel('Friend name').fill(payer.person);
      await mina.frame.getByRole('button', {name: 'Add friend'}).click();
    }
    await mina.frame.getByRole('button', {name: 'Create group'}).click();
    await waitForSubmitted(mina, 1);
    expect(await relayNewStatements(participants)).toBeGreaterThanOrEqual(1);
    for (const participant of participants) {
      await waitForState(participant, state => Object.values(state.groups).some(group => group.name === 'Friday Crew'));
    }
    await capture(mina, '02-group-created');

    await mina.frame.getByRole('button', {name: 'Add spend'}).click();
    await mina.frame.getByPlaceholder('0.00').fill('150');
    await mina.frame.getByPlaceholder('e.g. Dinner at Gusto').fill('Dinner in Zurich');
    await mina.frame.getByRole('button', {name: 'Review split'}).click();
    await mina.frame.getByRole('button', {name: 'Save spend'}).click();
    await waitForSubmitted(mina, 1);
    expect(await relayNewStatements(participants)).toBeGreaterThanOrEqual(1);
    await capture(mina, '03-spend-saved');

    await installShareCapture(mina.frame);
    await mina.frame.getByRole('button', {name: 'Settle up'}).click();
    for (const payer of payers) {
      await mina.frame.getByLabel(`Send link to ${payer.person}`).click();
    }
    await waitForSubmitted(mina, 4);
    for (const [index, payer] of payers.entries()) {
      await openCapturedPayerLink(mina, payer, index);
    }
    expect(await relayNewStatements(participants)).toBeGreaterThanOrEqual(4);
    await capture(mina, '04-requests-sent');

    for (const [index, payer] of payers.entries()) {
      await expect(payer.frame.getByRole('button', {name: 'I paid Mina'})).toBeVisible();
      await capture(payer, `05-request-${index + 1}`);
      await payer.frame.getByRole('button', {name: 'I paid Mina'}).click();
    }
    await Promise.all(payers.map(payer => waitForSubmitted(payer, 1)));
    expect(await relayNewStatements(participants)).toBeGreaterThanOrEqual(4);
    await capture(payers[0], '06-leo-marked-paid');

    for (const payer of payers) {
      await mina.frame.getByLabel(`Confirm received from ${payer.person}`).click();
    }
    await waitForSubmitted(mina, 4);
    expect(await relayNewStatements(participants)).toBeGreaterThanOrEqual(4);
    await expect(mina.frame.getByText('Everyone is settled up!')).toBeVisible();
    await capture(mina, '07-all-confirmed');

    await mina.frame.getByRole('button', {name: 'Finish group'}).click();
    await mina.frame.getByRole('button', {name: 'Finish and save summary'}).click();
    await waitForSubmitted(mina, 1);
    expect(await relayNewStatements(participants)).toBeGreaterThanOrEqual(1);
    await expect(mina.frame.getByRole('heading', {name: 'Group Summary'})).toBeVisible();
    await expect(mina.frame.getByText('All settled')).toBeVisible();
    await capture(mina, '08-saved-summary');

    const states = await Promise.all(participants.map(stateOf));
    const expectedProjection = sharedProjection(states[0]);
    for (const state of states) {
      expect(sharedProjection(state)).toEqual(expectedProjection);
      expect(state.currentUserId).toBeTruthy();
      expect(state.users[state.currentUserId!].name).toBe(definitions[states.indexOf(state)].person);
    }
    expect(new Set(states.map(state => state.currentUserId)).size).toBe(5);
    expect(expectedProjection.users).toHaveLength(5);
    expect(expectedProjection.groups[0].memberIds).toHaveLength(5);
    expect(expectedProjection.splits).toHaveLength(5);
    expect(expectedProjection.splits.every(split => split.status === 'confirmed')).toBe(true);
    expect(expectedProjection.savedRecords).toHaveLength(1);
    expect(expectedProjection.savedRecords[0].openAmount).toBe(0);

    const observers = await Promise.all(participants.map(participant => participant.frame.evaluate(
      () => window.__CHOPDOT_SESSION_OBSERVER__,
    )));
    expect(observers.every(observer => observer?.status === 'ready')).toBe(true);
    expect(observers.every(observer => observer?.rejected === 0 && observer?.deferred === 0)).toBe(true);

    await writeFile(path.join(proofDirectory, 'report.json'), JSON.stringify({
      checkedAt: new Date().toISOString(),
      status: 'passed',
      sdk: '@parity/host-api-test-sdk@0.10.0',
      participantCount: participants.length,
      participants: states.map((state, index) => ({
        person: definitions[index].person,
        userId: state.currentUserId,
        accountBound: Boolean(state.users[state.currentUserId!].accountPublicKeyHex),
      })),
      journey: [
        'first entry',
        'create group',
        'add spend',
        'send four payment links',
        'four payers mark paid on their own host',
        'Mina confirms four receipts',
        'finish group',
        'saved summary',
      ],
      convergence: {
        sameSharedProjection: true,
        separateActiveParticipants: true,
        finalSplitStatuses: expectedProjection.splits.map(split => split.status),
        savedRecordOpenAmount: expectedProjection.savedRecords[0].openAmount,
      },
      authority: {
        rejectedEvents: observers.map(observer => observer?.rejected ?? null),
        deferredEvents: observers.map(observer => observer?.deferred ?? null),
        developerActionsUsed: false,
        directProductStateMutationUsed: false,
      },
      boundaries: [
        'The test relay transported official signed statements between isolated local hosts; it did not mutate ChopDot state.',
        'This is official Host API Test SDK proof, not live-network or Polkadot Mobile proof.',
        'Payment movement was not executed in this journey; mark-paid and receiver-confirmed product states remained separate.',
      ],
    }, null, 2));
  } finally {
    for (const participant of participants) {
      await participant.page.close().catch(() => undefined);
      await participant.server.close().catch(() => undefined);
    }
  }
});
