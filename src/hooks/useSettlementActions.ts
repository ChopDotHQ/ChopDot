import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Pot, Settlement } from '../types/app';
import type { SettlementResult } from '../nav';
import {
  normalizeWalletAddress,
  resolveMemberIdentity,
} from '../utils/identityResolver';
import { buildSubscanUrl } from '../services/chain/utils';
import {
  recordSettlementProof,
} from '../services/closeout/pvmCloseout';
import { saveTrackedPotRecovery } from '../services/closeout/trackedRecovery';

type SettleMethod = 'cash' | 'bank' | 'paypal' | 'twint' | 'dot' | 'usdc';

type SettlementPotBreakdown = {
  potId: string;
  potName: string;
  amount: number;
};

export type SettleHomeSettlement = {
  id: string;
  name: string;
  totalAmount: number;
  direction: 'owe' | 'owed';
  pots: SettlementPotBreakdown[];
};

const UUID_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getTrackedProofStatus = (leg?: {
  status: 'pending' | 'paid' | 'proven' | 'acknowledged';
  settlementTxHash?: string;
}): 'anchored' | 'recorded' | 'completed' | undefined => {
  if (!leg) return undefined;
  if (leg.status === 'proven' || leg.status === 'acknowledged') return 'completed';
  if (leg.status === 'paid' || leg.settlementTxHash) return 'recorded';
  return 'anchored';
};

type PotServiceLike = {
  updatePot: (id: string, updates: Record<string, unknown>) => Promise<unknown>;
};

type UseSettlementActionsParams = {
  pots: Pot[];
  settlements: Settlement[];
  currentPot?: Pot | null;
  currentPotId?: string | null;
  setPots: Dispatch<SetStateAction<Pot[]>>;
  setSettlements: Dispatch<SetStateAction<Settlement[]>>;
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
    options?: {
      navigateToPotHome?: boolean;
      showSuccessToast?: boolean;
    },
  ) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  currentUserId: string;
  currentUserAddress?: string;
  potService: PotServiceLike;
  usingSupabaseSource: boolean;
  notifyPotRefresh: (potId: string) => void;
};

export const useSettlementActions = ({
  pots,
  settlements,
  currentPot,
  currentPotId,
  setPots,
  addExpenseToPot,
  setSettlements,
  showToast,
  currentUserId,
  currentUserAddress,
  potService,
  usingSupabaseSource,
  notifyPotRefresh,
}: UseSettlementActionsParams) => {
  const buildTrackedConfirmationResult = useCallback(
    ({
      amount,
      method,
      settlement,
      closeoutId,
      legIndex,
      settlementTxHash,
      proofTxHash,
      proofStatus,
      proofContract,
    }: {
      amount: number;
      method: 'dot' | 'usdc';
      settlement: SettleHomeSettlement;
      closeoutId?: string;
      legIndex?: number;
      settlementTxHash?: string;
      proofTxHash?: string;
      proofStatus?: 'anchored' | 'recorded' | 'completed';
      proofContract?: string;
    }): SettlementResult => ({
      amount,
      method,
      counterpartyId: settlement.id,
      counterpartyName: settlement.name,
      direction: settlement.direction,
      scope: settlement.pots.length > 1 ? 'person-all' : 'pot',
      pots: settlement.pots.map((potItem) => ({
        id: potItem.potId,
        name: potItem.potName,
        amount: potItem.amount,
      })),
      txHash: settlementTxHash,
      closeoutId,
      closeoutLegIndex: legIndex,
      proofTxHash,
      proofStatus,
      proofContract,
      at: Date.now(),
    }),
    [],
  );

  const syncRemotePot = useCallback(async (potId: string, updates: Record<string, unknown>) => {
    if (usingSupabaseSource && !UUID_LIKE_REGEX.test(potId)) {
      return;
    }
    try {
      await potService.updatePot(potId, updates);
      notifyPotRefresh(potId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast(`Saved locally only (sync failed): ${message}`, 'error');
    }
  }, [notifyPotRefresh, potService, showToast, usingSupabaseSource]);

  const persistTrackedCloseoutLeg = useCallback(({
    targetPot,
    closeoutId,
    legIndex,
    settlementTxHash,
    proofTxHash,
    proofStatus,
    syncRemote = true,
  }: {
    targetPot: Pot;
    closeoutId?: string;
    legIndex?: number;
    settlementTxHash?: string;
    proofTxHash?: string;
    proofStatus?: 'anchored' | 'recorded' | 'completed';
    syncRemote?: boolean;
  }) => {
    const updatedCloseouts = (targetPot.closeouts || []).map((closeout) => {
      if (closeout.closeoutId !== closeoutId || typeof legIndex !== 'number') {
        return closeout;
      }

      const legs = closeout.legs.map((leg) =>
        leg.index === legIndex
          ? {
            ...leg,
            settlementTxHash: settlementTxHash ?? leg.settlementTxHash,
            proofTxHash: proofStatus === 'completed' ? proofTxHash : undefined,
            status: proofStatus === 'completed' ? 'proven' as const : settlementTxHash ? 'paid' as const : leg.status,
          }
          : leg,
      );
      const settledLegCount = legs.filter((leg) => leg.status !== 'pending').length;
      return {
        ...closeout,
        legs,
        settledLegCount,
        status:
          settledLegCount >= closeout.totalLegCount
            ? 'completed'
            : settledLegCount > 0
              ? 'partially_settled'
              : closeout.status,
      };
    });

    const updatedPotSnapshot: Pot = {
      ...targetPot,
      closeouts: updatedCloseouts,
      lastEditAt: new Date().toISOString(),
    };

    setPots((prev) =>
      prev.map((pot) => (pot.id === targetPot.id ? updatedPotSnapshot : pot)) as typeof prev,
    );

    if (syncRemote) {
      void syncRemotePot(updatedPotSnapshot.id, {
        closeouts: updatedPotSnapshot.closeouts,
        lastEditAt: updatedPotSnapshot.lastEditAt,
      });
    }
    saveTrackedPotRecovery(updatedPotSnapshot);

    return updatedPotSnapshot;
  }, [setPots, syncRemotePot]);

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
          (currentPot &&
            ((currentPotId && currentPot.id === breakdownItem.potId) ||
              currentPot.id === breakdownItem.potId ||
              currentPot.name === breakdownItem.potName)
            ? currentPot
            : null) ||
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
          fallbackPreference: 'Any method',
        });
        const recipientMemberId = recipientIdentity.id || settlement.id;
        const recipientAddress = recipientIdentity.address;
        const payerMemberId = settlement.direction === 'owe' ? currentUserId : recipientMemberId;
        const receiverMemberId = settlement.direction === 'owe' ? recipientMemberId : currentUserId;
        const existingCloseout = closeoutContext?.closeoutId
          ? targetPot.closeouts?.find((entry) => entry.closeoutId === closeoutContext.closeoutId)
          : undefined;
        const existingLeg = typeof closeoutContext?.legIndex === 'number'
          ? existingCloseout?.legs.find((leg) => leg.index === closeoutContext.legIndex)
          : undefined;

        if (method === 'dot' || method === 'usdc') {
          if (existingLeg && (existingLeg.proofTxHash || existingLeg.settlementTxHash || existingLeg.status !== 'pending')) {
            let proofTxHash = existingLeg.proofTxHash;
            let proofStatus = getTrackedProofStatus(existingLeg);
            let proofContract = existingCloseout?.contractAddress;

            if (
              closeoutContext?.closeoutId &&
              typeof closeoutContext.legIndex === 'number' &&
              existingLeg.settlementTxHash &&
              proofStatus !== 'completed'
            ) {
              try {
                const proofResult = await recordSettlementProof({
                  closeoutId: closeoutContext.closeoutId,
                  legIndex: closeoutContext.legIndex,
                  settlementTxHash: existingLeg.settlementTxHash,
                });
                proofTxHash = proofResult.proofTxHash;
                proofStatus = proofResult.proofStatus;
                proofContract = proofResult.proofContract;
                persistTrackedCloseoutLeg({
                  targetPot,
                  closeoutId: closeoutContext.closeoutId,
                  legIndex: closeoutContext.legIndex,
                  settlementTxHash: existingLeg.settlementTxHash,
                  proofTxHash,
                  proofStatus,
                });
                showToast('Recovered tracked confirmation for the existing payment.', 'success');
              } catch (proofError) {
                const message = proofError instanceof Error ? proofError.message : 'Proof write failed';
                showToast(`Payment already exists. Proof is still pending: ${message}`, 'info');
              }
            } else {
              showToast('This payment is already recorded.', 'info');
            }

            return buildTrackedConfirmationResult({
              amount,
              method,
              settlement,
              closeoutId: existingCloseout?.closeoutId,
              legIndex: existingLeg.index,
              settlementTxHash: existingLeg.settlementTxHash,
              proofTxHash,
              proofStatus,
              proofContract,
            });
          }

          if (!recipientAddress) {
            missingRecipientAddressPots.push(targetPot.name);
            continue;
          }

          const txRef = reference || 'pending';
          const fromAddress = normalizeWalletAddress(currentUserAddress) || 'unknown';
          const closeoutLegIndex = closeoutContext?.legIndex;
          let proofContract = closeoutContext?.closeoutId
            ? targetPot.closeouts?.find((entry) => entry.closeoutId === closeoutContext.closeoutId)?.contractAddress
            : undefined;
          let proofTxHash: string | undefined;
          let proofStatus: 'anchored' | 'recorded' | 'completed' | undefined =
            closeoutContext?.closeoutId ? 'recorded' : undefined;

          if (closeoutContext?.closeoutId && typeof closeoutLegIndex === 'number') {
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
              const message = proofError instanceof Error ? proofError.message : 'Proof write failed';
              showToast(`Payment sent, but onchain proof was not recorded: ${message}`, 'info');
            }
          }

          const historyEntry = {
            id: crypto.randomUUID(),
            when: Date.now(),
            type: 'onchain_settlement' as const,
            status: 'finalized' as const,
            fromMemberId: payerMemberId,
            toMemberId: receiverMemberId,
            fromAddress,
            toAddress: recipientAddress,
            amountDot: method === 'dot' ? String(amount) : undefined,
            amountUsdc: method === 'usdc' ? String(amount) : undefined,
            assetId: method === 'usdc' ? 1337 : undefined,
            txHash: txRef,
            subscan: buildSubscanUrl(txRef),
            closeoutId: closeoutContext?.closeoutId,
            closeoutLegIndex,
            proofTxHash,
            proofStatus,
            proofContract,
          };

          const updatedTrackedPotSnapshot = persistTrackedCloseoutLeg({
            targetPot,
            closeoutId: closeoutContext?.closeoutId,
            legIndex: closeoutLegIndex,
            settlementTxHash: txRef,
            proofTxHash,
            proofStatus,
            syncRemote: false,
          });

          const updatedPotSnapshot: Pot = {
            ...targetPot,
            history: [...(targetPot.history || []), historyEntry] as any,
            closeouts: updatedTrackedPotSnapshot.closeouts,
            lastEditAt: updatedTrackedPotSnapshot.lastEditAt,
          };

          setPots((prev) =>
            prev.map((p) => (p.id === targetPot.id ? updatedPotSnapshot : p)) as any,
          );

          void syncRemotePot(updatedPotSnapshot.id, {
            history: updatedPotSnapshot.history,
            closeouts: updatedPotSnapshot.closeouts,
            lastEditAt: updatedPotSnapshot.lastEditAt,
          });
          saveTrackedPotRecovery(updatedPotSnapshot);

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
            ...buildTrackedConfirmationResult({
              amount,
              method,
              settlement,
              closeoutId: closeoutContext?.closeoutId,
              legIndex: closeoutLegIndex,
              settlementTxHash: txRef,
              proofTxHash,
              proofStatus,
              proofContract,
            }),
          };
          settledCount += 1;
          continue;
        }

        addExpenseToPot(targetPot.id, {
          amount,
          currency: targetPot.baseCurrency || 'USD',
          paidBy: payerMemberId,
          memo: `Settlement: ${method.toUpperCase()}${reference ? ` (${reference})` : ''}`,
          date: new Date().toISOString(),
          split: [{ memberId: receiverMemberId, amount }],
          hasReceipt: false,
        }, {
          navigateToPotHome: false,
          showSuccessToast: false,
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
          direction: settlement.direction,
          scope: settlement.pots.length > 1 ? 'person-all' : 'pot',
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
          `Skipped ${uniquePots.length} pot(s): recipient ${method.toUpperCase()} wallet missing`,
          'info',
        );
      }

      if (settledCount > 0) {
        showToast(`Settled ${settledCount} pot(s) via ${method}`, 'success');
        return confirmationResult;
      }

      showToast('No active balances to settle', 'info');
      return null;
    },
    [addExpenseToPot, buildTrackedConfirmationResult, currentUserAddress, currentUserId, persistTrackedCloseoutLeg, pots, setPots, setSettlements, showToast, syncRemotePot],
  );

  const retrySettlementProof = useCallback(async (settlementId: string): Promise<boolean> => {
    const targetSettlement = settlements.find((entry) => entry.id === settlementId);
    if (!targetSettlement) {
      showToast('Settlement not found', 'error');
      return false;
    }

    if (targetSettlement.proofTxHash || targetSettlement.proofStatus === 'completed') {
      showToast('Proof already recorded for this settlement', 'info');
      return true;
    }

    if (
      !targetSettlement.closeoutId ||
      typeof targetSettlement.closeoutLegIndex !== 'number' ||
      !targetSettlement.txHash
    ) {
      showToast('This settlement does not have retryable proof data', 'info');
      return false;
    }

    try {
      const proofResult = await recordSettlementProof({
        closeoutId: targetSettlement.closeoutId,
        legIndex: targetSettlement.closeoutLegIndex,
        settlementTxHash: targetSettlement.txHash,
      });

      setSettlements((prev) =>
        prev.map((entry) =>
          entry.id === settlementId
            ? {
              ...entry,
              proofTxHash: proofResult.proofTxHash,
              proofStatus: proofResult.proofStatus,
              proofContract: proofResult.proofContract,
            }
            : entry,
        ),
      );

      const targetPotIds = targetSettlement.potIds && targetSettlement.potIds.length > 0
        ? targetSettlement.potIds
        : pots
          .filter((pot) => pot.closeouts?.some((closeout) => closeout.closeoutId === targetSettlement.closeoutId))
          .map((pot) => pot.id);

      targetPotIds.forEach((potId) => {
        const targetPot = pots.find((pot) => pot.id === potId);
        if (!targetPot) {
          return;
        }

        persistTrackedCloseoutLeg({
          targetPot,
          closeoutId: targetSettlement.closeoutId,
          legIndex: targetSettlement.closeoutLegIndex,
          settlementTxHash: targetSettlement.txHash,
          proofTxHash: proofResult.proofTxHash,
          proofStatus: proofResult.proofStatus,
        });
      });

      showToast('Settlement proof recorded', 'success');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast(`Proof retry failed: ${message}`, 'error');
      return false;
    }
  }, [persistTrackedCloseoutLeg, pots, settlements, setSettlements, showToast]);

  return {
    confirmSettlement,
    retrySettlementProof,
  };
};
