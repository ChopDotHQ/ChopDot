
export interface CRDTMember {
  id: string;
  name: string;
  address: string | null;
  role: 'owner' | 'member';
  status: 'active' | 'pending' | 'removed';
  joinedAt: string;
}

export interface CRDTSplit {
  memberId: string;
  amount: number;
}

export interface CRDTAttestation {
  memberId: string;
  confirmedAt: string;
}

export interface CRDTExpense {
  id: string;
  amount: number;
  currency: string;
  paidBy: string;
  memo: string;
  date: string;
  createdAt: string;
  
  split?: CRDTSplit[];
  attestations?: CRDTAttestation[];
  receiptCid?: string;
  
  createdBy: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface CRDTPotDocument {
  id: string;
  name: string;
  type: 'expense' | 'savings';
  baseCurrency: 'DOT' | 'USD';
  
  members: Record<string, CRDTMember>;
  expenses: Record<string, CRDTExpense>;
  
  budgetEnabled: boolean;
  budget: number | null;
  mode: 'casual' | 'auditable';
  
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  archived: boolean;
  archivedAt?: string | null;
}

export interface CRDTSyncMetadata {
  potId: string;
  heads: string[];
  changeCount: number;
  lastSyncedAt: string;
}

export interface CRDTCheckpoint {
  id: string;
  potId: string;
  documentData: Uint8Array;
  heads: string[];
  changeCount: number;
  createdAt: string;
  createdBy: string;
}

export interface CRDTChangeEvent {
  potId: string;
  changeData: Uint8Array;
  hash: string;
  actor: string;
  seq: number;
  userId: string;
  createdAt: string;
}
