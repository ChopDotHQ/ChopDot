import assert from 'node:assert/strict';
import test from 'node:test';
import {createCleanState, reducer, type Action} from '../state/store.ts';
import type {AppState, Expense, Group, Split, User} from '../types.ts';
import {
  authorizeSharedAction,
  connectHostSession,
  compactSharedActionChunks,
  decodeCompactSessionNotification,
  encodeCompactSessionNotification,
  createSharedEnvelope,
  isSharedAction,
  participantIdFromPublicKey,
  signerMatchesEnvelope,
  sharedActionFromCompactChunks,
  type HostParticipant,
  type SharedActionEnvelope,
} from './hostSessionSync.ts';

const minaKey = `0x${'11'.repeat(32)}`;
const leoKey = `0x${'22'.repeat(32)}`;
const minaId = participantIdFromPublicKey(minaKey);
const leoId = participantIdFromPublicKey(leoKey);

const mina: HostParticipant = {userId: minaId, publicKeyHex: minaKey, username: 'alice'};
const leo: HostParticipant = {userId: leoId, publicKeyHex: leoKey, username: 'bob'};

function boundState(): AppState {
  const users: User[] = [
    {id: minaId, name: 'Mina', accountPublicKeyHex: minaKey},
    {id: leoId, name: 'Leo', accountPublicKeyHex: leoKey},
  ];
  const group: Group = {id: 'g-friday', name: 'Friday Crew', memberIds: users.map(user => user.id)};
  const expense: Expense = {
    id: 'e-dinner',
    groupId: group.id,
    description: 'Dinner',
    amount: 100,
    paidByUserId: minaId,
    date: '2026-07-14T18:00:00.000Z',
  };
  const splits: Split[] = [
    {id: 's-mina', expenseId: expense.id, userId: minaId, amount: 50, status: 'confirmed'},
    {id: 's-leo', expenseId: expense.id, userId: leoId, amount: 50, status: 'open'},
  ];
  let state = createCleanState();
  for (const user of users) state = reducer(state, {type: 'ADD_USER', payload: {user}});
  state = reducer(state, {type: 'CREATE_GROUP', payload: {group}});
  state = reducer(state, {type: 'ADD_EXPENSE', payload: {expense, splits}});
  state = reducer(state, {type: 'SEND_REQUEST', payload: {splitId: 's-leo'}});
  return state;
}

function envelope(action: Action, participant: HostParticipant): SharedActionEnvelope {
  assert.equal(isSharedAction(action), true);
  return createSharedEnvelope(action as never, participant);
}

test('host participant IDs are stable and scoped to the product public key', () => {
  assert.equal(participantIdFromPublicKey(minaKey), minaId);
  assert.notEqual(minaId, leoId);
});

test('signer must match the actor key carried inside the encrypted envelope', () => {
  const event = envelope({type: 'MARK_PAID', payload: {splitId: 's-leo', userId: leoId}}, leo);
  const state = boundState();
  state.users[leoId].statementSignerHex = leoKey;
  assert.equal(signerMatchesEnvelope(event, leoKey, state), true);
  assert.equal(signerMatchesEnvelope(event, minaKey, state), false);
  assert.equal(signerMatchesEnvelope(event, undefined, state), false);
});

test('Leo may mark only Leo payment and Mina may confirm only received money', () => {
  const state = boundState();
  assert.equal(authorizeSharedAction(
    state,
    envelope({type: 'MARK_PAID', payload: {splitId: 's-leo', userId: leoId}}, leo),
  ), 'apply');
  assert.equal(authorizeSharedAction(
    state,
    envelope({type: 'MARK_PAID', payload: {splitId: 's-leo', userId: leoId}}, mina),
  ), 'reject');
  assert.equal(authorizeSharedAction(
    state,
    envelope({type: 'CONFIRM_RECEIVED', payload: {splitId: 's-leo', currentUserId: minaId}}, mina),
  ), 'apply');
  assert.equal(authorizeSharedAction(
    state,
    envelope({type: 'CONFIRM_RECEIVED', payload: {splitId: 's-leo', currentUserId: leoId}}, leo),
  ), 'reject');
});

test('dependent actions defer until their referenced state exists', () => {
  assert.equal(authorizeSharedAction(
    createCleanState(),
    envelope({type: 'MARK_PAID', payload: {splitId: 's-leo', userId: leoId}}, leo),
  ), 'defer');
});

test('matched payment defers until payer and receiver wallet bindings have arrived', () => {
  const state = boundState();
  const action: Action = {
    type: 'RECORD_MATCHED_PAYMENT',
    payload: {
      splitId: 's-leo',
      userId: leoId,
      receiverUserId: minaId,
      receipt: {
        txHash: `0x${'ab'.repeat(32)}`,
        chainId: '0x190f1b41',
        from: '0x2222222222222222222222222222222222222222',
        to: '0x1111111111111111111111111111111111111111',
        amountBaseUnits: '50000000000000000000',
        blockNumber: '0x10',
        confirmedAt: '2026-07-15T10:00:00.000Z',
      },
    },
  };
  assert.equal(authorizeSharedAction(state, envelope(action, leo)), 'defer');
  state.users[leoId].walletAddress = action.payload.receipt.from;
  state.users[minaId].walletAddress = action.payload.receipt.to;
  assert.equal(authorizeSharedAction(state, envelope(action, leo)), 'apply');
});

test('self registration requires the account key matching the event signer', () => {
  const action: Action = {
    type: 'ADD_USER',
    payload: {user: {id: leoId, name: 'Leo', accountPublicKeyHex: leoKey}},
  };
  const registration = envelope(action, leo);
  assert.equal(signerMatchesEnvelope(registration, `0x${'33'.repeat(32)}`, createCleanState()), true);
  assert.equal(authorizeSharedAction(createCleanState(), registration), 'apply');
  assert.equal(signerMatchesEnvelope(envelope(action, mina), `0x${'33'.repeat(32)}`, createCleanState()), false);
  assert.equal(authorizeSharedAction(createCleanState(), envelope(action, mina)), 'reject');
});

test('device-local actions never enter the shared action stream', () => {
  assert.equal(isSharedAction({type: 'SET_CURRENT_USER', payload: {userId: leoId}}), false);
  assert.equal(isSharedAction({type: 'SET_THEME', payload: {theme: 'dark'}}), false);
  assert.equal(isSharedAction({type: 'SET_CURRENCY', payload: {currency: 'CHF'}}), false);
  assert.equal(isSharedAction({type: 'MARK_PAID', payload: {splitId: 's-leo', userId: leoId}}), true);
});

test('large shared actions use a bounded compact wire and round-trip exactly', async () => {
  const expenseId = crypto.randomUUID();
  const action: Action = {
    type: 'ADD_EXPENSE',
    payload: {
      expense: {
        id: expenseId,
        groupId: crypto.randomUUID(),
        description: 'Dinner at La Cabrera',
        amount: 184.5,
        paidByUserId: minaId,
        date: '2026-08-13T18:00:00.000Z',
      },
      splits: Array.from({length: 3}, (_, index) => ({
        id: crypto.randomUUID(),
        expenseId,
        userId: index === 0 ? minaId : crypto.randomUUID(),
        amount: 61.5,
        status: 'open' as const,
      })),
    },
  };
  const original = envelope(action, mina);
  const chunks = await compactSharedActionChunks(original);
  assert.ok(chunks.length <= 4);
  assert.deepEqual(await sharedActionFromCompactChunks([...chunks].reverse()), original);
});

test('latest-status notifications use a compact reversible wire', () => {
  const notification = {
    v: 1 as const,
    g: crypto.randomUUID(),
    u: crypto.randomUUID(),
    c: 3,
    s: crypto.randomUUID(),
    t: 1_786_642_400,
  };
  const wire = encodeCompactSessionNotification(notification);
  assert.ok(new TextEncoder().encode(wire).length < 100);
  assert.deepEqual(decodeCompactSessionNotification(wire), notification);
  assert.equal(decodeCompactSessionNotification(`${wire}x`), null);
});

test('post-sign refresh retires the old subscription before opening its replacement', async () => {
  const calls: string[] = [];
  let channelNumber = 0;
  let openChannels = 0;
  const bridge = {
    requestIdentity: async () => ({
      username: 'payer',
      productId: 'app.chopdotproof02.dot',
      publicKey: new Uint8Array(32).fill(7),
      accountId: ['unused', 42] as [string, number],
      signBytes: async () => new Uint8Array(64).fill(9),
    }),
    openSessionChannel: async () => {
      const id = ++channelNumber;
      calls.push(`open:${id}`);
      openChannels += 1;
      assert.equal(openChannels, 1, 'refresh must not overlap Statement Store subscriptions');
      let channelClosed = false;
      return {
        preparePublish: async () => true,
        publish: async () => true,
        close: () => {
          if (channelClosed) return;
          channelClosed = true;
          openChannels -= 1;
          calls.push(`close:${id}`);
        },
      };
    },
  };

  const connection = await connectHostSession({
    config: {roomId: 'room-1', secret: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'},
    onEnvelope: () => undefined,
    bridge: bridge as never,
  });
  await connection.refreshPublishTransport();
  connection.close();

  assert.deepEqual(calls, ['open:1', 'close:1', 'open:2', 'close:2']);
});

test('self registration uses one replaceable compact statement and reconstructs the actor envelope', async () => {
  let channelName = '';
  let received: SharedActionEnvelope | undefined;
  let resolveReceived!: (envelope: SharedActionEnvelope) => void;
  const receivedPromise = new Promise<SharedActionEnvelope>(resolve => { resolveReceived = resolve; });
  const signerHex = `0x${'44'.repeat(32)}`;
  const bridge = {
    requestIdentity: async () => ({
      username: 'mina',
      productId: 'chopdot-shell-proof.dot',
      publicKey: new Uint8Array(32).fill(7),
      accountId: ['unused', 42] as [string, number],
    }),
    openSessionChannel: async ({onPacket}: {onPacket: (packet: never, signer?: string) => void}) => ({
      preparePublish: async () => true,
      publish: async (packet: never, name?: string) => {
        channelName = name ?? '';
        onPacket(packet, signerHex);
        return true;
      },
      close: () => undefined,
    }),
  };
  const connection = await connectHostSession({
    config: {roomId: 'compact-registration', secret: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'},
    onEnvelope: envelope => {
      if ('action' in envelope) {
        received = envelope;
        resolveReceived(envelope);
      }
    },
    bridge: bridge as never,
  });
  const user = {
    id: connection.participant.userId,
    name: 'Mina',
    accountPublicKeyHex: connection.participant.publicKeyHex,
  };
  await connection.publish(createSharedEnvelope({type: 'ADD_USER', payload: {user}}, connection.participant));
  await Promise.race([
    receivedPromise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timed out waiting for compact registration.')), 500)),
  ]);

  assert.equal(channelName, `registration/${connection.participant.userId}`);
  assert.equal(received?.action.type, 'ADD_USER');
  assert.deepEqual(received?.action.type === 'ADD_USER' ? received.action.payload.user : undefined, user);
});
