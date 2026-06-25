import type { Pot } from '../schema/pot';

export function resolvePotMember(
  pot: Pot,
  userId: string | undefined,
): { memberId: string; memberName: string } {
  if (userId) {
    const direct = pot.members.find((member) => member.id === userId);
    if (direct) {
      return { memberId: direct.id, memberName: direct.name };
    }
  }

  const owner = pot.members.find((member) => member.role === 'Owner');
  if (owner) {
    return { memberId: owner.id, memberName: owner.name };
  }

  const first = pot.members[0];
  return {
    memberId: first?.id ?? userId ?? 'owner',
    memberName: first?.name ?? 'You',
  };
}
