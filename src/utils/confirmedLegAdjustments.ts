import type { CalculatedSettlements, PersonSettlement } from './settlements';

export type ConfirmedLegAdjustment = {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  currency?: string;
  state?: string;
};

type MemberLike = {
  id: string;
  name: string;
  address?: string;
};

export function applyConfirmedLegAdjustments(
  settlements: CalculatedSettlements,
  members: MemberLike[],
  input: {
    currentUserId: string;
    potName: string;
    baseCurrency: string;
    confirmedLegs?: ConfirmedLegAdjustment[];
  },
): CalculatedSettlements {
  const nets = new Map<string, number>();

  for (const person of settlements.owedToYou) {
    nets.set(person.id, (nets.get(person.id) ?? 0) + person.totalAmount);
  }
  for (const person of settlements.youOwe) {
    nets.set(person.id, (nets.get(person.id) ?? 0) - person.totalAmount);
  }

  for (const leg of input.confirmedLegs ?? []) {
    if (leg.state && leg.state !== 'confirmed') continue;
    if (leg.toMemberId === input.currentUserId) {
      nets.set(leg.fromMemberId, (nets.get(leg.fromMemberId) ?? 0) - leg.amount);
    }
    if (leg.fromMemberId === input.currentUserId) {
      nets.set(leg.toMemberId, (nets.get(leg.toMemberId) ?? 0) + leg.amount);
    }
  }

  const threshold = input.baseCurrency === 'DOT' ? 0.000001 : 0.01;
  const youOwe: PersonSettlement[] = [];
  const owedToYou: PersonSettlement[] = [];
  const byPerson = new Map<string, string>();

  for (const [memberId, net] of nets.entries()) {
    if (Math.abs(net) < threshold) continue;
    const member = members.find((item) => item.id === memberId);
    const totalAmount = Math.abs(net);
    const settlement: PersonSettlement = {
      id: memberId,
      name: member?.name ?? memberId,
      totalAmount,
      breakdown: [
        {
          potName: input.potName,
          amount: totalAmount,
          currency: input.baseCurrency,
        },
      ],
      trustScore: 95,
      address: member?.address,
    };

    byPerson.set(memberId, net.toFixed(input.baseCurrency === 'DOT' ? 10 : 2));
    if (net > 0) {
      owedToYou.push(settlement);
    } else {
      youOwe.push(settlement);
    }
  }

  const sortSettlements = (a: PersonSettlement, b: PersonSettlement) => b.totalAmount - a.totalAmount;
  return {
    owedToYou: owedToYou.sort(sortSettlements),
    youOwe: youOwe.sort(sortSettlements),
    byPerson,
  };
}
