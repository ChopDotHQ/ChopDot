import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState, ReactNode, Dispatch } from 'react';
import { Action } from './store';
import { AppState } from '../types';
import {verifyPasPaymentReceipt} from '../payments/pasWallet';
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

type SessionStatus = 'off' | 'connecting' | 'ready' | 'error';

interface AppStateContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  hostParticipant: HostParticipant | null;
  sessionStatus: SessionStatus;
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

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, baseDispatch] = useReducer(reducer, undefined, loadInitialState);
  const [hostParticipant, setHostParticipant] = useState<HostParticipant | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('off');
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
  const observerRef = useRef({status: 'off' as SessionStatus, received: 0, applied: 0, rejected: 0, deferred: restoredPendingEvents.size, published: 0, lastError: undefined as string | undefined, lastRejection: undefined as string | undefined});

  const updateObserver = useCallback((changes: Partial<typeof observerRef.current>) => {
    observerRef.current = {...observerRef.current, ...changes};
    window.__CHOPDOT_SESSION_OBSERVER__ = {...observerRef.current};
  }, []);

  const markProcessed = useCallback((eventId: string, outcome: 'local' | 'applied' | 'rejected') => {
    seenEventsRef.current.add(eventId);
    processedEventLedgerRef.current.record(eventId, outcome);
  }, []);

  const apply = useCallback((action: Action) => {
    const nextState = reducer(stateRef.current, action);
    stateRef.current = nextState;
    // Persist the state before recording the event as processed. On restart a
    // processed ledger entry must never outrun the projection it represents.
    appStorage.write(STORAGE_KEY, JSON.stringify(nextState));
    baseDispatch(action);
  }, []);

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
          apply(envelope.action);
          markProcessed(eventId, 'applied');
          deferredEventInboxRef.current.remove(eventId);
          pendingEventsRef.current.delete(eventId);
          observerRef.current.applied += 1;
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
      apply(signedEnvelope.action);
      markProcessed(envelope.eventId, 'applied');
      observerRef.current.applied += 1;
      retryPending();
    } else {
      markProcessed(envelope.eventId, 'rejected');
      observerRef.current.rejected += 1;
      observerRef.current.lastRejection = `authority:${envelope.action.type}:${envelope.actorUserId}`;
      updateObserver(observerRef.current);
    }
  }, [apply, deferEnvelope, markProcessed, retryPending, updateObserver]);

  const receiveEnvelope = useCallback((envelope: HostSessionEnvelope, signerHex?: string) => {
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
          result.splitIds.forEach(splitId => {
            apply({type: 'MARK_PAID', payload: {splitId, userId: envelope.memberId}});
          });
          markProcessed(envelope.eventId, 'applied');
          observerRef.current.applied += 1;
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

  const dispatch = useCallback<Dispatch<Action>>((action) => {
    if (action.type === 'RESET_TO_CLEAN') {
      sharedActionOutboxRef.current.clear();
      processedEventLedgerRef.current.clear();
      seenEventsRef.current.clear();
      deferredEventInboxRef.current.clear();
      pendingEventsRef.current.clear();
      apply(action);
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
  }, [apply, connectionForSession, flushSharedActionOutbox, markProcessed, updateObserver]);

  useEffect(() => {
    stateRef.current = state;
    appStorage.write(STORAGE_KEY, JSON.stringify(state));
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
    void connectHostSession({config, onEnvelope: receiveEnvelope})
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
  }, [ensureParticipantIdentity, receiveEnvelope, updateObserver]);

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
        onEnvelope: receiveEnvelope,
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
  }, [ensureParticipantIdentity, liveGroupSessionFingerprint, receiveEnvelope, updateObserver]);

  useEffect(() => {
    const retryWhenOnline = () => {
      void flushSharedActionOutbox();
    };
    window.addEventListener('online', retryWhenOnline);
    return () => window.removeEventListener('online', retryWhenOnline);
  }, [flushSharedActionOutbox]);

  return <AppStateContext.Provider value={{ state, dispatch, hostParticipant, sessionStatus }}>{children}</AppStateContext.Provider>;
}

async function publishWithRetry(connection: HostSessionConnection, envelope: SharedActionEnvelope): Promise<void> {
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
