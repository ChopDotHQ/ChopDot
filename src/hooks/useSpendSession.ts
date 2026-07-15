import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SpendSession } from '../services/capture/types';
import { spendSessionService } from '../services/capture/SpendSessionService';
import type { PaymentEvidenceRef, ReceiptCaptureItem } from '../chapter/types';

type UseSpendSessionParams = {
  spendCardId: string;
  potId: string;
  payerMemberId: string;
  defaultParticipantIds: string[];
  defaultRail?: SpendSession['settlementRail'];
  currency: string;
};

type UseSpendSessionResult = {
  session: SpendSession | null;
  amount: number;
  memo: string;
  paymentEvidence?: PaymentEvidenceRef;
  receiptItems: ReceiptCaptureItem[];
  settlementRail: NonNullable<SpendSession['settlementRail']>;
  railStatus: NonNullable<SpendSession['railStatus']>;
  participantIds: string[];
  setAmount: (amount: number) => void;
  setMemo: (memo: string) => void;
  setPaymentEvidence: (paymentEvidence: PaymentEvidenceRef) => void;
  setReceiptItems: (items: ReceiptCaptureItem[]) => void;
  setSettlementRail: (rail: NonNullable<SpendSession['settlementRail']>) => void;
  markHandoffStarted: () => void;
  toggleParticipant: (memberId: string) => void;
  resetSession: () => void;
  markCommitted: (expenseId: string) => void;
};

export function useSpendSession({
  spendCardId,
  potId,
  payerMemberId,
  defaultParticipantIds,
  defaultRail,
  currency,
}: UseSpendSessionParams): UseSpendSessionResult {
  const [session, setSession] = useState<SpendSession | null>(() =>
    spendSessionService.createDraft({
      spendCardId,
      potId,
      payerMemberId,
      participantIds: defaultParticipantIds,
      amount: 0,
      currency,
      settlementRail: defaultRail,
    }),
  );

  useEffect(() => {
    setSession(
      spendSessionService.createDraft({
        spendCardId,
        potId,
        payerMemberId,
        participantIds: defaultParticipantIds,
        amount: 0,
        currency,
        settlementRail: defaultRail,
      }),
    );
  }, [spendCardId, potId, payerMemberId, currency, defaultParticipantIds.join('|'), defaultRail]);

  const amount = session?.amount ?? 0;
  const memo = session?.memo ?? '';
  const paymentEvidence = session?.paymentEvidence;
  const receiptItems = session?.receiptItems ?? [];
  const settlementRail = session?.settlementRail ?? 'twint';
  const railStatus = session?.railStatus ?? 'ready_to_pay';
  const participantIds = session?.participantIds ?? defaultParticipantIds;

  const setAmount = useCallback((nextAmount: number) => {
    setSession((current) => {
      if (!current) {
        return current;
      }
      return spendSessionService.updateDraft(current, { amount: nextAmount });
    });
  }, []);

  const setMemo = useCallback((nextMemo: string) => {
    setSession((current) => {
      if (!current) {
        return current;
      }
      return spendSessionService.updateDraft(current, { memo: nextMemo });
    });
  }, []);

  const setPaymentEvidence = useCallback((nextEvidence: PaymentEvidenceRef) => {
    setSession((current) => {
      if (!current) {
        return current;
      }
      return spendSessionService.updateDraft(current, { paymentEvidence: nextEvidence });
    });
  }, []);

  const setReceiptItems = useCallback((nextItems: ReceiptCaptureItem[]) => {
    setSession((current) => {
      if (!current) {
        return current;
      }
      return spendSessionService.updateDraft(current, { receiptItems: nextItems });
    });
  }, []);

  const setSettlementRail = useCallback((nextRail: NonNullable<SpendSession['settlementRail']>) => {
    setSession((current) => {
      if (!current) {
        return current;
      }
      return spendSessionService.updateDraft(current, { settlementRail: nextRail });
    });
  }, []);

  const markHandoffStarted = useCallback(() => {
    setSession((current) => {
      if (!current) {
        return current;
      }
      return spendSessionService.markHandoffStarted(current);
    });
  }, []);

  const toggleParticipant = useCallback((memberId: string) => {
    setSession((current) => {
      if (!current) {
        return current;
      }

      const selected = new Set(current.participantIds);
      if (selected.has(memberId)) {
        if (selected.size <= 1) {
          return current;
        }
        selected.delete(memberId);
      } else {
        selected.add(memberId);
      }

      return spendSessionService.updateDraft(current, {
        participantIds: Array.from(selected),
      });
    });
  }, []);

  const resetSession = useCallback(() => {
    setSession(
      spendSessionService.createDraft({
        spendCardId,
        potId,
        payerMemberId,
        participantIds: defaultParticipantIds,
        amount: 0,
        currency,
      }),
    );
  }, [spendCardId, potId, payerMemberId, defaultParticipantIds, currency]);

  const markCommitted = useCallback((expenseId: string) => {
    setSession((current) => {
      if (!current) {
        return current;
      }
      return spendSessionService.markCommitted(current, expenseId);
    });
  }, []);

  return useMemo(
    () => ({
      session,
      amount,
      memo,
      paymentEvidence,
      receiptItems,
      settlementRail,
      railStatus,
      participantIds,
      setAmount,
      setMemo,
      setPaymentEvidence,
      setReceiptItems,
      setSettlementRail,
      markHandoffStarted,
      toggleParticipant,
      resetSession,
      markCommitted,
    }),
    [
      session,
      amount,
      memo,
      paymentEvidence,
      receiptItems,
      settlementRail,
      railStatus,
      participantIds,
      setAmount,
      setMemo,
      setPaymentEvidence,
      setReceiptItems,
      setSettlementRail,
      markHandoffStarted,
      toggleParticipant,
      resetSession,
      markCommitted,
    ],
  );
}
