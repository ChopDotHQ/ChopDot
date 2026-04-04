/**
 * Settlement Repository
 *
 * Data access layer for settlements.
 * Placeholder — settlement history persistence not yet implemented.
 */

export class SettlementRepository {
  constructor(_ttl: number = 300_000, _maxCacheSize: number = 100) {
    // TTL and cache size will be used when cache is implemented
  }

  invalidate(): void {
    // Placeholder - cache will be implemented when needed
  }

  async list(): Promise<unknown[]> {
    return [];
  }
}
