/**
 * Pot Repository
 * 
 * Data access layer for pots.
 * Handles caching, source abstraction, and CRUD operations.
 */

import type { Pot } from '../types';
import type { CreatePotDTO, UpdatePotDTO } from '../types/dto';
import { NotFoundError } from '../errors';

export interface DataSource {
  getPots(): Promise<Pot[]>;
  getPot(id: string): Promise<Pot | null>;
  savePots(pots: Pot[]): Promise<void>;
  savePot(pot: Pot): Promise<void>;
  deletePot(id: string): Promise<void>;
  exportPot(id: string): Promise<Pot>;
  importPot(pot: Pot): Promise<Pot>;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Pot Repository
 * 
 * Provides cached access to pot data with TTL.
 * Default TTL: 60 seconds (pots change infrequently).
 */
export class PotRepository {
  private source: DataSource;
  private cache = new Map<string, CacheEntry<Pot>>();
  private listCache: CacheEntry<Pot[]> | null = null;
  private readonly ttl: number;
  private readonly maxCacheSize: number;

  constructor(source: DataSource, ttl: number = 60_000, maxCacheSize: number = 100) {
    this.source = source;
    this.ttl = ttl;
    this.maxCacheSize = maxCacheSize;
  }

  /**
   * Invalidate cache entry
   * @param id - Pot ID to invalidate (undefined = invalidate all)
   */
  invalidate(id?: string): void {
    if (id) {
      this.cache.delete(id);
    } else {
      this.cache.clear();
      this.listCache = null;
    }
  }

  /**
   * Get all pots
   * Uses cache if available and not expired
   */
  async list(): Promise<Pot[]> {
    const now = Date.now();
    
    // Check cache
    if (this.listCache && (now - this.listCache.timestamp) < this.ttl) {
      return [...this.listCache.data]; // Return copy
    }

    // Fetch from source
    const pots = await this.source.getPots();
    
    // Update cache
    this.listCache = {
      data: pots,
      timestamp: now,
    };

    // Update individual pot cache
    pots.forEach(pot => {
      this.cache.set(pot.id, {
        data: pot,
        timestamp: now,
      });
    });

    // Enforce cache size limit
    if (this.cache.size > this.maxCacheSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp); // Oldest first
      const toRemove = entries.slice(0, entries.length - this.maxCacheSize);
      toRemove.forEach(([id]) => this.cache.delete(id));
    }

    return [...pots]; // Return copy
  }

  /**
   * Get a single pot by ID
   * Uses cache if available and not expired
   */
  async get(id: string): Promise<Pot> {
    const now = Date.now();
    
    // Check cache
    const cached = this.cache.get(id);
    if (cached && (now - cached.timestamp) < this.ttl) {
      return { ...cached.data }; // Return copy
    }

    // Fetch from source
    const pot = await this.source.getPot(id);
    if (!pot) {
      throw new NotFoundError('Pot', id);
    }

    // Update cache
    this.cache.set(id, {
      data: pot,
      timestamp: now,
    });

    return { ...pot }; // Return copy
  }

  /**
   * Create a new pot
   */
  async create(input: CreatePotDTO): Promise<Pot> {
    const pot: Pot = {
      id: Date.now().toString(), // Temporary ID generation (will be UUID from backend)
      name: input.name,
      type: input.type,
      baseCurrency: input.baseCurrency || 'USD',
      members: input.members || [
        {
          id: 'owner',
          name: 'You',
          role: 'Owner',
          status: 'active',
        },
      ],
      expenses: [],
      budget: input.budget,
      budgetEnabled: input.budgetEnabled ?? false,
      checkpointEnabled: input.checkpointEnabled ?? false,
      mode: 'casual',
      history: [],
      archived: false,
      // Savings pot fields
      contributions: input.type === 'savings' ? [] : undefined,
      totalPooled: input.type === 'savings' ? 0 : undefined,
      yieldRate: input.type === 'savings' ? 0 : undefined,
      goalAmount: input.goalAmount,
      goalDescription: input.goalDescription,
    };

    await this.source.savePot(pot);
    this.invalidate(); // Invalidate list cache

    return { ...pot }; // Return copy
  }

  /**
   * Update an existing pot
   */
  async update(id: string, updates: UpdatePotDTO): Promise<Pot> {
    const existing = await this.get(id); // Throws NotFoundError if not found
    
    const updated: Pot = {
      ...existing,
      ...updates,
      id, // Ensure ID doesn't change
    };

    await this.source.savePot(updated);
    this.invalidate(id); // Invalidate this pot's cache

    return { ...updated }; // Return copy
  }

  /**
   * Remove a pot
   */
  async remove(id: string): Promise<void> {
    await this.source.deletePot(id);
    this.invalidate(id); // Invalidate cache
  }

  /**
   * Export a pot (returns pot object)
   */
  async export(id: string): Promise<Pot> {
    return this.source.exportPot(id);
  }

  /**
   * Import a pot (handles de-duplication)
   */
  async import(pot: Pot): Promise<Pot> {
    const imported = await this.source.importPot(pot);
    this.invalidate(); // Invalidate list cache
    return { ...imported }; // Return copy
  }
}

