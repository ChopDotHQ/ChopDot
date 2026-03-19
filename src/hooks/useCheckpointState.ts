import { useEffect, useMemo, useState } from 'react';
import { computePotHash, type PotCheckpointInput } from '../services/chain/remark';
import type { PotHistory } from '../types/app';
import { logDev, warnDev } from '../utils/logDev';
import { savePotSnapshot } from '../services/backup/backupService';
import type { Pot as DataLayerPot } from '../services/data/types';
import type { NormalizedMember, NormalizedExpense } from './usePotDataMerge';

interface UseCheckpointStateOptions {
  pot: DataLayerPot | null;
  potId?: string;
  potName: string;
  baseCurrency: string;
  members: NormalizedMember[];
  expenses: NormalizedExpense[];
  potHistory: PotHistory[];
  showCheckpointSection: boolean;
  isWalletConnected: boolean;
  walletAddress?: string | null;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
  potService: { updatePot: (id: string, updates: Record<string, unknown>) => Promise<unknown> };
  refreshPot: () => void;
}

function normalizeHistory(history: (PotHistory | { status?: string;[key: string]: unknown })[]): PotHistory[] {
  return history.map(entry => {
    const base = entry as PotHistory;
    return { ...base, status: base.status ?? 'submitted' } as PotHistory;
  });
}

export function useCheckpointState({
  pot,
  potId,
  potName,
  baseCurrency,
  members,
  expenses,
  potHistory,
  showCheckpointSection,
  isWalletConnected,
  walletAddress,
  onShowToast,
  potService,
  refreshPot,
}: UseCheckpointStateOptions) {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [lastCheckpointClick, setLastCheckpointClick] = useState(0);

  const potHistoryFromDL = normalizeHistory(pot?.history ?? []);
  const activeHistory = potHistoryFromDL.length > 0
    ? potHistoryFromDL
    : normalizeHistory(potHistory as (PotHistory | { status?: string;[key: string]: unknown })[]);

  useEffect(() => {
    if (import.meta.env.DEV && activeHistory.length > 0) {
      logDev('[DL][history] items loaded', {
        total: activeHistory.length,
        settlements: activeHistory.filter(e => e.type === 'onchain_settlement').length,
        checkpoints: activeHistory.filter(e => e.type === 'remark_checkpoint').length,
        source: potHistoryFromDL.length > 0 ? 'DL' : 'props',
      });
    }
  }, [activeHistory, potHistoryFromDL.length]);

  const checkpointHistory = useMemo(
    () => activeHistory.filter(
      (entry): entry is Extract<PotHistory, { type: 'remark_checkpoint' }> =>
        entry.type === 'remark_checkpoint',
    ),
    [activeHistory],
  );

  const latestCheckpointEntry = checkpointHistory[0];
  const lastBackupCid = pot?.lastBackupCid ?? latestCheckpointEntry?.cid ?? null;

  const checkpointInput = useMemo<PotCheckpointInput>(() => ({
    id: potId || potName,
    name: potName,
    baseCurrency,
    members: members.map((m) => ({ id: m.id, name: m.name, address: m.address ?? null })),
    expenses: expenses.map((e) => ({
      id: e.id, amount: e.amount, paidBy: e.paidBy, memo: e.memo, date: e.date,
      split: (e.split || []).map((s) => ({ memberId: s.memberId, amount: s.amount })),
    })),
    lastBackupCid,
  }), [baseCurrency, expenses, lastBackupCid, members, potId, potName]);

  const ipfsGatewayBase = (import.meta.env.VITE_IPFS_GATEWAY as string | undefined) || 'https://ipfs.io/ipfs/';
  const buildIpfsUrl = (cid: string) => {
    const base = ipfsGatewayBase.endsWith('/') ? ipfsGatewayBase : `${ipfsGatewayBase}/`;
    return `${base}${cid}`;
  };

  const currentPotHash = useMemo(
    () => computePotHash(checkpointInput, checkpointInput.lastBackupCid ?? null),
    [checkpointInput],
  );
  const latestCheckpointHash = latestCheckpointEntry?.potHash;
  const hashComparison: 'unchanged' | 'changed' | 'no checkpoint' =
    latestCheckpointHash && latestCheckpointHash === currentPotHash
      ? 'unchanged'
      : latestCheckpointHash
        ? 'changed'
        : 'no checkpoint';

  const handleCheckpoint = async () => {
    const now = Date.now();
    if (now - lastCheckpointClick < 2000) return;
    setLastCheckpointClick(now);
    if (!showCheckpointSection) return;
    if (!isWalletConnected || !walletAddress) {
      onShowToast?.('Connect a wallet to checkpoint on-chain', 'error');
      return;
    }
    onShowToast?.('Checkpoint feature has been removed', 'info');
  };

  const handleBackupToCrust = async () => {
    if (!pot || !potId) {
      onShowToast?.('Pot data not available', 'error');
      return;
    }
    setIsBackingUp(true);
    try {
      const { cid } = await savePotSnapshot(pot);
      await potService.updatePot(potId, { lastBackupCid: cid });
      refreshPot();
      onShowToast?.(`Backup saved to Crust (CID: ${cid.slice(0, 8)}...)`, 'success');
      if (import.meta.env.DEV) {
        logDev('[BackupService] Backup completed and CID saved', { potId, cid });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Backup failed';
      onShowToast?.(`Backup failed: ${msg}`, 'error');
      warnDev('[BackupService] Backup failed', error);
    } finally {
      setIsBackingUp(false);
    }
  };

  const getCheckpointStatusBadge = (status: PotHistory['status']) => {
    switch (status) {
      case 'finalized': return { label: 'Finalized', color: 'var(--success)' };
      case 'in_block': return { label: 'In block', color: 'var(--accent)' };
      case 'submitted': return { label: 'Submitted', color: 'var(--accent)' };
      case 'failed':
      default: return { label: 'Failed', color: 'var(--danger)' };
    }
  };

  const formatCheckpointTimestamp = (when: number) => {
    try {
      return new Date(when).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch { return ''; }
  };

  const truncateHash = (hash?: string) => hash ? `${hash.slice(0, 10)}\u2026${hash.slice(-6)}` : '\u2014';

  return {
    activeHistory,
    checkpointHistory,
    checkpointInput,
    currentPotHash,
    latestCheckpointHash,
    hashComparison,
    isBackingUp,
    handleCheckpoint,
    handleBackupToCrust,
    getCheckpointStatusBadge,
    formatCheckpointTimestamp,
    truncateHash,
    buildIpfsUrl,
    lastBackupCid,
  };
}
