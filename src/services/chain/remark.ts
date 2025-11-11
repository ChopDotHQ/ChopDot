import { blake2AsHex } from '@polkadot/util-crypto';
import { chain } from './index';
import type { PotHistory } from '../../App';
import { stableStringify } from '../../utils/stableStringify';

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

const PII_RE = /(mailto:|@|(\+?\d[\d\s\-().]{6,})|(iban|twint|venmo|paypal|bank))/i;

function validatePrivacy(snapshotJson: string): void {
  if (PII_RE.test(snapshotJson)) {
    throw new Error('Snapshot may contain PII — refusing to anchor.');
  }
}

function normalizeMembers(members: PotCheckpointMember[]) {
  return [...(members ?? [])]
    .map((m) => ({ id: m.id, name: m.name ?? '', address: m.address ?? '' }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function normalizeExpenses(exps: PotCheckpointExpense[]) {
  return [...(exps ?? [])]
    .map((e) => ({
      id: e.id,
      amount: Number(e.amount),
      paidBy: e.paidBy,
      date: e.date ?? '',
      // memo intentionally stripped for privacy
      split: (e.split ?? [])
        .map((s: any) => ({ memberId: s.memberId, amount: Number(s.amount) }))
        .sort((a: any, b: any) => a.memberId.localeCompare(b.memberId)),
    }))
    .sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.id.localeCompare(b.id));
}

export function buildCheckpointSnapshot(
  pot: PotCheckpointInput,
  options?: { cid?: string | null; mode?: 'casual' | 'auditable'; skipPrivacyCheck?: boolean }
) {
  const { cid, mode = 'casual', skipPrivacyCheck = false } = options ?? {};

  const snapshot = {
    id: pot.id,
    name: pot.name ?? '',
    baseCurrency: pot.baseCurrency,
    members: normalizeMembers(pot.members),
    expenses: normalizeExpenses(pot.expenses),
    // include cid only in auditable mode
    cid: mode === 'auditable' ? (cid ?? null) : null,
    v: 1,
  };

  const snapshotJson = stableStringify(snapshot);
  // Only validate privacy when actually creating a checkpoint, not for display purposes
  if (!skipPrivacyCheck) {
  validatePrivacy(snapshotJson);
  }
  const potHash = blake2AsHex(snapshotJson);

  // Privacy defaults: hash-only remark (no potId, no sensitive data)
  // Only include CID if auditable mode and CID exists
  const message = snapshot.cid
    ? `chopdot:v1:${potHash} cid:${snapshot.cid}`
    : `chopdot:v1:${potHash}`;

  return { snapshot, snapshotJson, potHash, message };
}

export function computePotHash(pot: PotCheckpointInput, cid?: string | null, mode?: 'casual' | 'auditable'): string {
  // Skip privacy check when computing hash for display purposes
  const { potHash } = buildCheckpointSnapshot(pot, { cid, mode, skipPrivacyCheck: true });
  return potHash;
}

interface CheckpointPotParams {
  pot: PotCheckpointInput;
  signerAddress: string;
  cid?: string | null;
  mode?: 'casual' | 'auditable';
  forceBrowserExtension?: boolean;
  onStatusUpdate?: CheckpointLifecycleCallback;
}

export async function checkpointPot({
  pot,
  signerAddress,
  cid,
  mode = 'casual',
  forceBrowserExtension,
  onStatusUpdate,
}: CheckpointPotParams): Promise<PotHistory> {
  const { potHash, message } = buildCheckpointSnapshot(pot, { cid: cid ?? pot.lastBackupCid ?? null, mode });

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
            cid: undefined,
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
            cid: undefined,
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
