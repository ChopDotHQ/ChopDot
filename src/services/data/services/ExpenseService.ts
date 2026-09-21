/**
 * Expense Service
 *
 * Business logic layer for expenses.
 * Wraps ExpenseRepository with business rules.
 */

import { ExpenseRepository, type ExpenseListOptions } from '../repositories/ExpenseRepository';
import type { Expense } from '../types';
import { validateLegacyExpenseWrite, hasNativeExpenseFunding } from '../../../domain/expenseFunding';
import type { CreateExpenseDTO, UpdateExpenseDTO } from '../types/dto';
import { ValidationError } from '../errors';
import type { PotRepository } from '../repositories/PotRepository';
import { logTiming } from '../../../utils/logDev';
import type { ExpenseSummary } from '../types';

/**
 * Expense Service
 *
 * Provides business logic for expense operations:
 * - Validation
 * - Checkpoint invalidation (when expense added/modified after confirmation)
 */
export class ExpenseService {
  private repository: ExpenseRepository;
  private potRepository: PotRepository;

  constructor(repository: ExpenseRepository, potRepository: PotRepository) {
    this.repository = repository;
    this.potRepository = potRepository;
  }

  private assertWritableExpense(expense: unknown, members?: readonly { id: string }[]): void {
    if (!Array.isArray(members)) {
      throw new ValidationError('Group membership is required before saving an expense');
    }
    const validation = validateLegacyExpenseWrite(expense, members.map(member => member.id));
    if (!validation.success) {
      throw new ValidationError(`${validation.code}: ${validation.error}`);
    }
  }

  /**
   * Add an expense to a pot.
   * Invalidates checkpoint if user has confirmed.
   * Native funding is rejected before any metadata or expense write.
   */
  async addExpense(potId: string, dto: CreateExpenseDTO): Promise<Expense> {
    const start = performance.now();
    try {
      if (!dto.amount || dto.amount <= 0) {
        throw new ValidationError('Expense amount must be greater than 0');
      }
      if (typeof dto.paidBy !== 'string' || dto.paidBy.trim().length === 0) {
        throw new ValidationError('Paid by is required');
      }
      if (typeof dto.memo !== 'string' || dto.memo.trim().length === 0) {
        throw new ValidationError('Expense memo is required');
      }

      const pot = await this.potRepository.get(potId);
      this.assertWritableExpense(dto, pot.members);

      const updates: { lastEditAt: string; lastCheckpoint?: undefined } = {
        lastEditAt: new Date().toISOString(),
      };
      if (pot.lastCheckpoint) {
        updates.lastCheckpoint = undefined;
      }
      await this.potRepository.update(potId, updates);

      const result = await this.repository.create(potId, {
        ...dto,
        currency: dto.currency || pot.baseCurrency,
      });
      this.potRepository.invalidate(potId);
      logTiming('addExpense', performance.now() - start, { potId, expenseId: result.id });
      return result;
    } catch (error) {
      logTiming('addExpense', performance.now() - start, { potId, error: error instanceof Error ? error.message : 'unknown' });
      throw error;
    }
  }

  /** Validate funding and recorded allocations on the complete proposed expense before effects. */
  async updateExpense(potId: string, expenseId: string, dto: UpdateExpenseDTO): Promise<Expense> {
    const start = performance.now();
    try {
      if (dto.amount !== undefined && dto.amount <= 0) {
        throw new ValidationError('Expense amount must be greater than 0');
      }
      if (dto.paidBy !== undefined && (typeof dto.paidBy !== 'string' || dto.paidBy.trim().length === 0)) {
        throw new ValidationError('Paid by is required');
      }
      if (dto.memo !== undefined && (typeof dto.memo !== 'string' || dto.memo.trim().length === 0)) {
        throw new ValidationError('Expense memo is required');
      }

      const pot = await this.potRepository.get(potId);
      const existing = await this.repository.get(potId, expenseId);
      // Check the original too: an update must not erase native funding in order
      // to sneak a legacy-shaped record through the unsupported storage path.
      if (hasNativeExpenseFunding(existing)) this.assertWritableExpense(existing, pot.members);
      this.assertWritableExpense({
        ...existing, ...dto,
        amount: dto.amount === undefined ? existing.amount : dto.amount,
      }, pot.members);

      const updates: { lastEditAt: string; lastCheckpoint?: undefined } = {
        lastEditAt: new Date().toISOString(),
      };
      if (pot.lastCheckpoint) {
        updates.lastCheckpoint = undefined;
      }
      await this.potRepository.update(potId, updates);

      const result = await this.repository.update(potId, expenseId, dto);
      this.potRepository.invalidate(potId);
      logTiming('updateExpense', performance.now() - start, { potId, expenseId });
      return result;
    } catch (error) {
      logTiming('updateExpense', performance.now() - start, { potId, expenseId, error: error instanceof Error ? error.message : 'unknown' });
      throw error;
    }
  }

  async listExpenses(potId: string, options?: ExpenseListOptions): Promise<Expense[]> {
    return this.repository.list(potId, options);
  }

  async getExpenseSummaries(
    potIds: string[],
    userId: string,
  ): Promise<Record<string, ExpenseSummary>> {
    return this.repository.summaries(potIds, userId);
  }

  async removeExpense(potId: string, expenseId: string): Promise<void> {
    const start = performance.now();
    try {
      await this.repository.remove(potId, expenseId);
      this.potRepository.invalidate(potId);
      logTiming('removeExpense', performance.now() - start, { potId, expenseId });
    } catch (error) {
      logTiming('removeExpense', performance.now() - start, { potId, expenseId, error: error instanceof Error ? error.message : 'unknown' });
      throw error;
    }
  }
}
