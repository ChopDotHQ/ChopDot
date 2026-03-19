import { useBusinessActions } from './useBusinessActions';
import { useSettlementActions } from './useSettlementActions';
import { useMemberActions } from './useMemberActions';
import { usePotSettings } from './usePotSettings';
import type { Person } from '../types/app';

type BusinessParams = Parameters<typeof useBusinessActions>[0];
type MemberParams = Parameters<typeof useMemberActions>[0];
type PotSettingsParams = Parameters<typeof usePotSettings>[0];

interface AppActionsDeps extends BusinessParams {
  memberService: MemberParams['memberService'];
  people: Person[];
  userId: string | undefined;
}

export function useAppActions(deps: AppActionsDeps) {
  const business = useBusinessActions(deps);

  const { confirmSettlement } = useSettlementActions({
    pots: deps.pots,
    setPots: deps.setPots,
    addExpenseToPot: business.addExpenseToPot,
    showToast: deps.showToast,
    back: deps.back,
    currentUserId: deps.userId || 'owner',
    currentUserAddress: deps.userId || 'unknown',
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

  return {
    ...business,
    confirmSettlement,
    handleAddMemberExisting: members.addMemberExisting,
    handleUpdateMember: members.updateMember,
    handleRemoveMember: members.removeMember,
    handleUpdatePotSettings: updatePotSettings,
  };
}
