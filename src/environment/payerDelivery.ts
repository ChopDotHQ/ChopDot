import {connectHostSession} from './hostSessionSync.ts';
import {
  createPayerMarkedPaidEnvelope,
  createReceiptConfirmedEnvelope,
  derivePayerSessionConfig,
  isReceiptConfirmedNotice,
  paymentEventSigningBytes,
  signatureToBase64Url,
  validateReceiptConfirmedForPayer,
  type PendingPayerAction,
  type PendingReceiptConfirmation,
} from './livePayerSync.ts';
import type {StandalonePayerRequest} from '../requestLinks.ts';
import type {HostSessionConnection, HostSessionConfig, HostSessionEnvelope} from './hostSessionSync.ts';

const SIGNATURE_PLACEHOLDER = 'A'.repeat(86);
const PUBLISH_TIMEOUT_MS = 20_000;

type SessionConnector = (input: {
  config: HostSessionConfig;
  onEnvelope: (envelope: HostSessionEnvelope, signerHex?: string) => void;
}) => Promise<HostSessionConnection>;

export async function publishPendingPayerAction(
  action: PendingPayerAction,
  connect: SessionConnector = connectHostSession,
  publishTimeoutMs = PUBLISH_TIMEOUT_MS,
): Promise<boolean> {
  const connection = await connect({
    config: {roomId: action.roomId, secret: action.secret},
    onEnvelope: () => undefined,
  });
  try {
    if (!(await connection.preparePublish())) return false;
    const unsigned = createPayerMarkedPaidEnvelope({
      eventId: action.eventId,
      requestId: action.requestId,
      groupId: action.groupId,
      memberId: action.memberId,
      amount: action.amount,
      currency: action.currency,
      memberCapability: action.memberCapability,
      actorPublicKeyHex: connection.participant.publicKeyHex,
      actorSignature: SIGNATURE_PLACEHOLDER,
      occurredAt: action.occurredAt,
      expiresAt: action.expiresAt,
    });
    const actorSignature = signatureToBase64Url(await connection.signBytes(paymentEventSigningBytes(unsigned)));
    // The remote-account signing modal can replace Polkadot Desktop's host
    // transport. The payer path crosses the same signature boundary as the
    // organizer confirmation path, so publishing through the pre-sign channel
    // can otherwise appear successful locally while the organizer receives
    // nothing.
    await connection.refreshPublishTransport();
    return await withTimeout(
      connection.publish(createPayerMarkedPaidEnvelope({...unsigned, actorSignature})),
      publishTimeoutMs,
    );
  } finally {
    connection.close();
  }
}

export async function publishPendingReceiptConfirmation(
  action: PendingReceiptConfirmation,
  connect: SessionConnector = connectHostSession,
  publishTimeoutMs = PUBLISH_TIMEOUT_MS,
): Promise<boolean> {
  const connection = await connect({
    config: {roomId: action.roomId, secret: action.secret},
    onEnvelope: () => undefined,
  });
  try {
    if (!(await connection.preparePublish())) return false;
    const unsigned = createReceiptConfirmedEnvelope({
      eventId: action.eventId,
      requestId: action.requestId,
      groupId: action.groupId,
      memberId: action.memberId,
      amount: action.amount,
      currency: action.currency,
      memberCapability: action.memberCapability,
      actorPublicKeyHex: connection.participant.publicKeyHex,
      actorSignature: SIGNATURE_PLACEHOLDER,
      occurredAt: action.occurredAt,
      expiresAt: action.expiresAt,
    });
    const actorSignature = signatureToBase64Url(await connection.signBytes(paymentEventSigningBytes(unsigned)));
    await connection.refreshPublishTransport();
    return await withTimeout(
      connection.publish(createReceiptConfirmedEnvelope({...unsigned, actorSignature})),
      publishTimeoutMs,
    );
  } finally {
    connection.close();
  }
}

function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = globalThis.setTimeout(() => {
      reject(new Error('Shared update timed out before the host confirmed delivery.'));
    }, timeoutMs);
    operation.then(
      value => {
        globalThis.clearTimeout(timer);
        resolve(value);
      },
      reason => {
        globalThis.clearTimeout(timer);
        reject(reason);
      },
    );
  });
}

export async function observeReceiptConfirmation({
  request,
  groupId,
  memberId,
  onConfirmed,
  onError,
}: {
  request: StandalonePayerRequest;
  groupId: string;
  memberId: string;
  onConfirmed(): void;
  onError(reason: unknown): void;
}) {
  const seen = new Set<string>();
  const config = await derivePayerSessionConfig(request.requestId, request.live.memberCapability);
  return connectHostSession({
    config,
    onEnvelope: (envelope, signerHex) => {
      if (!isReceiptConfirmedNotice(envelope) || seen.has(envelope.requestId)) return;
      seen.add(envelope.requestId);
      void validateReceiptConfirmedForPayer(request, {groupId, memberId}, envelope, signerHex)
        .then(result => {
          if (result.ok) onConfirmed();
        })
        .catch(onError);
    },
  });
}
