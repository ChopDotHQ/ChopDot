import {decryptSessionValue, encryptSessionValue, type EncryptedSessionPacket} from './encryptedSession.ts';
import type {PolkadotHostBridge, PolkadotHostIdentity} from './polkadotHostBridge.ts';

export type NativeHostReadinessStage =
  | 'container'
  | 'identity'
  | 'service'
  | 'allowance'
  | 'publish'
  | 'readback';

export interface NativeHostReadinessReport {
  checkedAt: string;
  productId: string;
  status: 'ready' | 'blocked';
  completedStages: NativeHostReadinessStage[];
  failedStage?: NativeHostReadinessStage;
  detail?: string;
  canaryBytes?: number;
}

type ReadinessBridge = Pick<PolkadotHostBridge, 'productId' | 'probe' | 'requestIdentity' | 'openSessionChannel'>;

const DEFAULT_TIMEOUT_MS = 8_000;
const READINESS_SECRET = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

function detail(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason || 'Host readiness check failed.');
}

function blocked(
  bridge: ReadinessBridge,
  completedStages: NativeHostReadinessStage[],
  failedStage: NativeHostReadinessStage,
  reason: unknown,
  canaryBytes?: number,
): NativeHostReadinessReport {
  return {
    checkedAt: new Date().toISOString(),
    productId: bridge.productId,
    status: 'blocked',
    completedStages,
    failedStage,
    detail: detail(reason),
    ...(canaryBytes === undefined ? {} : {canaryBytes}),
  };
}

function timeoutAfter(milliseconds: number): Promise<false> {
  return new Promise(resolve => setTimeout(() => resolve(false), milliseconds));
}

export async function runNativeHostReadinessCheck(
  bridge: ReadinessBridge,
  {timeoutMs = DEFAULT_TIMEOUT_MS}: {timeoutMs?: number} = {},
): Promise<NativeHostReadinessReport> {
  const completedStages: NativeHostReadinessStage[] = [];
  let identity: PolkadotHostIdentity;
  let channel: Awaited<ReturnType<ReadinessBridge['openSessionChannel']>> | undefined;

  const capability = await bridge.probe();
  if (!capability.insideContainer) {
    return blocked(bridge, completedStages, 'container', capability.identity.detail ?? 'Compatible host unavailable.');
  }
  completedStages.push('container');

  try {
    identity = await bridge.requestIdentity();
  } catch (reason) {
    return blocked(bridge, completedStages, 'identity', reason);
  }
  completedStages.push('identity');

  if (capability.sharedSession.state !== 'available') {
    return blocked(
      bridge,
      completedStages,
      'service',
      capability.sharedSession.detail ?? 'Statement Store service unavailable.',
    );
  }
  completedStages.push('service');

  const nonce = crypto.randomUUID();
  const groupId = `chopdot-readiness-${nonce}`;
  const canary = {
    kind: 'chopdot-native-readiness-canary',
    nonce,
    sentAt: new Date().toISOString(),
  };
  let resolveReadback: (observed: boolean) => void = () => undefined;
  const readback = new Promise<boolean>(resolve => {
    resolveReadback = resolve;
  });

  try {
    channel = await bridge.openSessionChannel({
      identity,
      groupId,
      secret: READINESS_SECRET,
      onPacket: (packet: EncryptedSessionPacket) => {
        void decryptSessionValue(READINESS_SECRET, packet).then(value => {
          if (
            value && typeof value === 'object'
            && 'kind' in value && value.kind === canary.kind
            && 'nonce' in value && value.nonce === nonce
          ) {
            resolveReadback(true);
          }
        }).catch(() => undefined);
      },
    });
  } catch (reason) {
    return blocked(bridge, completedStages, 'service', reason);
  }

  try {
    if (!(await channel.preparePublish())) {
      return blocked(bridge, completedStages, 'allowance', 'Statement Store allowance was not allocated.');
    }
    completedStages.push('allowance');

    const packet = await encryptSessionValue(READINESS_SECRET, canary);
    const canaryBytes = new TextEncoder().encode(JSON.stringify(packet)).byteLength;
    if (!(await channel.publish(packet, `readiness/${nonce}`))) {
      return blocked(bridge, completedStages, 'publish', 'Statement Store rejected the canary.', canaryBytes);
    }
    completedStages.push('publish');

    const observed = await Promise.race([readback, timeoutAfter(timeoutMs)]);
    if (!observed) {
      return blocked(bridge, completedStages, 'readback', 'Published canary was not observed before the deadline.', canaryBytes);
    }
    completedStages.push('readback');

    return {
      checkedAt: new Date().toISOString(),
      productId: bridge.productId,
      status: 'ready',
      completedStages,
      canaryBytes,
    };
  } catch (reason) {
    const failedStage: NativeHostReadinessStage = completedStages.includes('allowance') ? 'publish' : 'allowance';
    return blocked(bridge, completedStages, failedStage, reason);
  } finally {
    channel.close();
  }
}

