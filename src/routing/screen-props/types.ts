import type { Screen } from '../../nav';
import type {
  Pot,
  ActivityItem,
  Person,
  Settlement as StoredSettlement,
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
    setPots: (pots: Pot[]) => void;
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
    setSettlements: (settlements: StoredSettlement[]) => void;
    setNotifications: (updater: (prev: Notification[]) => Notification[]) => void;
    createPot: () => Promise<void>;
    addExpenseToPot: (potId: string, data: any) => void;
    updateExpense: (data: any) => void;
    deleteExpense: (expenseId?: string, options?: { navigateBack?: boolean }) => void;
    attestExpense: (expenseId: string) => void;
    batchAttestExpenses: (expenseIds: string[]) => void;
    addContribution: (amount: number, method: 'wallet' | 'bank') => void;
    withdrawFunds: (amount: number) => void;
    handleLogout: () => void;
    handleDeleteAccount: () => void;
    updatePaymentMethodValue: (id: string, updates: Partial<PaymentMethod>) => void;
    setPreferredMethod: (id: string) => void;
    handleInviteNew: (email: string) => void;
    handleUpdateMember: (
      potId: string,
      member: { id: string; name: string; address?: string; verified?: boolean },
    ) => void;
    handleRemoveMember: (potId: string, memberId: string) => void;
    handleUpdatePotSettings: (potId: string, settings: any) => void;
    acceptInvite: (token: string) => void;
    declineInvite: (token: string) => void;
    confirmSettlement: (params: {
      method: 'cash' | 'bank' | 'paypal' | 'twint' | 'dot';
      reference?: string;
      settlement: SettleHomeSettlement;
    }) => Promise<void>;
    showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
    newPotState: Partial<Pot>;
    joinProcessingRef: React.MutableRefObject<boolean>;
    selectedCounterpartyId: string | null;
  };
  flags: {
    DEMO_MODE: boolean;
    POLKADOT_APP_ENABLED: boolean;
  };
}
