import type { DataSource, ListOptions } from '../repositories/PotRepository';
import type { ExpenseListOptions } from '../repositories/ExpenseRepository';
import type { Expense, ExpenseSummary, Pot } from '../types';
import type { UpdatePotDTO } from '../types/dto';
import { PotSchema } from '../../../schema/pot';
import { getSupabase } from '../../../utils/supabase-client';
import { LocalStorageSource } from './LocalStorageSource';
import { ValidationError } from '../errors';
import { SupabasePotSource } from './SupabasePotSource';
import { SupabaseExpenseSource } from './SupabaseExpenseSource';
import { normalizeExpenseId } from './expense-row-mapper';

/**
 * SupabaseSource — thin facade implementing DataSource.
 *
 * Delegates pot CRUD to SupabasePotSource and expense CRUD to
 * SupabaseExpenseSource. Coordination methods (importPot) that
 * span both entities live here.
 */
export class SupabaseSource implements DataSource {
  private client = getSupabase();
  private guestSource = new LocalStorageSource();
  private potSource: SupabasePotSource | null = null;
  private expenseSource: SupabaseExpenseSource | null = null;

  isConfigured(): boolean {
    return !!this.client;
  }

  private ensureReady() {
    if (!this.client) {
      throw new Error(
        '[SupabaseSource] Supabase client not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      );
    }
    if (!this.potSource) {
      this.potSource = new SupabasePotSource(this.client, this.guestSource);
    }
    if (!this.expenseSource) {
      this.expenseSource = new SupabaseExpenseSource(this.client, this.guestSource);
    }
  }

  // -- Pot operations (delegated) --

  async getPots(options?: ListOptions): Promise<Pot[]> {
    this.ensureReady();
    const pots = await this.potSource!.getPots(options);

    if (pots.length === 0) {
      return pots;
    }

    const hydratedPots = await Promise.all(
      pots.map(async (pot) => {
        try {
          const expenses = await this.expenseSource!.listExpenses(pot.id);
          return {
            ...pot,
            expenses,
          };
        } catch (error) {
          console.warn('[SupabaseSource] Falling back to metadata-backed list pot expenses:', error);
          return pot;
        }
      }),
    );

    return hydratedPots;
  }

  async getPot(id: string): Promise<Pot | null> {
    this.ensureReady();
    const pot = await this.potSource!.getPot(id);
    if (!pot) {
      return null;
    }

    try {
      const expenses = await this.expenseSource!.listExpenses(id);
      return {
        ...pot,
        expenses,
      };
    } catch (error) {
      console.warn('[SupabaseSource] Falling back to metadata-backed pot expenses:', error);
      return pot;
    }
  }

  async savePots(pots: Pot[]): Promise<void> {
    this.ensureReady();
    return this.potSource!.savePots(pots);
  }

  async savePot(pot: Pot): Promise<void> {
    this.ensureReady();
    return this.potSource!.savePot(pot);
  }

  async updatePotSettings(id: string, updates: UpdatePotDTO): Promise<Pot> {
    this.ensureReady();
    return this.potSource!.updatePotSettings(id, updates);
  }

  async deletePot(id: string): Promise<void> {
    this.ensureReady();
    return this.potSource!.deletePot(id);
  }

  async exportPot(id: string): Promise<Pot> {
    this.ensureReady();
    const pot = await this.potSource!.exportPot(id);
    try {
      const expenses = await this.expenseSource!.listExpenses(id);
      return {
        ...pot,
        expenses,
      };
    } catch (error) {
      console.warn('[SupabaseSource] Export falling back to metadata-backed pot expenses:', error);
      return pot;
    }
  }

  async deleteMemberRow(potId: string, memberId: string): Promise<void> {
    this.ensureReady();
    return this.potSource!.deleteMemberRow(potId, memberId);
  }

  // -- Expense operations (delegated) --

  async listExpenses(potId: string, options?: ExpenseListOptions): Promise<Expense[]> {
    this.ensureReady();
    return this.expenseSource!.listExpenses(potId, options);
  }

  async getExpense(potId: string, expenseId: string): Promise<Expense | null> {
    this.ensureReady();
    return this.expenseSource!.getExpense(potId, expenseId);
  }

  async saveExpense(potId: string, expense: Expense): Promise<void> {
    this.ensureReady();
    return this.expenseSource!.saveExpense(potId, expense);
  }

  async deleteExpense(potId: string, expenseId: string): Promise<void> {
    this.ensureReady();
    return this.expenseSource!.deleteExpense(potId, expenseId);
  }

  async getExpenseSummaries(
    potIds: string[],
    userId: string,
  ): Promise<Record<string, ExpenseSummary>> {
    this.ensureReady();
    return this.expenseSource!.getExpenseSummaries(potIds, userId);
  }

  // -- Coordination methods (span both entities) --

  async importPot(pot: Pot): Promise<Pot> {
    this.ensureReady();
    const validation = PotSchema.safeParse(pot);
    if (!validation.success) {
      throw new ValidationError('Invalid pot data', validation.error.issues);
    }

    const sanitized = validation.data;
    await this.potSource!.savePot(sanitized);

    const normalizedExpenses = (sanitized.expenses ?? []).map((expense) => normalizeExpenseId(expense));
    for (const expense of normalizedExpenses) {
      await this.expenseSource!.saveExpense(sanitized.id, expense);
    }

    return {
      ...sanitized,
      expenses: normalizedExpenses,
    };
  }
}
