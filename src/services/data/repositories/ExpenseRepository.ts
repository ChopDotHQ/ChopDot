/**
 * Expense Repository
 * 
 * Data access layer for expenses (pot-scoped).
 * Handles caching and CRUD operations within a pot.
 */

import type { Expense } from '../types';
import type { CreateExpenseDTO, UpdateExpenseDTO } from '../types/dto';
import { NotFoundError } from '../errors';
import type { DataSource } from './PotRepository';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Expense Repository
 * 
 * Provides cached access to expense data with TTL.
 * Default TTL: 5 seconds (expenses change frequently).
 * 
 * Note: Expenses are stored within pots, so operations require potId.
 */
export class ExpenseRepository {
  private source: DataSource;
  private cache = new Map<string, CacheEntry<Expense[]>>(); // potId -> expenses[]
  private readonly ttl: number;
  private readonly maxCacheSize: number;

  constructor(source: DataSource, ttl: number = 5_000, maxCacheSize: number = 100) {
    this.source = source;
    this.ttl = ttl;
    this.maxCacheSize = maxCacheSize;
  }

  /**
   * Invalidate cache for a pot's expenses
   * @param potId - Pot ID to invalidate (undefined = invalidate all)
   */
  invalidate(potId?: string): void {
    if (potId) {
      this.cache.delete(potId);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get all expenses for a pot
   * Uses cache if available and not expired
   */
  async list(potId: string): Promise<Expense[]> {
    const now = Date.now();
    
    // Check cache
    const cached = this.cache.get(potId);
    if (cached && (now - cached.timestamp) < this.ttl) {
      return cached.data.map(e => ({ ...e })); // Return copies
    }

    // Fetch pot to get expenses
    const pot = await this.source.getPot(potId);
    if (!pot) {
      throw new NotFoundError('Pot', potId);
    }

    const expenses = pot.expenses || [];

    // Update cache
    this.cache.set(potId, {
      data: expenses,
      timestamp: now,
    });

    // Enforce cache size limit
    if (this.cache.size > this.maxCacheSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp); // Oldest first
      const toRemove = entries.slice(0, entries.length - this.maxCacheSize);
      toRemove.forEach(([id]) => this.cache.delete(id));
    }

    return expenses.map(e => ({ ...e })); // Return copies
  }

  /**
   * Get a single expense by ID
   */
  async get(potId: string, expenseId: string): Promise<Expense> {
    const expenses = await this.list(potId);
    const expense = expenses.find(e => e.id === expenseId);
    
    if (!expense) {
      throw new NotFoundError('Expense', expenseId);
    }

    return { ...expense }; // Return copy
  }

  /**
   * Create a new expense in a pot
   */
  async create(potId: string, input: CreateExpenseDTO): Promise<Expense> {
    const pot = await this.source.getPot(potId);
    if (!pot) {
      throw new NotFoundError('Pot', potId);
    }

    const expense: Expense = {
      id: Date.now().toString(), // Temporary ID generation
      potId,
      amount: input.amount,
      currency: input.currency || pot.baseCurrency,
      paidBy: input.paidBy,
      memo: input.memo || '',
      date: input.date || new Date().toISOString(),
      split: input.split || [],
      attestations: [],
      hasReceipt: input.hasReceipt || false,
    };

    // Add expense to pot
    const updatedPot: typeof pot = {
      ...pot,
      expenses: [...(pot.expenses || []), expense],
    };

    await this.source.savePot(updatedPot);
    this.invalidate(potId); // Invalidate cache

    return { ...expense }; // Return copy
  }

  /**
   * Update an existing expense
   */
  async update(potId: string, expenseId: string, updates: UpdateExpenseDTO): Promise<Expense> {
    const pot = await this.source.getPot(potId);
    if (!pot) {
      throw new NotFoundError('Pot', potId);
    }

    const expenses = pot.expenses || [];
    const expenseIndex = expenses.findIndex(e => e.id === expenseId);
    if (expenseIndex === -1) {
      throw new NotFoundError('Expense', expenseId);
    }

    const existing = expenses[expenseIndex];
    if (!existing) {
      throw new NotFoundError('Expense', expenseId);
    }

    const updated: Expense = {
      ...existing,
      ...updates,
      id: expenseId, // Ensure ID doesn't change
      amount: updates.amount ?? existing.amount, // Ensure amount is always defined
    };

    // Update expense in pot
    const updatedExpenses = [...(pot.expenses || [])];
    updatedExpenses[expenseIndex] = updated;

    const updatedPot: typeof pot = {
      ...pot,
      expenses: updatedExpenses,
    };

    await this.source.savePot(updatedPot);
    this.invalidate(potId); // Invalidate cache

    return { ...updated }; // Return copy
  }

  /**
   * Remove an expense
   */
  async remove(potId: string, expenseId: string): Promise<void> {
    const pot = await this.source.getPot(potId);
    if (!pot) {
      throw new NotFoundError('Pot', potId);
    }

    const updatedExpenses = (pot.expenses || []).filter(e => e.id !== expenseId);
    
    if (updatedExpenses.length === pot.expenses?.length) {
      // Expense not found - this is OK, idempotent operation
      return;
    }

    const updatedPot: typeof pot = {
      ...pot,
      expenses: updatedExpenses,
    };

    await this.source.savePot(updatedPot);
    this.invalidate(potId); // Invalidate cache
  }
}

