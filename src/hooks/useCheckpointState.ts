/**
 * useCheckpointState - MVP stub (blockchain checkpointing removed)
 * 
 * In MVP, there is no IPFS/blockchain checkpoint functionality.
 */

export function useCheckpointState(_deps: any) {
  return {
    activeHistory: [],
    checkpointHistory: [],
    checkpointInput: null,
    currentPotHash: '',
    latestCheckpointHash: '',
    hashComparison: null,
    isBackingUp: false,
    handleCheckpoint: async () => {},
    handleBackupToCrust: async () => {},
    getCheckpointStatusBadge: () => ({ label: '', color: '' }),
    formatCheckpointTimestamp: () => '',
    truncateHash: () => '',
    buildIpfsUrl: () => '',
    lastBackupCid: null,
  };
}
