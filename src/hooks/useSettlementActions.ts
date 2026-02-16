import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Pot } from "../types/app";

type SettleMethod = "cash" | "bank" | "paypal" | "twint" | "dot";

type SettlementPotBreakdown = {
  potId: string;
  potName: string;
  amount: number;
};

export type SettleHomeSettlement = {
  id: string;
  name: string;
  totalAmount: number;
  direction: "owe" | "owed";
  pots: SettlementPotBreakdown[];
};

type UseSettlementActionsParams = {
  pots: Pot[];
  setPots: Dispatch<SetStateAction<Pot[]>>;
  addExpenseToPot: (
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
  ) => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  back: () => void;
  currentUserId: string;
  currentUserAddress?: string;
};

export const useSettlementActions = ({
  pots,
  setPots,
  addExpenseToPot,
  showToast,
  back,
  currentUserId,
  currentUserAddress,
}: UseSettlementActionsParams) => {
  const confirmSettlement = useCallback(
    async ({
      method,
      reference,
      settlement,
    }: {
      method: SettleMethod;
      reference?: string;
      settlement: SettleHomeSettlement;
    }) => {
      let settledCount = 0;

      for (const breakdownItem of settlement.pots) {
        const targetPot =
          pots.find((p) => p.id === breakdownItem.potId) ||
          pots.find((p) => p.name === breakdownItem.potName);

        if (!targetPot) {
          continue;
        }

        const amount = Number(breakdownItem.amount);
        if (amount <= 0) {
          continue;
        }

        if (method === "dot") {
          const recipientMember = targetPot.members.find((m) => m.id === settlement.id);
          const recipientAddr = recipientMember?.address || "unknown";

          const historyEntry = {
            id: crypto.randomUUID(),
            when: Date.now(),
            type: "onchain_settlement" as const,
            status: "finalized" as const,
            fromMemberId: currentUserId,
            toMemberId: settlement.id,
            fromAddress: currentUserAddress || "unknown",
            toAddress: recipientAddr,
            amountDot: String(amount),
            txHash: reference || "pending",
            subscan: `https://polkadot.subscan.io/extrinsic/${reference}`,
          };

          setPots((prev) =>
            prev.map((p) =>
              p.id === targetPot.id
                ? {
                  ...p,
                  history: [...(p.history || []), historyEntry] as any,
                }
                : p,
            ) as any,
          );
          settledCount += 1;
          continue;
        }

        addExpenseToPot(targetPot.id, {
          amount,
          currency: targetPot.baseCurrency || "USD",
          paidBy: currentUserId,
          memo: `Settlement: ${method.toUpperCase()}${reference ? ` (${reference})` : ""}`,
          date: new Date().toISOString(),
          split: [{ memberId: settlement.id, amount }],
          hasReceipt: false,
        });
        settledCount += 1;
      }

      if (settledCount > 0) {
        showToast(`Settled ${settledCount} pot(s) via ${method}`, "success");
        back();
        return;
      }

      showToast("No active balances to settle", "info");
    },
    [addExpenseToPot, back, currentUserAddress, currentUserId, pots, setPots, showToast],
  );

  return {
    confirmSettlement,
  };
};
