import { useState } from "react";

export type SettlementResult = {
  amount: number;
  method: "cash" | "bank" | "paypal" | "twint";
  counterpartyId: string;
  counterpartyName: string;
  direction?: "owe" | "owed";
  scope: "pot" | "person-all" | "expense";
  pots?: Array<{ id: string; name: string; amount: number }>;
  ref?: string;
  at: number;
};

export type Screen =
  | { type: "activity-home" }
  | { type: "pots-home" }
  | { type: "settlements-home" }
  | { type: "people-home" }
  | { type: "you-tab" }
  | { type: "settings" }
  | { type: "create-pot" }
  | { type: "pot-home"; potId: string }
  | { type: "add-expense"; prefilledMemo?: string; prefilledAmount?: number }
  | { type: "edit-expense"; expenseId: string }
  | { type: "expense-detail"; expenseId: string }
  | { type: "settle-selection" }
  | { type: "settle-home"; personId?: string }
  | { type: "settlement-history"; personId?: string }
  | { type: "settlement-confirmation"; result: SettlementResult }
  | { type: "member-detail"; memberId: string };

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
