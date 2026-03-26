import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Screen } from "../nav";
import type { Invite } from "../services/InviteService";
import { InviteService } from "../services/InviteService";
import { deliverText } from "../utils/delivery";

type ToastType = "success" | "error" | "info";

type PotInvite = Pick<Invite, "id" | "invitee_email" | "status" | "token">;
type PendingInvite = Pick<Invite, "id" | "token" | "created_at" | "expires_at"> & {
  pot_id?: string;
  pot_name?: string;
};

interface InviteDetails {
  potName?: string;
  potId?: string;
  inviteeEmail?: string;
}

type UseInviteFlowParams = {
  inviteService: InviteService;
  authLoading: boolean;
  isAuthenticated: boolean;
  userId?: string;
  currentPotId: string | null;
  setCurrentPotId: Dispatch<SetStateAction<string | null>>;
  reset: (screen: Screen) => void;
  notifyPotRefresh: (potId: string) => void;
  showToast: (message: string, type?: ToastType) => void;
};

type UseInviteFlowResult = {
  invitesByPot: Record<string, PotInvite[]>;
  pendingInviteToken: string | null;
  inviteDetails: InviteDetails | null;
  isProcessingInvite: boolean;
  pendingInvites: PendingInvite[];
  showInviteModal: boolean;
  joinProcessingRef: MutableRefObject<boolean>;
  copyInviteLink: (potId: string) => Promise<void>;
  resendInviteLink: (potId: string, inviteId: string) => Promise<void>;
  revokeInvite: (potId: string, inviteId: string) => Promise<void>;
  fetchInvites: (potId: string) => Promise<void>;
  refreshPendingInvites: () => Promise<void>;
  acceptInvite: (token: string) => Promise<void>;
  declineInvite: (token: string) => Promise<void>;
  confirmPendingInvite: () => Promise<void>;
  cancelPendingInvite: () => void;
};

export const useInviteFlow = ({
  inviteService,
  authLoading,
  isAuthenticated,
  userId,
  currentPotId,
  setCurrentPotId,
  reset,
  notifyPotRefresh,
  showToast,
}: UseInviteFlowParams): UseInviteFlowResult => {
  const [invitesByPot, setInvitesByPot] = useState<Record<string, PotInvite[]>>({});
  const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(null);
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isProcessingInvite, setIsProcessingInvite] = useState(false);
  const joinProcessingRef = useRef(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  const copyInviteLink = useCallback(
    async (potId: string) => {
      const invites = (await inviteService.getPotInvites(potId)) as PotInvite[];
      const invite = invites[0];

      if (!invite?.token) {
        showToast("No invite found. Add a member first.", "info");
        return;
      }

      const link = `${window.location.origin}/join?token=${invite.token}`;
      try {
        const mode = await deliverText({
          title: "Join my ChopDot pot",
          text: `Join my ChopDot pot: ${link}`,
        });
        if (mode === "share") {
          showToast("Invite shared", "success");
        } else if (mode === "clipboard") {
          showToast("Invite link copied", "success");
        } else {
          showToast(`Invite link: ${link}`, "info");
        }
      } catch {
        showToast(`Invite link: ${link}`, "info");
      }
    },
    [inviteService, showToast],
  );

  const refreshPendingInvites = useCallback(async () => {
    const invites = await inviteService.getMyPendingInvites();
    setPendingInvites(invites.map((inv) => ({
      id: inv.id,
      token: inv.token,
      created_at: inv.created_at,
      expires_at: inv.expires_at,
      pot_id: inv.pot_id,
      pot_name: inv.pot_name,
    })));
  }, [inviteService]);

  const resendInviteLink = useCallback(
    async (potId: string, inviteId: string) => {
      let invites: PotInvite[] = invitesByPot[potId] ?? [];
      if (invites.length === 0) {
        invites = (await inviteService.getPotInvites(potId)) as PotInvite[];
        setInvitesByPot((prev) => ({ ...prev, [potId]: invites }));
      }

      const invite = invites.find((entry) => entry.id === inviteId);
      if (!invite?.token) {
        showToast('Invite not found', 'error');
        return;
      }

      const link = `${window.location.origin}/join?token=${invite.token}`;
      try {
        const mode = await deliverText({
          title: 'Join my ChopDot pot',
          text: `Join my ChopDot pot: ${link}`,
        });
        if (mode === 'share') {
          showToast('Invite shared', 'success');
        } else if (mode === 'clipboard') {
          showToast('Invite link copied', 'success');
        } else {
          showToast(`Invite link: ${link}`, 'info');
        }
      } catch {
        showToast(`Invite link: ${link}`, 'info');
      }
    },
    [inviteService, invitesByPot, showToast],
  );

  const fetchInvites = useCallback(
    async (potId: string) => {
      const invites = (await inviteService.getPotInvites(potId)) as PotInvite[];
      setInvitesByPot((prev) => ({ ...prev, [potId]: invites }));
    },
    [inviteService],
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }
    refreshPendingInvites();

    // If a URL invite token was detected before auth resolved, retry fetching
    // its details now that we have a session (the invitee RLS policy requires auth).
    if (pendingInviteToken && isAuthenticated && !inviteDetails) {
      inviteService.getInviteByToken(pendingInviteToken).then((details) => {
        if (details) {
          setInviteDetails({
            potName: details.pot_name,
            potId: details.pot_id,
            inviteeEmail: details.invitee_email,
          });
        }
      }).catch(() => {});
    }
  }, [authLoading, isAuthenticated, userId, refreshPendingInvites, pendingInviteToken, inviteDetails, inviteService]);

  const cleanInviteParams = useCallback(() => {
    const cleaned = new URL(window.location.href);
    cleaned.searchParams.delete("token");
    cleaned.searchParams.delete("invite");
    window.history.replaceState({}, "", cleaned.toString());
  }, []);

  useEffect(() => {
    if (currentPotId) {
      fetchInvites(currentPotId);
    }
  }, [currentPotId, fetchInvites]);

  const revokeInvite = useCallback(
    async (potId: string, inviteId: string) => {
      const result = await inviteService.revokeInvite(inviteId);
      if (!result.success) {
        showToast(result.error || 'Failed to revoke invite', 'error');
        return;
      }

      await fetchInvites(potId);
      showToast('Invite revoked', 'success');
    },
    [fetchInvites, inviteService, showToast],
  );

  const acceptInvite = useCallback(
    async (token: string) => {
      setIsProcessingInvite(true);
      const result = await inviteService.acceptInvite(token);
      setIsProcessingInvite(false);

      if (!result.success) {
        showToast(result.error || "Failed to accept invite", "error");
        return;
      }

      showToast("Invite accepted!", "success");
      if (result.potId) {
        setCurrentPotId(result.potId);
        reset({ type: "pot-home", potId: result.potId });
        notifyPotRefresh(result.potId);
      }
      refreshPendingInvites();
      cleanInviteParams();
      setInviteDetails(null);
      setShowInviteModal(false);
    },
    [
      inviteService,
      showToast,
      setCurrentPotId,
      reset,
      notifyPotRefresh,
      refreshPendingInvites,
      cleanInviteParams,
    ],
  );

  const declineInvite = useCallback(
    async (token: string) => {
      setIsProcessingInvite(true);
      const result = await inviteService.declineInvite(token);
      setIsProcessingInvite(false);

      if (!result.success) {
        showToast(result.error || "Failed to decline invite", "error");
        return;
      }

      showToast("Invite declined", "success");
      refreshPendingInvites();
      cleanInviteParams();
      setInviteDetails(null);
      setShowInviteModal(false);
    },
    [inviteService, showToast, refreshPendingInvites, cleanInviteParams],
  );

  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token") || url.searchParams.get("invite");
    if (!token || joinProcessingRef.current) {
      return;
    }
    joinProcessingRef.current = true;
    setPendingInviteToken(token);
    setShowInviteModal(true);

    // Fetch invite details (pot name, invitee email) to show in the modal.
    // This requires the user to be authenticated — if not yet, details will be
    // fetched on next render when auth resolves (modal stays open).
    inviteService.getInviteByToken(token).then((details) => {
      if (details) {
        setInviteDetails({
          potName: details.pot_name,
          potId: details.pot_id,
          inviteeEmail: details.invitee_email,
        });
      }
    }).catch(() => {
      // Non-fatal — modal still shows without details
    });
  }, [cleanInviteParams, inviteService]);

  const confirmPendingInvite = useCallback(async () => {
    if (!pendingInviteToken) {
      return;
    }
    await acceptInvite(pendingInviteToken);
  }, [pendingInviteToken, acceptInvite]);

  const cancelPendingInvite = useCallback(() => {
    setPendingInviteToken(null);
    setInviteDetails(null);
    setShowInviteModal(false);
    joinProcessingRef.current = false;
    cleanInviteParams();
  }, [cleanInviteParams]);

  return {
    invitesByPot,
    pendingInviteToken,
    inviteDetails,
    isProcessingInvite,
    pendingInvites,
    showInviteModal,
    joinProcessingRef,
    copyInviteLink,
    resendInviteLink,
    revokeInvite,
    fetchInvites,
    refreshPendingInvites,
    acceptInvite,
    declineInvite,
    confirmPendingInvite,
    cancelPendingInvite,
  };
};
