import { prisma } from '../lib/prisma';

export async function findActivePotMember(potId: string, userId: string) {
  return prisma.potMember.findFirst({
    where: {
      potId,
      userId,
      status: 'active',
    },
  });
}

export function canProposeSettlement(
  member: { id: string; role: string },
  legs: Array<{ toMemberId: string }>,
): boolean {
  return member.role === 'owner' || legs.every((leg) => leg.toMemberId === member.id);
}
