import {expect, test, type Browser, type Frame, type Page} from '@playwright/test';
import {
  PASEO_ASSET_HUB,
  type DevAccountName,
  type TestHostAPI,
  type TestHostServer,
} from '@parity/host-api-test-sdk';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {releaseEvidencePath} from './support/releaseEvidencePath.ts';
import {
  CURRENT_TRUAPI_CHAT_ADAPTER_SHA256,
  EXPECTED_HOST_BUNDLE_SHA256,
  EXPECTED_TEST_HOST_VERSION,
  EXPECTED_TRUAPI_VERSION,
  createTruApiCompatibleTestHostServer,
} from './support/truapiCompatibleTestHost.ts';

const productUrl = 'http://127.0.0.1:4177/';
const evidenceRoot = releaseEvidencePath('named-mode-multi-account-production-entrypoint');

type Participant = {
  account: DevAccountName;
  server: TestHostServer;
  page: Page;
  frame: Frame;
  diagnostics: string[];
};

declare global {
  interface Window {
    __TEST_HOST__: TestHostAPI;
    __CHOPDOT_TEST_CLIPBOARD__?: string;
    __CHOPDOT_CHAT_ACTION__?: unknown;
    __CHOPDOT_CAPTURED_SHARE__?: {url?: string};
  }
}

test.beforeAll(async () => mkdir(evidenceRoot, {recursive: true}));
test.beforeEach(() => {
  test.info().annotations.push({
    type: 'test-host-compatibility',
    description: `@parity/host-api-test-sdk@${EXPECTED_TEST_HOST_VERSION} ${EXPECTED_HOST_BUNDLE_SHA256}; @parity/truapi@${EXPECTED_TRUAPI_VERSION} chat adapter ${CURRENT_TRUAPI_CHAT_ADAPTER_SHA256}`,
  });
});

test('savings organizer grants and removes signed membership with account-bound controls', async ({browser}) => {
  test.setTimeout(180_000);
  const mina = await openParticipant(browser, 'alice');
  const leo = await openParticipant(browser, 'bob');
  try {
    await verifyContactPair(mina, leo);
    const roomId = await registerSharedConversation([mina, leo], 'wave6-savings-room');
    const relay = createChatRelay(mina, leo);
    expect(roomId).toBe('wave6-savings-room');
    expect(await relay.flush()).toBe(0);
    await mina.frame.getByRole('button', {name: 'New group'}).click();
    await mina.frame.getByLabel('What is it for?').selectOption('savings_circle');
    await mina.frame.getByRole('button', {name: 'Create my group'}).click();
    await expect(mina.frame.getByRole('heading', {name: 'Set the circle rules.'})).toBeVisible();
    await expect(mina.frame.getByRole('button', {name: 'Manage members'})).toBeVisible();
    await inviteAcceptedMember({organizer: mina, invitee: leo, relay, groupName: 'Savings circle'});

    await leaveBoundedEntry(leo);
    await leo.frame.getByRole('region', {name: 'Your groups'}).getByRole('button', {name: 'Open Savings circle'}).click();
    await expect(leo.frame.getByRole('heading', {name: 'Savings circle'})).toBeVisible();
    await expect(leo.frame.getByRole('button', {name: 'Manage members'})).toHaveCount(0);
    await leo.frame.locator('#root').screenshot({
      path: path.join(evidenceRoot, 'savings-active-member-controls.png'),
    });

    await expect(mina.frame.getByRole('button', {name: 'Manage members'})).toBeVisible();
    await mina.frame.getByRole('button', {name: 'Manage members'}).click();
    await expect(mina.frame.getByRole('button', {name: 'Invite a member'})).toBeVisible();
    await expect(mina.frame.getByRole('button', {name: 'Remove a member'})).toBeVisible();
    await mina.frame.getByRole('button', {name: 'Remove a member'}).click();
    await expect(mina.frame.getByRole('heading', {name: 'Who should leave?'})).toBeVisible();
    await expect(mina.frame.getByLabel('Active member').locator('option:checked')).toHaveText(/bob/iu);
    await mina.frame.getByRole('button', {name: 'Remove this member'}).click();
    await expect(mina.frame.getByRole('heading', {name: 'Ready to remove'})).toBeVisible();
    await expect(mina.frame.getByText('1 of 1 remaining members safely received the next group access.')).toBeVisible();
    const publicReadProbeStartedAt = Date.now();
    await mina.frame.getByRole('button', {name: 'Back to group', exact: true}).last().click();
    await expect(mina.frame.getByRole('button', {name: 'Manage members'})).toBeVisible({timeout: 5_000});
    await mina.frame.getByRole('button', {name: 'Manage members'}).click();
    await mina.frame.getByRole('button', {name: 'Remove a member'}).click();
    await expect(mina.frame.getByRole('heading', {name: 'Who should leave?'})).toBeVisible({timeout: 5_000});
    await expect(mina.frame.getByLabel('Active member').locator('option:checked')).toHaveText(/bob/iu);
    await mina.frame.getByRole('button', {name: 'Remove this member'}).click();
    await expect(mina.frame.getByRole('heading', {name: 'Ready to remove'})).toBeVisible({timeout: 5_000});
    test.info().annotations.push({
      type: 'pre-finish-public-authority-read',
      description: JSON.stringify({outcome: 'resolved', elapsedMs: Date.now() - publicReadProbeStartedAt}),
    });
    const signingCountBeforeRemoval = await mina.page.evaluate(() => window.__TEST_HOST__.getSigningLog().length);
    await mina.frame.getByRole('button', {name: 'Finish removal'}).click();
    await expect(mina.frame.getByRole('heading', {name: 'Member removed'})).toBeVisible({timeout: 30_000});
    const [journal, signingCountAfterRemoval, removalMessages] = await Promise.all([
      mina.frame.evaluate(readRedactedAuthorityJournal),
      mina.page.evaluate(() => window.__TEST_HOST__.getSigningLog().length),
      mina.page.evaluate(() => window.__TEST_HOST__.getChatMessageLog().map(message => ({
        messageId: message.messageId,
        roomId: message.roomId,
        messageType: typeof message.payload === 'object' && message.payload && 'value' in message.payload
          && typeof (message.payload as {value?: unknown}).value === 'object' && (message.payload as {value?: unknown}).value
          && 'messageType' in ((message.payload as {value: object}).value)
          ? String(((message.payload as {value: {messageType: unknown}}).value).messageType)
          : null,
      }))),
    ]);
    expect(journal).toHaveLength(1);
    expect(journal[0]?.eventTypes).toEqual(['GROUP_CREATED', 'MEMBER_ADDED', 'MEMBER_REMOVED']);
    expect(signingCountAfterRemoval).toBeGreaterThan(signingCountBeforeRemoval);
    expect(removalMessages.filter(message => message.messageType === 'chopdot.canonical-event.v1')).toHaveLength(2);
    test.info().annotations.push({
      type: 'canonical-removal-proof',
      description: JSON.stringify({journal, signingCountBeforeRemoval, signingCountAfterRemoval, removalMessages}),
    });
    await mina.frame.locator('#root').screenshot({
      path: path.join(evidenceRoot, 'savings-canonical-member-removed.png'),
    });
    await mina.frame.getByRole('button', {name: 'Back to group', exact: true}).last().click();
    await expect(mina.frame.getByRole('button', {name: 'Manage members'})).toBeVisible();

    await relay.flush();
    await expect.poll(async () => (await leo.frame.evaluate(readRedactedAuthorityJournal))[0]?.eventTypes, {timeout: 15_000})
      .toEqual(['GROUP_CREATED', 'MEMBER_ADDED', 'MEMBER_REMOVED']);
    await expect(leo.frame.getByRole('button', {name: 'Manage members'})).toHaveCount(0);
    await leo.frame.locator('#root').screenshot({
      path: path.join(evidenceRoot, 'savings-removed-member-controls.png'),
    });
    await mina.frame.locator('#root').screenshot({
      path: path.join(evidenceRoot, 'savings-organizer-controls-after-removal.png'),
    });
  } finally {
    await closeParticipant(mina);
    await closeParticipant(leo);
  }
});

async function readRedactedAuthorityJournal(): Promise<Array<{
  groupId: string;
  eventTypes: string[];
  version: number | null;
  frontierHash: string | null;
}>> {
  const request = <T>(database: IDBDatabase, storeName: string, operation: (store: IDBObjectStore) => IDBRequest): Promise<T> => new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const operationRequest = operation(transaction.objectStore(storeName));
    operationRequest.onerror = () => reject(operationRequest.error ?? new Error(`IndexedDB ${storeName} request failed.`));
    transaction.onerror = () => reject(transaction.error ?? new Error(`IndexedDB ${storeName} transaction failed.`));
    transaction.oncomplete = () => resolve(operationRequest.result as T);
  });
  const bytes = (value: string): Uint8Array => {
    const normalized = value.replace(/^0x/u, '');
    if (normalized.length % 2 !== 0 || !/^[0-9a-f]*$/iu.test(normalized)) throw new Error('Encrypted journal byte string is invalid.');
    return Uint8Array.from({length: normalized.length / 2}, (_, index) => Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16));
  };
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open('chopdot-authority-v1');
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error ?? new Error('Authority journal database is unavailable.'));
  });
  try {
    const [key, rows] = await Promise.all([
      request<CryptoKey | undefined>(database, 'keys', store => store.get('journal-encryption-key')),
      request<Array<{
        frontierHash?: unknown;
        ivHex?: unknown;
        ciphertextHex?: unknown;
      }>>(database, 'journals', store => store.getAll()),
    ]);
    if (!(key instanceof CryptoKey)) throw new Error('Authority journal encryption key is unavailable.');
    const decoder = new TextDecoder();
    const results = [];
    for (const row of rows) {
      if (typeof row.ivHex !== 'string' || typeof row.ciphertextHex !== 'string') continue;
      const plaintext = await crypto.subtle.decrypt(
        {name: 'AES-GCM', iv: bytes(row.ivHex)},
        key,
        bytes(row.ciphertextHex),
      );
      const value = JSON.parse(decoder.decode(plaintext)) as {
        groupId?: unknown;
        events?: Array<{eventType?: unknown}>;
      };
      results.push({
        groupId: typeof value.groupId === 'string' ? value.groupId : 'unknown',
        eventTypes: Array.isArray(value.events)
          ? value.events.map(event => typeof event.eventType === 'string' ? event.eventType : 'unknown')
          : [],
        version: Array.isArray(value.events) ? value.events.length : null,
        frontierHash: typeof row.frontierHash === 'string' ? row.frontierHash : null,
      });
    }
    return results;
  } finally {
    database.close();
  }
}

test('Spend Card separate-account proof creates the group and grants signed membership', async ({browser}) => {
  test.setTimeout(60_000);
  const mina = await openParticipant(browser, 'alice');
  const leo = await openParticipant(browser, 'bob');
  try {
    await verifyContactPair(mina, leo);
    const roomId = await registerSharedConversation([mina, leo], 'wave6-spend-room');
    const relay = createChatRelay(mina, leo);
    expect(roomId).toBe('wave6-spend-room');
    expect(await relay.flush()).toBe(0);
    await mina.page.waitForTimeout(1_000);
    mina.frame = currentProductFrame(mina.page);
    leo.frame = currentProductFrame(leo.page);
    await expect(mina.frame.getByText(/Hey, Alice/iu)).toBeVisible({timeout: 15_000});
    await expect(leo.frame.getByText(/Hey, Bob/iu)).toBeVisible({timeout: 15_000});
    await expect(mina.frame.getByRole('button', {name: 'New group'})).toBeVisible({timeout: 15_000});
    await mina.frame.getByRole('button', {name: 'New group'}).click();
    await mina.frame.getByLabel('What is it for?').selectOption('spend_card');
    await expect(mina.frame.getByRole('heading', {name: 'New group'})).toBeVisible({timeout: 15_000});
    await expect(mina.frame.getByRole('button', {name: 'Create my group'})).toBeVisible({timeout: 15_000});
    await mina.frame.getByRole('button', {name: 'Create my group'}).click();
    await expect(mina.frame.getByRole('heading', {name: 'Add the card purchase.'})).toBeVisible({timeout: 15_000});
    await expect(mina.frame.getByRole('button', {name: 'Manage members'})).toBeVisible();
    await inviteAcceptedMember({organizer: mina, invitee: leo, relay, groupName: 'Spend Card'});
    await mina.frame.locator('#root').screenshot({
      path: path.join(evidenceRoot, 'spend-card-signed-member-grant.png'),
    });
  } finally {
    await closeParticipant(mina);
    await closeParticipant(leo);
  }
});

test('normal group payment keeps signed membership, marked-paid evidence, and receiver confirmation separate', async ({browser}) => {
  test.setTimeout(180_000);
  const mina = await openParticipant(browser, 'alice');
  const leo = await openParticipant(browser, 'bob');
  try {
    await verifyContactPair(mina, leo);
    const roomId = await registerSharedConversation([mina, leo], 'wave6-normal-payment-room');
    const relay = createChatRelay(mina, leo);
    expect(roomId).toBe('wave6-normal-payment-room');

    await mina.frame.getByRole('button', {name: 'New group'}).click();
    await mina.frame.getByPlaceholder('e.g. Weekend Trip').fill('Zurich dinner');
    await expect(mina.frame.getByLabel('Friend name')).toHaveCount(0);
    await mina.frame.getByRole('button', {name: 'Create my group'}).click();
    await expect(mina.frame.getByRole('heading', {name: 'Zurich dinner'})).toBeVisible();
    await inviteAcceptedMember({organizer: mina, invitee: leo, relay, groupName: 'Zurich dinner'});

    await mina.frame.getByRole('button', {name: /Add spend/u}).click();
    await mina.frame.getByRole('button', {name: 'Enter amount instead'}).click();
    await mina.frame.getByLabel('Total').fill('120');
    await mina.frame.getByLabel('Merchant or reason').fill('Dinner');
    await mina.frame.getByRole('button', {name: 'Review split'}).click();
    await mina.frame.getByRole('button', {name: 'Save spend'}).click();

    await installShareCapture(mina);
    await mina.frame.getByRole('button', {name: 'Settle up'}).click();
    await mina.frame.getByRole('button', {name: 'Send link to bob'}).click();
    await expect.poll(() => mina.frame.evaluate(() => window.__CHOPDOT_CAPTURED_SHARE__?.url ?? '')).not.toBe('');
    const initialPayerUrl = await mina.frame.evaluate(() => window.__CHOPDOT_CAPTURED_SHARE__?.url ?? '');
    expect(new URL(initialPayerUrl).searchParams.get('payRequest')).toBeTruthy();

    await mina.frame.getByRole('button', {name: 'Back'}).click();
    await expect(mina.frame.getByTestId('group-request-waiting')).toHaveText('Waiting for Bob');
    await expect(mina.frame.getByTestId('group-add-expense')).toBeVisible();
    await mina.frame.getByTestId('group-add-expense').click();
    await mina.frame.getByRole('button', {name: 'Enter amount instead'}).click();
    await mina.frame.getByLabel('Total').fill('20');
    await mina.frame.getByLabel('Merchant or reason').fill('Forgotten taxi');
    await mina.frame.getByRole('button', {name: 'Review split'}).click();
    await mina.frame.getByRole('button', {name: 'Save spend'}).click();
    await expect(mina.frame.getByText('$140.00', {exact: true})).toBeVisible();
    await expect(mina.frame.getByText('Request sent · $10.00 more', {exact: true})).toBeVisible();
    await expect(mina.frame.getByTestId('group-request-more')).toHaveText('Request $10.00 more');
    await mina.frame.getByTestId('group-request-more').click();
    await installShareCapture(mina);
    await mina.frame.getByRole('button', {name: 'Send updated link to Bob'}).click();
    await expect.poll(() => mina.frame.evaluate(() => window.__CHOPDOT_CAPTURED_SHARE__?.url ?? '')).not.toBe('');
    const payerUrl = await mina.frame.evaluate(() => window.__CHOPDOT_CAPTURED_SHARE__?.url ?? '');
    expect(payerUrl).not.toBe(initialPayerUrl);
    const payerParams = new URL(payerUrl).searchParams;
    expect(payerParams.get('payRequest')).toBeTruthy();
    expect(payerParams.has('payUpdate')).toBe(false);
    await expect.poll(async () => {
      await relay.flush();
      return (await leo.frame.evaluate(readRedactedAuthorityJournal))[0]?.eventTypes;
    }, {timeout: 15_000}).toEqual([
      'GROUP_CREATED',
      'MEMBER_ADDED',
      'EXPENSE_ADDED',
      'SHARE_REQUESTED',
      'EXPENSE_ADDED',
      'SHARE_REQUESTED',
      'SHARE_REQUESTED',
    ]);

    await leo.server.close();
    leo.server = await createTruApiCompatibleTestHostServer({
      productUrl: payerUrl,
      accounts: ['bob'],
      productAccounts: {'chopdot-shell-proof.dot/0': 'bob'},
      networks: [PASEO_ASSET_HUB],
    });
    const payerHostUrl = new URL(leo.server.url);
    payerHostUrl.search = payerParams.toString();
    await leo.page.goto(payerHostUrl.toString());
    await expect.poll(() => leo.page.evaluate(() => window.__TEST_HOST__.getConnectionStatus())).toBe('connected');
    leo.frame = currentProductFrame(leo.page);
    expect(new URL(leo.frame.url()).searchParams.get('payRequest')).toBe(payerParams.get('payRequest'));
    await expect(leo.frame.getByRole('heading', {name: 'Pay Alice', level: 1})).toBeVisible();
    await expect(leo.frame.getByRole('heading', {name: 'Zurich dinner', level: 2})).toBeVisible();
    expect(await registerSharedConversation([leo], roomId, false)).toBe(roomId);
    await expect(leo.frame.getByText('$70.00', {exact: true})).toBeVisible();
    await expect(leo.frame.getByRole('button', {name: 'I paid Alice'})).toBeVisible();
    await expect(leo.frame.getByRole('button', {name: /Confirm received|Finish group|Add spend/u})).toHaveCount(0);

    await leo.frame.getByRole('button', {name: 'I paid Alice'}).click();
    await expect(leo.frame.getByRole('heading', {name: 'Zurich dinner'})).toBeVisible();
    await expect(leo.frame.getByText('Waiting for Alice', {exact: true}).first()).toBeVisible();
    const paymentRelay = createChatRelay(mina, leo);
    await expect.poll(async () => {
      await paymentRelay.flush();
      return (await mina.frame.evaluate(readRedactedAuthorityJournal))[0]?.eventTypes;
    }, {timeout: 15_000}).toEqual([
      'GROUP_CREATED',
      'MEMBER_ADDED',
      'EXPENSE_ADDED',
      'SHARE_REQUESTED',
      'EXPENSE_ADDED',
      'SHARE_REQUESTED',
      'SHARE_REQUESTED',
      'SHARE_MARKED_PAID',
      'SHARE_MARKED_PAID',
    ]);

    await expect(mina.frame.getByText('Needs confirm', {exact: true})).toBeVisible({timeout: 15_000});
    await expect(mina.frame.getByRole('button', {name: 'Confirm received from bob'})).toBeVisible();
    await mina.frame.getByRole('button', {name: 'Confirm received from bob'}).click();
    await expect(mina.frame.getByText('Everyone is settled up!', {exact: true})).toBeVisible();
    await expect.poll(async () => {
      await paymentRelay.flush();
      return (await leo.frame.evaluate(readRedactedAuthorityJournal))[0]?.eventTypes;
    }, {timeout: 15_000}).toEqual([
      'GROUP_CREATED',
      'MEMBER_ADDED',
      'EXPENSE_ADDED',
      'SHARE_REQUESTED',
      'EXPENSE_ADDED',
      'SHARE_REQUESTED',
      'SHARE_REQUESTED',
      'SHARE_MARKED_PAID',
      'SHARE_MARKED_PAID',
      'SHARE_RECEIVED',
      'SHARE_RECEIVED',
    ]);
    await expect(leo.frame.getByText('Settled', {exact: true}).last()).toBeVisible();
    await mina.frame.locator('#root').screenshot({
      path: path.join(evidenceRoot, 'normal-payment-receiver-confirmed.png'),
    });
    await leo.frame.locator('#root').screenshot({
      path: path.join(evidenceRoot, 'normal-payment-payer-confirmed.png'),
    });
  } finally {
    await closeParticipant(mina);
    await closeParticipant(leo);
  }
});

test('current TruAPI chat adapter preserves registration, message logging, and incoming actions', async ({browser}) => {
  const mina = await openParticipant(browser, 'alice');
  try {
    const roomId = await registerSharedConversation([mina], 'wave6-chat-adapter-room');
    const messageId = await mina.frame.evaluate(async input => {
      const sdkResource = performance.getEntriesByType('resource')
        .map(entry => entry.name)
        .reverse()
        .find(url => url.includes('@parity_product-sdk-host'));
      if (!sdkResource) throw new Error('Product SDK browser module was not loaded.');
      const sdk = await import(/* @vite-ignore */ sdkResource) as {
        getChatManager(): Promise<null | {
          sendMessage(roomId: string, payload: unknown): Promise<{messageId: string}>;
          subscribeAction(callback: (action: unknown) => void): {unsubscribe(): void};
        }>;
      };
      const manager = await sdk.getChatManager();
      if (!manager) throw new Error('Product host chat is unavailable.');
      manager.subscribeAction(action => { window.__CHOPDOT_CHAT_ACTION__ = action; });
      const posted = await manager.sendMessage(input, {
        tag: 'Custom',
        value: {messageType: 'chopdot.harness.v1', payload: '0x0102'},
      });
      return posted.messageId;
    }, roomId);

    expect(messageId).toBe('msg-1');
    await expect.poll(() => mina.page.evaluate(() => window.__TEST_HOST__.getChatMessageLog())).toEqual([
      expect.objectContaining({roomId, messageId: 'msg-1'}),
    ]);
    await mina.page.evaluate(input => window.__TEST_HOST__.injectChatAction({
      roomId: input,
      peer: 'bob',
      payload: {
        tag: 'MessagePosted',
        value: {tag: 'Custom', value: {messageType: 'chopdot.harness.v1', payload: '0x0304'}},
      },
    }), roomId);
    await expect.poll(() => mina.frame.evaluate(() => window.__CHOPDOT_CHAT_ACTION__)).toEqual({
      roomId,
      peer: 'bob',
      payload: {
        tag: 'MessagePosted',
        value: {tag: 'Custom', value: {messageType: 'chopdot.harness.v1', payload: '0x0304'}},
      },
    });
  } finally {
    await closeParticipant(mina);
  }
});

test('host entropy diagnostic preserves the raw Result boundary without exposing entropy', async ({browser}) => {
  const mina = await openParticipant(browser, 'alice');
  try {
    const diagnostic = await mina.frame.evaluate(async () => {
      const sdkResource = performance.getEntriesByType('resource')
        .map(entry => entry.name)
        .reverse()
        .find(url => url.includes('@parity_product-sdk-host'));
      if (!sdkResource) throw new Error('Product SDK browser module was not loaded.');

      const sdk = await import(/* @vite-ignore */ sdkResource) as {
        deriveEntropy(key: Uint8Array): Promise<{
          ok: true;
          value: Uint8Array;
        } | {
          ok: false;
          error: Error & {payload?: unknown};
        }>;
      };
      const envelopeModulePath = '/src/environment/accountBoundKeyEnvelope.ts';
      const envelopeModule = await import(/* @vite-ignore */ envelopeModulePath) as {
        accountBoundGroupKeyContext(metadata: {
          productId: string;
          groupId: string;
          recipientId: string;
          recipientAccountPublicKeyHex: string;
          keyVersion: number;
        }): Uint8Array;
        accountBoundGroupKeyEntropyContext(metadata: {
          productId: string;
          groupId: string;
          recipientId: string;
          recipientAccountPublicKeyHex: string;
          keyVersion: number;
        }): Promise<Uint8Array>;
      };

      const metadata = {
        productId: 'chopdot-shell-proof.dot',
        groupId: 'diagnostic-group',
        recipientId: 'diagnostic-account',
        recipientAccountPublicKeyHex: `0x${'00'.repeat(32)}`,
        keyVersion: 1,
      };
      const envelopeContext = envelopeModule.accountBoundGroupKeyContext(metadata);
      const entropyContext = await envelopeModule.accountBoundGroupKeyEntropyContext(metadata);

      const probe = async (key: Uint8Array) => {
        try {
          const result = await sdk.deriveEntropy(key);
          if (!('error' in result)) return {kind: 'ok' as const, inputLength: key.byteLength, outputLength: result.value.byteLength};
          const payload = result.error.payload;
          return {
            kind: 'result-error' as const,
            inputLength: key.byteLength,
            errorName: result.error.name,
            errorMessage: result.error.message,
            errorPayload: payload == null ? null : JSON.parse(JSON.stringify(payload)),
          };
        } catch (error) {
          return {
            kind: 'thrown-error' as const,
            inputLength: key.byteLength,
            errorName: error instanceof Error ? error.name : typeof error,
            errorMessage: error instanceof Error ? error.message : String(error),
          };
        }
      };

      return {
        sdkModulePath: new URL(sdkResource).pathname,
        thirtyTwoBytes: await probe(new Uint8Array(32).fill(7)),
        thirtyThreeBytes: await probe(new Uint8Array(33).fill(7)),
        chopDotEnvelopeContext: await probe(envelopeContext),
        chopDotEntropyContext: await probe(entropyContext),
      };
    });

    test.info().annotations.push({
      type: 'entropy-diagnostic',
      description: JSON.stringify(diagnostic),
    });
    expect(diagnostic.thirtyTwoBytes).toEqual({
      kind: 'ok',
      inputLength: 32,
      outputLength: 32,
    });
    expect(diagnostic.thirtyThreeBytes).toMatchObject({
      kind: 'thrown-error',
      inputLength: 33,
      errorName: 'Error',
    });
    expect(diagnostic.thirtyThreeBytes.errorMessage).toMatch(/^Unknown enum discriminant: \d+$/u);
    expect(diagnostic.chopDotEnvelopeContext).toMatchObject({
      kind: 'thrown-error',
      errorName: 'Error',
    });
    expect(diagnostic.chopDotEnvelopeContext.inputLength).toBeGreaterThan(32);
    expect(diagnostic.chopDotEnvelopeContext.errorMessage).toMatch(/^Unknown enum discriminant: \d+$/u);
    expect(diagnostic.chopDotEntropyContext).toEqual({kind: 'ok', inputLength: 32, outputLength: 32});

  } finally {
    await closeParticipant(mina);
  }
});

async function openParticipant(browser: Browser, account: DevAccountName): Promise<Participant> {
  const server = await createTruApiCompatibleTestHostServer({
    productUrl,
    accounts: [account],
    productAccounts: {'chopdot-shell-proof.dot/0': account},
    networks: [PASEO_ASSET_HUB],
  });
  const page = await browser.newPage({viewport: {width: 430, height: 932}});
  const diagnostics: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error' || message.type() === 'warning') diagnostics.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', error => diagnostics.push(`pageerror: ${error.name}: ${error.message}`));
  await page.goto(server.url);
  await expect.poll(() => page.evaluate(() => window.__TEST_HOST__.getConnectionStatus()), {timeout: 15_000}).toBe('connected');
  const frame = page.frames().find(candidate => candidate !== page.mainFrame());
  if (!frame) throw new Error(`${account} product frame did not attach.`);
  await frame.getByRole('button', {name: 'Continue with my account'}).click();
  await expect(frame.getByText(`Hey, ${account}`)).toBeVisible();
  return {account, server, page, frame, diagnostics};
}

async function closeParticipant(participant: Participant): Promise<void> {
  await participant.page.close();
  await participant.server.close();
}

function currentProductFrame(page: Page): Frame {
  const frame = page.frames().find(candidate => candidate !== page.mainFrame());
  if (!frame) throw new Error('Product frame did not attach.');
  return frame;
}

async function registerSharedConversation(participants: Participant[], roomId: string, requireHome = true): Promise<string> {
  for (const participant of participants) {
    let result: 'requested' | null = null;
    for (let attempt = 0; attempt < 3 && result === null; attempt += 1) {
      await participant.page.waitForTimeout(500);
      participant.frame = currentProductFrame(participant.page);
      if (requireHome) {
        await expect(participant.frame.getByText(new RegExp(`Hey, ${participant.account}`, 'iu'))).toBeVisible({timeout: 15_000});
      }
      try {
        result = await participant.frame.evaluate(async input => {
          const sdkResource = performance.getEntriesByType('resource')
            .map(entry => entry.name)
            .reverse()
            .find(url => url.includes('@parity_product-sdk-host'));
          if (!sdkResource) throw new Error('Product SDK browser module was not loaded.');
          const sdk = await import(/* @vite-ignore */ sdkResource) as {
            getChatManager(): Promise<null | {
              registerRoom(request: {roomId: string; name: string; icon: string}): Promise<'New' | 'Exists'>;
            }>;
          };
          const manager = await sdk.getChatManager();
          if (!manager) throw new Error('Product host chat is unavailable.');
          await manager.registerRoom({roomId: input, name: 'ChopDot acceptance', icon: ''});
          return 'requested' as const;
        }, roomId);
      } catch (error) {
        if (attempt === 2 || !/execution context was destroyed|navigation/iu.test(error instanceof Error ? error.message : String(error))) throw error;
      }
    }
    if (!result) throw new Error(`${participant.account} could not register the shared conversation.`);
    expect(result).toBe('requested');
    await expect.poll(
      () => participant.page.evaluate(expected => window.__TEST_HOST__.getChatRooms().some(room => room.roomId === expected), roomId),
      {timeout: 5_000},
    ).toBe(true);
    const currentRooms = await readCurrentChatSubscription(participant);
    test.info().annotations.push({
      type: `chat-list-${participant.account}`,
      description: JSON.stringify({currentRooms, diagnostics: participant.diagnostics}),
    });
    expect(currentRooms.map(room => room.roomId)).toContain(roomId);
  }
  return roomId;
}

async function readCurrentChatSubscription(participant: Participant): Promise<Array<{roomId: string; participatingAs: string}>> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    participant.frame = currentProductFrame(participant.page);
    try {
      return await participant.frame.evaluate(async () => {
        const sdkResource = performance.getEntriesByType('resource')
          .map(entry => entry.name)
          .reverse()
          .find(url => url.includes('@parity_product-sdk-host'));
        if (!sdkResource) throw new Error('Product SDK browser module was not loaded.');
        const sdk = await import(/* @vite-ignore */ sdkResource) as {
          getChatManager(): Promise<null | {
            subscribeChatList(callback: (rooms: Array<{roomId: string; participatingAs: string}>) => void): {unsubscribe(): void};
          }>;
        };
        const manager = await sdk.getChatManager();
        if (!manager) throw new Error('Product host chat is unavailable.');
        return new Promise<Array<{roomId: string; participatingAs: string}>>(resolve => {
          let subscription: {unsubscribe(): void} | undefined;
          const timeout = window.setTimeout(() => {
            subscription?.unsubscribe();
            resolve([]);
          }, 3_000);
          subscription = manager.subscribeChatList(rooms => {
            window.clearTimeout(timeout);
            subscription?.unsubscribe();
            resolve(rooms);
          });
        });
      });
    } catch (error) {
      if (attempt === 2 || !/execution context was destroyed|navigation/iu.test(error instanceof Error ? error.message : String(error))) throw error;
      await participant.page.waitForTimeout(500);
    }
  }
  return [];
}

function createChatRelay(left: Participant, right: Participant): {flush(): Promise<number>} {
  let leftCursor = 0;
  let rightCursor = 0;
  const relayOneDirection = async (source: Participant, target: Participant, from: number) => {
    const messages = await source.page.evaluate(() => window.__TEST_HOST__.getChatMessageLog());
    for (const message of messages.slice(from)) {
      await target.page.evaluate(input => window.__TEST_HOST__.injectChatAction({
        roomId: input.roomId,
        peer: input.peer,
        payload: {tag: 'MessagePosted', value: input.payload},
      }), {roomId: message.roomId, peer: source.account, payload: message.payload});
    }
    return messages.length;
  };
  return {
    async flush() {
      let delivered = 0;
      for (let round = 0; round < 20; round += 1) {
        const nextLeftCursor = await relayOneDirection(left, right, leftCursor);
        const nextRightCursor = await relayOneDirection(right, left, rightCursor);
        const roundDelivered = nextLeftCursor - leftCursor + nextRightCursor - rightCursor;
        leftCursor = nextLeftCursor;
        rightCursor = nextRightCursor;
        delivered += roundDelivered;
        if (roundDelivered === 0) return delivered;
        await left.page.waitForTimeout(50);
      }
      throw new Error('Chat relay did not become idle within 20 rounds.');
    },
  };
}

async function verifyContactPair(initiator: Participant, responder: Participant): Promise<void> {
  await Promise.all([openContactCeremony(initiator), openContactCeremony(responder)]);

  await initiator.frame.getByRole('button', {name: 'Start verification'}).click();
  const offer = await copyCarrier(initiator, 'Copy secure link');
  await followContactCarrier(responder, offer);
  await expect(responder.frame.getByRole('heading', {name: new RegExp(`${initiator.account} wants to verify with you`, 'iu')})).toBeVisible();

  await responder.frame.getByRole('button', {name: 'Continue to the code'}).click();
  const response = await copyCarrier(responder, 'First, send your signed reply');
  await followContactCarrier(initiator, response);

  const initiatorCode = (await initiator.frame.getByLabel('Six-digit contact safety code').textContent())?.trim();
  const responderCode = (await responder.frame.getByLabel('Six-digit contact safety code').textContent())?.trim();
  expect(initiatorCode?.replaceAll(/\s/gu, '')).toMatch(/^\d{6}$/u);
  expect(responderCode?.replaceAll(/\s/gu, '')).toBe(initiatorCode?.replaceAll(/\s/gu, ''));

  await initiator.frame.getByRole('button', {name: 'The codes match'}).click();
  await responder.frame.getByRole('button', {name: 'The codes match'}).click();
  const initiatorConfirmation = await copyCarrier(initiator, 'Copy secure link');
  const responderConfirmation = await copyCarrier(responder, 'Copy secure link');
  await followContactCarrier(initiator, responderConfirmation);
  await followContactCarrier(responder, initiatorConfirmation);

  await expect(initiator.frame.getByRole('heading', {name: new RegExp(`${responder.account} is verified`, 'iu')})).toBeVisible();
  await expect(responder.frame.getByRole('heading', {name: new RegExp(`${initiator.account} is verified`, 'iu')})).toBeVisible();
  await initiator.frame.getByRole('button', {name: 'Back'}).click();
  await responder.frame.getByRole('button', {name: 'Back'}).click();
  await expect(initiator.frame.getByText(new RegExp(`Hey, ${initiator.account}`, 'iu'))).toBeVisible();
  await expect(responder.frame.getByText(new RegExp(`Hey, ${responder.account}`, 'iu'))).toBeVisible();
}

async function openContactCeremony(participant: Participant): Promise<void> {
  participant.frame = currentProductFrame(participant.page);
  await participant.frame.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => { window.__CHOPDOT_TEST_CLIPBOARD__ = value; },
      },
    });
  });
  await participant.frame.getByRole('button', {name: 'Friends'}).click();
  await expect(participant.frame.getByRole('heading', {name: 'Verify a person'})).toBeVisible();
  await participant.frame.getByRole('button', {name: 'Use my account'}).click();
  await expect(participant.frame.getByRole('heading', {name: 'Verify someone you know'})).toBeVisible();
}

async function installShareCapture(participant: Participant): Promise<void> {
  const install = () => {
    window.__CHOPDOT_CAPTURED_SHARE__ = undefined;
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (value: {url?: string}) => {
        window.__CHOPDOT_CAPTURED_SHARE__ = value;
      },
    });
  };
  await participant.page.addInitScript(install);
  await participant.frame.evaluate(install);
}

async function copyCarrier(participant: Participant, buttonName: string): Promise<string> {
  await participant.frame.evaluate(() => { window.__CHOPDOT_TEST_CLIPBOARD__ = undefined; });
  await participant.frame.getByRole('button', {name: buttonName}).click();
  const value = await participant.frame.evaluate(() => window.__CHOPDOT_TEST_CLIPBOARD__ ?? '');
  expect(value).toContain('chopdot-contact=');
  return value;
}

async function followContactCarrier(participant: Participant, carrier: string): Promise<void> {
  await participant.frame.evaluate(value => {
    window.location.hash = new URL(value).hash;
  }, carrier);
}

async function leaveBoundedEntry(participant: Participant): Promise<void> {
  await participant.frame.evaluate(() => {
    const prior = window.location.href;
    history.replaceState(null, '', `${location.pathname}${location.search}`);
    window.dispatchEvent(new HashChangeEvent('hashchange', {oldURL: prior, newURL: window.location.href}));
  });
  await expect(participant.frame.getByText(new RegExp(`Hey, ${participant.account}`, 'iu'))).toBeVisible();
}

async function inviteAcceptedMember(input: {
  organizer: Participant;
  invitee: Participant;
  relay: {flush(): Promise<number>};
  groupName: string;
}): Promise<void> {
  const {organizer, invitee, relay, groupName} = input;
  const manageMembers = organizer.frame.getByRole('button', {name: 'Manage members'});
  if (await manageMembers.count()) await manageMembers.click();
  await expect(organizer.frame.getByRole('button', {name: 'Invite a member'})).toBeVisible();
  await organizer.frame.getByRole('button', {name: 'Invite a member'}).click();

  const contact = organizer.frame.getByLabel('Choose a verified person');
  const conversation = organizer.frame.getByLabel('Choose a conversation');
  await expect(contact.locator('option:checked')).toHaveText(new RegExp(invitee.account, 'iu'));
  await expect(conversation.locator('option:checked')).toContainText('Conversation');
  await expect(organizer.frame.getByRole('button', {name: 'Invite this person'})).toBeEnabled();
  await organizer.frame.getByRole('button', {name: 'Invite this person'}).click();

  await expect(organizer.frame.getByRole('heading', {name: 'Invite this person'})).toBeVisible();
  await organizer.frame.getByRole('button', {name: 'Invite this person'}).click();
  await expect(organizer.frame.getByRole('heading', {name: 'How should they join?'})).toBeVisible();
  const beforeShareUrl = organizer.frame.url();
  await organizer.frame.getByRole('button', {name: 'Share invitation'}).click();
  await organizer.page.waitForTimeout(250);
  test.info().annotations.push({
    type: 'invitation-create-navigation',
    description: JSON.stringify({
      beforeShareUrl,
      afterShareUrl: organizer.frame.url(),
      headings: await organizer.frame.getByRole('heading').allTextContents(),
      diagnostics: organizer.diagnostics,
    }),
  });
  const invitation = organizer.frame.locator('[data-invitation-url]');
  if (await invitation.count() === 0) {
    await organizer.frame.locator('#root').screenshot({
      path: path.join(evidenceRoot, 'savings-invite-carrier-blocked.png'),
    });
  }
  await expect(invitation).toBeVisible();
  const invitationUrl = await invitation.getAttribute('data-invitation-url');
  expect(invitationUrl).toContain('chopdot-invite=');
  await organizer.frame.getByRole('button', {name: 'I’ve shared it'}).click();
  await expect(organizer.frame.getByRole('heading', {name: 'Waiting for this person'})).toBeVisible();

  await invitee.frame.evaluate(value => { window.location.hash = new URL(value).hash; }, invitationUrl!);
  await expect(invitee.frame.getByRole('heading', {name: 'Join this group?'})).toBeVisible({timeout: 15_000});
  await invitee.frame.getByRole('button', {name: 'Accept invite'}).click();
  await expect(invitee.frame.getByRole('heading', {name: 'Waiting for the organizer'})).toBeVisible();

  await expect.poll(async () => {
    await relay.flush();
    return organizer.frame.getByRole('button', {name: 'Add this person'}).count();
  }, {timeout: 15_000}).toBe(1);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (await organizer.frame.getByRole('heading', {name: /this person joined/iu}).count()) break;
    const add = organizer.frame.getByRole('button', {name: 'Add this person'});
    if (await add.count()) await add.click();
    await organizer.page.waitForTimeout(100);
    await relay.flush();
    await organizer.page.waitForTimeout(100);
  }
  await expect(organizer.frame.getByRole('heading', {name: /this person joined/iu})).toBeVisible({timeout: 15_000});
  await expect(invitee.frame.getByRole('heading', {name: 'You joined'})).toBeVisible({timeout: 15_000});

  await organizer.frame.getByRole('button', {name: 'Back to group'}).click();
  await expect(organizer.frame.getByRole('heading', {name: groupName})).toBeVisible();
}
