import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Pot } from "../types/app";
import type { SettlementResult } from "../nav";
import {
  normalizeWalletAddress,
  resolveMemberIdentity,
} from "../utils/identityResolver";
import {
  buildProofTxHash,
  recordSettlementProof,
} from "../services/closeout/pvmCloseout";

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
  setSettlements: Dispatch<SetStateAction<import("../types/app").Settlement[]>>;
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
  currentUserId: string;
  currentUserAddress?: string;
};

export const useSettlementActions = ({
  pots,
  setPots,
  addExpenseToPot,
  setSettlements,
  showToast,
  currentUserId,
  currentUserAddress,
}: UseSettlementActionsParams) => {
  const confirmSettlement = useCallback(
    async ({
      method,
      reference,
      settlement,
      closeoutContext,
    }: {
      method: SettleMethod;
      reference?: string;
      settlement: SettleHomeSettlement;
      closeoutContext?: {
        closeoutId: string;
        legIndex: number;
      };
    }): Promise<SettlementResult | null> => {
      let settledCount = 0;
      const missingRecipientAddressPots: string[] = [];
      let confirmationResult: SettlementResult | null = null;

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
          const closeoutLegIndex = closeoutContext?.legIndex;
          let proofContract = closeoutContext?.closeoutId
            ? targetPot.closeouts?.find((entry) => entry.closeoutId === closeoutContext.closeoutId)?.contractAddress
            : undefined;
          let proofTxHash =
            closeoutContext?.closeoutId
              ? await buildProofTxHash(closeoutContext.closeoutId, closeoutLegIndex ?? 0, txRef)
              : undefined;
          let proofStatus: "anchored" | "completed" | undefined =
            closeoutContext?.closeoutId ? "anchored" : undefined;

          if (closeoutContext?.closeoutId && typeof closeoutLegIndex === "number") {
            try {
              const proofResult = await recordSettlementProof({
                closeoutId: closeoutContext.closeoutId,
                legIndex: closeoutLegIndex,
                settlementTxHash: txRef,
              });
              proofTxHash = proofResult.proofTxHash;
              proofStatus = proofResult.proofStatus;
              proofContract = proofResult.proofContract;
            } catch (proofError) {
              const message = proofError instanceof Error ? proofError.message : "Proof write failed";
              showToast(`Payment sent, but onchain proof was not recorded: ${message}`, "info");
            }
          }

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
            closeoutId: closeoutContext?.closeoutId,
            closeoutLegIndex,
            proofTxHash,
            proofStatus,
            proofContract,
          };

          setPots((prev) =>
            prev.map((p) =>
              p.id === targetPot.id
                ? {
                  ...p,
                  history: [...(p.history || []), historyEntry] as any,
                  closeouts: (p.closeouts || []).map((closeout) => {
                    if (closeout.closeoutId !== closeoutContext?.closeoutId) {
                      return closeout;
                    }
                    const legs = closeout.legs.map((leg) =>
                      leg.index === closeoutLegIndex
                        ? {
                          ...leg,
                          settlementTxHash: txRef,
                          proofTxHash,
                          status: proofStatus === "completed" ? "proven" as const : "paid" as const,
                        }
                        : leg,
                    );
                    const settledLegCount = legs.filter((leg) => leg.status !== "pending").length;
                    return {
                      ...closeout,
                      legs,
                      settledLegCount,
                      status:
                        settledLegCount >= closeout.totalLegCount
                          ? "completed"
                          : settledLegCount > 0
                            ? "partially_settled"
                            : closeout.status,
                    };
                  }),
                }
                : p,
            ) as any,
          );
          setSettlements((prev) => [
            {
              id: crypto.randomUUID(),
              personId: recipientMemberId,
              amount: String(amount),
              currency: targetPot.baseCurrency,
              method,
              potIds: [targetPot.id],
              date: new Date().toISOString(),
              txHash: txRef,
              closeoutId: closeoutContext?.closeoutId,
              closeoutLegIndex,
              proofTxHash,
              proofStatus,
              proofContract,
            },
            ...prev,
          ]);
          confirmationResult = {
            amount,
            method,
            counterpartyId: recipientMemberId,
            counterpartyName: settlement.name,
            scope: settlement.pots.length > 1 ? "person-all" : "pot",
            pots: settlement.pots.map((potItem) => ({
              id: potItem.potId,
              name: potItem.potName,
              amount: potItem.amount,
            })),
            txHash: txRef,
            closeoutId: closeoutContext?.closeoutId,
            closeoutLegIndex,
            proofTxHash,
            proofStatus,
            proofContract,
            at: Date.now(),
          };
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
        setSettlements((prev) => [
          {
            id: crypto.randomUUID(),
            personId: recipientMemberId,
            amount: String(amount),
            currency: targetPot.baseCurrency,
            method,
            potIds: [targetPot.id],
            date: new Date().toISOString(),
          },
          ...prev,
        ]);
        confirmationResult = {
          amount,
          method,
          counterpartyId: recipientMemberId,
          counterpartyName: settlement.name,
          scope: settlement.pots.length > 1 ? "person-all" : "pot",
          pots: settlement.pots.map((potItem) => ({
            id: potItem.potId,
            name: potItem.potName,
            amount: potItem.amount,
          })),
          ref: reference,
          at: Date.now(),
        };
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
        return confirmationResult;
      }

      showToast("No active balances to settle", "info");
      return null;
    },
    [addExpenseToPot, currentUserAddress, currentUserId, pots, setPots, setSettlements, showToast],
  );

  return {
    confirmSettlement,
  };
};
