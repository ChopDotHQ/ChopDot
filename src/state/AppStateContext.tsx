import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState, ReactNode, Dispatch } from 'react';
import { Action } from './store';
import { AppState } from '../types';
import {verifyFinalizedPasPaymentReference, verifyPasPaymentReceipt} from '../payments/pasWallet';
import { createCleanState, reducer } from './store';
import { appStorage } from '../environment';
import {
  authorizeSharedAction,
  connectHostSession,
  createSharedEnvelope,
  isSharedAction,
  parseHostSessionConfig,
  signerMatchesEnvelope,
  type HostParticipant,
  type HostSessionConnection,
  type HostSessionConfig,
  type HostSessionEnvelope,
  type SharedActionEnvelope,
} from '../environment/hostSessionSync';
import {
  isPayerMarkedPaidEnvelope,
  isReceiptConfirmedEnvelope,
  isReceiptConfirmedNotice,
  derivePayerSessionConfig,
  validatePayerMarkedPaidEnvelope,
} from '../environment/livePayerSync';
import {
  DeferredSharedEventInbox,
  ProcessedEventLedger,
  SharedActionOutbox,
  resolveSharedActionSessions,
  restoreDeferredSharedEvents,
  sharedSessionKey,
} from '../environment/sharedActionDelivery';
import {
  ProductionAuthority,
  createCanonicalAuthorityEventEnvelope,
  isCanonicalAuthorityEventAck,
  isCanonicalAuthorityEventEnvelope,
  isProductionAuthorityAction,
  type CanonicalAuthorityEventAckV1,
  type CloseoutSuccessorAuthorityCommandV1,
  type ExpenseCorrectionAuthorityCommandV1,
  type ShareAdjustmentAuthorityCommandV1,
  type ModeAuthorityCommandV1,
  type ProductionAuthorityAction,
  type AcceptedMembershipGrantResolver,
  type AuthorityGroupAccessProvisioner,
  type AuthorityAppendResult,
  type AuthorityIdentity,
  type MembershipAuthorityCommandV1,
  type MembershipAuthorityMutationResolver,
  type CanonicalAuthorityEventEnvelopeV1,
} from '../core/authority/productionAuthority';
import type {CanonicalEventV1, CanonicalGroupStateV1} from '../core/moneyEventKernel';
import {executeMembershipAuthorityMutation} from './membershipAuthorityExecution';
import {
  BrowserAuthorityIdentityResolver,
  IndexedDbAuthorityJournalStore,
  verifyParticipantSignature,
} from '../core/authority/browserAuthority';
import {rotateGroupCreationSession} from '../membership/groupCreationSessionDraft';
import {bootstrapLegacyAssessment, summarizeLegacyAssessment, type LegacyAssessmentSummaryV1} from '../core/legacyMoneyMigration';

type SessionStatus = 'off' | 'connecting' | 'ready' | 'error';

interface AppStateContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  bindProductAccountIdentity: (identity: {
    participantId: string;
    displayName: string;
    accountPublicKeyHex: string;
  }) => boolean;
  hostParticipant: HostParticipant | null;
  sessionStatus: SessionStatus;
  authorityStatus: 'checking' | 'ready' | 'error';
  authorityError?: string;
  legacyAssessmentStatus: 'checking' | 'ready' | 'error';
  legacyMigrationAssessment: LegacyAssessmentSummaryV1 | null;
  authorityBusy: boolean;
  runAuthority: (action: ProductionAuthorityAction) => Promise<boolean>;
  runModeAuthority: (command: ModeAuthorityCommandV1) => Promise<CanonicalGroupStateV1 | null>;
  runExpenseCorrectionAuthority: (command: ExpenseCorrectionAuthorityCommandV1) => Promise<CanonicalGroupStateV1 | null>;
  runCloseoutSuccessorAuthority: (command: CloseoutSuccessorAuthorityCommandV1) => Promise<CanonicalGroupStateV1 | null>;
  runShareAdjustmentAuthority: (command: ShareAdjustmentAuthorityCommandV1) => Promise<CanonicalGroupStateV1 | null>;
  runMembershipAuthority: (command: MembershipAuthorityCommandV1) => Promise<CanonicalGroupStateV1 | null>;
  readCanonicalGroup: (groupId: string) => Promise<CanonicalGroupStateV1 | null>;
  readAcceptedEvents: (groupId: string) => Promise<CanonicalEventV1[]>;
  readGroupOrigin: (groupId: string) => Promise<CanonicalEventV1 | null>;
  acceptCanonicalEvent: (envelope: CanonicalAuthorityEventEnvelopeV1) => Promise<void>;
  importRecoveredEvents: (events: CanonicalEventV1[]) => Promise<'applied' | 'duplicate'>;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);
const STORAGE_KEY = 'chopdot-portable-shell-state-v1';

declare global {
  interface Window {
    __CHOPDOT_SESSION_OBSERVER__?: {
      status: SessionStatus;
      received: number;
      applied: number;
      rejected: number;
      deferred: number;
      published: number;
      lastError?: string;
      lastRejection?: string;
    };
  }
}

export interface ProductionAuthorityDependencies {
  acceptedMemberships?: AcceptedMembershipGrantResolver;
  membershipChanges?: MembershipAuthorityMutationResolver;
  groupAccess?: AuthorityGroupAccessProvisioner;
  resolveExternalIdentity?: (participantId: string, expectedPublicKeyHex?: string) => Promise<AuthorityIdentity | null>;
  canonicalDelivery?: {
    publish(event: CanonicalEventV1, state: CanonicalGroupStateV1): Promise<void>;
    publishMembershipJoin?(events: CanonicalEventV1[], state: CanonicalGroupStateV1, recipientId: string): Promise<void>;
    publishMembershipRemoval?(events: CanonicalEventV1[], participantId: string): Promise<void>;
  };
}

export function AppStateProvider({ children, authorityDependencies }: { children: ReactNode; authorityDependencies?: ProductionAuthorityDependencies }) {
  const [state, baseDispatch] = useReducer(reducer, undefined, loadInitialState);
  const [hostParticipant, setHostParticipant] = useState<HostParticipant | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('off');
  const [authorityStatus, setAuthorityStatus] = useState<'checking' | 'ready' | 'error'>('checking');
  const [authorityError, setAuthorityError] = useState<string>();
  const [legacyAssessmentStatus, setLegacyAssessmentStatus] = useState<'checking' | 'ready' | 'error'>('checking');
  const [legacyMigrationAssessment, setLegacyMigrationAssessment] = useState<LegacyAssessmentSummaryV1 | null>(null);
  const [authorityPending, setAuthorityPending] = useState(0);
  const stateRef = useRef(state);
  const connectionRef = useRef<HostSessionConnection | null>(null);
  const liveGroupConnectionsRef = useRef(new Map<string, HostSessionConnection>());
  const querySessionRef = useRef<HostSessionConfig | null>(parseHostSessionConfig());
  const participantRef = useRef<HostParticipant | null>(null);
  const sharedActionOutboxRef = useRef(new SharedActionOutbox(appStorage));
  const processedEventLedgerRef = useRef(new ProcessedEventLedger(appStorage));
  const seenEventsRef = useRef(new Set(processedEventLedgerRef.current.list().map(record => record.eventId)));
  const deferredEventInboxRef = useRef(new DeferredSharedEventInbox(appStorage));
  const [restoredPendingEvents] = useState(() => restoreDeferredSharedEvents(
    deferredEventInboxRef.current,
    seenEventsRef.current,
  ));
  const pendingEventsRef = useRef(restoredPendingEvents);
  const validatingEventsRef = useRef(new Set<string>());
  const outboxFlushRef = useRef<Promise<void> | null>(null);
  const outboxFlushRequestedRef = useRef(false);
  const authorityDeliveryFlushRef = useRef<Promise<void> | null>(null);
  const receiveCanonicalAuthorityRef = useRef<(envelope: HostSessionEnvelope, signerHex?: string, session?: HostSessionConfig) => void>(() => undefined);
  const observerRef = useRef({status: 'off' as SessionStatus, received: 0, applied: 0, rejected: 0, deferred: restoredPendingEvents.size, published: 0, lastError: undefined as string | undefined, lastRejection: undefined as string | undefined});
  const managedGroupIdsRef = useRef(new Set<string>());
  const authorityQueueRef = useRef(Promise.resolve());
  const authorityVaultRef = useRef<IndexedDbAuthorityJournalStore | null>(null);
  const authorityRef = useRef<ProductionAuthority | null>(null);

  if (!authorityRef.current) {
    const vault = new IndexedDbAuthorityJournalStore();
    authorityVaultRef.current = vault;
    const identities = new BrowserAuthorityIdentityResolver(vault, async participantId => {
      const external = await authorityDependencies?.resolveExternalIdentity?.(participantId);
      if (external) return external;
      const connection = [connectionRef.current, ...liveGroupConnectionsRef.current.values()]
        .find(candidate => candidate?.participant.userId === participantId);
      if (!connection) return null;
      return {
        participantId,
        publicKeyHex: connection.participant.publicKeyHex,
        signer: {sign: bytes => connection.signBytes(bytes)},
      };
    });
    authorityRef.current = new ProductionAuthority({
      journal: vault,
      identities,
      verify: verifyParticipantSignature,
      memberships: authorityDependencies?.acceptedMemberships,
      membershipChanges: authorityDependencies?.membershipChanges,
      groupAccess: authorityDependencies?.groupAccess,
      verifyFinalizedPayment: async request => {
        if (request.amount.currency !== 'PAS' || request.amount.exponent > 18) {
          throw new Error('This finalized payment route supports exact PAS shares only.');
        }
        const amountBaseUnits = (BigInt(request.amount.minorUnits) * (10n ** BigInt(18 - request.amount.exponent))).toString();
        return verifyFinalizedPasPaymentReference({
          txHash: request.reference,
          from: request.payerAddress,
          to: request.receiverAddress,
          amountBaseUnits,
        });
      },
    });
  }

  const updateObserver = useCallback((changes: Partial<typeof observerRef.current>) => {
    observerRef.current = {...observerRef.current, ...changes};
    window.__CHOPDOT_SESSION_OBSERVER__ = {...observerRef.current};
  }, []);

  const markProcessed = useCallback((eventId: string, outcome: 'local' | 'applied' | 'rejected') => {
    seenEventsRef.current.add(eventId);
    processedEventLedgerRef.current.record(eventId, outcome);
  }, []);

  const apply = useCallback((action: Action): boolean => {
    if (isProductionAuthorityAction(action)) {
      // Legacy transport envelopes do not carry their canonical ChopEventV1
      // signature. They are delivery hints only and can never mutate shared
      // money, whether or not this device has hydrated the group already.
      return false;
    }
    const nextState = reducer(stateRef.current, action);
    stateRef.current = nextState;
    // Persist the state before recording the event as processed. On restart a
    // processed ledger entry must never outrun the projection it represents.
    persistProjectionCache(nextState, managedGroupIdsRef.current);
    baseDispatch(action);
    return true;
  }, []);

  const replaceAuthorityProjection = useCallback((nextState: AppState) => {
    stateRef.current = nextState;
    persistProjectionCache(nextState, managedGroupIdsRef.current);
    baseDispatch({type: 'REPLACE_AUTHORITY_PROJECTION', payload: {state: nextState}});
  }, []);

  useEffect(() => {
    let cancelled = false;
    let startupPhase: 'legacy-assessment' | 'authority-hydration' = 'legacy-assessment';
    const authority = authorityRef.current!;
    const vault = authorityVaultRef.current!;
    void bootstrapLegacyAssessment(stateRef.current, vault)
      .then(async ({assessment, authorityGroupIds}) => {
        startupPhase = 'authority-hydration';
        authorityGroupIds.forEach(groupId => managedGroupIdsRef.current.add(groupId));
        const nextState = await authority.hydrate(stateRef.current);
        const finalAuthorityGroupIds = [...new Set(await vault.listGroupIds())].sort();
        if (JSON.stringify(finalAuthorityGroupIds) !== JSON.stringify(authorityGroupIds)) {
          throw new Error('Legacy assessment authority collision check changed during startup.');
        }
        if (!cancelled) {
          setLegacyMigrationAssessment(summarizeLegacyAssessment(assessment));
          setLegacyAssessmentStatus('ready');
        }
        return nextState;
      })
      .then(nextState => {
        if (cancelled) return;
        replaceAuthorityProjection(nextState);
        setAuthorityError(undefined);
        setAuthorityStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        const message = startupPhase === 'legacy-assessment'
          ? 'Stored legacy data could not be assessed safely.'
          : 'Shared group history could not be opened safely.';
        setAuthorityError(message);
        setAuthorityStatus('error');
        setLegacyMigrationAssessment(null);
        setLegacyAssessmentStatus('error');
        updateObserver({lastError: message, lastRejection: `startup:${startupPhase}`});
      });
    return () => { cancelled = true; };
  }, [replaceAuthorityProjection, updateObserver]);

  const deferEnvelope = useCallback((envelope: SharedActionEnvelope, signerHex?: string): boolean => {
    try {
      const deferred = deferredEventInboxRef.current.defer({envelope, signerHex});
      pendingEventsRef.current.set(deferred.eventId, {
        envelope: deferred.envelope,
        ...(deferred.signerHex ? {signerHex: deferred.signerHex} : {}),
      });
      observerRef.current.deferred = pendingEventsRef.current.size;
      updateObserver(observerRef.current);
      return true;
    } catch (reason) {
      observerRef.current.lastError = reason instanceof Error ? reason.message : String(reason);
      updateObserver(observerRef.current);
      return false;
    }
  }, [updateObserver]);

  const retryPending = useCallback(() => {
    let madeProgress = true;
    while (madeProgress) {
      madeProgress = false;
      for (const [eventId, pending] of pendingEventsRef.current) {
        const {envelope, signerHex} = pending;
        if (!stateRef.current.users[envelope.actorUserId] && envelope.action.type !== 'ADD_USER') continue;
        if (!signerMatchesEnvelope(envelope, signerHex, stateRef.current)) {
          markProcessed(eventId, 'rejected');
          deferredEventInboxRef.current.remove(eventId);
          pendingEventsRef.current.delete(eventId);
          observerRef.current.rejected += 1;
          observerRef.current.lastRejection = `signer:${signerHex ?? 'missing'} actor:${envelope.actorPublicKeyHex}`;
          madeProgress = true;
          continue;
        }
        const decision = authorizeSharedAction(stateRef.current, envelope);
        if (decision === 'defer') continue;
        if (decision === 'apply') {
          const applied = apply(envelope.action);
          markProcessed(eventId, applied ? 'applied' : 'rejected');
          deferredEventInboxRef.current.remove(eventId);
          pendingEventsRef.current.delete(eventId);
          if (applied) observerRef.current.applied += 1;
          else observerRef.current.rejected += 1;
          madeProgress = true;
        } else {
          markProcessed(eventId, 'rejected');
          deferredEventInboxRef.current.remove(eventId);
          pendingEventsRef.current.delete(eventId);
          observerRef.current.rejected += 1;
        }
      }
    }
    observerRef.current.deferred = pendingEventsRef.current.size;
    updateObserver(observerRef.current);
  }, [apply, markProcessed, updateObserver]);

  const receiveVerifiedEnvelope = useCallback((envelope: SharedActionEnvelope, signerHex?: string) => {
    observerRef.current.received += 1;
    const signedEnvelope = bindRegistrationSigner(envelope, signerHex);
    if (seenEventsRef.current.has(envelope.eventId) || pendingEventsRef.current.has(envelope.eventId)) {
      if (signedEnvelope !== envelope && signedEnvelope.action.type === 'ADD_USER') {
        apply(signedEnvelope.action);
        retryPending();
      }
      updateObserver(observerRef.current);
      return;
    }
    if (!stateRef.current.users[signedEnvelope.actorUserId] && signedEnvelope.action.type !== 'ADD_USER') {
      deferEnvelope(signedEnvelope, signerHex);
      return;
    }
    if (!signerMatchesEnvelope(signedEnvelope, signerHex, stateRef.current)) {
      markProcessed(envelope.eventId, 'rejected');
      observerRef.current.rejected += 1;
      observerRef.current.lastRejection = `signer:${signerHex ?? 'missing'} actor:${envelope.actorPublicKeyHex}`;
      updateObserver(observerRef.current);
      return;
    }

    const decision = authorizeSharedAction(stateRef.current, signedEnvelope);
    if (decision === 'defer') {
      deferEnvelope(signedEnvelope, signerHex);
      return;
    }

    if (decision === 'apply') {
      const applied = apply(signedEnvelope.action);
      markProcessed(envelope.eventId, applied ? 'applied' : 'rejected');
      if (applied) {
        observerRef.current.applied += 1;
        retryPending();
      } else {
        observerRef.current.rejected += 1;
        observerRef.current.lastRejection = `canonical-event-required:${envelope.action.type}:${envelope.actorUserId}`;
      }
    } else {
      markProcessed(envelope.eventId, 'rejected');
      observerRef.current.rejected += 1;
      observerRef.current.lastRejection = `authority:${envelope.action.type}:${envelope.actorUserId}`;
      updateObserver(observerRef.current);
    }
  }, [apply, deferEnvelope, markProcessed, retryPending, updateObserver]);

  const receiveEnvelope = useCallback((envelope: HostSessionEnvelope, signerHex?: string, session?: HostSessionConfig) => {
    if (isCanonicalAuthorityEventEnvelope(envelope) || isCanonicalAuthorityEventAck(envelope)) {
      receiveCanonicalAuthorityRef.current(envelope, signerHex, session);
      return;
    }
    if (isPayerMarkedPaidEnvelope(envelope)) {
      if (seenEventsRef.current.has(envelope.eventId) || validatingEventsRef.current.has(envelope.eventId)) return;
      validatingEventsRef.current.add(envelope.eventId);
      void validatePayerMarkedPaidEnvelope(stateRef.current, envelope, signerHex)
        .then(result => {
          validatingEventsRef.current.delete(envelope.eventId);
          if (result.ok === false) {
            markProcessed(envelope.eventId, 'rejected');
            observerRef.current.rejected += 1;
            observerRef.current.lastRejection = `payer:${result.reason}:${envelope.requestId}`;
            updateObserver(observerRef.current);
            return;
          }
          apply({
            type: 'BIND_USER_IDENTITY',
            payload: {
              userId: envelope.memberId,
              accountPublicKeyHex: result.accountPublicKeyHex,
              statementSignerHex: result.statementSignerHex,
            },
          });
          const applied = result.splitIds.every(splitId => apply({type: 'MARK_PAID', payload: {splitId, userId: envelope.memberId}}));
          markProcessed(envelope.eventId, applied ? 'applied' : 'rejected');
          if (applied) observerRef.current.applied += 1;
          else {
            observerRef.current.rejected += 1;
            observerRef.current.lastRejection = `canonical-event-required:MARK_PAID:${envelope.memberId}`;
          }
          updateObserver(observerRef.current);
        })
        .catch(reason => {
          validatingEventsRef.current.delete(envelope.eventId);
          observerRef.current.lastError = reason instanceof Error ? reason.message : String(reason);
          updateObserver(observerRef.current);
        });
      return;
    }
    // The standalone payer owns the request-scoped confirmation observer.
    // Organizer-side confirmation is applied locally only after the signed
    // event is accepted for publication; self-replay is therefore a no-op.
    if (isReceiptConfirmedEnvelope(envelope) || isReceiptConfirmedNotice(envelope)) return;
    if (envelope.action.type !== 'RECORD_MATCHED_PAYMENT') {
      receiveVerifiedEnvelope(envelope, signerHex);
      return;
    }
    if (seenEventsRef.current.has(envelope.eventId) || validatingEventsRef.current.has(envelope.eventId)) return;
    validatingEventsRef.current.add(envelope.eventId);
    void verifyPasPaymentReceipt(envelope.action.payload.receipt)
      .then(valid => {
        validatingEventsRef.current.delete(envelope.eventId);
        if (!valid) {
          markProcessed(envelope.eventId, 'rejected');
          observerRef.current.rejected += 1;
          observerRef.current.lastRejection = `payment:${envelope.eventId}`;
          updateObserver(observerRef.current);
          return;
        }
        receiveVerifiedEnvelope(envelope, signerHex);
      })
      .catch(reason => {
        validatingEventsRef.current.delete(envelope.eventId);
        observerRef.current.lastError = reason instanceof Error ? reason.message : String(reason);
        updateObserver(observerRef.current);
      });
  }, [apply, markProcessed, receiveVerifiedEnvelope, updateObserver]);

  const liveGroupSessionFingerprint = Object.values(state.groups)
    .flatMap(group => group.liveSession ? [`${group.id}:${group.liveSession.roomId}:${group.liveSession.secret}`] : [])
    .concat(Object.values(state.splits).flatMap(split => (
      split.requestId && split.requestEntryCapability && split.requestExpiresAt
        ? [`request:${split.requestId}:${split.requestEntryCapability}:${split.requestExpiresAt}`]
        : []
    )))
    .sort()
    .join('|');

  const connectionForSession = useCallback((session: HostSessionConfig): HostSessionConnection | null => {
    const key = sharedSessionKey(session);
    if (querySessionRef.current && sharedSessionKey(querySessionRef.current) === key) {
      return connectionRef.current;
    }
    return liveGroupConnectionsRef.current.get(key) ?? null;
  }, []);

  const flushAuthorityDeliveryOutbox = useCallback((): Promise<void> => {
    if (authorityDeliveryFlushRef.current) return authorityDeliveryFlushRef.current;
    const operation = authorityVaultRef.current!.listAuthorityDeliveries()
      .then(async items => {
        for (const item of items) {
          const connection = connectionForSession(item.session);
          if (!connection) continue;
          await publishWithRetry(connection, item.envelope);
        }
      })
      .finally(() => { authorityDeliveryFlushRef.current = null; });
    authorityDeliveryFlushRef.current = operation;
    return operation;
  }, [connectionForSession]);

  const drainAuthorityInbox = useCallback(async (): Promise<void> => {
    const vault = authorityVaultRef.current!;
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (const pending of await vault.listPendingAuthorityInbox()) {
        try {
          const result = await authorityRef.current!.accept(stateRef.current, pending.envelope);
          managedGroupIdsRef.current.add(result.canonicalState.groupId);
          replaceAuthorityProjection(result.state);
          await vault.markAuthorityInboxTerminal(pending.inboxId, 'applied');
          const participantId = stateRef.current.currentUserId;
          const connection = participantId ? connectionForSession(pending.session) : null;
          if (participantId && connection && result.canonicalState.members[participantId]) {
            const ack: CanonicalAuthorityEventAckV1 = {
              v: 1, kind: 'chopdot-authority-ack', groupId: result.canonicalState.groupId,
              eventId: result.event.eventId, acknowledgingParticipantId: participantId,
              occurredAt: new Date().toISOString(),
            };
            await publishWithRetry(connection, ack);
          }
          progressed = result.outcome === 'applied';
        } catch (reason) {
          const message = reason instanceof Error ? reason.message : String(reason);
          if (/depends on group history/u.test(message)) continue;
          await vault.markAuthorityInboxTerminal(pending.inboxId, 'rejected');
          updateObserver({lastError: message, lastRejection: `canonical-authority:${pending.envelope.event.eventId}`});
        }
      }
    }
  }, [connectionForSession, replaceAuthorityProjection, updateObserver]);

  const receiveCanonicalAuthority = useCallback((envelope: HostSessionEnvelope, signerHex?: string, session?: HostSessionConfig) => {
    if (isCanonicalAuthorityEventAck(envelope)) {
      void authorityQueueRef.current.then(async () => {
        const expectedKey = await authorityRef.current!.memberAccountPublicKey(envelope.groupId, envelope.acknowledgingParticipantId);
        if (!expectedKey || normalizeSigner(signerHex ?? '') !== normalizeSigner(expectedKey)) {
          updateObserver({lastRejection: `authority-ack:${envelope.eventId}`});
          return;
        }
        await authorityVaultRef.current!.acknowledgeAuthorityDelivery(envelope.eventId, envelope.acknowledgingParticipantId);
      });
      return;
    }
    if (!isCanonicalAuthorityEventEnvelope(envelope) || !session) return;
    authorityQueueRef.current = authorityQueueRef.current
      .then(async () => {
        await authorityVaultRef.current!.rememberAuthorityInbox(envelope, session);
        await drainAuthorityInbox();
      })
      .catch(reason => updateObserver({lastError: reason instanceof Error ? reason.message : String(reason)}));
  }, [drainAuthorityInbox, updateObserver]);
  receiveCanonicalAuthorityRef.current = receiveCanonicalAuthority;

  const flushSharedActionOutbox = useCallback((): Promise<void> => {
    if (outboxFlushRef.current) {
      outboxFlushRequestedRef.current = true;
      return outboxFlushRef.current;
    }
    const operation = sharedActionOutboxRef.current.flush(async item => {
      const connection = connectionForSession(item.session);
      if (!connection) return false;
      await publishWithRetry(connection, item.envelope);
      return true;
    }).then(result => {
      if (result.published.length > 0) {
        updateObserver({published: observerRef.current.published + result.published.length});
      }
    }).finally(() => {
      outboxFlushRef.current = null;
      if (outboxFlushRequestedRef.current) {
        outboxFlushRequestedRef.current = false;
        window.queueMicrotask(() => {
          void flushSharedActionOutbox();
        });
      }
    });
    outboxFlushRef.current = operation;
    return operation;
  }, [connectionForSession, updateObserver]);

  const ensureParticipantIdentity = useCallback(async (
    participant: HostParticipant,
    session: HostSessionConfig,
  ): Promise<void> => {
    const currentUserId = stateRef.current.currentUserId;
    if (!currentUserId) return;
    const currentUser = stateRef.current.users[currentUserId];
    if (!currentUser) throw new Error('The current ChopDot person is missing.');

    const participantKey = normalizeSigner(participant.publicKeyHex);
    const currentKey = currentUser.accountPublicKeyHex
      ? normalizeSigner(currentUser.accountPublicKeyHex)
      : '';
    if (!participantKey) throw new Error('The approved account is invalid.');
    if (currentKey && currentKey !== participantKey) {
      throw new Error('This ChopDot person is already connected to a different account.');
    }
    if (currentUserId !== participant.userId && stateRef.current.users[participant.userId]) {
      throw new Error('The approved account is already used by another ChopDot person.');
    }

    if (currentUserId !== participant.userId || !currentKey) {
      apply({
        type: 'MIGRATE_CURRENT_USER_IDENTITY',
        payload: {
          fromUserId: currentUserId,
          toUserId: participant.userId,
          accountPublicKeyHex: participantKey,
        },
      });
    }

    const migratedUser = stateRef.current.users[participant.userId];
    if (
      stateRef.current.currentUserId !== participant.userId
      || !migratedUser
      || normalizeSigner(migratedUser.accountPublicKeyHex ?? '') !== participantKey
    ) {
      throw new Error('ChopDot could not connect this person to the approved account.');
    }

    const eventId = identityRegistrationEventId(participant, session);
    if (!seenEventsRef.current.has(eventId)) {
      const envelope: SharedActionEnvelope = {
        ...createSharedEnvelope({type: 'ADD_USER', payload: {user: migratedUser}}, participant),
        eventId,
      };
      if (authorizeSharedAction(stateRef.current, envelope) !== 'apply') {
        throw new Error('ChopDot could not register this person in the shared group.');
      }
      sharedActionOutboxRef.current.enqueue({session, envelope});
      apply(envelope.action);
      markProcessed(eventId, 'local');
    }
    await flushSharedActionOutbox();
    if (sharedActionOutboxRef.current.list().some(item => item.envelope.eventId === eventId)) {
      throw new Error('ChopDot could not share this person with the group yet.');
    }
  }, [apply, flushSharedActionOutbox, markProcessed]);

  const queueAcceptedAuthorityDelivery = useCallback(async (before: AppState, result: AuthorityAppendResult): Promise<void> => {
    if (authorityDependencies?.canonicalDelivery) {
      await authorityDependencies.canonicalDelivery.publish(result.event, result.canonicalState);
      return;
    }
    const sessions = new Map<string, HostSessionConfig>();
    if (querySessionRef.current) sessions.set(sharedSessionKey(querySessionRef.current), querySessionRef.current);
    const legacySession = before.groups[result.canonicalState.groupId]?.liveSession;
    if (legacySession) sessions.set(sharedSessionKey(legacySession), legacySession);
    const recipients = Object.values(result.canonicalState.members)
      .filter(member => member.active !== false && member.participantId !== result.event.actorId)
      .map(member => member.participantId);
    for (const session of sessions.values()) {
      await authorityVaultRef.current!.enqueueAuthorityDelivery({
        groupId: result.canonicalState.groupId,
        eventId: result.event.eventId,
        session,
        envelope: createCanonicalAuthorityEventEnvelope(result.event),
        recipientIds: recipients,
      });
    }
  }, [authorityDependencies?.canonicalDelivery]);

  const runAuthority = useCallback((action: ProductionAuthorityAction): Promise<boolean> => {
    setAuthorityPending(current => current + 1);
    const operation = authorityQueueRef.current
      .then(async () => {
        const before = stateRef.current;
        const result = await authorityRef.current!.append(before, action);
        managedGroupIdsRef.current.add(result.canonicalState.groupId);
        await queueAcceptedAuthorityDelivery(before, result);
        replaceAuthorityProjection(result.state);
        setAuthorityError(undefined);
        await flushAuthorityDeliveryOutbox();
        return true;
      })
      .catch(reason => {
        const message = reason instanceof Error ? reason.message : String(reason);
        setAuthorityError(message);
        updateObserver({lastError: message, lastRejection: `authority:${action.type}`});
        return false;
      })
      .finally(() => setAuthorityPending(current => Math.max(0, current - 1)));
    authorityQueueRef.current = operation.then(() => undefined);
    return operation;
  }, [flushAuthorityDeliveryOutbox, queueAcceptedAuthorityDelivery, replaceAuthorityProjection, updateObserver]);

  const runModeAuthority = useCallback((command: ModeAuthorityCommandV1): Promise<CanonicalGroupStateV1 | null> => {
    setAuthorityPending(current => current + 1);
    const operation = authorityQueueRef.current
      .then(async () => {
        const before = stateRef.current;
        const result = await authorityRef.current!.appendMode(before, command);
        managedGroupIdsRef.current.add(result.canonicalState.groupId);
        await queueAcceptedAuthorityDelivery(before, result);
        replaceAuthorityProjection(result.state);
        setAuthorityError(undefined);
        await flushAuthorityDeliveryOutbox();
        return structuredClone(result.canonicalState);
      })
      .catch(reason => {
        const message = reason instanceof Error ? reason.message : String(reason);
        setAuthorityError(message);
        updateObserver({lastError: message, lastRejection: `authority:${command.eventType}`});
        return null;
      })
      .finally(() => setAuthorityPending(current => Math.max(0, current - 1)));
    authorityQueueRef.current = operation.then(() => undefined);
    return operation;
  }, [flushAuthorityDeliveryOutbox, queueAcceptedAuthorityDelivery, replaceAuthorityProjection, updateObserver]);

  const runExpenseCorrectionAuthority = useCallback((command: ExpenseCorrectionAuthorityCommandV1): Promise<CanonicalGroupStateV1 | null> => {
    setAuthorityPending(current => current + 1);
    const operation = authorityQueueRef.current
      .then(async () => {
        const before = stateRef.current;
        const result = await authorityRef.current!.appendExpenseCorrection(before, command);
        managedGroupIdsRef.current.add(result.canonicalState.groupId);
        await queueAcceptedAuthorityDelivery(before, result);
        replaceAuthorityProjection(result.state);
        setAuthorityError(undefined);
        await flushAuthorityDeliveryOutbox();
        return structuredClone(result.canonicalState);
      })
      .catch(reason => {
        const message = reason instanceof Error ? reason.message : String(reason);
        setAuthorityError(message);
        updateObserver({lastError: message, lastRejection: 'authority:EXPENSE_CORRECTED'});
        return null;
      })
      .finally(() => setAuthorityPending(current => Math.max(0, current - 1)));
    authorityQueueRef.current = operation.then(() => undefined);
    return operation;
  }, [flushAuthorityDeliveryOutbox, queueAcceptedAuthorityDelivery, replaceAuthorityProjection, updateObserver]);

  const runCloseoutSuccessorAuthority = useCallback((command: CloseoutSuccessorAuthorityCommandV1): Promise<CanonicalGroupStateV1 | null> => {
    setAuthorityPending(current => current + 1);
    const operation = authorityQueueRef.current
      .then(async () => {
        const before = stateRef.current;
        const result = await authorityRef.current!.appendCloseoutSuccessor(before, command);
        managedGroupIdsRef.current.add(result.canonicalState.groupId);
        await queueAcceptedAuthorityDelivery(before, result);
        replaceAuthorityProjection(result.state);
        setAuthorityError(undefined);
        await flushAuthorityDeliveryOutbox();
        return structuredClone(result.canonicalState);
      })
      .catch(reason => {
        const message = reason instanceof Error ? reason.message : String(reason);
        setAuthorityError(message);
        updateObserver({lastError: message, lastRejection: 'authority:SUCCESSOR_RECORD_CREATED'});
        return null;
      })
      .finally(() => setAuthorityPending(current => Math.max(0, current - 1)));
    authorityQueueRef.current = operation.then(() => undefined);
    return operation;
  }, [flushAuthorityDeliveryOutbox, queueAcceptedAuthorityDelivery, replaceAuthorityProjection, updateObserver]);

  const runShareAdjustmentAuthority = useCallback((command: ShareAdjustmentAuthorityCommandV1): Promise<CanonicalGroupStateV1 | null> => {
    setAuthorityPending(current => current + 1);
    const operation = authorityQueueRef.current
      .then(async () => {
        const before = stateRef.current;
        const result = await authorityRef.current!.appendShareAdjustment(before, command);
        managedGroupIdsRef.current.add(result.canonicalState.groupId);
        await queueAcceptedAuthorityDelivery(before, result);
        replaceAuthorityProjection(result.state);
        setAuthorityError(undefined);
        await flushAuthorityDeliveryOutbox();
        return structuredClone(result.canonicalState);
      })
      .catch(reason => {
        const message = reason instanceof Error ? reason.message : String(reason);
        setAuthorityError(message);
        updateObserver({lastError: message, lastRejection: `authority:SHARE_ADJUSTED:${command.kind}`});
        return null;
      })
      .finally(() => setAuthorityPending(current => Math.max(0, current - 1)));
    authorityQueueRef.current = operation.then(() => undefined);
    return operation;
  }, [flushAuthorityDeliveryOutbox, queueAcceptedAuthorityDelivery, replaceAuthorityProjection, updateObserver]);

  const readCanonicalGroup = useCallback(async (groupId: string): Promise<CanonicalGroupStateV1 | null> => {
    await authorityQueueRef.current;
    return authorityRef.current!.readCanonicalGroup(groupId);
  }, []);

  const runMembershipAuthority = useCallback((command: MembershipAuthorityCommandV1): Promise<CanonicalGroupStateV1 | null> => {
    setAuthorityPending(current => current + 1);
    const operation = authorityQueueRef.current
      .then(async () => {
        const before = stateRef.current;
        const canonical = await executeMembershipAuthorityMutation({
          authority: authorityRef.current!,
          base: before,
          command,
          onDurable(nextState, nextCanonical) {
            managedGroupIdsRef.current.add(nextCanonical.groupId);
            replaceAuthorityProjection(nextState);
          },
          async deliverJoin(events, next, participantId) {
            if (!authorityDependencies?.canonicalDelivery?.publishMembershipJoin) throw new Error('New-member history delivery is unavailable.');
            await authorityDependencies.canonicalDelivery.publishMembershipJoin(events, next, participantId);
          },
          async deliverRemoval(events, participantId) {
            if (!authorityDependencies?.canonicalDelivery?.publishMembershipRemoval) throw new Error('Safe member-removal delivery is unavailable.');
            await authorityDependencies.canonicalDelivery.publishMembershipRemoval(events, participantId);
          },
          deliverOther: (prior, result) => queueAcceptedAuthorityDelivery(prior, result),
        });
        setAuthorityError(undefined);
        await flushAuthorityDeliveryOutbox();
        return canonical;
      })
      .catch(reason => {
        const message = reason instanceof Error ? reason.message : String(reason);
        setAuthorityError(message);
        updateObserver({lastError: message, lastRejection: `authority:membership:${command.type}`});
        return null;
      })
      .finally(() => setAuthorityPending(current => Math.max(0, current - 1)));
    authorityQueueRef.current = operation.then(() => undefined);
    return operation;
  }, [authorityDependencies?.canonicalDelivery, flushAuthorityDeliveryOutbox, queueAcceptedAuthorityDelivery, replaceAuthorityProjection, updateObserver]);

  const readAcceptedEvents = useCallback(async (groupId: string): Promise<CanonicalEventV1[]> => {
    await authorityQueueRef.current;
    return authorityRef.current!.readAcceptedEvents(groupId);
  }, []);

  const readGroupOrigin = useCallback(async (groupId: string): Promise<CanonicalEventV1 | null> => {
    await authorityQueueRef.current;
    return authorityRef.current!.readGroupOrigin(groupId);
  }, []);

  const acceptCanonicalEvent = useCallback(async (envelope: CanonicalAuthorityEventEnvelopeV1): Promise<void> => {
    const operation = authorityQueueRef.current.then(async () => {
      const result = await authorityRef.current!.accept(stateRef.current, envelope);
      managedGroupIdsRef.current.add(result.canonicalState.groupId);
      replaceAuthorityProjection(result.state);
      setAuthorityError(undefined);
    });
    authorityQueueRef.current = operation;
    return operation;
  }, [replaceAuthorityProjection]);

  const importRecoveredEvents = useCallback(async (events: CanonicalEventV1[]): Promise<'applied' | 'duplicate'> => {
    const operation = authorityQueueRef.current.then(async () => {
      const result = await authorityRef.current!.importRecoveredEvents(stateRef.current, events);
      managedGroupIdsRef.current.add(result.canonicalState.groupId);
      replaceAuthorityProjection(result.state);
      setAuthorityError(undefined);
      return result.outcome;
    });
    authorityQueueRef.current = operation.then(() => undefined);
    return operation;
  }, [replaceAuthorityProjection]);

  const dispatch = useCallback<Dispatch<Action>>((action) => {
    if (action.type === 'RESET_TO_CLEAN') {
      rotateGroupCreationSession();
      authorityQueueRef.current = authorityQueueRef.current
        .then(async () => {
          await authorityRef.current!.clear();
          managedGroupIdsRef.current.clear();
          sharedActionOutboxRef.current.clear();
          processedEventLedgerRef.current.clear();
          seenEventsRef.current.clear();
          deferredEventInboxRef.current.clear();
          pendingEventsRef.current.clear();
          const nextState = reducer(stateRef.current, action);
          replaceAuthorityProjection(nextState);
          setAuthorityError(undefined);
        })
        .catch(reason => {
          const message = reason instanceof Error ? reason.message : String(reason);
          setAuthorityError(message);
          updateObserver({lastError: message});
        });
      return;
    }
    if (isProductionAuthorityAction(action)) {
      void runAuthority(action);
      return;
    }
    if (!isSharedAction(action)) {
      apply(action);
      return;
    }

    const sessions = resolveSharedActionSessions(stateRef.current, action, querySessionRef.current);
    if (sessions.length === 0) {
      apply(action);
      return;
    }

    const connectionParticipant = sessions
      .map(connectionForSession)
      .find((connection): connection is HostSessionConnection => Boolean(connection))
      ?.participant;
    const currentUser = stateRef.current.currentUserId
      ? stateRef.current.users[stateRef.current.currentUserId]
      : undefined;
    // A direct-entry person is migrated by ensureParticipantIdentity when the
    // first live connection is approved. Until that transition finishes, keep
    // their existing local behavior rather than publishing as another actor.
    const participant = currentUser
      ? (currentUser.accountPublicKeyHex ? {
        userId: currentUser.id,
        publicKeyHex: currentUser.accountPublicKeyHex,
        username: currentUser.name,
      } : null)
      : connectionParticipant ?? participantRef.current;
    if (!participant) {
      apply(action);
      return;
    }

    const envelope = createSharedEnvelope(action, participant);
    if (authorizeSharedAction(stateRef.current, envelope) !== 'apply') return;
    sessions.forEach(session => sharedActionOutboxRef.current.enqueue({session, envelope}));
    apply(action);
    markProcessed(envelope.eventId, 'local');
    void flushSharedActionOutbox()
      .catch((reason: unknown) => {
        const lastError = reason instanceof Error ? reason.message : String(reason);
        setSessionStatus('error');
        updateObserver({status: 'error', lastError});
      });
  }, [apply, connectionForSession, flushSharedActionOutbox, markProcessed, replaceAuthorityProjection, runAuthority, updateObserver]);

  const bindProductAccountIdentity = useCallback((identity: {
    participantId: string;
    displayName: string;
    accountPublicKeyHex: string;
  }): boolean => {
    const participantId = identity.participantId.trim();
    const accountPublicKeyHex = identity.accountPublicKeyHex.trim().toLowerCase();
    if (!participantId || !/^0x[0-9a-f]{64}$/u.test(accountPublicKeyHex)) return false;

    const before = stateRef.current;
    if (before.currentUserId) {
      const action: Action = {type: 'MIGRATE_CURRENT_USER_IDENTITY', payload: {
        fromUserId: before.currentUserId,
        toUserId: participantId,
        accountPublicKeyHex,
      }};
      const expected = reducer(before, action);
      const expectedUser = expected.users[participantId];
      if (expected.currentUserId !== participantId
        || expectedUser?.accountPublicKeyHex?.toLowerCase() !== accountPublicKeyHex) return false;
      apply(action);
    } else {
      const existing = before.users[participantId];
      if (existing && existing.accountPublicKeyHex?.toLowerCase() !== accountPublicKeyHex) return false;
      if (!existing) {
        apply({type: 'ADD_USER', payload: {user: {
          id: participantId,
          name: identity.displayName,
          accountPublicKeyHex,
        }}});
      }
      apply({type: 'SET_CURRENT_USER', payload: {userId: participantId}});
    }

    const accepted = stateRef.current.users[participantId];
    return stateRef.current.currentUserId === participantId
      && accepted?.accountPublicKeyHex?.toLowerCase() === accountPublicKeyHex;
  }, [apply]);

  useEffect(() => {
    stateRef.current = state;
    persistProjectionCache(state, managedGroupIdsRef.current);
    retryPending();
  }, [retryPending, state]);

  useEffect(() => {
    const config = querySessionRef.current;
    if (!config) {
      updateObserver({status: 'off'});
      return;
    }

    let cancelled = false;
    setSessionStatus('connecting');
    updateObserver({status: 'connecting'});
    void connectHostSession({config, onEnvelope: (envelope, signerHex) => receiveEnvelope(envelope, signerHex, config)})
      .then(connection => {
        if (cancelled) {
          connection.close();
          return;
        }
        connectionRef.current = connection;
        participantRef.current = connection.participant;
        setHostParticipant(connection.participant);
        return ensureParticipantIdentity(connection.participant, config).then(() => {
          if (cancelled) return;
          setSessionStatus('ready');
          updateObserver({status: 'ready'});
          void flushAuthorityDeliveryOutbox();
        });
      })
      .catch(reason => {
        if (cancelled) return;
        const lastError = reason instanceof Error ? reason.message : String(reason);
        setSessionStatus('error');
        updateObserver({status: 'error', lastError});
      });

    return () => {
      cancelled = true;
      connectionRef.current?.close();
      connectionRef.current = null;
    };
  }, [ensureParticipantIdentity, flushAuthorityDeliveryOutbox, receiveEnvelope, updateObserver]);

  useEffect(() => {
    const queryConfig = parseHostSessionConfig();
    const queryKey = queryConfig ? `${queryConfig.roomId}:${queryConfig.secret}` : '';
    const groupSessions = Object.values(stateRef.current.groups)
      .flatMap(group => group.liveSession ? [{groupId: group.id, kind: 'group' as const, ...group.liveSession}] : [])
      .filter(session => `${session.roomId}:${session.secret}` !== queryKey);
    const requestSessions = Object.values(stateRef.current.splits)
      .filter(split => split.requestId && split.requestEntryCapability && split.requestExpiresAt)
      .map(split => ({
        requestId: split.requestId!,
        memberCapability: split.requestEntryCapability!,
        expiresAt: split.requestExpiresAt!,
      }));
    if (groupSessions.length === 0 && requestSessions.length === 0) return;

    let cancelled = false;
    setSessionStatus('connecting');
    updateObserver({status: 'connecting'});
    void Promise.all(requestSessions.map(async request => ({
      groupId: `request:${request.requestId}`,
      kind: 'request' as const,
      ...await derivePayerSessionConfig(request.requestId, request.memberCapability),
    }))).then(derived => [...groupSessions, ...derived])
      .then(sessions => Promise.all(sessions.map(async session => {
      const key = `${session.roomId}:${session.secret}`;
      if (liveGroupConnectionsRef.current.has(key)) return;
      const connection = await connectHostSession({
        config: {roomId: session.roomId, secret: session.secret},
        onEnvelope: (envelope, signerHex) => receiveEnvelope(envelope, signerHex, {roomId: session.roomId, secret: session.secret}),
      });
      if (cancelled) {
        connection.close();
        return;
      }
      liveGroupConnectionsRef.current.set(key, connection);
      participantRef.current = connection.participant;
      setHostParticipant(current => current ?? connection.participant);
      if (session.kind === 'group') await ensureParticipantIdentity(connection.participant, session);
      })))
      .then(() => {
        if (cancelled) return;
        setSessionStatus('ready');
        updateObserver({status: 'ready'});
        void flushAuthorityDeliveryOutbox();
      })
      .catch(reason => {
        if (cancelled) return;
        const lastError = reason instanceof Error ? reason.message : String(reason);
        setSessionStatus('error');
        updateObserver({status: 'error', lastError});
      });

    return () => {
      cancelled = true;
      for (const connection of liveGroupConnectionsRef.current.values()) connection.close();
      liveGroupConnectionsRef.current.clear();
    };
  }, [ensureParticipantIdentity, flushAuthorityDeliveryOutbox, liveGroupSessionFingerprint, receiveEnvelope, updateObserver]);

  useEffect(() => {
    const retryWhenOnline = () => {
      void flushSharedActionOutbox();
      void flushAuthorityDeliveryOutbox();
    };
    window.addEventListener('online', retryWhenOnline);
    return () => window.removeEventListener('online', retryWhenOnline);
  }, [flushAuthorityDeliveryOutbox, flushSharedActionOutbox]);

  useEffect(() => {
    if (authorityStatus !== 'ready') return;
    authorityQueueRef.current = authorityQueueRef.current.then(drainAuthorityInbox);
    void flushAuthorityDeliveryOutbox();
  }, [authorityStatus, drainAuthorityInbox, flushAuthorityDeliveryOutbox]);

  if (authorityStatus === 'checking') {
    return <div role="status" className="min-h-dvh bg-white px-6 py-16 text-center text-sm font-medium text-gray-600 dark:bg-gray-950 dark:text-gray-300">Checking your groups…</div>;
  }
  if (authorityStatus === 'error') {
    return (
      <div role="alert" className="min-h-dvh bg-white px-6 py-16 text-center text-gray-900 dark:bg-gray-950 dark:text-white">
        <h1 className="text-xl font-semibold">ChopDot could not safely open this device.</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-gray-600 dark:text-gray-300">Your shared groups were not changed. Reload to try again.</p>
      </div>
    );
  }
  return <AppStateContext.Provider value={{
    state,
    dispatch,
    bindProductAccountIdentity,
    hostParticipant,
    sessionStatus,
    authorityStatus,
    legacyAssessmentStatus,
    legacyMigrationAssessment,
    authorityBusy: authorityPending > 0,
    runAuthority,
    runModeAuthority,
    runExpenseCorrectionAuthority,
    runCloseoutSuccessorAuthority,
    runShareAdjustmentAuthority,
    runMembershipAuthority,
    readCanonicalGroup,
    readAcceptedEvents,
    readGroupOrigin,
    acceptCanonicalEvent,
    importRecoveredEvents,
    ...(authorityError ? {authorityError} : {}),
  }}>{children}</AppStateContext.Provider>;
}

async function publishWithRetry(connection: HostSessionConnection, envelope: HostSessionEnvelope): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const published = await connection.publish(envelope);
      if (published) return;
      lastError = new Error('The shared action was not accepted.');
    } catch (reason) {
      lastError = reason;
    }
    await new Promise(resolve => window.setTimeout(resolve, 150 * (attempt + 1)));
  }
  throw lastError instanceof Error ? lastError : new Error('The shared action could not be published.');
}

function identityRegistrationEventId(participant: HostParticipant, session: HostSessionConfig): string {
  return `register:${session.roomId}:${participant.userId.slice(-32)}`;
}

function bindRegistrationSigner(envelope: SharedActionEnvelope, signerHex?: string): SharedActionEnvelope {
  if (envelope.action.type !== 'ADD_USER' || !signerHex) return envelope;
  const normalizedSigner = normalizeSigner(signerHex);
  if (!normalizedSigner) return envelope;
  return {
    ...envelope,
    action: {
      ...envelope.action,
      payload: {
        user: {
          ...envelope.action.payload.user,
          statementSignerHex: normalizedSigner,
        },
      },
    },
  };
}

function normalizeSigner(value: string): string {
  const normalized = value.toLowerCase().replace(/^0x/u, '');
  return /^[0-9a-f]{64}$/u.test(normalized) ? `0x${normalized}` : '';
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used within AppStateProvider');
  return context;
}

function persistProjectionCache(state: AppState, managedGroupIds: ReadonlySet<string>): void {
  const cached = structuredClone(state);
  const managedExpenseIds = new Set(
    Object.values(cached.expenses)
      .filter(expense => managedGroupIds.has(expense.groupId))
      .map(expense => expense.id),
  );
  for (const groupId of managedGroupIds) delete cached.groups[groupId];
  for (const expenseId of managedExpenseIds) delete cached.expenses[expenseId];
  for (const [splitId, split] of Object.entries(cached.splits)) {
    if (managedExpenseIds.has(split.expenseId)) delete cached.splits[splitId];
  }
  for (const [recordId, record] of Object.entries(cached.savedRecords)) {
    if (managedGroupIds.has(record.groupId)) delete cached.savedRecords[recordId];
  }
  appStorage.write(STORAGE_KEY, JSON.stringify(cached));
}

function loadInitialState(): AppState {
  const stored = appStorage.read(STORAGE_KEY);
  if (!stored) {
    return createCleanState();
  }

  try {
    const parsed = JSON.parse(stored) as AppState;
    return {
      ...createCleanState(),
      ...parsed,
      users: parsed.users ?? {},
      groups: parsed.groups ?? {},
      expenses: parsed.expenses ?? {},
      splits: parsed.splits ?? {},
      paymentMethods: parsed.paymentMethods ?? {},
      activityEvents: parsed.activityEvents ?? {},
      savedRecords: parsed.savedRecords ?? {},
    };
  } catch {
    appStorage.remove(STORAGE_KEY);
    return createCleanState();
  }
}
