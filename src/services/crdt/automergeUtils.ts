
import * as Automerge from '@automerge/automerge';
import { gzip, ungzip } from 'pako';
import type { CRDTPotDocument, CRDTMember, CRDTExpense } from './types';
import type { Pot, Member, Expense } from '../../schema/pot';

export function createPotDocument(pot: Pot): Automerge.Doc<CRDTPotDocument> {
  return Automerge.from({
    id: pot.id,
    name: pot.name,
    type: pot.type,
    baseCurrency: pot.baseCurrency,
    
    members: pot.members.reduce((acc, member) => {
      acc[member.id] = {
        id: member.id,
        name: member.name,
        address: member.address || null,
        role: (member.role as 'owner' | 'member') || 'member',
        status: (member.status as 'active' | 'pending' | 'removed') || 'active',
        joinedAt: new Date().toISOString(),
      };
      return acc;
    }, {} as Record<string, CRDTMember>),
    
    expenses: pot.expenses.reduce((acc, expense) => {
      acc[expense.id] = expenseToCRDT(expense);
      return acc;
    }, {} as Record<string, CRDTExpense>),
    
    budgetEnabled: pot.budgetEnabled ?? false,
    budget: pot.budget ?? null,
    mode: pot.mode || 'casual',
    
    createdAt: pot.createdAt ? new Date(pot.createdAt).toISOString() : new Date().toISOString(),
    createdBy: pot.members.find(m => m.role === 'Owner')?.id || pot.members[0]?.id || 'unknown',
    updatedAt: new Date().toISOString(),
    archived: pot.archived ?? false,
    archivedAt: pot.archived ? new Date().toISOString() : null,
  }) as Automerge.Doc<CRDTPotDocument>;
}

function expenseToCRDT(expense: Expense): CRDTExpense {
  return {
    id: expense.id,
    amount: expense.amount,
    currency: expense.currency || 'USD',
    paidBy: expense.paidBy,
    memo: expense.memo || expense.description || '',
    date: expense.date || new Date().toISOString(),
    createdAt: expense.createdAt ? new Date(expense.createdAt).toISOString() : new Date().toISOString(),
    createdBy: expense.paidBy,
    split: expense.split,
    attestations: Array.isArray(expense.attestations)
      ? expense.attestations.map(a => 
          typeof a === 'string' 
            ? { memberId: a, confirmedAt: new Date().toISOString() }
            : a
        )
      : undefined,
    receiptCid: expense.receiptUrl?.includes('ipfs') 
      ? expense.receiptUrl.split('/ipfs/')[1]?.split('?')[0]
      : undefined,
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };
}

export function documentToPot(doc: Automerge.Doc<CRDTPotDocument>): Pot {
  const data = doc as CRDTPotDocument;
  
  return {
    id: data.id,
    name: data.name,
    type: data.type,
    baseCurrency: data.baseCurrency,
    
    members: Object.values(data.members).map(member => ({
      id: member.id,
      name: member.name,
      address: member.address,
      role: member.role === 'owner' ? 'Owner' : 'Member',
      status: member.status,
    })),
    
    expenses: Object.values(data.expenses)
      .filter(expense => !expense.deletedAt)
      .map(expense => ({
        id: expense.id,
        amount: expense.amount,
        currency: expense.currency,
        paidBy: expense.paidBy,
        memo: expense.memo,
        date: expense.date,
        createdAt: new Date(expense.createdAt).getTime(),
        split: expense.split,
        attestations: expense.attestations,
        receiptUrl: expense.receiptCid ? `ipfs://${expense.receiptCid}` : undefined,
        hasReceipt: !!expense.receiptCid,
      })),
    
    budgetEnabled: data.budgetEnabled,
    budget: data.budget,
    mode: data.mode,
    checkpointEnabled: false,
    
    createdAt: new Date(data.createdAt).getTime(),
    updatedAt: new Date(data.updatedAt).getTime(),
    archived: data.archived,
    history: [],
  };
}

export function addMember(
  doc: Automerge.Doc<CRDTPotDocument>,
  member: Member
): Automerge.Doc<CRDTPotDocument> {
  return Automerge.change(doc, 'Add member', (d) => {
    d.members[member.id] = {
      id: member.id,
      name: member.name,
      address: member.address || null,
      role: (member.role as 'owner' | 'member') || 'member',
      status: (member.status as 'active' | 'pending' | 'removed') || 'active',
      joinedAt: new Date().toISOString(),
    };
    d.updatedAt = new Date().toISOString();
  });
}

export function updateMember(
  doc: Automerge.Doc<CRDTPotDocument>,
  memberId: string,
  updates: Partial<CRDTMember>
): Automerge.Doc<CRDTPotDocument> {
  return Automerge.change(doc, 'Update member', (d) => {
    if (d.members[memberId]) {
      Object.assign(d.members[memberId], updates);
      d.updatedAt = new Date().toISOString();
    }
  });
}

export function removeMember(
  doc: Automerge.Doc<CRDTPotDocument>,
  memberId: string
): Automerge.Doc<CRDTPotDocument> {
  return Automerge.change(doc, 'Remove member', (d) => {
    if (d.members[memberId]) {
      d.members[memberId].status = 'removed';
      d.updatedAt = new Date().toISOString();
    }
  });
}

export function addExpense(
  doc: Automerge.Doc<CRDTPotDocument>,
  expense: Expense
): Automerge.Doc<CRDTPotDocument> {
  return Automerge.change(doc, 'Add expense', (d) => {
    d.expenses[expense.id] = expenseToCRDT(expense);
    d.updatedAt = new Date().toISOString();
  });
}

export function updateExpense(
  doc: Automerge.Doc<CRDTPotDocument>,
  expenseId: string,
  updates: Partial<CRDTExpense>
): Automerge.Doc<CRDTPotDocument> {
  return Automerge.change(doc, 'Update expense', (d) => {
    if (d.expenses[expenseId]) {
      Object.assign(d.expenses[expenseId], updates);
      d.expenses[expenseId].updatedAt = new Date().toISOString();
      d.updatedAt = new Date().toISOString();
    }
  });
}

export function deleteExpense(
  doc: Automerge.Doc<CRDTPotDocument>,
  expenseId: string
): Automerge.Doc<CRDTPotDocument> {
  return Automerge.change(doc, 'Delete expense', (d) => {
    if (d.expenses[expenseId]) {
      d.expenses[expenseId].deletedAt = new Date().toISOString();
      d.updatedAt = new Date().toISOString();
    }
  });
}

export function updatePotMetadata(
  doc: Automerge.Doc<CRDTPotDocument>,
  updates: Partial<Pick<CRDTPotDocument, 'name' | 'budgetEnabled' | 'budget' | 'mode'>>
): Automerge.Doc<CRDTPotDocument> {
  return Automerge.change(doc, 'Update pot metadata', (d) => {
    Object.assign(d, updates);
    d.updatedAt = new Date().toISOString();
  });
}

export function serializeDocument(doc: Automerge.Doc<CRDTPotDocument>): Uint8Array {
  return Automerge.save(doc);
}

export function deserializeDocument(data: Uint8Array): Automerge.Doc<CRDTPotDocument> {
  return Automerge.load<CRDTPotDocument>(data);
}

export function compressDocument(doc: Automerge.Doc<CRDTPotDocument>): Uint8Array {
  const binary = serializeDocument(doc);
  return gzip(binary);
}

export function decompressDocument(compressed: Uint8Array): Automerge.Doc<CRDTPotDocument> {
  const binary = ungzip(compressed);
  return deserializeDocument(binary);
}

export function getAllChanges(
  doc: Automerge.Doc<CRDTPotDocument>
): Uint8Array[] {
  return Automerge.getChanges(Automerge.init(), doc);
}

export function applyChanges(
  doc: Automerge.Doc<CRDTPotDocument>,
  changes: Uint8Array[]
): Automerge.Doc<CRDTPotDocument> {
  return Automerge.applyChanges(doc, changes)[0];
}

export function mergeDocuments(
  doc1: Automerge.Doc<CRDTPotDocument>,
  doc2: Automerge.Doc<CRDTPotDocument>
): Automerge.Doc<CRDTPotDocument> {
  return Automerge.merge(doc1, doc2);
}

export function getHeads(doc: Automerge.Doc<CRDTPotDocument>): Automerge.Heads {
  return Automerge.getHeads(doc);
}

export function getChangeCount(doc: Automerge.Doc<CRDTPotDocument>): number {
  const history = Automerge.getHistory(doc);
  return history.length;
}
