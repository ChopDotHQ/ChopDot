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
import {releaseEvidencePath} from './support/releaseEvidencePath.ts';

const productUrl = 'http://127.0.0.1:4177/?developerChecks=1';
const proofDirectory = releaseEvidencePath('polkadot-host-stress');
const sessionSecret = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const wrongSessionSecret = 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
const groupId = 'friday-crew-five';

const participantDefinitions = [
  {account: 'alice', person: 'mina'},
  {account: 'bob', person: 'leo'},
  {account: 'charlie', person: 'nina'},
  {account: 'dave', person: 'omar'},
  {account: 'eve', person: 'vera'},
] as const satisfies ReadonlyArray<{account: DevAccountName; person: string}>;

type ParticipantDefinition = typeof participantDefinitions[number];
type HostedParticipant = ParticipantDefinition & {
  server: TestHostServer;
  page: Page;
  frame: Frame;
};

interface StressEvent {
  id: string;
  type: string;
  actor: string;
  amount?: string;
  currency?: string;
}

declare global {
  interface Window {
    __TEST_HOST__: TestHostAPI;
  }
}

function serializeHostValue(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => typeof item === 'bigint' ? item.toString() : item);
}

function uniqueEventIds(values: unknown[]): string[] {
  return [...new Set(values
    .filter((value): value is StressEvent => Boolean(value && typeof value === 'object' && 'id' in value))
    .map(value => value.id))].sort();
}

async function productFrame(page: Page): Promise<Frame> {
  await expect(page.locator('iframe')).toHaveCount(1);
  const frame = page.frames().find(candidate => candidate !== page.mainFrame());
  if (!frame) throw new Error('Product frame did not attach.');
  await expect.poll(() => frame.evaluate(() => Boolean(window.__CHOPDOT_HOST_ACTIONS__))).toBe(true);
  return frame;
}

async function openHostedProduct(browser: Browser, definition: ParticipantDefinition): Promise<HostedParticipant> {
  const server = await createTestHostServer({
    productUrl,
    accounts: [definition.account],
    productAccounts: {'chopdot-shell-proof.dot/0': definition.account},
    networks: [PASEO_ASSET_HUB],
  });
  const page = await browser.newPage();
  await page.goto(server.url);
  await expect.poll(() => page.evaluate(() => window.__TEST_HOST__.getConnectionStatus())).toBe('connected');
  return {...definition, server, page, frame: await productFrame(page)};
}

async function receivedValues(participant: HostedParticipant): Promise<unknown[]> {
  return participant.frame.evaluate(() => window.__CHOPDOT_HOST_ACTIONS__!.receivedSessionValues());
}

async function recoverMissingEvents(
  participant: HostedParticipant,
  statements: unknown[],
  events: StressEvent[],
): Promise<number> {
  let retryCount = 0;
  for (let pass = 0; pass < 3; pass += 1) {
    const receivedIds = new Set(uniqueEventIds(await receivedValues(participant)));
    const missingIndexes = events
      .map((event, index) => ({event, index}))
      .filter(({event}) => !receivedIds.has(event.id))
      .map(({index}) => index);
    if (missingIndexes.length === 0) return retryCount;

    for (const index of missingIndexes) {
      await participant.page.evaluate(value => window.__TEST_HOST__.injectStatement(value), statements[index]);
      retryCount += 1;
      await participant.page.waitForTimeout(100);
    }
  }
  return retryCount;
}

test('five hosted people converge under concurrent encrypted group activity', async ({browser}) => {
  test.setTimeout(180_000);
  await mkdir(proofDirectory, {recursive: true});
  const participants: HostedParticipant[] = [];

  try {
    for (const definition of participantDefinitions) {
      participants.push(await openHostedProduct(browser, definition));
    }

    const identities = await Promise.all(participants.map(participant =>
      participant.frame.evaluate(() => window.__CHOPDOT_HOST_ACTIONS__!.requestIdentity()),
    ));
    expect(new Set(identities.map(identity => identity.accountId[0])).size).toBe(5);
    expect(identities.every(identity => identity.productId === 'chopdot-shell-proof.dot')).toBe(true);

    await Promise.all(participants.map(participant => participant.frame.evaluate(
      ({group, secret}) => window.__CHOPDOT_HOST_ACTIONS__!.connectSession(group, secret),
      {group: groupId, secret: sessionSecret},
    )));

    const events: StressEvent[] = [
      {id: 'evt-mina-created', type: 'group_created', actor: 'mina', amount: '150.00', currency: 'CHF'},
      {id: 'evt-leo-paid', type: 'payment_marked_paid', actor: 'leo', amount: '30.00', currency: 'CHF'},
      {id: 'evt-nina-paid', type: 'payment_marked_paid', actor: 'nina', amount: '30.00', currency: 'CHF'},
      {id: 'evt-omar-delay', type: 'payment_delayed', actor: 'omar', amount: '30.00', currency: 'CHF'},
      {id: 'evt-vera-viewed', type: 'group_viewed', actor: 'vera'},
    ];

    await Promise.all(participants.map((participant, index) =>
      participant.frame.evaluate(value => window.__CHOPDOT_HOST_ACTIONS__!.publishSessionValue(value), events[index]),
    ));
    await Promise.all(participants.map(participant =>
      expect.poll(() => participant.page.evaluate(() => window.__TEST_HOST__.getSubmittedStatements().length)).toBe(1),
    ));

    const statements = await Promise.all(participants.map(participant =>
      participant.page.evaluate(() => window.__TEST_HOST__.getSubmittedStatements()[0].statement),
    ));
    const serializedStatements = serializeHostValue(statements);
    for (const event of events) {
      expect(serializedStatements).not.toContain(event.type);
      expect(serializedStatements).not.toContain(event.actor);
      if (event.amount) expect(serializedStatements).not.toContain(event.amount);
    }

    for (const participant of participants) {
      for (const statement of statements) {
        await participant.page.evaluate(value => window.__TEST_HOST__.injectStatement(value), statement);
      }
    }

    const expectedEventIds = events.map(event => event.id).sort();
    await participants[0].page.waitForTimeout(1_000);
    const burstUniqueCounts = await Promise.all(participants.map(async participant =>
      uniqueEventIds(await receivedValues(participant)).length,
    ));
    const recoveryRetries: number[] = [];
    for (const participant of participants) {
      recoveryRetries.push(await recoverMissingEvents(participant, statements, events));
      await expect.poll(async () => uniqueEventIds(await receivedValues(participant))).toEqual(expectedEventIds);
    }

    const duplicateTarget = participants[0];
    const duplicateBefore = (await receivedValues(duplicateTarget)).length;
    await duplicateTarget.page.evaluate(value => window.__TEST_HOST__.injectStatement(value), statements[1]);
    await duplicateTarget.page.evaluate(value => window.__TEST_HOST__.injectStatement(value), statements[1]);
    await duplicateTarget.page.waitForTimeout(500);
    const duplicateAfter = (await receivedValues(duplicateTarget)).length;
    expect(duplicateAfter).toBe(duplicateBefore);

    const isolatedParticipant = participants[4];
    await isolatedParticipant.frame.evaluate(
      ({group, secret}) => window.__CHOPDOT_HOST_ACTIONS__!.connectSession(group, secret),
      {group: groupId, secret: wrongSessionSecret},
    );
    const isolatedBefore = (await receivedValues(isolatedParticipant)).length;
    const postIsolationEvent: StressEvent = {
      id: 'evt-mina-after-isolation',
      type: 'payment_confirmation_requested',
      actor: 'mina',
      amount: '30.00',
      currency: 'CHF',
    };
    await participants[0].frame.evaluate(
      value => window.__CHOPDOT_HOST_ACTIONS__!.publishSessionValue(value),
      postIsolationEvent,
    );
    await expect.poll(() => participants[0].page.evaluate(
      () => window.__TEST_HOST__.getSubmittedStatements().length,
    )).toBe(2);
    const postIsolationStatement = await participants[0].page.evaluate(
      () => window.__TEST_HOST__.getSubmittedStatements()[1].statement,
    );
    for (const participant of participants.slice(0, 4)) {
      await participant.page.evaluate(value => window.__TEST_HOST__.injectStatement(value), postIsolationStatement);
      await expect.poll(async () => uniqueEventIds(await receivedValues(participant))).toContain(postIsolationEvent.id);
    }
    await isolatedParticipant.page.evaluate(
      value => window.__TEST_HOST__.injectStatement(value),
      postIsolationStatement,
    );
    await isolatedParticipant.page.waitForTimeout(500);
    expect((await receivedValues(isolatedParticipant)).length).toBe(isolatedBefore);

    const payingParticipants = participants.slice(1, 4);
    await Promise.all(payingParticipants.map(participant =>
      participant.page.evaluate(() => window.__TEST_HOST__.setPaymentBalance(100_000_000n)),
    ));
    const paymentAmounts = ['30000000', '31000000', '32000000'];
    const paymentIds = await Promise.all(payingParticipants.map((participant, index) =>
      participant.frame.evaluate(
        ({amount, destination}) => window.__CHOPDOT_HOST_ACTIONS__!.requestPayment(amount, destination),
        {amount: paymentAmounts[index], destination: `0x${String(index + 1).padStart(2, '0').repeat(32)}`},
      ),
    ));
    await Promise.all(payingParticipants.map((participant, index) =>
      participant.page.evaluate(
        ({id}) => window.__TEST_HOST__.simulatePaymentStatus(id, {tag: 'Completed'}),
        {id: paymentIds[index]},
      ),
    ));
    for (const participant of payingParticipants) {
      await expect.poll(() => participant.frame.evaluate(
        () => window.__CHOPDOT_HOST_ACTIONS__!.observedPayments(),
      )).toContainEqual(expect.objectContaining({authority: 'observed_only', status: {tag: 'Completed'}}));
      expect(await participant.page.evaluate(() => window.__TEST_HOST__.getPaymentLog().length)).toBe(1);
    }
    expect(await participants[0].page.evaluate(() => window.__TEST_HOST__.getPaymentLog().length)).toBe(0);
    expect(await participants[4].page.evaluate(() => window.__TEST_HOST__.getPaymentLog().length)).toBe(0);

    const receipt = {
      redacted: true,
      receiptId: 'receipt-friday-crew-five-1',
      closedAt: '2026-07-14T16:30:00.000Z',
      currency: 'CHF',
      total: '150.00',
      memberCount: 5,
      openItemCount: 1,
    } as const;
    const receiptKey = await participants[0].frame.evaluate(
      value => window.__CHOPDOT_HOST_ACTIONS__!.saveRedactedReceipt(value),
      receipt,
    );
    const preimages = await participants[0].page.evaluate(() => window.__TEST_HOST__.getPreimages());
    expect(preimages).toHaveLength(1);
    const storedBytes = preimages[0].value instanceof Uint8Array
      ? preimages[0].value
      : Uint8Array.from(Object.values(preimages[0].value));
    const storedReceipt = JSON.parse(new TextDecoder().decode(storedBytes));
    expect(storedReceipt).toEqual(receipt);
    for (const person of participantDefinitions.map(participant => participant.person)) {
      expect(JSON.stringify(storedReceipt).toLowerCase()).not.toContain(person);
    }

    for (const participant of participants) {
      await participant.page.screenshot({
        path: path.join(proofDirectory, `${participant.person}-host.png`),
        fullPage: true,
      });
    }

    await writeFile(path.join(proofDirectory, 'report.json'), JSON.stringify({
      checkedAt: new Date().toISOString(),
      sdk: '@parity/host-api-test-sdk@0.10.0',
      status: 'passed',
      participantCount: 5,
      participants: participantDefinitions.map((participant, index) => ({
        person: participant.person,
        hostAccount: identities[index].username,
        accountId: identities[index].accountId[0],
      })),
      convergence: {
        concurrentEventCount: events.length,
        uniqueEventsReceivedByEachCorrectHost: events.length,
        ciphertextOnly: true,
        burstUniqueCounts,
        recoveryRetries,
        retryRequired: recoveryRetries.some(count => count > 0),
      },
      wrongSecretIsolation: true,
      duplicateDelivery: {
        observed: true,
        deduplicatedByBridge: duplicateAfter === duplicateBefore,
        note: 'Duplicate transport delivery was injected twice and suppressed by the Statement Store client data-hash dedupe.',
      },
      payments: {
        concurrentCount: payingParticipants.length,
        observedOnly: true,
        isolatedHostLogs: true,
      },
      receipt: {key: receiptKey, redacted: true, retrieved: true, memberCount: 5},
      boundaries: [
        'Developer bridge actions were used; this is not a real-UI journey pass.',
        'Official local host simulation is not live-network execution.',
      ],
    }, null, 2));
  } finally {
    for (const participant of participants) {
      await participant.page.close().catch(() => undefined);
      await participant.server.close().catch(() => undefined);
    }
  }
});
