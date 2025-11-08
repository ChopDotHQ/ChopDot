import { blake2AsHex } from '@polkadot/util-crypto';
import { chain } from './index';
import type { PotHistory } from '../../App';

type PotCheckpointMember = {
  id: string;
  name: string;
  address?: string | null;
};

type PotCheckpointSplit = {
  memberId: string;
  amount: number;
};

type PotCheckpointExpense = {
  id: string;
  amount: number;
  paidBy: string;
  memo?: string;
  date?: string;
  split: PotCheckpointSplit[];
};

export type PotCheckpointInput = {
  id: string;
  name: string;
  baseCurrency: string;
  members: PotCheckpointMember[];
  expenses: PotCheckpointExpense[];
  lastBackupCid?: string | null;
};

export type CheckpointLifecycleCallback = (entry: PotHistory) => void;

const randomId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeMembers = (members: PotCheckpointMember[]) =>
  [...members]
    .map(({ id, name, address }) => ({
      id,
      name,
      address: address ?? null,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

const normalizeExpenses = (expenses: PotCheckpointExpense[]) =>
  [...expenses]
    .map(({ id, amount, paidBy, memo = '', date = '', split }) => ({
      id,
      amount: Number(amount.toFixed(6)),
      paidBy,
      memo,
      date,
      split: [...split]
        .map(({ memberId, amount }) => ({
          memberId,
          amount: Number(amount.toFixed(6)),
        }))
        .sort((a, b) => a.memberId.localeCompare(b.memberId)),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

const buildSnapshotObject = (pot: PotCheckpointInput, cid?: string | null) => ({
  id: pot.id,
  name: pot.name,
  baseCurrency: pot.baseCurrency,
  members: normalizeMembers(pot.members),
  expenses: normalizeExpenses(pot.expenses),
  lastBackupCid: cid ?? pot.lastBackupCid ?? null,
});

export function computePotHash(pot: PotCheckpointInput, cid?: string | null): string {
  const snapshot = buildSnapshotObject(pot, cid);
  return blake2AsHex(JSON.stringify(snapshot));
}

export function buildCheckpointSnapshot(
  pot: PotCheckpointInput,
  cid?: string | null
) {
  const snapshot = buildSnapshotObject(pot, cid);
  const snapshotJson = JSON.stringify(snapshot);
  const potHash = blake2AsHex(snapshotJson);
  const message = `chopdot:checkpoint:v1 potId=${pot.id} hash=${potHash}${
    snapshot.lastBackupCid ? ` cid=${snapshot.lastBackupCid}` : ''
  }`;

  return {
    snapshot,
    snapshotJson,
    potHash,
    message,
  };
}

interface CheckpointPotParams {
  pot: PotCheckpointInput;
  signerAddress: string;
  cid?: string | null;
  forceBrowserExtension?: boolean;
  onStatusUpdate?: CheckpointLifecycleCallback;
}

export async function checkpointPot({
  pot,
  signerAddress,
  cid,
  forceBrowserExtension,
  onStatusUpdate,
}: CheckpointPotParams): Promise<PotHistory> {
  const { snapshot, potHash, message } = buildCheckpointSnapshot(pot, cid ?? pot.lastBackupCid ?? null);

  let stagedEntry: PotHistory | null = null;

  const emitUpdate = () => {
    if (stagedEntry && onStatusUpdate) {
      onStatusUpdate({ ...stagedEntry });
    }
  };

  try {
    const { txHash } = await chain.signAndSendExtrinsic({
      from: signerAddress,
      forceBrowserExtension,
      buildTx: ({ api }) => api.tx.system.remark(message),
      onStatus: (status, ctx) => {
        const txHashCtx = ctx?.txHash;
        if (!stagedEntry && txHashCtx) {
          stagedEntry = {
            type: 'remark_checkpoint',
            id: randomId('checkpoint'),
            when: Date.now(),
            status: status === 'finalized' ? 'finalized' : status === 'inBlock' ? 'in_block' : 'submitted',
            potHash,
            message,
            cid: snapshot.lastBackupCid ?? undefined,
            txHash: txHashCtx,
            block: ctx?.blockHash,
            subscan: chain.buildSubscanUrl(txHashCtx),
          };
          emitUpdate();
          return;
        }

        if (stagedEntry) {
          if (status === 'inBlock') {
            stagedEntry = {
              ...stagedEntry,
              status: 'in_block',
              block: ctx?.blockHash ?? stagedEntry.block,
            };
            emitUpdate();
          } else if (status === 'finalized') {
            stagedEntry = {
              ...stagedEntry,
              status: 'finalized',
              block: ctx?.blockHash ?? stagedEntry.block,
            };
            emitUpdate();
          }
        }
      },
    });

    if (!stagedEntry && txHash) {
      stagedEntry = {
        type: 'remark_checkpoint',
        id: randomId('checkpoint'),
        when: Date.now(),
        status: 'submitted',
        potHash,
        message,
        cid: snapshot.lastBackupCid ?? undefined,
        txHash,
        subscan: chain.buildSubscanUrl(txHash),
      };
      emitUpdate();
    }

    if (!stagedEntry || !stagedEntry.txHash) {
      throw new Error('Checkpoint submitted without transaction hash');
    }

    return stagedEntry;
  } catch (error) {
    if (stagedEntry) {
      stagedEntry = { ...stagedEntry, status: 'failed' };
      emitUpdate();
    }
    throw error;
  }
}
