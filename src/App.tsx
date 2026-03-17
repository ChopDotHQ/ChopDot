import {
  Suspense,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import { AppRouter } from "./components/AppRouter";
import { useNav } from "./nav";
import { useTheme } from "./utils/useTheme";
import { triggerHaptic } from "./utils/haptics";
import { InviteService } from "./services/InviteService";
import { AcceptInviteModal } from "./components/modals/AcceptInviteModal";
import { getSupabase } from "./utils/supabase-client";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { FeatureFlagsProvider, useFeatureFlags } from "./contexts/FeatureFlagsContext";
import { useAccount } from "./contexts/AccountContext";
import { AuthScreen } from "./components/screens/AuthScreen";
import { BottomTabBar } from "./components/BottomTabBar";
import { SwipeableScreen } from "./components/SwipeableScreen";
import { toast } from "sonner";
import { useData } from "./services/data/DataContext";
import { AppOverlays } from "./components/app/AppOverlays";
import { Receipt, CheckCircle, ArrowLeftRight, Plus, LucideIcon } from "lucide-react";
import { setOnboardingCallback, resetOnboardingFlag } from "./services/storage/ipfsWithOnboarding";
import { getInitialScreenFromLocation, useUrlSync } from "./hooks/useUrlSync";
import { useInviteFlow } from "./hooks/useInviteFlow";
import { useBusinessActions } from "./hooks/useBusinessActions";
import { useSettlementActions } from "./hooks/useSettlementActions";
import { useMemberActions } from "./hooks/useMemberActions";
import { usePotSettings } from "./hooks/usePotSettings";
import { useDerivedData } from "./hooks/useDerivedData";
import { usePotState } from "./hooks/usePotState";
import { useOverlayState } from "./hooks/useOverlayState";
import type { PaymentMethod } from "./components/screens/PaymentMethods";
import type { Notification } from "./components/screens/NotificationCenter";

import type { Pot } from "./types/app";

function AppContent() {
  const { DEMO_MODE, POLKADOT_APP_ENABLED } = useFeatureFlags();
  const { pots: potService, expenses: expenseService, members: memberService } = useData();
  const { theme, setTheme } = useTheme();
  const account = useAccount();

  const {
    user,
    isLoading: authLoading,
    isAuthenticated,
    logout,
  } = useAuth();
  const isGuest =
    user?.isGuest === true ||
    user?.authMethod === 'guest' ||
    user?.authMethod === 'anonymous';
  const userEmail = (user as any)?.email as string | undefined;

  const {
    current: screen,
    stack,
    push,
    back,
    reset,
    replace,
  } = useNav(getInitialScreenFromLocation());

  useUrlSync({ screen, stackLength: stack.length, reset });

  const showToast = (
    message: string,
    type?: "success" | "error" | "info",
  ) => {
    if (type === 'error') {
      toast.error(message);
    } else if (type === 'success') {
      toast.success(message);
    } else {
      toast.info(message);
    }
  };

  const {
    showNotifications, setShowNotifications,
    showWalletSheet, setShowWalletSheet,
    showYouSheet, setShowYouSheet,
    showMyQR, setShowMyQR,
    showScanQR, setShowScanQR,
    showChoosePot, setShowChoosePot,
    showAddPaymentMethod, setShowAddPaymentMethod,
    selectedPaymentMethod, setSelectedPaymentMethod,
    showAddMember, setShowAddMember,
    fabQuickAddPotId, setFabQuickAddPotId,
    showIPFSAuthOnboarding, setShowIPFSAuthOnboarding,
    pendingIPFSAction, setPendingIPFSAction,
  } = useOverlayState();

  // Initialize InviteService
  const inviteService = useMemo(() => new InviteService(getSupabase()), []);

  const [currentExpenseId, setCurrentExpenseId] = useState<
    string | null
  >(null);
  const [selectedCounterpartyId, setSelectedCounterpartyId] =
    useState<string | null>(null);

  const [walletConnected, setWalletConnected] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<
    | { provider: string; address: string; name?: string }
    | undefined
  >();

  const {
    pots,
    setPots,
    settlements,
    setSettlements,
    notifications,
    setNotifications,
    hasLoadedInitialData,
    currentPotId,
    setCurrentPotId,
    currentPot,
    currentPotLoading,
    normalizedCurrentPot,
    usingSupabaseSource,
    notifyPotRefresh,
  } = usePotState({
    authLoading,
    isAuthenticated,
    user,
    isGuest,
    account,
    screen,
    stack,
    showToast,
  });

  // Ensure the public.users profile exists
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;
    if (!user?.id) return;
    const email = userEmail?.trim?.();
    if (!email) return;

    const supabase = getSupabase();
    if (!supabase) return;

    (async () => {
      const { error } = await supabase
        .from("users")
        .upsert({ id: user.id, name: email }, { onConflict: "id" });
      if (error) {
        console.warn("[Users] ensure profile failed", error.message);
      }
    })();
  }, [authLoading, isAuthenticated, user?.id, userEmail]);

  const {
    invitesByPot,
    pendingInviteToken,
    isProcessingInvite,
    pendingInvites,
    showInviteModal,
    joinProcessingRef,
    fetchInvites,
    acceptInvite,
    declineInvite,
    confirmPendingInvite,
    cancelPendingInvite,
  } = useInviteFlow({
    inviteService,
    authLoading,
    isAuthenticated,
    userId: user?.id,
    currentPotId,
    setCurrentPotId,
    reset,
    notifyPotRefresh,
    showToast,
  });

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(() => [
    {
      id: "1",
      kind: "bank",
      iban: "CH93 0000 0000 0000 0000 0", // Placeholder – replace with real IBAN
    },
    {
      id: "2",
      kind: "crypto",
      address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      network: "polkadot",
    },
  ]);

  const [preferredMethodId, setPreferredMethodId] =
    useState<string>("1");


  useEffect(() => {
    setOnboardingCallback((_walletAddress: string, onContinue: () => Promise<void>) => {
      setShowIPFSAuthOnboarding(true);
      setPendingIPFSAction(() => onContinue);
    });
  }, []);

  const [newPot, setNewPot] = useState<Partial<Pot>>({
    name: "",
    type: "expense",
    baseCurrency: "USD",
    members: [
      {
        id: "owner",
        name: "You",
        role: "Owner",
        status: "active",
      },
    ],
    expenses: [],
    budgetEnabled: false,
  });

  const getActiveTab = ():
    | "pots"
    | "people"
    | "activity"
    | "you" => {
    if (screen && screen.type === "activity-home") {
      return "activity";
    }
    if (
      screen && (
        screen.type === "settlements-home" ||
        screen.type === "people-home"
      )
    ) {
      return "people";
    }
    if (
      screen && (
        screen.type === "settle-selection" ||
        screen.type === "settle-home"
      )
    ) {
      return "activity";
    }
    if (screen && screen.type === "you-tab") {
      return "you";
    }
    return "pots";
  };

  const handleTabChange = (
    tab: "pots" | "people" | "activity" | "you",
  ) => {
    // Update URL based on tab
    const routes = {
      pots: '/pots',
      people: '/people',
      activity: '/activity',
      you: '/you',
    };

    const newPath = routes[tab];
    if (window.location.pathname !== newPath) {
      window.history.pushState({}, '', newPath);
    }

    if (tab === "pots") {
      reset({ type: "pots-home" });
    } else if (tab === "people") {
      reset({ type: "people-home" });
    } else if (tab === "activity") {
      reset({ type: "activity-home" });
    } else if (tab === "you") {
      reset({ type: "you-tab" });
    }
  };

  const shouldShowTabBar = () => {
    const tabBarScreens = [
      "activity-home",
      "pots-home",
      "settlements-home",
      "people-home",
      "you-tab",
      "pot-home",
      "expense-detail",
      "settle-selection",
      "settle-home",
    ];
    return screen ? tabBarScreens.includes(screen.type) : false;
  };

  const getFabState = useCallback((): {
    visible: boolean;
    icon: LucideIcon;
    color: string;
    action: () => void;
  } => {
    const activeTab = getActiveTab();

    if (screen && (screen.type === "settle-selection" || screen.type === "settle-home")) {
      return { visible: false, icon: Receipt, color: "var(--accent)", action: () => { } };
    }

    if (screen && screen.type === "pot-home") {
      const potForFab = pots.find(p => p.id === (currentPotId || screen.potId));
      if (potForFab?.type === "savings") {
        return {
          visible: true,
          icon: CheckCircle,
          color: "var(--money)",
          action: () => {
            triggerHaptic("light");
            setCurrentPotId(potForFab.id);
            push({ type: "add-contribution" });
          },
        };
      }
      return {
        visible: true,
        icon: Receipt,
        color: "var(--accent)",
        action: () => {
          triggerHaptic("light");
          if (potForFab) {
            setCurrentPotId(potForFab.id);
            setFabQuickAddPotId(potForFab.id);
            return;
          }
          if (screen.potId) {
            // Fallback: keep quick-add behavior even if pots state is briefly stale.
            setCurrentPotId(screen.potId);
            setFabQuickAddPotId(screen.potId);
            return;
          }
          showToast("Unable to open add expense right now. Please retry.", "error");
        },
      };
    }

    if (activeTab === "people" || activeTab === "you") {
      return {
        visible: false,
        icon: Receipt,
        color: "var(--accent)",
        action: () => { },
      };
    }

    if (activeTab === "activity") {
      return {
        visible: true,
        icon: ArrowLeftRight,
        color: "var(--accent)",
        action: () => {
          triggerHaptic("light");
          setCurrentPotId(null);
          setSelectedCounterpartyId(null);
          push({ type: "settle-selection" });
        },
      };
    }

    if (activeTab === "pots") {
      return {
        visible: true,
        icon: Plus,
        color: "var(--accent)",
        action: () => {
          triggerHaptic("light");
          push({ type: "create-pot" });
        },
      };
    }

    return {
      visible: false,
      icon: Receipt,
      color: "var(--accent)",
      action: () => { },
    };
  }, [
    getActiveTab,
    pots,
    push,
    setCurrentPotId,
    showToast,
  ]);

  const canSwipeBack = () => {
    const rootScreens = [
      "activity-home",
      "pots-home",
      "settlements-home",
      "people-home",
      "you-tab",
    ];
    if (!screen) return false;
    if (stack.length <= 1) return false;
    return !rootScreens.includes(screen.type);
  };

  const {
    people,
    balances,
    pendingExpenses,
    activities,
    totalOwed,
    totalOwing,
    youTabInsights,
    existingContacts,
    currentMemberIds,
  } = useDerivedData({
    pots,
    settlements,
    userId: user?.id,
    currentPot: currentPot as Pot | null | undefined,
  });

  const {
    createPot,
    addExpenseToPot,
    updateExpense,
    deleteExpense,
    attestExpense,
    batchAttestExpenses,
    handleLogout,
    handleDeleteAccount,
    updatePaymentMethodValue,
    setPreferredMethod,
    addContribution,
    withdrawFunds,
  } = useBusinessActions({
    newPot,
    setNewPot,
    potService,
    usingSupabaseSource,
    pots,
    setPots,
    setCurrentPotId,
    replace,
    back,
    showToast,
    expenseService,
    notifyPotRefresh,
    currentPotId,
    currentExpenseId,
    currentPot,
    logout,
    paymentMethods,
    setPaymentMethods,
    setPreferredMethodId,
  });

  const { confirmSettlement } = useSettlementActions({
    pots,
    setPots,
    addExpenseToPot,
    showToast,
    back,
    currentUserId: user?.id || "owner",
    currentUserAddress: user?.id || "unknown",
  });

  const {
    addMemberExisting: handleAddMemberExisting,
    updateMember: handleUpdateMember,
    removeMember: handleRemoveMember,
  } = useMemberActions({
    currentPotId,
    people,
    setPots,
    memberService,
    usingSupabaseSource,
    showToast,
    notifyPotRefresh,
  });

  const { updatePotSettings: handleUpdatePotSettings } = usePotSettings({
    setPots,
    potService,
    usingSupabaseSource,
    showToast,
    notifyPotRefresh,
  });

  const handleWalletConnect = useCallback((provider: string) => {
    setWalletConnected(true);
    setConnectedWallet({
      provider,
      address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      name: "My Polkadot Wallet",
    });
    setShowWalletSheet(false);
    showToast("Wallet connected successfully!", "success");
  }, [showToast]);

  const handleWalletDisconnect = useCallback(() => {
    setWalletConnected(false);
    setConnectedWallet(undefined);
    setShowWalletSheet(false);
    showToast("Wallet disconnected", "info");
  }, [showToast]);

  const handleWalletClose = useCallback(() => {
    setShowWalletSheet(false);
  }, []);

  const handleNotificationsClose = useCallback(() => {
    setShowNotifications(false);
  }, []);

  const handleNotificationsMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
    triggerHaptic("light");
  }, []);

  const handleNotificationClick = useCallback((notification: Notification) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notification.id ? { ...item, read: true } : item,
      ),
    );
    notification.onAction?.();
  }, []);

  const handleYouSheetClose = useCallback(() => {
    setShowYouSheet(false);
  }, []);

  const handleYouShowQR = useCallback(() => {
    setShowYouSheet(false);
    setShowMyQR(true);
  }, []);

  const handleYouScanQR = useCallback(() => {
    setShowYouSheet(false);
    setShowScanQR(true);
  }, []);

  const handleYouPaymentMethods = useCallback(() => {
    setShowYouSheet(false);
    push({ type: "payment-methods" });
  }, [push]);

  const handleYouViewInsights = useCallback(() => {
    setShowYouSheet(false);
    push({ type: "insights" });
  }, [push]);

  const handleYouSettings = useCallback(() => {
    setShowYouSheet(false);
    push({ type: "settings" });
  }, [push]);

  const handleMyQRClose = useCallback(() => {
    setShowMyQR(false);
  }, []);

  const handleCopyHandle = useCallback(() => {
    showToast("Handle copied", "info");
  }, [showToast]);

  const handleScanQRClose = useCallback(() => {
    setShowScanQR(false);
  }, []);

  const handleChoosePotClose = useCallback(() => {
    setShowChoosePot(false);
  }, []);

  const handleChoosePotCreate = useCallback(() => {
    push({ type: "create-pot" });
  }, [push]);

  const handleChoosePotSelect = useCallback((potId: string) => {
    setCurrentPotId(potId);
    setFabQuickAddPotId(potId);
    setShowChoosePot(false);
    push({ type: "pot-home", potId });
  }, [push]);

  const handleAddPaymentMethodClose = useCallback(() => {
    setShowAddPaymentMethod(false);
  }, []);

  const handleAddPaymentMethodSave = useCallback((method: Omit<PaymentMethod, "id">, setAsPreferred: boolean) => {
    const newId = Date.now().toString();
    setPaymentMethods((prev) => [
      ...prev,
      { ...method, id: newId },
    ]);
    if (setAsPreferred) {
      setPreferredMethodId(newId);
    }
    setShowAddPaymentMethod(false);
    showToast("Payment method added", "success");
  }, [showToast]);

  const handleSelectedPaymentMethodClose = useCallback(() => {
    setSelectedPaymentMethod(null);
  }, []);

  const handleAddMemberClose = useCallback(() => {
    setShowAddMember(false);
  }, []);


  const handleInviteNew = useCallback((nameOrEmail: string) => {
    const email = nameOrEmail.trim().toLowerCase();
    if (!currentPotId) {
      showToast("Select a pot first", "error");
      return;
    }
    if (isGuest) {
      showToast("Email invites require login. In guest mode, add members from contacts.", "info");
      return;
    }
    if (!email || !email.includes("@")) {
      showToast("Enter a valid email address", "error");
      return;
    }

    (async () => {
      try {
        const { error, token } = await inviteService.createInvite(currentPotId, email);

        if (error) {
          showToast(error, "error");
          return;
        }

        const link = `${window.location.origin}/join?token=${token}`;
        try {
          await navigator.clipboard?.writeText(link);
          showToast(`Invite sent to ${email}. Link copied.`, "success");
        } catch {
          showToast(`Invite sent to ${email}`, "success");
        }

        fetchInvites(currentPotId);
        setShowAddMember(false);
      } catch (err) {
        console.error("[Invite] unexpected error", err);
        showToast("Failed to send invite", "error");
      }
    })();
  }, [currentPotId, fetchInvites, inviteService, isGuest, showToast]);

  const handleAddMemberShowQR = useCallback(() => {
    setShowAddMember(false);
    setShowMyQR(true);
  }, []);

  const handleIPFSContinue = useCallback(async () => {
    setShowIPFSAuthOnboarding(false);
    if (pendingIPFSAction) {
      try {
        await pendingIPFSAction();
      } catch (error) {
        console.error('[App] Pending IPFS action failed:', error);
        showToast('Upload failed. Please try again.', 'error');
      } finally {
        setPendingIPFSAction(null);
      }
    }
  }, [pendingIPFSAction, showToast]);

  const handleIPFSCancel = useCallback(() => {
    setShowIPFSAuthOnboarding(false);
    setPendingIPFSAction(null);
    resetOnboardingFlag();
  }, []);

  useEffect(() => {
    if (!screen) return;

    const pot = currentPot;
    const screenType = screen.type;

    if (currentPotLoading) return;

    if (
      (screenType === "add-expense" ||
        screenType === "edit-expense" ||
        screenType === "expense-detail" ||
        screenType === "add-contribution" ||
        screenType === "withdraw-funds" ||
        screenType === "pot-home") &&
      !pot
    ) {
      reset({ type: "pots-home" });
      return;
    }

    if (screenType === "edit-expense" && "expenseId" in screen) {
      const expense = pot?.expenses.find((e) => e.id === screen.expenseId);
      if (!expense && pot) {
        replace({ type: "pot-home", potId: currentPotId! });
        return;
      }
    }

    if (screenType === "expense-detail" && "expenseId" in screen) {
      const expense = pot?.expenses.find((e) => e.id === screen.expenseId);
      if (!expense && pot) {
        replace({ type: "pot-home", potId: currentPotId! });
        return;
      }
    }

    if (screenType === "checkpoint-status") {
      if (!pot || !pot.currentCheckpoint) {
        if (currentPotId) {
          replace({ type: "pot-home", potId: currentPotId });
        } else {
          reset({ type: "pots-home" });
        }
        return;
      }
    }

    if (screenType === "member-detail" && "memberId" in screen) {
      const memberId = screen.memberId;
      const personFromPeople = people.find((p) => p.id === memberId);
      const foundInPots = pots.some((p) =>
        p.members.some((m) => m.id === memberId),
      );
      if (!personFromPeople && !foundInPots) {
        reset({ type: "people-home" });
        return;
      }
    }

    if (
      screenType === "settle-cash" ||
      screenType === "settle-bank" ||
      screenType === "settle-dot"
    ) {
      if (currentPotId) {
        replace({ type: "settle-selection" });
      } else {
        reset({ type: "people-home" });
      }
      return;
    }

    const validScreenTypes = [
      "activity-home",
      "pots-home",
      "settlements-home",
      "people-home",
      "you-tab",
      "settings",
      "crust-storage",
      "crust-auth-setup",
      "payment-methods",
      "insights",
      "create-pot",
      "pot-home",
      "add-expense",
      "edit-expense",
      "expense-detail",
      "settle-selection",
      "settle-home",
      "settlement-history",
      "settlement-confirmation",
      "member-detail",
      "add-contribution",
      "withdraw-funds",
      "checkpoint-status",
      "request-payment",
      "receive-qr",
      "import-pot",
    ];
    if (!validScreenTypes.includes(screenType)) {
      reset({ type: "pots-home" });
    }
  }, [screen, pots, people, currentPotId, reset, replace, currentPotLoading]);



  const fabState = getFabState();

  if (authLoading) {
    return (
      <div className="app-shell bg-background flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-3xl flex items-center justify-center"
            style={{
              background: 'var(--accent)',
            }}
          >
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-secondary">
            Loading ChopDot...
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Check console for debug info
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="app-shell bg-background overflow-auto">
        <AuthScreen onAuthSuccess={() => reset({ type: "pots-home" })} />
      </div>
    );
  }

  return (
    <div className="app-shell bg-background overflow-hidden">
      <Suspense
        fallback={(
          <div className="flex h-full items-center justify-center text-sm text-secondary">
            Loading...
          </div>
        )}
      >
        <SwipeableScreen
          onSwipeBack={canSwipeBack() ? back : undefined}
          key={screen?.type ?? 'screen'}
        >
          <AppRouter
            screen={screen || null}
            nav={{ push, replace, back, reset }}
            data={{
              pots, currentPot: currentPot || null, currentPotId, currentPotLoading, hasLoadedInitialData,
              people, balances, totalOwed, totalOwing, pendingExpenses, activities,
              normalizedCurrentPot, youTabInsights, settlements
            }}
            userState={{
              user, authLoading, isAuthenticated, isGuest, notifications,
              walletConnected, connectedWallet
            }}
            uiState={{
              theme, showNotifications, paymentMethods, preferredMethodId,
              invitesByPot, pendingInviteToken, isProcessingInvite, pendingInvites,
              fabQuickAddPotId
            }}
            actions={{
              setPots, setCurrentPotId, setCurrentExpenseId, setWalletConnected,
              setShowNotifications, setShowWalletSheet, setShowMyQR, setShowScanQR,
              setShowChoosePot, setShowAddMember, setShowAddPaymentMethod, setPaymentMethods,
              setPreferredMethodId, setTheme, setFabQuickAddPotId, setNewPot,
              setSelectedCounterpartyId, setSettlements, setNotifications,
              createPot, addExpenseToPot, updateExpense, deleteExpense, attestExpense,
              batchAttestExpenses, addContribution, withdrawFunds, handleLogout,
              handleDeleteAccount, updatePaymentMethodValue, setPreferredMethod,
              handleInviteNew, handleUpdateMember, handleRemoveMember,
              handleUpdatePotSettings,
              acceptInvite, declineInvite, confirmSettlement, showToast,
              newPotState: newPot, joinProcessingRef, selectedCounterpartyId
            }}
            flags={{ DEMO_MODE, POLKADOT_APP_ENABLED }}
          />
        </SwipeableScreen>



        {shouldShowTabBar() && (
          <BottomTabBar
            activeTab={getActiveTab()}
            onTabChange={handleTabChange}
            onFabClick={fabState.action}
            fabVisible={fabState.visible}
            fabIcon={fabState.icon}
            fabColor={fabState.color}
          />
        )}

        <AppOverlays
          inviteModal={
            <AcceptInviteModal
              isOpen={showInviteModal}
              isProcessing={isProcessingInvite}
              onAccept={confirmPendingInvite}
              onDecline={() => {
                if (pendingInviteToken) declineInvite(pendingInviteToken);
                else cancelPendingInvite();
              }}
            />
          }
          showWalletSheet={showWalletSheet}
          walletConnected={walletConnected}
          connectedWallet={connectedWallet}
          onWalletConnect={handleWalletConnect}
          onWalletDisconnect={handleWalletDisconnect}
          onWalletClose={handleWalletClose}
          showNotifications={showNotifications}
          notifications={notifications}
          onNotificationsClose={handleNotificationsClose}
          onNotificationsMarkAllRead={handleNotificationsMarkAllRead}
          onNotificationClick={handleNotificationClick}
          showYouSheet={showYouSheet}
          youSheetInsights={youTabInsights}
          onYouSheetClose={handleYouSheetClose}
          onYouShowQR={handleYouShowQR}
          onYouScanQR={handleYouScanQR}
          onYouPaymentMethods={handleYouPaymentMethods}
          onYouViewInsights={handleYouViewInsights}
          onYouSettings={handleYouSettings}
          showMyQR={showMyQR}
          onMyQRClose={handleMyQRClose}
          onCopyHandle={handleCopyHandle}
          showScanQR={showScanQR}
          onScanQRClose={handleScanQRClose}
          showChoosePot={showChoosePot}
          pots={pots}
          onChoosePotClose={handleChoosePotClose}
          onChoosePotCreate={handleChoosePotCreate}
          onChoosePotSelect={handleChoosePotSelect}
          showAddPaymentMethod={showAddPaymentMethod}
          onAddPaymentMethodClose={handleAddPaymentMethodClose}
          onAddPaymentMethodSave={handleAddPaymentMethodSave}
          selectedPaymentMethod={selectedPaymentMethod}
          onSelectedPaymentMethodClose={handleSelectedPaymentMethodClose}
          showAddMember={showAddMember && !!currentPotId}
          existingContacts={existingContacts}
          currentMembers={currentMemberIds}
          onAddMemberClose={handleAddMemberClose}
          onAddMemberExisting={handleAddMemberExisting}
          onInviteNew={handleInviteNew}
          onAddMemberShowQR={handleAddMemberShowQR}
          canInviteByEmail={!isGuest}
          showIPFSAuthOnboarding={showIPFSAuthOnboarding}
          walletAddress={account.address0}
          onIPFSContinue={handleIPFSContinue}
          onIPFSCancel={handleIPFSCancel}
        />
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <FeatureFlagsProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </FeatureFlagsProvider>
  );
}

import "./utils/debugHelpers";
