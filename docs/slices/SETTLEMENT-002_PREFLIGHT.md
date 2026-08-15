# SETTLEMENT-002 Preflight — Cash/manual settlement complete

Status: READY_FOR_CODEX_VERIFY
Branch: `chatgpt/chopdot-v1-completion`

## User goal

Cash/manual settlement should feel as trustworthy and complete as a wallet payment: the payer can say they paid, the receiver explicitly confirms receipt, mistakes can be undone before confirmation, and ChopDot leaves an explainable durable activity trail.

## Current facts

- Manual rails use `request_sent -> marked_paid -> confirmed`.
- Receiver confirmation exists in Group Detail and Settle Up.
- `AppState.activityEvents` persists locally through the existing app-state persistence path.
- global History still renders saved/finished groups only; polished activity-history presentation belongs to HISTORY-001.
- shared authority is not production-ready on this branch, so new undo/audit behavior stays local-only and does not claim cross-device propagation.

## Safety rules

1. A payer can retract `marked_paid` only before receiver confirmation.
2. Retraction returns the exact split to `request_sent`; it does not create/delete expenses or alter amounts.
3. A confirmed split cannot be retracted.
4. Wallet/chain-evidenced payments are not retractable through the manual undo path.
5. Successful mark-paid, retract, and receiver-confirm transitions append activity events.
6. Rejected/no-op transitions do not emit misleading activity.
7. Audit data is evidence of ChopDot application actions, not proof that cash physically moved.
8. Consumer UI says `Marked as paid`, `Undo`, `Waiting for confirmation`; it does not expose state-machine jargon.
9. No shared-session protocol change in this slice.
10. Verified chain evidence is persisted on the exact split and still stops at `marked_paid` under current policy.

## Implemented

- Added `src/settlement/localSettlementAudit.ts` as a narrow wrapper around the existing financial reducer.
- Successful `MARK_PAID` writes `payment_marked_paid` activity with payer-attestation evidence.
- Successful `CONFIRM_RECEIVED` writes `payment_confirmed` activity.
- Added local-only `RETRACT_MARK_PAID` for non-wallet-evidenced payments.
- Retraction restores the exact split to `request_sent` and writes `payment_marked_paid_retracted`.
- Manual PayerView now shows a `Marked as paid` success state instead of immediately navigating away.
- Manual payer can tap `I didn't pay yet — undo` before receiver confirmation.
- Existing receiver confirmation controls automatically gain audit events through the reducer wrapper.
- Added local-only `RECORD_VERIFIED_CHAIN_PAYMENT` to close the SETTLEMENT-001 evidence-persistence gap: exact verified network/from/to/amount evidence is persisted on the split, duplicate tx hashes are rejected, the split remains `marked_paid`, and manual Undo is blocked.
- Consolidated all settlement-domain modules under the existing `src/settlement/` directory rather than creating a competing module tree.
- Added unit tests for payer attestation, retraction, receiver confirmation, invalid/no-op transitions, verified chain evidence persistence, duplicate transaction protection, and no manual retraction of chain-evidenced payment.
- Existing `npm run test:settlement` glob includes these tests.

## Activity events

Current local events:

```text
payment_marked_paid
payment_marked_paid_retracted
payment_confirmed
```

They include relevant `splitId`, `expenseId`, payer/receiver ids, amount, currency, timestamp, request id where available, and evidence metadata where relevant.

## Acceptance review

1. Requested cash split -> `I paid` -> `marked_paid` + activity: IMPLEMENTED.
2. Payer sees waiting-for-receiver language: IMPLEMENTED.
3. Undo before confirmation -> `request_sent` + retraction event: IMPLEMENTED.
4. Receiver confirmation -> `confirmed` + confirmation event: IMPLEMENTED.
5. Undo after confirmation: REJECTED BY DOMAIN RULE.
6. Undo with wallet/chain evidence: REJECTED BY DOMAIN RULE.
7. Invalid/no-op transition -> no false activity: COVERED BY TEST.
8. `marked_paid` remains unresolved in existing balance selectors: PRESERVED.
9. Bank/payment-link payer attestation shares the same manual lifecycle: PRESERVED.
10. App restart persistence: expected through existing AppState persistence; MUST BE EXECUTED LOCALLY BEFORE DONE.
11. Verified chain receipt persists across AppState serialization path: IMPLEMENTED; runtime reload proof still required.

## Deferred

- polished all-events History UI — HISTORY-001;
- durable shared/backend settlement event persistence — BACKEND-002;
- cross-device cancellation authority — SYNC/BACKEND work;
- disputes/chargebacks — future product scope;
- automatic chain finalization policy — separate security decision;
- removal/rewrite of legacy `RECORD_MATCHED_PAYMENT` reducer branch — DEBT-SECURITY-001 / Codex reconciliation.

## Quality status

Required gate: G2 local-flow evidence.

Code and tests are written/reviewed here. `npm run lint`, `npm run test:settlement`, relevant state/wallet tests, production build, mobile flow, receiver-confirm flow, undo flow, and restart persistence must be executed by Codex/local verification before DONE.
