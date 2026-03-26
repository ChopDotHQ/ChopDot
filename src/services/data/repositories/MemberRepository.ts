/**
 * Member Repository
 * 
 * Data access layer for pot members.
 * Handles caching and CRUD operations within a pot.
 */

import type { Member } from '../types';
import type { CreateMemberDTO, UpdateMemberDTO } from '../types/dto';
import { NotFoundError } from '../errors';
import type { DataSource } from './PotRepository';

/**
 * Member Repository
 * 
 * Provides access to member data (pot-scoped).
 * Members are stored within pots, so operations require potId.
 * 
 * Note: No caching for members (they're small and change infrequently).
 */
export class MemberRepository {
  private source: DataSource;

  constructor(source: DataSource) {
    this.source = source;
  }

  /**
   * Get all members for a pot
   */
  async list(potId: string): Promise<Member[]> {
    const pot = await this.source.getPot(potId);
    if (!pot) {
      throw new NotFoundError('Pot', potId);
    }

    return (pot.members || []).map(m => ({ ...m })); // Return copies
  }

  /**
   * Get a single member by ID
   */
  async get(potId: string, memberId: string): Promise<Member> {
    const members = await this.list(potId);
    const member = members.find(m => m.id === memberId);
    
    if (!member) {
      throw new NotFoundError('Member', memberId);
    }

    return { ...member }; // Return copy
  }

  /**
   * Create a new member in a pot.
   *
   * If the source supports `addMemberRow` AND a `userId` was supplied in the DTO
   * (meaning the person already has a Supabase UUID), write directly to pot_members
   * instead of embedding in pot metadata. This keeps the relational store consistent.
   */
  async create(potId: string, input: CreateMemberDTO): Promise<Member> {
    const sourceAny = this.source as any;
    const userId: string | undefined = input.userId;

    if (userId && typeof sourceAny.addMemberRow === 'function') {
      await sourceAny.addMemberRow(potId, userId, input.name);
      return {
        id: userId,
        name: input.name,
        address: input.address || null,
        verified: input.verified ?? false,
        role: input.role || 'Member',
        status: input.status || 'active',
      };
    }

    // Local/other sources: embed in pot metadata
    const pot = await this.source.getPot(potId);
    if (!pot) {
      throw new NotFoundError('Pot', potId);
    }

    const member: Member = {
      id: userId ?? Date.now().toString(),
      name: input.name,
      address: input.address || null,
      verified: input.verified,
      role: input.role || 'Member',
      status: input.status || 'active',
    };

    // Check for duplicate
    if (pot.members?.some(m => m.id === member.id)) {
      return { ...member }; // Idempotent — already exists
    }

    const updatedPot: typeof pot = {
      ...pot,
      members: [...(pot.members || []), member],
      lastEditAt: new Date().toISOString(),
    };

    await this.source.savePot(updatedPot);

    return { ...member };
  }

  /**
   * Update an existing member.
   *
   * If the source supports `updateMemberName` and the memberId looks like a UUID
   * (i.e. it's a real Supabase user), also update public.users for consistency.
   */
  async update(potId: string, memberId: string, updates: UpdateMemberDTO): Promise<Member> {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const sourceAny = this.source as any;
    if (updates.name && UUID_RE.test(memberId) && typeof sourceAny.updateMemberName === 'function') {
      // Fire-and-forget — failure is logged inside updateMemberName, not thrown
      void sourceAny.updateMemberName(memberId, updates.name);
    }

    const pot = await this.source.getPot(potId);
    if (!pot) {
      throw new NotFoundError('Pot', potId);
    }

    const members = pot.members || [];
    const memberIndex = members.findIndex(m => m.id === memberId);
    if (memberIndex === -1) {
      throw new NotFoundError('Member', memberId);
    }

    const existing = members[memberIndex];
    if (!existing) {
      throw new NotFoundError('Member', memberId);
    }

    const updated: Member = {
      ...existing,
      ...updates,
      id: memberId, // Ensure ID doesn't change
      name: updates.name ?? existing.name, // Ensure name is always defined
    };

    // Update member in pot
    const updatedMembers = [...(pot.members || [])];
    updatedMembers[memberIndex] = updated;

    const updatedPot: typeof pot = {
      ...pot,
      members: updatedMembers,
      lastEditAt: new Date().toISOString(),
    };

    await this.source.savePot(updatedPot);

    return { ...updated }; // Return copy
  }

  /**
   * Remove a member from a pot
   */
  async remove(potId: string, memberId: string): Promise<void> {
    // Supabase path: delete membership row directly (members can leave without owning the pot)
    const sourceAny = this.source as any;
    if (typeof sourceAny.deleteMemberRow === 'function') {
      await sourceAny.deleteMemberRow(potId, memberId);
      return;
    }

    // Local/other sources: mutate pot metadata
    const pot = await this.source.getPot(potId);
    if (!pot) {
      throw new NotFoundError('Pot', potId);
    }

    const updatedMembers = (pot.members || []).filter(m => m.id !== memberId);
    
    if (updatedMembers.length === pot.members?.length) {
      // Member not found - this is OK, idempotent operation
      return;
    }

    const updatedPot: typeof pot = {
      ...pot,
      members: updatedMembers,
      lastEditAt: new Date().toISOString(),
    };

    await this.source.savePot(updatedPot);

  }
}
