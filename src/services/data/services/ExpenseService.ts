/**
 * Expense Service
 * 
 * Business logic layer for expenses.
 * Wraps ExpenseRepository with business rules.
 */

import { ExpenseRepository } from '../repositories/ExpenseRepository';
import type { Expense } from '../types';
import type { CreateExpenseDTO, UpdateExpenseDTO } from '../types/dto';
import { ValidationError } from '../errors';
import type { PotRepository } from '../repositories/PotRepository';
import { logTiming } from '../../../utils/logDev';

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

  /**
   * Add an expense to a pot
   * 
   * Invalidates checkpoint if user has confirmed (new expense added after confirmation).
   * 
   * @param potId - Pot ID
   * @param dto - Expense creation data
   * @returns Created expense
   * @throws {ValidationError} If input is invalid
   * @throws {NotFoundError} If pot not found
   */
  async addExpense(potId: string, dto: CreateExpenseDTO): Promise<Expense> {
    const start = performance.now();
    try {
      // Validate input
      if (!dto.amount || dto.amount <= 0) {
        throw new ValidationError('Expense amount must be greater than 0');
      }

      if (!dto.paidBy || dto.paidBy.trim().length === 0) {
        throw new ValidationError('Paid by is required');
      }

      if (!dto.memo || dto.memo.trim().length === 0) {
        throw new ValidationError('Expense memo is required');
      }

      // Get pot to check checkpoint status
      const pot = await this.potRepository.get(potId);

      // Invalidate checkpoint if user has confirmed (new expense added after confirmation)
      if (
        pot.currentCheckpoint?.status === 'pending' &&
        pot.currentCheckpoint.confirmations instanceof Map &&
        pot.currentCheckpoint.confirmations.get('owner')?.confirmed
      ) {
        // Invalidate checkpoint confirmation
        const updatedConfirmations = new Map(pot.currentCheckpoint.confirmations);
        updatedConfirmations.set('owner', {
          confirmed: false,
        });

        await this.potRepository.update(potId, {
          currentCheckpoint: {
            ...pot.currentCheckpoint,
            confirmations: updatedConfirmations,
          },
        });
      }

      // Create expense
      const result = await this.repository.create(potId, dto);
      logTiming('addExpense', performance.now() - start, { potId, expenseId: result.id });
      return result;
    } catch (error) {
      logTiming('addExpense', performance.now() - start, { potId, error: error instanceof Error ? error.message : 'unknown' });
      throw error;
    }
  }

  /**
   * Update an expense
   * 
   * Invalidates checkpoint if user has confirmed (expense modified after confirmation).
   * 
   * @param potId - Pot ID
   * @param expenseId - Expense ID
   * @param dto - Expense update data
   * @returns Updated expense
   * @throws {ValidationError} If input is invalid
   * @throws {NotFoundError} If pot or expense not found
   */
  async updateExpense(potId: string, expenseId: string, dto: UpdateExpenseDTO): Promise<Expense> {
    const start = performance.now();
    try {
      // Validate input
      if (dto.amount !== undefined && dto.amount <= 0) {
        throw new ValidationError('Expense amount must be greater than 0');
      }

      if (dto.paidBy !== undefined && dto.paidBy.trim().length === 0) {
        throw new ValidationError('Paid by is required');
      }

      if (dto.memo !== undefined && dto.memo.trim().length === 0) {
        throw new ValidationError('Expense memo is required');
      }

      // Get pot to check checkpoint status
      const pot = await this.potRepository.get(potId);

      // Invalidate checkpoint if user has confirmed (expense modified after confirmation)
      if (
        pot.currentCheckpoint?.status === 'pending' &&
        pot.currentCheckpoint.confirmations instanceof Map &&
        pot.currentCheckpoint.confirmations.get('owner')?.confirmed
      ) {
        // Invalidate checkpoint confirmation
        const updatedConfirmations = new Map(pot.currentCheckpoint.confirmations);
        updatedConfirmations.set('owner', {
          confirmed: false,
        });

        await this.potRepository.update(potId, {
          currentCheckpoint: {
            ...pot.currentCheckpoint,
            confirmations: updatedConfirmations,
          },
        });
      }

      // Update expense
      const result = await this.repository.update(potId, expenseId, dto);
      logTiming('updateExpense', performance.now() - start, { potId, expenseId });
      return result;
    } catch (error) {
      logTiming('updateExpense', performance.now() - start, { potId, expenseId, error: error instanceof Error ? error.message : 'unknown' });
      throw error;
    }
  }

  /**
   * List all expenses for a pot
   * 
   * @param potId - Pot ID
   * @returns Array of expenses
   * @throws {NotFoundError} If pot not found
   */
  async listExpenses(potId: string): Promise<Expense[]> {
    return this.repository.list(potId);
  }

  /**
   * Remove an expense
   * 
   * @param potId - Pot ID
   * @param expenseId - Expense ID
   * @throws {NotFoundError} If pot or expense not found
   */
  async removeExpense(potId: string, expenseId: string): Promise<void> {
    const start = performance.now();
    try {
      await this.repository.remove(potId, expenseId);
      logTiming('removeExpense', performance.now() - start, { potId, expenseId });
    } catch (error) {
      logTiming('removeExpense', performance.now() - start, { potId, expenseId, error: error instanceof Error ? error.message : 'unknown' });
      throw error;
    }
  }
}

