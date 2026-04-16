/**
 * Settlement Service
 *
 * Business logic layer for the shared commitment settlement kernel.
 *
 * Responsibilities:
 * - Computing settlement suggestions from pot expenses
 * - Proposing a chapter (persisting typed settlement legs)
 * - Progressing legs: pending → paid → confirmed
 * - Deriving chapter status from leg states
 */

import { SettlementRepository } from '../repositories/SettlementRepository';
import type { SettlementSuggestion } from '../types/dto';
import { calculatePotSettlements } from '../../../utils/settlements';
import type { PotRepository } from '../repositories/PotRepository';
import type { SettlementLeg, PotStatus } from '../../../types/app';

export { SettlementRepository };

/**
 * Derive a pot's chapter status from its settlement legs.
 *
 * - No legs → active (nothing proposed yet)
 * - All confirmed → completed
 * - Any paid or confirmed → partially_settled
 * - All pending → active (chapter open but no payments yet)
 */
export function deriveChapterStatus(legs: SettlementLeg[]): PotStatus {
  if (legs.length === 0) return 'active';
  if (legs.every(l => l.status === 'confirmed')) return 'completed';
  if (legs.some(l => l.status === 'paid' || l.status === 'confirmed')) return 'partially_settled';
  return 'active';
}

export class SettlementService {
  private potRepository: PotRepository;
  private settlementRepository: SettlementRepository;

  constructor(repository: SettlementRepository, potRepository: PotRepository) {
    this.settlementRepository = repository;
    this.potRepository = potRepository;
  }

  // ─── Suggestions ──────────────────────────────────────────────────────────

  /**
   * Compute settlement suggestions for a pot based on expense balances.
   * Does not write anything to the database.
   */
  async suggest(potId: string): Promise<SettlementSuggestion[]> {
    const pot = await this.potRepository.get(potId);
    const settlements = calculatePotSettlements(pot as any, 'owner');
    const suggestions: SettlementSuggestion[] = [];

    settlements.youOwe.forEach(person => {
      person.breakdown.forEach(breakdown => {
        if (breakdown.potName === pot.name) {
          const member = pot.members.find(m => m.id === person.id);
          if (member) {
            suggestions.push({ from: 'owner', to: member.id, amount: String(breakdown.amount) });
          }
        }
      });
    });

    settlements.owedToYou.forEach(person => {
      person.breakdown.forEach(breakdown => {
        if (breakdown.potName === pot.name) {
          const member = pot.members.find(m => m.id === person.id);
          if (member) {
            suggestions.push({ from: member.id, to: 'owner', amount: String(breakdown.amount) });
          }
        }
      });
    });

    return suggestions;
  }

  // ─── Chapter lifecycle ─────────────────────────────────────────────────────

  /**
   * Propose a chapter for a pot.
   *
   * Creates one settlement leg per bilateral payment needed to clear balances.
   * Each leg starts as 'pending'.
   *
   * @param potId - Pot to settle
   * @param legs  - Computed legs (from, to, amount, currency)
   * @returns Persisted settlement legs
   */
  async proposeChapter(
    potId: string,
    legs: Array<{ fromMemberId: string; toMemberId: string; amount: number; currency: string }>,
  ): Promise<SettlementLeg[]> {
    const created = await Promise.all(
      legs.map(leg =>
        this.settlementRepository.create({
          potId,
          fromMemberId: leg.fromMemberId,
          toMemberId: leg.toMemberId,
          amount: leg.amount,
          currency: leg.currency,
        }),
      ),
    );
    return created;
  }

  /**
   * Load all settlement legs for a pot (open chapter view).
   */
  async getChapterLegs(potId: string): Promise<SettlementLeg[]> {
    return this.settlementRepository.listByPot(potId);
  }

  /**
   * Payer marks a leg as paid.
   * Transitions: pending → paid
   */
  async markPaid(
    legId: string,
    method: SettlementLeg['method'],
    reference?: string,
  ): Promise<SettlementLeg> {
    return this.settlementRepository.markPaid(legId, method, reference);
  }

  /**
   * Receiver confirms a leg.
   * Transitions: paid → confirmed
   */
  async confirmReceipt(legId: string): Promise<SettlementLeg> {
    return this.settlementRepository.confirmReceipt(legId);
  }

  /**
   * Derive chapter status from current legs.
   */
  chapterStatus(legs: SettlementLeg[]): PotStatus {
    return deriveChapterStatus(legs);
  }
}
