import { createHash, randomBytes, randomUUID } from 'node:crypto';

import type {
  CreatePaymentIntentInput,
  PaymentEvidenceCommandEnvelope,
  PaymentEvidenceCommandResult,
  PaymentEvidenceRecord,
  PaymentEvidenceSubmission,
  PaymentIntent,
  PaymentIntentActor,
  PaymentIntentAuditEvent,
  PaymentIntentAuditEventType,
  PaymentIntentCommand,
  PaymentIntentCommandEnvelope,
  PaymentIntentCommandResult,
  PaymentIntentSourceSurface,
  PaymentIntentStatus,
} from '../../src/contracts/paymentIntent';

export type CoveredSplitStatus = 'open' | 'request_sent' | 'marked_paid' | 'confirmed';

export interface CoveredSplitSnapshot {
  id: string;
  groupId: string;
  payerUserId: string;
  receiverUserId: string;
  amountMinor: number;
  currency: string;
  status: CoveredSplitStatus;
  version: number;
}

export type PaymentIntentKernelErrorCode =
  | 'DUPLICATE_EVIDENCE'
  | 'IDEMPOTENCY_CONFLICT'
  | 'INTENT_EXPIRED'
  | 'INVALID_COMMAND'
  | 'INVALID_SCOPE'
  | 'INVALID_TRANSITION'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'VERSION_CONFLICT';

export class PaymentIntentKernelError extends Error {
  constructor(
    readonly code: PaymentIntentKernelErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PaymentIntentKernelError';
  }
}

export interface PaymentIntentKernelDependencies {
  now?: () => Date;
  createId?: (kind: 'intent' | 'public' | 'event') => string;
  createSecret?: () => string;
  hash?: (value: string) => string;
  canOrganize?: (actorId: string, groupId: string) => boolean;
  canSubmitHostEvidence?: (
    actorId: string,
    sourceSurface: PaymentIntentSourceSurface,
    intent: PaymentIntent,
  ) => boolean;
  matchEvidenceReferences?: (
    intent: PaymentIntent,
    evidence: PaymentEvidenceSubmission,
  ) => boolean;
  autoMarkPaidOnMatchedEvidence?: boolean;
  maxEvidenceClockSkewMs?: number;
}

type StoredCommandResult =
  | {
      kind: 'intent';
      fingerprint: string;
      result: PaymentIntentCommandResult;
    }
  | {
      kind: 'evidence';
      fingerprint: string;
      result: PaymentEvidenceCommandResult;
    };

const DEFAULT_DEPENDENCIES: Required<PaymentIntentKernelDependencies> = {
  now: () => new Date(),
  createId: (kind) => `${kind}_${randomUUID()}`,
  createSecret: () => randomBytes(32).toString('base64url'),
  hash: (value) => createHash('sha256').update(value).digest('hex'),
  canOrganize: () => false,
  canSubmitHostEvidence: () => false,
  matchEvidenceReferences: () => false,
  autoMarkPaidOnMatchedEvidence: false,
  maxEvidenceClockSkewMs: 5 * 60 * 1_000,
};

/**
 * Synchronous reference kernel for contract tests and future service design.
 * It is not production persistence and must not be imported by browser code.
 */
export class InMemoryPaymentIntentKernel {
  private readonly dependencies: Required<PaymentIntentKernelDependencies>;
  private readonly splits = new Map<string, CoveredSplitSnapshot>();
  private readonly intents = new Map<string, PaymentIntent>();
  private readonly events: PaymentIntentAuditEvent[] = [];
  private readonly evidence = new Map<string, PaymentEvidenceRecord>();
  private readonly evidenceSourceEvents = new Set<string>();
  private readonly commandResults = new Map<string, StoredCommandResult>();
  private readonly nonceSecrets = new Map<string, string>();

  constructor(
    initialSplits: readonly CoveredSplitSnapshot[],
    dependencies: PaymentIntentKernelDependencies = {},
  ) {
    this.dependencies = {
      ...DEFAULT_DEPENDENCIES,
      ...withoutUndefinedValues(dependencies),
    };
    if (!Number.isSafeInteger(this.dependencies.maxEvidenceClockSkewMs) ||
        this.dependencies.maxEvidenceClockSkewMs < 0) {
      throw new PaymentIntentKernelError('INVALID_SCOPE', 'Evidence clock skew is invalid');
    }
    initialSplits.forEach((split) => {
      assertInitialSplit(split);
      if (this.splits.has(split.id)) {
        throw new PaymentIntentKernelError('INVALID_SCOPE', `Duplicate split id: ${split.id}`);
      }
      this.splits.set(split.id, clone(split));
    });
  }

  execute(envelope: PaymentIntentCommandEnvelope): PaymentIntentCommandResult {
    this.assertEnvelopeBasics(
      envelope.commandId,
      envelope.actor,
      envelope.sourceSurface,
      envelope.expectedVersion,
      envelope.submittedAt,
    );
    if (!envelope.command || !COMMAND_TYPES.has(envelope.command.type)) {
      throw new PaymentIntentKernelError('INVALID_COMMAND', 'Command type is invalid');
    }
    if (envelope.command.type === 'create_intent' && !envelope.command.input) {
      throw new PaymentIntentKernelError('INVALID_COMMAND', 'Create intent input is required');
    }
    if ('reason' in envelope.command && envelope.command.reason !== undefined) {
      assertBoundedText(envelope.command.reason, 'command reason', 500, 'INVALID_COMMAND');
    }

    const fingerprint = this.fingerprint(envelope);
    const replay = this.readReplay<PaymentIntentCommandResult>(
      envelope.commandId,
      'intent',
      fingerprint,
    );
    if (replay) return replay;

    const result = envelope.command.type === 'create_intent'
      ? this.createIntent(envelope, envelope.command.input)
      : this.transitionIntent(envelope, envelope.command);

    this.commandResults.set(envelope.commandId, {
      kind: 'intent',
      fingerprint,
      result: clone(result),
    });
    return clone(result);
  }

  submitEvidence(envelope: PaymentEvidenceCommandEnvelope): PaymentEvidenceCommandResult {
    this.assertEnvelopeBasics(
      envelope.commandId,
      envelope.actor,
      envelope.sourceSurface,
      envelope.expectedVersion,
      envelope.submittedAt,
    );
    this.assertEvidenceInput(envelope);

    const fingerprint = this.fingerprint(envelope);
    const replay = this.readReplay<PaymentEvidenceCommandResult>(
      envelope.commandId,
      'evidence',
      fingerprint,
    );
    if (replay) return replay;

    const intent = this.requireIntent(envelope.evidence.paymentIntentId);
    this.assertVersion(intent, envelope.expectedVersion);
    this.assertEvidenceActor(intent, envelope.actor, envelope.sourceSurface);

    if (intent.status !== 'request_sent') {
      throw new PaymentIntentKernelError(
        'INVALID_TRANSITION',
        `Evidence requires request_sent; found ${intent.status}`,
      );
    }
    if (this.isExpired(intent)) {
      throw new PaymentIntentKernelError('INTENT_EXPIRED', 'Payment intent has expired');
    }
    if (this.evidence.has(envelope.evidence.evidenceId) ||
        this.evidenceSourceEvents.has(envelope.evidence.sourceEventId)) {
      throw new PaymentIntentKernelError('DUPLICATE_EVIDENCE', 'Evidence was already submitted');
    }

    const matched = this.matchesEvidence(intent, envelope.evidence);
    const recordedAt = this.nowIso();
    const evidenceRecord: PaymentEvidenceRecord = {
      ...clone(envelope.evidence),
      amount: {
        minorUnits: envelope.evidence.amount.minorUnits,
        currency: envelope.evidence.amount.currency.trim().toUpperCase(),
      },
      paymentRail: normalizeRequiredText(envelope.evidence.paymentRail, 'payment rail'),
      status: matched ? 'matched' : 'mismatched',
      recordedAt,
    };

    let nextIntent = clone(intent);
    let eventType: PaymentIntentAuditEventType = 'evidence_submitted';
    let nextStatus: PaymentIntentStatus = intent.status;
    let splitUpdates: CoveredSplitSnapshot[] = [];

    if (matched) {
      eventType = 'evidence_matched';
      if (this.dependencies.autoMarkPaidOnMatchedEvidence) {
        this.assertCoveredSplits(intent, 'request_sent', 1);
        splitUpdates = this.buildCoveredSplitUpdates(intent, 'marked_paid');
        nextStatus = 'marked_paid';
        nextIntent = this.withTransition(intent, envelope.commandId, nextStatus, recordedAt);
      }
    }

    const auditEvent = this.createAuditEvent(
      nextIntent,
      envelope.commandId,
      envelope.actor,
      envelope.sourceSurface,
      eventType,
      intent.status,
      nextStatus,
      envelope,
    );

    this.evidence.set(evidenceRecord.evidenceId, clone(evidenceRecord));
    this.evidenceSourceEvents.add(evidenceRecord.sourceEventId);
    splitUpdates.forEach((split) => this.splits.set(split.id, clone(split)));
    this.intents.set(nextIntent.id, clone(nextIntent));
    this.events.push(clone(auditEvent));

    const result: PaymentEvidenceCommandResult = {
      intent: nextIntent,
      evidence: evidenceRecord,
      auditEvent,
      replayed: false,
    };
    this.commandResults.set(envelope.commandId, {
      kind: 'evidence',
      fingerprint,
      result: clone(result),
    });
    return clone(result);
  }

  getIntent(intentId: string): PaymentIntent | null {
    const intent = this.intents.get(intentId);
    return intent ? clone(intent) : null;
  }

  getSplit(splitId: string): CoveredSplitSnapshot | null {
    const split = this.splits.get(splitId);
    return split ? clone(split) : null;
  }

  listEvents(intentId?: string): PaymentIntentAuditEvent[] {
    return this.events
      .filter((event) => !intentId || event.intentId === intentId)
      .map((event) => clone(event));
  }

  listEvidence(intentId?: string): PaymentEvidenceRecord[] {
    return Array.from(this.evidence.values())
      .filter((record) => !intentId || record.paymentIntentId === intentId)
      .map((record) => clone(record));
  }

  private createIntent(
    envelope: PaymentIntentCommandEnvelope,
    input: CreatePaymentIntentInput,
  ): PaymentIntentCommandResult {
    if (envelope.intentId !== null || envelope.expectedVersion !== 0) {
      throw new PaymentIntentKernelError(
        'INVALID_COMMAND',
        'create_intent requires a null intent id and expected version 0',
      );
    }
    this.assertCreateActor(envelope.actor, input);
    const coveredSplits = this.validateCreateScope(input);
    const createdAt = this.nowIso();
    const expiresAt = parseIsoTimestamp(input.expiresAt, 'intent expiry');
    if (expiresAt <= Date.parse(createdAt)) {
      throw new PaymentIntentKernelError('INVALID_SCOPE', 'Intent expiry must be in the future');
    }

    const id = this.dependencies.createId('intent');
    const nonce = this.dependencies.createSecret();
    const intent: PaymentIntent = {
      id,
      publicId: this.dependencies.createId('public'),
      groupId: input.groupId,
      payerUserId: input.payerUserId,
      receiverUserId: input.receiverUserId,
      coveredSplitIds: coveredSplits.map((split) => split.id),
      coveredSplitVersions: Object.fromEntries(
        coveredSplits.map((split) => [split.id, split.version]),
      ),
      expectedAmount: {
        minorUnits: input.expectedAmount.minorUnits,
        currency: input.expectedAmount.currency.trim().toUpperCase(),
      },
      paymentRail: normalizeRequiredText(input.paymentRail, 'payment rail'),
      recipientReferenceId: input.recipientReferenceId,
      status: 'created',
      scopeDigest: this.scopeDigest(coveredSplits),
      serverNonceHash: this.dependencies.hash(nonce),
      version: 1,
      audit: {
        createdByActorId: envelope.actor.id,
        sourceSurface: envelope.sourceSurface,
        lastCommandId: envelope.commandId,
      },
      createdAt,
      expiresAt: new Date(expiresAt).toISOString(),
      sentAt: null,
      markedPaidAt: null,
      confirmedAt: null,
      cancelledAt: null,
    };

    const auditEvent = this.createAuditEvent(
      intent,
      envelope.commandId,
      envelope.actor,
      envelope.sourceSurface,
      'intent_created',
      null,
      'created',
      envelope,
    );

    this.nonceSecrets.set(intent.id, nonce);
    this.intents.set(intent.id, clone(intent));
    this.events.push(clone(auditEvent));
    return { intent, auditEvent, replayed: false };
  }

  private transitionIntent(
    envelope: PaymentIntentCommandEnvelope,
    command: Exclude<PaymentIntentCommand, { type: 'create_intent' }>,
  ): PaymentIntentCommandResult {
    if (!envelope.intentId) {
      throw new PaymentIntentKernelError('INVALID_COMMAND', 'Intent id is required');
    }

    const intent = this.requireIntent(envelope.intentId);
    this.assertVersion(intent, envelope.expectedVersion);
    this.assertCommandActor(intent, envelope.actor, command);

    const occurredAt = this.nowIso();
    let nextStatus: PaymentIntentStatus;
    let eventType: PaymentIntentAuditEventType;
    let splitUpdates: CoveredSplitSnapshot[] = [];

    switch (command.type) {
      case 'send_request':
        this.assertTransition(intent, 'created');
        if (this.isExpired(intent)) {
          throw new PaymentIntentKernelError('INTENT_EXPIRED', 'Payment intent has expired');
        }
        this.assertCoveredSplits(intent, 'open', 0);
        splitUpdates = this.buildCoveredSplitUpdates(intent, 'request_sent');
        nextStatus = 'request_sent';
        eventType = 'request_sent';
        break;
      case 'mark_paid':
        this.assertTransition(intent, 'request_sent');
        if (this.isExpired(intent)) {
          throw new PaymentIntentKernelError('INTENT_EXPIRED', 'Payment intent has expired');
        }
        this.assertCoveredSplits(intent, 'request_sent', 1);
        splitUpdates = this.buildCoveredSplitUpdates(intent, 'marked_paid');
        nextStatus = 'marked_paid';
        eventType = 'payer_marked_paid';
        break;
      case 'confirm_received':
        this.assertTransition(intent, 'marked_paid');
        this.assertCoveredSplits(intent, 'marked_paid', 2);
        splitUpdates = this.buildCoveredSplitUpdates(intent, 'confirmed');
        nextStatus = 'confirmed';
        eventType = 'receiver_confirmed';
        break;
      case 'cancel':
        if (!['created', 'request_sent'].includes(intent.status)) {
          throw new PaymentIntentKernelError(
            'INVALID_TRANSITION',
            `Cannot cancel intent in ${intent.status}`,
          );
        }
        if (intent.status === 'request_sent') {
          this.assertCoveredSplits(intent, 'request_sent', 1);
          splitUpdates = this.buildCoveredSplitUpdates(intent, 'open');
        }
        nextStatus = 'cancelled';
        eventType = 'intent_cancelled';
        break;
      case 'expire':
        if (!['created', 'request_sent'].includes(intent.status)) {
          throw new PaymentIntentKernelError(
            'INVALID_TRANSITION',
            `Cannot expire intent in ${intent.status}`,
          );
        }
        if (!this.isExpired(intent)) {
          throw new PaymentIntentKernelError('INVALID_TRANSITION', 'Intent has not expired');
        }
        if (intent.status === 'request_sent') {
          this.assertCoveredSplits(intent, 'request_sent', 1);
          splitUpdates = this.buildCoveredSplitUpdates(intent, 'open');
        }
        nextStatus = 'expired';
        eventType = 'intent_expired';
        break;
      case 'dispute':
        this.assertTransition(intent, 'marked_paid');
        this.assertCoveredSplits(intent, 'marked_paid', 2);
        nextStatus = 'disputed';
        eventType = 'intent_disputed';
        break;
    }

    const nextIntent = this.withTransition(intent, envelope.commandId, nextStatus, occurredAt);
    const auditEvent = this.createAuditEvent(
      nextIntent,
      envelope.commandId,
      envelope.actor,
      envelope.sourceSurface,
      eventType,
      intent.status,
      nextStatus,
      envelope,
    );
    splitUpdates.forEach((split) => this.splits.set(split.id, clone(split)));
    this.intents.set(nextIntent.id, clone(nextIntent));
    this.events.push(clone(auditEvent));
    return { intent: nextIntent, auditEvent, replayed: false };
  }

  private validateCreateScope(input: CreatePaymentIntentInput): CoveredSplitSnapshot[] {
    assertIdentifier(input.groupId, 'group id');
    assertIdentifier(input.payerUserId, 'payer user id');
    assertIdentifier(input.receiverUserId, 'receiver user id');
    if (input.recipientReferenceId !== null) {
      assertIdentifier(input.recipientReferenceId, 'recipient reference id');
    }
    normalizeRequiredText(input.paymentRail, 'payment rail');
    if (input.payerUserId === input.receiverUserId) {
      throw new PaymentIntentKernelError('INVALID_SCOPE', 'Payer and receiver must differ');
    }
    if (!Number.isSafeInteger(input.expectedAmount.minorUnits) ||
        input.expectedAmount.minorUnits <= 0) {
      throw new PaymentIntentKernelError('INVALID_SCOPE', 'Amount must be a positive safe integer');
    }
    const currency = input.expectedAmount.currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new PaymentIntentKernelError('INVALID_SCOPE', 'Currency must be an ISO-style code');
    }
    if (!input.coveredSplitIds.length || new Set(input.coveredSplitIds).size !== input.coveredSplitIds.length) {
      throw new PaymentIntentKernelError('INVALID_SCOPE', 'Covered split ids must be non-empty and unique');
    }
    input.coveredSplitIds.forEach((splitId) => assertIdentifier(splitId, 'covered split id'));

    const coveredSplits = input.coveredSplitIds.map((splitId) => {
      const split = this.splits.get(splitId);
      if (!split) {
        throw new PaymentIntentKernelError('INVALID_SCOPE', `Unknown split: ${splitId}`);
      }
      return split;
    });

    for (const split of coveredSplits) {
      if (split.groupId !== input.groupId ||
          split.payerUserId !== input.payerUserId ||
          split.receiverUserId !== input.receiverUserId ||
          split.currency !== currency ||
          split.status !== 'open') {
        throw new PaymentIntentKernelError('INVALID_SCOPE', `Split ${split.id} is outside intent scope`);
      }
    }
    const total = coveredSplits.reduce((sum, split) => sum + split.amountMinor, 0);
    if (total !== input.expectedAmount.minorUnits) {
      throw new PaymentIntentKernelError('INVALID_SCOPE', 'Intent amount does not equal covered splits');
    }
    return coveredSplits.map((split) => clone(split));
  }

  private assertCreateActor(actor: PaymentIntentActor, input: CreatePaymentIntentInput): void {
    const isReceiver = actor.role === 'receiver' && actor.id === input.receiverUserId;
    const isOrganizer = actor.role === 'organizer' &&
      this.dependencies.canOrganize(actor.id, input.groupId);
    if (!isReceiver && !isOrganizer) {
      throw new PaymentIntentKernelError('UNAUTHORIZED', 'Actor cannot create this intent');
    }
  }

  private assertCommandActor(
    intent: PaymentIntent,
    actor: PaymentIntentActor,
    command: Exclude<PaymentIntentCommand, { type: 'create_intent' }>,
  ): void {
    const isReceiver = actor.role === 'receiver' && actor.id === intent.receiverUserId;
    const isPayer = actor.role === 'payer' && actor.id === intent.payerUserId;
    const isOrganizer = actor.role === 'organizer' &&
      this.dependencies.canOrganize(actor.id, intent.groupId);

    const allowed = command.type === 'mark_paid'
      ? isPayer
      : command.type === 'confirm_received'
        ? isReceiver
        : command.type === 'dispute'
          ? isPayer || isReceiver
          : command.type === 'expire'
            ? actor.role === 'system'
            : isReceiver || isOrganizer;

    if (!allowed) {
      throw new PaymentIntentKernelError('UNAUTHORIZED', `Actor cannot ${command.type}`);
    }
  }

  private assertEvidenceActor(
    intent: PaymentIntent,
    actor: PaymentIntentActor,
    sourceSurface: PaymentIntentSourceSurface,
  ): void {
    const isPayer = actor.role === 'payer' && actor.id === intent.payerUserId;
    const isAuthorizedHost = actor.role === 'host_adapter' &&
      this.dependencies.canSubmitHostEvidence(actor.id, sourceSurface, intent);
    if (!isPayer && !isAuthorizedHost) {
      throw new PaymentIntentKernelError('UNAUTHORIZED', 'Actor cannot submit this evidence');
    }
  }

  private matchesEvidence(intent: PaymentIntent, evidence: PaymentEvidenceSubmission): boolean {
    const observedAt = Date.parse(evidence.observedAt);
    const requestStartedAt = Date.parse(intent.sentAt ?? intent.createdAt);
    const latestAcceptedAt = Math.min(
      Date.parse(intent.expiresAt),
      this.dependencies.now().getTime() + this.dependencies.maxEvidenceClockSkewMs,
    );
    const earliestAcceptedAt = requestStartedAt - this.dependencies.maxEvidenceClockSkewMs;

    return evidence.paymentIntentId === intent.id &&
      evidence.amount.minorUnits === intent.expectedAmount.minorUnits &&
      evidence.amount.currency.trim().toUpperCase() === intent.expectedAmount.currency &&
      normalizeRequiredText(evidence.paymentRail, 'payment rail') === intent.paymentRail &&
      observedAt >= earliestAcceptedAt &&
      observedAt <= latestAcceptedAt &&
      this.dependencies.matchEvidenceReferences(intent, evidence);
  }

  private assertCoveredSplits(
    intent: PaymentIntent,
    status: CoveredSplitStatus,
    versionOffset: number,
  ): void {
    const splits = intent.coveredSplitIds.map((splitId) => {
      const split = this.splits.get(splitId);
      if (!split) {
        throw new PaymentIntentKernelError('INVALID_SCOPE', `Missing covered split: ${splitId}`);
      }
      return split;
    });

    for (const split of splits) {
      const baselineVersion = intent.coveredSplitVersions[split.id];
      if (baselineVersion === undefined ||
          split.groupId !== intent.groupId ||
          split.payerUserId !== intent.payerUserId ||
          split.receiverUserId !== intent.receiverUserId ||
          split.amountMinor <= 0 ||
          split.currency !== intent.expectedAmount.currency ||
          split.status !== status ||
          split.version !== baselineVersion + versionOffset) {
        throw new PaymentIntentKernelError('INVALID_SCOPE', `Covered split changed: ${split.id}`);
      }
    }
    if (this.scopeDigest(splits, intent.coveredSplitVersions) !== intent.scopeDigest) {
      throw new PaymentIntentKernelError('INVALID_SCOPE', 'Covered split scope digest changed');
    }
  }

  private buildCoveredSplitUpdates(
    intent: PaymentIntent,
    status: CoveredSplitStatus,
  ): CoveredSplitSnapshot[] {
    return intent.coveredSplitIds.map((splitId) => {
      const split = this.splits.get(splitId);
      if (!split) {
        throw new PaymentIntentKernelError('INVALID_SCOPE', `Missing covered split: ${splitId}`);
      }
      return { ...split, status, version: split.version + 1 };
    });
  }

  private scopeDigest(
    splits: readonly CoveredSplitSnapshot[],
    versions?: Readonly<Record<string, number>>,
  ): string {
    return this.dependencies.hash(stableStringify(
      splits
        .map((split) => ({
          id: split.id,
          groupId: split.groupId,
          payerUserId: split.payerUserId,
          receiverUserId: split.receiverUserId,
          amountMinor: split.amountMinor,
          currency: split.currency,
          version: versions?.[split.id] ?? split.version,
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    ));
  }

  private withTransition(
    intent: PaymentIntent,
    commandId: string,
    status: PaymentIntentStatus,
    occurredAt: string,
  ): PaymentIntent {
    return {
      ...intent,
      status,
      version: intent.version + 1,
      audit: { ...intent.audit, lastCommandId: commandId },
      sentAt: status === 'request_sent' ? occurredAt : intent.sentAt,
      markedPaidAt: status === 'marked_paid' ? occurredAt : intent.markedPaidAt,
      confirmedAt: status === 'confirmed' ? occurredAt : intent.confirmedAt,
      cancelledAt: status === 'cancelled' ? occurredAt : intent.cancelledAt,
    };
  }

  private createAuditEvent(
    intent: PaymentIntent,
    commandId: string,
    actor: PaymentIntentActor,
    sourceSurface: PaymentIntentSourceSurface,
    eventType: PaymentIntentAuditEventType,
    previousStatus: PaymentIntentStatus | null,
    nextStatus: PaymentIntentStatus,
    payload: unknown,
  ): PaymentIntentAuditEvent {
    return {
      eventId: this.dependencies.createId('event'),
      commandId,
      intentId: intent.id,
      groupId: intent.groupId,
      actor: clone(actor),
      sourceSurface,
      eventType,
      previousStatus,
      nextStatus,
      payloadHash: this.dependencies.hash(stableStringify(payload)),
      occurredAt: this.nowIso(),
      intentVersion: intent.version,
    };
  }

  private requireIntent(intentId: string): PaymentIntent {
    const intent = this.intents.get(intentId);
    if (!intent) {
      throw new PaymentIntentKernelError('NOT_FOUND', 'Payment intent not found');
    }
    return clone(intent);
  }

  private assertVersion(intent: PaymentIntent, expectedVersion: number): void {
    if (intent.version !== expectedVersion) {
      throw new PaymentIntentKernelError(
        'VERSION_CONFLICT',
        `Expected version ${expectedVersion}; found ${intent.version}`,
      );
    }
  }

  private assertTransition(intent: PaymentIntent, requiredStatus: PaymentIntentStatus): void {
    if (intent.status !== requiredStatus) {
      throw new PaymentIntentKernelError(
        'INVALID_TRANSITION',
        `Expected ${requiredStatus}; found ${intent.status}`,
      );
    }
  }

  private isExpired(intent: PaymentIntent): boolean {
    return this.dependencies.now().getTime() >= Date.parse(intent.expiresAt);
  }

  private assertEnvelopeBasics(
    commandId: string,
    actor: PaymentIntentActor,
    sourceSurface: PaymentIntentSourceSurface,
    expectedVersion: number,
    submittedAt: string,
  ): void {
    assertIdentifier(commandId, 'command id', 'INVALID_COMMAND');
    if (!actor || typeof actor !== 'object') {
      throw new PaymentIntentKernelError('INVALID_COMMAND', 'Actor is required');
    }
    assertIdentifier(actor.id, 'actor id', 'INVALID_COMMAND');
    if (!ACTOR_ROLES.has(actor.role)) {
      throw new PaymentIntentKernelError('INVALID_COMMAND', 'Actor role is invalid');
    }
    if (!SOURCE_SURFACES.has(sourceSurface)) {
      throw new PaymentIntentKernelError('INVALID_COMMAND', 'Source surface is invalid');
    }
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
      throw new PaymentIntentKernelError('INVALID_COMMAND', 'Expected version is invalid');
    }
    parseIsoTimestamp(submittedAt, 'submitted timestamp', 'INVALID_COMMAND');
  }

  private assertEvidenceInput(envelope: PaymentEvidenceCommandEnvelope): void {
    const evidence = envelope.evidence;
    if (!evidence || typeof evidence !== 'object') {
      throw new PaymentIntentKernelError('INVALID_COMMAND', 'Evidence is required');
    }
    assertIdentifier(evidence.evidenceId, 'evidence id');
    assertIdentifier(evidence.paymentIntentId, 'payment intent id');
    assertIdentifier(evidence.sourceEventId, 'source event id');
    assertBoundedText(evidence.evidenceType, 'evidence type');
    assertBoundedText(evidence.paymentRail, 'payment rail');
    assertBoundedText(evidence.payerReferenceHash, 'payer reference hash', 512);
    assertBoundedText(evidence.receiverReferenceHash, 'receiver reference hash', 512);
    assertBoundedText(evidence.paymentReferenceHash, 'payment reference hash', 512);
    if (evidence.sourceSurface !== envelope.sourceSurface) {
      throw new PaymentIntentKernelError(
        'INVALID_COMMAND',
        'Evidence source must match the command source',
      );
    }
    if (!evidence.amount || typeof evidence.amount !== 'object' ||
        !Number.isSafeInteger(evidence.amount.minorUnits) ||
        evidence.amount.minorUnits <= 0) {
      throw new PaymentIntentKernelError('INVALID_SCOPE', 'Evidence amount is invalid');
    }
    if (typeof evidence.amount.currency !== 'string' ||
        !/^[A-Z]{3}$/.test(evidence.amount.currency.trim().toUpperCase())) {
      throw new PaymentIntentKernelError('INVALID_SCOPE', 'Evidence currency is invalid');
    }
    parseIsoTimestamp(evidence.observedAt, 'evidence observation');
  }

  private nowIso(): string {
    return this.dependencies.now().toISOString();
  }

  private fingerprint(value: unknown): string {
    return this.dependencies.hash(stableStringify(value));
  }

  private readReplay<T extends PaymentIntentCommandResult | PaymentEvidenceCommandResult>(
    commandId: string,
    kind: StoredCommandResult['kind'],
    fingerprint: string,
  ): T | null {
    const stored = this.commandResults.get(commandId);
    if (!stored) return null;
    if (stored.kind !== kind || stored.fingerprint !== fingerprint) {
      throw new PaymentIntentKernelError(
        'IDEMPOTENCY_CONFLICT',
        'Command id was reused with a different command',
      );
    }
    return {
      ...clone(stored.result),
      auditEvent: null,
      replayed: true,
    } as T;
  }
}

const ACTOR_ROLES = new Set(['payer', 'receiver', 'organizer', 'host_adapter', 'system']);
const SOURCE_SURFACES = new Set(['web', 'telegram', 'dot-host', 'other']);
const COVERED_SPLIT_STATUSES = new Set(['open', 'request_sent', 'marked_paid', 'confirmed']);
const COMMAND_TYPES = new Set([
  'create_intent',
  'send_request',
  'mark_paid',
  'confirm_received',
  'cancel',
  'expire',
  'dispute',
]);

function normalizeRequiredText(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new PaymentIntentKernelError('INVALID_SCOPE', `${label} is required`);
  }
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized || normalized.length > 200) {
    throw new PaymentIntentKernelError('INVALID_SCOPE', `${label} is required`);
  }
  return normalized;
}

function assertIdentifier(
  value: string,
  label: string,
  code: PaymentIntentKernelErrorCode = 'INVALID_SCOPE',
): void {
  if (typeof value !== 'string' ||
      value.length === 0 ||
      value.length > 200 ||
      value.trim() !== value ||
      /[\u0000-\u001f\u007f]/.test(value)) {
    throw new PaymentIntentKernelError(code, `${label} is invalid`);
  }
}

function assertBoundedText(
  value: string,
  label: string,
  maxLength = 200,
  code: PaymentIntentKernelErrorCode = 'INVALID_SCOPE',
): void {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new PaymentIntentKernelError(code, `${label} is invalid`);
  }
}

function parseIsoTimestamp(
  value: string,
  label: string,
  code: PaymentIntentKernelErrorCode = 'INVALID_SCOPE',
): number {
  const timestamp = typeof value === 'string' ? Date.parse(value) : Number.NaN;
  if (!Number.isFinite(timestamp)) {
    throw new PaymentIntentKernelError(code, `${label} is invalid`);
  }
  return timestamp;
}

function assertInitialSplit(split: CoveredSplitSnapshot): void {
  if (!split || typeof split !== 'object') {
    throw new PaymentIntentKernelError('INVALID_SCOPE', 'Initial split is invalid');
  }
  assertIdentifier(split.id, 'split id');
  assertIdentifier(split.groupId, 'split group id');
  assertIdentifier(split.payerUserId, 'split payer id');
  assertIdentifier(split.receiverUserId, 'split receiver id');
  if (split.payerUserId === split.receiverUserId ||
      !Number.isSafeInteger(split.amountMinor) ||
      split.amountMinor <= 0 ||
      !/^[A-Z]{3}$/.test(split.currency) ||
      !COVERED_SPLIT_STATUSES.has(split.status) ||
      !Number.isSafeInteger(split.version) ||
      split.version < 0) {
    throw new PaymentIntentKernelError('INVALID_SCOPE', `Initial split ${split.id} is invalid`);
  }
}

function withoutUndefinedValues(
  dependencies: PaymentIntentKernelDependencies,
): PaymentIntentKernelDependencies {
  return Object.fromEntries(
    Object.entries(dependencies).filter(([, value]) => value !== undefined),
  ) as PaymentIntentKernelDependencies;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortValue(nestedValue)]),
    );
  }
  return value;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
