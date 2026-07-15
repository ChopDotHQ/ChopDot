import {decryptSessionValue, encryptSessionValue, type EncryptedSessionPacket} from './encryptedSession.ts';
import {
  PolkadotHostBridge,
  type ObservedHostPayment,
  type PolkadotHostCapabilityReport,
  type PolkadotHostIdentity,
  type RedactedReceiptPacket,
} from './polkadotHostBridge.ts';

interface HostDeveloperIdentity {
  username: string;
  productId: string;
  accountId: [string, number];
}

interface HostDeveloperActions {
  requestIdentity(): Promise<HostDeveloperIdentity>;
  connectSession(groupId: string, secret: string): Promise<void>;
  publishSessionValue(value: unknown): Promise<boolean>;
  receivedSessionValues(): unknown[];
  requestPayment(amount: string, destinationHex: string): Promise<string>;
  observedPayments(): ObservedHostPayment[];
  saveRedactedReceipt(receipt: RedactedReceiptPacket): Promise<string>;
  close(): void;
}

declare global {
  interface Window {
    __CHOPDOT_HOST_CAPABILITIES__?: PolkadotHostCapabilityReport;
    __CHOPDOT_HOST_ACTIONS__?: HostDeveloperActions;
  }
}

function bytesFromHex(value: string): Uint8Array {
  const normalized = value.startsWith('0x') ? value.slice(2) : value;
  if (!/^[0-9a-f]{64}$/iu.test(normalized)) throw new Error('A 32-byte destination is required.');
  return Uint8Array.from(normalized.match(/.{2}/gu) ?? [], byte => Number.parseInt(byte, 16));
}

function exposeDeveloperActions(bridge: PolkadotHostBridge): HostDeveloperActions {
  let identity: PolkadotHostIdentity | undefined;
  let session: Awaited<ReturnType<PolkadotHostBridge['openSessionChannel']>> | undefined;
  let sessionSecret = '';
  const received: unknown[] = [];
  const observed: ObservedHostPayment[] = [];

  return {
    async requestIdentity() {
      identity = await bridge.requestIdentity();
      return {username: identity.username, productId: identity.productId, accountId: identity.accountId};
    },
    async connectSession(groupId, secret) {
      if (!identity) throw new Error('Request identity before connecting a session.');
      session?.close();
      sessionSecret = secret;
      session = await bridge.openSessionChannel({
        identity,
        groupId,
        secret,
        onPacket: (packet: EncryptedSessionPacket) => {
          void decryptSessionValue(secret, packet).then(value => received.push(value));
        },
      });
    },
    async publishSessionValue(value) {
      if (!session || !sessionSecret) throw new Error('Connect a session before publishing.');
      return session.publish(await encryptSessionValue(sessionSecret, value));
    },
    receivedSessionValues() {
      return structuredClone(received);
    },
    async requestPayment(amount, destinationHex) {
      const payment = await bridge.requestPayment({
        amount: BigInt(amount),
        destination: bytesFromHex(destinationHex),
        onStatus: status => observed.push(status),
      });
      return payment.requestId;
    },
    observedPayments() {
      return structuredClone(observed);
    },
    saveRedactedReceipt(receipt) {
      return bridge.saveRedactedReceipt(receipt);
    },
    close() {
      session?.close();
      session = undefined;
      sessionSecret = '';
    },
  };
}

export async function bootstrapPolkadotHostDeveloperChecks(): Promise<void> {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  let referrerHost = '';
  try {
    referrerHost = document.referrer ? new URL(document.referrer).hostname : '';
  } catch {
    referrerHost = '';
  }
  const isPaseoHostFrame = window.parent !== window && /(?:^|\.)paseo\.li$/u.test(referrerHost);
  const isLocalTestHostFrame = window.parent !== window
    && (referrerHost === '127.0.0.1' || referrerHost === 'localhost');
  const developerChecksEnabled = params.get('developerChecks') === '1' || isLocalTestHostFrame;
  if (!developerChecksEnabled && !isPaseoHostFrame) return;

  const bridge = new PolkadotHostBridge();
  const report = await bridge.probe();
  window.__CHOPDOT_HOST_CAPABILITIES__ = report;
  window.dispatchEvent(new CustomEvent('chopdot:host-capabilities', {detail: report}));

  if (developerChecksEnabled) {
    window.__CHOPDOT_HOST_ACTIONS__ = exposeDeveloperActions(bridge);
  }
}
