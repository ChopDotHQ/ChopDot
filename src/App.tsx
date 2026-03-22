import { Suspense, useState, useMemo, useEffect } from 'react';
import { AppRouter } from './components/AppRouter';
import { useNav } from './nav';
import { useTheme } from './utils/useTheme';
import { InviteService } from './services/InviteService';
import { AcceptInviteModal } from './components/modals/AcceptInviteModal';
import { getSupabase } from './utils/supabase-client';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FeatureFlagsProvider, useFeatureFlags } from './contexts/FeatureFlagsContext';
import { useAccount } from './contexts/AccountContext';
import { AuthScreen } from './components/screens/AuthScreen';
import { toast } from 'sonner';
import { useData } from './services/data/DataContext';
import { AppLayout } from './components/app/AppLayout';
import { useTabNavigation } from './hooks/useTabNavigation';
import { useFabState } from './hooks/useFabState';
import { useScreenValidation } from './hooks/useScreenValidation';
import { setOnboardingCallback } from './services/storage/ipfsWithOnboarding';
import { getInitialScreenFromLocation, useUrlSync } from './hooks/useUrlSync';
import { useInviteFlow } from './hooks/useInviteFlow';
import { useDerivedData } from './hooks/useDerivedData';
import { usePotState } from './hooks/usePotState';
import { useOverlayState } from './hooks/useOverlayState';
import { useOverlayHandlers } from './hooks/useOverlayHandlers';
import { buildOverlayProps } from './hooks/useOverlayProps';
import { useEnsureUserProfile } from './hooks/useEnsureUserProfile';
import { useAppActions } from './hooks/useAppActions';
import type { PaymentMethod } from './components/screens/PaymentMethods';
import type { Pot } from './types/app';

const INITIAL_PAYMENT_METHODS: PaymentMethod[] = [
  { id: '1', kind: 'bank', iban: 'CH93 0000 0000 0000 0000 0' },
  { id: '2', kind: 'crypto', address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', network: 'polkadot' },
];

const INITIAL_NEW_POT: Partial<Pot> = {
  name: '', type: 'expense', baseCurrency: 'USD',
  members: [{ id: 'owner', name: 'You', role: 'Owner', status: 'active' }],
  expenses: [], budgetEnabled: false,
};

const showToast = (message: string, type?: 'success' | 'error' | 'info') => {
  if (type === 'error') toast.error(message);
  else if (type === 'success') toast.success(message);
  else toast.info(message);
};

function AppContent() {
  const { DEMO_MODE, POLKADOT_APP_ENABLED } = useFeatureFlags();
  const { pots: potService, expenses: expenseService, members: memberService } = useData();
  const { theme, setTheme } = useTheme();
  const account = useAccount();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const isGuest = user?.isGuest === true || user?.authMethod === 'guest' || user?.authMethod === 'anonymous';
  const userEmail = (user as Record<string, unknown> | null)?.email as string | undefined;

  const { current: screen, stack, push, back, reset, replace } = useNav(getInitialScreenFromLocation());
  useUrlSync({ screen, stackLength: stack.length, reset });

  const overlay = useOverlayState();
  const inviteService = useMemo(() => new InviteService(getSupabase()), []);
  const [currentExpenseId, setCurrentExpenseId] = useState<string | null>(null);
  const [selectedCounterpartyId, setSelectedCounterpartyId] = useState<string | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<{ provider: string; address: string; name?: string }>();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(() => INITIAL_PAYMENT_METHODS);
  const [preferredMethodId, setPreferredMethodId] = useState<string>('1');
  const [newPot, setNewPot] = useState<Partial<Pot>>(() => ({ ...INITIAL_NEW_POT }));

  const potState = usePotState({ authLoading, isAuthenticated, user, isGuest, account, screen, stack, showToast });
  useEnsureUserProfile(authLoading, isAuthenticated, user?.id, userEmail);

  const inviteFlow = useInviteFlow({
    inviteService, authLoading, isAuthenticated, userId: user?.id,
    currentPotId: potState.currentPotId, setCurrentPotId: potState.setCurrentPotId,
    reset, notifyPotRefresh: potState.notifyPotRefresh, showToast,
  });

  useEffect(() => {
    setOnboardingCallback((_walletAddress: string, onContinue: () => Promise<void>) => {
      overlay.setShowIPFSAuthOnboarding(true);
      overlay.setPendingIPFSAction(() => onContinue);
    });
  }, []);

  const { getActiveTab, handleTabChange, shouldShowTabBar, canSwipeBack } = useTabNavigation({
    screen: screen as any, stack: stack as any[], reset: reset as any,
  });

  const fabState = useFabState({
    screen: screen as any, getActiveTab, pots: potState.pots, currentPotId: potState.currentPotId,
    push: push as any, setCurrentPotId: potState.setCurrentPotId,
    setFabQuickAddPotId: overlay.setFabQuickAddPotId, setSelectedCounterpartyId, showToast: showToast as any,
  });

  const derived = useDerivedData({
    pots: potState.pots, settlements: potState.settlements,
    userId: user?.id, currentPot: potState.currentPot as Pot | null | undefined,
  });

  const actions = useAppActions({
    newPot, setNewPot, potService, expenseService, memberService,
    usingSupabaseSource: potState.usingSupabaseSource,
    pots: potState.pots, setPots: potState.setPots,
    setSettlements: potState.setSettlements,
    currentPotId: potState.currentPotId, setCurrentPotId: potState.setCurrentPotId,
    currentExpenseId, currentPot: potState.currentPot,
    replace, back, showToast, notifyPotRefresh: potState.notifyPotRefresh,
    logout, paymentMethods, setPaymentMethods, setPreferredMethodId,
    people: derived.people, userId: user?.id, currentUserAddress: account.address0,
    copyInviteLink: inviteFlow.copyInviteLink,
    resendInviteForPot: inviteFlow.resendInviteLink,
    revokeInviteForPot: inviteFlow.revokeInvite,
  });

  const overlayHandlers = useOverlayHandlers({
    setWalletConnected, setConnectedWallet, setShowWalletSheet: overlay.setShowWalletSheet,
    setShowNotifications: overlay.setShowNotifications, setNotifications: potState.setNotifications,
    setShowYouSheet: overlay.setShowYouSheet, setShowMyQR: overlay.setShowMyQR,
    setShowScanQR: overlay.setShowScanQR, setShowChoosePot: overlay.setShowChoosePot,
    setShowAddPaymentMethod: overlay.setShowAddPaymentMethod, setSelectedPaymentMethod: overlay.setSelectedPaymentMethod,
    setPaymentMethods, setPreferredMethodId,
    setShowAddMember: overlay.setShowAddMember, setCurrentPotId: potState.setCurrentPotId,
    setFabQuickAddPotId: overlay.setFabQuickAddPotId,
    setShowIPFSAuthOnboarding: overlay.setShowIPFSAuthOnboarding, setPendingIPFSAction: overlay.setPendingIPFSAction,
    pendingIPFSAction: overlay.pendingIPFSAction,
    push, showToast, inviteService, fetchInvites: inviteFlow.fetchInvites,
    currentPotId: potState.currentPotId, isGuest,
  });

  useScreenValidation({
    screen: screen as any, pots: potState.pots as any[], people: derived.people as any[],
    currentPotId: potState.currentPotId, currentPot: potState.currentPot as any,
    currentPotLoading: potState.currentPotLoading, reset: reset as any, replace: replace as any,
  });

  if (authLoading) {
    return (
      <div className="app-shell bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-3xl flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-secondary">Loading ChopDot...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="app-shell bg-background overflow-auto">
        <AuthScreen onAuthSuccess={() => reset({ type: 'pots-home' })} />
      </div>
    );
  }

  return (
    <div className="app-shell bg-background overflow-hidden">
      <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-secondary">Loading...</div>}>
        <AppLayout
          onSwipeBack={canSwipeBack() ? back : undefined}
          screenKey={screen?.type ?? 'screen'}
          showTabBar={shouldShowTabBar()}
          tabBar={{ activeTab: getActiveTab(), onTabChange: handleTabChange, fabAction: fabState.action, fabVisible: fabState.visible, fabIcon: fabState.icon, fabColor: fabState.color }}
          overlayProps={buildOverlayProps({
            inviteModal: (
              <AcceptInviteModal isOpen={inviteFlow.showInviteModal} isProcessing={inviteFlow.isProcessingInvite}
                onAccept={inviteFlow.confirmPendingInvite}
                onDecline={() => { inviteFlow.pendingInviteToken ? inviteFlow.declineInvite(inviteFlow.pendingInviteToken) : inviteFlow.cancelPendingInvite(); }} />
            ),
            overlayState: {
              showWalletSheet: overlay.showWalletSheet, showNotifications: overlay.showNotifications,
              showYouSheet: overlay.showYouSheet, showMyQR: overlay.showMyQR, showScanQR: overlay.showScanQR,
              showChoosePot: overlay.showChoosePot, showAddPaymentMethod: overlay.showAddPaymentMethod,
              selectedPaymentMethod: overlay.selectedPaymentMethod, showAddMember: overlay.showAddMember,
              showIPFSAuthOnboarding: overlay.showIPFSAuthOnboarding,
            },
            overlayHandlers, walletConnected, connectedWallet,
            notifications: potState.notifications, youTabInsights: derived.youTabInsights,
            pots: potState.pots, currentPotId: potState.currentPotId,
            existingContacts: derived.existingContacts, currentMemberIds: derived.currentMemberIds,
            handleAddMemberExisting: actions.handleAddMemberExisting, isGuest, walletAddress: account.address0,
          })}
        >
          <AppRouter
            screen={screen || null}
            nav={{ push, replace, back, reset }}
            data={{
              pots: potState.pots, currentPot: potState.currentPot || null, currentPotId: potState.currentPotId,
              currentPotLoading: potState.currentPotLoading, hasLoadedInitialData: potState.hasLoadedInitialData,
              people: derived.people, balances: derived.balances, totalOwed: derived.totalOwed, totalOwing: derived.totalOwing,
              pendingExpenses: derived.pendingExpenses, activities: derived.activities,
              normalizedCurrentPot: potState.normalizedCurrentPot, youTabInsights: derived.youTabInsights, settlements: potState.settlements,
            }}
            userState={{ user, authLoading, isAuthenticated, isGuest, notifications: potState.notifications, walletConnected, connectedWallet }}
            uiState={{
              theme, showNotifications: overlay.showNotifications, paymentMethods, preferredMethodId,
              invitesByPot: inviteFlow.invitesByPot, pendingInviteToken: inviteFlow.pendingInviteToken,
              isProcessingInvite: inviteFlow.isProcessingInvite, pendingInvites: inviteFlow.pendingInvites,
              fabQuickAddPotId: overlay.fabQuickAddPotId,
            }}
            actions={{
              setPots: potState.setPots, setCurrentPotId: potState.setCurrentPotId, setCurrentExpenseId, setWalletConnected,
              setShowNotifications: overlay.setShowNotifications, setShowWalletSheet: overlay.setShowWalletSheet,
              setShowMyQR: overlay.setShowMyQR, setShowScanQR: overlay.setShowScanQR,
              setShowChoosePot: overlay.setShowChoosePot, setShowAddMember: overlay.setShowAddMember,
              setShowAddPaymentMethod: overlay.setShowAddPaymentMethod, setPaymentMethods,
              setPreferredMethodId, setTheme, setFabQuickAddPotId: overlay.setFabQuickAddPotId, setNewPot,
              setSelectedCounterpartyId, setSettlements: potState.setSettlements, setNotifications: potState.setNotifications,
              createPot: actions.createPot, addExpenseToPot: actions.addExpenseToPot, updateExpense: actions.updateExpense,
              deleteExpense: actions.deleteExpense,
              addContribution: actions.addContribution, withdrawFunds: actions.withdrawFunds,
              handleLogout: actions.handleLogout, handleDeleteAccount: actions.handleDeleteAccount,
              updatePaymentMethodValue: actions.updatePaymentMethodValue, setPreferredMethod: actions.setPreferredMethod,
              handleInviteNew: overlayHandlers.handleInviteNew,
              copyInviteLink: inviteFlow.copyInviteLink,
              resendInviteForPot: inviteFlow.resendInviteLink,
              revokeInviteForPot: inviteFlow.revokeInvite,
              handleUpdateMember: actions.handleUpdateMember, handleRemoveMember: actions.handleRemoveMember,
              handleUpdatePotSettings: actions.handleUpdatePotSettings,
              handleDeletePot: actions.handleDeletePot, handleArchivePot: actions.handleArchivePot, handleLeavePot: actions.handleLeavePot,
              persistPotPartial: actions.persistPotPartial,
              acceptInvite: inviteFlow.acceptInvite, declineInvite: inviteFlow.declineInvite,
              confirmSettlement: actions.confirmSettlement, showToast,
              newPotState: newPot, joinProcessingRef: inviteFlow.joinProcessingRef, selectedCounterpartyId,
            }}
            flags={{ DEMO_MODE, POLKADOT_APP_ENABLED }}
          />
        </AppLayout>
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

import './utils/debugHelpers';
