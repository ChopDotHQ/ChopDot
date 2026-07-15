/**
 * Contract-only types for the future Chop Core payment-intent boundary.
 *
 * These types do not add backend authority to the portable shell. Data crossing
 * a network, URL, host, or storage boundary still requires runtime validation.
 */

export type PaymentIntentStatus =
  | 'created'
  | 'request_sent'
  | 'marked_paid'
  | 'confirmed'
  | 'expired'
  | 'cancelled'
  | 'disputed';

export type PaymentIntentActorRole =
  | 'payer'
  | 'receiver'
  | 'organizer'
  | 'host_adapter'
  | 'system';

export type PaymentIntentSourceSurface = 'web' | 'telegram' | 'dot-host' | 'other';

export type PaymentEvidenceStatus =
  | 'submitted'
  | 'matched'
  | 'mismatched'
  | 'stale'
  | 'duplicate'
  | 'rejected'
  | 'consumed';

export interface PaymentAmount {
  /** Integer amount in the currency's minor unit. */
  minorUnits: number;
  /** ISO 4217 currency code. */
  currency: string;
}

export interface PaymentIntentAuditMetadata {
  createdByActorId: string;
  sourceSurface: PaymentIntentSourceSurface;
  lastCommandId: string | null;
}

export interface PaymentIntent {
  id: string;
  /** Opaque read-only lookup identifier. It is not mutation authority. */
  publicId: string;
  groupId: string;
  payerUserId: string;
  receiverUserId: string;
  coveredSplitIds: readonly string[];
  /** Split versions captured when the intent was created. */
  coveredSplitVersions: Readonly<Record<string, number>>;
  expectedAmount: PaymentAmount;
  paymentRail: string;
  /** Server-side reference to receiver instructions, not raw private details. */
  recipientReferenceId: string | null;
  status: PaymentIntentStatus;
  /** Digest of covered split ids, values, and versions. */
  scopeDigest: string;
  /** Hash only. The raw nonce remains server-side. */
  serverNonceHash: string;
  version: number;
  audit: PaymentIntentAuditMetadata;
  createdAt: string;
  expiresAt: string;
  sentAt: string | null;
  markedPaidAt: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
}

export interface PaymentIntentActor {
  id: string;
  role: PaymentIntentActorRole;
}

export interface CreatePaymentIntentInput {
  groupId: string;
  payerUserId: string;
  receiverUserId: string;
  coveredSplitIds: readonly string[];
  expectedAmount: PaymentAmount;
  paymentRail: string;
  recipientReferenceId: string | null;
  expiresAt: string;
}

export type PaymentIntentCommand =
  | { type: 'create_intent'; input: CreatePaymentIntentInput }
  | { type: 'send_request' }
  | { type: 'mark_paid' }
  | { type: 'confirm_received' }
  | { type: 'cancel'; reason?: string }
  | { type: 'expire' }
  | { type: 'dispute'; reason?: string };

export interface PaymentIntentCommandEnvelope {
  commandId: string;
  /** Null only for create_intent; all other commands require an intent id. */
  intentId: string | null;
  actor: PaymentIntentActor;
  sourceSurface: PaymentIntentSourceSurface;
  expectedVersion: number;
  submittedAt: string;
  command: PaymentIntentCommand;
}

export interface PaymentEvidenceSubmission {
  evidenceId: string;
  paymentIntentId: string;
  sourceSurface: PaymentIntentSourceSurface;
  sourceEventId: string;
  evidenceType: string;
  amount: PaymentAmount;
  paymentRail: string;
  payerReferenceHash: string;
  receiverReferenceHash: string;
  paymentReferenceHash: string;
  observedAt: string;
}

export interface PaymentEvidenceRecord extends PaymentEvidenceSubmission {
  status: PaymentEvidenceStatus;
  recordedAt: string;
}

export interface PaymentEvidenceCommandEnvelope {
  commandId: string;
  actor: PaymentIntentActor;
  sourceSurface: PaymentIntentSourceSurface;
  expectedVersion: number;
  submittedAt: string;
  evidence: PaymentEvidenceSubmission;
}

export type PaymentIntentAuditEventType =
  | 'intent_created'
  | 'request_sent'
  | 'payer_marked_paid'
  | 'evidence_submitted'
  | 'evidence_matched'
  | 'receiver_confirmed'
  | 'intent_cancelled'
  | 'intent_expired'
  | 'intent_disputed';

export interface PaymentIntentAuditEvent {
  eventId: string;
  commandId: string;
  intentId: string;
  groupId: string;
  actor: PaymentIntentActor;
  sourceSurface: PaymentIntentSourceSurface;
  eventType: PaymentIntentAuditEventType;
  previousStatus: PaymentIntentStatus | null;
  nextStatus: PaymentIntentStatus;
  payloadHash: string;
  occurredAt: string;
  intentVersion: number;
}

/**
 * URL-safe, read-only lookup data. Any duplicated display summary is untrusted
 * and must not authorize a mutation or override the backend projection.
 */
export interface PaymentIntentLinkPayload {
  version: 1;
  publicIntentId: string;
  displayVersion?: number;
  hostLaunchHint?: PaymentIntentSourceSurface;
}

export interface PaymentIntentCommandResult {
  intent: PaymentIntent;
  auditEvent: PaymentIntentAuditEvent | null;
  replayed: boolean;
}

export interface PaymentEvidenceCommandResult {
  intent: PaymentIntent;
  evidence: PaymentEvidenceRecord;
  auditEvent: PaymentIntentAuditEvent | null;
  replayed: boolean;
}
