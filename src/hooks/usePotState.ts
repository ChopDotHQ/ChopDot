import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Screen } from '../nav';
import type { Pot, Settlement } from '../types/app';
import type { Notification } from '../components/screens/NotificationCenter';
import { usePots as useRemotePots } from './usePots';
import { usePot as useRemotePot } from './usePot';
import { cleanupBackupTimers } from '../services/backup/autoBackup';
import { attemptAutoRestore } from '../services/restore/autoRestore';
import { createPolkadotBuilderPartyPot } from '../data/builder-party';
import {
  normalizeMembers,
  normalizeExpenses,
  normalizeHistory,
} from '../utils/normalization';

type AccountLike = {
  status: string;
  address0: string | null;
};

type UsePotStateParams = {
  authLoading: boolean;
  isAuthenticated: boolean;
  user: { id: string; isGuest?: boolean; authMethod?: string } | null;
  isGuest: boolean;
  account: AccountLike;
  screen: Screen | null | undefined;
  stack: Screen[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
};

const migrateAttestations = (expense: unknown) => {
  const e = expense as Record<string, unknown>;
  const attestations = e.attestations;
  if (!attestations || !Array.isArray(attestations)) {
    return expense;
  }
  if (attestations.length > 0 && typeof attestations[0] === 'object') {
    return expense;
  }
  return expense;
};

const idleOrTimeout = (fn: () => void, timeout = 1000) => {
  if (typeof requestIdleCallback !== 'undefined') {
    const id = requestIdleCallback(fn, { timeout });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(fn, 100);
  return () => clearTimeout(id);
};

export const usePotState = ({
  authLoading,
  isAuthenticated,
  user,
  isGuest,
  account,
  screen,
  stack,
  showToast,
}: UsePotStateParams) => {
  const [pots, setPots] = useState<Pot[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [currentPotId, setCurrentPotId] = useState<string | null>(null);

  const notifyPotRefresh = useCallback((potId: string) => {
    window.dispatchEvent(new CustomEvent('pot-refresh', { detail: { potId } }));
  }, []);

  const dataSourceType = import.meta.env.VITE_DATA_SOURCE || 'local';
  const usingSupabaseSource = dataSourceType === 'supabase' && !authLoading && !!user && !isGuest;

  // --- Initial data load ---
  useEffect(() => {
    const isSupabase = import.meta.env.VITE_DATA_SOURCE === 'supabase';
    if (isSupabase && !authLoading && user && !isGuest) {
      try {
        localStorage.removeItem('chopdot_pots');
        localStorage.removeItem('chopdot_pots_backup');
      } catch (e) {
        console.warn('[App] Failed to clear local pots in supabase mode', e);
      }
      setHasLoadedInitialData(true);
      return;
    }

    if (hasLoadedInitialData) return;
    if (isSupabase && authLoading) return;

    (async () => {
      try {
        const savedPots = localStorage.getItem('chopdot_pots');
        if (savedPots && savedPots.length < 1000000) {
          const parsed = JSON.parse(savedPots);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let migrated = parsed.map((pot: any) => ({
              ...pot,
              expenses: (pot.expenses || []).map(migrateAttestations),
              mode: pot.mode ?? 'casual',
              confirmationsEnabled:
                pot.confirmationsEnabled ?? import.meta.env.VITE_REQUIRE_CONFIRMATIONS_DEFAULT === '1',
              lastEditAt: pot.lastEditAt ?? new Date().toISOString(),
            }));

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const hasPolkadotBuilderParty = migrated.some((p: any) => p.id === '4');
            if (!hasPolkadotBuilderParty) {
              const polkadotBuilderPartyPot = {
                ...createPolkadotBuilderPartyPot(),
                mode: 'casual' as const,
                confirmationsEnabled: false,
                lastEditAt: new Date().toISOString(),
              };
              migrated.push(polkadotBuilderPartyPot);
              try {
                const updatedJson = JSON.stringify(migrated);
                if (updatedJson.length < 1000000) {
                  localStorage.setItem('chopdot_pots', updatedJson);
                  localStorage.setItem('chopdot_pots_backup', updatedJson);
                }
              } catch {
                // Ignore save failure during migration
              }
            }

            setPots(migrated as Pot[]);
            setHasLoadedInitialData(true);
            window.dispatchEvent(new CustomEvent('pots-refresh'));
            return;
          }
        }

        const backupPots = localStorage.getItem('chopdot_pots_backup');
        if (backupPots && backupPots.length < 1000000) {
          try {
            const parsed = JSON.parse(backupPots);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.warn('[ChopDot] Restored pots from backup');
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const migrated = parsed.map((pot: any) => ({
                ...pot,
                expenses: (pot.expenses || []).map(migrateAttestations),
                mode: pot.mode ?? 'casual',
                confirmationsEnabled:
                  pot.confirmationsEnabled ?? import.meta.env.VITE_REQUIRE_CONFIRMATIONS_DEFAULT === '1',
                lastEditAt: pot.lastEditAt ?? new Date().toISOString(),
              }));
              setPots(migrated as Pot[]);
              setHasLoadedInitialData(true);
              try {
                localStorage.setItem('chopdot_pots', JSON.stringify(migrated));
              } catch {
                // Ignore restore save failure
              }
              window.dispatchEvent(new CustomEvent('pots-refresh'));
              return;
            }
          } catch (e) {
            console.error('[ChopDot] Failed to restore from backup:', e);
          }
        }

        if (!hasLoadedInitialData) {
          const seedPots = [
            {
              id: '1',
              name: 'Devconnect Buenos Aires',
              type: 'expense',
              baseCurrency: 'USD',
              members: [
                { id: 'owner', name: 'You', role: 'Owner', status: 'active' },
                { id: 'alice', name: 'Alice', role: 'Member', status: 'active' },
                { id: 'bob', name: 'Bob', role: 'Member', status: 'active' },
              ],
              expenses: [],
              budget: 500,
              budgetEnabled: true,
              checkpointEnabled: false,
            },
            {
              id: '2',
              name: 'Urbe Campus Rome',
              type: 'expense',
              baseCurrency: 'USD',
              members: [
                { id: 'owner', name: 'You', role: 'Owner', status: 'active' },
                { id: 'charlie', name: 'Charlie', role: 'Member', status: 'active' },
                { id: 'diana', name: 'Diana', role: 'Member', status: 'pending' },
              ],
              expenses: [],
              budget: 3000,
              budgetEnabled: true,
              checkpointEnabled: false,
            },
            {
              id: '3',
              name: '\u{1F4B0} Emergency Fund',
              type: 'savings',
              baseCurrency: 'DOT',
              members: [{ id: 'owner', name: 'You', role: 'Owner', status: 'active' }],
              expenses: [],
              contributions: [],
              totalPooled: 750,
              yieldRate: 12.5,
              defiProtocol: 'Acala',
              goalAmount: 5000,
              goalDescription: 'Build a 6-month emergency fund',
            },
            createPolkadotBuilderPartyPot(),
          ];

          try {
            const potsJson = JSON.stringify(seedPots);
            if (potsJson.length < 1000000) {
              localStorage.setItem('chopdot_pots', potsJson);
              localStorage.setItem('chopdot_pots_backup', potsJson);
              setPots(seedPots as Pot[]);
              window.dispatchEvent(new CustomEvent('pots-refresh'));
            }
            setHasLoadedInitialData(true);
          } catch (e) {
            console.error('[App] Failed to seed initial pots:', e);
          }
        }
      } catch (e) {
        console.error('[ChopDot] Failed to load pots:', e);
        try {
          localStorage.removeItem('chopdot_pots');
        } catch {
          // Ignore removal failure
        }
      }

      try {
        const savedSettlements = localStorage.getItem('chopdot_settlements');
        if (savedSettlements && savedSettlements.length < 500000) {
          const parsed = JSON.parse(savedSettlements);
          if (Array.isArray(parsed)) {
            setSettlements(parsed);
          }
        }
      } catch (e) {
        console.error('[ChopDot] Failed to load settlements:', e);
        try {
          localStorage.removeItem('chopdot_settlements');
        } catch {
          // Ignore
        }
      }

      try {
        const savedNotifications = localStorage.getItem('chopdot_notifications');
        if (savedNotifications && savedNotifications.length < 100000) {
          const parsed = JSON.parse(savedNotifications);
          if (Array.isArray(parsed)) {
            setNotifications(parsed);
          }
        }
      } catch {
        localStorage.removeItem('chopdot_notifications');
      }

      setHasLoadedInitialData(true);
    })();
  }, [authLoading, hasLoadedInitialData, isGuest, pots, user]);

  // --- Persist pots to localStorage ---
  useEffect(() => {
    if (!hasLoadedInitialData) return;
    return idleOrTimeout(() => {
      try {
        const data = JSON.stringify(pots);
        if (data.length > 1000000) {
          console.warn('[ChopDot] Pots data too large, not saving');
          return;
        }
        localStorage.setItem('chopdot_pots', data);
      } catch (e) {
        console.error('[ChopDot] Failed to save pots:', e);
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          localStorage.removeItem('chopdot_notifications');
        }
      }
    });
  }, [pots, hasLoadedInitialData]);

  // --- Persist settlements ---
  useEffect(() => {
    if (!hasLoadedInitialData) return;
    return idleOrTimeout(() => {
      try {
        const data = JSON.stringify(settlements);
        if (data.length > 500000) return;
        localStorage.setItem('chopdot_settlements', data);
      } catch (e) {
        console.error('[ChopDot] Failed to save settlements:', e);
      }
    });
  }, [settlements, hasLoadedInitialData]);

  // --- Persist notifications ---
  useEffect(() => {
    if (!hasLoadedInitialData) return;
    return idleOrTimeout(() => {
      try {
        const data = JSON.stringify(notifications);
        if (data.length > 100000) return;
        localStorage.setItem('chopdot_notifications', data);
      } catch (e) {
        console.error('[ChopDot] Failed to save notifications:', e);
      }
    });
  }, [notifications, hasLoadedInitialData]);

  // --- Auto-restore from IPFS ---
  useEffect(() => {
    if (!hasLoadedInitialData) return;
    if (account.status !== 'connected' || !account.address0) return;

    (async () => {
      try {
        const localPotsJson = localStorage.getItem('chopdot_pots');
        if (localPotsJson && localPotsJson.length > 0) return;

        const restoredPots = await attemptAutoRestore(account.address0!);
        if (restoredPots.length > 0) {
          setPots(restoredPots as Pot[]);
          showToast(`Restored ${restoredPots.length} pot(s) from backup`, 'success');
        }
      } catch (error) {
        console.error('[App] Auto-restore failed:', error);
      }
    })();
  }, [hasLoadedInitialData, account.status, account.address0, showToast]);

  // --- Cleanup backup timers ---
  useEffect(() => {
    return () => { cleanupBackupTimers(); };
  }, []);

  // --- Sync currentPotId from screen ---
  useEffect(() => {
    if (screen?.type === 'pot-home' && 'potId' in screen) {
      setCurrentPotId((screen as { type: 'pot-home'; potId: string }).potId);
    } else if (screen?.type === 'add-expense' && !currentPotId) {
      for (let i = stack.length - 1; i >= 0; i--) {
        const s = stack[i];
        if (s && s.type === 'pot-home' && 'potId' in s) {
          setCurrentPotId((s as { type: 'pot-home'; potId: string }).potId);
          break;
        }
      }
    }
  }, [screen, stack, currentPotId]);

  // --- Remote pot sync ---
  const { pots: remotePots } = useRemotePots();
  const remoteSyncSnapshot = useRef<string>('');
  const hasRemotePot = useMemo(
    () => (currentPotId ? remotePots.some((p) => p.id === currentPotId) : false),
    [remotePots, currentPotId],
  );
  const {
    pot: remoteCurrentPot,
    loading: currentPotLoading,
    error: currentPotError,
  } = useRemotePot(usingSupabaseSource ? currentPotId : null);

  const fallbackRemotePot = useMemo(
    () =>
      usingSupabaseSource && currentPotId
        ? remotePots.find((p) => p.id === currentPotId) || null
        : null,
    [usingSupabaseSource, currentPotId, remotePots],
  );

  const currentPot = usingSupabaseSource
    ? ((remoteCurrentPot ?? fallbackRemotePot) as Pot | null | undefined)
    : (pots.find((p) => p.id === currentPotId) as Pot | undefined);

  const lastPotRef = useRef<Pot | null>(null);
  useEffect(() => {
    if (currentPot) {
      lastPotRef.current = currentPot as Pot;
    }
  }, [currentPot]);
  const potForView = usingSupabaseSource ? currentPot ?? lastPotRef.current : currentPot;

  const normalizedCurrentPot = potForView
    ? ({
        ...potForView,
        members: normalizeMembers(potForView.members),
        expenses: normalizeExpenses(potForView.expenses, potForView.baseCurrency),
        history: normalizeHistory(potForView.history || []),
        budget: potForView.budget ?? undefined,
        goalAmount: potForView.goalAmount ?? undefined,
        totalPooled: potForView.totalPooled ?? undefined,
      } as Pot)
    : undefined;

  // --- Sync remote pots to local state ---
  useEffect(() => {
    if (!usingSupabaseSource || authLoading || !isAuthenticated) return;
    const serialized = JSON.stringify(remotePots);
    if (remoteSyncSnapshot.current === serialized) return;
    remoteSyncSnapshot.current = serialized;
    setPots(remotePots as unknown as Pot[]);
  }, [remotePots, usingSupabaseSource, authLoading, isAuthenticated]);

  // --- Toast when pot not found ---
  useEffect(() => {
    if (
      usingSupabaseSource &&
      currentPotId &&
      !currentPot &&
      !currentPotLoading &&
      currentPotError &&
      !hasRemotePot
    ) {
      showToast('Pot not found or you no longer have access.', 'error');
    }
  }, [usingSupabaseSource, currentPotId, currentPot, currentPotLoading, currentPotError, hasRemotePot, showToast]);

  return {
    pots,
    setPots,
    settlements,
    setSettlements,
    notifications,
    setNotifications,
    hasLoadedInitialData,
    currentPotId,
    setCurrentPotId,
    currentPot,
    currentPotLoading,
    normalizedCurrentPot,
    usingSupabaseSource,
    notifyPotRefresh,
    hasRemotePot,
  };
};
