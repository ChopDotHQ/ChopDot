/**
 * Expense Repository
 * Data access layer for expenses (pot-scoped).
 * Handles caching and CRUD operations within a pot.
 */

import type { Expense, ExpenseSummary } from '../types';
import type { CreateExpenseDTO, UpdateExpenseDTO } from '../types/dto';
import { NotFoundError, ValidationError } from '../errors';
import { validateLegacyExpenseWrite } from '../../../domain/expenseFunding';

export interface ExpenseListOptions {
  limit?: number;
  offset?: number;
}

export interface ExpenseDataSource {
  listExpenses(potId: string, options?: ExpenseListOptions): Promise<Expense[]>;
  getExpense(potId: string, expenseId: string): Promise<Expense | null>;
  saveExpense(potId: string, expense: Expense): Promise<void>;
  deleteExpense(potId: string, expenseId: string): Promise<void>;
  getExpenseSummaries?(
    potIds: string[],
    userId: string,
  ): Promise<Record<string, ExpenseSummary>>;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function assertLegacyWrite(value: unknown): void {
  const validation = validateLegacyExpenseWrite(value);
  if (!validation.success) {
    throw new ValidationError(`${validation.code}: ${validation.error}`);
  }
}

/** Cached access to expense data. Default TTL: 5 seconds. */
export class ExpenseRepository {
  private source: ExpenseDataSource;
  private cache = new Map<string, CacheEntry<Expense[]>>();
  private readonly ttl: number;
  private readonly maxCacheSize: number;

  constructor(source: ExpenseDataSource, ttl: number = 5_000, maxCacheSize: number = 100) {
    this.source = source;
    this.ttl = ttl;
    this.maxCacheSize = maxCacheSize;
  }

  invalidate(potId?: string): void {
    if (potId) {
      this.cache.delete(potId);
    } else {
      this.cache.clear();
    }
  }

  async list(potId: string, options?: ExpenseListOptions): Promise<Expense[]> {
    const now = Date.now();
    const isFullListRequest = !options || (options.limit === undefined && options.offset === undefined);
    if (isFullListRequest) {
      const cached = this.cache.get(potId);
      if (cached && (now - cached.timestamp) < this.ttl) {
        return cached.data.map((e) => ({ ...e }));
      }
    }

    const expenses = await this.source.listExpenses(potId, options);
    if (isFullListRequest) {
      this.cache.set(potId, { data: expenses, timestamp: now });
      if (this.cache.size > this.maxCacheSize) {
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        const toRemove = entries.slice(0, entries.length - this.maxCacheSize);
        toRemove.forEach(([id]) => this.cache.delete(id));
      }
    }
    return expenses.map(e => ({ ...e }));
  }

  async get(potId: string, expenseId: string): Promise<Expense> {
    const expense = await this.source.getExpense(potId, expenseId);
    if (!expense) {
      throw new NotFoundError('Expense', expenseId);
    }
    return { ...expense };
  }

  async create(potId: string, input: CreateExpenseDTO): Promise<Expense> {
    // Validate before constructing a scalar-payer record. Otherwise funding[]
    // would be silently omitted from the explicit property mapping below.
    assertLegacyWrite(input);
    const expense: Expense = {
      id: this.generateExpenseId(),
      potId,
      amount: input.amount,
      currency: input.currency,
      paidBy: input.paidBy,
      memo: input.memo || '',
      date: input.date || new Date().toISOString(),
      split: input.split || [],
      attestations: [],
      hasReceipt: input.hasReceipt || false,
    };
    await this.source.saveExpense(potId, expense);
    this.invalidate(potId);
    return { ...expense };
  }

  async update(potId: string, expenseId: string, updates: UpdateExpenseDTO): Promise<Expense> {
    const existing = await this.source.getExpense(potId, expenseId);
    if (!existing) {
      throw new NotFoundError('Expense', expenseId);
    }
    assertLegacyWrite(existing);
    const updated: Expense = {
      ...existing,
      ...updates,
      id: expenseId,
      amount: updates.amount ?? existing.amount,
    };
    // Do not hide explicitly malformed amount values behind the legacy nullish
    // fallback. Validation sees the full proposed input first.
    assertLegacyWrite({ ...existing, ...updates });
    await this.source.saveExpense(potId, updated);
    this.invalidate(potId);
    return { ...updated };
  }

  async remove(potId: string, expenseId: string): Promise<void> {
    await this.source.deleteExpense(potId, expenseId);
    this.invalidate(potId);
  }

  async summaries(potIds: string[], userId: string): Promise<Record<string, ExpenseSummary>> {
    if (this.source.getExpenseSummaries) {
      return this.source.getExpenseSummaries(potIds, userId);
    }
    const result: Record<string, ExpenseSummary> = {};
    for (const potId of potIds) {
      const expenses = await this.list(potId);
      const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      const myExpenses = expenses
        .filter((expense) => expense.paidBy === userId)
        .reduce((sum, expense) => sum + expense.amount, 0);
      const myShare = expenses.reduce((sum, expense) => {
        const share = (expense.split ?? []).find((split) => split.memberId === userId);
        return sum + (share?.amount || 0);
      }, 0);
      result[potId] = { potId, totalExpenses, myExpenses, myShare };
    }
    return result;
  }

  private generateExpenseId(): string {
    const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
    if (cryptoObj?.randomUUID) {
      return cryptoObj.randomUUID();
    }
    if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
      const buf = new Uint8Array(16);
      cryptoObj.getRandomValues(buf);
      const value6 = buf[6] ?? 0;
      const value8 = buf[8] ?? 0;
      // eslint-disable-next-line no-bitwise
      buf[6] = (value6 & 0x0f) | 0x40;
      // eslint-disable-next-line no-bitwise
      buf[8] = (value8 & 0x3f) | 0x80;
      const hex = Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
    return `expense-${Math.random().toString(36).slice(2, 10)}`;
  }
}
