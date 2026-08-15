# SETTLEMENT-002 Preflight — Cash/manual settlement complete

Status: BUILDING
Branch: `chatgpt/chopdot-v1-completion`

## User goal

Cash/manual settlement should feel as trustworthy and complete as a wallet payment: the payer can say they paid, the receiver explicitly confirms receipt, mistakes can be undone before confirmation, and ChopDot leaves an explainable durable activity trail.

## Current facts

- Manual rails currently use `request_sent -> marked_paid -> confirmed`.
- `PayerView` immediately returns to the group after `I paid`, leaving no immediate undo affordance.
- Receiver confirmation exists in Group Detail and Settle Up.
- `AppState.activityEvents` already exists and persists locally, but ordinary payment transitions do not consistently append audit events.
- global History currently renders saved/finished groups only; polished activity-history presentation belongs to HISTORY-001.
- shared authority is not production-ready on this branch, so new undo/audit behavior stays local-only and must not claim cross-device propagation.

## Safety rules

1. A payer can retract `marked_paid` only before receiver confirmation.
2. Retraction returns the exact split to `request_sent`; it does not create/delete expenses or alter amounts.
3. A confirmed split cannot be retracted.
4. Wallet/chain-evidenced payments are not retractable through the manual undo path.
5. Successful mark-paid, retract, and receiver-confirm transitions append immutable activity events.
6. Rejected/no-op transitions must not emit misleading activity.
7. Activity-event ids must be stable enough to avoid accidental duplicates for the same transition.
8. Audit data is evidence of ChopDot application actions, not proof that cash physically moved.
9. Consumer UI says `Marked as paid`, `Undo`, `Waiting for confirmation`; it does not expose state-machine jargon.
10. No shared-session protocol change in this slice.

## Implementation shape

- Wrap the existing financial reducer in `AppStateContext` with a narrow local reducer that:
  - delegates canonical money transitions to the existing reducer;
  - records activity only when a transition actually succeeded;
  - supports `RETRACT_MARK_PAID` locally for non-wallet-evidenced splits.
- Change manual `PayerView` from immediate navigation to a short success state with `Undo` and `Back to group`.
- Preserve existing receiver-confirm buttons; their successful `CONFIRM_RECEIVED` transitions will now be journaled automatically.
- Add pure tests for local settlement-audit transitions where practical.
- Do not redesign the global History screen; HISTORY-001 will consume these events later.

## Activity events

Minimum local events:

```text
payment_marked_paid
payment_marked_paid_retracted
payment_confirmed
```

Each should include relevant `splitId`, `expenseId`, payer/receiver ids, amount, currency, timestamp, and request id where available.

## Acceptance cases

1. Requested cash split -> payer taps `I paid` -> split becomes `marked_paid` and activity is appended.
2. Payer sees `Waiting for <receiver> to confirm` rather than being told it is settled.
3. Payer taps Undo before confirmation -> split returns to `request_sent` and a retraction event is appended.
4. Receiver confirms -> split becomes `confirmed` and confirmation event is appended.
5. Undo after confirmation is rejected.
6. Undo on a split carrying wallet/chain evidence is rejected.
7. Failed/no-op transition produces no false activity event.
8. Balances still treat `marked_paid` as unresolved until receiver confirms.
9. Existing manual bank/payment-link attestation keeps the same application lifecycle.
10. App restart preserves the event stream through existing local persistence.

## Deferred

- polished all-events History UI — HISTORY-001;
- durable shared/backend settlement event persistence — BACKEND-002;
- cross-device cancellation authority — SYNC/BACKEND work;
- disputes/chargebacks — future product scope;
- automatic chain finalization policy — separate security decision.

## Quality status

Required gate: G2 local-flow evidence.

Code/tests may be written here, but typecheck, tests, production build, mobile flow and restart persistence require Codex/local execution before DONE.
