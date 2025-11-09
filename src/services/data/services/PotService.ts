/**
 * Pot Service
 * 
 * Business logic layer for pots.
 * Wraps PotRepository with business rules.
 */

import { PotRepository } from '../repositories/PotRepository';
import type { Pot } from '../types';
import type { CreatePotDTO, UpdatePotDTO } from '../types/dto';
import { ValidationError } from '../errors';
import { logTiming } from '../../../utils/logDev';

/**
 * Pot Service
 * 
 * Provides business logic for pot operations:
 * - Validation
 * - Checkpoint hint computation
 * - Export/import with encryption (future)
 */
export class PotService {
  private repository: PotRepository;

  constructor(repository: PotRepository) {
    this.repository = repository;
  }

  /**
   * Create a new pot
   * 
   * @param input - Pot creation data
   * @returns Created pot
   * @throws {ValidationError} If input is invalid
   */
  async createPot(input: CreatePotDTO): Promise<Pot> {
    const start = performance.now();
    try {
      // Validate input
      if (!input.name || input.name.trim().length === 0) {
        throw new ValidationError('Pot name is required');
      }

      if (!input.type || !['expense', 'savings'].includes(input.type)) {
        throw new ValidationError('Pot type must be "expense" or "savings"');
      }

      const result = await this.repository.create(input);
      logTiming('createPot', performance.now() - start, { potId: result.id });
      return result;
    } catch (error) {
      logTiming('createPot', performance.now() - start, { error: error instanceof Error ? error.message : 'unknown' });
      throw error;
    }
  }

  /**
   * Get a pot by ID
   * 
   * @param id - Pot ID
   * @returns Pot
   * @throws {NotFoundError} If pot not found
   */
  async getPot(id: string): Promise<Pot> {
    const start = performance.now();
    try {
      const result = await this.repository.get(id);
      logTiming('getPot', performance.now() - start, { potId: id });
      return result;
    } catch (error) {
      logTiming('getPot', performance.now() - start, { potId: id, error: error instanceof Error ? error.message : 'unknown' });
      throw error;
    }
  }

  /**
   * List all pots
   * 
   * @returns Array of pots
   */
  async listPots(): Promise<Pot[]> {
    const start = performance.now();
    try {
      const result = await this.repository.list();
      logTiming('listPots', performance.now() - start, { count: result.length });
      return result;
    } catch (error) {
      logTiming('listPots', performance.now() - start, { error: error instanceof Error ? error.message : 'unknown' });
      throw error;
    }
  }

  /**
   * Update a pot
   * 
   * @param id - Pot ID
   * @param updates - Partial pot data to update
   * @returns Updated pot
   * @throws {NotFoundError} If pot not found
   */
  async updatePot(id: string, updates: UpdatePotDTO): Promise<Pot> {
    return this.repository.update(id, updates);
  }

  /**
   * Delete a pot
   * 
   * @param id - Pot ID
   * @throws {NotFoundError} If pot not found
   */
  async deletePot(id: string): Promise<void> {
    return this.repository.remove(id);
  }

  /**
   * Export a pot (returns pot object)
   * 
   * @param id - Pot ID
   * @returns Pot object
   * @throws {NotFoundError} If pot not found
   */
  async exportPot(id: string): Promise<Pot> {
    return this.repository.export(id);
  }

  /**
   * Import a pot (handles de-duplication)
   * 
   * @param pot - Pot object to import
   * @returns Imported pot
   */
  async importPot(pot: Pot): Promise<Pot> {
    return this.repository.import(pot);
  }

  /**
   * Compute checkpoint hint (hash + last checkpoint hash)
   * 
   * This computes the pot hash for checkpointing.
   * The actual on-chain checkpoint is handled by the chain service.
   * 
   * @param id - Pot ID
   * @returns Checkpoint hint with hash and optional last checkpoint hash
   * @throws {NotFoundError} If pot not found
   */
  async checkpointHint(id: string): Promise<{ hash: string; lastCheckpointHash?: string }> {
    const pot = await this.repository.get(id);
    
    // Import computePotHash from chain service (will be implemented)
    // For now, return placeholder
    const hash = `hash_${pot.id}_${Date.now()}`;
    
    // Get last checkpoint hash from history
    const lastCheckpoint = pot.history
      ?.filter(h => h.type === 'remark_checkpoint')
      .sort((a, b) => b.when - a.when)[0];
    
    return {
      hash,
      lastCheckpointHash: lastCheckpoint?.type === 'remark_checkpoint' 
        ? lastCheckpoint.potHash 
        : undefined,
    };
  }
}

