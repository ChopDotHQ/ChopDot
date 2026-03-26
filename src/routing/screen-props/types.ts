import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { Screen } from '../../nav';
import type {
  Pot,
  ActivityItem,
  Person,
  Settlement as StoredSettlement,
  CloseoutRecord,
} from '../../types/app';
import type { CalculatedSettlements } from '../../utils/settlements';
import type { PaymentMethod } from '../../components/screens/PaymentMethods';
import type { Notification } from '../../components/screens/NotificationCenter';
import type { SettleHomeSettlement } from '../../hooks/useSettlementActions';

export interface AppRouterProps {
  screen: Screen | null;
  nav: {
    push: (screen: Screen) => void;
    replace: (screen: Screen) => void;
    back: () => void;
    reset: (screen: Screen) => void;
  };
  data: {
    pots: Pot[];
    currentPot: Pot | null;
    currentPotId: string | null;
    currentPotLoading: boolean;
    hasLoadedInitialData: boolean;
    people: Person[];
    balances: CalculatedSettlements;
    totalOwed: number;
    totalOwing: number;
    pendingExpenses: Array<{
      id: string;
      memo: string;
      amount: number;
      currency?: string;
      paidBy: string;
      potName: string;
    }>;
    activities: ActivityItem[];
    normalizedCurrentPot?: Pot;
    youTabInsights: {
      monthlySpending: number;
      expensesNeedingConfirmation: number;
      expensesConfirmed: number;
      topCategory: string;
      topCategoryAmount: number;
      activePots: number;
      totalSettled: number;
      confirmationRate: number;
      settlementsCompleted: number;
      activeGroups: number;
    };
    settlements: StoredSettlement[];
  };
  userState: {
    user: any;
    authLoading: boolean;
    isAuthenticated: boolean;
    isGuest: boolean;
    notifications: Notification[];
    walletConnected: boolean;
    connectedWallet: any;
  };
  uiState: {
    theme: 'light' | 'dark' | 'system';
    showNotifications: boolean;
    paymentMethods: PaymentMethod[];
    preferredMethodId: string;
    invitesByPot: Record<string, any[]>;
    pendingInviteToken: string | null;
    isProcessingInvite: boolean;
    pendingInvites: any[];
    fabQuickAddPotId: string | null;
  };
  actions: {
    setPots: Dispatch<SetStateAction<Pot[]>>;
    setCurrentPotId: (id: string | null) => void;
    setCurrentExpenseId: (id: string | null) => void;
    setWalletConnected: (connected: boolean) => void;
    setShowNotifications: (show: boolean) => void;
    setShowWalletSheet: (show: boolean) => void;
    setShowMyQR: (show: boolean) => void;
    setShowScanQR: (show: boolean) => void;
    setShowChoosePot: (show: boolean) => void;
    setShowAddMember: (show: boolean) => void;
    setShowAddPaymentMethod: (show: boolean) => void;
    setPaymentMethods: (fn: (prev: PaymentMethod[]) => PaymentMethod[]) => void;
    setPreferredMethodId: (id: string) => void;
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    setFabQuickAddPotId: (id: string | null) => void;
    setNewPot: (pot: Partial<Pot>) => void;
    setSelectedCounterpartyId: (id: string | null) => void;
    setSettlements: Dispatch<SetStateAction<StoredSettlement[]>>;
    setNotifications: (updater: (prev: Notification[]) => Notification[]) => void;
    createPot: () => Promise<void>;
    addExpenseToPot: (
      potId: string,
      data: any,
      options?: {
        navigateToPotHome?: boolean;
        showSuccessToast?: boolean;
      },
    ) => void;
    updateExpense: (data: any) => void;
    deleteExpense: (expenseId?: string, options?: { navigateBack?: boolean }) => void;
    addContribution: (amount: number, method: 'wallet' | 'bank') => void;
    withdrawFunds: (amount: number) => void;
    handleLogout: () => void;
    handleDeleteAccount: () => void;
    updatePaymentMethodValue: (id: string, updates: Partial<PaymentMethod>) => void;
    setPreferredMethod: (id: string) => void;
    handleInviteNew: (email: string) => void;
    copyInviteLink: (potId: string) => Promise<void>;
    resendInviteForPot: (potId: string, inviteId: string) => Promise<void>;
    revokeInviteForPot: (potId: string, inviteId: string) => Promise<void>;
    handleUpdateMember: (
      potId: string,
      member: { id: string; name: string; address?: string; evmAddress?: string; verified?: boolean },
    ) => void;
    handleRemoveMember: (potId: string, memberId: string) => void;
    handleUpdatePotSettings: (potId: string, settings: any) => void;
    handleDeletePot: (potId: string) => Promise<void>;
    handleArchivePot: (potId: string) => Promise<void>;
    handleLeavePot: (potId: string) => Promise<void>;
    persistPotPartial: (potId: string, updates: Partial<Pot> & { closeouts?: CloseoutRecord[] }) => Promise<void>;
    acceptInvite: (token: string) => void;
    declineInvite: (token: string) => void;
    confirmSettlement: (params: {
      method: 'cash' | 'bank' | 'paypal' | 'twint' | 'dot' | 'usdc';
      reference?: string;
      settlement: SettleHomeSettlement;
      closeoutContext?: {
        closeoutId: string;
        legIndex: number;
      };
    }) => Promise<import('../../nav').SettlementResult | null>;
    retrySettlementProof: (settlementId: string) => Promise<boolean>;
    showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
    newPotState: Partial<Pot>;
    joinProcessingRef: MutableRefObject<boolean>;
    selectedCounterpartyId: string | null;
  };
  flags: {
    DEMO_MODE: boolean;
    POLKADOT_APP_ENABLED: boolean;
  };
}
