import assert from 'node:assert/strict';
import test from 'node:test';
import type {EncryptedSessionPacket} from './encryptedSession.ts';
import {runNativeHostReadinessCheck} from './nativeHostReadiness.ts';
import type {PolkadotHostBridge, PolkadotHostIdentity} from './polkadotHostBridge.ts';

const identity: PolkadotHostIdentity = {
  username: 'mina',
  productId: 'chopdotproof02.dot',
  publicKey: new Uint8Array(32).fill(7),
  accountId: ['5FakeAccount', 42],
};

function bridge({
  insideContainer = true,
  sharedSession = true,
  allowance = true,
  publish = true,
  echo = true,
}: {
  insideContainer?: boolean;
  sharedSession?: boolean;
  allowance?: boolean;
  publish?: boolean;
  echo?: boolean;
} = {}): Pick<PolkadotHostBridge, 'productId' | 'probe' | 'requestIdentity' | 'openSessionChannel'> {
  return {
    productId: 'chopdotproof02.dot',
    probe: async () => ({
      checkedAt: new Date().toISOString(),
      productId: 'chopdotproof02.dot',
      insideContainer,
      identity: insideContainer ? {state: 'available'} : {state: 'unavailable'},
      sharedSession: sharedSession ? {state: 'available'} : {state: 'unavailable'},
      payments: {state: 'unavailable'},
      receiptArchive: {state: 'unavailable'},
    }),
    requestIdentity: async () => identity,
    openSessionChannel: async ({onPacket}) => ({
      preparePublish: async () => allowance,
      publish: async (packet: EncryptedSessionPacket) => {
        if (publish && echo) queueMicrotask(() => onPacket(packet));
        return publish;
      },
      close() {},
    }),
  };
}

test('native readiness requires container, allowance, publish and readback', async () => {
  const report = await runNativeHostReadinessCheck(bridge(), {timeoutMs: 50});
  assert.equal(report.status, 'ready');
  assert.deepEqual(report.completedStages, ['container', 'identity', 'service', 'allowance', 'publish', 'readback']);
  assert.ok((report.canaryBytes ?? 513) <= 512);
});

test('native readiness stops before publish when allowance is unavailable', async () => {
  const report = await runNativeHostReadinessCheck(bridge({allowance: false}), {timeoutMs: 50});
  assert.equal(report.status, 'blocked');
  assert.equal(report.failedStage, 'allowance');
  assert.equal(report.completedStages.includes('publish'), false);
});

test('native readiness distinguishes a rejected publish', async () => {
  const report = await runNativeHostReadinessCheck(bridge({publish: false}), {timeoutMs: 50});
  assert.equal(report.status, 'blocked');
  assert.equal(report.failedStage, 'publish');
  assert.equal(report.completedStages.includes('allowance'), true);
});

test('native readiness does not call accepted publication ready without readback', async () => {
  const report = await runNativeHostReadinessCheck(bridge({echo: false}), {timeoutMs: 5});
  assert.equal(report.status, 'blocked');
  assert.equal(report.failedStage, 'readback');
  assert.equal(report.completedStages.includes('publish'), true);
});

test('native readiness reports missing host before identity or product actions', async () => {
  const report = await runNativeHostReadinessCheck(bridge({insideContainer: false}), {timeoutMs: 5});
  assert.equal(report.status, 'blocked');
  assert.equal(report.failedStage, 'container');
  assert.deepEqual(report.completedStages, []);
});

