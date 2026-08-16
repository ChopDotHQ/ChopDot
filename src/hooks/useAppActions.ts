import { useBusinessActions } from './useBusinessActions';
import { useSettlementActions } from './useSettlementActions';
import { useMemberActions } from './useMemberActions';
import { usePotSettings } from './usePotSettings';
import type { Person } from '../types/app';
import type { Settlement } from '../types/app';
import type { Dispatch, SetStateAction } from 'react';

type BusinessParams = Parameters<typeof useBusinessActions>[0];
type MemberParams = Parameters<typeof useMemberActions>[0];
type PotSettingsParams = Parameters<typeof usePotSettings>[0];

interface AppActionsDeps extends BusinessParams {
  memberService: MemberParams['memberService'];
  people: Person[];
  userId: string | undefined;
  currentUserAddress?: string | null;
  settlements: Settlement[];
  setSettlements: Dispatch<SetStateAction<Settlement[]>>;
  copyInviteLink: (potId: string) => Promise<void>;
  resendInviteForPot: (potId: string, inviteId: string) => Promise<void>;
  revokeInviteForPot: (potId: string, inviteId: string) => Promise<void>;
}

export function useAppActions(deps: AppActionsDeps) {
  const business = useBusinessActions(deps);

  const { confirmSettlement, retrySettlementProof } = useSettlementActions({
    currentPotId: deps.currentPotId,
    showToast: deps.showToast,
    userId: deps.userId,
    notifyPotRefresh: () => deps.notifyPotRefresh(''),
  });

  const members = useMemberActions({
    currentPotId: deps.currentPotId,
    people: deps.people,
    setPots: deps.setPots,
    memberService: deps.memberService,
    usingSupabaseSource: deps.usingSupabaseSource,
    showToast: deps.showToast,
    notifyPotRefresh: deps.notifyPotRefresh,
  });

  const { updatePotSettings } = usePotSettings({
    setPots: deps.setPots,
    potService: deps.potService as unknown as PotSettingsParams['potService'],
    usingSupabaseSource: deps.usingSupabaseSource,
    showToast: deps.showToast,
    notifyPotRefresh: deps.notifyPotRefresh,
  });

  const persistPotPartial = async (potId: string, updates: Record<string, unknown>) => {
    deps.setPots((prev) =>
      prev.map((pot) => (pot.id === potId ? { ...pot, ...updates } : pot)),
    );

    try {
      await (deps.potService as unknown as PotSettingsParams['potService']).updatePot(potId, updates);
      deps.notifyPotRefresh(potId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      deps.showToast(`Saved locally only (sync failed): ${message}`, 'error');
    }
  };

  return {
    ...business,
    confirmSettlement,
    retrySettlementProof,
    persistPotPartial,
    copyInviteLink: deps.copyInviteLink,
    resendInviteForPot: deps.resendInviteForPot,
    revokeInviteForPot: deps.revokeInviteForPot,
    handleAddMemberExisting: members.addMemberExisting,
    handleUpdateMember: members.updateMember,
    handleRemoveMember: members.removeMember,
    handleUpdatePotSettings: updatePotSettings,
    handleDeletePot: async (potId: string) => {
      await business.deletePot(potId);
    },
    handleArchivePot: async (potId: string) => {
      await business.archivePot(potId);
    },
    handleLeavePot: async (potId: string) => {
      const currentUserId = deps.userId;
      const currentPot = deps.pots.find((pot) => pot.id === potId);
      if (!currentUserId || !currentPot) {
        deps.showToast('Pot not found', 'error');
        return;
      }

      const currentMember = currentPot.members.find((member) => member.id === currentUserId);
      if (!currentMember) {
        deps.showToast('You are not a member of this pot', 'error');
        return;
      }

      if (currentMember.role === 'Owner') {
        deps.showToast('Leaving a pot as owner is not implemented yet', 'info');
        return;
      }

      members.removeMember(potId, currentUserId);
      deps.setCurrentPotId(null);
      deps.replace({ type: 'pots-home' });
      deps.showToast('Left pot', 'success');
    },
  };
}
