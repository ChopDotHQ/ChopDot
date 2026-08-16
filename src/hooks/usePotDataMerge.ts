import { useMemo } from 'react';
import { usePot } from './usePot';
import { shouldPreferDLReads } from '../utils/dlReadsFlag';
import { warnDev } from '../utils/logDev';
import type { Pot as DataLayerPot } from '../services/data/types';

interface PotDataMergeProps {
  potId?: string;
  potType: 'expense' | 'savings';
  potName: string;
  baseCurrency: string;
  members: Array<{ id: string; name: string; role: string; status: string; verified?: boolean }>;
  expenses: Array<{ id: string; amount: number; currency?: string; paidBy: string; memo?: string; date?: string; split?: Array<{ memberId: string; amount: number }>; attestations?: string[]; hasReceipt?: boolean }>;
  budget?: number;
  budgetEnabled?: boolean;
  checkpointEnabled?: boolean;
  contributions?: Array<{ id: string; memberId: string; amount: number; date: string }>;
  goalAmount?: number;
  goalDescription?: string;
}

export interface NormalizedMember {
  id: string;
  name: string;
  role: 'Owner' | 'Member';
  status: 'active' | 'pending';
  verified?: boolean;
}

export interface NormalizedExpense {
  id: string;
  amount: number;
  currency: string;
  paidBy: string;
  memo: string;
  date: string;
  split: Array<{ memberId: string; amount: number }>;
  attestations: string[];
  hasReceipt: boolean;
}

export function usePotDataMerge(props: PotDataMergeProps) {
  const preferDLReads = shouldPreferDLReads();
  const { pot: dlPot, error: dlError, refresh: refreshPot } = usePot(props.potId);

  const pot = useMemo<DataLayerPot | null>(() => {
    if (preferDLReads) {
      if (dlPot) return dlPot;
      if (dlError && props.potId) {
        warnDev('[DataLayer] Pot read failed, falling back to UI state', { potId: props.potId, error: dlError });
      }
      return null;
    }
    if (dlError && props.potId) {
      warnDev('[DataLayer] Pot read failed, falling back to UI state', { potId: props.potId, error: dlError });
    }
    return null;
  }, [dlPot, dlError, props.potId, preferDLReads]);

  const potType = pot?.type ?? props.potType;
  const potName = pot?.name ?? props.potName;
  const baseCurrency = pot?.baseCurrency ?? props.baseCurrency;

  const members = useMemo<NormalizedMember[]>(() => {
    const source = pot?.members ?? props.members;
    return source.map(m => ({
      id: m.id,
      name: m.name,
      role: (m.role === 'Owner' || m.role === 'Member' ? m.role : 'Member') as 'Owner' | 'Member',
      status: (m.status === 'active' || m.status === 'pending' ? m.status : 'active') as 'active' | 'pending',
      verified: m.verified ?? false,
    }));
  }, [pot?.members, props.members]);

  const expenses = useMemo<NormalizedExpense[]>(() => {
    const source = pot?.expenses ?? props.expenses;
    return source.map((e): NormalizedExpense => {
      const date = e.date ?? new Date().toISOString().slice(0, 10);
      const memo: string = e.memo ?? String((e as Record<string, unknown>).description ?? '');
      return {
        id: e.id,
        amount: e.amount,
        currency: e.currency ?? baseCurrency,
        paidBy: e.paidBy,
        memo,
        date,
        split: e.split ?? [],
        attestations: (e.attestations ?? []) as string[],
        hasReceipt: e.hasReceipt ?? false,
      };
    });
  }, [pot?.expenses, props.expenses, baseCurrency]);

  const budget = pot?.budget ?? props.budget;
  const budgetEnabled = pot?.budgetEnabled ?? props.budgetEnabled;
  const checkpointEnabled = pot?.checkpointEnabled ?? props.checkpointEnabled;
  const contributions = pot?.contributions ?? props.contributions ?? [];
  const goalAmount = pot?.goalAmount ?? props.goalAmount;
  const goalDescription = pot?.goalDescription ?? props.goalDescription;

  return {
    pot,
    refreshPot,
    potType,
    potName,
    baseCurrency,
    members,
    expenses,
    budget,
    budgetEnabled,
    checkpointEnabled,
    contributions,
    goalAmount,
    goalDescription,
  };
}
