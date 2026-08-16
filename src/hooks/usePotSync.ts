/**
 * usePotSync - MVP stub (CRDT/Automerge sync removed)
 * 
 * In MVP, pots are synced via Supabase directly.
 */

export function usePotSync(_deps: any) {
  return {
    pot: null,
    isLoading: false,
    isSyncing: false,
    isOnline: true,
    error: null,
    addMember: async () => {},
    updateMember: async () => {},
    removeMember: async () => {},
    addExpense: async () => {},
    updateExpense: async () => {},
    deleteExpense: async () => {},
    updateMetadata: async () => {},
    forceSave: async () => {},
    forceSync: async () => {},
  };
}
