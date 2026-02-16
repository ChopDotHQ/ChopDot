import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Screen } from "../nav";
import type { Invite } from "../services/InviteService";
import { InviteService } from "../services/InviteService";

type ToastType = "success" | "error" | "info";

type PotInvite = Pick<Invite, "id" | "invitee_email" | "status" | "token">;
type PendingInvite = Pick<Invite, "id" | "token" | "created_at" | "expires_at">;

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
  isProcessingInvite: boolean;
  pendingInvites: PendingInvite[];
  showInviteModal: boolean;
  joinProcessingRef: MutableRefObject<boolean>;
  copyInviteLink: (potId: string) => Promise<void>;
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
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isProcessingInvite, setIsProcessingInvite] = useState(false);
  const joinProcessingRef = useRef(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  const copyInviteLink = useCallback(
    async (potId: string) => {
      const invites = await inviteService.getPotInvites(potId);
      const invite = invites[0];

      if (!invite?.token) {
        showToast("No invite found. Add a member first.", "info");
        return;
      }

      const link = `${window.location.origin}/join?token=${invite.token}`;
      try {
        await navigator.clipboard?.writeText(link);
        showToast("Invite link copied", "success");
      } catch {
        showToast(`Invite link: ${link}`, "success");
      }
    },
    [inviteService, showToast],
  );

  const refreshPendingInvites = useCallback(async () => {
    const invites = await inviteService.getMyPendingInvites();
    setPendingInvites(invites);
  }, [inviteService]);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    refreshPendingInvites();
  }, [authLoading, isAuthenticated, userId, refreshPendingInvites]);

  const cleanInviteParams = useCallback(() => {
    const cleaned = new URL(window.location.href);
    cleaned.searchParams.delete("token");
    cleaned.searchParams.delete("invite");
    window.history.replaceState({}, "", cleaned.toString());
  }, []);

  const fetchInvites = useCallback(
    async (potId: string) => {
      const invites = await inviteService.getPotInvites(potId);
      setInvitesByPot((prev) => ({ ...prev, [potId]: invites }));
    },
    [inviteService],
  );

  useEffect(() => {
    if (currentPotId) {
      fetchInvites(currentPotId);
    }
  }, [currentPotId, fetchInvites]);

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
  }, [cleanInviteParams]);

  const confirmPendingInvite = useCallback(async () => {
    if (!pendingInviteToken) {
      return;
    }
    await acceptInvite(pendingInviteToken);
  }, [pendingInviteToken, acceptInvite]);

  const cancelPendingInvite = useCallback(() => {
    setPendingInviteToken(null);
    setShowInviteModal(false);
    joinProcessingRef.current = false;
    cleanInviteParams();
  }, [cleanInviteParams]);

  return {
    invitesByPot,
    pendingInviteToken,
    isProcessingInvite,
    pendingInvites,
    showInviteModal,
    joinProcessingRef,
    copyInviteLink,
    fetchInvites,
    refreshPendingInvites,
    acceptInvite,
    declineInvite,
    confirmPendingInvite,
    cancelPendingInvite,
  };
};
