
import { useState, useEffect, useCallback, useRef } from 'react';
import * as Automerge from '@automerge/automerge';
import type { Pot, Member, Expense } from '../schema/pot';
import type { CRDTPotDocument, CRDTChangeEvent } from '../services/crdt/types';
import {
  createPotDocument,
  documentToPot,
  addMember as addMemberToCRDT,
  updateMember as updateMemberInCRDT,
  removeMember as removeMemberFromCRDT,
  addExpense as addExpenseToCRDT,
  updateExpense as updateExpenseInCRDT,
  deleteExpense as deleteExpenseFromCRDT,
  updatePotMetadata,
  getAllChanges,
  applyChanges,
} from '../services/crdt/automergeUtils';
import { PotRealtimeSync, fetchRecentChanges } from '../services/crdt/realtimeSync';
import { CheckpointManager } from '../services/crdt/checkpointManager';
import { isPotMember } from '../services/crdt/membershipService';

export interface UsePotSyncResult {
  pot: Pot | null;
  isLoading: boolean;
  isSyncing: boolean;
  isOnline: boolean;
  error: Error | null;
  
  addMember: (member: Member) => void;
  updateMember: (memberId: string, updates: Partial<Member>) => void;
  removeMember: (memberId: string) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (expenseId: string, updates: Partial<Expense>) => void;
  deleteExpense: (expenseId: string) => void;
  updateMetadata: (updates: Partial<Pot>) => void;
  
  forceSave: () => Promise<void>;
  forceSync: () => Promise<void>;
}

export function usePotSync(
  potId: string,
  userId: string,
  initialPot?: Pot
): UsePotSyncResult {
  const [pot, setPot] = useState<Pot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const docRef = useRef<Automerge.Doc<CRDTPotDocument> | null>(null);
  const realtimeSyncRef = useRef<PotRealtimeSync | null>(null);
  const checkpointManagerRef = useRef<CheckpointManager | null>(null);
  const pendingChangesRef = useRef<Uint8Array[]>([]);

  /**
   * Initialize document from checkpoint or create new
   */
  const initializeDocument = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const isMember = await isPotMember(potId, userId);
      if (!isMember) {
        throw new Error('Not authorized to access this pot');
      }

      const checkpointManager = new CheckpointManager(potId);
      checkpointManagerRef.current = checkpointManager;

      let doc = await checkpointManager.loadLatestCheckpoint();

      if (!doc && initialPot) {
        doc = createPotDocument(initialPot);
        console.log('[usePotSync] Created new document from initial pot');
      }

      if (!doc) {
        throw new Error('No pot document available');
      }

      docRef.current = doc;

      const checkpoint = await checkpointManager.getCheckpointMetadata();
      const changes = await fetchRecentChanges(
        potId,
        checkpoint?.createdAt
      );

      if (changes.length > 0) {
        console.log('[usePotSync] Applying', changes.length, 'recent changes');
        const changeData = changes.map((c: CRDTChangeEvent) => c.changeData);
        doc = applyChanges(doc, changeData);
        docRef.current = doc;
      }

      setPot(documentToPot(doc));
      setIsLoading(false);

      await startRealtimeSync();
    } catch (err) {
      console.error('[usePotSync] Initialization error:', err);
      setError(err as Error);
      setIsLoading(false);
    }
  }, [potId, userId, initialPot]);

  /**
   * Start realtime sync
   */
  const startRealtimeSync = useCallback(async () => {
    try {
      const sync = new PotRealtimeSync(potId);
      realtimeSyncRef.current = sync;

      sync.onChange((changeEvent: CRDTChangeEvent) => {
        console.log('[usePotSync] Received remote change', changeEvent);
        applyRemoteChange(changeEvent.changeData);
      });

      await sync.start();
      setIsOnline(sync.isOnline());

      console.log('[usePotSync] Realtime sync started');
    } catch (err) {
      console.error('[usePotSync] Failed to start realtime sync:', err);
    }
  }, [potId]);

  /**
   * Apply a remote change to the document
   */
  const applyRemoteChange = useCallback((changeData: Uint8Array) => {
    if (!docRef.current) return;

    try {
      const newDoc = applyChanges(docRef.current, [changeData]);
      docRef.current = newDoc;
      setPot(documentToPot(newDoc));
    } catch (err) {
      console.error('[usePotSync] Failed to apply remote change:', err);
    }
  }, []);

  /**
   * Broadcast local changes
   */
  const broadcastChanges = useCallback(async (doc: Automerge.Doc<CRDTPotDocument>) => {
    const sync = realtimeSyncRef.current;
    if (!sync) {
      const changes = getAllChanges(doc);
      pendingChangesRef.current.push(...changes);
      return;
    }

    try {
      setIsSyncing(true);
      
      const changes = getAllChanges(doc);
      
      for (const change of changes) {
        await sync.broadcastChange(doc, change, userId);
      }

      const checkpointManager = checkpointManagerRef.current;
      if (checkpointManager && checkpointManager.shouldCheckpoint(doc)) {
        console.log('[usePotSync] Creating checkpoint...');
        await checkpointManager.createCheckpoint(doc, userId);
        await checkpointManager.cleanupOldCheckpoints();
      }
    } catch (err) {
      console.error('[usePotSync] Failed to broadcast changes:', err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [userId]);

  /**
   * Update document and sync
   */
  const updateDocument = useCallback(
    (updater: (doc: Automerge.Doc<CRDTPotDocument>) => Automerge.Doc<CRDTPotDocument>) => {
      if (!docRef.current) {
        console.warn('[usePotSync] No document to update');
        return;
      }

      try {
        const newDoc = updater(docRef.current);
        docRef.current = newDoc;
        setPot(documentToPot(newDoc));
        
        broadcastChanges(newDoc).catch(err => {
          console.error('[usePotSync] Failed to broadcast:', err);
          setError(err);
        });
      } catch (err) {
        console.error('[usePotSync] Update failed:', err);
        setError(err as Error);
      }
    },
    [broadcastChanges]
  );

  useEffect(() => {
    initializeDocument();

    return () => {
      const sync = realtimeSyncRef.current;
      if (sync) {
        sync.stop();
      }
    };
  }, [initializeDocument]);

  const addMember = useCallback((member: Member) => {
    updateDocument(doc => addMemberToCRDT(doc, member));
  }, [updateDocument]);

  const updateMemberCallback = useCallback((memberId: string, updates: Partial<Member>) => {
    updateDocument(doc => updateMemberInCRDT(doc, memberId, updates as any));
  }, [updateDocument]);

  const removeMemberCallback = useCallback((memberId: string) => {
    updateDocument(doc => removeMemberFromCRDT(doc, memberId));
  }, [updateDocument]);

  const addExpenseCallback = useCallback((expense: Expense) => {
    updateDocument(doc => addExpenseToCRDT(doc, expense));
  }, [updateDocument]);

  const updateExpenseCallback = useCallback((expenseId: string, updates: Partial<Expense>) => {
    updateDocument(doc => updateExpenseInCRDT(doc, expenseId, updates as any));
  }, [updateDocument]);

  const deleteExpenseCallback = useCallback((expenseId: string) => {
    updateDocument(doc => deleteExpenseFromCRDT(doc, expenseId));
  }, [updateDocument]);

  const updateMetadataCallback = useCallback((updates: Partial<Pot>) => {
    updateDocument(doc => updatePotMetadata(doc, updates as any));
  }, [updateDocument]);

  const forceSave = useCallback(async () => {
    if (!docRef.current || !checkpointManagerRef.current) return;
    await checkpointManagerRef.current.createCheckpoint(docRef.current, userId);
  }, [userId]);

  const forceSync = useCallback(async () => {
    await initializeDocument();
  }, [initializeDocument]);

  return {
    pot,
    isLoading,
    isSyncing,
    isOnline,
    error,
    addMember,
    updateMember: updateMemberCallback,
    removeMember: removeMemberCallback,
    addExpense: addExpenseCallback,
    updateExpense: updateExpenseCallback,
    deleteExpense: deleteExpenseCallback,
    updateMetadata: updateMetadataCallback,
    forceSave,
    forceSync,
  };
}
