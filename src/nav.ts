/**
 * TYPE-SAFE NAVIGATION SYSTEM
 * 
 * Stack-based navigation with type-safe screen definitions.
 * Supports push/pop/replace/reset operations.
 * 
 * Screen Types:
 * - Main tabs: pots-home, people-home, activity-home, you-tab
 * - Detail screens: pot-home, expense-detail, member-detail, etc.
 * - Modal flows: add-expense, create-pot, settle-home, etc.
 */

import { useState } from "react";

export type SettlementResult = {
  amount: number;
  method: "cash" | "bank" | "paypal" | "twint" | "dot";
  counterpartyId: string;
  counterpartyName: string;
  scope: "pot" | "person-all" | "expense";
  pots?: Array<{ id: string; name: string; amount: number }>;
  ref?: string;
  txHash?: string;
  at: number;
};

export type Screen =
  | { type: "activity-home" }
  | { type: "pots-home" }
  | { type: "settlements-home" }
  | { type: "people-home" }
  | { type: "you-tab" }
  | { type: "settings" }
  | { type: "payment-methods" }
  | { type: "insights" }
  | { type: "create-pot" }
  | { type: "pot-home"; potId: string }
  | { type: "add-expense"; prefilledMemo?: string; prefilledAmount?: number }
  | { type: "edit-expense"; expenseId: string }
  | { type: "expense-detail"; expenseId: string }
  | { type: "settle-selection" }
  | { type: "settle-home"; personId?: string }
  | { type: "settle-cash" }
  | { type: "settle-bank" }
  | { type: "settle-dot" }
  | { type: "settlement-history"; personId?: string }
  | { type: "settlement-confirmation"; result: SettlementResult }
  | { type: "member-detail"; memberId: string }
  | { type: "add-contribution" }
  | { type: "withdraw-funds" }
  | { type: "checkpoint-status" }
  | { type: "request-payment" };

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