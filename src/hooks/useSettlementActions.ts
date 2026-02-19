import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Pot } from "../types/app";
import {
  normalizeWalletAddress,
  resolveMemberIdentity,
} from "../utils/identityResolver";

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
      const missingRecipientAddressPots: string[] = [];

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

        const recipientIdentity = resolveMemberIdentity({
          targetId: settlement.id,
          targetName: settlement.name,
          sources: targetPot.members,
          fallbackPreference: "Any method",
        });
        const recipientMemberId = recipientIdentity.id || settlement.id;
        const recipientAddress = recipientIdentity.address;

        if (method === "dot") {
          if (!recipientAddress) {
            missingRecipientAddressPots.push(targetPot.name);
            continue;
          }

          const txRef = reference || "pending";
          const fromAddress = normalizeWalletAddress(currentUserAddress) || "unknown";

          const historyEntry = {
            id: crypto.randomUUID(),
            when: Date.now(),
            type: "onchain_settlement" as const,
            status: "finalized" as const,
            fromMemberId: currentUserId,
            toMemberId: recipientMemberId,
            fromAddress,
            toAddress: recipientAddress,
            amountDot: String(amount),
            txHash: txRef,
            subscan: `https://polkadot.subscan.io/extrinsic/${txRef}`,
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
          split: [{ memberId: recipientMemberId, amount }],
          hasReceipt: false,
        });
        settledCount += 1;
      }

      if (missingRecipientAddressPots.length > 0) {
        const uniquePots = [...new Set(missingRecipientAddressPots)];
        showToast(
          `Skipped ${uniquePots.length} pot(s): recipient DOT wallet missing`,
          "info",
        );
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
