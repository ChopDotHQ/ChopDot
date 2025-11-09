/**
 * Settlement Repository
 * 
 * Data access layer for settlements.
 * Handles caching and CRUD operations.
 */

import type { OnchainSettlementHistory } from '../types/dto';

/**
 * Settlement Repository
 * 
 * Provides cached access to settlement data with TTL.
 * Default TTL: 5 minutes (settlements are historical).
 * 
 * Note: Currently a placeholder. Will be implemented when settlement
 * history persistence is needed.
 */
export class SettlementRepository {
  constructor(_ttl: number = 300_000, _maxCacheSize: number = 100) {
    // TTL and cache size will be used when cache is implemented
  }

  /**
   * Invalidate cache
   */
  invalidate(): void {
    // Placeholder - cache will be implemented when needed
  }

  /**
   * Get all settlements
   * 
   * Note: Currently a placeholder. Will be implemented when settlement
   * history persistence is needed.
   */
  async list(): Promise<unknown[]> {
    // Placeholder - will be implemented when source is ready
    return [];
  }

  /**
   * Record an on-chain settlement in pot history
   * 
   * Note: This is handled by SettlementService.recordOnchainSettlement()
   * which updates the pot's history array directly.
   */
  async recordOnchainSettlement(
    _potId: string,
    _entry: OnchainSettlementHistory
  ): Promise<void> {
    // Placeholder - handled by SettlementService
    throw new Error('Use SettlementService.recordOnchainSettlement() instead');
  }
}

