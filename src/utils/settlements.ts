import type { PotHistory } from '../App';

/**
 * SETTLEMENT CALCULATION ENGINE
 * 
 * Handles both global and pot-scoped settlement calculations.
 * Matches the balance logic shown in ExpensesTab UI.
 * 
 * Key Functions:
 * - calculateSettlements() - Global settlements across all pots
 * - calculatePotSettlements() - Pot-scoped settlements within one pot
 * 
 * Balance Calculation:
 * balance = (what they owe you from your payments) - (what you owe them from their payments)
 * Positive = they owe you | Negative = you owe them
 */

interface Member {
  id: string;
  name: string;
  role: "Owner" | "Member";
  status: "active" | "pending";
  address?: string; // Optional Polkadot wallet address
  verified?: boolean; // Optional verification status
}

interface Expense {
  id: string;
  amount: number;
  currency: string;
  paidBy: string;
  memo: string;
  date: string;
  split: { memberId: string; amount: number }[];
  attestations: string[];
  hasReceipt: boolean;
  receiptUrl?: string;
}

interface Pot {
  id: string;
  name: string;
  baseCurrency: string;
  members: Member[];
  expenses: Expense[];
  // Optional on-chain history for DOT settlements (when available)
  history?: PotHistory[];
}

export interface Person {
  id: string;
  name: string;
  balance: number;
  trustScore: number;
  paymentPreference?: string;
  potCount: number;
}

export interface SettlementBreakdown {
  potName: string;
  amount: number;
  currency?: string; // Currency for this breakdown item (e.g., "DOT", "USD")
}

export interface PersonSettlement {
  id: string;
  name: string;
  totalAmount: number;
  breakdown: SettlementBreakdown[];
  trustScore: number;
  paymentPreference?: string;
  address?: string; // Optional Polkadot wallet address (from any pot member)
}

export interface CalculatedSettlements {
  youOwe: PersonSettlement[];
  owedToYou: PersonSettlement[];
  byPerson: Map<string, number>; // personId -> net amount (positive = they owe you, negative = you owe them)
}

/**
 * Calculate settlement balances across all pots
 * @param pots - Array of pots with expenses
 * @param people - Array of people with their info (for trust scores, preferences, etc)
 * @param currentUserId - The ID of the current user (default: "owner")
 * @returns Aggregated settlement data
 */
export function calculateSettlements(
  pots: Pot[],
  people: Person[],
  currentUserId: string = "owner"
): CalculatedSettlements {
  // Map to store person -> pot -> balance
  const personPotBalances = new Map<string, Map<string, number>>();

  // Process each pot's expenses
  for (const pot of pots) {
    for (const expense of pot.expenses) {
      // Find how much each person owes for this expense
      for (const split of expense.split) {
        const personId = split.memberId;
        const amountOwed = split.amount;

        // Initialize maps if needed
        if (!personPotBalances.has(personId)) {
          personPotBalances.set(personId, new Map());
        }
        const potBalances = personPotBalances.get(personId)!;

        // If this person paid, they are owed money
        // If they didn't pay, they owe money
        if (personId === expense.paidBy) {
          // They paid, so they're owed the difference
          const othersOweThem = expense.amount - amountOwed;
          potBalances.set(
            pot.id,
            (potBalances.get(pot.id) || 0) + othersOweThem
          );
        } else {
          // They owe their share to the payer
          potBalances.set(
            pot.id,
            (potBalances.get(pot.id) || 0) - amountOwed
          );
        }
      }
    }
  }

  // Now aggregate by person (from current user's perspective)
  const byPerson = new Map<string, number>();
  const personBreakdowns = new Map<string, SettlementBreakdown[]>();

  for (const [personId, potBalances] of personPotBalances.entries()) {
    if (personId === currentUserId) continue; // Skip self

    let totalBalance = 0;
    const breakdown: SettlementBreakdown[] = [];

    for (const [potId, balance] of potBalances.entries()) {
      const pot = pots.find((p) => p.id === potId);
      // Currency-aware negligible threshold: DOT uses micro precision
      const threshold = pot?.baseCurrency === 'DOT' ? 0.000001 : 0.01;
      if (Math.abs(balance) < threshold) continue; // Skip negligible amounts

      if (!pot) continue;

      // From current user's perspective:
      // Positive balance = person owes current user
      // Negative balance = current user owes person
      const currentUserBalance =
        personPotBalances.get(currentUserId)?.get(potId) || 0;
      let netBalance = currentUserBalance - balance;

      // Apply on-chain DOT settlements for this pot to move balances toward zero
      if (pot.history && pot.history.length > 0) {
        const relevant = pot.history.filter(
          (h): h is Extract<PotHistory, { type: 'onchain_settlement' }> =>
            h.type === 'onchain_settlement' && h.status !== 'failed'
        );
        for (const h of relevant) {
          const amt = Number(h.amountDot || '0');
          if (!Number.isFinite(amt) || amt <= 0) continue;
          if (h.fromMemberId === currentUserId && h.toMemberId === personId) {
            // You paid them → you owe less → net increases toward zero
            netBalance += amt;
          } else if (h.fromMemberId === personId && h.toMemberId === currentUserId) {
            // They paid you → they owe less → net decreases toward zero
            netBalance -= amt;
          }
        }
      }

      const netThreshold = pot.baseCurrency === 'DOT' ? 0.000001 : 0.01;
      if (Math.abs(netBalance) >= netThreshold) {
        breakdown.push({
          potName: pot.name,
          amount: Math.abs(netBalance),
          currency: pot.baseCurrency,
        });
        totalBalance += netBalance;
      }
    }

    if (breakdown.length > 0) {
      byPerson.set(personId, totalBalance);
      personBreakdowns.set(personId, breakdown);
    }
  }

  // Build youOwe and owedToYou arrays
  const youOwe: PersonSettlement[] = [];
  const owedToYou: PersonSettlement[] = [];

  for (const [personId, totalBalance] of byPerson.entries()) {
    // Find person info
    const person = people.find((p) => p.id === personId);
    if (!person) continue;

    const breakdown = personBreakdowns.get(personId) || [];

    // Find member address from any pot (prioritize pots with larger balances)
    let memberAddress: string | undefined;
    const breakdownWithAmounts = breakdown.map(b => {
      const pot = pots.find(p => p.name === b.potName);
      return { pot, amount: b.amount };
    }).sort((a, b) => b.amount - a.amount); // Sort by amount descending
    
    for (const { pot } of breakdownWithAmounts) {
      if (pot) {
        const member = pot.members.find(m => m.id === personId);
        if (member?.address) {
          memberAddress = member.address;
          break; // Use first address found (from pot with largest balance)
        }
      }
    }

    const settlement: PersonSettlement = {
      id: personId,
      name: person.name,
      totalAmount: Math.abs(totalBalance),
      breakdown,
      trustScore: person.trustScore,
      paymentPreference: person.paymentPreference,
      address: memberAddress,
    };

    if (totalBalance < 0) {
      // Negative = you owe them
      youOwe.push(settlement);
    } else if (totalBalance > 0) {
      // Positive = they owe you
      owedToYou.push(settlement);
    }
  }

  // Sort by amount (descending)
  youOwe.sort((a, b) => b.totalAmount - a.totalAmount);
  owedToYou.sort((a, b) => b.totalAmount - a.totalAmount);

  return {
    youOwe,
    owedToYou,
    byPerson,
  };
}

/**
 * Calculate settlement balances for a SPECIFIC pot only
 * @param pot - The pot to calculate settlements for
 * @param currentUserId - The ID of the current user (default: "owner")
 * @returns Settlement data scoped to this pot only
 */
export function calculatePotSettlements(
  pot: Pot,
  currentUserId: string = "owner"
): CalculatedSettlements {
  // Build settlements using the same logic as ExpensesTab
  const youOwe: PersonSettlement[] = [];
  const owedToYou: PersonSettlement[] = [];
  const byPerson = new Map<string, number>();

  // Calculate balance for each member (excluding current user)
  for (const member of pot.members) {
    if (member.id === currentUserId) continue;

    // Calculate their share of expenses you paid
    const theirShareOfMyExpenses = pot.expenses
      .filter(e => e.paidBy === currentUserId)
      .reduce((sum, e) => {
        const share = e.split.find(s => s.memberId === member.id);
        return sum + (share?.amount || 0);
      }, 0);

    // Calculate your share of expenses they paid
    const myShareOfTheirExpenses = pot.expenses
      .filter(e => e.paidBy === member.id)
      .reduce((sum, e) => {
        const share = e.split.find(s => s.memberId === currentUserId);
        return sum + (share?.amount || 0);
      }, 0);

    // Calculate net balance
    // Positive = they owe you, Negative = you owe them
    let balance = theirShareOfMyExpenses - myShareOfTheirExpenses;

    // Apply DOT history offsets to move balance toward zero
    if (pot.history && pot.history.length > 0) {
      const relevant = pot.history.filter(
        (h): h is Extract<PotHistory, { type: 'onchain_settlement' }> =>
          h.type === 'onchain_settlement' && h.status !== 'failed'
      );
      for (const h of relevant) {
        const amt = Number(h.amountDot || '0');
        if (!Number.isFinite(amt) || amt <= 0) continue;
        if (h.fromMemberId === currentUserId && h.toMemberId === member.id) {
          // You paid them → you owe less → reduce how much you owe (increase balance)
          balance += amt;
        } else if (h.fromMemberId === member.id && h.toMemberId === currentUserId) {
          // They paid you → they owe less → decrease balance
          balance -= amt;
        }
      }
    }

    // Currency-aware negligible threshold: DOT uses micro precision
    const threshold = pot.baseCurrency === 'DOT' ? 0.000001 : 0.01;
    if (Math.abs(balance) < threshold) continue; // Skip negligible amounts

    byPerson.set(member.id, balance);

    const settlement: PersonSettlement = {
      id: member.id,
      name: member.name,
      totalAmount: Math.abs(balance),
      breakdown: [
        {
          potName: pot.name,
          amount: Math.abs(balance),
        },
      ],
      trustScore: 95, // Default trust score
      paymentPreference: undefined,
    };

    if (balance < 0) {
      // Negative = you owe them
      youOwe.push(settlement);
    } else if (balance > 0) {
      // Positive = they owe you
      owedToYou.push(settlement);
    }
  }

  // Sort by amount (descending)
  youOwe.sort((a, b) => b.totalAmount - a.totalAmount);
  owedToYou.sort((a, b) => b.totalAmount - a.totalAmount);

  return {
    youOwe,
    owedToYou,
    byPerson,
  };
}
