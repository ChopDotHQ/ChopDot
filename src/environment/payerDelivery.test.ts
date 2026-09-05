import assert from 'node:assert/strict';
import test from 'node:test';
import {
  publishPendingPayerAction,
  publishPendingReceiptConfirmation,
} from './payerDelivery.ts';
import type {HostSessionConnection} from './hostSessionSync.ts';
import type {PendingPayerAction} from './livePayerSync.ts';

const action: PendingPayerAction = {
  eventId: 'evt-1',
  requestId: 'req-1',
  groupId: 'group-1',
  memberId: 'member-1',
  amount: 5,
  currency: 'USD',
  memberCapability: 'capability-1',
  roomId: 'room-1',
  secret: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  occurredAt: '2026-08-10T08:00:00.000Z',
  expiresAt: '2026-08-11T08:00:00.000Z',
};

function fakeConnection({
  prepared,
  calls,
}: {
  prepared: boolean;
  calls: string[];
}): HostSessionConnection {
  return {
    participant: {
      userId: 'u-host-payer',
      publicKeyHex: `0x${'11'.repeat(32)}`,
      username: 'payer',
    },
    preparePublish: async () => {
      calls.push('prepare');
      return prepared;
    },
    signBytes: async () => {
      calls.push('sign');
      return new Uint8Array(64).fill(7);
    },
    refreshPublishTransport: async () => {
      calls.push('refresh');
    },
    publish: async () => {
      calls.push('publish');
      return true;
    },
    close: () => {
      calls.push('close');
    },
  };
}

test('payer delivery preflights allowance before signing and publishing', async () => {
  const calls: string[] = [];
  const connection = fakeConnection({prepared: true, calls});

  assert.equal(await publishPendingPayerAction(action, async () => connection), true);
  assert.deepEqual(calls, ['prepare', 'sign', 'refresh', 'publish', 'close']);
});

test('organizer confirmation refreshes the host transport after signing and before publishing', async () => {
  const calls: string[] = [];
  const connection = fakeConnection({prepared: true, calls});

  assert.equal(await publishPendingReceiptConfirmation(action, async () => connection), true);
  assert.deepEqual(calls, ['prepare', 'sign', 'refresh', 'publish', 'close']);
});

test('rejected allowance never asks for a signature or publishes', async () => {
  const calls: string[] = [];
  const connection = fakeConnection({prepared: false, calls});

  assert.equal(await publishPendingReceiptConfirmation(action, async () => connection), false);
  assert.deepEqual(calls, ['prepare', 'close']);
});

test('a stalled organizer publish times out, closes the connection, and remains retryable', async () => {
  const calls: string[] = [];
  const connection = fakeConnection({prepared: true, calls});
  connection.publish = async () => {
    calls.push('publish');
    return await new Promise<boolean>(() => undefined);
  };

  await assert.rejects(
    publishPendingReceiptConfirmation(action, async () => connection, 5),
    /timed out before the host confirmed delivery/u,
  );
  assert.deepEqual(calls, ['prepare', 'sign', 'refresh', 'publish', 'close']);
});

test('a disposed pre-sign host transport is replaced before organizer publish', async () => {
  const calls: string[] = [];
  let transport: 'pre-sign' | 'fresh' = 'pre-sign';
  const connection = fakeConnection({prepared: true, calls});
  connection.signBytes = async () => {
    calls.push('sign');
    return new Uint8Array(64).fill(7);
  };
  connection.refreshPublishTransport = async () => {
    calls.push('refresh');
    transport = 'fresh';
  };
  connection.publish = async () => {
    calls.push(`publish:${transport}`);
    if (transport === 'pre-sign') throw new Error('Transport is disposed');
    return true;
  };

  assert.equal(await publishPendingReceiptConfirmation(action, async () => connection), true);
  assert.deepEqual(calls, ['prepare', 'sign', 'refresh', 'publish:fresh', 'close']);
});

test('a disposed pre-sign host transport is replaced before payer publish', async () => {
  const calls: string[] = [];
  let transport: 'pre-sign' | 'fresh' = 'pre-sign';
  const connection = fakeConnection({prepared: true, calls});
  connection.signBytes = async () => {
    calls.push('sign');
    return new Uint8Array(64).fill(7);
  };
  connection.refreshPublishTransport = async () => {
    calls.push('refresh');
    transport = 'fresh';
  };
  connection.publish = async () => {
    calls.push(`publish:${transport}`);
    if (transport === 'pre-sign') throw new Error('Transport is disposed');
    return true;
  };

  assert.equal(await publishPendingPayerAction(action, async () => connection), true);
  assert.deepEqual(calls, ['prepare', 'sign', 'refresh', 'publish:fresh', 'close']);
});
