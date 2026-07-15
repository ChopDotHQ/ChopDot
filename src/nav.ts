import { useState } from "react";

export type SettlementResult = {
  amount: number;
  currency?: string;
  method: "cash" | "bank" | "paypal" | "twint";
  counterpartyId: string;
  counterpartyName: string;
  direction?: "owe" | "owed";
  scope: "pot" | "person-all" | "expense";
  potId?: string;
  pots?: Array<{ id: string; name: string; amount: number }>;
  ref?: string;
  at: number;
  savedOnDeviceOnly?: boolean;
};

export type Screen =
  | { type: "activity-home" }
  | { type: "pots-home" }
  | { type: "settlements-home" }
  | { type: "people-home" }
  | { type: "you-tab" }
  | { type: "settings" }
  | { type: "create-pot" }
  | { type: "pot-home"; potId: string; recentSettlement?: SettlementResult }
  | { type: "add-expense"; prefilledMemo?: string; prefilledAmount?: number }
  | { type: "edit-expense"; expenseId: string }
  | { type: "expense-detail"; expenseId: string }
  | { type: "settle-selection" }
  | { type: "settle-home"; personId?: string }
  | { type: "settlement-history"; personId?: string }
  | { type: "settlement-confirmation"; result: SettlementResult }
  | { type: "closeout-review"; potId: string }
  | { type: "member-detail"; memberId: string }
  | { type: "spend-card"; potId: string; spendCardId?: string; captureToken?: string; actingMemberId?: string }
  | { type: "capture-handoff"; potId: string; legId: string; captureToken?: string; actingMemberId?: string }
  | { type: "capture-confirm"; potId: string; legId: string; captureToken: string; receiverId: string }
  | {
      type: "capture-link-error";
      code: "not_found" | "expired" | "consumed" | "wrong_user";
      message: string;
      expectedName?: string;
    };

export function useNav(initialScreen: Screen = { type: "pots-home" }) {
  const [stack, setStack] = useState<Screen[]>([initialScreen]);
  const current = stack[stack.length - 1];

  return {
    current,
    stack,
    push: (s: Screen) => setStack((x) => [...x, s]),
    back: () => setStack((x) => (x.length > 1 ? x.slice(0, -1) : x)),
    replace: (s: Screen) => setStack((x) => [...x.slice(0, -1), s]),
    reset: (s: Screen) => setStack([s]),
  };
}
