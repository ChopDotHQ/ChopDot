/**
 * Settlement Service
 * 
 * Business logic layer for settlements.
 * Wraps settlement calculation and history recording.
 */

import { SettlementRepository } from '../repositories/SettlementRepository';
import type { SettlementSuggestion, OnchainSettlementHistory } from '../types/dto';
import { calculatePotSettlements } from '../../../utils/settlements';
import type { PotRepository } from '../repositories/PotRepository';

/**
 * Settlement Service
 * 
 * Provides business logic for settlement operations:
 * - Settlement suggestions (wraps existing calc)
 * - On-chain settlement history recording
 */
export class SettlementService {
  private potRepository: PotRepository;

  constructor(_repository: SettlementRepository, potRepository: PotRepository) {
    // Repository will be used when settlement history is implemented
    this.potRepository = potRepository;
  }

  /**
   * Get settlement suggestions for a pot
   * 
   * Uses the existing calculatePotSettlements logic.
   * 
   * @param potId - Pot ID
   * @returns Array of settlement suggestions
   * @throws {NotFoundError} If pot not found
   */
  async suggest(potId: string): Promise<SettlementSuggestion[]> {
    const pot = await this.potRepository.get(potId);
    
    // Use existing calculation logic
    // calculatePotSettlements returns CalculatedSettlements with youOwe/owedToYou arrays
    // Type assertion: repository Pot is compatible with calculatePotSettlements Pot
    // (members may have optional role/status in schema, but runtime values match)
    const settlements = calculatePotSettlements(pot as any, 'owner');
    
    // Convert to SettlementSuggestion format
    const suggestions: SettlementSuggestion[] = [];
    
    // Process "you owe" settlements (current user owes others)
    settlements.youOwe.forEach(person => {
      person.breakdown.forEach(breakdown => {
        if (breakdown.potName === pot.name) {
          // Find the member ID for this person
          const member = pot.members.find(m => m.id === person.id);
          if (member) {
            suggestions.push({
              from: 'owner', // Current user owes
              to: member.id,
              amount: breakdown.amount,
            });
          }
        }
      });
    });
    
    // Process "owed to you" settlements (others owe current user)
    settlements.owedToYou.forEach(person => {
      person.breakdown.forEach(breakdown => {
        if (breakdown.potName === pot.name) {
          // Find the member ID for this person
          const member = pot.members.find(m => m.id === person.id);
          if (member) {
            suggestions.push({
              from: member.id, // Member owes current user
              to: 'owner',
              amount: breakdown.amount,
            });
          }
        }
      });
    });
    
    return suggestions;
  }

  /**
   * Record an on-chain settlement in pot history
   * 
   * This persists the settlement entry to the pot's history array.
   * The actual on-chain transaction is handled by the chain service.
   * 
   * @param potId - Pot ID
   * @param entry - On-chain settlement history entry
   * @throws {NotFoundError} If pot not found
   */
  async recordOnchainSettlement(potId: string, entry: OnchainSettlementHistory): Promise<void> {
    const pot = await this.potRepository.get(potId);
    
    // Add entry to pot history
    const updatedHistory = [...(pot.history || []), entry];
    
    await this.potRepository.update(potId, {
      history: updatedHistory,
    });
  }
}

