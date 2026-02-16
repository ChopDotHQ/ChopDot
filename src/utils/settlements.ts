import type { PotHistory } from '../types/app';
import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

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
  archived?: boolean; // Added archived
}

export interface Person {
  id: string;
  name: string;
  balance: number;
  trustScore: number;
  paymentPreference?: string;
  potCount: number;
  address?: string; // Add address support
}

export interface SettlementBreakdown {
  potName: string;
  amount: number;
  currency?: string;
}

export interface PersonSettlement {
  id: string;
  name: string;
  totalAmount: number;
  breakdown: SettlementBreakdown[];
  trustScore: number;
  paymentPreference?: string;
  address?: string;
}

export interface CalculatedSettlements {
  youOwe: PersonSettlement[];
  owedToYou: PersonSettlement[];
  byPerson: Map<string, string>; // Changed from number
}

// Helper for strict precision
const toPrecision = (val: Decimal, currency: string = 'USD'): string => {
  // DOT/Plancks: 10 decimals
  if (currency === 'DOT') return val.toFixed(10);
  // Default/Fiat: 2 decimals, but maybe we want more for internal precision?
  // UI expects 2 usually. let's Stick to 2 for Fiat to avoid 33.33333 on screen.
  // But wait, 33.3333 is better than 33.33 for settling.
  // Let's use 2 for Fiat standard.
  return val.toFixed(2);
};

const toDecimal = (value: unknown, fallback: string = '0') => {
  if (value instanceof Decimal) {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'string') {
    return new Decimal(value);
  }
  if (typeof value === 'bigint') {
    return new Decimal(value.toString());
  }
  return new Decimal(fallback);
};

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
  const youOwe: PersonSettlement[] = [];
  const owedToYou: PersonSettlement[] = [];
  const byPerson = new Map<string, string>(); // decimal string

  // We will aggregate amounts by person
  // Map<personId, { settlement: PersonSettlement, total: Decimal }>
  const youOweMap = new Map<string, { settlement: PersonSettlement, total: Decimal }>();
  const owedToYouMap = new Map<string, { settlement: PersonSettlement, total: Decimal }>();

  // Helper to merge breakdown
  const mergeBreakdown = (
    existing: SettlementBreakdown[],
    newItems: SettlementBreakdown[]
  ) => {
    return [...existing, ...newItems];
  };

  for (const pot of pots) {
    if (pot.archived) continue;

    // Use the robust bilateral logic from calculatePotSettlements
    const potSettlements = calculatePotSettlements(pot, currentUserId);

    // Process "You Owe" from this pot
    for (const p of potSettlements.youOwe) {
      if (!youOweMap.has(p.id)) {
        youOweMap.set(p.id, {
          settlement: { ...p, totalAmount: 0, breakdown: [] },
          total: new Decimal(0)
        });
      }
      const entry = youOweMap.get(p.id)!;
      entry.total = entry.total.plus(p.totalAmount);
      entry.settlement.breakdown = mergeBreakdown(entry.settlement.breakdown, p.breakdown);
    }

    // Process "Owed To You" from this pot
    for (const p of potSettlements.owedToYou) {
      if (!owedToYouMap.has(p.id)) {
        owedToYouMap.set(p.id, {
          settlement: { ...p, totalAmount: 0, breakdown: [] },
          total: new Decimal(0)
        });
      }
      const entry = owedToYouMap.get(p.id)!;
      entry.total = entry.total.plus(p.totalAmount);
      entry.settlement.breakdown = mergeBreakdown(entry.settlement.breakdown, p.breakdown);
    }
  }

  // Combine and net off balances across all pots
  const allPersonIds = new Set([...youOweMap.keys(), ...owedToYouMap.keys()]);

  for (const personId of allPersonIds) {
    const oweEntry = youOweMap.get(personId);
    const owedEntry = owedToYouMap.get(personId);

    const oweAmount = oweEntry ? oweEntry.total : new Decimal(0);
    const owedAmount = owedEntry ? owedEntry.total : new Decimal(0);

    // Net balance: Positive = they owe me. Negative = I owe them.
    const net = owedAmount.minus(oweAmount);

    // Skip if negligible
    if (net.abs().lessThan(0.01)) continue;

    // Determine person info
    const person = people.find(p => p.id === personId);
    // Use data from temporary settlements if person lookup fails (shouldn't happen if people list is complete)
    const stub = oweEntry?.settlement || owedEntry?.settlement;

    // Collect all breakdowns
    const allBreakdowns = [
      ...(oweEntry ? oweEntry.settlement.breakdown : []),
      ...(owedEntry ? owedEntry.settlement.breakdown : [])
    ];

    const baseSettlement: PersonSettlement = {
      id: personId,
      name: person?.name || stub?.name || "Unknown",
      totalAmount: net.abs().toNumber(),
      breakdown: allBreakdowns,
      trustScore: person?.trustScore || stub?.trustScore || 95,
      paymentPreference: person?.paymentPreference || stub?.paymentPreference,
      address: person?.address || stub?.address,
    };

    byPerson.set(personId, toPrecision(net, "USD")); // Simplified storage

    if (net.isNegative()) {
      youOwe.push(baseSettlement);
    } else {
      owedToYou.push(baseSettlement);
    }
  }

  // Sort by amount (descending)
  const sortSettlements = (a: PersonSettlement, b: PersonSettlement) => {
    return b.totalAmount - a.totalAmount;
  };
  youOwe.sort(sortSettlements);
  owedToYou.sort(sortSettlements);

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
  const byPerson = new Map<string, string>();

  // Calculate balance for each member (excluding current user)
  for (const member of pot.members) {
    if (member.id === currentUserId) continue;

    // Calculate their share of expenses you paid
    const theirShareOfMyExpenses = pot.expenses
      .filter(e => e.paidBy === currentUserId)
      .reduce((sum, e) => {
        // Handle implicit equal split
        if (!e.split || e.split.length === 0) {
          const amount = toDecimal(e.amount);
          const memberCount = pot.members.length;
          if (memberCount > 0) {
            return sum.plus(amount.div(memberCount));
          }
          return sum;
        }
        const share = e.split.find(s => s.memberId === member.id);
        return sum.plus(toDecimal(share?.amount ?? 0));
      }, new Decimal(0));

    // Calculate your share of expenses they paid
    const myShareOfTheirExpenses = pot.expenses
      .filter(e => e.paidBy === member.id)
      .reduce((sum, e) => {
        // Handle implicit equal split
        if (!e.split || e.split.length === 0) {
          const amount = toDecimal(e.amount);
          const memberCount = pot.members.length;
          if (memberCount > 0) {
            return sum.plus(amount.div(memberCount));
          }
          return sum;
        }
        const share = e.split.find(s => s.memberId === currentUserId);
        return sum.plus(toDecimal(share?.amount ?? 0));
      }, new Decimal(0));

    // Calculate net balance
    // Positive = they owe you, Negative = you owe them
    let balance = theirShareOfMyExpenses.minus(myShareOfTheirExpenses);

    // Apply DOT history offsets to move balance toward zero
    if (pot.history && pot.history.length > 0) {
      const relevant = pot.history.filter(
        (h): h is Extract<PotHistory, { type: 'onchain_settlement' }> =>
          h.type === 'onchain_settlement' && h.status !== 'failed'
      );
      for (const h of relevant) {
        const amt = toDecimal(h.amountDot ?? '0');
        if (!amt.isFinite() || amt.lte(0)) continue;
        if (h.fromMemberId === currentUserId && h.toMemberId === member.id) {
          // You paid them → you owe less → reduce how much you owe (increase balance)
          balance = balance.plus(amt);
        } else if (h.fromMemberId === member.id && h.toMemberId === currentUserId) {
          // They paid you → they owe less → decrease balance
          balance = balance.minus(amt);
        }
      }
    }

    // Currency-aware negligible threshold: DOT uses micro precision
    const threshold = pot.baseCurrency === 'DOT'
      ? new Decimal('0.000001')
      : new Decimal('0.01');
    if (balance.abs().lessThan(threshold)) continue; // Skip negligible amounts

    // Determine dominant currency
    const primaryCurrency = pot.baseCurrency;

    // Convert balance to Decimal for storage
    byPerson.set(member.id, toPrecision(balance, pot.baseCurrency));

    const settlement: PersonSettlement = {
      id: member.id,
      name: member.name,
      totalAmount: balance.abs().toNumber(),
      breakdown: [
        {
          potName: pot.name,
          amount: balance.abs().toNumber(),
          currency: primaryCurrency,
        },
      ],
      trustScore: 95,
      paymentPreference: undefined,
    };

    if (balance.lessThan(0)) {
      youOwe.push(settlement);
    } else if (balance.greaterThan(0)) {
      owedToYou.push(settlement);
    }
  }

  // Sort by amount (descending)
  const sortSettlements = (a: PersonSettlement, b: PersonSettlement) => {
    return b.totalAmount - a.totalAmount;
  };

  youOwe.sort(sortSettlements);
  owedToYou.sort(sortSettlements);

  return {
    youOwe,
    owedToYou,
    byPerson,
  };
}
