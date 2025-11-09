/**
 * Member Service
 * 
 * Business logic layer for pot members.
 * Wraps MemberRepository with business rules.
 */

import { MemberRepository } from '../repositories/MemberRepository';
import type { Member } from '../types';
import type { CreateMemberDTO, UpdateMemberDTO } from '../types/dto';
import { ValidationError } from '../errors';
import { logTiming } from '../../../utils/logDev';

/**
 * Member Service
 * 
 * Provides business logic for member operations:
 * - Validation
 * - Duplicate checking
 */
export class MemberService {
  private repository: MemberRepository;

  constructor(repository: MemberRepository) {
    this.repository = repository;
  }

  /**
   * Add a member to a pot
   * 
   * @param potId - Pot ID
   * @param dto - Member creation data
   * @returns Created member
   * @throws {ValidationError} If input is invalid
   * @throws {NotFoundError} If pot not found
   */
  async addMember(potId: string, dto: CreateMemberDTO): Promise<Member> {
    const start = performance.now();
    try {
      // Validate input
      if (!dto.name || dto.name.trim().length === 0) {
        throw new ValidationError('Member name is required');
      }

      const result = await this.repository.create(potId, dto);
      logTiming('addMember', performance.now() - start, { potId, memberId: result.id });
      return result;
    } catch (error) {
      logTiming('addMember', performance.now() - start, { potId, error: error instanceof Error ? error.message : 'unknown' });
      throw error;
    }
  }

  /**
   * Update a member
   * 
   * @param potId - Pot ID
   * @param memberId - Member ID
   * @param updates - Partial member data to update
   * @returns Updated member
   * @throws {NotFoundError} If pot or member not found
   */
  async updateMember(potId: string, memberId: string, updates: UpdateMemberDTO): Promise<Member> {
    const start = performance.now();
    try {
      const result = await this.repository.update(potId, memberId, updates);
      logTiming('updateMember', performance.now() - start, { potId, memberId });
      return result;
    } catch (error) {
      logTiming('updateMember', performance.now() - start, { potId, memberId, error: error instanceof Error ? error.message : 'unknown' });
      throw error;
    }
  }

  /**
   * Remove a member from a pot
   * 
   * @param potId - Pot ID
   * @param memberId - Member ID
   * @throws {NotFoundError} If pot or member not found
   */
  async removeMember(potId: string, memberId: string): Promise<void> {
    const start = performance.now();
    try {
      await this.repository.remove(potId, memberId);
      logTiming('removeMember', performance.now() - start, { potId, memberId });
    } catch (error) {
      logTiming('removeMember', performance.now() - start, { potId, memberId, error: error instanceof Error ? error.message : 'unknown' });
      throw error;
    }
  }
}

