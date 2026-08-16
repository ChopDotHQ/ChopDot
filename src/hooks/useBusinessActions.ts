import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Screen } from "../nav";
import type { Expense, Pot } from "../types/app";
import type { PaymentMethod } from '../App';
import { isBaseCurrency } from "../schema/pot";
import { triggerHaptic } from "../utils/haptics";
import { logDev, warnDev } from "../utils/logDev";
import { refreshPots } from "./usePots";

type ToastType = "success" | "error" | "info";

type ExpenseInput = {
  amount: number;
  currency: string;
  paidBy: string;
  memo: string;
  date: string;
  split: { memberId: string; amount: number }[];
  hasReceipt: boolean;
  receiptUrl?: string;
};

const UUID_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const shouldAttemptRemotePotWrite = (
  potId: string,
  usingSupabaseSource: boolean,
): boolean => {
  if (!usingSupabaseSource) {
    return true;
  }
  return UUID_LIKE_REGEX.test(potId);
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }
  return "Unknown error";
};

const isPotNotFoundError = (message: string): boolean =>
  /Pot with id .+ not found/i.test(message);

type UseBusinessActionsParams = {
  newPot: Partial<Pot>;
  setNewPot: Dispatch<SetStateAction<Partial<Pot>>>;
  potService: {
    createPot: (input: any) => Promise<any>;
    updatePot: (id: string, updates: Record<string, unknown>) => Promise<any>;
    deletePot: (id: string) => Promise<void>;
  };
  usingSupabaseSource: boolean;
  pots: Pot[];
  setPots: Dispatch<SetStateAction<Pot[]>>;
  setCurrentPotId: Dispatch<SetStateAction<string | null>>;
  replace: (screen: Screen) => void;
  back: () => void;
  showToast: (message: string, type?: ToastType) => void;
  expenseService: {
    addExpense: (potId: string, dto: any) => Promise<any>;
    updateExpense: (potId: string, expenseId: string, dto: any) => Promise<any>;
    removeExpense: (potId: string, expenseId: string) => Promise<void>;
  };
  notifyPotRefresh: (potId: string) => void;
  currentPotId: string | null;
  currentExpenseId: string | null;
  currentPot: Pot | null | undefined;
  logout: () => Promise<void>;
  paymentMethods: PaymentMethod[];
  setPaymentMethods: Dispatch<SetStateAction<PaymentMethod[]>>;
  setPreferredMethodId: Dispatch<SetStateAction<string>>;
};

export const useBusinessActions = ({
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
  currentPot: _currentPot,
  logout,
  paymentMethods,
  setPaymentMethods,
  setPreferredMethodId,
}: UseBusinessActionsParams) => {
  const createPot = useCallback(async () => {
    const processedMembers = newPot.members || [];
    const rawBaseCurrency = newPot.baseCurrency || "USD";
    const baseCurrency = isBaseCurrency(rawBaseCurrency) ? rawBaseCurrency : "USD";

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
        members: processedMembers.map((m) => ({
          id: m.id,
          name: m.name,
          address: m.address || null,
          verified: m.verified,
          role: m.role,
          status: m.status,
        })),
      };

      const createdPot = await potService.createPot(createDto);
      logDev("Pot created via service", { potId: createdPot.id });

      if (usingSupabaseSource) {
        refreshPots(); // increments globalRefreshTrigger so usePots handler fires
      } else {
        setPots([...pots, createdPot as Pot]);
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
      warnDev("Service create failed", error);
      const message = getErrorMessage(error);
      showToast(`Failed to create pot: ${message}`, "error");
    }
  }, [
    newPot,
    potService,
    usingSupabaseSource,
    setPots,
    pots,
    setNewPot,
    setCurrentPotId,
    replace,
    showToast,
  ]);

  const addExpenseToPot = useCallback(async (potId: string, data: ExpenseInput) => {
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
          p.currentCheckpoint.confirmations.get("owner")?.confirmed
        ) {
          const updatedConfirmations = new Map(p.currentCheckpoint.confirmations);
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

    try {
      if (!shouldAttemptRemotePotWrite(potId, usingSupabaseSource)) {
        logDev("[DataLayer] Skipping remote addExpense for local-only pot id", { potId });
      } else {
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
        logDev("[DataLayer] Expense added via service", { potId, expenseId: expense.id });
        notifyPotRefresh(potId);
      }

      replace({ type: "pot-home", potId });
      showToast("Expense added successfully!", "success");
    } catch (error) {
      warnDev("[DataLayer] Service addExpense failed", error);
      const message = getErrorMessage(error);
      if (isPotNotFoundError(message)) {
        replace({ type: "pot-home", potId });
        showToast("Saved locally only. Remote pot unavailable.", "error");
        return;
      }
      replace({ type: "pot-home", potId });
      showToast(`Saved locally only (sync failed): ${message}`, "error");
    }
  }, [expenseService, notifyPotRefresh, pots, replace, setPots, showToast, usingSupabaseSource]);

  const updateExpense = useCallback(async (data: ExpenseInput) => {
    if (!currentPotId || !currentExpenseId) return;

    setPots(
      pots.map((p) => {
        if (p.id !== currentPotId) return p;

        let updatedCheckpoint = p.currentCheckpoint;
        if (
          p.currentCheckpoint?.status === "pending" &&
          p.currentCheckpoint.confirmations.get("owner")?.confirmed
        ) {
          const updatedConfirmations = new Map(p.currentCheckpoint.confirmations);
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

    try {
      if (!shouldAttemptRemotePotWrite(currentPotId, usingSupabaseSource)) {
        logDev("[DataLayer] Skipping remote updateExpense for local-only pot id", {
          potId: currentPotId,
          expenseId: currentExpenseId,
        });
      } else {
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
        logDev("[DataLayer] Expense updated via service", { potId: currentPotId, expenseId: currentExpenseId });
        notifyPotRefresh(currentPotId);
      }

      replace({ type: "pot-home", potId: currentPotId });
      showToast("Expense updated!", "success");
    } catch (error) {
      warnDev("[DataLayer] Service updateExpense failed", error);
      const message = getErrorMessage(error);
      replace({ type: "pot-home", potId: currentPotId });
      if (isPotNotFoundError(message)) {
        showToast("Saved locally only. Remote pot unavailable.", "error");
        return;
      }
      showToast(`Saved locally only (sync failed): ${message}`, "error");
    }
  }, [
    currentExpenseId,
    currentPotId,
    expenseService,
    notifyPotRefresh,
    pots,
    replace,
    setPots,
    showToast,
    usingSupabaseSource,
  ]);

  const deleteExpense = useCallback((expenseId?: string, { navigateBack = false }: { navigateBack?: boolean } = {}) => {
    if (!currentPotId) return;
    const targetExpenseId = expenseId || currentExpenseId;
    if (!targetExpenseId) return;

    setPots(
      pots.map((p) =>
        p.id === currentPotId
          ? {
            ...p,
            expenses: p.expenses.filter((e) => e.id !== targetExpenseId),
          }
          : p,
      ),
    );

    (async () => {
      try {
        if (!shouldAttemptRemotePotWrite(currentPotId, usingSupabaseSource)) {
          logDev("[DataLayer] Skipping remote removeExpense for local-only pot id", {
            potId: currentPotId,
            expenseId: targetExpenseId,
          });
          return;
        }

        await expenseService.removeExpense(currentPotId, targetExpenseId);
        logDev("[DataLayer] Expense deleted via service", { potId: currentPotId, expenseId: targetExpenseId });
        notifyPotRefresh(currentPotId);
      } catch (error) {
        warnDev("[DataLayer] Service removeExpense failed", error);
        const message = getErrorMessage(error);
        if (isPotNotFoundError(message)) {
          showToast("Saved locally only. Remote pot unavailable.", "error");
          return;
        }
        showToast(`Saved locally only (sync failed): ${message}`, "error");
      }
    })();

    if (navigateBack) {
      back();
    }
    showToast("Expense deleted", "info");
  }, [
    back,
    currentExpenseId,
    currentPotId,
    expenseService,
    notifyPotRefresh,
    pots,
    setPots,
    showToast,
    usingSupabaseSource,
  ]);

  const handleLogout = useCallback(async () => {
    try {
      triggerHaptic("medium");
      await logout();
      showToast("Logged out successfully", "success");
    } catch (error) {
      console.error("Logout failed:", error);
      showToast("Logout failed", "error");
    }
  }, [logout, showToast]);

  const handleDeleteAccount = useCallback(async () => {
    try {
      triggerHaptic("medium");
      await logout();
      showToast("Account deleted", "info");
    } catch (error) {
      console.error("Account deletion failed:", error);
      showToast("Account deletion failed", "error");
    }
  }, [logout, showToast]);

  const archivePot = useCallback(async (potId: string) => {
    const archiveTimestamp = new Date().toISOString();

    setPots((prev) =>
      prev.map((pot) =>
        pot.id === potId
          ? {
              ...pot,
              archived: true,
              lastEditAt: archiveTimestamp,
            }
          : pot,
      ),
    );

    setCurrentPotId((current) => (current === potId ? null : current));
    replace({ type: "pots-home" });

    try {
      if (!shouldAttemptRemotePotWrite(potId, usingSupabaseSource)) {
        logDev("[DataLayer] Skipping remote archivePot for local-only pot id", { potId });
      } else {
        await potService.updatePot(potId, {
          archived: true,
          lastEditAt: archiveTimestamp,
        });
        logDev("[DataLayer] Pot archived via service", { potId });
        notifyPotRefresh(potId);
      }
      showToast("Pot archived", "success");
    } catch (error) {
      warnDev("[DataLayer] Service archivePot failed", error);
      const message = getErrorMessage(error);
      showToast(`Archived locally only (sync failed): ${message}`, "error");
    }
  }, [
    notifyPotRefresh,
    potService,
    replace,
    setCurrentPotId,
    setPots,
    showToast,
    usingSupabaseSource,
  ]);

  const deletePot = useCallback(async (potId: string) => {
    setPots((prev) => prev.filter((pot) => pot.id !== potId));
    setCurrentPotId((current) => (current === potId ? null : current));
    replace({ type: "pots-home" });

    try {
      if (!shouldAttemptRemotePotWrite(potId, usingSupabaseSource)) {
        logDev("[DataLayer] Skipping remote deletePot for local-only pot id", { potId });
      } else {
        await potService.deletePot(potId);
        logDev("[DataLayer] Pot deleted via service", { potId });
        notifyPotRefresh(potId);
      }
      showToast("Pot deleted", "success");
    } catch (error) {
      warnDev("[DataLayer] Service deletePot failed", error);
      const message = getErrorMessage(error);
      showToast(`Deleted locally only (sync failed): ${message}`, "error");
    }
  }, [
    notifyPotRefresh,
    potService,
    replace,
    setCurrentPotId,
    setPots,
    showToast,
    usingSupabaseSource,
  ]);

  const updatePaymentMethodValue = useCallback((
    id: string,
    updates: Partial<PaymentMethod>,
  ) => {
    setPaymentMethods(
      paymentMethods.map((m) =>
        m.id === id ? { ...m, ...updates } : m,
      ),
    );
    showToast("Payment method updated", "success");
  }, [paymentMethods, setPaymentMethods, showToast]);

  const setPreferredMethod = useCallback((id: string) => {
    setPreferredMethodId(id);
    showToast("Default payment method updated", "success");
  }, [setPreferredMethodId, showToast]);

  return {
    createPot,
    addExpenseToPot,
    updateExpense,
    deleteExpense,
    handleLogout,
    handleDeleteAccount,
    archivePot,
    deletePot,
    updatePaymentMethodValue,
    setPreferredMethod,
  };
};
