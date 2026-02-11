import {
  lazy,
  Suspense,
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
import { AppRouter } from "./components/AppRouter";
import { Screen, useNav } from "./nav";
import { useTheme } from "./utils/useTheme";
import { triggerHaptic } from "./utils/haptics";
import type { PersonSettlement, SettlementBreakdown } from "./utils/settlements";
import Decimal from "decimal.js";
import { InviteService } from "./services/InviteService";
import { AcceptInviteModal } from "./components/modals/AcceptInviteModal";
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
import { isBaseCurrency } from "./schema/pot";
import { AuthScreen } from "./components/screens/AuthScreen";
import { ActivityHome } from "./components/screens/ActivityHome";
import { PotsHome } from "./components/screens/PotsHome";
import { PeopleHome } from "./components/screens/PeopleHome";
import { BottomTabBar } from "./components/BottomTabBar";
import { SwipeableScreen } from "./components/SwipeableScreen";
import { toast } from "sonner";
import { useData } from "./services/data/DataContext";
import { logDev, warnDev } from "./utils/logDev";
import { YouTab } from "./components/screens/YouTab";
import { AppOverlays } from "./components/app/AppOverlays";
import { Receipt, CheckCircle, ArrowLeftRight, Plus, LucideIcon } from "lucide-react";
import { setOnboardingCallback, resetOnboardingFlag } from "./services/storage/ipfsWithOnboarding";
import { usePots as useRemotePots } from "./hooks/usePots";
import { usePot as useRemotePot } from "./hooks/usePot";
import type { PaymentMethod } from "./components/screens/PaymentMethods";
import type { Notification } from "./components/screens/NotificationCenter";

const Settings = lazy(() =>
  import("./components/screens/Settings").then((module) => ({ default: module.Settings }))
);
const PaymentMethods = lazy(() =>
  import("./components/screens/PaymentMethods").then((module) => ({ default: module.PaymentMethods }))
);
const CreatePot = lazy(() =>
  import("./components/screens/CreatePot").then((module) => ({ default: module.CreatePot }))
);
const PotHome = lazy(() =>
  import("./components/screens/PotHome").then((module) => ({ default: module.PotHome }))
);
const AddExpense = lazy(() =>
  import("./components/screens/AddExpense").then((module) => ({ default: module.AddExpense }))
);
const ExpenseDetail = lazy(() =>
  import("./components/screens/ExpenseDetail").then((module) => ({ default: module.ExpenseDetail }))
);
const SettleSelection = lazy(() =>
  import("./components/screens/SettleSelection").then((module) => ({ default: module.SettleSelection }))
);
const SettleHome = lazy(() =>
  import("./components/screens/SettleHome").then((module) => ({ default: module.SettleHome }))
);
const SettlementHistory = lazy(() =>
  import("./components/screens/SettlementHistory").then((module) => ({ default: module.SettlementHistory }))
);
const SettlementConfirmation = lazy(() =>
  import("./components/screens/SettlementConfirmation").then((module) => ({ default: module.SettlementConfirmation }))
);
const InsightsScreen = lazy(() =>
  import("./components/screens/InsightsScreen").then((module) => ({ default: module.InsightsScreen }))
);
const MemberDetail = lazy(() =>
  import("./components/screens/MemberDetail").then((module) => ({ default: module.MemberDetail }))
);
const AddContribution = lazy(() =>
  import("./components/screens/AddContribution").then((module) => ({ default: module.AddContribution }))
);
const WithdrawFunds = lazy(() =>
  import("./components/screens/WithdrawFunds").then((module) => ({ default: module.WithdrawFunds }))
);
const RequestPayment = lazy(() =>
  import("./components/screens/RequestPayment").then((module) => ({ default: module.RequestPayment }))
);
const CrustStorage = lazy(() =>
  import("./components/screens/CrustStorage").then((module) => ({ default: module.CrustStorage }))
);
const CrustAuthSetup = lazy(() =>
  import("./components/screens/CrustAuthSetup").then((module) => ({ default: module.CrustAuthSetup }))
);
const ReceiveQR = lazy(() =>
  import("./components/screens/ReceiveQR").then((module) => ({ default: module.ReceiveQR }))
);
const ImportPot = lazy(() =>
  import("./components/screens/ImportPot").then((module) => ({ default: module.ImportPot }))
);

import {
  Member,
  Expense,
  Contribution,
  PotHistory,
  Pot,
  Settlement,
  ActivityItem,
  Person,
  CheckpointConfirmation,
  ExpenseCheckpoint
} from "./types/app";
import {
  normalizeMembers,
  normalizeExpenses,
  normalizeConfirmations,
  normalizeHistory
} from "./utils/normalization";

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
  const isGuest = user?.authMethod === 'guest';
  const userEmail = (user as any)?.email as string | undefined;

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
  const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isProcessingInvite, setIsProcessingInvite] = useState(false);
  const [fabQuickAddPotId, setFabQuickAddPotId] = useState<string | null>(null);
  const clearFabQuickAddPotId = useCallback(() => setFabQuickAddPotId(null), [setFabQuickAddPotId]);
  const [showIPFSAuthOnboarding, setShowIPFSAuthOnboarding] = useState(false);
  const [pendingIPFSAction, setPendingIPFSAction] = useState<(() => Promise<void>) | null>(null);

  // Initialize InviteService
  const inviteService = useMemo(() => new InviteService(getSupabase()), []);

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


  const copyInviteLink = useCallback(
    async (potId: string) => {
      const invites = await inviteService.getPotInvites(potId);
      // Logic: find a valid one or use the latest
      // For now, let's grab the latest pending one or just the latest one
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

  const joinProcessingRef = useRef(false);
  const [pendingInvites, setPendingInvites] = useState<
    Array<{ id: string; token: string; created_at?: string; expires_at?: string }>
  >([]);

  const refreshPendingInvites = useCallback(async () => {
    const invites = await inviteService.getMyPendingInvites();
    setPendingInvites(invites);
  }, [inviteService]);

  useEffect(() => {
    if (authLoading) return;
    refreshPendingInvites();
  }, [authLoading, isAuthenticated, user?.id, refreshPendingInvites]);

  // Ensure the public.users profile exists (and has a display name) for this auth user.
  // This improves member displays in shared pots (e.g., pot_members -> users.name).
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
    [inviteService]
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
      } else {
        showToast("Invite accepted!", "success");
        if (result.potId) {
          setCurrentPotId(result.potId);
          reset({ type: "pot-home", potId: result.potId });
          notifyPotRefresh(result.potId);
        }
        refreshPendingInvites();
        cleanInviteParams();
        setShowInviteModal(false);
      }
    },
    [inviteService, showToast, reset, notifyPotRefresh, refreshPendingInvites, cleanInviteParams],
  );

  const declineInvite = useCallback(
    async (token: string) => {
      setIsProcessingInvite(true);
      const result = await inviteService.declineInvite(token);
      setIsProcessingInvite(false);

      if (!result.success) {
        showToast(result.error || "Failed to decline invite", "error");
      } else {
        showToast("Invite declined", "success");
        refreshPendingInvites();
        cleanInviteParams();
        setShowInviteModal(false);
      }
    },
    [inviteService, showToast, refreshPendingInvites, cleanInviteParams],
  );

  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token") || url.searchParams.get("invite");
    if (!token || joinProcessingRef.current) return;
    joinProcessingRef.current = true;

    setPendingInviteToken(token);
    setShowInviteModal(true);
  }, [cleanInviteParams]);

  const confirmPendingInvite = useCallback(async () => {
    if (!pendingInviteToken) return;
    await acceptInvite(pendingInviteToken);
  }, [pendingInviteToken, acceptInvite]);

  const cancelPendingInvite = useCallback(() => {
    // If we want to decline on cancel:
    // if (pendingInviteToken) declineInvite(pendingInviteToken);
    // OR just close modal:
    setPendingInviteToken(null);
    setShowInviteModal(false);
    joinProcessingRef.current = false;
    cleanInviteParams();
  }, [cleanInviteParams]);

  const [settlements, setSettlements] = useState<Settlement[]>([]);

  const [pots, setPots] = useState<Pot[]>([]);

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
      currency?: string;
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
            currency: expense.currency ?? pot.baseCurrency ?? 'USD',
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
    const isSupabase = import.meta.env.VITE_DATA_SOURCE === 'supabase';
    if (isSupabase && !authLoading && user && !isGuest) {
      try {
        localStorage.removeItem("chopdot_pots");
        localStorage.removeItem("chopdot_pots_backup");
      } catch (e) {
        console.warn('[App] Failed to clear local pots in supabase mode', e);
      }
      setHasLoadedInitialData(true);
      return;
    }

    if (hasLoadedInitialData) {
      return;
    }

    if (isSupabase && authLoading) {
      return;
    }

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
              members: [{ id: "owner", name: "You", role: "Owner", status: "active" }, { id: "alice", name: "Alice", role: "Member", status: "active" }, { id: "bob", name: "Bob", role: "Member", status: "active" }],
              expenses: [], budget: 500, budgetEnabled: true, checkpointEnabled: false
            },
            {
              id: "2", name: "Urbe Campus Rome", type: "expense", baseCurrency: "USD",
              members: [{ id: "owner", name: "You", role: "Owner", status: "active" }, { id: "charlie", name: "Charlie", role: "Member", status: "active" }, { id: "diana", name: "Diana", role: "Member", status: "pending" }],
              expenses: [], budget: 3000, budgetEnabled: true, checkpointEnabled: false
            },
            {
              id: "3", name: "💰 Emergency Fund", type: "savings", baseCurrency: "DOT",
              members: [{ id: "owner", name: "You", role: "Owner", status: "active" }],
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
  }, [authLoading, hasLoadedInitialData, isGuest, pots, user]); // Load local pots for guests or non-supabase

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
          }
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
      action: () => { },
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

  const createPot = async () => {
    let processedMembers = newPot.members || [];
    const { getMockAddressForMember, isSimulationMode } = await import('./utils/simulation');
    const rawBaseCurrency = newPot.baseCurrency || "USD";
    const baseCurrency = isBaseCurrency(rawBaseCurrency) ? rawBaseCurrency : "USD";

    if (isSimulationMode() && baseCurrency === 'DOT') {
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
        baseCurrency,
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

  const addExpenseToPot = (
    potId: string,
    data: {
      amount: number;
      currency: string;
      paidBy: string;
      memo: string;
      date: string;
      split: { memberId: string; amount: number }[];
      hasReceipt: boolean;
      receiptUrl?: string;
    },
  ) => {
    if (!potId) return;

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
        if (p.id !== potId) return p;

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
          potId,
          amount: expense.amount,
          currency: expense.currency,
          paidBy: expense.paidBy,
          memo: expense.memo,
          date: expense.date,
          split: expense.split,
          hasReceipt: expense.hasReceipt,
          ...((expense as any).receiptUrl && { receiptUrl: (expense as any).receiptUrl }),
        };

        await expenseService.addExpense(potId, createExpenseDTO);
        logDev('[DataLayer] Expense added via service', { potId, expenseId: expense.id });
        notifyPotRefresh(potId);
      } catch (error) {
        warnDev('[DataLayer] Service addExpense failed', error);
        const message =
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : 'Unknown error';
        showToast(`Saved locally (service write failed): ${message}`, 'info');
      }
    })();

    replace({ type: "pot-home", potId });
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
    const pot = currentPot;
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
    const pot = currentPot;
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
          amount: String(expense.amount),
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
      const title = `Settled ${s.currency === 'DOT' ? new Decimal(s.amount).toFixed(6) + ' DOT' : '$' + new Decimal(s.amount).toFixed(2)} with ${name}`;
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
    (sum, p) => sum + Number(p.totalAmount),
    0,
  );

  const { pots: remotePots, loading: remotePotsLoading } = useRemotePots();
  const dataSourceType = import.meta.env.VITE_DATA_SOURCE || 'local';
  const usingSupabaseSource = dataSourceType === 'supabase' && !authLoading && !!user && !isGuest;
  const remoteSyncSnapshot = useRef<string>("");
  const hasRemotePot = useMemo(
    () => (currentPotId ? remotePots.some((p) => p.id === currentPotId) : false),
    [remotePots, currentPotId],
  );
  const {
    pot: remoteCurrentPot,
    loading: currentPotLoading,
    error: currentPotError,
  } = useRemotePot(usingSupabaseSource ? currentPotId : null);

  const fallbackRemotePot = useMemo(
    () =>
      usingSupabaseSource && currentPotId
        ? remotePots.find((p) => p.id === currentPotId) || null
        : null,
    [usingSupabaseSource, currentPotId, remotePots],
  );

  const currentPot = usingSupabaseSource
    ? (remoteCurrentPot ?? fallbackRemotePot) as Pot | null | undefined
    : (pots.find((p) => p.id === currentPotId) as Pot | undefined);

  // Preserve last known pot to avoid UI snapback while remote detail loads
  const lastPotRef = useRef<Pot | null>(null);
  useEffect(() => {
    if (currentPot) {
      lastPotRef.current = currentPot as Pot;
    }
  }, [currentPot]);
  const potForView = usingSupabaseSource ? currentPot ?? lastPotRef.current : currentPot;

  const normalizedCurrentPot = potForView
    ? ({
      ...potForView,
      members: normalizeMembers(potForView.members),
      expenses: normalizeExpenses(potForView.expenses, potForView.baseCurrency),
      history: normalizeHistory(potForView.history || []),
      budget: potForView.budget ?? undefined,
      goalAmount: potForView.goalAmount ?? undefined,
      totalPooled: potForView.totalPooled ?? undefined,
    } as Pot)
    : undefined;

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

  useEffect(() => {
    if (
      usingSupabaseSource &&
      currentPotId &&
      !currentPot &&
      !currentPotLoading &&
      currentPotError &&
      !hasRemotePot
    ) {
      showToast('Pot not found or you no longer have access.', 'error');
    }
  }, [usingSupabaseSource, currentPotId, currentPot, currentPotLoading, currentPotError, hasRemotePot, reset]);
  // Calculate expenses stats for YouTab insights
  const { expensesConfirmed, expensesNeedingConfirmation, monthlySpending } = useMemo(() => {
    const currentUserId = user?.id || 'owner';
    const allExpenses = pots.flatMap(p => p.expenses);

    const confirmed = allExpenses.filter(e =>
      e.attestations.includes(currentUserId)
    ).length;

    const needingConfirmation = allExpenses.filter(e =>
      !e.attestations.includes(currentUserId) &&
      e.paidBy !== currentUserId
    ).length;

    const currentMonthIndices = allExpenses
      .filter(e => {
        const d = new Date(e.date);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });

    const spending = currentMonthIndices
      .filter(e => e.paidBy === currentUserId)
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      expensesConfirmed: confirmed,
      expensesNeedingConfirmation: needingConfirmation,
      monthlySpending: spending
    };
  }, [pots, user?.id]);

  const totalOwing = balances.youOwe.reduce(
    (sum, p) => sum + Number(p.totalAmount),
    0,
  );

  // Calculate Insights for YouTab
  const youTabInsights = useMemo(() => {
    const confirmationRate =
      expensesConfirmed + expensesNeedingConfirmation > 0
        ? Math.round(
          (expensesConfirmed / (expensesConfirmed + expensesNeedingConfirmation)) *
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

  const existingContacts = useMemo(() => (
    people.map((person) => ({
      id: person.id,
      name: person.name,
      trustScore: person.trustScore,
      paymentPreference: person.paymentPreference,
      sharedPots: pots.filter((pot) =>
        pot.members.some((member) => member.id === person.id),
      ).length,
    }))
  ), [people, pots]);

  const currentMemberIds = useMemo(
    () => currentPot?.members.map((member) => member.id) || [],
    [currentPot]
  );

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

  const handleAddMemberExisting = useCallback((contactId: string) => {
    const person = people.find((candidate) => candidate.id === contactId);
    if (!person || !currentPotId) {
      return;
    }

    const newMember = {
      id: person.id,
      name: person.name,
      role: "Member" as const,
      status: "active" as const,
    };

    setPots((prev) =>
      prev.map((pot) =>
        pot.id === currentPotId
          ? {
            ...pot,
            members: [...pot.members, newMember],
          }
          : pot,
      ),
    );

    (async () => {
      try {
        const createMemberDTO = {
          potId: currentPotId,
          name: person.name,
          role: "Member" as const,
          status: "active" as const,
          address: null,
          verified: false,
        };

        await memberService.addMember(currentPotId, createMemberDTO);
        logDev('[DataLayer] Member added via service', { potId: currentPotId, memberId: person.id });
      } catch (error) {
        warnDev('[DataLayer] Service addMember failed', error);
        showToast('Saved locally (service write failed)', 'info');
      }
    })();

    showToast(`${person.name} added to pot`, "success");
  }, [currentPotId, memberService, people, showToast]);

  const handleInviteNew = useCallback((nameOrEmail: string) => {
    const email = nameOrEmail.trim().toLowerCase();
    if (!currentPotId) {
      showToast("Select a pot first", "error");
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
  }, [currentPotId, inviteService, fetchInvites, showToast]);

  const handleRevokeInvite = useCallback(async (memberId: string) => {
    // memberId for pending invites is "invite-{id}"
    const inviteId = memberId.startsWith("invite-") ? memberId.replace("invite-", "") : memberId;

    // Optimistic update?
    // For now just wait for server
    const { error } = await inviteService.revokeInvite(inviteId);
    if (error) {
      showToast(error, "error");
    } else {
      showToast("Invite revoked", "success");
      if (currentPotId) fetchInvites(currentPotId);
    }
  }, [inviteService, currentPotId, fetchInvites, showToast]);

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
              setShowChoosePot, setShowAddPaymentMethod, setPaymentMethods,
              setPreferredMethodId, setTheme, setFabQuickAddPotId, setNewPot,
              setSelectedCounterpartyId, setSettlements,
              createPot, addExpenseToPot, updateExpense, deleteExpense, attestExpense,
              batchAttestExpenses, addContribution, withdrawFunds, handleLogout,
              handleDeleteAccount, updatePaymentMethodValue, setPreferredMethod,
              handleInviteNew, acceptInvite, declineInvite, showToast,
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
