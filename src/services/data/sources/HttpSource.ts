/**
 * HTTP Data Source (Stub)
 * 
 * Placeholder for future backend API integration.
 * Same interface as LocalStorageSource but throws NetworkError.
 * 
 * When backend is ready, implement methods to call ApiClient.
 */

import type { Pot } from '../types';
import { NetworkError } from '../errors';

/**
 * HTTP data source (stub)
 * 
 * This will be implemented when backend API is ready.
 * For now, all methods throw NetworkError.
 */
export class HttpSource {
  /**
   * Get all pots from API
   * @throws {NetworkError} Always (not implemented)
   */
  async getPots(): Promise<Pot[]> {
    throw new NetworkError('HTTP source not implemented yet');
  }

  /**
   * Get a single pot by ID
   * @throws {NetworkError} Always (not implemented)
   */
  async getPot(_id: string): Promise<Pot | null> {
    throw new NetworkError('HTTP source not implemented yet');
  }

  /**
   * Save pots to API
   * @throws {NetworkError} Always (not implemented)
   */
  async savePots(_pots: Pot[]): Promise<void> {
    throw new NetworkError('HTTP source not implemented yet');
  }

  /**
   * Save a single pot
   * @throws {NetworkError} Always (not implemented)
   */
  async savePot(_pot: Pot): Promise<void> {
    throw new NetworkError('HTTP source not implemented yet');
  }

  /**
   * Delete a pot by ID
   * @throws {NetworkError} Always (not implemented)
   */
  async deletePot(_id: string): Promise<void> {
    throw new NetworkError('HTTP source not implemented yet');
  }

  /**
   * Export a pot (returns pot object)
   * @throws {NetworkError} Always (not implemented)
   */
  async exportPot(_id: string): Promise<Pot> {
    throw new NetworkError('HTTP source not implemented yet');
  }

  /**
   * Import a pot
   * @throws {NetworkError} Always (not implemented)
   */
  async importPot(_pot: Pot): Promise<Pot> {
    throw new NetworkError('HTTP source not implemented yet');
  }

  /**
   * Get settlements from API
   * @throws {NetworkError} Always (not implemented)
   */
  async getSettlements(): Promise<unknown[]> {
    throw new NetworkError('HTTP source not implemented yet');
  }

  /**
   * Save settlements to API
   * @throws {NetworkError} Always (not implemented)
   */
  async saveSettlements(_settlements: unknown[]): Promise<void> {
    throw new NetworkError('HTTP source not implemented yet');
  }
}

