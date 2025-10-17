/**
 * CHOPDOT - Main Application Entry Point
 *
 * A mobile expense splitting and group financial management app
 * built for iPhone 15 (390×844) with Polkadot blockchain integration.
 *
 * Core Features:
 * - Multi-pot expense tracking (expense pots & savings pots)
 * - Smart settlement calculations (pot-scoped & global)
 * - Reliability tracking (confirmation rates, settlement history, trust metrics)
 * - Unified header pattern across all navigation tabs
 * - Theme support (light/dark mode with system preference)
 */

import {
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import { useNav } from "./nav";
import { useTheme } from "./utils/useTheme";
import { triggerHaptic } from "./utils/haptics";
import type { PersonSettlement, SettlementBreakdown } from "./utils/settlements";
import {
  calculateSettlements,
  calculatePotSettlements,
} from "./utils/settlements";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { FeatureFlagsProvider } from "./contexts/FeatureFlagsContext";
import { LoginScreen } from "./components/screens/LoginScreen";
import { ActivityHome } from "./components/screens/ActivityHome";
import { PotsHome } from "./components/screens/PotsHome";
import { PeopleHome } from "./components/screens/PeopleHome";
import { Settings } from "./components/screens/Settings";
import { PaymentMethods } from "./components/screens/PaymentMethods";
import { CreatePot } from "./components/screens/CreatePot";
import { PotHome } from "./components/screens/PotHome";
import { AddExpense } from "./components/screens/AddExpense";
import { ExpenseDetail } from "./components/screens/ExpenseDetail";
import { SettleSelection } from "./components/screens/SettleSelection";
import { SettleHome } from "./components/screens/SettleHome";
import { SettlementHistory } from "./components/screens/SettlementHistory";
import { SettlementConfirmation } from "./components/screens/SettlementConfirmation";
import { InsightsScreen } from "./components/screens/InsightsScreen";
import { BottomTabBar } from "./components/BottomTabBar";
import { SwipeableScreen } from "./components/SwipeableScreen";
import { Toast } from "./components/Toast";
import { ChoosePot } from "./components/screens/ChoosePot";
import { MyQR } from "./components/screens/MyQR";
import { ScanQR } from "./components/screens/ScanQR";
import { AddPaymentMethod } from "./components/screens/AddPaymentMethod";
import { AddMember } from "./components/screens/AddMember";
import { ViewPaymentMethod } from "./components/screens/ViewPaymentMethod";
import { NotificationCenter } from "./components/screens/NotificationCenter";
import { MemberDetail } from "./components/screens/MemberDetail";
import { AddContribution } from "./components/screens/AddContribution";
import { WithdrawFunds } from "./components/screens/WithdrawFunds";
import { YouSheet } from "./components/YouSheet";
import { YouTab } from "./components/screens/YouTab";
import { TxToast } from "./components/TxToast";
import { CheckpointStatusScreen } from "./components/screens/CheckpointStatusScreen";
import { RequestPayment } from "./components/screens/RequestPayment";
import { WalletConnectionSheet } from "./components/WalletConnectionSheet";
import { BatchConfirmSheet } from "./components/BatchConfirmSheet";
import { Receipt, CheckCircle, ArrowLeftRight, Plus, LucideIcon } from "lucide-react";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Member {
  id: string;
  name: string;
  role: "Owner" | "Member";
  status: "active" | "pending";
}

interface Expense {
  id: string;
  amount: number;
  currency: string;
  paidBy: string;
  memo: string;
  date: string;
  split: { memberId: string; amount: number }[];
  attestations: string[];
  hasReceipt: boolean;
  attestationTxHash?: string;
  attestationTimestamp?: string;
}

interface Contribution {
  id: string;
  memberId: string;
  amount: number;
  date: string;
  txHash?: string;
}

interface ExpenseCheckpoint {
  id: string;
  createdBy: string;
  createdAt: string;
  status: "pending" | "confirmed" | "bypassed";
  confirmations: Map<
    string,
    { confirmed: boolean; confirmedAt?: string }
  >;
  expiresAt: string; // Auto-confirm after 48h
  bypassedBy?: string;
  bypassedAt?: string;
}

interface Pot {
  id: string;
  name: string;
  type: "expense" | "savings";
  baseCurrency: string;
  members: Member[];
  expenses: Expense[];
  budget?: number;
  budgetEnabled?: boolean;
  contributions?: Contribution[];
  totalPooled?: number;
  yieldRate?: number;
  defiProtocol?: string;
  goalAmount?: number;
  goalDescription?: string;
  checkpointEnabled?: boolean; // Default: true
  currentCheckpoint?: ExpenseCheckpoint;
  archived?: boolean;
}

interface Settlement {
  id: string;
  personId: string;
  amount: number;
  currency: string;
  method: "cash" | "bank" | "paypal" | "twint" | "dot";
  potIds?: string[];
  date: string;
  txHash?: string;
}

interface PaymentMethod {
  id: string;
  kind: "bank" | "twint" | "paypal" | "crypto";
  // Bank
  iban?: string;
  holder?: string;
  note?: string;
  // TWINT
  phone?: string;
  twintHandle?: string;
  // PayPal
  email?: string;
  username?: string;
  // Crypto
  network?: "polkadot" | "assethub";
  address?: string;
  label?: string;
}

interface ActivityItem {
  id: string;
  type: "expense" | "settlement" | "attestation" | "member";
  timestamp: string;
  title: string;
  subtitle: string;
  amount?: number;
}

interface Person {
  id: string;
  name: string;
  balance: number;
  trustScore: number;
  paymentPreference: string;
  potCount: number;
}

interface Notification {
  id: string;
  type: "attestation" | "settlement" | "invite";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

function AppContent() {
  // Theme management
  const { theme, setTheme } = useTheme();

  // Authentication
  const {
    user,
    isLoading: authLoading,
    isAuthenticated,
    logout,
  } = useAuth();

  // ========================================
  // NAVIGATION & ROUTING
  // ========================================
  // 5-tab navigation system: Pots | People | Activity | You
  const {
    current: screen,
    stack,
    push,
    back,
    reset,
    replace,
  } = useNav({ type: "pots-home" });

  // ========================================
  // UI STATE & MODALS
  // ========================================
  // Toast notifications
  const [toast, setToast] = useState<{
    message: string;
    type?: "success" | "error" | "info";
  } | null>(null);
  const showToast = (
    message: string,
    type?: "success" | "error" | "info",
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  /**
   * MODAL STATE MANAGEMENT
   *
   * Pattern: Boolean flags for each modal/sheet
   *
   * Why not consolidated?
   * - Simple, straightforward
   * - No abstraction overhead
   * - Easy to trace which modal is open
   *
   * Note: Could be refactored to useReducer if modals grow beyond 15+
   */
  const [showNotifications, setShowNotifications] =
    useState(false);
  const [showWalletSheet, setShowWalletSheet] = useState(false);
  const [showYouSheet, setShowYouSheet] = useState(false);
  const [showMyQR, setShowMyQR] = useState(false);
  const [showScanQR, setShowScanQR] = useState(false);
  const [showChoosePot, setShowChoosePot] = useState(false);
  const [showAddPaymentMethod, setShowAddPaymentMethod] =
    useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showBatchConfirm, setShowBatchConfirm] =
    useState(false);

  // ========================================
  // DATA STATE
  // ========================================
  /**
   * NAVIGATION CONTEXT IDs
   *
   * These track the current context for operations (like "which pot are we in?")
   *
   * - currentPotId: Which pot we're viewing/editing
   *   - Set when: Navigating to pot-home, add-expense, settle-selection (pot-scoped)
   *   - Cleared when: Returning to root tabs
   *
   * - currentExpenseId: Which expense we're viewing/editing
   *   - Set when: Navigating to expense-detail, edit-expense
   *   - Cleared when: Deleting expense or navigating away
   *
   * - selectedCounterpartyId: Which person we're settling with
   *   - Set when: Clicking "Settle" on a person from people list
   *   - Cleared when: Completing settlement
   *
   * Note: These enable "implicit context" - screens don't need to pass IDs through props
   */
  const [currentPotId, setCurrentPotId] = useState<
    string | null
  >(null);
  const [currentExpenseId, setCurrentExpenseId] = useState<
    string | null
  >(null);
  const [selectedCounterpartyId, setSelectedCounterpartyId] =
    useState<string | null>(null);

  // Wallet state
  const [walletConnected, setWalletConnected] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<
    | { provider: string; address: string; name?: string }
    | undefined
  >();

  // Settlements history - lazy initialization
  const [settlements, setSettlements] = useState<Settlement[]>(
    () => [
      {
        id: "s1",
        personId: "alice",
        amount: 45.5,
        currency: "USD",
        method: "bank",
        potIds: ["1"],
        date: new Date(
          Date.now() - 2 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
      {
        id: "s2",
        personId: "bob",
        amount: 28.34,
        currency: "USD",
        method: "twint",
        potIds: ["1"],
        date: new Date(
          Date.now() - 5 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
      {
        id: "s3",
        personId: "charlie",
        amount: 150.0,
        currency: "USD",
        method: "dot",
        potIds: ["2"],
        date: new Date(
          Date.now() - 10 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        txHash:
          "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      },
      {
        id: "s4",
        personId: "alice",
        amount: 32.0,
        currency: "USD",
        method: "cash",
        potIds: ["1"],
        date: new Date(
          Date.now() - 15 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
    ],
  );

  // Pots (expense & savings groups) - lazy initialization
  const [pots, setPots] = useState<Pot[]>(() => [
    {
      id: "1",
      name: "🏠 SF Roommates",
      type: "expense",
      baseCurrency: "USD",
      members: [
        {
          id: "owner",
          name: "You",
          role: "Owner",
          status: "active",
        },
        {
          id: "alice",
          name: "Alice",
          role: "Member",
          status: "active",
        },
        {
          id: "bob",
          name: "Bob",
          role: "Member",
          status: "active",
        },
      ],
      expenses: [
        {
          id: "e1",
          amount: 120.5,
          currency: "USD",
          paidBy: "owner",
          memo: "Groceries at Whole Foods",
          date: new Date(
            Date.now() - 2 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          split: [
            { memberId: "owner", amount: 40.17 },
            { memberId: "alice", amount: 40.17 },
            { memberId: "bob", amount: 40.16 },
          ],
          attestations: ["alice", "bob"],
          hasReceipt: true,
        },
        {
          id: "e2",
          amount: 85.0,
          currency: "USD",
          paidBy: "alice",
          memo: "Electricity bill",
          date: new Date(
            Date.now() - 5 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          split: [
            { memberId: "owner", amount: 28.33 },
            { memberId: "alice", amount: 28.33 },
            { memberId: "bob", amount: 28.34 },
          ],
          attestations: [],
          hasReceipt: false,
        },
        {
          id: "e4",
          amount: 45.0,
          currency: "USD",
          paidBy: "alice",
          memo: "Internet bill",
          date: new Date(
            Date.now() - 8 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          split: [
            { memberId: "owner", amount: 15.0 },
            { memberId: "alice", amount: 15.0 },
            { memberId: "bob", amount: 15.0 },
          ],
          attestations: [],
          hasReceipt: false,
        },
        {
          id: "e5",
          amount: 60.0,
          currency: "USD",
          paidBy: "bob",
          memo: "Cleaning supplies",
          date: new Date(
            Date.now() - 12 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          split: [
            { memberId: "owner", amount: 20.0 },
            { memberId: "alice", amount: 20.0 },
            { memberId: "bob", amount: 20.0 },
          ],
          attestations: [],
          hasReceipt: false,
        },
        {
          id: "e6",
          amount: 90.0,
          currency: "USD",
          paidBy: "alice",
          memo: "Water & trash",
          date: new Date(
            Date.now() - 15 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          split: [
            { memberId: "owner", amount: 30.0 },
            { memberId: "alice", amount: 30.0 },
            { memberId: "bob", amount: 30.0 },
          ],
          attestations: [],
          hasReceipt: false,
        },
        {
          id: "e7",
          amount: 75.0,
          currency: "USD",
          paidBy: "bob",
          memo: "Gas bill",
          date: new Date(
            Date.now() - 18 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          split: [
            { memberId: "owner", amount: 25.0 },
            { memberId: "alice", amount: 25.0 },
            { memberId: "bob", amount: 25.0 },
          ],
          attestations: [],
          hasReceipt: false,
        },
      ],
      budget: 500,
      budgetEnabled: true,
      checkpointEnabled: true,
    },
    {
      id: "2",
      name: "🌴 Bali Trip 2025",
      type: "expense",
      baseCurrency: "USD",
      members: [
        {
          id: "owner",
          name: "You",
          role: "Owner",
          status: "active",
        },
        {
          id: "charlie",
          name: "Charlie",
          role: "Member",
          status: "active",
        },
        {
          id: "diana",
          name: "Diana",
          role: "Member",
          status: "pending",
        },
      ],
      expenses: [
        {
          id: "e3",
          amount: 450.0,
          currency: "USD",
          paidBy: "owner",
          memo: "Flight tickets",
          date: new Date(
            Date.now() - 1 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          split: [
            { memberId: "owner", amount: 150.0 },
            { memberId: "charlie", amount: 150.0 },
            { memberId: "diana", amount: 150.0 },
          ],
          attestations: ["charlie"],
          hasReceipt: true,
        },
      ],
      budget: 3000,
      budgetEnabled: true,
      checkpointEnabled: true,
    },
    {
      id: "3",
      name: "💰 Emergency Fund",
      type: "savings",
      baseCurrency: "DOT",
      members: [
        {
          id: "owner",
          name: "You",
          role: "Owner",
          status: "active",
        },
      ],
      expenses: [],
      contributions: [
        {
          id: "c1",
          memberId: "owner",
          amount: 500,
          date: new Date(
            Date.now() - 10 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          txHash: "0x1234567890abcdef",
        },
        {
          id: "c2",
          memberId: "owner",
          amount: 250,
          date: new Date(
            Date.now() - 3 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          txHash: "0xabcdef1234567890",
        },
      ],
      totalPooled: 750,
      yieldRate: 12.5,
      defiProtocol: "Acala",
      goalAmount: 5000,
      goalDescription: "Build a 6-month emergency fund",
    },
  ]);

  // Payment methods - lazy initialization
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(() => [
    {
      id: "1",
      kind: "bank",
      iban: "CH93 0076 2011 6238 5295 7",
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

  // Notifications - lazy initialization
  const [notifications, setNotifications] = useState<
    Notification[]
  >(() => [
    {
      id: "1",
      type: "attestation",
      title: "Expense needs confirmation",
      message: "Alice added 'Groceries' for $45.00",
      timestamp: new Date(
        Date.now() - 2 * 60 * 60 * 1000,
      ).toISOString(),
      read: false,
    },
    {
      id: "2",
      type: "settlement",
      title: "Payment received",
      message: "Bob settled $28.34 via bank transfer",
      timestamp: new Date(
        Date.now() - 1 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      read: true,
    },
  ]);

  /**
   * PERSON vs MEMBER DISTINCTION
   *
   * TWO similar but different concepts:
   *
   * 1. MEMBER (type: Member):
   *    - Belongs to a specific pot
   *    - Has pot-specific properties (role, status)
   *    - Stored in pot.members[]
   *
   * 2. PERSON (type: Person):
   *    - Global contact across ALL pots
   *    - Has settlement properties (balance, trustScore, paymentPreference)
   *    - Derived by de-duplicating members from all pots
   *    - Used for settlements and people view
   *
   * Conversion: Members → People (this function)
   * - Iterate all pots
   * - De-duplicate members by ID
   * - Convert to Person format with settlement properties
   */
  const people: Person[] = useMemo(() => {
    const peopleMap = new Map<string, Person>();

    pots.forEach((pot) => {
      pot.members.forEach((member) => {
        if (
          member.id !== "owner" &&
          !peopleMap.has(member.id)
        ) {
          peopleMap.set(member.id, {
            id: member.id,
            name: member.name,
            balance: 0,
            trustScore: 95,
            paymentPreference: "Bank",
            potCount: 0,
          });
        }
      });
    });

    return Array.from(peopleMap.values());
  }, [pots]);

  // Settlement calculations (balances, not history)
  const balances = useMemo(() => {
    const start = performance.now();
    const result = calculateSettlements(pots, people, "owner");
    const time = performance.now() - start;
    if (time > 10) {
      console.warn(
        `⏱️ [Performance] balances calculation: ${time.toFixed(2)}ms`,
      );
    }
    return result;
  }, [pots, people]);

  // Pending expenses for activity feed (MUST be before getFabState)
  const pendingExpenses = useMemo(() => {
    const start = performance.now();
    const pending: Array<{
      id: string;
      memo: string;
      amount: number;
      paidBy: string;
      potName: string;
    }> = [];

    pots.forEach((pot) => {
      pot.expenses.forEach((expense) => {
        if (
          !expense.attestations.includes("owner") &&
          expense.paidBy !== "owner"
        ) {
          pending.push({
            id: expense.id,
            memo: expense.memo,
            amount: expense.amount,
            paidBy: expense.paidBy,
            potName: pot.name,
          });
        }
      });
    });

    const time = performance.now() - start;
    if (time > 10) {
      console.warn(
        `⏱️ [Performance] pendingExpenses calculation: ${time.toFixed(2)}ms`,
      );
    }
    return pending;
  }, [pots]);

  // ========================================
  // LOCALSTORAGE PERSISTENCE
  // ========================================
  // Track if we've loaded initial data to prevent double-save on mount
  const [hasLoadedInitialData, setHasLoadedInitialData] =
    useState(false);

  // Load persisted data on mount (runs once) - INSTANT & NON-BLOCKING
  useEffect(() => {
    // Load synchronously but safely - localStorage.getItem is fast
    try {
      const savedPots = localStorage.getItem("chopdot_pots");
      if (savedPots && savedPots.length < 1000000) {
        const parsed = JSON.parse(savedPots);
        if (Array.isArray(parsed)) {
          setPots(parsed);
        }
      }
    } catch (e) {
      console.error("[ChopDot] Failed to load pots");
      localStorage.removeItem("chopdot_pots");
    }

    try {
      const savedSettlements = localStorage.getItem(
        "chopdot_settlements",
      );
      if (
        savedSettlements &&
        savedSettlements.length < 500000
      ) {
        const parsed = JSON.parse(savedSettlements);
        if (Array.isArray(parsed)) {
          setSettlements(parsed);
        }
      }
    } catch (e) {
      console.error("[ChopDot] Failed to load settlements");
      localStorage.removeItem("chopdot_settlements");
    }

    try {
      const savedNotifications = localStorage.getItem(
        "chopdot_notifications",
      );
      if (
        savedNotifications &&
        savedNotifications.length < 100000
      ) {
        const parsed = JSON.parse(savedNotifications);
        if (Array.isArray(parsed)) {
          setNotifications(parsed);
        }
      }
    } catch (e) {
      console.error("[ChopDot] Failed to load notifications");
      localStorage.removeItem("chopdot_notifications");
    }

    // Mark as loaded immediately
    setHasLoadedInitialData(true);
  }, []);

  // Save pots to localStorage whenever they change (skip initial load)
  // Use requestIdleCallback to avoid blocking UI
  useEffect(() => {
    if (!hasLoadedInitialData) return;

    // Debounce saves using requestIdleCallback for better performance
    const saveData = () => {
      try {
        const data = JSON.stringify(pots);
        // Check size before saving
        if (data.length > 1000000) {
          console.warn(
            "[ChopDot] Pots data too large, not saving",
          );
          return;
        }
        localStorage.setItem("chopdot_pots", data);
      } catch (e) {
        console.error("[ChopDot] Failed to save pots:", e);
        // If quota exceeded, try to clear old data
        if (
          e instanceof DOMException &&
          e.name === "QuotaExceededError"
        ) {
          console.warn(
            "[ChopDot] Quota exceeded, clearing notifications...",
          );
          localStorage.removeItem("chopdot_notifications");
        }
      }
    };

    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(saveData, {
        timeout: 1000,
      });
      return () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(saveData, 100);
      return () => clearTimeout(id);
    }
  }, [pots, hasLoadedInitialData]);

  // Save settlements to localStorage whenever they change (skip initial load)
  useEffect(() => {
    if (!hasLoadedInitialData) return;

    const saveData = () => {
      try {
        const data = JSON.stringify(settlements);
        if (data.length > 500000) {
          console.warn(
            "[ChopDot] Settlements data too large, not saving",
          );
          return;
        }
        localStorage.setItem("chopdot_settlements", data);
      } catch (e) {
        console.error(
          "[ChopDot] Failed to save settlements:",
          e,
        );
      }
    };

    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(saveData, {
        timeout: 1000,
      });
      return () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(saveData, 100);
      return () => clearTimeout(id);
    }
  }, [settlements, hasLoadedInitialData]);

  // Save notifications to localStorage whenever they change (skip initial load)
  useEffect(() => {
    if (!hasLoadedInitialData) return;

    const saveData = () => {
      try {
        const data = JSON.stringify(notifications);
        if (data.length > 100000) {
          console.warn(
            "[ChopDot] Notifications data too large, not saving",
          );
          return;
        }
        localStorage.setItem("chopdot_notifications", data);
      } catch (e) {
        console.error(
          "[ChopDot] Failed to save notifications:",
          e,
        );
      }
    };

    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(saveData, {
        timeout: 1000,
      });
      return () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(saveData, 100);
      return () => clearTimeout(id);
    }
  }, [notifications, hasLoadedInitialData]);

  // New pot form
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

  // (removed) New expense form state was unused

  // ========================================
  // NAVIGATION HELPERS
  // ========================================
  // Get active tab based on current screen
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
    // Keep Activity context while in settle flows so FAB/icon don't switch to Pots
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

  // Handle tab changes
  const handleTabChange = (
    tab: "pots" | "people" | "activity" | "you",
  ) => {
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

  // Check if screen should show tab bar
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

  // ========================================
  // FAB CONTEXT-SENSITIVE LOGIC
  // ========================================
  const getFabState = useCallback((): {
    visible: boolean;
    icon: LucideIcon;
    color: string;
    action: () => void;
  } => {
    const activeTab = getActiveTab();

    // Hide FAB within settle flows to avoid confusion
    if (screen && (screen.type === "settle-selection" || screen.type === "settle-home")) {
      return { visible: false, icon: Receipt, color: "var(--accent)", action: () => {} };
    }

    // Pot detail: context action to add expense/contribution
    if (screen && screen.type === "pot-home") {
      const potForFab = pots.find(p => p.id === (currentPotId || screen.potId));
      if (potForFab?.type === "savings") {
        return {
          visible: true,
          icon: CheckCircle, // could use TrendingUp, but keep consistent icons set
          color: "var(--money)",
          action: () => {
            triggerHaptic("light");
            setCurrentPotId(potForFab.id);
            push({ type: "add-contribution" });
          },
        };
      }
      // default: expense pot → add expense
      return {
        visible: true,
        icon: Receipt,
        color: "var(--accent)",
        action: () => {
          triggerHaptic("light");
          setCurrentPotId(potForFab?.id || null);
          push({ type: "add-expense" });
        },
      };
    }

    // People & You tabs: Hide FAB completely
    if (activeTab === "people" || activeTab === "you") {
      return {
        visible: false,
        icon: Receipt,
        color: "var(--accent)",
        action: () => {},
      };
    }

    // Activity tab: Show "Confirm All" if pending expenses, otherwise "Quick Settle"
    if (activeTab === "activity") {
      if (pendingExpenses.length > 0) {
        return {
          visible: true,
          icon: CheckCircle,
          color: "var(--success)",
          action: () => {
            triggerHaptic("light");
            // Open batch confirm sheet instead of immediately confirming
            setShowBatchConfirm(true);
          },
        };
      } else {
        return {
          visible: true,
          icon: ArrowLeftRight,
          color: "var(--accent)",
          action: () => {
            triggerHaptic("light");
            // Global quick settle across all pots
            setCurrentPotId(null);
            setSelectedCounterpartyId(null);
            push({ type: "settle-selection" });
          },
        };
      }
    }

    // Pots tab: "Create Pot"
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

    // Default: Hide
    return {
      visible: false,
      icon: Receipt,
      color: "var(--accent)",
      action: () => {},
    };
  }, [
    getActiveTab,
    pendingExpenses,
    pots,
    push,
    setCurrentPotId,
    setShowChoosePot,
    showToast,
  ]);

  // Check if current screen can swipe back
  const canSwipeBack = () => {
    // Root tab screens cannot swipe back
    const rootScreens = [
      "activity-home",
      "pots-home",
      "settlements-home",
      "people-home",
      "you-tab",
    ];
    // Defensive: avoid blank by enforcing a safe reset when stack length is 1
    if (!screen) return false;
    if (stack.length <= 1) return false;
    return !rootScreens.includes(screen.type);
  };

  // ========================================
  // DATA HELPERS
  // ========================================
  // Get current pot
  const getCurrentPot = () =>
    pots.find((p) => p.id === currentPotId);

  // ========================================
  // CRUD OPERATIONS
  // ========================================
  const createPot = () => {
    const pot: Pot = {
      id: Date.now().toString(),
      name: newPot.name || "Unnamed Pot",
      type: newPot.type || "expense",
      baseCurrency: newPot.baseCurrency || "USD",
      members: newPot.members || [],
      expenses: [],
      budget: newPot.budget,
      budgetEnabled: newPot.budgetEnabled,
      contributions: newPot.type === "savings" ? [] : undefined,
      totalPooled: newPot.type === "savings" ? 0 : undefined,
      yieldRate: newPot.type === "savings" ? 0 : undefined,
      goalAmount: newPot.goalAmount,
      goalDescription: newPot.goalDescription,
      checkpointEnabled:
        newPot.type === "expense" ? true : undefined, // Default enabled for expense pots
    };

    setPots([...pots, pot]);
    setNewPot({
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

    back();
    showToast("Pot created successfully!", "success");
  };

  const addExpense = (data: {
    amount: number;
    currency: string;
    paidBy: string;
    memo: string;
    date: string;
    split: { memberId: string; amount: number }[];
    hasReceipt: boolean;
  }) => {
    if (!currentPotId) return;

    const expense: Expense = {
      id: Date.now().toString(),
      amount: data.amount,
      currency: data.currency,
      paidBy: data.paidBy,
      memo: data.memo,
      date: data.date,
      split: data.split,
      attestations: [],
      hasReceipt: data.hasReceipt,
    };

    setPots(
      pots.map((p) => {
        if (p.id !== currentPotId) return p;

        // Invalidate checkpoint if user has confirmed (new expense added after confirmation)
        let updatedCheckpoint = p.currentCheckpoint;
        if (
          p.currentCheckpoint?.status === "pending" &&
          p.currentCheckpoint.confirmations.get("owner")
            ?.confirmed
        ) {
          const updatedConfirmations = new Map(
            p.currentCheckpoint.confirmations,
          );
          updatedConfirmations.set("owner", {
            confirmed: false,
          });
          updatedCheckpoint = {
            ...p.currentCheckpoint,
            confirmations: updatedConfirmations,
          };
        }

        return {
          ...p,
          expenses: [...p.expenses, expense],
          currentCheckpoint: updatedCheckpoint,
        };
      }),
    );

    back();
    showToast("Expense added successfully!", "success");
  };

  const updateExpense = (data: {
    amount: number;
    currency: string;
    paidBy: string;
    memo: string;
    date: string;
    split: { memberId: string; amount: number }[];
    hasReceipt: boolean;
  }) => {
    if (!currentPotId || !currentExpenseId) return;

    setPots(
      pots.map((p) => {
        if (p.id !== currentPotId) return p;

        // Invalidate checkpoint if user has confirmed (expense modified after confirmation)
        let updatedCheckpoint = p.currentCheckpoint;
        if (
          p.currentCheckpoint?.status === "pending" &&
          p.currentCheckpoint.confirmations.get("owner")
            ?.confirmed
        ) {
          const updatedConfirmations = new Map(
            p.currentCheckpoint.confirmations,
          );
          updatedConfirmations.set("owner", {
            confirmed: false,
          });
          updatedCheckpoint = {
            ...p.currentCheckpoint,
            confirmations: updatedConfirmations,
          };
        }

        return {
          ...p,
          expenses: p.expenses.map((e) =>
            e.id === currentExpenseId
              ? {
                  ...e,
                  amount: data.amount,
                  currency: data.currency,
                  paidBy: data.paidBy,
                  memo: data.memo,
                  date: data.date,
                  split: data.split,
                  hasReceipt: data.hasReceipt,
                }
              : e,
          ),
          currentCheckpoint: updatedCheckpoint,
        };
      }),
    );

    back();
    showToast("Expense updated!", "success");
  };

  const deleteExpense = () => {
    if (!currentPotId || !currentExpenseId) return;

    setPots(
      pots.map((p) =>
        p.id === currentPotId
          ? {
              ...p,
              expenses: p.expenses.filter(
                (e) => e.id !== currentExpenseId,
              ),
            }
          : p,
      ),
    );

    back();
    showToast("Expense deleted", "info");
  };

  /**
   * EXPENSE ATTESTATION (Individual Expense Confirmation)
   *
   * Purpose: Confirm that an expense is accurate and legitimate
   *
   * Rules:
   * - You CANNOT attest your own expenses (prevents fraud)
   * - You can only attest once per expense
   * - Attestations are stored in expense.attestations[] array
   *
   * Use Cases:
   * - Bob adds "Groceries $50" → Alice attests it's correct
   * - Builds trust score (more attestations = more reliable)
   *
   * Different from Checkpoint:
   * - Attestation = "This expense is correct" (per-expense)
   * - Checkpoint = "All expenses are entered" (per-pot, before settlement)
   */
  const attestExpense = (expenseId: string) => {
    if (!currentPotId) return;

    // Find the expense to check if user is the payer
    const pot = pots.find((p) => p.id === currentPotId);
    const expense = pot?.expenses.find(
      (e) => e.id === expenseId,
    );

    // Prevent self-attestation: You can't confirm your own expenses
    if (expense?.paidBy === "owner") {
      showToast("You can't confirm your own expense", "error");
      return;
    }

    // Check if already confirmed
    if (expense?.attestations.includes("owner")) {
      showToast("You already confirmed this expense", "info");
      return;
    }

    setPots(
      pots.map((p) =>
        p.id === currentPotId
          ? {
              ...p,
              expenses: p.expenses.map((e) =>
                e.id === expenseId
                  ? {
                      ...e,
                      attestations: [
                        ...e.attestations,
                        "owner",
                      ],
                    }
                  : e,
              ),
            }
          : p,
      ),
    );

    showToast("✓ Expense confirmed", "success");
    triggerHaptic("light");
  };

  /**
   * BATCH ATTESTATION - Single Pot
   *
   * Purpose: Attest multiple expenses within ONE pot at once
   * Used by: PotHome screen's "Confirm All" button
   *
   * Note: Single state update for all attestations (prevents async state bugs)
   */
  const batchAttestExpenses = (expenseIds: string[]) => {
    if (!currentPotId) return;

    const pot = pots.find((p) => p.id === currentPotId);
    if (!pot) return;

    // Filter out expenses that are self-paid or already confirmed
    const validExpenseIds = expenseIds.filter((expenseId) => {
      const expense = pot.expenses.find(
        (e) => e.id === expenseId,
      );
      return (
        expense &&
        expense.paidBy !== "owner" &&
        !expense.attestations.includes("owner")
      );
    });

    if (validExpenseIds.length === 0) {
      showToast("No expenses to confirm", "info");
      return;
    }

    // Single state update for all attestations
    setPots(
      pots.map((p) =>
        p.id === currentPotId
          ? {
              ...p,
              expenses: p.expenses.map((e) =>
                validExpenseIds.includes(e.id)
                  ? {
                      ...e,
                      attestations: [
                        ...e.attestations,
                        "owner",
                      ],
                    }
                  : e,
              ),
            }
          : p,
      ),
    );

    showToast(
      `✓ ${validExpenseIds.length} expense${validExpenseIds.length > 1 ? "s" : ""} confirmed`,
      "success",
    );
    triggerHaptic("light");
  };

  /**
   * BATCH ATTESTATION - All Pots (Global)
   *
   * Purpose: Attest ALL pending expenses across ALL pots
   * Used by: Activity tab FAB → BatchConfirmSheet
   *
   * Workflow:
   * 1. User sees pending count in Activity tab
   * 2. Clicks "Confirm All" FAB → Opens BatchConfirmSheet
   * 3. User reviews list → Clicks "Confirm All"
   * 4. This function groups by pot and attests all valid expenses
   *
   * Different from batchAttestExpenses:
   * - batchAttestExpenses = single pot (called from PotHome)
   * - handleBatchConfirmAll = all pots (called from Activity/BatchConfirmSheet)
   */
  const handleBatchConfirmAll = () => {
    // Group pending expenses by pot
    const groupedByPot = new Map<string, string[]>();
    pendingExpenses.forEach((exp) => {
      const pot = pots.find((p) =>
        p.expenses.some((e) => e.id === exp.id),
      );
      if (pot) {
        if (!groupedByPot.has(pot.id)) {
          groupedByPot.set(pot.id, []);
        }
        groupedByPot.get(pot.id)!.push(exp.id);
      }
    });

    // Batch attest per pot
    groupedByPot.forEach((expenseIds, potId) => {
      const pot = pots.find((p) => p.id === potId);
      if (!pot) return;

      const validExpenseIds = expenseIds.filter((expenseId) => {
        const expense = pot.expenses.find(
          (e) => e.id === expenseId,
        );
        return (
          expense &&
          expense.paidBy !== "owner" &&
          !expense.attestations.includes("owner")
        );
      });

      if (validExpenseIds.length > 0) {
        setPots((prevPots) =>
          prevPots.map((p) =>
            p.id === potId
              ? {
                  ...p,
                  expenses: p.expenses.map((e) =>
                    validExpenseIds.includes(e.id)
                      ? {
                          ...e,
                          attestations: [
                            ...e.attestations,
                            "owner",
                          ],
                        }
                      : e,
                  ),
                }
              : p,
          ),
        );
      }
    });

    showToast(
      `✓ ${pendingExpenses.length} expense${pendingExpenses.length > 1 ? "s" : ""} confirmed`,
      "success",
    );
    triggerHaptic("light");
  };

  // ========================================
  // CHECKPOINT OPERATIONS
  // ========================================
  /**
   * CHECKPOINT WORKFLOW EXPLANATION
   *
   * Problem: Before settling, members need to confirm all expenses are entered.
   * Solution: Checkpoint system - members confirm expenses BEFORE settling.
   *
   * FLOW:
   * 1. User clicks "Settle" → createCheckpoint() creates checkpoint
   * 2. Navigate to CheckpointStatusScreen
   * 3. Each member reviews expenses and clicks "Confirm"
   * 4. When ALL confirm → auto-proceed to settlement
   * 5. OR user clicks "Settle Anyway" → bypassCheckpoint() → proceed
   *
   * STATE TRANSITIONS:
   * - "pending" → waiting for confirmations
   * - "confirmed" → all confirmed, auto-clear and proceed
   * - "bypassed" → user skipped, proceed anyway
   *
   * INVALIDATION RULES:
   * - Adding/editing expense after user confirmed → reset user's confirmation
   * - This forces re-review if data changed
   *
   * EXPIRY (NOT YET IMPLEMENTED):
   * - Auto-confirm after 48 hours
   * - Would need background job or check on next visit
   */
  const createCheckpoint = (potId: string) => {
    const pot = pots.find((p) => p.id === potId);
    if (!pot) return null;

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + 48 * 60 * 60 * 1000,
    ); // 48 hours

    // Initialize confirmations for all members
    const confirmations = new Map<
      string,
      { confirmed: boolean; confirmedAt?: string }
    >();
    pot.members.forEach((member) => {
      confirmations.set(member.id, { confirmed: false });
    });

    const checkpoint: ExpenseCheckpoint = {
      id: Date.now().toString(),
      createdBy: "owner",
      createdAt: now.toISOString(),
      status: "pending",
      confirmations,
      expiresAt: expiresAt.toISOString(),
    };

    setPots(
      pots.map((p) =>
        p.id === potId
          ? { ...p, currentCheckpoint: checkpoint }
          : p,
      ),
    );

    return checkpoint;
  };

  const confirmCheckpoint = () => {
    if (!currentPotId) return;
    const pot = getCurrentPot();
    if (!pot || !pot.currentCheckpoint) return;

    const updatedConfirmations = new Map(
      pot.currentCheckpoint.confirmations,
    );
    updatedConfirmations.set("owner", {
      confirmed: true,
      confirmedAt: new Date().toISOString(),
    });

    // Check if all confirmed
    const allConfirmed = Array.from(
      updatedConfirmations.values(),
    ).every((c) => c.confirmed);

    setPots(
      pots.map((p) =>
        p.id === currentPotId && p.currentCheckpoint
          ? {
              ...p,
              currentCheckpoint: {
                ...p.currentCheckpoint,
                confirmations: updatedConfirmations,
                status: allConfirmed ? "confirmed" : "pending",
              },
            }
          : p,
      ),
    );

    showToast("✓ Confirmed! All expenses entered", "success");
    triggerHaptic("light");
  };

  const bypassCheckpoint = () => {
    if (!currentPotId) return;
    const pot = getCurrentPot();
    if (!pot || !pot.currentCheckpoint) return;

    setPots(
      pots.map((p) =>
        p.id === currentPotId && p.currentCheckpoint
          ? {
              ...p,
              currentCheckpoint: {
                ...p.currentCheckpoint,
                status: "bypassed",
                bypassedBy: "owner",
                bypassedAt: new Date().toISOString(),
              },
            }
          : p,
      ),
    );
  };

  const clearCheckpoint = (potId: string) => {
    setPots(
      pots.map((p) =>
        p.id === potId
          ? { ...p, currentCheckpoint: undefined }
          : p,
      ),
    );
  };

  const handleLogout = async () => {
    try {
      triggerHaptic("medium");
      await logout();
      showToast("Logged out successfully", "success");
      // User will be redirected to login screen by auth state change
    } catch (error) {
      console.error("Logout failed:", error);
      showToast("Logout failed", "error");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      triggerHaptic("medium");
      // TODO: Implement account deletion API call
      // await deleteAccount();
      await logout();
      showToast("Account deleted", "info");
    } catch (error) {
      console.error("Account deletion failed:", error);
      showToast("Account deletion failed", "error");
    }
  };

  const updatePaymentMethodValue = (
    id: string,
    updates: Partial<PaymentMethod>,
  ) => {
    setPaymentMethods(
      paymentMethods.map((m) =>
        m.id === id ? { ...m, ...updates } : m,
      ),
    );
    showToast("Payment method updated", "success");
  };

  const setPreferredMethod = (id: string) => {
    setPreferredMethodId(id);
    showToast("Default payment method updated", "success");
  };

  const addContribution = (
    amount: number,
    method: "wallet" | "bank",
  ) => {
    if (!currentPotId) return;
    const pot = getCurrentPot();
    if (!pot || pot.type !== "savings") return;

    const contribution: Contribution = {
      id: Date.now().toString(),
      memberId: "owner",
      amount,
      date: new Date().toISOString(),
      txHash:
        method === "wallet"
          ? `0x${Math.random().toString(16).substr(2, 40)}`
          : undefined,
    };

    setPots(
      pots.map((p) =>
        p.id === currentPotId
          ? {
              ...p,
              contributions: [
                ...(p.contributions || []),
                contribution,
              ],
              totalPooled: (p.totalPooled || 0) + amount,
            }
          : p,
      ),
    );

    back();
    showToast(
      method === "wallet"
        ? `${pot.baseCurrency} ${amount.toFixed(2)} added via wallet`
        : `${pot.baseCurrency} ${amount.toFixed(2)} added via bank transfer`,
      "success",
    );
  };

  const withdrawFunds = (amount: number) => {
    if (!currentPotId) return;
    const pot = getCurrentPot();
    if (!pot || pot.type !== "savings") return;

    // Calculate proportion of user's balance to withdraw
    const userContributions = (pot.contributions || [])
      .filter((c) => c.memberId === "owner")
      .reduce((sum, c) => sum + c.amount, 0);

    if (amount > userContributions) {
      showToast("Insufficient balance", "error");
      return;
    }

    // Create a withdrawal record (negative contribution)
    const withdrawal: Contribution = {
      id: Date.now().toString(),
      memberId: "owner",
      amount: -amount,
      date: new Date().toISOString(),
      txHash: `0x${Math.random().toString(16).substr(2, 40)}`,
    };

    const newTotal = (pot.totalPooled || 0) - amount;

    setPots(
      pots.map((p) =>
        p.id === currentPotId
          ? {
              ...p,
              contributions: [
                ...(p.contributions || []),
                withdrawal,
              ],
              totalPooled: Math.max(0, newTotal),
            }
          : p,
      ),
    );

    back();
    showToast(
      `${pot.baseCurrency} ${amount.toFixed(2)} withdrawn successfully`,
      "success",
    );
  };

  // ========================================
  // COMPUTED DATA
  // ========================================
  /**
   * ACTIVITY FEED GENERATION
   *
   * Purpose: Unified timeline of all activity (expenses, attestations, settlements)
   *
   * SYNTHETIC ID GENERATION (Workaround):
   * - Expense IDs: Use expense.id directly
   * - Attestation IDs: Generate as `${expense.id}-attestation-${attesterId}`
   * - Format allows reverse lookup: extract expenseId by splitting on '-attestation-'
   *
   * TIMESTAMP ESTIMATION (Temporary):
   * - Attestations don't have stored timestamps (would need DB schema change)
   * - Estimated as expense.date + (index * 2 hours)
   * - TODO: Store attestation timestamps in Expense type when adding backend
   *
   * Performance: Runs on every render, memoized by [pots]
   */
  const activities: ActivityItem[] = useMemo(() => {
    const start = performance.now();
    const items: ActivityItem[] = [];

    pots.forEach((pot) => {
      pot.expenses.forEach((expense) => {
        // Add expense activity
        items.push({
          id: expense.id,
          type: "expense",
          timestamp: expense.date,
          title: expense.memo,
          subtitle: `${pot.name} • Paid by ${expense.paidBy === "owner" ? "You" : expense.paidBy}`,
          amount: expense.amount,
        });

        // Add attestation activities for each person who confirmed
        expense.attestations.forEach((attesterId, index) => {
          // Create a unique ID for each attestation (synthetic)
          const attestationId = `${expense.id}-attestation-${attesterId}`;

          // Estimate attestation time (temporary workaround)
          // In production: Store attestation timestamp in Expense.attestations as objects
          const attestationTime = new Date(
            new Date(expense.date).getTime() +
              (index + 1) * 2 * 60 * 60 * 1000,
          ).toISOString();

          const attesterName =
            attesterId === "owner"
              ? "You"
              : pot.members.find((m) => m.id === attesterId)
                  ?.name || attesterId;

          items.push({
            id: attestationId,
            type: "attestation",
            timestamp: attestationTime,
            title: `${attesterName} confirmed expense`,
            subtitle: `${expense.memo} • ${pot.name}`,
            amount: undefined,
          });
        });
      });
    });

    const sorted = items.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() -
        new Date(a.timestamp).getTime(),
    );
    const time = performance.now() - start;
    if (time > 10) {
      console.warn(
        `⏱️ [Performance] activities calculation: ${time.toFixed(2)}ms (${items.length} items)`,
      );
    }
    return sorted;
  }, [pots]);

  // Calculate totals for activity home
  const totalOwed = balances.owedToYou.reduce(
    (sum, p) => sum + p.totalAmount,
    0,
  );
  const totalOwing = balances.youOwe.reduce(
    (sum, p) => sum + p.totalAmount,
    0,
  );

  // You tab insights - Simple reliability metrics
  const youTabInsights = useMemo(() => {
    const monthlySpending = pots.reduce((sum, pot) => {
      if (pot.type === "expense") {
        return (
          sum +
          pot.expenses.reduce(
            (expSum, exp) => expSum + exp.amount,
            0,
          )
        );
      }
      return sum;
    }, 0);

    // Calculate simple reliability metrics
    let expensesNeedingConfirmation = 0;
    let expensesConfirmed = 0;

    pots.forEach((pot) => {
      pot.expenses.forEach((expense) => {
        // Only count expenses where you weren't the payer (you need to confirm)
        if (expense.paidBy !== "owner") {
          expensesNeedingConfirmation++;
          if (expense.attestations.includes("owner")) {
            expensesConfirmed++;
          }
        }
      });
    });

    const confirmationRate =
      expensesNeedingConfirmation > 0
        ? Math.round(
            (expensesConfirmed / expensesNeedingConfirmation) *
              100,
          )
        : 100;

    const activeGroups = pots.filter(
      (p) => p.type === "expense",
    ).length;
    const settlementsCompleted = settlements.length;

    return {
      monthlySpending,
      topCategory: "Groceries",
      topCategoryAmount: 245.5,
      activePots: activeGroups,
      totalSettled: 1250.0,
      // Reliability metrics (simple counts, no gamification)
      expensesConfirmed,
      expensesNeedingConfirmation,
      confirmationRate,
      settlementsCompleted,
      activeGroups,
    };
  }, [pots, settlements]);

  // ========================================
  // SCREEN RENDERING
  // ========================================
  const renderScreen = () => {
    const pot = getCurrentPot();

    switch (screen!.type) {
      case "activity-home":
        return (
          <ActivityHome
            totalOwed={totalOwed}
            totalOwing={totalOwing}
            activities={activities}
            pendingExpenses={pendingExpenses}
            topPersonToSettle={undefined}
            hasPendingAttestations={pendingExpenses.length > 0}
            onActivityClick={(activity) => {
              if (activity.type === "expense") {
                // Find the pot containing this expense
                const pot = pots.find((p) =>
                  p.expenses.some((e) => e.id === activity.id),
                );
                if (pot) {
                  setCurrentPotId(pot.id);
                  setCurrentExpenseId(activity.id);
                  push({
                    type: "expense-detail",
                    expenseId: activity.id,
                  });
                }
              } else if (activity.type === "attestation") {
                // Extract expense ID from attestation ID (format: expenseId-attestation-attesterId)
                const expenseId =
                  activity.id.split("-attestation-")[0];
                const pot = pots.find((p) =>
                  p.expenses.some((e) => e.id === expenseId),
                );
                if (pot) {
                  setCurrentPotId(pot.id);
                  setCurrentExpenseId(expenseId!);
                  push({ type: "expense-detail", expenseId: expenseId! });
                }
              } else {
                showToast(
                  `${activity.type} activities coming soon`,
                  "info",
                );
              }
            }}
            onNotificationClick={() => {
              triggerHaptic("light");
              setShowNotifications(true);
            }}
            onWalletClick={() => {
              triggerHaptic("light");
              setShowWalletSheet(true);
            }}
            walletConnected={walletConnected}
            onRefresh={async () => {
              // Mock refresh - in real app would fetch new data
              await new Promise((resolve) =>
                setTimeout(resolve, 1000),
              );
            }}
            notificationCount={
              notifications.filter((n) => !n.read).length
            }
          />
        );

      case "pots-home":
        // Calculate pot summaries
        const potSummaries = pots.filter(p => !p.archived).map((pot) => {
          const myExpenses = pot.expenses
            .filter((e) => e.paidBy === "owner")
            .reduce((sum, e) => sum + e.amount, 0);

          const totalExpenses = pot.expenses.reduce(
            (sum, e) => sum + e.amount,
            0,
          );

          const myShare = pot.expenses.reduce((sum, e) => {
            const split = e.split.find(
              (s) => s.memberId === "owner",
            );
            return sum + (split?.amount || 0);
          }, 0);

          const net = myExpenses - myShare;

          return {
            id: pot.id,
            name: pot.name,
            type: pot.type,
            myExpenses,
            totalExpenses,
            net,
            budget: pot.budget,
            budgetEnabled: pot.budgetEnabled,
            totalPooled: pot.totalPooled,
            yieldRate: pot.yieldRate,
          };
        });

        return (
          <PotsHome
            pots={potSummaries}
            youOwe={balances.youOwe}
            owedToYou={balances.owedToYou}
            onCreatePot={() => push({ type: "create-pot" })}
            onPotClick={(potId) => {
              setCurrentPotId(potId);
              push({ type: "pot-home", potId });
            }}
            onSettleWithPerson={(personId) => {
              setSelectedCounterpartyId(personId);
              push({ type: "settle-home" });
            }}
            onRemindSent={() => {
              showToast("Reminder sent.");
            }}
            onNotificationClick={() => {
              triggerHaptic("light");
              setShowNotifications(true);
            }}
            onWalletClick={() => {
              triggerHaptic("light");
              setShowWalletSheet(true);
            }}
            walletConnected={walletConnected}
            notificationCount={
              notifications.filter((n) => !n.read).length
            }
            onQuickAddExpense={() => {
              triggerHaptic("light");
              if (pots.length === 0) {
                showToast("Create a pot first!", "info");
                return;
              }
              if (pots.length === 1) {
              setCurrentPotId(pots[0]!.id);
                push({ type: "add-expense" });
              } else {
                setShowChoosePot(true);
              }
            }}
            onQuickSettle={() => {
              triggerHaptic("light");
              if (
                balances.youOwe.length === 0 &&
                balances.owedToYou.length === 0
              ) {
                showToast("Nothing to settle yet", "info");
                return;
              }
              // Navigate to people home to see all balances
              reset({ type: "people-home" });
            }}
            onQuickScan={() => {
              triggerHaptic("light");
              setShowScanQR(true);
            }}
            onQuickRequest={() => {
              triggerHaptic("light");
              if (balances.owedToYou.length === 0) {
                showToast("Nobody owes you money yet", "info");
                return;
              }
              push({ type: "request-payment" });
            }}
          />
        );

      case "settlements-home":
      case "people-home":
        return (
          <PeopleHome
            youOwe={balances.youOwe}
            owedToYou={balances.owedToYou}
            people={people}
            walletConnected={walletConnected}
            onConnectWallet={() => setWalletConnected(true)}
            onSettle={(personId) => {
              setSelectedCounterpartyId(personId);
              push({ type: "settle-home" });
            }}
            onRemindSent={() => {
              showToast("Reminder sent.");
            }}
            onPersonClick={(person) => {
              // Optional: Navigate to member detail for info viewing (not part of settle flow)
              push({
                type: "member-detail",
                memberId: person.id,
              });
            }}
            onNotificationClick={() => {
              triggerHaptic("light");
              setShowNotifications(true);
            }}
            onWalletClick={() => {
              triggerHaptic("light");
              setShowWalletSheet(true);
            }}
            notificationCount={
              notifications.filter((n) => !n.read).length
            }
            isDarkMode={theme === "dark"}
            onToggleTheme={() => {
              triggerHaptic("light");
              setTheme(theme === "dark" ? "light" : "dark");
            }}
          />
        );

      case "you-tab":
        return (
          <YouTab
            onShowQR={() => {
              setShowMyQR(true);
            }}
            onScanQR={() => {
              setShowScanQR(true);
            }}
            onPaymentMethods={() => {
              push({ type: "payment-methods" });
            }}
            onViewInsights={() => {
              push({ type: "insights" });
            }}
            onSettings={() => {
              push({ type: "settings" });
            }}
            onNotificationClick={() => {
              triggerHaptic("light");
              setShowNotifications(true);
            }}
            onWalletClick={() => {
              triggerHaptic("light");
              setShowWalletSheet(true);
            }}
            walletConnected={walletConnected}
            notificationCount={
              notifications.filter((n) => !n.read).length
            }
            insights={youTabInsights}
            theme={theme}
            onThemeChange={setTheme}
            onLogout={handleLogout}
            onDeleteAccount={handleDeleteAccount}
            userName={user?.name || "You"}
            isGuest={user?.isGuest || false}
          />
        );

      case "settings":
        return (
          <Settings
            onBack={back}
            onPaymentMethods={() =>
              push({ type: "payment-methods" })
            }
            onLogout={handleLogout}
            onDeleteAccount={handleDeleteAccount}
            theme={theme}
            onThemeChange={setTheme}
          />
        );

      case "payment-methods":
        return (
          <PaymentMethods
            methods={paymentMethods}
            preferredMethodId={preferredMethodId}
            onBack={back}
            onUpdateMethod={(kind, value) => {
              const target = paymentMethods.find(m => m.kind === kind);
              if (!target) return;
              const updates: Partial<PaymentMethod> =
                kind === 'bank' ? { iban: value } :
                kind === 'twint' ? { phone: value } :
                kind === 'paypal' ? { email: value } :
                { address: value };
              updatePaymentMethodValue(target.id, updates);
            }}
            onSetPreferred={(methodId: string | null) => {
              if (methodId) setPreferredMethod(methodId);
              else setPreferredMethodId("");
            }}
          />
        );

      case "create-pot":
        return (
          <CreatePot
            potName={newPot.name || ""}
            setPotName={(name) =>
              setNewPot({ ...newPot, name })
            }
            potType={newPot.type || "expense"}
            setPotType={(type) =>
              setNewPot({ ...newPot, type })
            }
            baseCurrency={newPot.baseCurrency || "USD"}
            setBaseCurrency={(currency) =>
              setNewPot({ ...newPot, baseCurrency: currency })
            }
            members={newPot.members || []}
            setMembers={(members) =>
              setNewPot({
                ...newPot,
                members: members.map((m) => ({
                  id: m.id,
                  name: m.name,
                  role: "Member",
                  status: "active",
                })),
              })
            }
            goalAmount={newPot.goalAmount}
            setGoalAmount={(amount) =>
              setNewPot({ ...newPot, goalAmount: amount })
            }
            goalDescription={newPot.goalDescription}
            setGoalDescription={(description) =>
              setNewPot({
                ...newPot,
                goalDescription: description,
              })
            }
            onBack={back}
            onCreate={createPot}
          />
        );

      case "pot-home":
        if (!pot) return null;
        return (
          <PotHome
            potType={pot.type}
            potName={pot.name}
            baseCurrency={pot.baseCurrency}
            members={pot.members}
            expenses={pot.expenses}
            budget={pot.budget}
            budgetEnabled={pot.budgetEnabled}
            checkpointEnabled={pot.checkpointEnabled}
            hasActiveCheckpoint={
              pot.currentCheckpoint?.status === "pending"
            }
            checkpointConfirmations={
              pot.currentCheckpoint?.confirmations
            }
            contributions={pot.contributions}
            totalPooled={pot.totalPooled}
            yieldRate={pot.yieldRate}
            defiProtocol={pot.defiProtocol}
            goalAmount={pot.goalAmount}
            goalDescription={pot.goalDescription}
            onBack={back}
            onAddExpense={() => push({ type: "add-expense" })}
            onExpenseClick={(expense) => {
              setCurrentExpenseId(expense.id);
              push({
                type: "expense-detail",
                expenseId: expense.id,
              });
            }}
            onSettle={() => {
              // Check if checkpoints are enabled for this pot
              if (
                pot.checkpointEnabled !== false &&
                pot.type === "expense"
              ) {
                // Check if there's an active checkpoint
                if (
                  pot.currentCheckpoint &&
                  pot.currentCheckpoint.status === "pending"
                ) {
                  // Go to checkpoint status screen
                  push({ type: "checkpoint-status" });
                } else {
                  // Create new checkpoint
                  const checkpoint = createCheckpoint(pot.id);
                  if (checkpoint) {
                    push({ type: "checkpoint-status" });
                  }
                }
              } else {
                // Checkpoints disabled, go directly to settle
                push({ type: "settle-selection" });
              }
            }}
            onAddMember={() => setShowAddMember(true)}
            onRemoveMember={(memberId) => {
              if (!currentPotId) return;
              setPots(
                pots.map((p) =>
                  p.id === currentPotId
                    ? {
                        ...p,
                        members: p.members.filter(
                          (m) => m.id !== memberId,
                        ),
                      }
                    : p,
                ),
              );
              showToast("Member removed", "info");
            }}
            onUpdateSettings={(settings) => {
              if (!currentPotId) return;
              setPots(
                pots.map((p) =>
                  p.id === currentPotId
                    ? {
                        ...p,
                        name: settings.potName || p.name,
                        baseCurrency:
                          settings.baseCurrency ||
                          p.baseCurrency,
                        budget: settings.budget,
                        budgetEnabled: settings.budgetEnabled,
                        checkpointEnabled:
                          settings.checkpointEnabled,
                      }
                    : p,
                ),
              );
              showToast("Settings updated", "success");
            }}
            onDeleteExpense={deleteExpense}
            onAttestExpense={(expenseId, silent) => {
              attestExpense(expenseId);
              if (!silent) {
                showToast("Expense confirmed", "success");
              }
            }}
            onBatchAttestExpenses={batchAttestExpenses}
            onShowToast={showToast}
            onAddContribution={() =>
              push({ type: "add-contribution" })
            }
            onWithdraw={() => push({ type: "withdraw-funds" })}
            onViewCheckpoint={() =>
              push({ type: "checkpoint-status" })
            }
          />
        );

      case "add-expense":
        if (!pot) return null;
        return (
          <AddExpense
            potName={pot.name}
            members={pot.members}
            baseCurrency={pot.baseCurrency}
            onBack={back}
            onSave={addExpense}
          />
        );

      case "edit-expense":
        if (!pot) return null;
        const editingExpense = pot.expenses.find(
          (e) => e.id === screen.expenseId,
        );
        if (!editingExpense) return null;

        return (
          <AddExpense
            potName={pot.name}
            members={pot.members}
            baseCurrency={pot.baseCurrency}
            existingExpense={editingExpense}
            onBack={back}
            onSave={updateExpense}
          />
        );

      case "expense-detail":
        if (!pot) return null;
        const expense = pot.expenses.find(
          (e) => e.id === screen.expenseId,
        );
        if (!expense) return null;

        return (
          <ExpenseDetail
            expense={expense}
            members={pot.members}
            currentUserId="owner"
            walletConnected={walletConnected}
            onBack={back}
            onEdit={() => {
              setCurrentExpenseId(expense.id);
              push({
                type: "edit-expense",
                expenseId: expense.id,
              });
            }}
            onDelete={deleteExpense}
            onAttest={() => attestExpense(expense.id)}
            onCopyReceiptLink={() =>
              showToast("Receipt link copied", "success")
            }
            onUpdateExpense={(updates) => {
              // Update expense with attestation data
              setPots(
                pots.map((p) =>
                  p.id === currentPotId
                    ? {
                        ...p,
                        expenses: p.expenses.map((e) =>
                          e.id === expense.id
                            ? { ...e, ...updates }
                            : e,
                        ),
                      }
                    : p,
                ),
              );
              showToast("Expense anchored on-chain", "success");
            }}
            onConnectWallet={() => setWalletConnected(true)}
          />
        );

      case "checkpoint-status":
        if (!pot || !pot.currentCheckpoint) return null;

        return (
          <CheckpointStatusScreen
            potName={pot.name}
            members={pot.members}
            confirmations={pot.currentCheckpoint.confirmations}
            currentUserId="owner"
            expiresAt={pot.currentCheckpoint.expiresAt}
            onBack={back}
            onConfirm={() => {
              confirmCheckpoint();
              // Check if all confirmed after this confirmation
              const pot = getCurrentPot();
              if (pot?.currentCheckpoint) {
                const updatedConfirmations = new Map(
                  pot.currentCheckpoint.confirmations,
                );
                updatedConfirmations.set("owner", {
                  confirmed: true,
                  confirmedAt: new Date().toISOString(),
                });
                const allConfirmed = Array.from(
                  updatedConfirmations.values(),
                ).every((c) => c.confirmed);

                if (allConfirmed) {
                  // Auto-proceed to settlement after short delay
                  setTimeout(() => {
                    clearCheckpoint(pot.id);
                    push({ type: "settle-selection" });
                  }, 800);
                }
              }
            }}
            onSettleAnyway={() => {
              bypassCheckpoint();
              clearCheckpoint(pot.id);
              push({ type: "settle-selection" });
            }}
            onRemind={(_) => {
              showToast("Reminder sent");
            }}
          />
        );

      case "settle-selection":
        /**
         * SETTLEMENT SCOPING LOGIC
         *
         * ChopDot supports TWO types of settlements:
         *
         * 1. POT-SCOPED (if currentPotId is set):
         *    - Only settle debts from THIS pot
         *    - User clicked "Settle" from PotHome
         *    - Uses calculatePotSettlements(pot, userId)
         *
         * 2. GLOBAL (if currentPotId is null):
         *    - Settle ALL debts across ALL pots
         *    - User clicked "Settle" from PeopleHome
         *    - Uses balances (calculated from ALL pots)
         *
         * The scope is determined by whether currentPotId is set when
         * navigating to settlement flow.
         */
        const potSettlements =
          currentPotId && getCurrentPot()
            ? calculatePotSettlements(getCurrentPot()!, "owner")
            : balances;

        // Convert to PersonBalance format for selection screen
        const selectionBalances = [
          ...potSettlements.youOwe.map((p) => ({
            id: p.id,
            name: p.name,
            amount: p.totalAmount,
            direction: "owe" as const,
            trustScore: p.trustScore,
            paymentPreference: p.paymentPreference,
          })),
          ...potSettlements.owedToYou.map((p) => ({
            id: p.id,
            name: p.name,
            amount: p.totalAmount,
            direction: "owed" as const,
            trustScore: p.trustScore,
            paymentPreference: p.paymentPreference,
          })),
        ];

        return (
          <SettleSelection
            potName={
              currentPotId ? getCurrentPot()?.name : undefined
            }
            balances={selectionBalances}
            onBack={() => {
              if (currentPotId) {
                // Go back to pot detail explicitly to avoid blank states
                push({ type: "pot-home", potId: currentPotId });
                // Then remove the extra selection screen to keep stack tidy
                back();
              } else {
                reset({ type: "people-home" });
              }
            }}
            onSelectPerson={(personId) => {
              setSelectedCounterpartyId(personId);
              push({ type: "settle-home" });
            }}
          />
        );

      case "settle-home":
        // Extract personId from screen params
        const personIdFromNav =
          screen.personId || selectedCounterpartyId;

        // Determine if this is pot-scoped or global
        const settleScope = currentPotId ? "pot" : "global";
        const settleLabel = currentPotId
          ? getCurrentPot()?.name
          : "All pots";

        // Calculate settlements based on scope
        const scopedSettlements =
          currentPotId && getCurrentPot()
            ? calculatePotSettlements(getCurrentPot()!, "owner")
            : balances;

        // Convert PersonSettlement to Settlement format with direction
        const convertToSettlements = (
          personSettlements: PersonSettlement[],
          direction: "owe" | "owed",
        ) => {
          return personSettlements.map((p: PersonSettlement) => ({
            id: p.id,
            name: p.name,
            totalAmount: p.totalAmount,
            direction,
            pots: p.breakdown.map((b: SettlementBreakdown) => ({
              potId: "", // Not used in UI
              potName: b.potName,
              amount: b.amount,
            })),
          }));
        };

        // Filter to selected counterparty if any
        const activeSettlements = personIdFromNav
          ? [
              ...convertToSettlements(
                scopedSettlements.youOwe.filter(
                  (p) => p.id === personIdFromNav,
                ),
                "owe",
              ),
              ...convertToSettlements(
                scopedSettlements.owedToYou.filter(
                  (p) => p.id === personIdFromNav,
                ),
                "owed",
              ),
            ]
          : [
              ...convertToSettlements(
                scopedSettlements.youOwe,
                "owe",
              ),
              ...convertToSettlements(
                scopedSettlements.owedToYou,
                "owed",
              ),
            ];

        const settlementAmount = Math.abs(
          activeSettlements.reduce((sum, s) => sum + s.totalAmount, 0),
        );

        const counterpartyName = personIdFromNav
          ? activeSettlements.find(
              (p) => p.id === personIdFromNav,
            )?.name || "Unknown"
          : activeSettlements[0]?.name || "Unknown";

        // Get person's preferred payment method (normalize to lowercase)
        const personData = personIdFromNav
          ? people.find((p) => p.id === personIdFromNav)
          : null;
        const preferredPaymentMethod =
          personData?.paymentPreference?.toLowerCase();

        return (
          <SettleHome
            settlements={activeSettlements}
            walletConnected={walletConnected}
            onConnectWallet={() => setWalletConnected(true)}
            onBack={() => {
              if (currentPotId) {
                replace({ type: "settle-selection" });
              } else {
                reset({ type: "people-home" });
              }
            }}
            scope={settleScope}
            scopeLabel={settleLabel}
            potId={currentPotId || undefined}
            personId={personIdFromNav || undefined}
            preferredMethod={preferredPaymentMethod}
            onConfirm={(method, reference) => {
              // Add settlement to history
              const newSettlement: Settlement = {
                id: Date.now().toString(),
                personId:
                  personIdFromNav ||
                  activeSettlements[0]?.id ||
                  "unknown",
                amount: settlementAmount,
                currency: "USD",
                method: method as any,
                potIds: currentPotId
                  ? [currentPotId]
                  : undefined,
                date: new Date().toISOString(),
                txHash:
                  method === "dot" ? reference : undefined,
              };
              setSettlements([newSettlement, ...settlements]);

              // Show toast and navigate back
              const methodLabels: Record<string, string> = {
                cash: "cash",
                bank: "bank transfer",
                paypal: "PayPal",
                twint: "TWINT",
                dot: "DOT wallet",
              };
              const methodLabel =
                methodLabels[method] || method;
              const scopeText =
                settleScope === "pot"
                  ? ` (${settleLabel})`
                  : "";
              showToast(
                `✓ Settled ${settlementAmount.toFixed(2)} with ${counterpartyName}${scopeText} via ${methodLabel}`,
                "success",
              );

              // Reset based on scope
              if (settleScope === "pot") {
                // Go back to pot detail
                back();
              } else {
                // Reset to people home
                reset({ type: "people-home" });
              }
            }}
            onHistory={() => {
              // Navigate to history filtered by person if person-scoped
              if (personIdFromNav) {
                push({
                  type: "settlement-history",
                  personId: personIdFromNav,
                });
              } else {
                push({ type: "settlement-history" });
              }
            }}
          />
        );

      case "settlement-history":
        // Get person name mapping
        const personNames = new Map<string, string>();
        pots.forEach((pot) => {
          pot.members.forEach((member) => {
            if (!personNames.has(member.id)) {
              personNames.set(member.id, member.name);
            }
          });
        });

        // Enrich settlements with person names and pot names
        const enrichedSettlements = settlements.map((s) => ({
          ...s,
          personName: personNames.get(s.personId) || "Unknown",
          potNames: s.potIds?.map((potId) => {
            const pot = pots.find((p) => p.id === potId);
            return pot?.name || "Unknown";
          }),
        }));

        return (
          <SettlementHistory
            settlements={enrichedSettlements}
            onBack={back}
            personId={screen.personId}
          />
        );

      case "settlement-confirmation":
        return (
          <SettlementConfirmation
            result={screen.result}
            onViewHistory={() => {
              push({ type: "settlement-history" });
            }}
            onDone={() => {
              reset({ type: "pots-home" });
              showToast("Settlement complete!", "success");
            }}
          />
        );

      case "insights":
        // Mock monthly data - would come from real expense history
        const mockMonthlyData = [
          { month: "Aug", amount: 420 },
          { month: "Sep", amount: 510 },
          { month: "Oct", amount: 545 },
        ];

        return (
          <InsightsScreen
            onBack={back}
            monthlySpending={youTabInsights.monthlySpending}
            activePots={
              pots.filter((p) => p.type === "expense").length
            }
            totalSettled={youTabInsights.totalSettled}
            monthlyData={mockMonthlyData}
            confirmationRate={youTabInsights.confirmationRate}
            expensesConfirmed={youTabInsights.expensesConfirmed}
            settlementsCompleted={
              youTabInsights.settlementsCompleted
            }
            activeGroups={youTabInsights.activeGroups}
          />
        );

      case "member-detail":
        // Find member across all pots (not just current pot)
        let memberInfo:
          | { id: string; name: string }
          | undefined;

        // First try to find in people array
        const personFromPeople = people.find(
          (p) => p.id === screen.memberId,
        );
        if (personFromPeople) {
          memberInfo = {
            id: personFromPeople.id,
            name: personFromPeople.name,
          };
        } else {
          // Fallback: search all pots for this member
          for (const p of pots) {
            const foundMember = p.members.find(
              (m) => m.id === screen.memberId,
            );
            if (foundMember) {
              memberInfo = {
                id: foundMember.id,
                name: foundMember.name,
              };
              break;
            }
          }
        }

        if (!memberInfo) return null;

        // Calculate shared pots and balances for this member
        const memberSharedPots = pots
          .filter((p) =>
            p.members.some((m) => m.id === screen.memberId),
          )
          .map((p) => {
            const memberExpenses = p.expenses
              .filter((e) => e.paidBy === screen.memberId)
              .reduce((sum, e) => sum + e.amount, 0);

            const memberShare = p.expenses.reduce((sum, e) => {
              const split = e.split.find(
                (s) => s.memberId === screen.memberId,
              );
              return sum + (split?.amount || 0);
            }, 0);

            const yourExpenses = p.expenses
              .filter((e) => e.paidBy === "owner")
              .reduce((sum, e) => sum + e.amount, 0);

            const yourShare = p.expenses.reduce((sum, e) => {
              const split = e.split.find(
                (s) => s.memberId === "owner",
              );
              return sum + (split?.amount || 0);
            }, 0);

            const yourBalance =
              yourExpenses -
              yourShare -
              (memberExpenses - memberShare);

            return {
              id: p.id,
              name: p.name,
              yourBalance,
            };
          });

        const totalBalance = memberSharedPots.reduce(
          (sum, p) => sum + p.yourBalance,
          0,
        );

        return (
          <MemberDetail
            memberId={memberInfo.id}
            memberName={memberInfo.name}
            trustScore={95}
            sharedPots={memberSharedPots}
            recentSettlements={[]}
            totalBalance={totalBalance}
            onBack={back}
            onSettle={() => {
              setSelectedCounterpartyId(memberInfo.id);
              push({ type: "settle-home" });
            }}
            onCopyPaymentDetails={() => {
              showToast("Payment details copied", "success");
            }}
          />
        );

      case "add-contribution":
        if (!pot) return null;
        return (
          <AddContribution
            potName={pot.name}
            baseCurrency={pot.baseCurrency}
            currentBalance={pot.totalPooled || 0}
            yieldRate={pot.yieldRate || 0}
            defiProtocol={pot.defiProtocol || "Acala"}
            onBack={back}
            onConfirm={addContribution}
          />
        );

      case "withdraw-funds":
        if (!pot) return null;

        // Calculate user's balance in the pot
        const userBalance = (pot.contributions || [])
          .filter((c) => c.memberId === "owner")
          .reduce((sum, c) => sum + c.amount, 0);

        return (
          <WithdrawFunds
            potName={pot.name}
            baseCurrency={pot.baseCurrency}
            yourBalance={userBalance}
            totalPooled={pot.totalPooled || 0}
            yieldRate={pot.yieldRate || 0}
            defiProtocol={pot.defiProtocol || "Acala"}
            onBack={back}
            onConfirm={withdrawFunds}
          />
        );

      case "request-payment":
        return (
          <RequestPayment
            people={balances.owedToYou.map((p) => ({
              id: p.id,
              name: p.name,
              totalAmount: p.totalAmount,
              breakdown: p.breakdown.map((b) => ({ potName: b.potName, amount: b.amount })),
              trustScore: p.trustScore,
              paymentPreference: p.paymentPreference ?? 'bank',
            }))}
            onBack={back}
            onSendRequest={(personId, message) => {
              const person = balances.owedToYou.find(
                (p) => p.id === personId,
              );
              if (!person) return;

              const notification: Notification = {
                id: Date.now().toString(),
                type: "settlement",
                title: "Payment request",
                message:
                  message ||
                  `You requested payment of ${person.totalAmount.toFixed(2)}`,
                timestamp: new Date().toISOString(),
                read: false,
              };

              setNotifications([
                notification,
                ...notifications,
              ]);

              showToast(
                `Request sent to ${person.name}`,
                "success",
              );
              triggerHaptic("light");
            }}
          />
        );

      default:
        return null;
    }
  };

  // Get FAB state for current context
  const fabState = getFabState();

  // Show loading screen ONLY while checking auth
  // localStorage loads in background - no blocking!
  if (authLoading) {
    return (
      <div className="relative w-[390px] h-[844px] mx-auto bg-background flex items-center justify-center">
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

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="relative w-[390px] h-[844px] mx-auto bg-background overflow-hidden">
        <LoginScreen />
      </div>
    );
  }

  return (
    <div className="relative w-[390px] h-[844px] mx-auto bg-background overflow-hidden">
      <SwipeableScreen
        onSwipeBack={canSwipeBack() ? back : undefined}
        key={screen?.type ?? 'screen'}
      >
        {renderScreen()}
      </SwipeableScreen>

      {/* Bottom Tab Bar with Context-Sensitive FAB */}
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

      {/* Batch Confirm Sheet */}
      {showBatchConfirm && (
        <BatchConfirmSheet
          expenses={pendingExpenses}
          onClose={() => setShowBatchConfirm(false)}
          onConfirm={handleBatchConfirmAll}
        />
      )}

      {/* Modals */}
      {showWalletSheet && (
        <WalletConnectionSheet
          isConnected={walletConnected}
          connectedWallet={connectedWallet}
          onConnect={(provider) => {
            // Simulate wallet connection
            setWalletConnected(true);
            setConnectedWallet({
              provider,
              address:
                "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
              name: "My Polkadot Wallet",
            });
            setShowWalletSheet(false);
            showToast(
              "Wallet connected successfully!",
              "success",
            );
          }}
          onDisconnect={() => {
            setWalletConnected(false);
            setConnectedWallet(undefined);
            setShowWalletSheet(false);
            showToast("Wallet disconnected", "info");
          }}
          onClose={() => setShowWalletSheet(false)}
        />
      )}

      {showNotifications && (
        <NotificationCenter
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onMarkAllRead={() => {
            setNotifications(
              notifications.map((n) => ({ ...n, read: true })),
            );
            triggerHaptic("light");
          }}
          onNotificationClick={(notification) => {
            // Mark as read when clicked
            setNotifications(
              notifications.map((n) =>
                n.id === notification.id
                  ? { ...n, read: true }
                  : n,
              ),
            );
            // Execute action if available
            notification.onAction?.();
          }}
        />
      )}

      {showYouSheet && (
        <YouSheet
          onClose={() => setShowYouSheet(false)}
          onShowQR={() => {
            setShowYouSheet(false);
            setShowMyQR(true);
          }}
          onScanQR={() => {
            setShowYouSheet(false);
            setShowScanQR(true);
          }}
          onPaymentMethods={() => {
            setShowYouSheet(false);
            push({ type: "payment-methods" });
          }}
          onViewInsights={() => {
            setShowYouSheet(false);
            push({ type: "insights" });
          }}
          onSettings={() => {
            setShowYouSheet(false);
            push({ type: "settings" });
          }}
          insights={youTabInsights}
        />
      )}

      {showMyQR && (
        <MyQR onClose={() => setShowMyQR(false)} onCopyHandle={() => showToast('Handle copied', 'info')} />
      )}
      {showScanQR && (
        <ScanQR onClose={() => setShowScanQR(false)} />
      )}

      {showChoosePot && (
        <ChoosePot
          pots={pots.filter(p => !p.archived).map((p) => ({
            id: p.id,
            name: p.name,
            myExpenses: p.expenses.filter(
              (e) => e.paidBy === "owner",
            ).length,
            totalExpenses: p.expenses.length,
            memberCount: p.members.length,
          }))}
          onClose={() => setShowChoosePot(false)}
          onCreatePot={() => push({ type: "create-pot" })}
          onSelectPot={(potId) => {
            setCurrentPotId(potId);
            setShowChoosePot(false);
            push({ type: "add-expense" });
          }}
        />
      )}

      {showAddPaymentMethod && (
        <AddPaymentMethod
          onClose={() => setShowAddPaymentMethod(false)}
          onSave={(method, setAsPreferred) => {
            const newId = Date.now().toString();
            setPaymentMethods([
              ...paymentMethods,
              { ...method, id: newId },
            ]);
            if (setAsPreferred) setPreferredMethodId(newId);
            setShowAddPaymentMethod(false);
            showToast("Payment method added", "success");
          }}
        />
      )}

      {selectedPaymentMethod && (
        <ViewPaymentMethod
          method={selectedPaymentMethod as PaymentMethod}
          onClose={() => setSelectedPaymentMethod(null)}
        />
      )}

      {showAddMember && currentPotId && (
        <AddMember
          onClose={() => setShowAddMember(false)}
          onAddExisting={(contactId) => {
            const person = people.find(
              (p) => p.id === contactId,
            );
            if (!person) return;

            setPots(
              pots.map((p) =>
                p.id === currentPotId
                  ? {
                      ...p,
                      members: [
                        ...p.members,
                        {
                          id: person.id,
                          name: person.name,
                          role: "Member",
                          status: "active",
                        },
                      ],
                    }
                  : p,
              ),
            );
            showToast(`${person.name} added to pot`, "success");
          }}
          onInviteNew={(nameOrEmail) => {
            // Create a pending member
            const newMemberId = `pending-${Date.now()}`;
            setPots(
              pots.map((p) =>
                p.id === currentPotId
                  ? {
                      ...p,
                      members: [
                        ...p.members,
                        {
                          id: newMemberId,
                          name: nameOrEmail,
                          role: "Member",
                          status: "pending",
                        },
                      ],
                    }
                  : p,
              ),
            );
            showToast(
              `Invite sent to ${nameOrEmail}`,
              "success",
            );
          }}
          onShowQR={() => {
            setShowAddMember(false);
            setShowMyQR(true);
          }}
          existingContacts={people.map((p) => ({
            id: p.id,
            name: p.name,
            trustScore: p.trustScore,
            paymentPreference: p.paymentPreference,
            sharedPots: pots.filter((pot) =>
              pot.members.some((m) => m.id === p.id),
            ).length,
          }))}
          currentMembers={
            getCurrentPot()?.members.map((m) => m.id) || []
          }
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type ?? 'info'} onClose={() => setToast(null)} />
      )}

      {/* Transaction Toast */}
      <TxToast />
    </div>
  );
}

// Wrap AppContent with providers
export default function App() {
  return (
    <FeatureFlagsProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </FeatureFlagsProvider>
  );
}

// Load debug helpers synchronously - always available for emergency fixes
import "./utils/debugHelpers";