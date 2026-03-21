import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Screen } from "../nav";
import type { Contribution, Expense, Pot } from "../types/app";
import type { PaymentMethod } from "../components/screens/PaymentMethods";
import { isBaseCurrency } from "../schema/pot";
import { triggerHaptic } from "../utils/haptics";
import { logDev, warnDev } from "../utils/logDev";

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
  currentPot,
  logout,
  paymentMethods,
  setPaymentMethods,
  setPreferredMethodId,
}: UseBusinessActionsParams) => {
  const createPot = useCallback(async () => {
    let processedMembers = newPot.members || [];
    const { getMockAddressForMember, isSimulationMode } = await import("../utils/simulation");
    const rawBaseCurrency = newPot.baseCurrency || "USD";
    const baseCurrency = isBaseCurrency(rawBaseCurrency) ? rawBaseCurrency : "USD";

    if (isSimulationMode() && baseCurrency === "DOT") {
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
        window.dispatchEvent(new CustomEvent("pots-refresh"));
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

  const attestExpense = useCallback((expenseId: string) => {
    if (!currentPotId) return;

    const pot = pots.find((p) => p.id === currentPotId);
    const expense = pot?.expenses.find((e) => e.id === expenseId);

    if (expense?.paidBy === "owner") {
      showToast("You can't confirm your own expense", "error");
      return;
    }

    const attestations = expense?.attestations ?? [];
    const isConfirmed = Array.isArray(attestations) && (
      (typeof attestations[0] === "string" && attestations.includes("owner")) ||
      (typeof attestations[0] === "object" && attestations.some((a: any) => a.memberId === "owner"))
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
  }, [currentPotId, pots, setPots, showToast]);

  const batchAttestExpenses = useCallback((expenseIds: string[]) => {
    if (!currentPotId) return;

    const pot = pots.find((p) => p.id === currentPotId);
    if (!pot) return;

    const validExpenseIds = expenseIds.filter((expenseId) => {
      const expense = pot.expenses.find((e) => e.id === expenseId);
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
                  attestations: [...e.attestations, "owner"],
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
  }, [currentPotId, pots, setPots, showToast]);

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

  const addContribution = useCallback((
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
  }, [back, currentPot, currentPotId, pots, setPots, showToast]);

  const withdrawFunds = useCallback((amount: number) => {
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
  }, [back, currentPot, currentPotId, pots, setPots, showToast]);

  return {
    createPot,
    addExpenseToPot,
    updateExpense,
    deleteExpense,
    attestExpense,
    batchAttestExpenses,
    handleLogout,
    handleDeleteAccount,
    archivePot,
    deletePot,
    updatePaymentMethodValue,
    setPreferredMethod,
    addContribution,
    withdrawFunds,
  };
};
