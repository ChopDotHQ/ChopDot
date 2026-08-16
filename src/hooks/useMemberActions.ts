import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Pot, Person } from '../types/app';
import type { MemberService } from '../services/data/services/MemberService';
import { logDev, warnDev } from '../utils/logDev';

const UUID_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type UseMemberActionsParams = {
  currentPotId: string | null;
  people: Person[];
  setPots: Dispatch<SetStateAction<Pot[]>>;
  memberService: MemberService;
  usingSupabaseSource: boolean;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  notifyPotRefresh: (potId: string) => void;
};

export const useMemberActions = ({
  currentPotId,
  people,
  setPots,
  memberService,
  usingSupabaseSource,
  showToast,
  notifyPotRefresh,
}: UseMemberActionsParams) => {
  const addMemberExisting = useCallback(
    (contactId: string) => {
      const person = people.find((candidate) => candidate.id === contactId);
      if (!person || !currentPotId) {
        return;
      }

      const newMember = {
        id: person.id,
        name: person.name,
        role: 'Member' as const,
        status: 'active' as const,
      };

      setPots((prev) =>
        prev.map((pot) =>
          pot.id === currentPotId
            ? { ...pot, members: [...pot.members, newMember] }
            : pot,
        ),
      );

      (async () => {
        try {
          if (usingSupabaseSource && !UUID_LIKE_REGEX.test(currentPotId)) {
            logDev('[DataLayer] Skipping remote addMember for local-only pot id', { potId: currentPotId });
            return;
          }

          const createMemberDTO = {
            potId: currentPotId,
            // Pass the person's existing ID so the repository can upsert into
            // pot_members (Supabase) instead of generating a new Date.now() string.
            userId: person.id,
            name: person.name,
            role: 'Member' as const,
            status: 'active' as const,
            verified: false,
          };

          await memberService.addMember(currentPotId, createMemberDTO);
          logDev('[DataLayer] Member added via service', { potId: currentPotId, memberId: person.id });
          notifyPotRefresh(currentPotId);
        } catch (error) {
          warnDev('[DataLayer] Service addMember failed', error);
          const message = error instanceof Error ? error.message : String(error);
          showToast(`Saved locally only (sync failed): ${message}`, 'error');
        }
      })();

      showToast(`${person.name} added to pot`, 'success');
    },
    [currentPotId, memberService, notifyPotRefresh, people, setPots, showToast, usingSupabaseSource],
  );

  const updateMember = useCallback(
    (potId: string, member: { id: string; name: string; verified?: boolean }) => {
      setPots((prev) =>
        prev.map((pot) =>
          pot.id === potId
            ? {
                ...pot,
                members: pot.members.map((m) =>
                  m.id === member.id
                    ? {
                        ...m,
                        name: member.name,
                        verified: member.verified ?? m.verified,
                      }
                    : m,
                ),
              }
            : pot,
        ),
      );

      (async () => {
        try {
          if (usingSupabaseSource && !UUID_LIKE_REGEX.test(potId)) {
            logDev('[DataLayer] Skipping remote updateMember for local-only pot id', { potId, memberId: member.id });
            return;
          }

          await memberService.updateMember(potId, member.id, {
            name: member.name,
            verified: member.verified,
          });
          logDev('[DataLayer] Member updated via service', { potId, memberId: member.id });
          notifyPotRefresh(potId);
        } catch (error) {
          warnDev('[DataLayer] Service updateMember failed', error);
          const message = error instanceof Error ? error.message : String(error);
          showToast(`Saved locally only (sync failed): ${message}`, 'error');
        }
      })();

      showToast('Member updated', 'success');
    },
    [memberService, notifyPotRefresh, setPots, showToast, usingSupabaseSource],
  );

  const removeMember = useCallback(
    (potId: string, memberId: string) => {
      setPots((prev) =>
        prev.map((pot) =>
          pot.id === potId
            ? { ...pot, members: pot.members.filter((m) => m.id !== memberId) }
            : pot,
        ),
      );

      (async () => {
        try {
          if (usingSupabaseSource && !UUID_LIKE_REGEX.test(potId)) {
            logDev('[DataLayer] Skipping remote removeMember for local-only pot id', { potId, memberId });
            return;
          }

          await memberService.removeMember(potId, memberId);
          logDev('[DataLayer] Member removed via service', { potId, memberId });
          notifyPotRefresh(potId);
        } catch (error) {
          warnDev('[DataLayer] Service removeMember failed', error);
          const message = error instanceof Error ? error.message : String(error);
          showToast(`Saved locally only (sync failed): ${message}`, 'error');
        }
      })();

      showToast('Member removed', 'success');
    },
    [memberService, notifyPotRefresh, setPots, showToast, usingSupabaseSource],
  );

  return { addMemberExisting, updateMember, removeMember };
};
