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
  type SharedActionEnvelope,
} from '../environment/hostSessionSync';

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
  const seenEventsRef = useRef(new Set<string>());
  const pendingEventsRef = useRef(new Map<string, {envelope: SharedActionEnvelope; signerHex?: string}>());
  const validatingEventsRef = useRef(new Set<string>());
  const observerRef = useRef({status: 'off' as SessionStatus, received: 0, applied: 0, rejected: 0, deferred: 0, published: 0, lastError: undefined as string | undefined, lastRejection: undefined as string | undefined});

  const updateObserver = useCallback((changes: Partial<typeof observerRef.current>) => {
    observerRef.current = {...observerRef.current, ...changes};
    window.__CHOPDOT_SESSION_OBSERVER__ = {...observerRef.current};
  }, []);

  const apply = useCallback((action: Action) => {
    stateRef.current = reducer(stateRef.current, action);
    baseDispatch(action);
  }, []);

  const retryPending = useCallback(() => {
    let madeProgress = true;
    while (madeProgress) {
      madeProgress = false;
      for (const [eventId, pending] of pendingEventsRef.current) {
        const {envelope, signerHex} = pending;
        if (!stateRef.current.users[envelope.actorUserId] && envelope.action.type !== 'ADD_USER') continue;
        if (!signerMatchesEnvelope(envelope, signerHex, stateRef.current)) {
          pendingEventsRef.current.delete(eventId);
          seenEventsRef.current.add(eventId);
          observerRef.current.rejected += 1;
          observerRef.current.lastRejection = `signer:${signerHex ?? 'missing'} actor:${envelope.actorPublicKeyHex}`;
          madeProgress = true;
          continue;
        }
        const decision = authorizeSharedAction(stateRef.current, envelope);
        if (decision === 'defer') continue;
        pendingEventsRef.current.delete(eventId);
        seenEventsRef.current.add(eventId);
        if (decision === 'apply') {
          apply(envelope.action);
          observerRef.current.applied += 1;
          madeProgress = true;
        } else {
          observerRef.current.rejected += 1;
        }
      }
    }
    observerRef.current.deferred = pendingEventsRef.current.size;
    updateObserver(observerRef.current);
  }, [apply, updateObserver]);

  const receiveVerifiedEnvelope = useCallback((envelope: SharedActionEnvelope, signerHex?: string) => {
    observerRef.current.received += 1;
    const signedEnvelope = bindRegistrationSigner(envelope, signerHex);
    if (seenEventsRef.current.has(envelope.eventId) || pendingEventsRef.current.has(envelope.eventId)) {
      if (signedEnvelope !== envelope && signedEnvelope.action.type === 'ADD_USER') {
        apply(signedEnvelope.action);
      }
      updateObserver(observerRef.current);
      return;
    }
    if (!stateRef.current.users[signedEnvelope.actorUserId] && signedEnvelope.action.type !== 'ADD_USER') {
      pendingEventsRef.current.set(envelope.eventId, {envelope: signedEnvelope, signerHex});
      observerRef.current.deferred = pendingEventsRef.current.size;
      updateObserver(observerRef.current);
      return;
    }
    if (!signerMatchesEnvelope(signedEnvelope, signerHex, stateRef.current)) {
      seenEventsRef.current.add(envelope.eventId);
      observerRef.current.rejected += 1;
      observerRef.current.lastRejection = `signer:${signerHex ?? 'missing'} actor:${envelope.actorPublicKeyHex}`;
      updateObserver(observerRef.current);
      return;
    }

    const decision = authorizeSharedAction(stateRef.current, signedEnvelope);
    if (decision === 'defer') {
      pendingEventsRef.current.set(envelope.eventId, {envelope: signedEnvelope, signerHex});
      observerRef.current.deferred = pendingEventsRef.current.size;
      updateObserver(observerRef.current);
      return;
    }

    seenEventsRef.current.add(envelope.eventId);
    if (decision === 'apply') {
      apply(signedEnvelope.action);
      observerRef.current.applied += 1;
      retryPending();
    } else {
      observerRef.current.rejected += 1;
      observerRef.current.lastRejection = `authority:${envelope.action.type}:${envelope.actorUserId}`;
      updateObserver(observerRef.current);
    }
  }, [apply, retryPending, updateObserver]);

  const receiveEnvelope = useCallback((envelope: SharedActionEnvelope, signerHex?: string) => {
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
          seenEventsRef.current.add(envelope.eventId);
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
  }, [receiveVerifiedEnvelope, updateObserver]);

  const dispatch = useCallback<Dispatch<Action>>((action) => {
    const connection = connectionRef.current;
    if (!connection || !isSharedAction(action)) {
      apply(action);
      return;
    }
    const envelope = createSharedEnvelope(action, connection.participant);
    if (authorizeSharedAction(stateRef.current, envelope) !== 'apply') return;
    apply(action);
    seenEventsRef.current.add(envelope.eventId);
    void publishWithRetry(connection, envelope)
      .then(() => updateObserver({published: observerRef.current.published + 1}))
      .catch((reason: unknown) => {
        const lastError = reason instanceof Error ? reason.message : String(reason);
        setSessionStatus('error');
        updateObserver({status: 'error', lastError});
      });
  }, [apply, updateObserver]);

  useEffect(() => {
    stateRef.current = state;
    appStorage.write(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const config = parseHostSessionConfig();
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
        setHostParticipant(connection.participant);
        setSessionStatus('ready');
        updateObserver({status: 'ready'});
      })
      .catch(() => {
        if (cancelled) return;
        setSessionStatus('error');
        updateObserver({status: 'error'});
      });

    return () => {
      cancelled = true;
      connectionRef.current?.close();
      connectionRef.current = null;
    };
  }, [receiveEnvelope, updateObserver]);

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
