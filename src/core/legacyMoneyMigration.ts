import type {AppState, Expense, Split} from '../types.ts';
import {canonicalJson, sha256Hex} from './canonical.ts';
import {addMoney, assertConservation, moneyFromDecimal, moneyFromMinorUnits, type MoneyV1} from './money.ts';

export interface MigratedLegacyShareV1 {
  shareId: string;
  expenseId: string;
  participantId: string;
  amount: MoneyV1;
  status: 'open' | 'requested' | 'marked_paid' | 'received';
}
export interface MigratedLegacyExpenseV1 {expenseId: string; description: string; paidBy: string; total: MoneyV1}
export interface MigratedLegacyGroupV1 {
  v: 1;
  source: 'legacy-portable-shell';
  groupId: string;
  name: string;
  memberIds: string[];
  needsAccountBinding: boolean;
  expenses: Record<string, MigratedLegacyExpenseV1>;
  shares: Record<string, MigratedLegacyShareV1>;
  currencyTotals: Record<string, MoneyV1>;
  closedRecordId?: string;
}
export interface LegacyMigrationResultV1 {
  v: 1;
  groups: Record<string, MigratedLegacyGroupV1>;
  quarantined: Array<{groupId: string; reason: string}>;
  stateHash: string;
}

export interface MainAppExpenseRowV1 {
  id: string;
  pot_id: string;
  amount_minor: string;
  currency_code: string;
  paid_by: string;
  description?: string | null;
}

export interface MainAppSplitRowV1 {
  id: string;
  expense_id: string;
  member_id: string;
  amount_minor: string;
}

export interface MainAppMoneyMigrationV1 {
  v: 1;
  source: 'main-app-normalized-supabase';
  expenses: Record<string, {expenseId: string; potId: string; paidBy: string; description: string; total: MoneyV1; allocations: Array<{participantId: string; amount: MoneyV1}>}>;
  quarantined: Array<{expenseId: string; reason: string}>;
  stateHash: string;
}

export async function migrateLegacyAppState(state: AppState): Promise<LegacyMigrationResultV1> {
  const groups: Record<string, MigratedLegacyGroupV1> = {};
  const quarantined: Array<{groupId: string; reason: string}> = [];
  for (const group of Object.values(state.groups).sort((left, right) => left.id.localeCompare(right.id))) {
    try {
      const expenses = Object.values(state.expenses).filter(expense => expense.groupId === group.id).sort((left, right) => left.id.localeCompare(right.id));
      const migratedExpenses: Record<string, MigratedLegacyExpenseV1> = {};
      const migratedShares: Record<string, MigratedLegacyShareV1> = {};
      const currencyTotals: Record<string, MoneyV1> = {};
      for (const expense of expenses) {
        const total = legacyMoney(expense.amount, expense.currency ?? state.currency);
        const splits = Object.values(state.splits).filter(split => split.expenseId === expense.id).sort((left, right) => left.id.localeCompare(right.id));
        const allocations = splits.map(split => ({participantId: split.userId, amount: legacyMoney(split.amount, total.currency)}));
        assertConservation(total, allocations);
        migratedExpenses[expense.id] = {expenseId: expense.id, description: expense.description, paidBy: expense.paidByUserId, total};
        for (const split of splits) migratedShares[split.id] = migrateSplit(split, total.currency);
        currencyTotals[total.currency] = currencyTotals[total.currency] ? addMoney(currencyTotals[total.currency], total) : total;
      }
      groups[group.id] = {
        v: 1, source: 'legacy-portable-shell', groupId: group.id, name: group.name,
        memberIds: [...new Set(group.memberIds)].sort(),
        needsAccountBinding: group.memberIds.some(id => !state.users[id]?.accountPublicKeyHex),
        expenses: migratedExpenses, shares: migratedShares, currencyTotals,
        ...(group.closedRecordId ? {closedRecordId: group.closedRecordId} : {}),
      };
    } catch (reason) {
      quarantined.push({groupId: group.id, reason: reason instanceof Error ? reason.message : String(reason)});
    }
  }
  const result = {v: 1 as const, groups, quarantined};
  return {...result, stateHash: await sha256Hex(canonicalJson(result))};
}

/**
 * Characterizes the year-long app's normalized Supabase boundary without
 * making Supabase authoritative. Rows already use bigint minor units; the
 * adapter validates them and emits the same provider-neutral MoneyV1 values.
 */
export async function migrateMainAppMoneyRows(
  expenseRows: MainAppExpenseRowV1[],
  splitRows: MainAppSplitRowV1[],
): Promise<MainAppMoneyMigrationV1> {
  const expenses: MainAppMoneyMigrationV1['expenses'] = {};
  const quarantined: MainAppMoneyMigrationV1['quarantined'] = [];
  for (const row of [...expenseRows].sort((left,right)=>left.id.localeCompare(right.id))) {
    try {
      if (!row.id.trim() || !row.pot_id.trim() || !row.paid_by.trim()) throw new Error('Main-app expense identity is invalid.');
      const total=moneyFromMinorUnits(row.amount_minor,row.currency_code,2);
      const rows=splitRows.filter(split=>split.expense_id===row.id).sort((left,right)=>left.id.localeCompare(right.id));
      const allocations=rows.map(split=>{
        if (!split.id.trim() || !split.member_id.trim()) throw new Error('Main-app split identity is invalid.');
        return {participantId:split.member_id,amount:moneyFromMinorUnits(split.amount_minor,total.currency,total.exponent)};
      });
      assertConservation(total,allocations);
      expenses[row.id]={expenseId:row.id,potId:row.pot_id,paidBy:row.paid_by,description:row.description?.trim()??'',total,allocations};
    } catch (reason) {
      quarantined.push({expenseId:row.id,reason:reason instanceof Error?reason.message:String(reason)});
    }
  }
  const result={v:1 as const,source:'main-app-normalized-supabase' as const,expenses,quarantined};
  return {...result,stateHash:await sha256Hex(canonicalJson(result))};
}

function legacyMoney(value: number, currency: string): MoneyV1 {
  if (!Number.isFinite(value) || value < 0) throw new Error('Legacy amount cannot become exact money.');
  const decimal = String(value);
  if (/e/iu.test(decimal)) throw new Error('Legacy amount cannot become exact money.');
  try {
    return moneyFromDecimal(decimal.includes('.') ? decimal : `${decimal}.00`, currency, 2);
  } catch {
    throw new Error('Legacy amount cannot become exact money.');
  }
}

function migrateSplit(split: Split, currency: string): MigratedLegacyShareV1 {
  const status = split.status === 'request_sent' ? 'requested' : split.status === 'confirmed' ? 'received' : split.status;
  return {shareId: split.id, expenseId: split.expenseId, participantId: split.userId, amount: legacyMoney(split.amount, currency), status};
}
