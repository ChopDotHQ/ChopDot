import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
// Lazy import to avoid bundling Polkadot API eagerly
let polkadotChainService: any = null;
const getPolkadotChainService = async () => {
  if (!polkadotChainService) {
    const module = await import("./services/chain/polkadot");
    polkadotChainService = module.polkadotChainService;
  }
  return polkadotChainService;
};
import { useNav, type Screen } from "./nav";
import { useTheme } from "./utils/useTheme";
import { triggerHaptic } from "./utils/haptics";
import type { PersonSettlement, SettlementBreakdown } from "./utils/settlements";
import {
  calculateSettlements,
  calculatePotSettlements,
} from "./utils/settlements";
import { getSupabase } from "./utils/supabase-client";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { FeatureFlagsProvider, useFeatureFlags } from "./contexts/FeatureFlagsContext";
import { useAccount } from "./contexts/AccountContext";
import { cleanupBackupTimers } from "./services/backup/autoBackup";
import { attemptAutoRestore } from "./services/restore/autoRestore";
import { AuthScreen } from "./components/screens/AuthScreen";
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
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { ChoosePot } from "./components/screens/ChoosePot";
import { useData } from "./services/data/DataContext";
import { logDev, warnDev } from "./utils/logDev";
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
import { RequestPayment } from "./components/screens/RequestPayment";
import { CrustStorage } from "./components/screens/CrustStorage";
import { CrustAuthSetup } from "./components/screens/CrustAuthSetup";
import { ReceiveQR } from "./components/screens/ReceiveQR";
import { IPFSAuthOnboarding } from "./components/IPFSAuthOnboarding";
import { WalletConnectionSheet } from "./components/WalletConnectionSheet";
import { ImportPot } from "./components/screens/ImportPot";
import { Receipt, CheckCircle, ArrowLeftRight, Plus, LucideIcon } from "lucide-react";
import { setOnboardingCallback, resetOnboardingFlag } from "./services/storage/ipfsWithOnboarding";
import { usePots as useRemotePots } from "./hooks/usePots";

interface Member {
  id: string;
  name: string;
  role: "Owner" | "Member";
  status: "active" | "pending";
  address?: string;
  verified?: boolean;
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
  expiresAt: string;
  bypassedBy?: string;
  bypassedAt?: string;
}

type PotHistoryBase = {
  id: string;
  when: number;
  txHash?: string;
  block?: string;
  status: "submitted" | "in_block" | "finalized" | "failed";
  subscan?: string;
};

export type PotHistory =
  | (PotHistoryBase & {
      type: "onchain_settlement";
      fromMemberId: string;
      toMemberId: string;
      fromAddress: string;
      toAddress: string;
      amountDot: string;
      txHash: string;
      subscan: string;
      note?: string;
    })
  | (PotHistoryBase & {
      type: "remark_checkpoint";
      message: string;
      potHash: string;
      cid?: string;
    });

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
  checkpointEnabled?: boolean;
  currentCheckpoint?: ExpenseCheckpoint;
  archived?: boolean;
  history?: PotHistory[];
  createdAt?: string;
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
  iban?: string;
  holder?: string;
  note?: string;
  phone?: string;
  twintHandle?: string;
  email?: string;
  username?: string;
  network?: "polkadot" | "assethub";
  address?: string;
  label?: string;
}

interface ActivityItem {
  id: string;
  type: "expense" | "settlement" | "attestation" | "member" | "pot_created";
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

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const builderPartyMembersTemplate: Member[] = [
        {
          id: "owner",
          name: "You",
          role: "Owner",
          status: "active",
          address: "15GrwkvKWLJUXwKZFXChsVGdfnRDEhinYMiGWXnV8Pfv7Hjq",
        },
        {
          id: "alice",
          name: "Alice",
          role: "Member",
          status: "active",
          address: "15Jh2k3Xm29ry1CNtXNvzPTC2QgHYMnyqcG4cSnhpV9MrAbf",
        },
        {
          id: "bob",
          name: "Bob",
          role: "Member",
          status: "active",
          address: "13FJ4i6TJyGXPRvWHzRvDDDeZPAHDq6cHruM3aMcDwZJWLEH",
        },
        {
          id: "charlie",
          name: "Charlie",
          role: "Member",
          status: "active",
          address: "16Hk8qqBPGF6NQvM6PgZGZXzx9Dj2TqkBTsEz9wqgFudaGt3",
        },
];

type BuilderPartyExpenseTemplate = Omit<Expense, "date"> & { daysAgo: number };

const builderPartyExpenseTemplates: BuilderPartyExpenseTemplate[] = [
  {
    id: "pb1",
    amount: 1.2,
    currency: "DOT",
    paidBy: "owner",
    memo: "Hack lounge deposit",
    daysAgo: 6,
    split: [
      { memberId: "owner", amount: 0.3 },
      { memberId: "alice", amount: 0.3 },
      { memberId: "bob", amount: 0.3 },
      { memberId: "charlie", amount: 0.3 },
    ],
    attestations: ["alice", "bob", "charlie"],
    hasReceipt: true,
  },
  {
    id: "pb2",
    amount: 1.2,
    currency: "DOT",
    paidBy: "alice",
    memo: "Night market dinner",
    daysAgo: 4,
    split: [
      { memberId: "owner", amount: 0.3 },
      { memberId: "alice", amount: 0.3 },
      { memberId: "bob", amount: 0.3 },
      { memberId: "charlie", amount: 0.3 },
    ],
    attestations: ["owner", "charlie"],
    hasReceipt: true,
  },
  {
    id: "pb3",
    amount: 1.2,
    currency: "DOT",
    paidBy: "bob",
    memo: "Recharge snacks & coffee",
    daysAgo: 3,
    split: [
      { memberId: "owner", amount: 0.3 },
      { memberId: "alice", amount: 0.3 },
      { memberId: "bob", amount: 0.3 },
      { memberId: "charlie", amount: 0.3 },
    ],
    attestations: ["alice"],
    hasReceipt: false,
  },
  {
    id: "pb4",
    amount: 1.2,
    currency: "DOT",
    paidBy: "charlie",
    memo: "Badge print run",
    daysAgo: 1,
    split: [
      { memberId: "owner", amount: 0.3 },
      { memberId: "alice", amount: 0.3 },
      { memberId: "bob", amount: 0.3 },
      { memberId: "charlie", amount: 0.3 },
    ],
    attestations: [],
    hasReceipt: true,
  },
  {
    id: "pb5",
    amount: 0.001,
    currency: "DOT",
    paidBy: "bob",
    memo: "Micro-settlement demo",
    daysAgo: 0,
    split: [{ memberId: "owner", amount: 0.001 }],
    attestations: [],
    hasReceipt: false,
  },
];

const createBuilderPartyMembers = (): Member[] =>
  builderPartyMembersTemplate.map((member) => ({ ...member }));

const createBuilderPartyExpenses = (now = Date.now()): Expense[] =>
  builderPartyExpenseTemplates.map(({ daysAgo, ...expense }) => ({
    ...expense,
    date: new Date(now - daysAgo * DAY_IN_MS).toISOString(),
    split: expense.split.map((split) => ({ ...split })),
    attestations: [...expense.attestations],
  }));

const createPolkadotBuilderPartyPot = (now = Date.now()): Pot => ({
  id: "4",
  name: "Polkadot Builder Party",
  type: "expense",
  baseCurrency: "DOT",
  members: createBuilderPartyMembers(),
  expenses: createBuilderPartyExpenses(now),
  budget: 6,
  budgetEnabled: true,
  checkpointEnabled: false,
});

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

  const getInitialScreen = (): Screen => {
    const urlParams = new URLSearchParams(window.location.search);
    const cidParam = urlParams.get('cid');
    if (cidParam) {
      return { type: 'import-pot' };
    }
    
    // Read route from pathname
    const pathname = window.location.pathname;
    if (pathname === '/activity') {
      return { type: 'activity-home' };
    } else if (pathname === '/people') {
      return { type: 'people-home' };
    } else if (pathname === '/you') {
      return { type: 'you-tab' };
    } else if (pathname === '/' || pathname === '/pots') {
      return { type: 'pots-home' };
    }
    
    return { type: 'pots-home' };
  };

  const {
    current: screen,
    stack,
    push,
    back,
    reset,
    replace,
  } = useNav(getInitialScreen());

  const lastCidRef = useRef<string | null>(null);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const cidParam = urlParams.get('cid');
    
    if (cidParam !== lastCidRef.current) {
      lastCidRef.current = cidParam;
      
      if (cidParam && screen?.type !== 'import-pot') {
        reset({ type: 'import-pot' });
      } else if (!cidParam && screen?.type === 'import-pot') {
        reset({ type: 'pots-home' });
      }
    }
  }, [screen?.type, reset]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname;
      const routeToScreen: Record<string, Screen['type']> = {
        '/': 'pots-home',
        '/pots': 'pots-home',
        '/activity': 'activity-home',
        '/people': 'people-home',
        '/you': 'you-tab',
      };
      
      const screenType = routeToScreen[pathname];
      if (screenType && screen?.type !== screenType) {
        reset({ type: screenType } as Screen);
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [screen?.type, reset]);

  // Sync URL with current screen for tab navigation
  useEffect(() => {
    if (!screen) return;
    
    const screenToRoute: Record<string, string> = {
      'pots-home': '/pots',
      'activity-home': '/activity',
      'people-home': '/people',
      'you-tab': '/you',
    };
    
    const newPath = screenToRoute[screen.type];
    if (newPath && window.location.pathname !== newPath && window.location.pathname !== '/') {
      // Use replaceState to avoid adding unnecessary history entries
      // Only push when explicitly triggered by handleTabChange
      const isTabScreen = ['pots-home', 'activity-home', 'people-home', 'you-tab'].includes(screen.type);
      if (isTabScreen && stack.length === 1) {
        window.history.replaceState({}, '', newPath);
      }
    }
    
    // Handle root path - redirect to /pots
    if (window.location.pathname === '/' && screen.type === 'pots-home') {
      window.history.replaceState({}, '', '/pots');
    }
  }, [screen, stack.length]);

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
  const [fabQuickAddPotId, setFabQuickAddPotId] = useState<string | null>(null);
  const [showIPFSAuthOnboarding, setShowIPFSAuthOnboarding] = useState(false);
  const [pendingIPFSAction, setPendingIPFSAction] = useState<(() => Promise<void>) | null>(null);

  const [currentPotId, setCurrentPotId] = useState<
    string | null
  >(null);
  const [currentExpenseId, setCurrentExpenseId] = useState<
    string | null
  >(null);
  const [selectedCounterpartyId, setSelectedCounterpartyId] =
    useState<string | null>(null);
  const [invitesByPot, setInvitesByPot] = useState<Record<string, { id: string; invitee_email: string; status: string; token: string }[]>>({});
  const notifyPotRefresh = useCallback((potId: string) => {
    window.dispatchEvent(
      new CustomEvent("pot-refresh", { detail: { potId } }),
    );
  }, []);

  const [walletConnected, setWalletConnected] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<
    | { provider: string; address: string; name?: string }
    | undefined
  >();

  const joinProcessingRef = useRef(false);
  const fetchInvites = useCallback(
    async (potId: string) => {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data, error } = await supabase
        .from("invites")
        .select("id, invitee_email, status, token")
        .eq("pot_id", potId);
      if (error) {
        console.warn("[Invites] fetch failed", error.message);
        return;
      }
      setInvitesByPot((prev) => ({ ...prev, [potId]: data ?? [] }));
    },
    []
  );
  useEffect(() => {
    if (currentPotId) {
      fetchInvites(currentPotId);
    }
  }, [currentPotId, fetchInvites]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token") || url.searchParams.get("invite");
    if (!token || joinProcessingRef.current) return;
    joinProcessingRef.current = true;

    (async () => {
      try {
        const supabase = getSupabase();
        if (!supabase) {
          showToast("Supabase not configured", "error");
          return;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) {
          showToast("Log in to accept invite", "info");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-invite`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ token }),
          },
        );

        const result = await response.json().catch(() => ({}));
        if (!response.ok || result?.error) {
          showToast(result?.error || "Failed to accept invite", "error");
        } else {
          showToast("Invite accepted!", "success");
          const potId = result?.potId as string | undefined;
          if (potId) {
            setCurrentPotId(potId);
            reset({ type: "pot-home", potId });
            notifyPotRefresh(potId);
          }
        }

        // Clean token from URL
        const cleaned = new URL(window.location.href);
        cleaned.searchParams.delete("token");
        cleaned.searchParams.delete("invite");
        window.history.replaceState({}, "", cleaned.toString());
      } catch (err) {
        console.error("[Invite] accept failed", err);
        showToast("Failed to accept invite", "error");
      } finally {
        // Reset ref to allow processing another invite
        joinProcessingRef.current = false;
      }
    })();
  }, [reset, notifyPotRefresh, showToast]);

  const [settlements, setSettlements] = useState<Settlement[]>([]);

  const [pots, setPots] = useState<Pot[]>([]);

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

  const [notifications, setNotifications] = useState<Notification[]>([]);

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
            paymentPreference: member.address ? "DOT" : "Bank",
            potCount: 0,
          });
        }
        if (member.id !== 'owner') {
          const existing = peopleMap.get(member.id);
          if (existing && member.address) {
            existing.paymentPreference = 'DOT';
            (existing as any).address = member.address;
          }
        }
      });
    });

    return Array.from(peopleMap.values());
  }, [pots]);

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

  const [hasLoadedInitialData, setHasLoadedInitialData] =
    useState(false);

  const migrateAttestations = (expense: any) => {
    if (!expense.attestations || !Array.isArray(expense.attestations)) {
      return expense;
    }
    
    if (expense.attestations.length > 0 && typeof expense.attestations[0] === 'object') {
      return expense; // Already migrated
    }
    
    
    return expense;
  };

  useEffect(() => {
    (async () => {
      try {
        const savedPots = localStorage.getItem("chopdot_pots");
        if (savedPots && savedPots.length < 1000000) {
          const parsed = JSON.parse(savedPots);
          if (Array.isArray(parsed) && parsed.length > 0) {
            let migrated = parsed.map((pot: any) => ({
              ...pot,
              expenses: (pot.expenses || []).map(migrateAttestations),
              mode: pot.mode ?? 'casual',
              confirmationsEnabled: pot.confirmationsEnabled ?? (import.meta.env.VITE_REQUIRE_CONFIRMATIONS_DEFAULT === '1'),
              lastEditAt: pot.lastEditAt ?? new Date().toISOString(),
            }));
            
            const hasPolkadotBuilderParty = migrated.some((p: any) => p.id === "4");
            if (!hasPolkadotBuilderParty) {
              const polkadotBuilderPartyPot = {
                ...createPolkadotBuilderPartyPot(),
                mode: 'casual' as const,
                confirmationsEnabled: false,
                lastEditAt: new Date().toISOString()
              };
              migrated.push(polkadotBuilderPartyPot);
              try {
                const updatedJson = JSON.stringify(migrated);
                if (updatedJson.length < 1000000) {
                  localStorage.setItem("chopdot_pots", updatedJson);
                  localStorage.setItem("chopdot_pots_backup", updatedJson);
                  console.log('[App] Added Polkadot Builder Party pot to existing pots');
                }
              } catch (saveErr) {
                console.warn('[App] Failed to save updated pots:', saveErr);
              }
            }
            
            setPots(migrated as Pot[]);
            setHasLoadedInitialData(true);
            window.dispatchEvent(new CustomEvent('pots-refresh'));
            return;
          }
        }
        
        const backupPots = localStorage.getItem("chopdot_pots_backup");
        if (backupPots && backupPots.length < 1000000) {
          try {
            const parsed = JSON.parse(backupPots);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.warn("[ChopDot] Restored pots from backup");
              const migrated = parsed.map((pot: any) => ({
                ...pot,
                expenses: (pot.expenses || []).map(migrateAttestations),
                mode: pot.mode ?? 'casual',
                confirmationsEnabled: pot.confirmationsEnabled ?? (import.meta.env.VITE_REQUIRE_CONFIRMATIONS_DEFAULT === '1'),
                lastEditAt: pot.lastEditAt ?? new Date().toISOString(),
              }));
              setPots(migrated as Pot[]);
              setHasLoadedInitialData(true);
              try {
                localStorage.setItem("chopdot_pots", JSON.stringify(migrated));
              } catch (saveErr) {
                console.warn("[ChopDot] Failed to restore backup:", saveErr);
              }
              window.dispatchEvent(new CustomEvent('pots-refresh'));
              return;
            }
          } catch (e) {
            console.error("[ChopDot] Failed to restore from backup:", e);
          }
        }
        
        if (!hasLoadedInitialData) {
          const currentPots = pots.length > 0 ? pots : [
            {
              id: "1", name: "Devconnect Buenos Aires", type: "expense", baseCurrency: "USD",
              members: [{id: "owner", name: "You", role: "Owner", status: "active"}, {id: "alice", name: "Alice", role: "Member", status: "active"}, {id: "bob", name: "Bob", role: "Member", status: "active"}],
              expenses: [], budget: 500, budgetEnabled: true, checkpointEnabled: false
            },
            {
              id: "2", name: "Urbe Campus Rome", type: "expense", baseCurrency: "USD",
              members: [{id: "owner", name: "You", role: "Owner", status: "active"}, {id: "charlie", name: "Charlie", role: "Member", status: "active"}, {id: "diana", name: "Diana", role: "Member", status: "pending"}],
              expenses: [], budget: 3000, budgetEnabled: true, checkpointEnabled: false
            },
            {
              id: "3", name: "💰 Emergency Fund", type: "savings", baseCurrency: "DOT",
              members: [{id: "owner", name: "You", role: "Owner", status: "active"}],
              expenses: [], contributions: [], totalPooled: 750, yieldRate: 12.5, defiProtocol: "Acala", goalAmount: 5000, goalDescription: "Build a 6-month emergency fund"
            },
            createPolkadotBuilderPartyPot()
          ];
          
          try {
            const potsJson = JSON.stringify(currentPots);
            if (potsJson.length < 1000000) {
              localStorage.setItem("chopdot_pots", potsJson);
              localStorage.setItem("chopdot_pots_backup", potsJson);
              console.log('[App] Seeded initial pots to localStorage');
              if (pots.length === 0) {
                setPots(currentPots as Pot[]);
              }
              window.dispatchEvent(new CustomEvent('pots-refresh'));
            }
            setHasLoadedInitialData(true);
          } catch (e) {
            console.error('[App] Failed to seed initial pots:', e);
          }
        }
      } catch (e) {
        console.error("[ChopDot] Failed to load pots:", e);
        try {
          localStorage.removeItem("chopdot_pots");
        } catch (removeErr) {
          console.warn("[ChopDot] Failed to remove corrupted pots:", removeErr);
        }
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
        console.error("[ChopDot] Failed to load settlements:", e);
        try {
          localStorage.removeItem("chopdot_settlements");
        } catch (removeErr) {
          console.warn("[ChopDot] Failed to remove corrupted settlements:", removeErr);
        }
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

      setHasLoadedInitialData(true);
    })();
  }, []); // Only run once on mount - pots state has initial values

  useEffect(() => {
    if (!hasLoadedInitialData) return;

    const saveData = () => {
      try {
        const data = JSON.stringify(pots);
        if (data.length > 1000000) {
          console.warn(
            "[ChopDot] Pots data too large, not saving",
          );
          return;
        }
        localStorage.setItem("chopdot_pots", data);
      } catch (e) {
        console.error("[ChopDot] Failed to save pots:", e);
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

  useEffect(() => {
    if (!hasLoadedInitialData) return;
    if (account.status !== 'connected' || !account.address0) return;

    (async () => {
      try {
        const localPotsJson = localStorage.getItem('chopdot_pots');
        if (localPotsJson && localPotsJson.length > 0) {
          return;
        }

        console.log('[App] Attempting auto-restore from IPFS...');
        if (!account.address0) {
          console.log('[App] No wallet address, skipping auto-restore');
          return;
        }
        const restoredPots = await attemptAutoRestore(account.address0);
        
        if (restoredPots.length > 0) {
          setPots(restoredPots as Pot[]);
          showToast(`Restored ${restoredPots.length} pot(s) from backup`, 'success');
          console.log('[App] Auto-restore successful', { potCount: restoredPots.length });
        }
      } catch (error) {
        console.error('[App] Auto-restore failed:', error);
      }
    })();
  }, [hasLoadedInitialData, account.status, account.address0]);

  useEffect(() => {
    return () => {
      cleanupBackupTimers();
    };
  }, []);

  useEffect(() => {
    setOnboardingCallback((_walletAddress: string, onContinue: () => Promise<void>) => {
      setShowIPFSAuthOnboarding(true);
      setPendingIPFSAction(() => onContinue);
    });
  }, []);


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

  useEffect(() => {
    if (screen?.type === "pot-home" && screen.potId) {
      setCurrentPotId(screen.potId);
    } else if (screen?.type === "add-expense" && !currentPotId) {
      let lastPotHomeScreen: { type: "pot-home"; potId: string } | undefined;
      for (let i = stack.length - 1; i >= 0; i--) {
        const s = stack[i];
        if (s && s.type === "pot-home" && "potId" in s) {
          lastPotHomeScreen = s as { type: "pot-home"; potId: string };
          break;
        }
      }
      if (lastPotHomeScreen && lastPotHomeScreen.potId) {
        setCurrentPotId(lastPotHomeScreen.potId);
      }
    }
  }, [screen, stack, currentPotId]);

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
      return { visible: false, icon: Receipt, color: "var(--accent)", action: () => {} };
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
          }
        },
      };
    }

    if (activeTab === "people" || activeTab === "you") {
      return {
        visible: false,
        icon: Receipt,
        color: "var(--accent)",
        action: () => {},
      };
    }

    if (activeTab === "activity") {
      if (false && pendingExpenses.length > 0) {
        return {
          visible: true,
          icon: CheckCircle,
          color: "var(--success)",
          action: () => {
            triggerHaptic("light");
          },
        };
      } else {
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

  const getCurrentPot = () =>
    pots.find((p) => p.id === currentPotId);

  const createPot = async () => {
    let processedMembers = newPot.members || [];
    const { getMockAddressForMember, isSimulationMode } = await import('./utils/simulation');
    if (isSimulationMode() && (newPot.baseCurrency || "USD") === 'DOT') {
      processedMembers = processedMembers.map((m) => {
        if (!m.address) {
          const mockAddr = getMockAddressForMember(m.name);
          if (mockAddr) {
            return { ...m, address: mockAddr };
          }
        }
        return m;
      });
    }
    
    try {
      const createDto = {
        name: newPot.name || "Unnamed Pot",
        type: newPot.type || "expense",
        baseCurrency: (newPot.baseCurrency || "USD") as 'DOT' | 'USD',
        budget: newPot.budget ?? null,
        budgetEnabled: newPot.budgetEnabled ?? false,
        checkpointEnabled: newPot.type === "expense" ? false : undefined,
        goalAmount: newPot.goalAmount,
        goalDescription: newPot.goalDescription,
        members: processedMembers.map(m => ({
          id: m.id,
          name: m.name,
          address: m.address || null,
          verified: m.verified,
          role: m.role,
          status: m.status,
        })),
      };
      
      const createdPot = await potService.createPot(createDto);
      logDev(`Pot created via service`, { potId: createdPot.id });
      
      // If using Supabase, trigger a refresh to show the new pot
      if (usingSupabaseSource) {
        window.dispatchEvent(new CustomEvent('pots-refresh'));
      } else {
        // For local storage, update state directly
        setPots([...pots, createdPot as unknown as Pot]);
      }
      
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

      setCurrentPotId(createdPot.id);
      replace({ type: "pot-home", potId: createdPot.id });
      showToast("Pot created successfully!", "success");
    } catch (error) {
      warnDev('Service create failed', error);
      showToast('Failed to create pot', 'error');
    }
  };

  const addExpense = (data: {
    amount: number;
    currency: string;
    paidBy: string;
    memo: string;
    date: string;
    split: { memberId: string; amount: number }[];
    hasReceipt: boolean;
    receiptUrl?: string;
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
      ...(data.receiptUrl && { receiptUrl: data.receiptUrl }),
    };

    setPots(
      pots.map((p) => {
        if (p.id !== currentPotId) return p;

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

    (async () => {
      try {
        const createExpenseDTO = {
          potId: currentPotId,
          amount: expense.amount,
          currency: expense.currency,
          paidBy: expense.paidBy,
          memo: expense.memo,
          date: expense.date,
          split: expense.split,
          hasReceipt: expense.hasReceipt,
          ...((expense as any).receiptUrl && { receiptUrl: (expense as any).receiptUrl }),
        };

        await expenseService.addExpense(currentPotId, createExpenseDTO);
        logDev('[DataLayer] Expense added via service', { potId: currentPotId, expenseId: expense.id });
        notifyPotRefresh(currentPotId);
      } catch (error) {
        warnDev('[DataLayer] Service addExpense failed', error);
        showToast('Saved locally (service write failed)', 'info');
      }
    })();

    replace({ type: "pot-home", potId: currentPotId });
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
    receiptUrl?: string;
  }) => {
    if (!currentPotId || !currentExpenseId) return;

    setPots(
      pots.map((p) => {
        if (p.id !== currentPotId) return p;

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
                  receiptUrl: data.receiptUrl,
                }
              : e,
          ),
          currentCheckpoint: updatedCheckpoint,
        };
      }),
    );

    (async () => {
      try {
        const updateExpenseDTO = {
          amount: data.amount,
          currency: data.currency,
          paidBy: data.paidBy,
          memo: data.memo,
          date: data.date,
          split: data.split,
          hasReceipt: data.hasReceipt,
          receiptUrl: data.receiptUrl,
        };

        await expenseService.updateExpense(currentPotId, currentExpenseId, updateExpenseDTO);
        logDev('[DataLayer] Expense updated via service', { potId: currentPotId, expenseId: currentExpenseId });
        notifyPotRefresh(currentPotId);
      } catch (error) {
        warnDev('[DataLayer] Service updateExpense failed', error);
        showToast('Saved locally (service write failed)', 'info');
      }
    })();

    replace({ type: "pot-home", potId: currentPotId });
    showToast("Expense updated!", "success");
  };

  const deleteExpense = (expenseId?: string, { navigateBack = false }: { navigateBack?: boolean } = {}) => {
    if (!currentPotId) return;
    const targetExpenseId = expenseId || currentExpenseId;
    if (!targetExpenseId) return;

    setPots(
      pots.map((p) =>
        p.id === currentPotId
          ? {
              ...p,
              expenses: p.expenses.filter(
                (e) => e.id !== targetExpenseId,
              ),
            }
          : p,
      ),
    );

    (async () => {
      try {
        await expenseService.removeExpense(currentPotId, targetExpenseId);
        logDev('[DataLayer] Expense deleted via service', { potId: currentPotId, expenseId: targetExpenseId });
        notifyPotRefresh(currentPotId);
      } catch (error) {
        warnDev('[DataLayer] Service removeExpense failed', error);
        showToast('Saved locally (service write failed)', 'info');
      }
    })();

    if (navigateBack) {
      back();
    }
    showToast("Expense deleted", "info");
  };

  const attestExpense = (expenseId: string) => {
    if (!currentPotId) return;

    const pot = pots.find((p) => p.id === currentPotId);
    const expense = pot?.expenses.find(
      (e) => e.id === expenseId,
    );

    if (expense?.paidBy === "owner") {
      showToast("You can't confirm your own expense", "error");
      return;
    }

    const attestations = expense?.attestations ?? [];
    const isConfirmed = Array.isArray(attestations) && (
      (typeof attestations[0] === 'string' && attestations.includes("owner")) ||
      (typeof attestations[0] === 'object' && attestations.some((a: any) => a.memberId === "owner"))
    );

    if (isConfirmed) {
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
                        ...(Array.isArray(attestations) ? attestations : []),
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

  const batchAttestExpenses = (expenseIds: string[]) => {
    if (!currentPotId) return;

    const pot = pots.find((p) => p.id === currentPotId);
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

    if (validExpenseIds.length === 0) {
      showToast("No expenses to confirm", "info");
      return;
    }

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



  const handleLogout = async () => {
    try {
      triggerHaptic("medium");
      await logout();
      showToast("Logged out successfully", "success");
    } catch (error) {
      console.error("Logout failed:", error);
      showToast("Logout failed", "error");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      triggerHaptic("medium");
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

    const userContributions = (pot.contributions || [])
      .filter((c) => c.memberId === "owner")
      .reduce((sum, c) => sum + c.amount, 0);

    if (amount > userContributions) {
      showToast("Insufficient balance", "error");
      return;
    }

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

  const activities: ActivityItem[] = useMemo(() => {
    const start = performance.now();
    const items: ActivityItem[] = [];

    const personNames = new Map<string, string>();
    pots.forEach((pot) => {
      pot.members.forEach((m) => {
        if (!personNames.has(m.id)) personNames.set(m.id, m.name);
      });
    });

    // Add pot creation events
    pots.forEach((pot) => {
      if (pot.createdAt) {
        items.push({
          id: `pot-created-${pot.id}`,
          type: "pot_created",
          timestamp: pot.createdAt,
          title: `Created ${pot.name}`,
          subtitle: pot.type === 'savings' ? 'Savings pot' : 'Expense pot',
          amount: undefined,
        });
      }
    });

    pots.forEach((pot) => {
      pot.expenses.forEach((expense) => {
        items.push({
          id: expense.id,
          type: "expense",
          timestamp: expense.date,
          title: expense.memo,
          subtitle: `${pot.name} • Paid by ${expense.paidBy === "owner" ? "You" : expense.paidBy}`,
          amount: expense.amount,
        });

        expense.attestations.forEach((attesterId, index) => {
          const attestationId = `${expense.id}-attestation-${attesterId}`;

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

    settlements.forEach((s) => {
      const name = personNames.get(s.personId) || s.personId;
      const title = `Settled ${s.currency === 'DOT' ? s.amount.toFixed(6) + ' DOT' : '$' + s.amount.toFixed(2)} with ${name}`;
      items.push({
        id: s.id,
        type: 'settlement',
        timestamp: s.date,
        title,
        subtitle: s.potIds && s.potIds.length > 0 ? `${s.potIds.map(pid => pots.find(p => p.id === pid)?.name || 'Unknown').join(', ')}` : 'All pots',
        amount: s.amount,
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

  const totalOwed = balances.owedToYou.reduce(
    (sum, p) => sum + p.totalAmount,
    0,
  );

  const { pots: remotePots } = useRemotePots();
  const dataSourceType = import.meta.env.VITE_DATA_SOURCE || 'local';
  const usingSupabaseSource = dataSourceType === 'supabase';
  const remoteSyncSnapshot = useRef<string>("");

  useEffect(() => {
    if (!usingSupabaseSource || authLoading || !isAuthenticated) {
      return;
    }
    const serialized = JSON.stringify(remotePots);
    if (remoteSyncSnapshot.current === serialized) {
      return;
    }
    remoteSyncSnapshot.current = serialized;
    console.log('[App] Syncing remotePots to state', { count: remotePots.length, potIds: remotePots.map(p => p.id) });
    setPots(remotePots as unknown as Pot[]);
  }, [remotePots, usingSupabaseSource, authLoading, isAuthenticated]);
  const totalOwing = balances.youOwe.reduce(
    (sum, p) => sum + p.totalAmount,
    0,
  );

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

    let expensesNeedingConfirmation = 0;
    let expensesConfirmed = 0;

    pots.forEach((pot) => {
      pot.expenses.forEach((expense) => {
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
      expensesConfirmed,
      expensesNeedingConfirmation,
      confirmationRate,
      settlementsCompleted,
      activeGroups,
    };
  }, [pots, settlements]);

  useEffect(() => {
    if (!screen) return;

    const pot = getCurrentPot();
    const screenType = screen.type;

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
  }, [screen, pots, people, currentPotId, reset, replace]);

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
              } else if (activity.type === "pot_created") {
                const potId = activity.id.replace("pot-created-", "");
                const pot = pots.find((p) => p.id === potId);
                if (pot) {
                  setCurrentPotId(pot.id);
                  push({ type: "pot-home", potId: pot.id });
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
              if (DEMO_MODE) {
                showToast("Wallet disabled in demo", "info");
                return;
              }
              if (!POLKADOT_APP_ENABLED) {
                showToast("Wallet feature disabled", "info");
                return;
              }
              triggerHaptic("light");
              setShowWalletSheet(true);
            }}
            walletConnected={walletConnected}
            onRefresh={async () => {
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
              if (DEMO_MODE) {
                showToast("Wallet disabled in demo", "info");
                return;
              }
              if (!POLKADOT_APP_ENABLED) {
                showToast("Wallet feature disabled", "info");
                return;
              }
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
                const pid = pots[0]!.id;
                setCurrentPotId(pid);
                push({ type: "pot-home", potId: pid });
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
              if (DEMO_MODE) {
                showToast("Wallet disabled in demo", "info");
                return;
              }
              if (!POLKADOT_APP_ENABLED) {
                showToast("Wallet feature disabled", "info");
                return;
              }
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
            onReceive={() => {
              if (!connectedWallet && account.status !== 'connected') {
                showToast("Connect wallet first", "info");
                return;
              }
              triggerHaptic("light");
              push({ type: "receive-qr" });
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
            onCrustStorage={() => {
              push({ type: "crust-storage" });
            }}
            onNotificationClick={() => {
              triggerHaptic("light");
              setShowNotifications(true);
            }}
            onWalletClick={() => {
              if (DEMO_MODE) {
                showToast("Wallet disabled in demo", "info");
                return;
              }
              if (!POLKADOT_APP_ENABLED) {
                showToast("Wallet feature disabled", "info");
                return;
              }
              triggerHaptic("light");
              setShowWalletSheet(true);
            }}
            walletConnected={!!connectedWallet || account.status === 'connected'}
            notificationCount={
              notifications.filter((n) => !n.read).length
            }
            insights={youTabInsights}
            theme={theme}
            onThemeChange={setTheme}
            onLogout={handleLogout}
            onDeleteAccount={handleDeleteAccount}
            userName={user?.name || "You"}
            userEmail={user?.email}
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
            onCrustStorage={() =>
              push({ type: "crust-storage" })
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
                  address: m.address, // Preserve wallet address
                  verified: m.verified, // Preserve verification status
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
        const potInvites = invitesByPot[pot.id] || [];
        // Filter out accepted invites (they're now in pot.members via pot_members table)
        const pendingInvites = potInvites.filter((inv) => inv.status === "pending");
        const inviteMembers = pendingInvites.map((inv) => ({
          id: `invite-${inv.token}`,
          name: inv.invitee_email,
          role: "Member" as const,
          status: "pending" as const,
        }));
        const mergedMembers = [...pot.members, ...inviteMembers];
        return (
          <PotHome
            potId={pot.id}
            potType={pot.type}
            potName={pot.name}
            baseCurrency={pot.baseCurrency}
            members={mergedMembers}
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
            onImportPot={(importedPot) => {
              setPots([...pots, importedPot as Pot]);
              showToast("Pot imported successfully", "success");
              replace({ type: "pot-home", potId: importedPot.id });
            }}
            onAddExpense={() => push({ type: "add-expense" })}
            onExpenseClick={(expense) => {
              setCurrentExpenseId(expense.id);
              push({
                type: "expense-detail",
                expenseId: expense.id,
              });
            }}
            onSettle={() => {
              if (
                pot.checkpointEnabled !== false &&
                pot.type === "expense"
              ) {
                if (
                  pot.currentCheckpoint &&
                  pot.currentCheckpoint.status === "pending"
                ) {
                  push({ type: "checkpoint-status" });
                } else {
                  push({ type: "settle-selection" });
                }
              } else {
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

              (async () => {
                try {
                  await memberService.removeMember(currentPotId, memberId);
                  logDev('[DataLayer] Member removed via service', { potId: currentPotId, memberId });
                  notifyPotRefresh(currentPotId);
                } catch (error) {
                  console.error("[Member] remove failed", error);
                  warnDev('[DataLayer] Service removeMember failed', error);
                  showToast(error instanceof Error ? error.message : 'Failed to remove member', 'error');
                }
              })();

              showToast("Member removed", "info");
            }}
            onUpdateMember={(updatedMember) => {
              if (!currentPotId) return;
              const currentMember = pots.find(p => p.id === currentPotId)?.members.find(m => m.id === updatedMember.id);
              const previousAddress = currentMember?.address ?? null;
              const nextAddress = updatedMember.address ?? null;
              let toastLabel = "Member updated";
              if (previousAddress !== nextAddress) {
                if (nextAddress) {
                  toastLabel = previousAddress ? "DOT wallet updated" : "DOT wallet added";
                } else if (previousAddress) {
                  toastLabel = "Wallet removed";
                }
              }
              setPots(
                pots.map((p) =>
                  p.id === currentPotId
                    ? {
                        ...p,
                        members: p.members.map((m) =>
                          m.id === updatedMember.id
                            ? { ...m, ...updatedMember }
                            : m,
                        ),
                      }
                    : p,
                ),
              );

              (async () => {
                try {
                  const existingMember = pots.find(p => p.id === currentPotId)?.members.find(m => m.id === updatedMember.id);
                  const updateMemberDTO = {
                    name: updatedMember.name,
                    address: updatedMember.address || null,
                    verified: updatedMember.verified,
                    ...(existingMember?.status && { status: existingMember.status }),
                  };

                  await memberService.updateMember(currentPotId, updatedMember.id, updateMemberDTO);
                  logDev('[DataLayer] Member updated via service', { potId: currentPotId, memberId: updatedMember.id });
                  notifyPotRefresh(currentPotId);
                } catch (error) {
                  warnDev('[DataLayer] Service updateMember failed', error);
                  showToast('Saved locally (service write failed)', 'info');
                }
              })();

              showToast(toastLabel, "success");
            }}
            
            onDeletePot={async () => {
              if (!currentPotId) return;
              try {
                await potService.deletePot(currentPotId);
                setPots(pots.filter((p) => p.id !== currentPotId));
                showToast("Pot deleted", "success");
                reset({ type: "pots-home" });
              } catch (error: any) {
                console.error("[Pot] delete failed", error);
                showToast(error?.message || "Failed to delete pot", "error");
              }
            }}
            onLeavePot={() => {
              if (!currentPotId) return;
              const currentUserId = "owner";
              setPots(
                pots.map((p) =>
                  p.id === currentPotId
                    ? {
                        ...p,
                        members: p.members.filter((m) => m.id !== currentUserId),
                      }
                    : p,
                ),
              );
              showToast("You left the pot", "info");
              reset({ type: "pots-home" });
            }}
            onArchivePot={() => {
              if (!currentPotId) return;
              setPots(
                pots.map((p) =>
                  p.id === currentPotId
                    ? ({ ...p, archived: true } as any)
                    : p,
                ),
              );
              showToast("Pot archived", "info");
              reset({ type: "pots-home" });
            }}
            potHistory={pot.history || []}
            onUpdatePot={(updates) => {
              if (!currentPotId) return;
              setPots(
                pots.map((p) =>
                  p.id === currentPotId
                    ? {
                        ...p,
                        history: updates.history || p.history || [],
                      }
                    : p,
                ),
              );
              try {
                const stored = localStorage.getItem('pots');
                if (stored) {
                  const allPots = JSON.parse(stored);
                  const updated = allPots.map((p: any) =>
                    p.id === currentPotId
                      ? { ...p, history: updates.history || p.history || [] }
                      : p
                  );
                  localStorage.setItem('pots', JSON.stringify(updated));
                }
              } catch (e) {
                console.error('[App] Failed to persist pot history:', e);
              }
            }}
            onUpdateSettings={(settings) => {
              if (!currentPotId) return;
              setPots(
                pots.map((p) =>
                  p.id === currentPotId
                    ? {
                        ...p,
                        name: settings.potName !== undefined ? settings.potName : p.name,
                        baseCurrency:
                          settings.baseCurrency !== undefined
                            ? settings.baseCurrency
                            : p.baseCurrency,
                        budget: settings.budget !== undefined ? settings.budget : p.budget,
                        budgetEnabled: settings.budgetEnabled !== undefined ? settings.budgetEnabled : p.budgetEnabled,
                        checkpointEnabled:
                          settings.checkpointEnabled !== undefined
                            ? settings.checkpointEnabled
                            : p.checkpointEnabled,
                        archived:
                          typeof (settings as any).archived === 'boolean' ? (settings as any).archived : (p as any).archived,
                      }
                    : p,
                ),
              );
              if (settings.potName || settings.baseCurrency || settings.budget !== undefined) {
              showToast("Settings updated", "success");
              }
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
            onQuickAddSave={(data) => {
              setCurrentPotId(pot.id);
              addExpense(data);
            }}
            openQuickAdd={fabQuickAddPotId === pot.id}
            onClearQuickAdd={() => setFabQuickAddPotId(null)}
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
            baseCurrency={pot.baseCurrency}
            walletConnected={walletConnected}
            onBack={back}
            onEdit={() => {
              setCurrentExpenseId(expense.id);
              push({
                type: "edit-expense",
                expenseId: expense.id,
              });
            }}
            onDelete={() => deleteExpense(expense.id, { navigateBack: true })}
            onAttest={() => attestExpense(expense.id)}
            onCopyReceiptLink={() =>
              showToast("Receipt link copied", "success")
            }
            onUpdateExpense={(updates) => {
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

      case "settle-selection":
        const potSettlements =
          currentPotId && getCurrentPot()
            ? calculatePotSettlements(getCurrentPot()!, "owner")
            : balances;

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

        const currentPot = currentPotId ? getCurrentPot() : undefined;
        return (
          <SettleSelection
            potName={currentPot?.name}
            balances={selectionBalances}
            baseCurrency={currentPot?.baseCurrency || "USD"}
            onBack={() => {
              if (currentPotId) {
                replace({ type: "pot-home", potId: currentPotId });
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
        let personIdFromNav = screen.personId || selectedCounterpartyId;

        const settleScope = currentPotId ? "pot" : "global";
        const settleLabel = currentPotId
          ? getCurrentPot()?.name
          : "All pots";

        const scopedSettlements =
          currentPotId && getCurrentPot()
            ? calculatePotSettlements(getCurrentPot()!, "owner")
            : balances;

        if (!personIdFromNav) {
          const candidates = [
            ...scopedSettlements.youOwe.map((p) => ({ id: p.id, amount: Math.abs(p.totalAmount) })),
            ...scopedSettlements.owedToYou.map((p) => ({ id: p.id, amount: Math.abs(p.totalAmount) })),
          ];
          const best = candidates.sort((a, b) => b.amount - a.amount)[0];
          if (best && best.amount > 0) {
            personIdFromNav = best.id;
          }
        }

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

        const personData = personIdFromNav
          ? people.find((p) => p.id === personIdFromNav)
          : null;
        const preferredPaymentMethod =
          personData?.paymentPreference?.toLowerCase();

        let recipientAddress: string | undefined = undefined;
        if (personIdFromNav) {
          if (currentPotId) {
            const currentPot = pots.find(p => p.id === currentPotId);
            const recipientMember = currentPot?.members.find(m => m.id === personIdFromNav);
            recipientAddress = recipientMember?.address;
          } else {
            for (const pot of pots) {
              const recipientMember = pot.members.find(m => m.id === personIdFromNav);
              if (recipientMember?.address) {
                recipientAddress = recipientMember.address;
                break;
              }
            }
          }
        }

        return (
          <SettleHome
            settlements={activeSettlements}
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
            recipientAddress={recipientAddress}
            baseCurrency={currentPotId && getCurrentPot() ? getCurrentPot()!.baseCurrency : "USD"}
            onShowToast={showToast}
            pot={currentPotId && getCurrentPot() ? ({ ...getCurrentPot()!, mode: 'casual' as const } as any) : undefined}
            onUpdatePot={currentPotId ? (updates) => {
              const pot = getCurrentPot();
              if (pot) {
                setPots(pots.map(p => p.id === currentPotId ? { ...p, ...updates } : p));
              }
            } : undefined}
            onConfirm={async (method, reference) => {
              const newSettlement: Settlement = {
                id: Date.now().toString(),
                personId:
                  personIdFromNav ||
                  activeSettlements[0]?.id ||
                  "unknown",
                amount: settlementAmount,
                currency: (currentPotId && getCurrentPot() ? getCurrentPot()!.baseCurrency : "USD") as any,
                method: method as any,
                potIds: currentPotId
                  ? [currentPotId]
                  : undefined,
                date: new Date().toISOString(),
                txHash:
                  method === "dot" ? reference : undefined,
              };
              setSettlements([newSettlement, ...settlements]);

              if (settleScope === 'pot' && method === 'dot' && currentPotId && reference) {
                const fromAddress = connectedWallet?.address || '';
                const toAddress = recipientAddress || '';
                const service = await getPolkadotChainService();
                const historyEntry: PotHistory = {
                  id: `${Date.now()}`,
                  type: 'onchain_settlement',
                  fromMemberId: 'owner',
                  toMemberId: personIdFromNav || 'unknown',
                  fromAddress,
                  toAddress,
                  amountDot: String(Number(settlementAmount.toFixed(6))),
                  txHash: reference,
                  status: 'in_block',
                  when: Date.now(),
                  subscan: service.buildSubscanUrl(reference),
                };
                const updatedPots = pots.map(p => p.id === currentPotId ? { ...p, history: [historyEntry, ...(p.history || [])] } : p);
                setPots(updatedPots);
                try {
                  localStorage.setItem('pots', JSON.stringify(updatedPots));
                } catch (error) {
                  console.warn('[App] Failed to persist pot history to localStorage:', error);
                }
              }

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

              push({
                type: "settlement-confirmation",
                result: {
                  amount: Number(settlementAmount.toFixed(6)),
                  method: method as any,
                  counterpartyId: personIdFromNav || activeSettlements[0]?.id || "unknown",
                  counterpartyName,
                  scope: settleScope as "pot" | "person-all" | "expense",
                  ref: method === "bank" ? reference : undefined,
                  txHash: method === "dot" ? reference : undefined,
                  pots: currentPotId && getCurrentPot() ? [{ id: currentPotId, name: getCurrentPot()!.name, amount: Number(settlementAmount.toFixed(6)) }] : [],
                  at: Date.now(),
                },
              });
            }}
            onHistory={() => {
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
        const personNames = new Map<string, string>();
        pots.forEach((pot) => {
          pot.members.forEach((member) => {
            if (!personNames.has(member.id)) {
              personNames.set(member.id, member.name);
            }
          });
        });

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
            onBack={back}
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
        let memberInfo:
          | { id: string; name: string }
          | undefined;

        const personFromPeople = people.find(
          (p) => p.id === screen.memberId,
        );
        if (personFromPeople) {
          memberInfo = {
            id: personFromPeople.id,
            name: personFromPeople.name,
          };
        } else {
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

      case "crust-storage":
        return (
          <CrustStorage
            onAuthSetup={() => push({ type: "crust-auth-setup" })}
          />
        );

      case "crust-auth-setup":
        return (
          <CrustAuthSetup onBack={back} />
        );

      case "receive-qr": {
        const address = connectedWallet?.address || account.address0 || '';
        console.log('[receive-qr] Rendering with:', { 
          address, 
          hasConnectedWallet: !!connectedWallet,
          accountStatus: account.status,
          accountAddress: account.address0,
          screenType: screen?.type 
        });
        
        return (
          <ReceiveQR
            onClose={() => back()}
            walletAddress={address || 'No address found'}
          />
        );
      }

      case "import-pot": {
        const urlParams = new URLSearchParams(window.location.search);
        const cidParam = urlParams.get('cid');
        
        return (
          <ImportPot
            initialCid={cidParam || undefined}
            onBack={() => {
              const url = new URL(window.location.href);
              url.searchParams.delete('cid');
              window.history.replaceState({}, '', url.toString());
              reset({ type: 'pots-home' });
            }}
            onImport={(importedPot) => {
              const newPot: Pot = {
                ...importedPot,
                id: `${Date.now()}-${importedPot.id}`, // Ensure unique ID
                members: importedPot.members.map((m, idx) => ({
                  id: m.id || `member-${idx}`,
                  name: m.name,
                  address: m.address ?? null,
                  verified: m.verified ?? false,
                  role: (m.role === 'Owner' ? 'Owner' : (m.role === 'Member' ? 'Member' : undefined)) as 'Owner' | 'Member' | undefined,
                  status: (m.status || 'active') as string,
                })),
                expenses: importedPot.expenses.map((e, idx) => ({
                  ...e,
                  id: e.id || `expense-${idx}`,
                  currency: e.currency || importedPot.baseCurrency,
                })),
              } as Pot;
              
              setPots([...pots, newPot]);
              setCurrentPotId(newPot.id);
              
              const url = new URL(window.location.href);
              url.searchParams.delete('cid');
              window.history.replaceState({}, '', url.toString());
              
              replace({ type: 'pot-home', potId: newPot.id });
              showToast('Pot imported successfully!', 'success');
            }}
            onShowToast={showToast}
          />
        );
      }

      case "settle-cash":
      case "settle-bank":
      case "settle-dot":
        return null;

      default:
        return null;
    }
  };

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
      <SwipeableScreen
        onSwipeBack={canSwipeBack() ? back : undefined}
        key={screen?.type ?? 'screen'}
      >
        {renderScreen()}
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


      
      {showWalletSheet && (
        <WalletConnectionSheet
          isConnected={walletConnected}
          connectedWallet={connectedWallet}
          onConnect={(provider) => {
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
            setNotifications(
              notifications.map((n) =>
                n.id === notification.id
                  ? { ...n, read: true }
                  : n,
              ),
            );
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
            setFabQuickAddPotId(potId);
            setShowChoosePot(false);
            push({ type: "pot-home", potId });
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

            const newMember = {
              id: person.id,
              name: person.name,
              role: "Member" as const,
              status: "active" as const,
            };

            setPots(
              pots.map((p) =>
                p.id === currentPotId
                  ? {
                      ...p,
                      members: [
                        ...p.members,
                        newMember,
                      ],
                    }
                  : p,
              ),
            );

            (async () => {
              try {
                const createMemberDTO = {
                  potId: currentPotId!,
                  name: person.name,
                  role: "Member" as const,
                  status: "active" as const,
                  address: null, // Existing contact may not have address
                  verified: false,
                };

                await memberService.addMember(currentPotId!, createMemberDTO);
                logDev('[DataLayer] Member added via service', { potId: currentPotId, memberId: person.id });
              } catch (error) {
                warnDev('[DataLayer] Service addMember failed', error);
                showToast('Saved locally (service write failed)', 'info');
              }
            })();

            showToast(`${person.name} added to pot`, "success");
          }}
          onInviteNew={(nameOrEmail) => {
            const supabase = getSupabase();
            const email = nameOrEmail.trim();
            if (!currentPotId) {
              showToast("Select a pot first", "error");
              return;
            }
            if (!supabase) {
              showToast("Supabase is not configured", "error");
              return;
            }

            (async () => {
              try {
                const { data: userData, error: userError } = await supabase.auth.getUser();
                if (userError || !userData.user) {
                  showToast("Log in to invite members", "error");
                  return;
                }

                const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
                const { data, error } = await supabase
                  .from("invites")
                  .insert({
                    pot_id: currentPotId!,
                    invitee_email: email,
                    expires_at: expiresAt,
                    created_by: userData.user.id,
                  })
                  .select("token, pot_id")
                  .maybeSingle();

                if (error) {
                  console.error("[Invite] failed to create invite", error);
                  showToast(error.message || "Failed to send invite", "error");
                  return;
                }

                const token = data?.token;
                if (!token) {
                  showToast("Invite created but no token returned", "error");
                  return;
                }

                const link = `${window.location.origin}/join?token=${token}`;
                try {
                  await navigator.clipboard?.writeText(link);
                  showToast(`Invite ready for ${email}. Link copied.`, "success");
                } catch {
                  showToast(`Invite ready for ${email}. Copy this link:\n${link}`, "success");
                }

                fetchInvites(currentPotId!);
              } catch (err: any) {
                console.error("[Invite] unexpected error", err);
                showToast("Failed to send invite", "error");
              }
            })();
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

      <Toaster />

      <TxToast />

      
      {showIPFSAuthOnboarding && account.address0 && (
        <IPFSAuthOnboarding
          walletAddress={account.address0}
          onContinue={async () => {
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
          }}
          onCancel={() => {
            setShowIPFSAuthOnboarding(false);
            setPendingIPFSAction(null);
            resetOnboardingFlag(); // Reset flag so user can try again later
          }}
        />
      )}

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
